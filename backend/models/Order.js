const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  variant: { type: String, default: '250ml' },
  variantKey: { type: String },
  variantLabel: { type: String },
  variantSku: { type: String },
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
    fullName: { type: String },
    phoneNumber: { type: String },
    gstNumber: { type: String },
    email: { type: String },
    address1: { type: String },
    address2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, default: 'India' },
    addressType: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    isDefault: { type: Boolean, default: false },
  },
  paymentMethod: { type: String, default: 'Cashfree' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded'],
    default: 'pending',
  },
  paymentGateway: {
    provider: { type: String, default: 'cashfree' },
    environment: { type: String },
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
    webhookEventId: { type: String },
  },
  gatewayOrderId: { type: String, index: true },
  gatewayPaymentId: { type: String, index: true },
  paymentTime: { type: Date },
  transactionReference: { type: String },
  retryCount: { type: Number, default: 0 },
  paymentLogs: [{
    event: { type: String },
    status: { type: String },
    source: { type: String },
    gatewayOrderId: { type: String },
    gatewayPaymentId: { type: String },
    message: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  }],
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
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
  stockDeductedAt: { type: Date },
  status: {
    type: String,
    enum: [
      'PENDING_PAYMENT',
      'CONFIRMED',
      'PAID',
      'pending',
      'confirmed',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ],
    default: 'PENDING_PAYMENT',
  },
  invoice: {
    invoiceNumber: { type: String, sparse: true },
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

// Indexes for performance and uniqueness
orderSchema.index({ user: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
// Unique index for webhook deduplication (allows null values)
orderSchema.index({ 'paymentGateway.webhookEventId': 1 }, { unique: true, sparse: true });
// Unique index for invoice number
orderSchema.index({ 'invoice.invoiceNumber': 1 }, { unique: true, sparse: true });

// Auto-generate orderId only for brand-new orders (async style for Mongoose 6+)
orderSchema.pre('save', async function () {
  if (this.isNew && !this.orderId) {
    this.orderId = generateOrderId();
  }
});

module.exports = mongoose.model('Order', orderSchema);
