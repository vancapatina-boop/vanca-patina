const Order = require('../models/Order');
const InvoiceCounter = require('../models/InvoiceCounter');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');
const { renderInvoiceTemplate } = require('./invoiceTemplate');
const { generatePdfFromHtml } = require('./pdfService');
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

  // A delivered order should always be invoice-eligible, including older
  // orders whose payment flags may not have been backfilled consistently.
  if (order.status === 'delivered') {
    return true;
  }

  if (order.paymentMethod === 'COD') {
    return false;
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

  await sendInvoiceEmail({
    email: recipient,
    customerName: order.customerSnapshot?.name || order.user?.name || 'Customer',
    invoiceNumber: order.invoice?.invoiceNumber,
    invoiceUrl: getInvoiceAccessUrl(order),
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

  return `INV-${year}-${String(counter.sequence).padStart(4, '0')}`;
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
      address: order.shippingAddress?.address || 'N/A',
      city: order.shippingAddress?.city || 'N/A',
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

  return new Promise((resolve, reject) => {
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
}

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

  if (order.invoice?.invoiceUrl) {
    if (notifyCustomer) {
      try {
        await emailInvoiceIfNeeded(order, { force: true });
      } catch (emailError) {
        console.error('Invoice email failed:', emailError.message);
      }
    }
    return order;
  }

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

  const html = renderInvoiceTemplate(buildInvoicePayload(order));
  const pdfBuffer = await generatePdfFromHtml(html);
  const uploadResult = await uploadInvoicePdf(order.invoice.invoiceNumber, pdfBuffer);

  order.invoice.status = 'ready';
  order.invoice.invoiceUrl = uploadResult.secure_url;
  order.invoice.invoicePublicId = uploadResult.public_id;
  order.invoice.generatedAt = new Date();

  await order.save();

  if (notifyCustomer) {
    try {
      await emailInvoiceIfNeeded(order, { force: true });
    } catch (emailError) {
      console.error('Invoice email failed:', emailError.message);
    }
  }

  return order;
}

module.exports = {
  ensureInvoiceForOrder,
  isInvoiceEligible,
  getInvoiceAccessUrl,
  emailInvoiceIfNeeded,
};
