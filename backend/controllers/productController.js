const path = require("path");
const fs = require("fs");
const Product = require("../models/product");
const asyncHandler = require("../utils/asyncHandler");
const { cloudinary, hasCloudinary } = require("../config/cloudinary");

// @desc    Fetch all products with pagination, search, filters & sorting
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = req.query.pageSize ?? 12;
  const pageNumber = req.query.pageNumber ?? 1;

  const searchTerm = req.query.search || req.query.keyword;
  const category = req.query.category;
  const inStock = req.query.inStock;
  const sortBy = req.query.sortBy;

  const filter = {};
  if (searchTerm) {
    filter.$or = [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ];
  }
  if (category && category !== "All") filter.category = category;
  if (inStock) filter.stock = { $gt: 0 };

  const sortConfig = {};
  if (sortBy === "price-asc") sortConfig.price = 1;
  else if (sortBy === "price-desc") sortConfig.price = -1;
  else if (sortBy === "rating") sortConfig.ratings = -1;
  else sortConfig.createdAt = -1;

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .sort(sortConfig)
    .limit(pageSize)
    .skip(pageSize * (pageNumber - 1));

  res.json({
    products,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    total,
  });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
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

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  await Product.deleteOne({ _id: product._id });
  res.json({ message: "Product removed" });
});

// @desc    Upload product image (local upload, optional Cloudinary upload)
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

  // Upload to Cloudinary when configured; otherwise keep local URL.
  let url;
  if (hasCloudinary) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "vanca-patina/products",
      resource_type: "image",
    });
    url = result.secure_url;
  } else {
    url = `/uploads/${path.basename(req.file.filename || req.file.path)}`;
  }

  // Store the resulting image URL in DB.
  product.image = url;
  if (!Array.isArray(product.images)) product.images = [];
  product.images = [...product.images, url].slice(-10); // cap to avoid unbounded growth
  await product.save();

  // Cleanup local upload file after we upload to Cloudinary.
  // (If Cloudinary isn't configured, we keep the file so the local URL works.)
  if (hasCloudinary) {
    fs.unlink(req.file.path, () => {});
  }

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
