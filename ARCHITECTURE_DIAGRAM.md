# 🏗️ ADMIN SYSTEM ARCHITECTURE

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     VANCA PATINA - Admin System                 │
│                   (Production-Ready Setup)                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE (Frontend)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Admin Login Page (/admin/login)            │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │ Email Input / Password Input / Login Button      │  │    │
│  │  │ Error Messages / Toast Notifications            │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │              ↓ POST /api/auth/admin-login              │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │ Store Token + Role in localStorage               │  │    │
│  │  │ Redirect to /admin/dashboard                     │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │     Admin Dashboard (/admin/dashboard) - Protected      │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │               PrivateRoute Wrapper               │  │    │
│  │  │         (Checks token + admin role)              │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                        ↓                                │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │              Admin Dashboard Tabs                │  │    │
│  │  ├────────────────────────────────────────────────┤  │    │
│  │  │ Dashboard  │ Products  │ Orders  │ Users │     │  │    │
│  │  └────────────────────────────────────────────────┘  │    │
│  │                     ↓ ↓ ↓ ↓                            │    │
│  │  ┌────────────────────────────────────────────────┐  │    │
│  │  │ Charts │ Forms │ Tables │ Modals │ Toast Alerts │ │    │
│  │  └────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│           ↓ API Calls with Bearer Token                         │
│           ↓ Authorization: Bearer <JWT_TOKEN>                   │
└──────────────────────────────────────────────────────────────────┘
                            ↑
                            ↓
                    ┌───────────────┐
                    │  HTTP/HTTPS   │
                    │  JSON API     │
                    └───────────────┘
                            ↑
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│                      SERVER SIDE (Backend)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Express.js Routes Layer                    │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                           │    │
│  │  Auth Routes:                                            │    │
│  │  ├─ POST /api/auth/admin-login → adminLogin            │    │
│  │                                                           │    │
│  │  Admin Routes (Protected):                               │    │
│  │  ├─ GET  /api/admin/stats → getDashboardStats          │    │
│  │  ├─ GET  /api/admin/orders → getAllOrders              │    │
│  │  ├─ PUT  /api/admin/orders/:id → updateOrderStatus    │    │
│  │  ├─ GET  /api/admin/products → getAdminProducts        │    │
│  │  ├─ POST /api/admin/products → createProduct           │    │
│  │  ├─ PUT  /api/admin/products/:id → updateProduct       │    │
│  │  ├─ DELETE /api/admin/products/:id → deleteProduct     │    │
│  │  ├─ GET  /api/admin/categories → getCategories         │    │
│  │  ├─ PUT  /api/admin/categories → updateCategory        │    │
│  │  ├─ DELETE /api/admin/categories/:cat → deleteCategory │    │
│  │  ├─ GET  /api/admin/users → getAllUsers                │    │
│  │  ├─ GET  /api/admin/users/:id → getUserById            │    │
│  │  └─ DELETE /api/admin/users/:id → deleteUser           │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Middleware Layer (Request Validation)           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                           │    │
│  │  protect → authMiddleware.js                             │    │
│  │  ├─ Check Authorization header                           │    │
│  │  ├─ Verify JWT signature                                 │    │
│  │  ├─ Fetch user from database                             │    │
│  │  └─ Attach req.user object                               │    │
│  │                                                           │    │
│  │  admin → requireRole('admin')                            │    │
│  │  ├─ Check req.user.role === 'admin'                      │    │
│  │  └─ Return 403 if not admin                              │    │
│  │                                                           │    │
│  │  validate(schema) → Zod validator                        │    │
│  │  ├─ Parse and validate request body                      │    │
│  │  └─ Return 400 if invalid                                │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │        Controller Layer (Business Logic)                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                           │    │
│  │  adminController.js:                                     │    │
│  │  ├─ getDashboardStats()                                  │    │
│  │  ├─ getAllOrders() / updateOrderStatus()                │    │
│  │  ├─ createProduct() / updateProduct() / deleteProduct() │    │
│  │  ├─ getCategories() / updateCategory() / deleteCategory│    │
│  │  └─ getAllUsers() / getUserById() / deleteUser()        │    │
│  │                                                           │    │
│  │  authController.js:                                      │    │
│  │  ├─ adminLogin() ← NEW                                   │    │
│  │  ├─ Verify email === ADMIN_EMAIL                         │    │
│  │  ├─ Verify password                                      │    │
│  │  ├─ Check user.role === 'admin'                          │    │
│  │  └─ Generate JWT token                                   │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │        Data Layer (MongoDB Models)                      │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                           │    │
│  │  User Model:                                             │    │
│  │  ├─ name, email, password, role                         │    │
│  │  ├─ phone, addresses, refreshTokens                      │    │
│  │  └─ Enum: role ∈ ['user', 'admin']                       │    │
│  │                                                           │    │
│  │  Product Model:                                          │    │
│  │  ├─ name, price, description, category                  │    │
│  │  ├─ stock, image, finishType, rating, reviews           │    │
│  │  └─ Indexes: name (unique), category, stock             │    │
│  │                                                           │    │
│  │  Order Model:                                            │    │
│  │  ├─ user (ref), orderItems, totalPrice                  │    │
│  │  ├─ status, isPaid, shippingAddress                      │    │
│  │  └─ Enum: status ∈ [pending, processing, shipped,       │    │
│  │                      delivered, cancelled]               │    │
│  │                                                           │    │
│  │  Cart Model:                                             │    │
│  │  ├─ user (ref), items (product ref + qty)               │    │
│  │  └─ Cascade delete on user deletion                      │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │          MongoDB Database (Collections)                 │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                           │    │
│  │  [users]      → User documents                           │    │
│  │  [products]   → Product documents                        │    │
│  │  [orders]     → Order documents                          │    │
│  │  [carts]      → Cart documents                           │    │
│  │                                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────┐
│  Admin Opens /admin/login in Browser│
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│  Enters Email + Password             │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│  Click "Access Dashboard" Button     │
└──────────────────┬──────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  POST /api/auth/admin-login                  │
│  {                                           │
│    "email": "admin@example.com",             │
│    "password": "password"                    │
│  }                                           │
└──────────────────┬───────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Backend Validation:  │
        ├──────────────────────┤
        │ 1. Email === ADMIN_EMAIL from .env      │
        │ 2. Password matches hashed password  │
        │ 3. user.role === 'admin'            │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────┐
        │ ✅ All checks pass      │
        └──────────────────┬───────┘
                           ↓
┌──────────────────────────────────────────────┐
│  Response 200 OK:                            │
│  {                                           │
│    "token": "eyJhbGc...",                    │
│    "refreshToken": "eyJhbGc...",             │
│    "role": "admin",                          │
│    "name": "Administrator"                   │
│  }                                           │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  Frontend stores in localStorage:            │
│  - token                                     │
│  - role ("admin")                            │
│  - refreshToken                              │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  PrivateRoute component checks:              │
│  - Token exists in localStorage              │
│  - user.role === "admin"                     │
│  ✅ All checks pass → Allow access          │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  Redirect to /admin/dashboard                │
│  AdminDashboard component loads              │
└──────────────────────────────────────────────┘
```

---

## API Request Flow with Authorization

```
┌────────────────────────────────┐
│  Frontend Component             │
│  (e.g., AdminDashboard.tsx)    │
└──────────────────┬─────────────┘
                   │
                   ├─ Fetch Token from localStorage
                   │
                   ↓
┌────────────────────────────────┐
│  API Call                       │
│  api.get('/api/admin/products') │
└──────────────────┬─────────────┘
                   │
                   ├─ axios interceptor catches request
                   ├─ Adds Authorization header:
                   │  "Authorization: Bearer <token>"
                   │
                   ↓
┌─────────────────────────────────────────┐
│  HTTP Request Sent to Server            │
│  Headers:                               │
│  ├─ Authorization: Bearer <JWT_TOKEN>   │
│  ├─ Content-Type: application/json      │
│  └─ Accept: application/json            │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│  Backend receives request                │
│  Express middleware checks:              │
├─────────────────────────────────────────┤
│                                          │
│  1. authMiddleware (protect)             │
│     ├─ Extract token from header         │
│     ├─ Verify JWT signature              │
│     ├─ Check token not expired           │
│     └─ Fetch User from database          │
│                                          │
│  2. roleMiddleware (admin)               │
│     ├─ Check req.user exists             │
│     ├─ Check req.user.role === 'admin'   │
│     └─ If not admin → throw 403 error    │
│                                          │
│  3. validateSchema                       │
│     ├─ Parse request body/params         │
│     ├─ Validate against Zod schema       │
│     └─ If invalid → throw 400 error      │
│                                          │
└──────────────────┬──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │ Validation passed? │
        └──────┬──────┬────────┘
               │      │
          YES │      │ NO
             ↓       ↓
      ┌────────┐  ┌──────────────┐
      │         │  │ Return Error │
      │ Run     │  │ Response     │
      │ Handler │  │ (400, 401,   │
      │ Function│  │  403, etc.)  │
      └────┬────┘  └──────────────┘
           │
           ↓
    ┌──────────────────┐
    │ Execute Business │
    │ Logic (Query DB, │
    │ Update Records)  │
    └────────┬─────────┘
             │
             ↓
    ┌──────────────────┐
    │ Return Response  │
    │ (200, 201, etc.) │
    └────────┬─────────┘
             │
             ↓
┌──────────────────────────────────────┐
│  Frontend receives Response           │
│  ├─ axios interceptor catches it      │
│  ├─ Check status code                 │
│  └─ Update component state with data  │
└──────────────────┬───────────────────┘
                   ↓
┌──────────────────────────────────────┐
│  UI Updates                           │
│  ├─ Loading state → false             │
│  ├─ Data → loaded data from response  │
│  ├─ Toast notification (success)      │
│  └─ Component re-renders with data    │
└──────────────────────────────────────┘
```

---

## Data Flow: Create Product

```
Admin User
    ↓
Fills Product Form
├─ Name: "New Product"
├─ Price: 5000
├─ Description: "..."
├─ Category: "Furniture"
├─ Stock: 20
└─ Finish Type: "Matte"
    ↓
Clicks "Create Product" Button
    ↓
Frontend validates using Zod schema
    ├─ name (2-200 chars)
    ├─ price (>= 0)
    ├─ description (10-5000 chars)
    ├─ category (1-100 chars)
    └─ stock (>= 0 integer)
    ↓
All validations pass
    ↓
Frontend shows loading spinner
    ↓
POST /api/admin/products
{
  "name": "New Product",
  "price": 5000,
  "description": "...",
  "category": "Furniture",
  "stock": 20,
  "finishType": "Matte"
}
    ↓
Backend receives request
├─ protect middleware: validates token
├─ admin middleware: validates role
└─ validate middleware: validates schema
    ↓
All middleware passes
    ↓
Controller: createProduct()
├─ Check if product name already exists
├─ If exists: throw error 400
└─ If not: create new product in DB
    ↓
MongoDB: Insert new document in products collection
    ↓
Product saved successfully
    ↓
Return Response 201:
{
  "_id": "new_product_id",
  "name": "New Product",
  "price": 5000,
  ...
  "createdAt": "2024-03-27T11:00:00Z"
}
    ↓
Frontend receives 201 response
├─ Stop loading spinner
├─ Toast: "Product created successfully!"
├─ Refresh products list via GET /api/admin/products
└─ Update table with new product
    ↓
Admin sees new product in the list
```

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│              Frontend Security Checks                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✓ PrivateRoute wrapper with requireAdmin               │
│  ✓ Check localStorage for token                         │
│  ✓ Check localStorage for role === 'admin'              │
│  ✓ Redirect unauthorized to /admin/login                │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Network Security (HTTPS)                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✓ JWT token in Authorization header (not URL)          │
│  ✓ HTTPS in production (encrypted transmission)         │
│  ✓ CORS properly configured                             │
│  ✓ No sensitive data in logs or responses                │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         Backend Middleware Security Checks               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. express.json() limits (100kb)                        │
│  2. helmet() security headers                            │
│  3. cors() configuration                                 │
│  4. morgan() request logging                             │
│  5. rate-limit on auth endpoints                         │
│     - Max 5 login attempts per 15 minutes                │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           Request Validation Security                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✓ Token verification with JWT_SECRET                   │
│  ✓ Signature validation (prevents tampering)             │
│  ✓ Token expiration check                               │
│  ✓ User exists in database                              │
│  ✓ Role-based access control (RBAC)                     │
│  ✓ Input schema validation with Zod                     │
│  ✓ No NoSQL injection (using mongoose)                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            Database Security                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✓ MongoDB connection via credentials                   │
│  ✓ Password hashing with bcryptjs (salting)             │
│  ✓ No plain-text passwords                              │
│  ✓ Data validation before insert/update                 │
│  ✓ Transactions for critical operations                 │
│  ✓ Unique indexes on sensitive fields (email)           │
│  ✓ Role stored in database (immutable after auth)       │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           Response Security                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✓ No stack traces in error messages                    │
│  ✓ Generic error messages for sensitive endpoints       │
│  ✓ Password excluded from responses (.select("-pass"))  │
│  ✓ Tokens excluded from user responses                  │
│  ✓ Consistent error response format                     │
│  ✓ Proper HTTP status codes                             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

```
backend/.env
├─ Database
│  ├─ MONGO_URI = mongodb connection string
│  └─ DB_NAME = vanca
│
├─ Authentication
│  ├─ JWT_SECRET = 32+ character secret key
│  ├─ JWT_REFRESH_SECRET = 32+ character secret key
│  ├─ JWT_EXPIRE = 7d
│  └─ JWT_REFRESH_EXPIRE = 30d
│
├─ Admin Configuration
│  ├─ ADMIN_EMAIL = admin@example.com
│  └─ ADMIN_PASSWORD = strong_password_123
│
├─ Server
│  ├─ PORT = 5000
│  ├─ NODE_ENV = development|production
│  └─ CLIENT_URL = http://localhost:8081
│
├─ Email (for OTP)
│  ├─ SMTP_HOST = api.sendgrid.net
│  ├─ SMTP_PORT = 587
│  ├─ SMTP_FROM = noreply@example.com
│  └─ SENDGRID_API_KEY = sg_xxxxx
│
└─ Payment (Razorpay)
   ├─ RAZORPAY_KEY_ID = rzp_xxxxx
   ├─ RAZORPAY_KEY_SECRET = secret_xxxxx
   └─ RAZORPAY_WEBHOOK_SECRET = webhook_secret

frontend/.env
├─ VITE_API_URL = http://localhost:5000
└─ VITE_APP_NAME = Vanca Patina
```

---

## Summary

The admin system is built with:
- **Clean separation of concerns** (Routes → Middleware → Controllers → Models)
- **Multiple security layers** (Frontend validation, auth, RBAC, input validation, data integrity)
- **Production-ready patterns** (Error handling, logging, rate limiting, transactions)
- **Clear data flow** (UI → API → Validation → Business Logic → DB → Response)
- **Excellent documentation** (This diagram + 3 comprehensive guides)

Everything is connected and working together to provide a secure, scalable, and maintainable admin system! 🎉
