# VANCA PATINA - Quick Start & Architecture Guide

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- MongoDB 5+
- Git

### Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your values:
# - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
# - MongoDB DB_URL
# - EMAIL credentials
# - JWT_SECRET

# Start development server
npm run dev
# Server runs on http://localhost:5000
```

### Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://localhost:5000" > .env

# Start dev server
npm run dev
# App runs on http://localhost:5173
```

### Test the Application

1. **Signup**: http://localhost:5173/register
2. **Verify Email**: Check console logs for test email
3. **Login**: Use verified credentials
4. **Add Product to Cart**: Browse products
5. **Checkout**: Complete payment with Razorpay test keys
6. **View Invoice**: Check order history

---

## System Architecture

### Technology Stack

#### Frontend
```
React 18.3 + TypeScript
├── Vite 5.4 (Build tool)
├── React Router 6.30 (Navigation)
├── TailwindCSS 3.4 (Styling)
├── ShadCN UI (Component library)
├── React Hook Form (Form management)
├── Axios (HTTP client)
├── React Query 5.83 (Data fetching)
└── Zod (Schema validation)
```

#### Backend
```
Express.js 5.2
├── MongoDB 9.3 (Database)
├── Mongoose 9.3 (ODM)
├── JWT (Authentication)
├── bcryptjs (Password hashing)
├── Razorpay SDK (Payments)
├── Puppeteer (PDF generation)
├── Cloudinary (Media storage)
├── Nodemailer (Email)
└── Helmet + CORS (Security)
```

### Database Schema

#### Core Models

##### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'user' | 'admin',
  phone: String,
  isVerified: Boolean,
  isBlocked: Boolean,
  addresses: Array,
  refreshTokens: Array,
  createdAt: Date,
  updatedAt: Date
}
```

##### Product
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  category: String,
  image: String (URL),
  images: Array,
  quantity: Number,
  ratings: Number,
  reviews: Array,
  createdAt: Date,
  updatedAt: Date
}
```

##### Order
```javascript
{
  _id: ObjectId,
  orderId: String (unique - VP-YYYYMMDD-HEX),
  user: ObjectId (ref: User),
  orderItems: Array,
  shippingAddress: Object,
  paymentMethod: 'Razorpay',
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentGateway: {
    provider: 'razorpay',
    orderId: String,
    paymentId: String,
    signature: String,
    webhookEventId: String
  },
  itemsPrice: Number,
  taxPrice: Number,
  shippingPrice: Number,
  totalPrice: Number,
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  invoice: {
    invoiceNumber: 'VP-YYYY-XXXX',
    status: 'not_requested' | 'ready' | 'failed',
    invoiceUrl: String,
    generatedAt: Date,
    emailedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

##### InvoiceCounter
```javascript
{
  _id: ObjectId,
  key: 'invoice:YYYY',
  sequence: Number
}
```

### API Endpoints Overview

#### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login with email/password
POST   /api/auth/admin-login           - Admin login
POST   /api/auth/logout                - Logout
GET    /api/auth/me                    - Get current user
POST   /api/auth/refresh               - Refresh JWT token
GET    /api/auth/verify-email/:token   - Verify email
POST   /api/auth/resend-verification   - Resend verification email
POST   /api/auth/forgot-password       - Request password reset
POST   /api/auth/reset-password        - Reset password
```

#### Products
```
GET    /api/products                   - List products (with filtering)
GET    /api/products/:id               - Product details
POST   /api/products                   - Create product (admin)
PUT    /api/products/:id               - Update product (admin)
DELETE /api/products/:id               - Delete product (admin)
```

#### Cart
```
GET    /api/cart                       - Get user's cart
POST   /api/cart                       - Add item to cart
PUT    /api/cart                       - Update cart item
DELETE /api/cart/:itemId               - Remove from cart
```

#### Orders
```
GET    /api/orders                     - Get user's orders
GET    /api/orders/:id                 - Order details
POST   /api/orders                     - Create order (deprecated)
PUT    /api/orders/:id                 - Update order status (admin)
```

#### Payment
```
POST   /api/payment/create-order       - Create Razorpay order
POST   /api/payment/verify             - Verify payment
POST   /api/webhook/razorpay           - Webhook endpoint
```

#### Invoices
```
GET    /api/invoice/:orderId           - Get order invoice
```

### Data Flow Diagrams

#### Signup Flow
```
┌──────────────────────────────────────────────────────────┐
│ 1. User Registration                                     │
├──────────────────────────────────────────────────────────┤
│ Frontend: User fills registration form                  │
│ POST /api/auth/register                                │
│ {name, email, password, acceptTerms}                  │
│                                                         │
│ Backend: Validation → Hash password → Create user     │
│          Generate verification token → Send email      │
│ Response: {email, requiresVerification: true}          │
│                                                         │
│ Frontend: Redirect to email verification page          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 2. Email Verification (1 hour window)                   │
├──────────────────────────────────────────────────────────┤
│ User clicks link: /verify-email/{token}               │
│                                                         │
│ Backend: Verify token → Check expiry → Mark verified │
│ Response: Redirect to login with success message       │
│                                                         │
│ Frontend: User can now login                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 3. Login                                                 │
├──────────────────────────────────────────────────────────┤
│ Frontend: User enters email + password                 │
│ POST /api/auth/login                                  │
│                                                         │
│ Backend: Validate credentials → Check verification   │
│          Check account not blocked → Issue tokens    │
│ Response: {accessToken, refreshToken, user}          │
│                                                         │
│ Frontend: Store tokens → Redirect to dashboard        │
└──────────────────────────────────────────────────────────┘
```

#### Payment Flow
```
┌──────────────────────────────────────────────────────────┐
│ 1. Checkout Initialize                                   │
├──────────────────────────────────────────────────────────┤
│ User selects shipping address & creates order          │
│ POST /api/payment/create-order                        │
│                                                         │
│ Backend: Validate cart → Create Order (pending)       │
│          Create Razorpay order → Return config        │
│ Response: {appOrderId, orderId, amount, key}         │
│                                                         │
│ Frontend: Show Razorpay payment modal                 │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 2. Payment Processing                                    │
├──────────────────────────────────────────────────────────┤
│ User completes payment in Razorpay modal              │
│ Razorpay generates: payment_id, order_id, signature   │
│                                                         │
│ Razorpay sends webhook + shows response on frontend   │
│                                                         │
│ Frontend: Sends verification request                  │
│ POST /api/payment/verify                             │
│ {appOrderId, razorpay_order_id, razorpay_payment_id} │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 3. Payment Verification                                  │
├──────────────────────────────────────────────────────────┤
│ Backend: Verify signature matches                      │
│          Update Order status to 'paid'                │
│          Generate invoice with Puppeteer             │
│          Upload PDF to Cloudinary                     │
│          Send invoice email to customer               │
│ Response: {success, orderId, invoiceUrl}             │
│                                                         │
│ Frontend: Show success + order confirmation           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 4. Webhook Verification (Idempotency)                    │
├──────────────────────────────────────────────────────────┤
│ Razorpay: Sends payment.captured webhook             │
│                                                         │
│ Backend: Verify signature                            │
│          Check webhookEventId (prevent duplicates)   │
│          If already processed: Skip silently          │
│          If new: Update order, generate invoice      │
│                                                         │
│ Response: {received: true}                           │
└──────────────────────────────────────────────────────────┘
```

#### Invoice Generation Flow
```
┌──────────────────────────────────────────────────────────┐
│ Trigger: Payment success webhook or manual request      │
├──────────────────────────────────────────────────────────┤
│ 1. Generate invoice number (VP-YYYY-XXXX)              │
│ 2. Render HTML template with order data                │
│ 3. Convert HTML to PDF via Puppeteer                  │
│ 4. Upload PDF to Cloudinary                           │
│ 5. Store invoice URL + metadata in Order              │
│ 6. Send invoice email to customer                     │
│ 7. Log invoice generation (for admin)                 │
└──────────────────────────────────────────────────────────┘
```

### Security Architecture

#### Authentication Layers
```
Frontend           Backend              Database
─────────          ──────────           ────────
Access Token       Verify JWT           Load User
(15m TTL)          Extract user_id      Check verified
                   Validate token       Check blocked
                   
Refresh Token      Generate new         Store refresh
(7d TTL)           access token         tokens in array
```

#### Payment Security
```
Razorpay API
    ↓
Signature Verification (HMAC-SHA256)
    ↓
Event Type Check (payment.captured, order.paid)
    ↓
Order Ownership Verification
    ↓
Idempotency Check (via webhookEventId)
    ↓
Order Status Update + Invoice Generation
```

### Error Handling

#### Frontend Error Handling
```javascript
try {
  const response = await api.post('/endpoint', data);
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired, redirect to login
  } else if (error.response?.status === 403) {
    // Forbidden, show error message
  } else {
    // Other errors
  }
}
```

#### Backend Error Handling
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// In controller:
const handler = asyncHandler(async (req, res) => {
  // Errors thrown here are caught automatically
  throw new Error('Something went wrong');
});

// Error middleware catches and responds
// status 400: Client errors
// status 401: Auth errors
// status 403: Permission errors
// status 500: Server errors
```

### Performance Tips

#### Frontend
```javascript
// Use React.lazy for code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));

// Use React.memo for expensive components
const ProductCard = React.memo(({ product }) => {...});

// Optimize images
<img src={url} loading="lazy" alt="..." />
```

#### Backend
```javascript
// Index frequently queried fields
userSchema.index({ email: 1 });
orderSchema.index({ user: 1, createdAt: -1 });

// Select only needed fields
User.findById(id).select('-password');

// Populate smartly
Order.findById(id).populate('user', 'name email');
```

### Monitoring & Debugging

#### Development Mode
```bash
# Backend - see request logs
npm run dev  # Morgan logs all requests

# Frontend - open DevTools
F12 → Network/Console tab
```

#### Production Mode
```javascript
// Backend - structured logging
logger.info('Order created', { orderId, userId });
logger.error('Payment failed', { error, orderId });

// Frontend - error tracking
Sentry.captureException(error);
```

---

## Common Issues & Solutions

### Issue: "Not authorized, no token"
**Solution**: 
1. Check if login was successful
2. Verify tokens are stored in localStorage
3. Check token hasn't expired

### Issue: "Payment verification failed"
**Solution**:
1. Verify Razorpay keys in .env
2. Check webhook secret is correct
3. Ensure order exists and belongs to user

### Issue: "Invoice generation failed"
**Solution**:
1. Verify Cloudinary credentials
2. Check Puppeteer headless browser works
3. Verify order has valid data

### Issue: "Email not sent"
**Solution**:
1. Check EMAIL_USER and EMAIL_PASS in .env
2. Enable "Less secure apps" for Gmail
3. Check SMTP settings

---

## Useful Commands

```bash
# Backend
npm install        # Install dependencies
npm run dev        # Start development server
npm test          # Run tests
npm audit         # Check security vulnerabilities

# Frontend
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Check code quality

# Database
# MongoDB GUI tools:
# - MongoDB Compass (GUI)
# - mongosh (CLI)
```

---

## Next Steps

1. **Customize**: Update company details, colors, branding
2. **Test**: Run through entire flow with test payment
3. **Deploy**: Follow PRODUCTION_DEPLOYMENT_GUIDE.md
4. **Monitor**: Set up error tracking and performance monitoring
5. **Iterate**: Gather feedback and improve

---

**Happy coding! 🚀**
