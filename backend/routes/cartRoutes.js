const express = require('express');
const router = express.Router();
const { getUserCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const { addToCartSchema, updateCartSchema, idParamSchema } = require('../validators/schemas');

router.route('/')
  .get(protect, getUserCart)
  .post(protect, validate(addToCartSchema), addToCart)
  .put(protect, validate(updateCartSchema), updateCartItem);

router.route('/:id')
  .delete(protect, validate(idParamSchema, 'params'), removeFromCart);

module.exports = router;
