const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: { type: String },
  addresses: [
    {
      label: { type: String, default: 'Home' },
      address: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String },
      isDefault: { type: Boolean, default: false },
    },
  ],
  refreshTokens: [
    {
      token: { type: String },
      expiresAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // OTP fields for hybrid authentication
  otp: { type: String },
  otpExpiry: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  verificationTokenHash: { type: String, default: null },
  verificationTokenExpires: { type: Date, default: null },
  passwordResetTokenHash: { type: String, default: null },
  passwordResetTokenExpires: { type: Date, default: null },
  isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
