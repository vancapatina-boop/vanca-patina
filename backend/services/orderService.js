const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/product');

function computeTotals(cartItems) {
  const orderItems = cartItems.map((item) => ({
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

async function createOrderFromCart({ user, shippingAddress, paymentMethod, razorpayOrderId = null }) {
  const cart = await Cart.findOne({ user: user._id }).populate('items.product');

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    const err = new Error('Cart is empty');
    err.statusCode = 400;
    throw err;
  }

  const { orderItems, itemsPrice, taxPrice, shippingPrice, totalPrice } = computeTotals(cart.items);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id).session(session);

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.stock < item.qty) {
        throw new Error(`${product.name} is out of stock`);
      }

      product.stock -= item.qty;
      await product.save({ session });
    }

    const isPaid = paymentMethod === 'PayPal';
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
      paymentStatus: isPaid ? 'paid' : 'pending',
      paymentGateway: razorpayOrderId
        ? {
            provider: 'razorpay',
            orderId: razorpayOrderId,
          }
        : undefined,
      paymentResult: isPaid
        ? {
            status: 'completed',
            update_time: new Date().toISOString(),
            email_address: user.email,
          }
        : {
            status: paymentMethod === 'Razorpay' ? 'created' : 'pending',
            email_address: user.email,
          },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid,
      paidAt: isPaid ? new Date() : null,
      status: isPaid ? 'confirmed' : 'pending',
    });

    const createdOrder = await order.save({ session });
    cart.items = [];
    await cart.save({ session });

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

module.exports = { createOrderFromCart, computeTotals };
