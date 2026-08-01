const Cart = require('../models/Cart');
const Product = require("../models/product");
const asyncHandler = require("../utils/asyncHandler");

function getVariant(product, variantKey) {
  if (!variantKey) return null;
  const variants = product.variants || {};
  let variant = variants instanceof Map ? variants.get(variantKey) : variants[variantKey];

  if (!variant && typeof variants === 'object') {
    const keys = variants instanceof Map ? Array.from(variants.keys()) : Object.keys(variants);
    const matchedKey = keys.find((k) => k.trim().toLowerCase() === variantKey.trim().toLowerCase());
    if (matchedKey) {
      variant = variants instanceof Map ? variants.get(matchedKey) : variants[matchedKey];
      variantKey = matchedKey;
    }
  }

  if (!variant) {
    const err = new Error("Selected product variant is not available");
    err.statusCode = 400;
    throw err;
  }
  return {
    key: variantKey,
    label: variant.label || variant.name || variantKey,
    price: Number(variant.salePrice ?? variant.price ?? 0),
    stock: Number(variant.stock ?? 0),
    sku: variant.sku,
  };
}

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
  const { productId, qty, variantKey } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }
  const variant = getVariant(product, variantKey);
  const availableStock = variant ? variant.stock : product.stock;
  if (availableStock <= 0) {
    const err = new Error("Product is out of stock");
    err.statusCode = 400;
    throw err;
  }

  let cart = await Cart.findOne({ user: req.user._id });
  const created = !cart;

  if (created) {
    cart = await Cart.create({
      user: req.user._id,
      items: [{
        product: productId,
        qty: Math.min(qty || 1, availableStock),
        variantKey: variant?.key,
        variantLabel: variant?.label,
        variantPrice: variant?.price,
        variantSku: variant?.sku,
      }],
    });
  } else {
    const itemExists = cart.items.find(
      (item) => item.product.toString() === productId && (item.variantKey || "") === (variantKey || "")
    );

    if (itemExists) {
      const nextQty = Number(itemExists.qty) + Number(qty || 1);
      itemExists.qty = Math.min(nextQty, availableStock);
      itemExists.variantPrice = variant?.price;
      itemExists.variantSku = variant?.sku;
    } else {
      cart.items.push({
        product: productId,
        qty: Math.min(qty || 1, availableStock),
        variantKey: variant?.key,
        variantLabel: variant?.label,
        variantPrice: variant?.price,
        variantSku: variant?.sku,
      });
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
  const { productId, qty, variantKey } = req.body;

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
    (item) => item.product.toString() === productId && (item.variantKey || "") === (variantKey || "")
  );
  if (!item) {
    const err = new Error("Cart item not found");
    err.statusCode = 404;
    throw err;
  }

  const variant = getVariant(product, variantKey);
  const availableStock = variant ? variant.stock : product.stock;
  item.qty = Math.min(Number(qty), availableStock);
  item.variantPrice = variant?.price;
  item.variantSku = variant?.sku;
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product");
  res.json(populated);
});

// @desc    Remove from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const { variantKey } = req.body || {};
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    const err = new Error("Cart not found");
    err.statusCode = 404;
    throw err;
  }

  cart.items = cart.items.filter(
    (item) => !(item.product.toString() === req.params.id && (item.variantKey || "") === (variantKey || ""))
  );
  await cart.save();

  const populated = await Cart.findById(cart._id).populate("items.product");
  res.json(populated);
});

module.exports = { getUserCart, addToCart, updateCartItem, removeFromCart };
