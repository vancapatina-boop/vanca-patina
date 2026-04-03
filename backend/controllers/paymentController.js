const crypto = require('crypto');
const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { createOrderFromCart, computeTotals } = require('../services/orderService');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function markOrderPaid({ order, razorpayOrderId, razorpayPaymentId, razorpaySignature, webhookEventId }) {
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const alreadyPaid = order.paymentStatus === 'paid' || order.isPaid;
  order.paymentGateway = {
    ...(order.paymentGateway || {}),
    provider: 'razorpay',
    orderId: razorpayOrderId || order.paymentGateway?.orderId,
    paymentId: razorpayPaymentId || order.paymentGateway?.paymentId,
    signature: razorpaySignature || order.paymentGateway?.signature,
    webhookEventId: webhookEventId || order.paymentGateway?.webhookEventId,
  };
  order.paymentStatus = 'paid';
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  order.paymentResult = {
    id: razorpayPaymentId || order.paymentResult?.id,
    status: 'completed',
    update_time: new Date().toISOString(),
    email_address: order.customerSnapshot?.email || order.paymentResult?.email_address,
  };

  if (order.status === 'pending') {
    order.status = 'confirmed';
  }

  await order.save();
  await ensureInvoiceForOrder(order._id, { notifyCustomer: !alreadyPaid });
  return order;
}

// @desc    Create Razorpay order and persist application order
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  if (!razorpay) {
    const err = new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    err.statusCode = 500;
    throw err;
  }

  const { shippingAddress } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    throw err;
  }

  const { totalPrice } = computeTotals(cart.items);

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalPrice * 100),
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  });

  const pendingOrder = await createOrderFromCart({
    user: req.user,
    shippingAddress,
    paymentMethod: 'Razorpay',
    razorpayOrderId: razorpayOrder.id,
  });

  pendingOrder.paymentResult = {
    status: 'created',
    update_time: new Date().toISOString(),
    email_address: req.user.email,
  };
  await pendingOrder.save();

  res.json({
    appOrderId: pendingOrder._id,
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

// @desc    Verify Razorpay payment from checkout callback
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  if (!razorpay) {
    const err = new Error('Razorpay is not configured');
    err.statusCode = 500;
    throw err;
  }

  const { appOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (razorpay_signature !== expectedSign) {
    const err = new Error('Payment verification failed');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findOne({
    _id: appOrderId,
    user: req.user._id,
    'paymentGateway.orderId': razorpay_order_id,
  });

  const updatedOrder = await markOrderPaid({
    order,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  res.json({
    success: true,
    orderId: updatedOrder._id,
    invoiceUrl: updatedOrder.invoice?.invoiceUrl,
    message: 'Payment verified successfully',
  });
});

// @desc    Razorpay webhook
// @route   POST /api/webhook/razorpay
// @access  Public (signature verified)
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    const err = new Error('Razorpay webhook secret is not configured');
    err.statusCode = 500;
    throw err;
  }

  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  if (signature !== expectedSignature) {
    const err = new Error('Invalid webhook signature');
    err.statusCode = 400;
    throw err;
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;

  if (!razorpayOrderId) {
    return res.status(200).json({ received: true, skipped: true });
  }

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const order = await Order.findOne({ 'paymentGateway.orderId': razorpayOrderId });
    if (order) {
      await markOrderPaid({
        order,
        razorpayOrderId,
        razorpayPaymentId: paymentEntity?.id,
        webhookEventId: event.id,
      });
    }
  }

  if (eventType === 'payment.failed') {
    await Order.findOneAndUpdate(
      { 'paymentGateway.orderId': razorpayOrderId },
      {
        $set: {
          paymentStatus: 'failed',
          'paymentResult.status': 'failed',
          'paymentResult.update_time': new Date().toISOString(),
          'paymentGateway.webhookEventId': event.id,
        },
      }
    );
  }

  res.status(200).json({ received: true });
});

module.exports = { createOrder, verifyPayment, handleRazorpayWebhook };
