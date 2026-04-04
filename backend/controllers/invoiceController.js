const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { ensureInvoiceForOrder, getInvoiceAccessUrl, streamInvoicePdfToResponse } = require('../services/invoiceService');

function serializeInvoice(order) {
  return {
    orderId: order._id,
    appOrderId: order.orderId,
    invoiceNumber: order.invoice?.invoiceNumber,
    invoiceUrl: getInvoiceAccessUrl(order),
    storedInvoiceUrl: order.invoice?.invoiceUrl,
    invoicePublicId: order.invoice?.invoicePublicId,
    generatedAt: order.invoice?.generatedAt,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
  };
}

const getInvoiceForUser = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('user', 'name email');

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.user._id.toString() !== req.user._id.toString()) {
    const err = new Error('Not authorized to access this invoice');
    err.statusCode = 403;
    throw err;
  }

  const resolvedOrder = await ensureInvoiceForOrder(order._id);
  res.json(serializeInvoice(resolvedOrder));
});

const getInvoiceForAdmin = asyncHandler(async (req, res) => {
  const order = await ensureInvoiceForOrder(req.params.orderId);
  res.json(serializeInvoice(order));
});

async function pipeInvoicePdf(order, res) {
  const invoiceUrl = getInvoiceAccessUrl(order);

  if (invoiceUrl) {
    try {
      const fetchOpts = {};
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        fetchOpts.signal = AbortSignal.timeout(30_000);
      }
      const response = await fetch(invoiceUrl, fetchOpts);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        const fileName = `invoice_${order.invoice?.invoiceNumber || order.orderId || order._id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', buf.length);
        res.end(buf);
        return;
      }
      console.warn('[Invoice] Hosted PDF returned', response.status, '— streaming fresh PDF');
    } catch (err) {
      console.warn('[Invoice] Hosted PDF fetch failed — streaming fresh PDF:', err.message);
    }
  }

  await streamInvoicePdfToResponse(order, res);
}

const downloadInvoiceForUser = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).populate('user', 'name email');

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.user._id.toString() !== req.user._id.toString()) {
    const err = new Error('Not authorized to access this invoice');
    err.statusCode = 403;
    throw err;
  }

  const resolvedOrder = await ensureInvoiceForOrder(order._id);
  await pipeInvoicePdf(resolvedOrder, res);
});

const downloadInvoiceForAdmin = asyncHandler(async (req, res) => {
  const order = await ensureInvoiceForOrder(req.params.orderId);
  await pipeInvoicePdf(order, res);
});

module.exports = { getInvoiceForUser, getInvoiceForAdmin, downloadInvoiceForUser, downloadInvoiceForAdmin };
