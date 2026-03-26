const express = require('express');
const router = express.Router();
const { getAllOrders, updateOrderStatus, getAllUsers, getDashboardStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const { updateOrderStatusSchema, idParamSchema } = require('../validators/schemas');

router.route('/orders')
  .get(protect, admin, getAllOrders);

router.route('/orders/:id')
  .put(
    protect,
    admin,
    validate(idParamSchema, 'params'),
    validate(updateOrderStatusSchema),
    updateOrderStatus
  );

router.route('/users')
  .get(protect, admin, getAllUsers);

router.route('/stats')
  .get(protect, admin, getDashboardStats);

module.exports = router;
