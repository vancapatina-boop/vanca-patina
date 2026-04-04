# API Testing & Audit Guide
## Complete Vanca Patina Backend API Reference

**Last Updated:** 2026
**Version:** 1.0

---

## 🚀 Quick Start - Testing APIs

### Prerequisites
```bash
# Backend running on
http://localhost:5000

# Frontend running on
http://localhost:5173
```

### Authentication Flow
```
1. POST /api/auth/signup
   └─> Returns JWT token + user data
   
2. Store token in localStorage
   └─> Use in Authorization header for protected routes
   
3. GET /api/users/profile
   └─> Requires: Authorization: Bearer <token>
```

---

## 📋 Complete API Audit Matrix

### 1. AUTHENTICATION ENDPOINTS

#### Sign Up
```
Endpoint: POST /api/auth/signup
Requires: None (public)

Request Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+919876543210"
}

Expected Response (200):
{
  "_id": "userObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "role": "customer",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Error Cases:
- 400: Email already exists, Invalid email format
- 500: Database error
```

#### Email Verification (OTP)
```
Endpoint: POST /api/auth/verify-otp
Requires: Email, OTP

Request Body:
{
  "email": "john@example.com",
  "otp": "123456"
}

Expected Response (200):
{
  "success": true,
  "message": "Email verified successfully"
}

Error Cases:
- 400: Invalid or expired OTP
- 404: Email not found
```

#### Login with OTP
```
Endpoint: POST /api/auth/login
Requires: None (public)

Request Body - Step 1 (Request OTP):
{
  "email": "john@example.com",
  "action": "send-otp"
}

Response (200):
{
  "message": "OTP sent to email",
  "salt": "uniqueSaltId"
}

Request Body - Step 2 (Verify OTP):
{
  "email": "john@example.com",
  "otp": "123456",
  "action": "verify-otp"
}

Response (200):
{
  "_id": "userObjectId",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Refresh Token
```
Endpoint: POST /api/auth/refresh-token
Requires: Refresh token in cookie

Response (200):
{
  "token": "newAccessToken"
}

Error Cases:
- 401: Invalid or expired refresh token
```

#### Logout
```
Endpoint: POST /api/auth/logout
Requires: Auth token
Method: POST

Response (200):
{
  "message": "Logout successful"
}
```

---

### 2. PRODUCT ENDPOINTS

#### Get All Products
```
Endpoint: GET /api/products
Requires: None (public)

Query Parameters:
  ?page=1           (default: 1)
  &limit=12         (default: 12)
  &category=patinas (optional)
  &search=copper    (optional)
  &sort=newest      (newest, price-low, price-high)

Expected Response (200):
{
  "products": [
    {
      "_id": "productId",
      "name": "Copper Patina Solution",
      "price": 599,
      "image": "/uploads/product1.jpg",
      "images": ["/uploads/product1.jpg", "/uploads/product1-alt.jpg"],
      "category": "patinas",
      "description": "Professional copper patina...",
      "stock": 50,
      "finishType": "Antique",
      "ratings": 4.5,
      "numReviews": 12,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "page": 1,
  "pages": 5,
  "total": 48
}
```

#### Get Single Product
```
Endpoint: GET /api/products/:id
Requires: None (public)

URL Parameters:
  :id = "productIdString"

Expected Response (200):
{
  "_id": "productId",
  "name": "Copper Patina Solution",
  "price": 599,
  "image": "/uploads/product1.jpg",
  "images": ["/uploads/product1.jpg", "/uploads/product1-alt.jpg"],
  "category": "patinas",
  "description": "Full product description...",
  "stock": 50,
  "finishType": "Antique",
  "badge": "Best Seller",
  "ratings": 4.5,
  "numReviews": 12
}

Error Cases:
- 404: Product not found
- 400: Invalid product ID format
```

---

### 3. CART ENDPOINTS

#### Get Cart
```
Endpoint: GET /api/cart
Requires: Auth (Bearer token)

Expected Response (200):
{
  "_id": "cartObjectId",
  "user": "userId",
  "items": [
    {
      "product": "productId",
      "name": "Copper Patina",
      "price": 599,
      "quantity": 2,
      "image": "/uploads/product1.jpg",
      "finishType": "Antique"
    }
  ],
  "totalPrice": 1198
}
```

#### Add to Cart
```
Endpoint: POST /api/cart
Requires: Auth (Bearer token)

Request Body:
{
  "productId": "productObjectId",
  "quantity": 2
}

Expected Response (201):
{
  "_id": "cartObjectId",
  "items": [
    {
      "product": "productId",
      "name": "Copper Patina",
      "price": 599,
      "quantity": 2
    }
  ],
  "totalPrice": 1198
}

Error Cases:
- 401: Not authenticated
- 404: Product not found
- 400: Invalid quantity
- 400: Insufficient stock
```

#### Update Cart Item Quantity
```
Endpoint: PUT /api/cart/:productId
Requires: Auth (Bearer token)

URL Parameters:
  :productId = "productObjectId"

Request Body:
{
  "quantity": 3
}

Expected Response (200):
{
  "items": [...],
  "totalPrice": 1797
}

Error Cases:
- 404: Item not in cart
- 400: Insufficient stock
```

#### Remove from Cart
```
Endpoint: DELETE /api/cart/:productId
Requires: Auth (Bearer token)

URL Parameters:
  :productId = "productObjectId"

Expected Response (200):
{
  "items": [...],
  "totalPrice": 599
}

Error Cases:
- 404: Item not in cart
```

---

### 4. ORDER ENDPOINTS

#### Create Order
```
Endpoint: POST /api/orders
Requires: Auth (Bearer token)

Request Body:
{
  "orderItems": [
    {
      "product": "productId",
      "name": "Copper Patina",
      "qty": 2,
      "price": 599,
      "image": "/uploads/product1.jpg"
    }
  ],
  "shippingAddress": {
    "address": "123 Main St",
    "city": "Delhi",
    "postalCode": "110000",
    "country": "India"
  },
  "paymentMethod": "Razorpay",
  "itemsPrice": 1198,
  "taxPrice": 215.64,
  "shippingPrice": 50,
  "totalPrice": 1463.64
}

Expected Response (201):
{
  "_id": "orderId",
  "orderId": "ORD-2026-00001",
  "user": "userId",
  "orderItems": [...],
  "shippingAddress": {...},
  "paymentMethod": "Razorpay",
  "totalPrice": 1463.64,
  "status": "pending",
  "isPaid": false,
  "createdAt": "2026-01-15T10:00:00Z"
}

Error Cases:
- 401: Not authenticated
- 400: Missing required fields
- 400: Empty cart
```

#### Get User Orders
```
Endpoint: GET /api/orders/my-orders
Requires: Auth (Bearer token)

Expected Response (200):
{
  "orders": [
    {
      "_id": "orderId",
      "orderId": "ORD-2026-00001",
      "totalPrice": 1463.64,
      "status": "shipped",
      "isPaid": true,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### Get Order Details
```
Endpoint: GET /api/orders/:id
Requires: Auth (Bearer token)

URL Parameters:
  :id = "orderId"

Expected Response (200):
{
  "_id": "orderId",
  "orderId": "ORD-2026-00001",
  "user": {...},
  "orderItems": [...],
  "shippingAddress": {...},
  "totalPrice": 1463.64,
  "status": "shipped",
  "isPaid": true,
  "invoice": {
    "invoiceNumber": "VP-2026-00001",
    "invoiceUrl": "/api/invoices/orderId"
  }
}
```

---

### 5. PAYMENT ENDPOINTS

#### Create Razorpay Order
```
Endpoint: POST /api/payments/razorpay-order
Requires: Auth (Bearer token)

Request Body:
{
  "orderId": "orderObjectId",
  "totalAmount": 146364  (in paise: ₹1463.64 = 146364 paise)
}

Expected Response (200):
{
  "orderId": "order_1234567890",
  "amount": 146364,
  "currency": "INR",
  "order": {
    "_id": "orderObjectId",
    "status": "pending"
  }
}

Error Cases:
- 401: Not authenticated
- 404: Order not found
- 400: Invalid amount
```

#### Verify Payment
```
Endpoint: POST /api/payments/verify-payment
Requires: Auth (Bearer token)

Request Body:
{
  "razorpay_order_id": "order_1234567890",
  "razorpay_payment_id": "pay_1234567890",
  "razorpay_signature": "signature_hash"
}

Expected Response (200):
{
  "success": true,
  "message": "Payment verified successfully",
  "order": {
    "_id": "orderObjectId",
    "isPaid": true,
    "status": "confirmed"
  }
}

Error Cases:
- 400: Invalid signature
- 400: Order already paid (idempotency)
- 404: Order not found
```

---

### 6. INVOICE ENDPOINTS

#### Get Invoice PDF
```
Endpoint: GET /api/invoices/:orderId
Requires: Auth (Bearer token)

URL Parameters:
  :orderId = "orderObjectId"

Expected Response (200):
  PDF Binary Data
  Headers:
    Content-Type: application/pdf
    Content-Disposition: attachment; filename="VP-2026-00001.pdf"

Error Cases:
- 404: Order not found
- 400: Order not paid (no invoice available)
```

---

### 7. WISHLIST ENDPOINTS

#### Get Wishlist
```
Endpoint: GET /api/wishlist
Requires: Auth (Bearer token)

Expected Response (200):
{
  "_id": "wishlistObjectId",
  "items": [
    {
      "_id": "productId",
      "name": "Copper Patina",
      "price": 599,
      "image": "/uploads/product1.jpg"
    }
  ]
}
```

#### Add to Wishlist
```
Endpoint: POST /api/wishlist
Requires: Auth (Bearer token)

Request Body:
{
  "productId": "productObjectId"
}

Expected Response (201):
{
  "items": [...],
  "message": "Added to wishlist"
}

Error Cases:
- 404: Product not found
- 400: Already in wishlist
```

#### Remove from Wishlist
```
Endpoint: DELETE /api/wishlist/:productId
Requires: Auth (Bearer token)

URL Parameters:
  :productId = "productObjectId"

Expected Response (200):
{
  "items": [...],
  "message": "Removed from wishlist"
}
```

---

### 8. USER ENDPOINTS

#### Get Profile
```
Endpoint: GET /api/users/profile
Requires: Auth (Bearer token)

Expected Response (200):
{
  "_id": "userId",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "role": "customer",
  "isVerified": true,
  "addresses": [
    {
      "_id": "addressId",
      "label": "Home",
      "address": "123 Main St",
      "city": "Delhi",
      "postalCode": "110000",
      "isDefault": true
    }
  ]
}
```

#### Update Profile
```
Endpoint: PUT /api/users/profile
Requires: Auth (Bearer token)

Request Body:
{
  "name": "John Updated",
  "phone": "+918765432101"
}

Expected Response (200):
{
  "_id": "userId",
  "name": "John Updated",
  "phone": "+918765432101",
  "email": "john@example.com"
}
```

#### Add Address
```
Endpoint: POST /api/users/addresses
Requires: Auth (Bearer token)

Request Body:
{
  "label": "Office",
  "address": "456 Work St",
  "city": "Bangalore",
  "postalCode": "560000",
  "country": "India",
  "isDefault": false
}

Expected Response (201):
{
  "address": {
    "_id": "addressId",
    "label": "Office",
    "address": "456 Work St",
    "city": "Bangalore"
  }
}
```

#### Delete Address
```
Endpoint: DELETE /api/users/addresses/:addressId
Requires: Auth (Bearer token)

URL Parameters:
  :addressId = "addressObjectId"

Expected Response (200):
{
  "message": "Address deleted"
}
```

---

### 9. ADMIN ENDPOINTS

#### Get All Products
```
Endpoint: GET /api/admin/products
Requires: Auth + Admin role

Expected Response (200):
{
  "products": [
    {
      "_id": "productId",
      "name": "Copper Patina",
      "price": 599,
      "stock": 50,
      "image": "/uploads/product1.jpg",
      "images": ["/uploads/product1.jpg"],
      "category": "patinas",
      "finishType": "Antique"
    }
  ]
}
```

#### Create Product
```
Endpoint: POST /api/admin/products
Requires: Auth + Admin role

Request Body:
{
  "name": "New Patina Product",
  "price": 799,
  "category": "patinas",
  "description": "Product description...",
  "stock": 100,
  "finishType": "Glossy",
  "image": "/uploads/new-product.jpg"
}

Expected Response (201):
{
  "_id": "newProductId",
  "name": "New Patina Product",
  "price": 799,
  ...
}
```

#### Upload Product Images
```
Endpoint: POST /api/admin/products/upload
Requires: Auth + Admin role

Request Body (FormData):
  productId: "productObjectId"
  image: <File>

Expected Response (200):
{
  "_id": "productId",
  "images": ["/uploads/product1.jpg", "/uploads/product1-alt.jpg"],
  "message": "Image uploaded successfully"
}

Note: Call this endpoint multiple times to add multiple images
```

#### Update Product
```
Endpoint: PUT /api/admin/products/:id
Requires: Auth + Admin role

URL Parameters:
  :id = "productObjectId"

Request Body:
{
  "name": "Updated Product Name",
  "price": 899,
  "stock": 75
}

Expected Response (200):
{
  "_id": "productId",
  "name": "Updated Product Name",
  "price": 899
}
```

#### Delete Product
```
Endpoint: DELETE /api/admin/products/:id
Requires: Auth + Admin role

URL Parameters:
  :id = "productObjectId"

Expected Response (200):
{
  "message": "Product deleted successfully"
}
```

#### Get All Orders
```
Endpoint: GET /api/admin/orders
Requires: Auth + Admin role

Expected Response (200):
{
  "orders": [
    {
      "_id": "orderId",
      "orderId": "ORD-2026-00001",
      "user": {...},
      "totalPrice": 1463.64,
      "status": "pending",
      "isPaid": false
    }
  ]
}
```

#### Update Order Status
```
Endpoint: PUT /api/admin/orders/:id
Requires: Auth + Admin role

Request Body:
{
  "status": "shipped"  (pending, confirmed, processing, shipped, delivered, cancelled)
}

Expected Response (200):
{
  "_id": "orderId",
  "status": "shipped",
  "message": "Order status updated"
}
```

---

## 🧪 Manual Testing Checklist

### Using cURL or Postman

#### 1. Test Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "phone": "+919876543210"
  }'
```

#### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "action": "send-otp"
  }'

# Then verify OTP:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "action": "verify-otp"
  }'
```

#### 3. Test Get Products
```bash
curl http://localhost:5000/api/products?page=1&limit=12
```

#### 4. Test Add to Cart (requires auth)
```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 2
  }'
```

---

## ✅ Validation Rules

### Cart Validation
- Quantity must be > 0
- Product must exist and be in stock
- Quantity cannot exceed available stock

### Order Validation
- Must have at least 1 item in cart
- Shipping address must be complete
- Email and phone required
- Total price must match calculation

### Payment Validation
- Order must exist
- Order must not already be paid
- Razorpay signature verification (HMAC-SHA256)
- Idempotency check (webhookEventId prevents duplicate payments)

### Product Validation
- Name: Required, min 3 chars, max 100 chars
- Price: Required, must be > 0
- Category: Required
- Stock: Required, must be ≥ 0
- Description: Required, min 10 chars

---

## 🔒 Security Features

1. **JWT Authentication**
   - Token expires in 24 hours
   - Refresh token for extended sessions
   - Tokens stored in httpOnly cookies (preferred)

2. **Admin-Only Routes**
   - Role-based access control
   - Admin endpoints protected with `protect` and `admin` middleware

3. **Input Validation**
   - All inputs validated with Joi schemas
   - XSS prevention through input sanitization

4. **Payment Security**
   - Razorpay signature verification
   - Idempotency protection (webhookEventId check)
   - Prevents double-charging on webhook retries

5. **Rate Limiting**
   - API rate limiting to prevent abuse
   - OTP rate limiting (max 3 attempts per email)

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** 401 Unauthorized on protected routes
- **Solution:** Ensure Authorization header includes "Bearer " prefix
- **Example:** `Authorization: Bearer eyJhbGciOi...`

**Issue:** 404 Error on /api/products/:id
- **Solution:** Verify product ID is valid MongoDB ObjectId
- **Example:** `507f1f77bcf86cd799439011` (24 char hex string)

**Issue:** Payment fails with signature mismatch
- **Solution:** Verify Razorpay key setup in environment variables
- **Check:** RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET

**Issue:** Image upload fails
- **Solution:** Ensure FormData contains "productId" and "image"
- **Check:** File size under 5MB, image MIME type

---

**Last Updated:** February 2026
**Maintained By:** Development Team
