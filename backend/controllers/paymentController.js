const axios = require('axios');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
// Cashfree integration uses axios for HTTP calls
const crypto = require('crypto');

const asyncHandler = require('../utils/asyncHandler');
const { createOrderFromCart, computeTotals, cancelOrderAndRestoreStock } = require('../services/orderService');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

let cashfreeConfig = null;
if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
  const rawEnv = (process.env.CASHFREE_ENV || 'sandbox').trim().toLowerCase();
  const appId = process.env.CASHFREE_APP_ID.trim().replace(/^["']|["']$/g, '');
  const secretKey = process.env.CASHFREE_SECRET_KEY.trim().replace(/^["']|["']$/g, '');
  const isProduction = rawEnv === 'production' || rawEnv === 'prod' || !appId.toLowerCase().startsWith('test');

  cashfreeConfig = {
    appId,
    secretKey,
    env: isProduction ? 'production' : 'sandbox',
  };
  console.log(`[Cashfree Config] Initialized — env: ${cashfreeConfig.env}, appId prefix: ${cashfreeConfig.appId.slice(0, 6)}...`);
}

async function clearCartForUser(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return;
  cart.items = [];
  await cart.save();
  console.log('[Cart] Cleared after successful payment', { userId: userId.toString() });
}

async function markOrderPaid({ order, cashfreeOrderId, cashfreePaymentId, webhookEventId }) {
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
    provider: 'cashfree',
    orderId: cashfreeOrderId || order.paymentGateway?.orderId,
    paymentId: cashfreePaymentId || order.paymentGateway?.paymentId,
    webhookEventId: webhookEventId || order.paymentGateway?.webhookEventId,
  };
  order.paymentStatus = 'paid';
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  order.paymentResult = {
    id: cashfreePaymentId || order.paymentResult?.id,
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

// @desc    Create Cashfree order and persist application order
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  if (!cashfreeConfig) {
    const err = new Error('Cashfree configuration missing. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.');
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

  const validItems = cart.items.filter((item) => item.product != null);
  if (validItems.length === 0) {
    const err = new Error('All items in your cart have been removed. Please add new products.');
    err.statusCode = 400;
    throw err;
  }

  const { totalPrice } = computeTotals(validItems);

  const rawPhone = String(shippingAddress?.phoneNumber || req.user.phone || '9999999999').replace(/\D/g, '');
  const customerPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '9999999999';
  const customerName = (shippingAddress?.fullName || req.user.name || 'Customer').trim();

  // Prepare Cashfree order payload
  const cashfreePayload = {
    order_id: `order_${Date.now()}`,
    order_amount: totalPrice.toFixed(2),
    order_currency: 'INR',
    order_note: `Order for ${req.user.email}`,
    customer_details: {
      customer_id: req.user._id.toString(),
      customer_name: customerName,
      customer_email: req.user.email || shippingAddress?.email || 'customer@example.com',
      customer_phone: customerPhone,
    },
  };

  const baseUrl = cashfreeConfig.env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  let cashfreeResponse;
  try {
    cashfreeResponse = await axios.post(`${baseUrl}/orders`, cashfreePayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': cashfreeConfig.appId,
        'x-client-secret': cashfreeConfig.secretKey,
        'x-api-version': '2023-08-01',
      },
    });
  } catch (cfErr) {
    const cfMessage = cfErr?.response?.data?.message || cfErr.message || 'Cashfree payment order creation failed';
    console.error('[Cashfree Error]', cfErr?.response?.data || cfErr.message);
    const err = new Error(`Cashfree Error: ${cfMessage}`);
    err.statusCode = cfErr?.response?.status === 401 ? 502 : (cfErr?.response?.status || 502);
    throw err;
  }

  if (cashfreeResponse.status !== 200 && cashfreeResponse.status !== 201) {
    const err = new Error('Failed to create Cashfree order');
    err.statusCode = 502;
    throw err;
  }

  const cfOrder = cashfreeResponse.data;

  const pendingOrder = await createOrderFromCart({
    user: req.user,
    shippingAddress,
    paymentMethod: 'Cashfree',
    // Store Cashfree order ID for later verification
    cashfreeOrderId: cfOrder.order_id,
    clearCartAfterCreation: false,
  });

  pendingOrder.paymentResult = {
    status: 'created',
    update_time: new Date().toISOString(),
    email_address: req.user.email,
  };
  await pendingOrder.save();

  console.log('[Order] Pending Cashfree order created', {
    orderDbId: pendingOrder._id.toString(),
    orderId: pendingOrder.orderId,
    cashfreeOrderId: cfOrder.order_id,
  });

  res.json({
    appOrderId: pendingOrder._id,
    orderId: cfOrder.order_id,
    paymentSessionId: cfOrder.payment_session_id,
    amount: cfOrder.order_amount,
    currency: cfOrder.order_currency,
    environment: cashfreeConfig.env,
  });
});

// @desc    Verify Cashfree payment from checkout callback
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  if (!cashfreeConfig) {
    const err = new Error('Cashfree is not configured');
    err.statusCode = 500;
    throw err;
  }

  // Cashfree verification via order status API
  const { appOrderId, cashfree_order_id, cashfree_payment_id } = req.body;

  // Verify signature if provided (Cashfree sends x-webhook-signature for webhooks, not for verify API)
  // Here we trust the client to send correct IDs after checkout; server will additionally verify via API.

  const order = await Order.findOne({
    _id: appOrderId,
    user: req.user._id,
    'paymentGateway.orderId': cashfree_order_id,
  });

  if (!order) {
    const err = new Error('Order not found for this payment');
    err.statusCode = 404;
    throw err;
  }

  // Call Cashfree API to fetch order details
  const baseUrl = cashfreeConfig.env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  const cfResponse = await axios.get(`${baseUrl}/orders/${cashfree_order_id}`, {
    headers: {
      'x-client-id': cashfreeConfig.appId,
      'x-client-secret': cashfreeConfig.secretKey,
      'x-api-version': '2023-08-01',
    },
  });

  if (cfResponse.status !== 200) {
    const err = new Error('Failed to verify Cashfree payment');
    err.statusCode = 502;
    throw err;
  }

  const cfOrder = cfResponse.data;

  // Validate amount matches
  if (Number(cfOrder.order_amount).toFixed(2) !== Number(order.totalPrice).toFixed(2)) {
    const err = new Error('Payment amount mismatch');
    err.statusCode = 400;
    throw err;
  }

  if (cfOrder.order_status !== 'PAID') {
    const err = new Error('Payment not completed');
    err.statusCode = 400;
    throw err;
  }

  // Mark order as paid
  await markOrderPaid({
    order,
    cashfreeOrderId: cashfree_order_id,
    cashfreePaymentId: cashfree_payment_id,
    // cashfreeSignature is optional; can be stored if provided
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

// @desc    Cashfree webhook
// @route   POST /api/webhook/cashfree
// @access  Public (signature verified)
const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    const err = new Error('Cashfree webhook secret is not configured');
    err.statusCode = 500;
    throw err;
  }

  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

  // Cashfree signature: HMAC SHA256 of timestamp + rawBody using secret
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');

  const provided = Buffer.from(String(signature || ''), 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    const err = new Error('Invalid Cashfree webhook signature');
    err.statusCode = 400;
    throw err;
  }

  const event = JSON.parse(rawBody);
  const eventId = event.id || event.event_id || `${event.type || event.event || 'cashfree'}:${event.data?.order?.order_id || event.order?.order_id || event.order?.id || Date.now()}`;
  const eventType = event.type || event.event;
  const cfOrderId = event.data?.order?.order_id || event.order?.order_id || event.order?.id;
  const cfPaymentId = event.data?.payment?.cf_payment_id || event.data?.payment?.payment_id || event.payment?.id;

  if (!cfOrderId) {
    return res.status(200).json({ received: true, skipped: true });
  }

  // Idempotency check
  const existing = await Order.findOne({ 'paymentGateway.webhookEventId': eventId });
  if (existing) {
    console.log(`Cashfree webhook ${eventId} already processed`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  const order = await Order.findOne({ 'paymentGateway.orderId': cfOrderId });
  if (!order) {
    return res.status(200).json({ received: true, note: 'Order not found' });
  }

  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || eventType === 'order.payment.success') {
    // Mark order paid
    await markOrderPaid({
      order,
      cashfreeOrderId: cfOrderId,
      cashfreePaymentId: cfPaymentId,
      webhookEventId: eventId,
    });
    await clearCartForUser(order.user);
  }

  if (eventType === 'PAYMENT_FAILED_WEBHOOK' || eventType === 'order.payment.failed') {
    // Restore stock and mark failed
    try {
      await cancelOrderAndRestoreStock(order._id);
    } catch (e) {
      console.error('Stock restore failed', e);
    }
    order.paymentGateway = { ...(order.paymentGateway || {}), webhookEventId: eventId };
    order.paymentStatus = 'failed';
    order.paymentResult = { ...(order.paymentResult || {}), status: 'failed', update_time: new Date().toISOString() };
    await order.save();
  }

  res.status(200).json({ received: true });
});

module.exports = { createOrder, verifyPayment, handleCashfreeWebhook };
