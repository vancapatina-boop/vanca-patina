const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  image: { type: String },
  price: { type: Number, required: true },
});

// Helper to generate a short unique order ID like VP-20260328-A3F2
function generateOrderId() {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20260328
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase(); // e.g. A3F2
  return `VP-${datePart}-${randomPart}`;
}

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, sparse: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerSnapshot: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  orderItems: [orderItemSchema],
  shippingAddress: {
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  paymentMethod: { type: String, enum: ['PayPal', 'COD', 'Razorpay'], default: 'PayPal' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentGateway: {
    provider: { type: String },
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
    webhookEventId: { type: String },
  },
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
  },
  itemsPrice: { type: Number, required: true, default: 0.0 },
  taxPrice: { type: Number, required: true, default: 0.0 },
  shippingPrice: { type: Number, required: true, default: 0.0 },
  totalPrice: { type: Number, required: true, default: 0.0 },
  isPaid: { type: Boolean, required: true, default: false },
  paidAt: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  invoice: {
    invoiceNumber: { type: String, unique: true, sparse: true, index: true },
    status: {
      type: String,
      enum: ['not_requested', 'ready', 'failed'],
      default: 'not_requested',
    },
    invoiceUrl: { type: String },
    invoicePublicId: { type: String },
    generatedAt: { type: Date },
    emailedAt: { type: Date },
  },
}, { timestamps: true });

orderSchema.index({ user: 1 });

// Auto-generate orderId only for brand-new orders (async style for Mongoose 6+)
orderSchema.pre('save', async function () {
  if (this.isNew && !this.orderId) {
    this.orderId = generateOrderId();
  }
});

module.exports = mongoose.model('Order', orderSchema);
