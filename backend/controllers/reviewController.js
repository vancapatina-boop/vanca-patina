const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Product = require("../models/product");
const Review = require("../models/Review");
const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const { hasCloudinary, uploadToCloudinary } = require("../config/cloudinary");

const APPROVED = "approved";
const REVIEWABLE_ORDER_STATUSES = new Set(["paid", "processing", "shipped", "delivered", "confirmed"]);
const PUBLIC_REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getActorKey(req) {
  if (req.user?._id) return `user:${req.user._id.toString()}`;
  return `ip:${req.ip || req.headers["x-forwarded-for"] || "unknown"}`;
}

function isPaidOrFulfilled(order) {
  const status = String(order.status || "").toLowerCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  return order.isPaid === true || paymentStatus === "paid" || REVIEWABLE_ORDER_STATUSES.has(status);
}

function orderContainsProduct(order, productId) {
  return (order.orderItems || []).some((item) => {
    const itemProduct = item.product?._id || item.product;
    return itemProduct && itemProduct.toString() === productId.toString();
  });
}

async function findReviewableOrder({ userId, productId, orderId }) {
  if (!userId) return null;
  const filter = { user: userId, "orderItems.product": productId };
  if (orderId && isObjectId(orderId)) filter._id = orderId;

  const order = await Order.findOne(filter).sort({ createdAt: -1 });
  if (!order || !isPaidOrFulfilled(order) || !orderContainsProduct(order, productId)) {
    return null;
  }

  return order;
}

async function uploadReviewAsset(file, productId, kind) {
  if (hasCloudinary) {
    const result = await uploadToCloudinary(file.buffer || file.path, {
      folder: `vanca-patina/reviews/${productId}`,
      public_id: `${kind}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      resource_type: kind === "video" ? "video" : "image",
      quality: kind === "video" ? undefined : "auto",
      fetch_format: kind === "video" ? undefined : "auto",
    });

    if (file.path) fs.unlink(file.path, () => {});
    return result.secure_url;
  }

  return `/uploads/reviews/${path.basename(file.filename || file.path)}`;
}

function serializeReview(review) {
  const doc = typeof review.toObject === "function" ? review.toObject() : review;
  return {
    ...doc,
    customerName: doc.customerName || doc.userId?.name || "Customer",
  };
}

async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        approvalStatus: APPROVED,
      },
    },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.averageRating ? Math.round(stats[0].averageRating * 10) / 10 : 0;
  const total = stats[0]?.totalReviews || 0;

  await Product.findByIdAndUpdate(productId, {
    ratings: rating,
    numReviews: total,
  });

  return { averageRating: rating, totalReviews: total };
}

async function getReviewSummaryForProduct(productId) {
  const distributionRows = await Review.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        approvalStatus: APPROVED,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalReviews = 0;
  let weighted = 0;

  distributionRows.forEach((row) => {
    const rating = Number(row._id);
    if (distribution[rating] !== undefined) {
      distribution[rating] = row.count;
      totalReviews += row.count;
      weighted += rating * row.count;
    }
  });

  const averageRating = totalReviews > 0 ? Math.round((weighted / totalReviews) * 10) / 10 : 0;

  return { averageRating, totalReviews, distribution };
}

function buildPublicReviewQuery(productId, query) {
  const filter = { productId, approvalStatus: APPROVED };
  if (query.rating) filter.rating = Number(query.rating);
  if (query.withPhotos === "true") filter.images = { $exists: true, $ne: [] };
  if (query.verified === "true") filter.verifiedPurchase = true;
  return filter;
}

function buildReviewSort(sortBy) {
  if (sortBy === "newest") return { createdAt: -1 };
  if (sortBy === "highest") return { rating: -1, createdAt: -1 };
  if (sortBy === "lowest") return { rating: 1, createdAt: -1 };
  if (sortBy === "photos") return { createdAt: -1 };
  return { helpfulCount: -1, createdAt: -1 };
}

const getProductReviews = asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  if (!isObjectId(productId)) {
    const err = new Error("Invalid product id");
    err.statusCode = 400;
    throw err;
  }

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 25);
  const filter = buildPublicReviewQuery(productId, req.query);
  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate("userId", "name")
    .sort(buildReviewSort(req.query.sortBy))
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const summary = await getReviewSummaryForProduct(productId);

  res.json({
    reviews: reviews.map(serializeReview),
    summary,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

const getProductReviewSummary = asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  if (!isObjectId(productId)) {
    const err = new Error("Invalid product id");
    err.statusCode = 400;
    throw err;
  }

  res.json(await getReviewSummaryForProduct(productId));
});

const getReviewEligibility = asyncHandler(async (req, res) => {
  res.json({ eligible: true, alreadyReviewed: false, eligibleOrders: [] });
});

const createReview = asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  if (!isObjectId(productId)) {
    const err = new Error("Invalid product id");
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findById(productId).select("_id");
  if (!product) {
    const err = new Error("Product not found");
    err.statusCode = 404;
    throw err;
  }

  const rating = Number(req.body.rating);
  const customerName = sanitizeText(req.body.customerName || req.user?.name || "Customer", 100);
  const customerEmail = normalizeEmail(req.body.customerEmail || req.user?.email);
  const title = sanitizeText(req.body.title, 120);
  const comment = sanitizeText(req.body.comment, 3000);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const err = new Error("Rating must be between 1 and 5");
    err.statusCode = 400;
    throw err;
  }

  if (!customerName || customerName.length < 2 || !isEmail(customerEmail)) {
    const err = new Error("Customer name and a valid email are required");
    err.statusCode = 400;
    throw err;
  }

  if (!title || title.length < 3 || !comment || comment.length < 10) {
    const err = new Error("Review title and detailed review are required");
    err.statusCode = 400;
    throw err;
  }

  const recentDuplicate = await Review.findOne({
    productId,
    customerEmail,
    createdAt: { $gte: new Date(Date.now() - PUBLIC_REVIEW_WINDOW_MS) },
  }).lean();
  if (recentDuplicate) {
    const err = new Error("You have already reviewed this product recently");
    err.statusCode = 409;
    throw err;
  }

  const order = await findReviewableOrder({ userId: req.user?._id, productId, orderId: req.body.orderId });
  const imageFiles = req.files?.images || [];
  const videoFiles = req.files?.video || [];

  if (imageFiles.length > 5) {
    const err = new Error("Upload up to 5 review images");
    err.statusCode = 400;
    throw err;
  }

  for (const image of imageFiles) {
    if (image.size > 10 * 1024 * 1024) {
      const err = new Error("Each review image must be 10 MB or less");
      err.statusCode = 400;
      throw err;
    }
  }

  if (videoFiles[0] && videoFiles[0].size > 50 * 1024 * 1024) {
    const err = new Error("Review video must be 50 MB or less");
    err.statusCode = 400;
    throw err;
  }

  const images = await Promise.all(imageFiles.map((file) => uploadReviewAsset(file, productId, "image")));
  const video = videoFiles[0] ? await uploadReviewAsset(videoFiles[0], productId, "video") : "";

  const review = await Review.create({
    productId,
    userId: req.user?._id,
    orderId: order?._id,
    customerName,
    customerEmail,
    rating,
    title,
    comment,
    images,
    video,
    verifiedPurchase: Boolean(order),
    approvalStatus: APPROVED,
  });
  await recalculateProductRating(productId);

  res.status(201).json({ message: "Review submitted", review: serializeReview(review) });
});

const updateReview = asyncHandler(async (req, res) => {
  const { id: productId, reviewId } = req.params;
  if (!isObjectId(productId) || !isObjectId(reviewId)) {
    const err = new Error("Invalid review id");
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findOne({ _id: reviewId, productId });
  if (!review) {
    const err = new Error("Review not found");
    err.statusCode = 404;
    throw err;
  }

  const customerEmail = normalizeEmail(req.body.customerEmail);
  if (customerEmail !== review.customerEmail) {
    const err = new Error("Use the same email used to submit this review");
    err.statusCode = 403;
    throw err;
  }

  if (req.body.rating !== undefined) {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const err = new Error("Rating must be between 1 and 5");
      err.statusCode = 400;
      throw err;
    }
    review.rating = rating;
  }

  if (req.body.title !== undefined) review.title = sanitizeText(req.body.title, 120);
  if (req.body.comment !== undefined) review.comment = sanitizeText(req.body.comment, 3000);
  if (req.body.customerName !== undefined) review.customerName = sanitizeText(req.body.customerName, 100);

  await review.save();
  await recalculateProductRating(productId);
  res.json(serializeReview(review));
});

const markReviewHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  if (!isObjectId(reviewId)) {
    const err = new Error("Invalid review id");
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findOneAndUpdate(
    { _id: reviewId, approvalStatus: APPROVED, helpfulBy: { $ne: getActorKey(req) } },
    { $inc: { helpfulCount: 1 }, $addToSet: { helpfulBy: getActorKey(req) } },
    { new: true }
  );

  if (!review) {
    const err = new Error("Review not found or already marked helpful");
    err.statusCode = 404;
    throw err;
  }

  res.json({ helpfulCount: review.helpfulCount });
});

const reportReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  if (!isObjectId(reviewId)) {
    const err = new Error("Invalid review id");
    err.statusCode = 400;
    throw err;
  }

  await Review.findOneAndUpdate(
    { _id: reviewId, approvalStatus: APPROVED, reportedBy: { $ne: getActorKey(req) } },
    { $inc: { reportCount: 1 }, $addToSet: { reportedBy: getActorKey(req) } }
  );

  res.json({ message: "Review reported" });
});

const getAdminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const filter = {};

  if (req.query.status && req.query.status !== "all") filter.approvalStatus = req.query.status;
  if (req.query.rating && req.query.rating !== "all") filter.rating = Number(req.query.rating);
  if (req.query.productId && isObjectId(req.query.productId)) filter.productId = req.query.productId;
  if (req.query.search) filter.$text = { $search: String(req.query.search).trim() };

  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate("productId", "name image")
    .populate("userId", "name email")
    .populate("orderId", "orderId")
    .populate("adminReply.repliedBy", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({ reviews: reviews.map(serializeReview), page, pages: Math.ceil(total / limit), total });
});

const updateAdminReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) {
    const err = new Error("Invalid review id");
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findById(id);
  if (!review) {
    const err = new Error("Review not found");
    err.statusCode = 404;
    throw err;
  }

  const previousStatus = review.approvalStatus;
  if (req.body.approvalStatus !== undefined) {
    if (!["pending", "approved", "rejected", "hidden"].includes(req.body.approvalStatus)) {
      const err = new Error("Invalid review status");
      err.statusCode = 400;
      throw err;
    }
    review.approvalStatus = req.body.approvalStatus;
  }

  if (req.body.reply !== undefined) {
    const body = sanitizeText(req.body.reply, 1200);
    review.adminReply = body ? { body, repliedBy: req.user._id, repliedAt: new Date() } : undefined;
  }

  if (req.body.rating !== undefined) {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const err = new Error("Rating must be between 1 and 5");
      err.statusCode = 400;
      throw err;
    }
    review.rating = rating;
  }

  await review.save();
  if (previousStatus !== review.approvalStatus || review.approvalStatus === APPROVED) {
    await recalculateProductRating(review.productId);
  }

  res.json(serializeReview(review));
});

const deleteAdminReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) {
    const err = new Error("Invalid review id");
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findById(id);
  if (!review) {
    const err = new Error("Review not found");
    err.statusCode = 404;
    throw err;
  }

  const productId = review.productId;
  await Review.deleteOne({ _id: review._id });
  await recalculateProductRating(productId);

  res.json({ message: "Review deleted" });
});

module.exports = {
  getProductReviews,
  getProductReviewSummary,
  getReviewEligibility,
  createReview,
  updateReview,
  markReviewHelpful,
  reportReview,
  getAdminReviews,
  updateAdminReview,
  deleteAdminReview,
  recalculateProductRating,
};
