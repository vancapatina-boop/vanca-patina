const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => value.length <= 5,
        message: "A review can include up to 5 images",
      },
    },
    video: {
      type: String,
      default: "",
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulBy: {
      type: [String],
      default: [],
      select: false,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    reportedBy: {
      type: [String],
      default: [],
      select: false,
    },
    adminReply: {
      body: { type: String, trim: true, maxlength: 1200 },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      repliedAt: { type: Date },
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "hidden"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ productId: 1, approvalStatus: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, approvalStatus: 1, rating: -1 });
reviewSchema.index(
  { productId: 1, userId: 1 },
  { partialFilterExpression: { userId: { $exists: true } } }
);
reviewSchema.index(
  { productId: 1, orderId: 1 },
  { partialFilterExpression: { orderId: { $exists: true } } }
);
reviewSchema.index({ productId: 1, customerEmail: 1, createdAt: -1 });
reviewSchema.index({ title: "text", comment: "text" });

module.exports = mongoose.model("Review", reviewSchema);
