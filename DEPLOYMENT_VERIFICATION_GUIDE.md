# 🚀 DEPLOYMENT VERIFICATION GUIDE

## Pre-Deployment Checklist

- [ ] All code changes pulled from main branch
- [ ] npm install completed
- [ ] No uncommitted changes
- [ ] Database backup exists
- [ ] Monitoring tools ready
- [ ] Team notified of deployment

---

## Step-by-Step Deployment

### Phase 1: Code Deployment
```bash
# 1. Pull latest code
cd /path/to/vanca-patina/backend
git checkout main
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Verify no lint errors
npm run lint   # if available

# 4. Test build
npm run build  # if applicable

# 5. Verify environment variables are set
# Required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, etc.
```

### Phase 2: Database Migrations
```bash
# Connect to MongoDB
mongo --host prod-db-host --port 27017 -u admin -p password

# Create all required indexes
use patina-db

db.orders.createIndex({ "user": 1 });
db.orders.createIndex({ "user": 1, "createdAt": -1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "paymentStatus": 1 });
db.orders.createIndex({ "paymentGateway.webhookEventId": 1 }, { unique: true, sparse: true });
db.orders.createIndex({ "invoice.invoiceNumber": 1 }, { unique: true, sparse: true });

# Verify all indexes created
db.orders.getIndexes()

# Expected output should show 7 indexes:
# 1. _id (default)
# 2. user
# 3. user + createdAt
# 4. status
# 5. paymentStatus
# 6. webhookEventId (unique)
# 7. invoiceNumber (unique)
```

### Phase 3: Application Restart
```bash
# Stop current instance
pm2 stop index

# Start new instance with latest code
pm2 start index

# Verify it started
pm2 status

# Watch logs
pm2 logs index
```

---

## Post-Deployment Verification

### ✅ Test 1: Application Health
```bash
# Check if server is running
curl http://localhost:5000/api/products
# Expected: 200 OK with product list
```

### ✅ Test 2: Invoice Download (Main Fix)
```bash
# Get an existing order ID from database or user account
# TEST: Download invoice

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/invoice/ORDER_ID/download \
  --output invoice.pdf

# Verify:
file invoice.pdf
# Expected: "application/pdf"

ls -lh invoice.pdf
# Expected: File size > 0
```

### ✅ Test 3: Create New Order
```bash
# Create new order through UI:
# 1. Add product to cart
# 2. Go to checkout
# 3. Fill address form
# 4. Complete payment

# Check logs:
pm2 logs index | grep "Order created"
# Expected: "Order created successfully"

# Verify in database:
mongo -u admin -p password patina-db
db.orders.findOne({}, {_id: 1, orderId: 1})
```

### ✅ Test 4: Concurrent Order Handling
```javascript
// Test: Place 2 orders for item with limited stock

// Step 1: Create product with limited stock
db.products.updateOne(
  {name: "Test Product"},
  {$set: {stock: 1}}
)

// Step 2: Have 2 users try to order simultaneously
// (via UI or API - both should happen within 1 second)

// Step 3: Verify only 1 order succeeded
db.orders.find({status: "pending"}).count()
// Expected: Exactly 1

db.orders.find({status: "cancelled"}).count()
// Expected: 1 (the failed one)
```

### ✅ Test 5: Webhook Processing
```bash
# Test webhook doesn't create duplicates

# Simulate webhook payload
curl -X POST http://localhost:5000/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: SIGNATURE" \
  -d '{
    "id": "evt_test_12345",
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_test",
          "order_id": "order_test"
        }
      }
    }
  }'

# Send again (duplicate)
# Expected second time: 
# Response: { "received": true, "duplicate": true }

# Check database - only 1 invoice:
db.orders.find({'paymentGateway.webhookEventId': 'evt_test_12345'}).count()
// Expected: 1
```

### ✅ Test 6: Stock Restoration
```javascript
// Test: Stock is restored when order cancelled

// Step 1: Get initial stock
db.products.findOne({_id: ObjectId("...")})
// Note: stock value (e.g., 100)

// Step 2: Create order
// (Stock becomes 95 after order)

// Step 3: Cancel order via API
curl -X PUT http://localhost:5000/api/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer TOKEN"

// Step 4: Verify stock restored
db.products.findOne({_id: ObjectId("...")})
// Expected: stock back to 100
```

### ✅ Test 7: Database Indexes Working
```javascript
// Verify indexes are being used

// Check performance before querying
db.orders.find({user: ObjectId("...")}).explain("executionStats")

// Should show:
// - executionStages.stage: "IXSCAN" (index scan, not COLLSCAN)
// - executionStats.totalDocsExamined: should match nReturned

// If COLLSCAN appears, indexes not created properly
```

---

## ⚠️ Monitor These During First 24 Hours

### Logs to Watch
```bash
# Error logs
pm2 logs index | grep -i error

# Invoice generation
pm2 logs index | grep -i invoice

# Payment processing
pm2 logs index | grep -i payment

# Webhook events
pm2 logs index | grep -i webhook
```

### Metrics to Track
1. **Order Creation Rate** - Should be normal
2. **Payment Success Rate** - Should be >99%
3. **Invoice Generation Time** - Should be <10 seconds
4. **Error Count** - Should be near 0
5. **API Response Time** - Should be <500ms for getMyOrders

### Alerts to Configure
```javascript
// Alert if:
- Order creation fails for > 5 consecutive attempts
- Invoice generation fails for > 3 consecutive attempts
- Payment webhook fails more than 2 times
- Stock goes negative
- Duplicate invoices detected
```

---

## 🔧 Troubleshooting

### Issue: "HTTP 505 Error" still appears
**Solution:**
```bash
# Clear application cache
pm2 restart index

# Verify fix was deployed
grep "res.end" backend/controllers/invoiceController.js
# Should show: res.end(Buffer.from(arrayBuffer))
```

### Issue: Indexes not created
**Solution:**
```bash
# Check if indexes exist
mongo patina-db
db.orders.getIndexes()

# If missing, create again
db.orders.createIndex({"webhookEventId": 1}, {unique: true, sparse: true})

# Wait for index to build (may take time on large collection)
# Monitor with:
db.currentOp()
```

### Issue: Webhook processing slow
**Solution:**
```bash
# Check if index on webhookEventId exists
db.orders.getIndexes() | grep webhookEventId

# If not, create it
db.orders.createIndex({"paymentGateway.webhookEventId": 1}, {unique: true, sparse: true})

# Monitor webhook processing
pm2 logs index | grep "webhook"
```

### Issue: Stock going negative
**Solution:**
```bash
# Verify atomic operation is working
grep '\$inc' backend/services/orderService.js
# Should show: { $inc: { stock: -item.qty } }

# Manual verification in database
db.products.find({stock: {$lt: 0}}).count()
# Should return 0

# If any found, manual fix:
db.orders.find({status: "cancelled"}).forEach(order => {
  order.orderItems.forEach(item => {
    db.products.updateOne(
      {_id: item.product},
      {$inc: {stock: item.qty}}
    )
  })
})
```

---

## Rollback Procedure (If Needed)

### Quick Rollback (< 5 minutes)
```bash
# 1. Revert to previous version
git revert HEAD
npm install

# 2. Restart application
pm2 restart index

# 3. Drop problematic indexes if needed
mongo patina-db
db.orders.dropIndex("paymentGateway.webhookEventId_1")
```

### Full Rollback (Data Restore)
```bash
# 1. Stop application
pm2 stop index

# 2. Restore from backup
mongorestore --drop /backup/patina-2026-04-04

# 3. Revert code
git checkout v1.x.x  # previous working version
npm install

# 4. Restart
pm2 start index
```

---

## Health Check Commands

```bash
# Quick health check script
#!/bin/bash

echo "1. Checking API health..."
curl -s http://localhost:5000/api/products | jq . > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo "2. Checking database connection..."
mongo patina-db --eval "db.orders.count()" && echo "✓ OK" || echo "✗ FAIL"

echo "3. Checking indexes..."
INDEXES=$(mongo patina-db --eval "db.orders.getIndexes().length")
echo "Indexes created: $INDEXES (expected: 7)"

echo "4. Checking for negative stock..."
NEG_STOCK=$(mongo patina-db --eval "db.products.find({stock: {$lt: 0}}).count()")
[ "$NEG_STOCK" -eq 0 ] && echo "✓ OK" || echo "✗ FAIL: Found $NEG_STOCK products with negative stock"

echo "5. Checking for duplicate invoices..."
DUP_INVOICES=$(mongo patina-db --eval "db.orders.aggregate([{$group: {_id: '$invoice.invoiceNumber', count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}]).count()")
[ "$DUP_INVOICES" -eq 0 ] && echo "✓ OK" || echo "✗ FAIL: Found $DUP_INVOICES duplicate invoices"

echo "All checks complete!"
```

---

## Success Criteria

✅ All checks must pass:

- [ ] Invoice download works (PDF downloads, no 505 error)
- [ ] Concurrent orders handled correctly (no overselling)
- [ ] Webhooks processed once (no duplicates)
- [ ] Stock never negative
- [ ] Database indexes created (7 total)
- [ ] No errors in logs
- [ ] New cancel order endpoint works
- [ ] Payment processing unaffected
- [ ] Email sending unaffected (non-blocking)
- [ ] Performance baseline met

---

## Sign-Off

| Role | Date | Signature | Status |
|------|------|-----------|--------|
| Development | | | Ready |
| DevOps | | | Ready |
| QA | | | Ready |

**Deployment Status: 🚀 READY**

