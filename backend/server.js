require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const { handleRazorpayWebhook } = require('./controllers/paymentController');

const app = express();

app.disable("x-powered-by");

app.use(cookieParser());

// Security headers
app.use(helmet());

// Request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Basic rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// express-mongo-sanitize was removed as it is incompatible with Express 5.x

// CORS: strict in production; permissive in development.
// This prevents "Network Error" in the browser when Vite is opened via a LAN IP.
const clientOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
  : [];

const isDevelopment = process.env.NODE_ENV !== "production";

const isLanOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return (
      /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (isDevelopment) {
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        isLanOrigin(origin)
      ) {
        return callback(null, true);
      }
    }

    if (clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.post('/api/webhook/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
app.use(express.json({ limit: "1mb" }));

// DB CONNECT
require("./config/db")();

const path = require('path');
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger docs
const swaggerSpec = require("./config/swagger");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/invoice', require('./routes/invoiceRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));

// test route
app.get("/", (req, res) => {
  res.send("API running...");
});

// Error handling middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
