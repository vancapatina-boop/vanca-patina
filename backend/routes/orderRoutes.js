const express = require('express');
const router = express.Router();
const { addOrderItems, getOrderById, getMyOrders, cancelOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const { idParamSchema } = require('../validators/schemas');

router.route('/')
  .post(protect, addOrderItems);

router.route('/my')
  .get(protect, getMyOrders);

router.route('/:id')
  .get(protect, validate(idParamSchema, 'params'), getOrderById);

router.route('/:id/cancel')
  .put(protect, validate(idParamSchema, 'params'), cancelOrder);

module.exports = router;
