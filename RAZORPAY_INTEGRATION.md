# Razorpay Payment Integration

This document explains how to set up and use the Razorpay payment integration in the Vanca Patina e-commerce application.

## 🚀 Overview

The application now supports secure payments through Razorpay with the following features:
- Secure order creation with backend-calculated totals
- Payment verification with signature validation
- Proper order lifecycle management
- Support for COD and PayPal as fallback options

## 🔧 Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install razorpay
```

### 2. Environment Variables
Add the following to your `.env` file:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. Get Razorpay Credentials
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Generate API Key ID and Secret
4. Add them to your `.env` file

## 📱 Frontend Setup

### 1. Razorpay Script
The Razorpay checkout script is loaded dynamically in the Checkout component. No additional setup required.

### 2. Payment Flow
1. User fills shipping address
2. User selects "Razorpay" payment method
3. Frontend calls `/api/payment/create-order`
4. Razorpay modal opens
5. After payment, frontend calls `/api/payment/verify`
6. Order is created and user is redirected to orders page

## 🔒 Security Features

### Backend Security
- ✅ Never trusts frontend amount - always calculates on backend
- ✅ Signature verification for payment validation
- ✅ Environment variables for sensitive keys
- ✅ Proper error handling without exposing sensitive data

### Order Flow
- **COD/PayPal**: Order created immediately, marked as paid
- **Razorpay**: Order created only after successful payment verification

## 🛠 API Endpoints

### POST /api/payment/create-order
Creates a Razorpay order for payment.

**Request:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response:**
```json
{
  "orderId": "order_xyz123",
  "amount": 10000,
  "currency": "INR",
  "key": "rzp_test_xxx"
}
```

### POST /api/payment/verify
Verifies payment and creates order.

**Request:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_hash",
  "orderData": {
    "shippingAddress": {
      "address": "123 Main St",
      "city": "Mumbai",
      "postalCode": "400001",
      "country": "India"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_id_here",
  "message": "Payment verified and order created successfully"
}
```

## 🧪 Testing

### Test Cards
Use these test cards for testing payments:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002

### Test Flow
1. Add items to cart
2. Go to checkout
3. Fill shipping address
4. Select "Razorpay"
5. Click "Pay with Razorpay"
6. Use test card details
7. Complete payment
8. Verify order is created and marked as paid

## 🚨 Error Handling

### Common Errors
- **"Razorpay is not configured"**: Check environment variables
- **"Payment verification failed"**: Invalid signature or tampered data
- **"Cart is empty"**: User tried to checkout with empty cart

### Frontend Error States
- Razorpay script not loaded
- Payment creation failed
- Payment verification failed
- Network errors

## 📊 Order Status Flow

```
Razorpay Payment:
1. User initiates checkout → Order not created yet
2. Payment successful → Order created with status "processing", isPaid: true
3. Payment failed → No order created, user can retry

COD/PayPal:
1. User places order → Order created immediately with status "processing"/"pending", isPaid: true/false
```

## 🔄 Migration Notes

### Existing Orders
- Existing COD and PayPal orders remain unchanged
- Razorpay orders will have `paymentMethod: "Razorpay"` and proper payment result data

### Backward Compatibility
- All existing checkout functionality preserved
- Razorpay is an additional payment option

## 🎯 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production Razorpay keys
- [ ] Enable HTTPS
- [ ] Test with real payment methods
- [ ] Monitor payment logs
- [ ] Set up webhook verification (optional)

## 🐛 Troubleshooting

### Backend Issues
1. Check Razorpay keys are set correctly
2. Verify MongoDB connection
3. Check server logs for detailed errors

### Frontend Issues
1. Ensure Razorpay script loads (check network tab)
2. Verify API calls are successful
3. Check browser console for JavaScript errors

### Payment Issues
1. Use Razorpay dashboard to check payment status
2. Verify signature calculation
3. Check webhook events (if configured)

## 📚 Additional Resources

- [Razorpay Documentation](https://docs.razorpay.com/)
- [Razorpay Dashboard](https://dashboard.razorpay.com/)
- [Payment Gateway Integration Guide](https://razorpay.com/docs/payment-gateway/)

---

For any issues or questions, check the server logs and Razorpay dashboard for detailed payment information.