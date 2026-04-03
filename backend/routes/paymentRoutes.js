const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validators/validate');
const { createPaymentOrderSchema, verifyPaymentSchema } = require('../validators/schemas');

router.post('/create-order', protect, validate(createPaymentOrderSchema), createOrder);
router.post('/verify', protect, validate(verifyPaymentSchema), verifyPayment);

module.exports = router;
