const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/product');
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "id name email")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // processing, shipped, delivered
  const order = await Order.findById(req.params.id);

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const transitions = {
    processing: ["shipped", "delivered"],
    shipped: ["delivered"],
    delivered: [],
  };

  if (!transitions[order.status].includes(status)) {
    const err = new Error("Invalid status transition");
    err.statusCode = 400;
    throw err;
  }

  order.status = status;
  if (status === "delivered") {
    order.isPaid = true;
    order.paidAt = Date.now();
  }

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password");
  res.json(users);
});

// @desc    Get Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();

  const orders = await Order.find({ isPaid: true });
  const totalRevenue = orders.reduce(
    (acc, order) => acc + order.totalPrice,
    0
  );

  const latestOrders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    totalUsers,
    totalOrders,
    totalRevenue,
    latestOrders,
  });
});

module.exports = { getAllOrders, updateOrderStatus, getAllUsers, getDashboardStats };
