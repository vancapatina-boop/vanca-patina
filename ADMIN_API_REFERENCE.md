# 🔐 ADMIN API REFERENCE

> All admin endpoints require `Authorization: Bearer <JWT_TOKEN>` header and `admin` role.

## Auth Endpoints

### Admin Login
```
POST /api/auth/admin-login
Content-Type: application/json

Request Body:
{
  "email": "admin@example.com",
  "password": "yourPassword"
}

Response (200 OK):
{
  "_id": "user_id",
  "name": "Administrator",
  "email": "admin@example.com",
  "role": "admin",
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}

Error Responses:
- 401: Invalid admin credentials
- 403: User is not an admin
- 500: Admin email not configured
```

---

## Dashboard Endpoints

### Get Dashboard Statistics
```
GET /api/admin/stats
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "totalUsers": 42,
  "totalOrders": 128,
  "totalProducts": 35,
  "totalRevenue": 45670.50,
  "latestOrders": [
    {
      "_id": "order_id",
      "user": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "totalPrice": 5000,
      "status": "processing",
      "createdAt": "2024-03-27T10:00:00Z"
    }
  ]
}

Error Responses:
- 401: Not authorized, no token
- 403: User is not an admin
```

---

## Order Management Endpoints

### Get All Orders
```
GET /api/admin/orders
Authorization: Bearer <JWT_TOKEN>

Query Parameters: (optional)
- sort: "-createdAt" (default)
- limit: 10
- page: 1

Response (200 OK):
[
  {
    "_id": "order_id",
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "orderItems": [
      {
        "product": "product_id",
        "name": "Product Name",
        "qty": 2,
        "price": 1000
      }
    ],
    "totalPrice": 2000,
    "status": "processing",
    "isPaid": true,
    "createdAt": "2024-03-27T10:00:00Z"
  }
]

Error Responses:
- 401: Not authorized
- 403: Admin role required
```

### Update Order Status
```
PUT /api/admin/orders/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "status": "shipped"  // "processing", "shipped", "delivered", "cancelled"
}

Response (200 OK):
{
  "_id": "order_id",
  "status": "shipped",
  "isPaid": true,
  "paidAt": "2024-03-27T10:00:00Z",
  "updatedAt": "2024-03-27T11:00:00Z"
}

Status Transitions:
- pending → processing OR cancelled
- processing → shipped OR cancelled
- shipped → delivered
- delivered → (no transitions)
- cancelled → (no transitions)

Error Responses:
- 404: Order not found
- 400: Invalid status transition
- 401/403: Auth errors
```

---

## Product Management Endpoints

### Get All Products (Admin View)
```
GET /api/admin/products
Authorization: Bearer <JWT_TOKEN>

Query Parameters: (optional)
- page: 1 (default)
- limit: 10 (default)

Response (200 OK):
{
  "products": [
    {
      "_id": "product_id",
      "name": "Product Name",
      "price": 5000,
      "category": "Furniture",
      "finishType": "Matte",
      "stock": 15,
      "description": "Product description...",
      "image": "https://...",
      "ratings": 4.5,
      "numReviews": 10,
      "createdAt": "2024-03-27T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pages": 3,
    "total": 25
  }
}

Error Responses:
- 401/403: Auth errors
```

### Create Product
```
POST /api/admin/products
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "name": "New Product",
  "price": 5000,
  "description": "Detailed description of the product",
  "category": "Furniture",
  "finishType": "Matte",  // "Matte", "Glossy", "Satin", "Standard"
  "stock": 20,
  "image": "https://example.com/image.jpg"
}

Response (201 Created):
{
  "_id": "new_product_id",
  "name": "New Product",
  "price": 5000,
  "category": "Furniture",
  "finishType": "Matte",
  "stock": 20,
  "description": "...",
  "image": "...",
  "ratings": 0,
  "numReviews": 0,
  "createdAt": "2024-03-27T11:00:00Z"
}

Error Responses:
- 400: Product already exists
- 400: Validation error (missing required fields)
- 401/403: Auth errors
```

### Update Product
```
PUT /api/admin/products/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body: (all fields optional)
{
  "name": "Updated Name",
  "price": 6000,
  "description": "Updated description",
  "category": "New Category",
  "finishType": "Glossy",
  "stock": 25,
  "image": "https://example.com/new-image.jpg"
}

Response (200 OK):
{
  "_id": "product_id",
  "name": "Updated Name",
  "price": 6000,
  ...
}

Error Responses:
- 404: Product not found
- 400: Product name already exists (when changing name)
- 401/403: Auth errors
```

### Delete Product
```
DELETE /api/admin/products/:id
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "message": "Product deleted successfully",
  "product": {
    "_id": "product_id",
    "name": "Deleted Product",
    ...
  }
}

Error Responses:
- 404: Product not found
- 401/403: Auth errors
```

---

## Category Management Endpoints

### Get All Categories
```
GET /api/admin/categories
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
[
  "Furniture",
  "Decor",
  "Hardware",
  "Lighting"
]

Error Responses:
- 401/403: Auth errors
```

### Update Category Name
```
PUT /api/admin/categories
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "oldName": "Furniture",
  "newName": "Wooden Furniture"
}

Response (200 OK):
{
  "message": "Category updated successfully",
  "matchedCount": 15,
  "modifiedCount": 15
}

Error Responses:
- 400: Missing oldName or newName
- 404: Category not found
- 401/403: Auth errors
```

### Delete Category
```
DELETE /api/admin/categories/:category
Authorization: Bearer <JWT_TOKEN>

Example: DELETE /api/admin/categories/Furniture

Response (200 OK):
{
  "message": "Category and all products deleted successfully",
  "deletedCount": 15
}

Error Responses:
- 404: Category not found
- 401/403: Auth errors
```

---

## User Management Endpoints

### Get All Users
```
GET /api/admin/users
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
[
  {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "+1234567890",
    "addresses": [
      {
        "label": "Home",
        "address": "123 Main St",
        "city": "New York",
        "postalCode": "10001"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
]

Note: Password and refreshTokens are excluded
Error Responses:
- 401/403: Auth errors
```

### Get User by ID
```
GET /api/admin/users/:id
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "phone": "+1234567890",
  "addresses": [...],
  "createdAt": "2024-01-01T00:00:00Z"
}

Error Responses:
- 404: User not found
- 401/403: Auth errors
```

### Delete User
```
DELETE /api/admin/users/:id
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "message": "User and associated data deleted successfully",
  "user": "john@example.com"
}

Note: Also deletes user's orders and cart
Error Responses:
- 404: User not found
- 401/403: Auth errors
```

---

## Status Codes Reference

| Code | Meaning | Details |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks required permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description here"
}
```

---

## Rate Limiting

Admin login endpoint has rate limiting:
- **Limit:** 5 attempts per 15 minutes
- **Header:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

---

## Authentication

### Getting a Token

1. Login via `/api/auth/admin-login` with email and password
2. Receive token and refreshToken in response
3. Store token in `localStorage` with key `token`

### Using Bearer Token

Include in all subsequent requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

If token expires:
1. Use refreshToken to get new token via `/api/auth/refresh`
2. Update localStorage with new token

---

## Validation Rules

### Product Creation
- `name`: 2-200 characters, required
- `price`: >= 0, required
- `description`: 10-5000 characters, required
- `category`: 1-100 characters, required
- `stock`: >= 0 integer, required
- `finishType`: One of "Matte", "Glossy", "Satin", "Standard", optional
- `image`: Valid URL, optional

### Order Status
- Value must be one of: "processing", "shipped", "delivered"
- Must follow valid state transitions

---

## Example cURL Commands

### Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Product
```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 5000,
    "description": "This is a test product",
    "category": "Furniture",
    "stock": 10
  }'
```

### Update Order Status
```bash
curl -X PUT http://localhost:5000/api/admin/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

${EOF}
