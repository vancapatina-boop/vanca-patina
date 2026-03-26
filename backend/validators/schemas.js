const { z } = require("zod");
const mongoose = require("mongoose");

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid id" });

const registerSchema = z.object({
  name: z.string().min(2).max(100).transform((s) => s.trim()),
  email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional().transform((s) => s.trim()),
    email: z.string().email().optional().transform((s) => s.trim().toLowerCase()),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields provided" });

const productBaseSchema = z.object({
  name: z.string().min(2).max(200).transform((s) => s.trim()),
  price: z.coerce.number().nonnegative(),
  category: z.string().min(1).max(100).transform((s) => s.trim()),
  description: z.string().min(10).max(5000).transform((s) => s.trim()),
  stock: z.coerce.number().int().nonnegative(),
  image: z.string().url().optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
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
  search: z.string().optional().transform((s) => s.trim()),
  keyword: z.string().optional().transform((s) => s.trim()),
  category: z.string().optional().transform((s) => s.trim()),
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

const checkoutSchema = z.object({
  shippingAddress: z.object({
    address: z.string().min(5).max(300),
    city: z.string().min(2).max(100),
    postalCode: z.string().min(3).max(20),
    country: z.string().min(2).max(100),
  }),
  paymentMethod: z.enum(["PayPal", "COD"]).default("PayPal"),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered"]),
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
  updateProfileSchema,
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  addToCartSchema,
  updateCartSchema,
  checkoutSchema,
  updateOrderStatusSchema,
  uploadProductImageSchema,
  idParamSchema,
};

