import api from "./api";

export async function checkoutOrder(params: {
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "PayPal" | "COD" | "Razorpay";
}) {
  const res = await api.post("/api/orders", params);
  return res.data;
}

export async function createPaymentOrder() {
  const res = await api.post("/api/payment/create-order");
  return res.data;
}

export async function verifyPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderData: {
    shippingAddress: {
      address: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
}) {
  const res = await api.post("/api/payment/verify", params);
  return res.data;
}

export async function getMyOrders() {
  const res = await api.get("/api/orders/my");
  return res.data;
}

