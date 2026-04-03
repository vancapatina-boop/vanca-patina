const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getInvoiceForUser, downloadInvoiceForUser } = require('../controllers/invoiceController');

router.get('/:orderId', protect, getInvoiceForUser);
router.get('/:orderId/download', protect, downloadInvoiceForUser);

module.exports = router;
