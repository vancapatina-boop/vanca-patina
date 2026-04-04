const Order = require('../models/Order');
const InvoiceCounter = require('../models/InvoiceCounter');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');
const { generateInvoicePdfBuffer } = require('./invoicePdfKit');
const { sendInvoiceEmail } = require('../utils/emailService');

function getCompanyDetails() {
  return {
    name: process.env.COMPANY_NAME || 'Vanca Patina',
    gstNumber: process.env.COMPANY_GST_NUMBER || 'GSTIN-PLACEHOLDER',
    address: process.env.COMPANY_ADDRESS || 'Company Address',
    logoUrl: process.env.COMPANY_LOGO_URL || '',
    supportEmail: process.env.COMPANY_SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@example.com',
    signatureLabel: process.env.COMPANY_SIGNATURE_LABEL || 'Digital Signature Placeholder',
  };
}

function isInvoiceEligible(order) {
  if (!order) return false;

  if (order.status === 'delivered') {
    return true;
  }

  return order.paymentStatus === 'paid' || order.isPaid;
}

function getInvoiceAccessUrl(order) {
  const publicId = order?.invoice?.invoicePublicId;
  if (!publicId) {
    return order?.invoice?.invoiceUrl || null;
  }

  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'upload',
    format: 'pdf',
    secure: true,
    sign_url: true,
  });
}

async function emailInvoiceIfNeeded(order, { force = false } = {}) {
  if (!order) return order;

  const recipient = order.customerSnapshot?.email || order.user?.email;
  if (!recipient) {
    return order;
  }

  if (!force && order.invoice?.emailedAt) {
    return order;
  }

  const invoiceUrl = getInvoiceAccessUrl(order);
  if (!invoiceUrl) {
    return order;
  }

  await sendInvoiceEmail({
    email: recipient,
    customerName: order.customerSnapshot?.name || order.user?.name || 'Customer',
    invoiceNumber: order.invoice?.invoiceNumber,
    invoiceUrl,
    orderId: order.orderId || order._id.toString(),
  });

  order.invoice.emailedAt = new Date();
  await order.save();
  return order;
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const counter = await InvoiceCounter.findOneAndUpdate(
    { key: `invoice:${year}` },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Format: VP-YYYY-XXXX (e.g., VP-2026-0001)
  return `VP-${year}-${String(counter.sequence).padStart(4, '0')}`;
}

function buildInvoicePayload(order) {
  const customerName = order.customerSnapshot?.name || order.user?.name || 'Customer';
  const customerEmail = order.customerSnapshot?.email || order.user?.email || '';

  return {
    invoiceNumber: order.invoice.invoiceNumber,
    orderId: order.orderId || order._id.toString(),
    generatedAt: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    customer: {
      name: customerName,
      email: customerEmail,
      address:
        [order.shippingAddress?.address1, order.shippingAddress?.address2].filter(Boolean).join(', ') ||
        order.shippingAddress?.address ||
        'N/A',
      city:
        [order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ') ||
        'N/A',
      postalCode: order.shippingAddress?.postalCode || 'N/A',
      country: order.shippingAddress?.country || 'N/A',
    },
    items: order.orderItems.map((item) => ({
      name: item.name,
      quantity: item.qty,
      unitPrice: item.price,
      total: item.price * item.qty,
    })),
    subtotal: order.itemsPrice,
    tax: order.taxPrice,
    shipping: order.shippingPrice,
    total: order.totalPrice,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    company: getCompanyDetails(),
  };
}

async function uploadInvoicePdf(invoiceNumber, pdfBuffer) {
  if (!hasCloudinary) {
    const err = new Error('Cloudinary is not configured for invoice storage.');
    err.statusCode = 500;
    throw err;
  }

  // Retry logic with exponential backoff for network failures
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            folder: 'invoices',
            public_id: invoiceNumber,
            format: 'pdf',
            filename_override: `invoice_${invoiceNumber}.pdf`,
            use_filename: false,
            unique_filename: false,
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        stream.end(pdfBuffer);
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  const err = new Error(`Failed to upload invoice to Cloudinary after ${maxRetries} attempts: ${lastError?.message}`);
  err.statusCode = 500;
  throw err;
}

// Track in-progress invoice generation to prevent race conditions
const invoiceGenerationInProgress = new Map();

async function ensureInvoiceForOrder(orderOrId, { notifyCustomer = false } = {}) {
  const order =
    typeof orderOrId === 'string'
      ? await Order.findById(orderOrId).populate('user', 'name email phone')
      : orderOrId;

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Hosted PDF (Cloudinary) OR already generated (on-demand PDF when Cloudinary off)
  const invoiceAlreadyDone =
    Boolean(order.invoice?.invoiceUrl) ||
    (order.invoice?.status === 'ready' && order.invoice?.generatedAt);

  if (invoiceAlreadyDone) {
    if (notifyCustomer) {
      try {
        await emailInvoiceIfNeeded(order, { force: true });
      } catch (emailError) {
        console.error('Invoice email failed:', emailError.message);
      }
    }
    return order;
  }

  // CONCURRENCY PROTECTION: Wait if already generating
  const orderId = order._id.toString();
  if (invoiceGenerationInProgress.has(orderId)) {
    // Wait for the other request to complete
    await invoiceGenerationInProgress.get(orderId);
    // Fetch fresh order data to get the generated invoice
    return await Order.findById(orderId).populate('user', 'name email phone');
  }

  // Create a promise that will resolve when generation completes
  let resolveGeneration;
  const generationPromise = new Promise(resolve => {
    resolveGeneration = resolve;
  });
  invoiceGenerationInProgress.set(orderId, generationPromise);

  try {
    if (!isInvoiceEligible(order)) {
      const err = new Error('Invoice is not available for this order yet.');
      err.statusCode = 409;
      throw err;
    }

    if (!order.invoice?.invoiceNumber) {
      order.invoice = {
        ...(order.invoice || {}),
        invoiceNumber: await generateInvoiceNumber(),
        status: 'not_requested',
      };
    }

    const pdfBuffer = await generateInvoicePdfBuffer(buildInvoicePayload(order));

    order.invoice.status = 'ready';
    order.invoice.generatedAt = new Date();

    if (hasCloudinary) {
      const uploadResult = await uploadInvoicePdf(order.invoice.invoiceNumber, pdfBuffer);
      order.invoice.invoiceUrl = uploadResult.secure_url;
      order.invoice.invoicePublicId = uploadResult.public_id;
    } else {
      order.invoice.invoiceUrl = undefined;
      order.invoice.invoicePublicId = undefined;
      console.warn('[Invoice] Cloudinary not configured — PDF is generated on each download; email link skipped until storage is set up.');
    }

    await order.save();

    if (notifyCustomer) {
      try {
        await emailInvoiceIfNeeded(order, { force: true });
      } catch (emailError) {
        console.error('Invoice email failed (non-blocking):', emailError.message);
        // Don't throw - email failure shouldn't block invoice generation
      }
    }

    return order;
  } finally {
    // Signal that generation is complete
    invoiceGenerationInProgress.delete(orderId);
    resolveGeneration();
  }
}

async function streamInvoicePdfToResponse(order, res) {
  const ord =
    order.invoice?.invoiceNumber && order.orderItems?.length
      ? order
      : await Order.findById(order._id).populate('user', 'name email phone');

  if (!ord) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (!ord.invoice?.invoiceNumber) {
    const err = new Error('Invoice is not available for this order yet.');
    err.statusCode = 409;
    throw err;
  }

  const buf = await generateInvoicePdfBuffer(buildInvoicePayload(ord));
  const safeName = String(ord.invoice.invoiceNumber).replace(/[^\w-]+/g, '_');
  const fileName = `invoice_${safeName}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buf.length);
  res.end(buf);
}

module.exports = {
  ensureInvoiceForOrder,
  isInvoiceEligible,
  getInvoiceAccessUrl,
  emailInvoiceIfNeeded,
  streamInvoicePdfToResponse,
};
