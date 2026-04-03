const path = require("path");
const fs   = require("fs");
const Product = require("../models/product");
const asyncHandler = require("../utils/asyncHandler");
const { hasCloudinary, uploadToCloudinary, deleteFromCloudinary, getPublicId } = require("../config/cloudinary");

// @desc    Fetch all products with pagination, search, filters & sorting
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize   = parseInt(req.query.pageSize)   || 12;
  const pageNumber = parseInt(req.query.pageNumber)  || 1;

  const searchTerm = req.query.search || req.query.keyword;
  const category   = req.query.category;
  const inStock    = req.query.inStock;
  const sortBy     = req.query.sortBy;

  const filter = {};
  if (searchTerm) {
    filter.$or = [
      { name:        { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }
  if (category && category !== "All") filter.category = category;
  if (inStock) filter.stock = { $gt: 0 };

  const sortConfig = {};
  if (sortBy === "price-asc")  sortConfig.price   = 1;
  else if (sortBy === "price-desc") sortConfig.price = -1;
  else if (sortBy === "rating")     sortConfig.ratings = -1;
  else sortConfig.createdAt = -1;

  const total    = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .sort(sortConfig)
    .limit(pageSize)
    .skip(pageSize * (pageNumber - 1))
    .lean();

  res.json({ products, page: pageNumber, pages: Math.ceil(total / pageSize), total });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }
  res.json(product);
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  Object.entries(req.body).forEach(([key, value]) => {
    if (value !== undefined) product[key] = value;
  });

  const updatedProduct = await product.save();
  res.json(updatedProduct);
});

// @desc    Delete a product (also deletes its Cloudinary image)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  // Delete Cloudinary images if present
  if (hasCloudinary) {
    const urls = [product.image, ...(product.images || [])].filter(Boolean);
    await Promise.all(urls.map(u => deleteFromCloudinary(getPublicId(u))));
  }

  await Product.deleteOne({ _id: product._id });
  res.json({ message: "Product removed" });
});

// @desc    Upload product image → Cloudinary (or local fallback)
// @route   POST /api/products/upload
// @access  Private/Admin
const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    const err = new Error("No image uploaded");
    err.statusCode = 400;
    throw err;
  }

  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  let url;
  if (hasCloudinary) {
    // req.file.buffer exists when using memoryStorage
    const source = req.file.buffer || req.file.path;
    const result = await uploadToCloudinary(source, {
      public_id: `product-${product._id}-${Date.now()}`,
    });
    url = result.secure_url;

    // If we also have an old local file, clean it up
    if (req.file.path) fs.unlink(req.file.path, () => {});
  } else {
    url = `/uploads/${path.basename(req.file.filename || req.file.path)}`;
  }

  // Persist URL in DB
  product.image = url;
  if (!Array.isArray(product.images)) product.images = [];
  product.images = [...product.images, url].slice(-10);
  await product.save();

  res.json({ url, images: product.images });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
};
