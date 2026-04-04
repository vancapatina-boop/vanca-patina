/**
 * BACKEND AUTOMATED TEST SUITE
 * Framework: Jest + Supertest
 * Location: backend/tests/
 * Run: npm test
 */

// ========================================
// 1. AUTHENTICATION TESTS
// ========================================

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.email).toBe('john@example.com');
      expect(res.body).toHaveProperty('_id');
    });

    test('should reject duplicate email', async () => {
      await User.create({
        name: 'John',
        email: 'john@example.com',
        password: 'hashedpass'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'john@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    test('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
    });

    test('should reject short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'short'
        });

      expect(res.statusCode).toBe(400);
    });

    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe'
          // missing email and password
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        isVerified: true
      });
    });

    test('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.email).toBe('john@example.com');
    });

    test('should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });

    test('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(401);
    });

    test('should enforce rate limiting on login (5 attempts per 15 min)', async () => {
      let res;
      for (let i = 0; i < 6; i++) {
        res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'john@example.com',
            password: 'wrongpassword'
          });
      }

      expect(res.statusCode).toBe(429);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token;

    beforeEach(async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        isVerified: true
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      token = loginRes.body.accessToken;
    });

    test('should logout authenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });

    test('should reject logout without token', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.statusCode).toBe(401);
    });
  });
});

// ========================================
// 2. PRODUCT TESTS
// ========================================

const Product = require('../models/product');

describe('Product API', () => {
  beforeEach(async () => {
    await Product.deleteMany({});
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create sample products
      for (let i = 1; i <= 15; i++) {
        await Product.create({
          name: `Product ${i}`,
          price: 100 * i,
          category: i % 2 === 0 ? 'Electronics' : 'Chemicals',
          description: 'Test product',
          stock: 10,
          finishType: 'Matte'
        });
      }
    });

    test('should get paginated products', async () => {
      const res = await request(app)
        .get('/api/products?pageSize=12&pageNumber=1');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('pages');
      expect(res.body).toHaveProperty('total');
      expect(res.body.products.length).toBe(12);
    });

    test('should search products by name', async () => {
      const res = await request(app)
        .get('/api/products?search=Product 1');

      expect(res.statusCode).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].name).toContain('Product 1');
    });

    test('should filter products by category', async () => {
      const res = await request(app)
        .get('/api/products?category=Electronics');

      expect(res.statusCode).toBe(200);
      expect(res.body.products.every(p => p.category === 'Electronics')).toBe(true);
    });

    test('should sort products by price ascending', async () => {
      const res = await request(app)
        .get('/api/products?sortBy=price-asc');

      expect(res.statusCode).toBe(200);
      const prices = res.body.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    test('should filter by stock availability', async () => {
      // Create an out of stock product
      await Product.create({
        name: 'Out of Stock',
        price: 100,
        category: 'Test',
        description: 'No stock',
        stock: 0
      });

      const res = await request(app)
        .get('/api/products?inStock=true');

      expect(res.statusCode).toBe(200);
      expect(res.body.products.every(p => p.stock > 0)).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    let productId;

    beforeEach(async () => {
      const product = await Product.create({
        name: 'Test Product',
        price: 100,
        category: 'Test',
        description: 'Test description',
        stock: 10
      });
      productId = product._id;
    });

    test('should get product by id', async () => {
      const res = await request(app)
        .get(`/api/products/${productId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Test Product');
      expect(res.body._id).toBe(productId.toString());
    });

    test('should return 404 for invalid product id', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/products/${fakeId}`);

      expect(res.statusCode).toBe(404);
    });
  });
});

// ========================================
// 3. CART TESTS
// ========================================

const Cart = require('../models/Cart');

describe('Cart API', () => {
  let userId, productId, token;

  beforeEach(async () => {
    // Create user
    const user = await User.create({
      name: 'Test User',
      email: 'cart@example.com',
      password: 'password123',
      isVerified: true
    });
    userId = user._id;

    // Get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cart@example.com',
        password: 'password123'
      });
    token = loginRes.body.accessToken;

    // Create product
    const product = await Product.create({
      name: 'Test Product',
      price: 100,
      category: 'Test',
      description: 'Test',
      stock: 10
    });
    productId = product._id;

    // Clear carts
    await Cart.deleteMany({});
  });

  describe('POST /api/cart', () => {
    test('should add product to cart', async () => {
      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: productId.toString(),
          qty: 2
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('items');
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].qty).toBe(2);
    });

    test('should reject adding out-of-stock product', async () => {
      const outOfStockProduct = await Product.create({
        name: 'Out of Stock',
        price: 100,
        category: 'Test',
        description: 'Test',
        stock: 0
      });

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: outOfStockProduct._id.toString(),
          qty: 1
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('out of stock');
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/cart')
        .send({
          productId: productId.toString(),
          qty: 1
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/cart', () => {
    test('should get user cart', async () => {
      // Add item first
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: productId.toString(),
          qty: 1
        });

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('items');
    });
  });

  describe('DELETE /api/cart/:id', () => {
    test('should remove item from cart', async () => {
      // Add item first
      const addRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: productId.toString(),
          qty: 1
        });

      const cartItems = addRes.body.items;
      const itemId = cartItems[0]._id;

      // Remove item
      const res = await request(app)
        .delete(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
    });
  });
});

// ========================================
// 4. ORDER TESTS
// ========================================

const Order = require('../models/Order');

describe('Order API', () => {
  let userId, productId, token;

  beforeEach(async () => {
    await Cart.deleteMany({});
    await Order.deleteMany({});

    const user = await User.create({
      name: 'Test User',
      email: 'order@example.com',
      password: 'password123',
      isVerified: true
    });
    userId = user._id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'order@example.com',
        password: 'password123'
      });
    token = loginRes.body.accessToken;

    const product = await Product.create({
      name: 'Test Product',
      price: 100,
      category: 'Test',
      description: 'Test',
      stock: 10
    });
    productId = product._id;
  });

  describe('POST /api/orders', () => {
    test('should reject direct checkout (Razorpay-only flow)', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: productId.toString(),
          qty: 2
        });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            address: '123 Main St',
            city: 'Test City',
            postalCode: '12345',
            country: 'India'
          },
          paymentMethod: 'Razorpay'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Razorpay|payment|create-order/i);
    });
  });

  describe('GET /api/orders/:id', () => {
    test('should get order by id', async () => {
      const order = await Order.create({
        user: userId,
        customerSnapshot: { name: 'Test User', email: 'order@example.com' },
        orderItems: [
          {
            product: productId,
            name: 'Test Product',
            qty: 1,
            price: 100,
            image: ''
          }
        ],
        shippingAddress: {
          address: '123 Main St',
          city: 'Test City',
          postalCode: '12345',
          country: 'India'
        },
        paymentMethod: 'Razorpay',
        paymentStatus: 'paid',
        itemsPrice: 100,
        taxPrice: 5,
        shippingPrice: 75,
        totalPrice: 180,
        isPaid: true,
        status: 'confirmed'
      });

      const orderId = order._id.toString();

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(orderId);
    });
  });
});

// ========================================
// 5. ADMIN TESTS
// ========================================

describe('Admin API', () => {
  let adminToken, userToken, adminUser, regularUser;

  beforeEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create admin
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      isVerified: true
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.accessToken;

    // Create regular user
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
      isVerified: true
    });

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });
    userToken = userLogin.body.accessToken;
  });

  describe('GET /api/admin/stats', () => {
    test('should get dashboard stats for admin', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body).toHaveProperty('totalOrders');
      expect(res.body).toHaveProperty('totalProducts');
      expect(res.body).toHaveProperty('totalRevenue');
    });

    test('should reject non-admin access', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('should reject unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/admin/stats');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/products', () => {
    test('admin can create product', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Product',
          price: 500,
          category: 'Test',
          description: 'Admin created product',
          stock: 50,
          finishType: 'Glossy'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Admin Product');
    });

    test('non-admin cannot create product', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'User Product',
          price: 500,
          category: 'Test',
          description: 'User created product',
          stock: 50
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/users', () => {
    test('admin can get all users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    test('non-admin cannot get user list', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});

module.exports = {};
