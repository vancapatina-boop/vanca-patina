const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
  images: [String],
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  finishType: {
    type: String,
    enum: ["Matte", "Glossy", "Satin", "Standard", "Antique", "Brushed", "Polished", "Textured", "Metallic", "Clear Coat"],
    default: "Standard"
  },
  ratings: {
    type: Number,
    required: true,
    default: 0
  },
  numReviews: {
    type: Number,
    required: true,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);