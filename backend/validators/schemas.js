const { z } = require("zod");
const mongoose = require("mongoose");

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid id" });

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/\d/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

const registerSchema = z.object({
  name: z.string().min(2).max(100).transform((s) => s?.trim()),
  email: z.string().email().max(254).transform((s) => s?.trim().toLowerCase()),
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and privacy policy" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email().max(254).transform((s) => s?.trim().toLowerCase()),
  password: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().email().transform((s) => s?.trim().toLowerCase()),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254).transform((s) => s?.trim().toLowerCase()),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const sendOtpSchema = z.object({
  email: z.string().email().transform((s) => s?.trim().toLowerCase()),
});

const verifyOtpSchema = z.object({
  email: z.string().email().transform((s) => s?.trim().toLowerCase()),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const setPasswordSchema = z.object({
  email: z.string().email().transform((s) => s?.trim().toLowerCase()),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
  password: z.string().min(8).max(72),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional().transform((s) => s?.trim()),
    email: z.string().email().optional().transform((s) => s?.trim().toLowerCase()),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields provided" });

const productBaseSchema = z.object({
  name: z.string().min(2).max(200).transform((s) => s?.trim()),
  price: z.coerce.number().nonnegative(),
  category: z.string().min(1).max(100).transform((s) => s?.trim()),
  description: z.string().min(5).max(5000).transform((s) => s?.trim()),
  stock: z.coerce.number().int().nonnegative(),
  finishType: z.enum(["Matte", "Glossy", "Satin", "Standard", "Antique", "Brushed", "Polished", "Textured", "Metallic", "Clear Coat"]).default("Standard").optional(),
  image: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  ratings: z.coerce.number().nonnegative().optional(),
  numReviews: z.coerce.number().int().nonnegative().optional(),
});

const createProductSchema = productBaseSchema.required({
  name: true,
  price: true,
  category: true,
  description: true,
  stock: true,
});

const updateProductSchema = productBaseSchema.partial();

const getProductsQuerySchema = z.object({
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().positive().max(500).optional()),
  pageNumber: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .pipe(z.number().int().positive().optional()),
  search: z.string().optional().transform((s) => s?.trim()),
  keyword: z.string().optional().transform((s) => s?.trim()),
  category: z.string().optional().transform((s) => s?.trim()),
  inStock: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true" || v === "1")),
  sortBy: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim() : s))
    .pipe(
      z.enum(["newest", "price-asc", "price-desc", "rating"]).optional()
    ),
});

const addToCartSchema = z.object({
  productId: objectIdSchema,
  qty: z
    .coerce.number({ invalid_type_error: "qty must be a number" })
    .int()
    .positive()
    .optional()
    .default(1),
});

const updateCartSchema = addToCartSchema.extend({
  qty: z.coerce.number().int().positive(),
});

const addressSchema = z.object({
  label: z.string().min(1).max(50).optional().transform((s) => s?.trim()),
  // Legacy single-line address field (kept for backward compat)
  address: z.string().min(5).max(300).optional(),
  // New split address fields
  fullName: z.string().min(2).max(200).optional().transform((s) => s?.trim()),
  phoneNumber: z.string().min(10).max(15).optional().transform((s) => s?.trim()),
  email: z.string().email().optional().transform((s) => s?.trim().toLowerCase()),
  address1: z.string().min(3).max(300).optional().transform((s) => s?.trim()),
  address2: z.string().max(300).optional().transform((s) => s?.trim()),
  state: z.string().min(2).max(100).optional().transform((s) => s?.trim()),
  addressType: z.enum(["home", "work", "other"]).optional().default("home"),
  isDefault: z.boolean().optional(),
  // Shared required fields
  city: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(100).default("India"),
}).refine(
  (data) => data.address || data.address1,
  { message: "Either address or address1 is required", path: ["address1"] }
);

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["Razorpay"]).default("Razorpay"),
});

const createPaymentOrderSchema = z.object({
  shippingAddress: addressSchema,
});

const verifyPaymentSchema = z.object({
  appOrderId: objectIdSchema,
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
});

const uploadProductImageSchema = z.object({
  productId: objectIdSchema,
});

const idParamSchema = z.object({
  id: objectIdSchema,
});

module.exports = {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  sendOtpSchema,
  verifyOtpSchema,
  setPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  addToCartSchema,
  updateCartSchema,
  checkoutSchema,
  createPaymentOrderSchema,
  verifyPaymentSchema,
  addressSchema,
  updateOrderStatusSchema,
  uploadProductImageSchema,
  idParamSchema,
};
