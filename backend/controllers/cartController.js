const Cart = require('../models/Cart');
const Product = require("../models/product");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getUserCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product"
  );
  if (!cart) return res.json({ items: [] });
  res.json(cart);
});

// @desc    Add to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, qty } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }
  if (product.stock <= 0) {
    const err = new Error("Product is out of stock");
    err.statusCode = 400;
    throw err;
  }

  let cart = await Cart.findOne({ user: req.user._id });
  const created = !cart;

  if (created) {
    cart = await Cart.create({
      user: req.user._id,
      items: [{ product: productId, qty: qty || 1 }],
    });
  } else {
    const itemExists = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (itemExists) {
      const nextQty = Number(itemExists.qty) + Number(qty || 1);
      itemExists.qty = Math.min(nextQty, product.stock);
    } else {
      cart.items.push({ product: productId, qty: Math.min(qty || 1, product.stock) });
    }
    await cart.save();
  }

  const populated = await Cart.findById(cart._id).populate("items.product");
  res.status(created ? 201 : 200).json(populated);
});

// @desc    Update cart item
// @route   PUT /api/cart
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, qty } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    const err = new Error("Cart not found");
    err.statusCode = 404;
    throw err;
  }

  const item = cart.items.find(
    (item) => item.product.toString() === productId
  );
  if (!item) {
    const err = new Error("Cart item not found");
    err.statusCode = 404;
    throw err;
  }

  item.qty = Math.min(Number(qty), product.stock);
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product");
  res.json(populated);
});

// @desc    Remove from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    const err = new Error("Cart not found");
    err.statusCode = 404;
    throw err;
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.id
  );
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product");
  res.json(populated);
});

module.exports = { getUserCart, addToCart, updateCartItem, removeFromCart };
