import api from "./api";

type ShippingAddress = {
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export async function checkoutOrder(params: {
  shippingAddress: ShippingAddress;
  paymentMethod: "PayPal" | "COD" | "Razorpay";
}) {
  const res = await api.post("/api/orders", params);
  return res.data;
}

export async function createPaymentOrder(params: { shippingAddress: ShippingAddress }) {
  const res = await api.post("/api/payment/create-order", params);
  return res.data;
}

export async function verifyPayment(params: {
  appOrderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const res = await api.post("/api/payment/verify", params);
  return res.data;
}

export async function getMyOrders() {
  const res = await api.get("/api/orders/my");
  return res.data;
}

export async function getInvoice(orderId: string) {
  const res = await api.get(`/api/invoice/${orderId}`);
  return res.data;
}

export async function getAdminInvoice(orderId: string) {
  const res = await api.get(`/api/admin/invoice/${orderId}`);
  return res.data;
}

export async function downloadInvoice(orderId: string) {
  const res = await api.get(`/api/invoice/${orderId}/download`, {
    responseType: "blob",
  });
  return res.data as Blob;
}

export async function downloadAdminInvoice(orderId: string) {
  const res = await api.get(`/api/admin/invoice/${orderId}/download`, {
    responseType: "blob",
  });
  return res.data as Blob;
}
