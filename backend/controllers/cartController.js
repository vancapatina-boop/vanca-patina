const Cart = require('../models/Cart');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
const getUserCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (cart) {
      res.json(cart);
    } else {
      res.json({ items: [] });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add to cart
// @route   POST /api/cart
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, qty: qty || 1 }],
      });
      return res.status(201).json(cart);
    }

    const itemExists = cart.items.find((item) => item.product.toString() === productId);

    if (itemExists) {
      itemExists.qty = Number(itemExists.qty) + Number(qty || 1);
    } else {
      cart.items.push({ product: productId, qty: qty || 1 });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update cart item
// @route   PUT /api/cart
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
      const item = cart.items.find((item) => item.product.toString() === productId);
      if (item) {
        item.qty = qty;
        await cart.save();
        return res.json(cart);
      }
    }
    res.status(404).json({ message: 'Cart or item not found' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
      cart.items = cart.items.filter((item) => item.product.toString() !== req.params.id);
      await cart.save();
      res.json(cart);
    } else {
      res.status(404).json({ message: 'Cart not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserCart, addToCart, updateCartItem, removeFromCart };
