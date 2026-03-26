const express = require('express');
const router = express.Router();
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage } = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
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

router.route('/:id')
  .get(validate(idParamSchema, 'params'), getProductById)
  .put(protect, admin, validate(idParamSchema, 'params'), validate(updateProductSchema), updateProduct)
  .delete(protect, admin, validate(idParamSchema, 'params'), deleteProduct);

module.exports = router;
