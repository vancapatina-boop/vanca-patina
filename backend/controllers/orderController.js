const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { cancelOrderAndRestoreStock } = require('../services/orderService');

// @desc    Direct cart checkout disabled (Razorpay-only flow)
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (_req, res) => {
  const err = new Error(
    'Checkout is only available via Razorpay. Use POST /api/payment/create-order, then complete payment in the Razorpay modal.'
  );
  err.statusCode = 400;
  throw err;
});

// @desc    Get order by id
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email').lean();

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.user._id.toString() !== req.user._id.toString()) {
    const err = new Error('Not authorized to view this order');
    err.statusCode = 403;
    throw err;
  }

  res.json(order);
});

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json(orders);
});

// @desc    Cancel order and restore stock
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.user.toString() !== req.user._id.toString()) {
    const err = new Error('Not authorized to cancel this order');
    err.statusCode = 403;
    throw err;
  }

  const cancelledOrder = await cancelOrderAndRestoreStock(order._id);
  res.json(cancelledOrder);
});

module.exports = { addOrderItems, getOrderById, getMyOrders, cancelOrder };
