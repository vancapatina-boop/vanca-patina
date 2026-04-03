const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { createOrderFromCart } = require('../services/orderService');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  if (paymentMethod === 'Razorpay') {
    const err = new Error('Use payment endpoints for Razorpay');
    err.statusCode = 400;
    throw err;
  }

  const createdOrder = await createOrderFromCart({
    user: req.user,
    shippingAddress,
    paymentMethod,
  });

  if (createdOrder.paymentStatus === 'paid') {
    await ensureInvoiceForOrder(createdOrder._id, { notifyCustomer: true });
  }

  res.status(201).json(createdOrder);
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

module.exports = { addOrderItems, getOrderById, getMyOrders };
