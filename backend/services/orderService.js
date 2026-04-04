const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/product');

function computeTotals(cartItems) {
  // Filter out any items whose product was deleted from DB (populated as null)
  const validItems = cartItems.filter((item) => item.product != null);

  const orderItems = validItems.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    qty: item.qty,
    image: item.product.image,
    price: item.product.price,
  }));

  const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxRate = Number(process.env.TAX_RATE || 0.05);
  const shippingPrice = itemsPrice > 2000 ? 0 : 75;
  const taxPrice = Number((itemsPrice * taxRate).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  return { orderItems, itemsPrice, taxPrice, shippingPrice, totalPrice };
}

async function createOrderFromCart({ user, shippingAddress, paymentMethod, razorpayOrderId = null, clearCartAfterCreation = true }) {
  const cart = await Cart.findOne({ user: user._id }).populate('items.product');

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    throw err;
  }

  // Remove orphaned items (product deleted from DB)
  const validItems = cart.items.filter((item) => item.product != null);
  if (validItems.length === 0) {
    const err = new Error('All items in your cart have been removed. Please add products again.');
    err.statusCode = 400;
    throw err;
  }

  // RE-VALIDATE PRODUCTS AND PRICES at checkout time
  // Prices may have changed since items were added to cart
  const currentProducts = await Product.find({
    _id: { $in: validItems.map(item => item.product._id) }
  });

  if (currentProducts.length !== validItems.length) {
    const err = new Error('Some products in your cart are no longer available');
    err.statusCode = 400;
    throw err;
  }

  // Create price map from current database state
  const priceMap = new Map(currentProducts.map(p => [p._id.toString(), p]));

  // Validate all items still have sufficient stock
  for (const item of validItems) {
    const currentProduct = priceMap.get(item.product._id.toString());
    if (!currentProduct || currentProduct.stock < item.qty) {
      const err = new Error(`${item.product.name} is out of stock or quantity unavailable`);
      err.statusCode = 400;
      throw err;
    }
  }

  const { orderItems, itemsPrice, taxPrice, shippingPrice, totalPrice } = computeTotals(validItems);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Use findByIdAndUpdate with $inc to atomically prevent race conditions
    for (const item of validItems) {
      const updated = await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.qty } },
        { new: true, session }
      );

      // Verify stock didn't go negative (race condition check)
      if (!updated || updated.stock < 0) {
        throw new Error(`${item.product.name} stock insufficient after deduction`);
      }
    }

    const order = new Order({
      user: user._id,
      customerSnapshot: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
      paymentGateway: razorpayOrderId
        ? {
            provider: 'razorpay',
            orderId: razorpayOrderId,
          }
        : undefined,
      paymentResult: {
        status: paymentMethod === 'Razorpay' ? 'created' : 'pending',
        email_address: user.email,
      },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: false,
      paidAt: null,
      status: 'pending',
    });

    const createdOrder = await order.save({ session });
    // Clear the cart only if requested (not for Razorpay until payment verified)
    if (clearCartAfterCreation) {
      cart.items = [];
      await cart.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return createdOrder;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (!error.statusCode) {
      error.statusCode = 400;
    }
    throw error;
  }
}

// STOCK RESTORATION: Cancel order and restore inventory
// Called when payment fails or order is cancelled
async function cancelOrderAndRestoreStock(orderId) {
  const order = await Order.findById(orderId);

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // Only restore stock if order hasn't been shipped/delivered
  if (['shipped', 'delivered'].includes(order.status)) {
    const err = new Error('Cannot cancel shipped or delivered orders');
    err.statusCode = 400;
    throw err;
  }

  // Skip if already cancelled (idempotency)
  if (order.status === 'cancelled') {
    return order;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore stock for all items in the order
    for (const item of order.orderItems) {
      const updated = await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.qty } },
        { new: true, session }
      );

      if (!updated) {
        throw new Error(`Product ${item.product} not found`);
      }
    }

    // Mark order as cancelled
    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (!error.statusCode) {
      error.statusCode = 400;
    }
    throw error;
  }
}

module.exports = { createOrderFromCart, computeTotals, cancelOrderAndRestoreStock };
