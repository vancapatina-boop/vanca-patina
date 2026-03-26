const express = require('express');
const router = express.Router();
const { addOrderItems, getOrderById, getMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const { checkoutSchema, idParamSchema } = require('../validators/schemas');

router.route('/')
  .post(protect, validate(checkoutSchema), addOrderItems);

router.route('/my')
  .get(protect, getMyOrders);

router.route('/:id')
  .get(protect, validate(idParamSchema, 'params'), getOrderById);

module.exports = router;
