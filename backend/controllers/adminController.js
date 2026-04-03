const path = require('path');
const fs   = require('fs');
const Order = require('../models/Order');
const User  = require('../models/User');
const Product = require('../models/product');
const asyncHandler = require('../utils/asyncHandler');
const { hasCloudinary, uploadToCloudinary, deleteFromCloudinary, getPublicId } = require('../config/cloudinary');
const { ensureInvoiceForOrder } = require('../services/invoiceService');

// ==================== DASHBOARD ====================

// @desc    Get Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalOrders = await Order.countDocuments();
  const totalProducts = await Product.countDocuments();

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
    totalProducts,
    latestOrders,
  });
});

// ==================== ORDERS ====================

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
    pending: ["confirmed", "processing", "cancelled"],
    confirmed: ["processing", "shipped", "delivered", "cancelled"],
    processing: ["shipped", "delivered", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  if (order.status === status) {
    return res.json(order);
  }

  if (!transitions[order.status].includes(status)) {
    const err = new Error("Invalid status transition");
    err.statusCode = 400;
    throw err;
  }

  order.status = status;
  if (status === "delivered") {
    order.isPaid = true;
    order.paidAt = order.paidAt || Date.now();
    if (order.paymentMethod === 'COD' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.paymentResult = {
        ...(order.paymentResult || {}),
        status: 'completed',
        update_time: new Date().toISOString(),
        email_address: order.customerSnapshot?.email,
      };
    }
  }

  if (status === "cancelled") {
    // restore stock for cancelled orders where not delivered
    await Promise.all(
      order.orderItems.map((item) =>
        Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } })
      )
    );
  }

  const updatedOrder = await order.save();
  if (status === 'delivered') {
    await ensureInvoiceForOrder(updatedOrder._id, { notifyCustomer: true });
  }
  res.json(updatedOrder);
});

// ==================== PRODUCTS ====================

// @desc    Create product
// @route   POST /api/admin/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { name, price, description, category, finishType, stock, image } = req.body;

  const productExists = await Product.findOne({ name });
  if (productExists) {
    const err = new Error("Product already exists");
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.create({
    name,
    price,
    description,
    category,
    finishType: finishType || "Standard",
    stock: stock || 0,
    image,
    ratings: 0,
    numReviews: 0,
  });

  res.status(201).json(product);
});

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, price, description, category, finishType, stock, image } = req.body;

  let product = await Product.findById(req.params.id);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  // Check for duplicate name (excluding current product)
  if (name && name !== product.name) {
    const duplicate = await Product.findOne({ name });
    if (duplicate) {
      const err = new Error("Product name already exists");
      err.statusCode = 400;
      throw err;
    }
  }

  product.name = name || product.name;
  product.price = price !== undefined ? price : product.price;
  product.description = description || product.description;
  product.category = category || product.category;
  product.finishType = finishType || product.finishType;
  product.stock = stock !== undefined ? stock : product.stock;
  product.image = image || product.image;

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

// @desc    Delete product (also removes Cloudinary images)
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  // Clean up Cloudinary assets before deleting the product document
  if (hasCloudinary) {
    const urls = [product.image, ...(product.images || [])].filter(Boolean);
    await Promise.all(urls.map(u => deleteFromCloudinary(getPublicId(u))));
  }

  await Product.deleteOne({ _id: product._id });
  res.json({ message: "Product deleted successfully", product });
});

// @desc    Upload image for a product (admin dashboard)
// @route   POST /api/admin/products/upload
// @access  Private/Admin
const uploadAdminProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    const err = new Error('No image uploaded');
    err.statusCode = 400;
    throw err;
  }

  let url;
  if (hasCloudinary) {
    const source = req.file.buffer || req.file.path;
    const result = await uploadToCloudinary(source, {
      public_id: `admin-product-${Date.now()}`,
    });
    url = result.secure_url;
    if (req.file.path) fs.unlink(req.file.path, () => {});
  } else {
    url = `/uploads/${path.basename(req.file.filename || req.file.path)}`;
  }

  // If productId provided, update the product record immediately
  const { productId } = req.body;
  if (productId) {
    const product = await Product.findById(productId);
    if (product) {
      product.image = url;
      if (!Array.isArray(product.images)) product.images = [];
      product.images = [...product.images, url].slice(-10);
      await product.save();
    }
  }

  res.json({ url });
});

// @desc    Get all products (admin view with full details)
// @route   GET /api/admin/products
// @access  Private/Admin
const getAdminProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const total = await Product.countDocuments();
  const products = await Product.find({})
    .skip(skip)
    .limit(limit);

  res.json({
    products,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total,
    }
  });
});

// ==================== CATEGORIES ====================

// @desc    Get unique categories
// @route   GET /api/admin/categories
// @access  Private/Admin
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");
  res.json(categories);
});

// @desc    Update category name across all products
// @route   PUT /api/admin/categories
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { oldName, newName } = req.body;

  if (!oldName || !newName) {
    const err = new Error("Both oldName and newName are required");
    err.statusCode = 400;
    throw err;
  }

  const updated = await Product.updateMany(
    { category: oldName },
    { $set: { category: newName } }
  );

  if (updated.matchedCount === 0) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  res.json({
    message: "Category updated successfully",
    matchedCount: updated.matchedCount,
    modifiedCount: updated.modifiedCount,
  });
});

// @desc    Delete category
// @route   DELETE /api/admin/categories/:category
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const products = await Product.find({ category });
  if (products.length === 0) {
    const err = new Error("Category not found");
    err.statusCode = 404;
    throw err;
  }

  // Delete all products in this category
  await Product.deleteMany({ category });

  res.json({
    message: "Category and all products deleted successfully",
    deletedCount: products.length,
  });
});

// ==================== USERS ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshTokens");
  res.json(users);
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password -refreshTokens");

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  res.json(user);
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  // Also delete user's orders and cart
  await Order.deleteMany({ user: req.params.id });

  res.json({
    message: "User and associated data deleted successfully",
    user: user.email,
  });
});

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadAdminProductImage,
  getAdminProducts,
  getCategories,
  updateCategory,
  deleteCategory,
  getAllUsers,
  getUserById,
  deleteUser,
};
