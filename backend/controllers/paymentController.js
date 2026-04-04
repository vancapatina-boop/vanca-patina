const crypto = require('crypto');
const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { createOrderFromCart, computeTotals, cancelOrderAndRestoreStock } = require('../services/orderService');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function clearCartForUser(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return;
  cart.items = [];
  await cart.save();
  console.log('[Cart] Cleared after successful payment', { userId: userId.toString() });
}

async function markOrderPaid({ order, razorpayOrderId, razorpayPaymentId, razorpaySignature, webhookEventId }) {
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const alreadyPaid = order.paymentStatus === 'paid' || order.isPaid;
  const duplicateWebhookEvent =
    webhookEventId != null &&
    order.paymentGateway?.webhookEventId === webhookEventId;

  if (duplicateWebhookEvent && alreadyPaid) {
    return Order.findById(order._id).populate('user', 'name email phone');
  }

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
  console.log('[Order] Payment confirmed', {
    orderDbId: order._id.toString(),
    orderId: order.orderId,
    userId: order.user.toString(),
  });

  try {
    await ensureInvoiceForOrder(order._id, { notifyCustomer: !alreadyPaid });
    console.log('[Invoice] Generated for order', order._id.toString());
  } catch (invoiceErr) {
    console.error('[Invoice] Generation failed for order', order._id.toString(), invoiceErr.message);
    try {
      const o = await Order.findById(order._id);
      if (o && !o.invoice?.invoiceUrl) {
        o.invoice = {
          ...(o.invoice || {}),
          invoiceNumber: o.invoice?.invoiceNumber,
          status: 'failed',
        };
        await o.save();
      }
    } catch (persistErr) {
      console.error('[Invoice] Could not persist failed invoice status', persistErr.message);
    }
  }

  return Order.findById(order._id).populate('user', 'name email phone');
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

  // Filter out orphaned items where the product was deleted
  const validItems = cart.items.filter((item) => item.product != null);
  if (validItems.length === 0) {
    const err = new Error('All items in your cart have been removed. Please add new products.');
    err.statusCode = 400;
    throw err;
  }

  const { totalPrice } = computeTotals(validItems);

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
    clearCartAfterCreation: false, // Don't clear cart until payment verified
  });

  pendingOrder.paymentResult = {
    status: 'created',
    update_time: new Date().toISOString(),
    email_address: req.user.email,
  };
  await pendingOrder.save();

  console.log('[Order] Pending order created (awaiting Razorpay payment)', {
    orderDbId: pendingOrder._id.toString(),
    orderId: pendingOrder.orderId,
    userId: req.user._id.toString(),
    razorpayOrderId: razorpayOrder.id,
  });

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

  const a = Buffer.from(expectedSign, 'utf8');
  const b = Buffer.from(String(razorpay_signature), 'utf8');
  const sigOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!sigOk) {
    const err = new Error('Payment verification failed');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findOne({
    _id: appOrderId,
    user: req.user._id,
    'paymentGateway.orderId': razorpay_order_id,
  });

  if (!order) {
    const err = new Error('Order not found for this payment');
    err.statusCode = 404;
    throw err;
  }

  let rpPayment;
  try {
    rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
  } catch (fetchErr) {
    console.error('[Payment] Failed to fetch Razorpay payment', fetchErr.message);
    const err = new Error('Could not verify payment with Razorpay');
    err.statusCode = 502;
    throw err;
  }

  const expectedAmountPaise = Math.round(Number(order.totalPrice) * 100);
  if (Number(rpPayment.amount) !== expectedAmountPaise) {
    console.error('[Payment] Amount mismatch', {
      expectedPaise: expectedAmountPaise,
      receivedPaise: rpPayment.amount,
      orderId: order._id.toString(),
    });
    const err = new Error('Payment amount does not match order total');
    err.statusCode = 400;
    throw err;
  }

  if (String(rpPayment.currency || '').toUpperCase() !== 'INR') {
    const err = new Error('Invalid payment currency');
    err.statusCode = 400;
    throw err;
  }

  if (rpPayment.order_id && rpPayment.order_id !== razorpay_order_id) {
    const err = new Error('Payment does not belong to this checkout session');
    err.statusCode = 400;
    throw err;
  }

  const paymentOk = ['captured', 'authorized'].includes(rpPayment.status);
  if (!paymentOk) {
    console.error('[Payment] Invalid Razorpay payment status', {
      status: rpPayment.status,
      orderId: order._id.toString(),
    });
    const err = new Error('Payment is not completed');
    err.statusCode = 400;
    throw err;
  }

  console.log('[Payment] Signature and Razorpay payment verified', {
    userId: req.user._id.toString(),
    orderDbId: order._id.toString(),
    razorpay_payment_id,
  });

  await markOrderPaid({
    order,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  await clearCartForUser(req.user._id);

  const updatedOrder = await Order.findById(appOrderId).lean();

  res.json({
    success: true,
    orderId: updatedOrder._id,
    invoiceUrl: updatedOrder.invoice?.invoiceUrl,
    invoiceNumber: updatedOrder.invoice?.invoiceNumber,
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
  const eventId = event.id; // Unique webhook event ID
  const paymentEntity = event.payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;

  if (!razorpayOrderId) {
    return res.status(200).json({ received: true, skipped: true });
  }

  // IDEMPOTENCY: Check if we've already processed this webhook event
  // Prevents duplicate processing due to webhook retries
  const existingOrder = await Order.findOne({ 'paymentGateway.webhookEventId': eventId });
  if (existingOrder) {
    console.log(`Webhook event ${eventId} already processed, skipping duplicate`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const order = await Order.findOne({ 'paymentGateway.orderId': razorpayOrderId });
    if (order) {
      await markOrderPaid({
        order,
        razorpayOrderId,
        razorpayPaymentId: paymentEntity?.id,
        webhookEventId: eventId, // Use the unique event ID
      });
      await clearCartForUser(order.user);
    }
  }

  if (eventType === 'payment.failed') {
    const order = await Order.findOne({ 'paymentGateway.orderId': razorpayOrderId });
    if (order) {
      // Restore stock when payment fails
      try {
        await cancelOrderAndRestoreStock(order._id);
        console.log(`Stock restored for failed order ${order._id}`);
      } catch (restoreError) {
        console.error(`Failed to restore stock for order ${order._id}:`, restoreError.message);
      }

      // Mark webhook as processed to prevent duplicates
      order.paymentGateway = {
        ...(order.paymentGateway || {}),
        webhookEventId: eventId,
      };
      order.paymentStatus = 'failed';
      order.paymentResult = {
        ...(order.paymentResult || {}),
        status: 'failed',
        update_time: new Date().toISOString(),
      };
      await order.save().catch(err => {
        // Ignore duplicate key error on webhookEventId (already processed)
        if (err.code === 11000) {
          console.log(`Webhook ${eventId} was already processed by another attempt`);
        } else {
          throw err;
        }
      });
    }
  }

  res.status(200).json({ received: true });
});

module.exports = { createOrder, verifyPayment, handleRazorpayWebhook };
