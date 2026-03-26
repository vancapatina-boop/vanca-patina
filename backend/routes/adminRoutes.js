const express = require('express');
const router = express.Router();
const { getAllOrders, updateOrderStatus, getAllUsers, getDashboardStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/orders')
  .get(protect, admin, getAllOrders);

router.route('/orders/:id')
  .put(protect, admin, updateOrderStatus);

router.route('/users')
  .get(protect, admin, getAllUsers);

router.route('/stats')
  .get(protect, admin, getDashboardStats);

module.exports = router;
