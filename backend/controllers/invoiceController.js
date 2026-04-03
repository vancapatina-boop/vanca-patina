const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { ensureInvoiceForOrder, getInvoiceAccessUrl } = require('../services/invoiceService');

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

  if (!invoiceUrl) {
    const err = new Error('Invoice URL not found');
    err.statusCode = 404;
    throw err;
  }

  const response = await fetch(invoiceUrl);
  if (!response.ok) {
    const err = new Error(`Unable to download invoice PDF (${response.status})`);
    err.statusCode = response.status;
    throw err;
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = `invoice_${order.invoice?.invoiceNumber || order.orderId || order._id}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(Buffer.from(arrayBuffer));
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
