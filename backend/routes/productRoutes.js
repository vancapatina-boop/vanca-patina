const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage } = require('../controllers/productController');
const {
  getProductReviews,
  getProductReviewSummary,
  getReviewEligibility,
  createReview,
  updateReview,
  markReviewHelpful,
  reportReview,
} = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const reviewUpload = require('../middleware/reviewUploadMiddleware');
const validate = require('../validators/validate');
const {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  idParamSchema,
  uploadProductImageSchema,
} = require('../validators/schemas');

router.route('/')
  .get(validate(getProductsQuerySchema, 'query'), getProducts)
  .post(protect, admin, validate(createProductSchema), createProduct);

router.post(
  '/upload',
  protect,
  admin,
  upload.single('image'),
  validate(uploadProductImageSchema),
  uploadProductImage
);

const reviewWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/:id/reviews', getProductReviews);
router.get('/:id/reviews/summary', getProductReviewSummary);
router.get('/:id/reviews/eligibility', getReviewEligibility);
router.post(
  '/:id/reviews',
  reviewWriteLimiter,
  reviewUpload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 },
  ]),
  createReview
);
router.put('/:id/reviews/:reviewId', reviewWriteLimiter, updateReview);
router.patch('/:id/reviews/:reviewId/helpful', reviewWriteLimiter, markReviewHelpful);
router.post('/:id/reviews/:reviewId/report', reviewWriteLimiter, reportReview);

router.route('/:id')
  .get(validate(idParamSchema, 'params'), getProductById)
  .put(protect, admin, validate(idParamSchema, 'params'), validate(updateProductSchema), updateProduct)
  .delete(protect, admin, validate(idParamSchema, 'params'), deleteProduct);

module.exports = router;
