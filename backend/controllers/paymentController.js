const axios = require('axios');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const crypto = require('crypto');

const asyncHandler = require('../utils/asyncHandler');
const { createOrderFromCart, computeTotals, cancelOrderAndRestoreStock } = require('../services/orderService');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

const CASHFREE_API_VERSION = '2023-08-01';

function cleanEnv(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

const clientId = cleanEnv(process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID);
const clientSecret = cleanEnv(process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY);
const rawEnv = cleanEnv(process.env.CASHFREE_ENVIRONMENT || process.env.CASHFREE_ENV || 'sandbox').toLowerCase();

const cashfreeConfig = clientId && clientSecret
  ? {
      clientId,
      clientSecret,
      env: rawEnv === 'production' || rawEnv === 'prod' ? 'production' : 'sandbox',
    }
  : null;

if (cashfreeConfig) {
  console.log(`[Cashfree Config] Initialized - env: ${cashfreeConfig.env}, clientId prefix: ${cashfreeConfig.clientId.slice(0, 6)}...`);
}

function cashfreeBaseUrl() {
  return cashfreeConfig.env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function cashfreeHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': cashfreeConfig.clientId,
    'x-client-secret': cashfreeConfig.clientSecret,
    'x-api-version': CASHFREE_API_VERSION,
  };
}

async function fetchCashfreeOrder(cashfreeOrderId) {
  const response = await axios.get(`${cashfreeBaseUrl()}/orders/${cashfreeOrderId}`, {
    headers: cashfreeHeaders(),
  });
  return response.data;
}

async function fetchCashfreePayments(cashfreeOrderId) {
  try {
    const response = await axios.get(`${cashfreeBaseUrl()}/orders/${cashfreeOrderId}/payments`, {
      headers: cashfreeHeaders(),
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('[Cashfree] Payment fetch failed', error?.response?.data || error.message);
    return [];
  }
}

function getCashfreePaymentState(cfOrder, payments) {
  const successPayment = payments.find((p) => String(p.payment_status || '').toUpperCase() === 'SUCCESS');
  if (String(cfOrder.order_status || '').toUpperCase() === 'PAID' || successPayment) {
    return { status: 'paid', payment: successPayment || payments[0] || null };
  }

  const droppedPayment = payments.find((p) => {
    const status = String(p.payment_status || '').toUpperCase();
    return status === 'USER_DROPPED' || status === 'CANCELLED';
  });
  if (droppedPayment) {
    return { status: 'cancelled', payment: droppedPayment };
  }

  const failedPayment = payments.find((p) => String(p.payment_status || '').toUpperCase() === 'FAILED');
  if (failedPayment) {
    return { status: 'failed', payment: failedPayment };
  }

  const orderStatus = String(cfOrder.order_status || '').toUpperCase();
  if (orderStatus === 'EXPIRED' || orderStatus === 'TERMINATED') {
    return { status: 'failed', payment: payments[0] || null };
  }

  return { status: 'processing', payment: payments[0] || null };
}

function getPaymentId(payment, fallback) {
  return payment?.cf_payment_id || payment?.payment_id || fallback || undefined;
}

function getReference(payment) {
  return payment?.bank_reference || payment?.auth_id || payment?.cf_payment_id || undefined;
}

async function clearCartForUser(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return;
  cart.items = [];
  await cart.save();
}

async function markOrderPaid({ order, cashfreeOrderId, cashfreePaymentId, payment, webhookEventId, rawEvent }) {
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const alreadyPaid = order.paymentStatus === 'paid' || order.isPaid;

  order.paymentGateway = {
    ...(order.paymentGateway || {}),
    provider: 'cashfree',
    environment: cashfreeConfig.env,
    orderId: cashfreeOrderId || order.paymentGateway?.orderId,
    paymentId: cashfreePaymentId || order.paymentGateway?.paymentId,
    webhookEventId: webhookEventId || order.paymentGateway?.webhookEventId,
  };
  order.gatewayOrderId = cashfreeOrderId || order.gatewayOrderId;
  order.gatewayPaymentId = cashfreePaymentId || order.gatewayPaymentId;
  order.transactionReference = getReference(payment) || order.transactionReference;
  order.paymentTime = payment?.payment_completion_time ? new Date(payment.payment_completion_time) : (order.paymentTime || new Date());
  order.gatewayResponse = rawEvent || payment || order.gatewayResponse;
  order.paymentStatus = 'paid';
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  order.paymentResult = {
    id: cashfreePaymentId || order.paymentResult?.id,
    status: 'completed',
    update_time: new Date().toISOString(),
    email_address: order.customerSnapshot?.email || order.paymentResult?.email_address,
  };

  if (order.status === 'pending' || order.status === 'PENDING_PAYMENT') {
    order.status = 'confirmed';
  }

  await order.save();

  try {
    await ensureInvoiceForOrder(order._id, { notifyCustomer: !alreadyPaid });
  } catch (invoiceErr) {
    console.error('[Invoice] Generation failed for order', order._id.toString(), invoiceErr.message);
    const freshOrder = await Order.findById(order._id);
    if (freshOrder && !freshOrder.invoice?.invoiceUrl) {
      freshOrder.invoice = {
        ...(freshOrder.invoice || {}),
        invoiceNumber: freshOrder.invoice?.invoiceNumber,
        status: 'failed',
      };
      await freshOrder.save();
    }
  }

  return Order.findById(order._id).populate('user', 'name email phone');
}

async function updateUnpaidOrder(order, status, { payment, raw, source = 'verify', eventId, message } = {}) {
  if (order.isPaid || order.paymentStatus === 'paid') return order;

  const paymentId = getPaymentId(payment);
  order.paymentStatus = status;
  order.paymentGateway = {
    ...(order.paymentGateway || {}),
    provider: 'cashfree',
    environment: cashfreeConfig.env,
    paymentId: paymentId || order.paymentGateway?.paymentId,
    webhookEventId: eventId || order.paymentGateway?.webhookEventId,
  };
  order.gatewayPaymentId = paymentId || order.gatewayPaymentId;
  order.transactionReference = getReference(payment) || order.transactionReference;
  order.gatewayResponse = raw || payment || order.gatewayResponse;
  order.paymentResult = {
    ...(order.paymentResult || {}),
    id: paymentId || order.paymentResult?.id,
    status,
    update_time: new Date().toISOString(),
  };
  order.paymentLogs.push({
    event: eventId || status,
    status,
    source,
    gatewayOrderId: order.paymentGateway?.orderId,
    gatewayPaymentId: paymentId,
    message,
    raw,
  });
  await order.save();
  return order;
}

async function createCashfreeOrderForAppOrder(order, shippingAddress, user) {
  const rawPhone = String(shippingAddress?.phoneNumber || user.phone || '9999999999').replace(/\D/g, '');
  const customerPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : '9999999999';
  const frontendUrl = cleanEnv(process.env.FRONTEND_URL || (process.env.CLIENT_URL || '').split(',')[0]);
  const apiBaseUrl = cleanEnv(process.env.API_BASE_URL);
  const cashfreeOrderId = `vp_${order._id}_${Date.now()}`;

  const orderMeta = {};
  if (frontendUrl) {
    orderMeta.return_url = `${frontendUrl.replace(/\/$/, '')}/checkout?cashfree_order_id={order_id}`;
  }
  if (apiBaseUrl) {
    orderMeta.notify_url = `${apiBaseUrl.replace(/\/$/, '')}/api/webhook/cashfree`;
  }

  const payload = {
    order_id: cashfreeOrderId,
    order_amount: Number(order.totalPrice).toFixed(2),
    order_currency: 'INR',
    order_note: `Order ${order.orderId || order._id}`,
    customer_details: {
      customer_id: user._id.toString(),
      customer_name: (shippingAddress?.fullName || user.name || 'Customer').trim(),
      customer_email: shippingAddress?.email || user.email || 'customer@example.com',
      customer_phone: customerPhone,
    },
    ...(Object.keys(orderMeta).length > 0 ? { order_meta: orderMeta } : {}),
  };

  const response = await axios.post(`${cashfreeBaseUrl()}/orders`, payload, {
    headers: cashfreeHeaders(),
  });

  if (response.status !== 200 && response.status !== 201) {
    const err = new Error('Failed to create Cashfree order');
    err.statusCode = 502;
    throw err;
  }

  const cfOrder = response.data;
  order.paymentGateway = {
    ...(order.paymentGateway || {}),
    provider: 'cashfree',
    environment: cashfreeConfig.env,
    orderId: cfOrder.order_id,
    sessionId: cfOrder.payment_session_id,
  };
  order.gatewayOrderId = cfOrder.order_id;
  order.paymentStatus = 'processing';
  order.paymentResult = {
    status: 'created',
    update_time: new Date().toISOString(),
    email_address: shippingAddress?.email || user.email,
  };
  order.retryCount = Number(order.retryCount || 0) + 1;
  await order.save();

  return cfOrder;
}

// @desc    Create Cashfree order and persist application order
// @route   POST /api/payment/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  if (!cashfreeConfig) {
    const err = new Error('Cashfree configuration missing. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.');
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
  let pendingOrder = await Order.findOne({
    user: req.user._id,
    paymentMethod: 'Cashfree',
    isPaid: false,
    stockDeductedAt: { $ne: null },
    paymentStatus: { $in: ['pending', 'processing', 'cancelled', 'failed'] },
    totalPrice,
  }).sort({ createdAt: -1 });

  if (pendingOrder?.paymentStatus === 'processing' && pendingOrder.paymentGateway?.sessionId) {
    try {
      const cfOrder = await fetchCashfreeOrder(pendingOrder.paymentGateway.orderId);
      const payments = await fetchCashfreePayments(pendingOrder.paymentGateway.orderId);
      const state = getCashfreePaymentState(cfOrder, payments);
      if (state.status === 'processing') {
        return res.json({
          appOrderId: pendingOrder._id,
          orderId: pendingOrder.paymentGateway.orderId,
          paymentSessionId: pendingOrder.paymentGateway.sessionId,
          amount: pendingOrder.totalPrice,
          currency: 'INR',
          environment: cashfreeConfig.env,
        });
      }
      if (state.status === 'paid') {
        await markOrderPaid({
          order: pendingOrder,
          cashfreeOrderId: pendingOrder.paymentGateway.orderId,
          cashfreePaymentId: getPaymentId(state.payment),
          payment: state.payment,
          rawEvent: { order: cfOrder, payments },
        });
        await clearCartForUser(req.user._id);
        const err = new Error('This order is already paid.');
        err.statusCode = 409;
        throw err;
      }
      await updateUnpaidOrder(pendingOrder, state.status, {
        payment: state.payment,
        raw: { order: cfOrder, payments },
        source: 'retry_check',
      });
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      console.error('[Cashfree] Existing session check failed', error?.response?.data || error.message);
    }
  }

  let createdNewOrder = false;
  if (!pendingOrder) {
    pendingOrder = await createOrderFromCart({
      user: req.user,
      shippingAddress,
      paymentMethod: 'Cashfree',
      clearCartAfterCreation: false,
    });
    createdNewOrder = true;
  }

  try {
    const cfOrder = await createCashfreeOrderForAppOrder(pendingOrder, shippingAddress, req.user);
    return res.json({
      appOrderId: pendingOrder._id,
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amount: cfOrder.order_amount,
      currency: cfOrder.order_currency,
      environment: cashfreeConfig.env,
    });
  } catch (cfErr) {
    const cfMessage = cfErr?.response?.data?.message || cfErr.message || 'Cashfree payment order creation failed';
    console.error('[Cashfree Error]', cfErr?.response?.data || cfErr.message);
    pendingOrder.paymentStatus = 'failed';
    pendingOrder.paymentResult = { status: 'failed', update_time: new Date().toISOString() };
    pendingOrder.paymentLogs.push({
      event: 'create_order_failed',
      status: 'failed',
      source: 'backend',
      message: cfMessage,
      raw: cfErr?.response?.data,
    });
    await pendingOrder.save();
    if (createdNewOrder) {
      try {
        await cancelOrderAndRestoreStock(pendingOrder._id);
      } catch (restoreErr) {
        console.error('[Order] Stock restore failed after Cashfree create failure', restoreErr.message);
      }
    }

    const err = new Error(`Cashfree Error: ${cfMessage}`);
    err.statusCode = cfErr?.response?.status === 401 ? 502 : (cfErr?.response?.status || 502);
    if (createdNewOrder) err.statusCode = err.statusCode || 502;
    throw err;
  }
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

  const { appOrderId, cashfree_order_id, cashfree_payment_id, checkout_status } = req.body;
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

  const cfOrder = await fetchCashfreeOrder(cashfree_order_id);
  if (Number(cfOrder.order_amount).toFixed(2) !== Number(order.totalPrice).toFixed(2)) {
    const err = new Error('Payment amount mismatch');
    err.statusCode = 400;
    throw err;
  }

  const payments = await fetchCashfreePayments(cashfree_order_id);
  const state = getCashfreePaymentState(cfOrder, payments);
  if (state.status === 'processing' && checkout_status === 'cancelled') {
    state.status = 'cancelled';
  }
  const paymentId = getPaymentId(state.payment, cashfree_payment_id);

  if (state.status === 'paid') {
    await markOrderPaid({
      order,
      cashfreeOrderId: cashfree_order_id,
      cashfreePaymentId: paymentId,
      payment: state.payment,
      rawEvent: { order: cfOrder, payments },
    });
    await clearCartForUser(req.user._id);
    const updatedOrder = await Order.findById(appOrderId).lean();

    return res.json({
      success: true,
      status: 'paid',
      orderId: updatedOrder._id,
      invoiceUrl: updatedOrder.invoice?.invoiceUrl,
      invoiceNumber: updatedOrder.invoice?.invoiceNumber,
      message: 'Payment verified successfully',
    });
  }

  await updateUnpaidOrder(order, state.status, {
    payment: state.payment,
    raw: { order: cfOrder, payments },
    source: 'verify',
    message: 'Payment not completed',
  });

  return res.json({
    success: false,
    status: state.status,
    orderId: order._id,
    message: state.status === 'processing' ? 'Payment is still processing' : 'Payment was not completed',
  });
});

// @desc    Cashfree webhook
// @route   POST /api/webhook/cashfree
// @access  Public (signature verified)
const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  if (!cashfreeConfig) {
    const err = new Error('Cashfree is not configured');
    err.statusCode = 500;
    throw err;
  }

  const webhookSecret = cleanEnv(process.env.CASHFREE_WEBHOOK_SECRET || cashfreeConfig.clientSecret);
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

  if (!signature || !timestamp) {
    const err = new Error('Missing Cashfree webhook signature');
    err.statusCode = 400;
    throw err;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest('base64');

  const provided = Buffer.from(String(signature), 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    const err = new Error('Invalid Cashfree webhook signature');
    err.statusCode = 400;
    throw err;
  }

  const event = JSON.parse(rawBody);
  const eventType = event.type || event.event || 'cashfree_event';
  const cfOrderId = event.data?.order?.order_id || event.order?.order_id || event.order?.id;
  const payment = event.data?.payment || event.payment || null;
  const cfPaymentId = getPaymentId(payment);
  const eventId = event.id || event.event_id || `${eventType}:${cfOrderId || 'unknown'}:${cfPaymentId || event.event_time || event.data?.payment?.payment_time || ''}`;

  if (!cfOrderId) {
    return res.status(200).json({ received: true, skipped: true });
  }

  const order = await Order.findOne({ 'paymentGateway.orderId': cfOrderId });
  if (!order) {
    return res.status(200).json({ received: true, note: 'Order not found' });
  }

  const alreadyProcessed = order.paymentLogs?.some((log) => log.source === 'webhook' && log.event === eventId);
  if (alreadyProcessed) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const cfOrder = await fetchCashfreeOrder(cfOrderId);
  const payments = await fetchCashfreePayments(cfOrderId);
  const state = getCashfreePaymentState(cfOrder, payments.length ? payments : [payment].filter(Boolean));
  const paymentId = getPaymentId(state.payment, cfPaymentId);

  if (state.status === 'paid') {
    await markOrderPaid({
      order,
      cashfreeOrderId: cfOrderId,
      cashfreePaymentId: paymentId,
      payment: state.payment || payment,
      webhookEventId: eventId,
      rawEvent: event,
    });
    await clearCartForUser(order.user);
    const paidOrder = await Order.findById(order._id);
    paidOrder.paymentLogs.push({
      event: eventId,
      status: 'paid',
      source: 'webhook',
      gatewayOrderId: cfOrderId,
      gatewayPaymentId: paymentId,
      raw: event,
    });
    await paidOrder.save();
    return res.status(200).json({ received: true });
  }

  await updateUnpaidOrder(order, state.status, {
    payment: state.payment || payment,
    raw: event,
    source: 'webhook',
    eventId,
    message: eventType,
  });

  return res.status(200).json({ received: true });
});

module.exports = { createOrder, verifyPayment, handleCashfreeWebhook };
