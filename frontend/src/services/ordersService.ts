import api from "./api";
import { ShippingAddress } from "@/types/backend";

export type { ShippingAddress };

export interface CreatePaymentOrderResponse {
  appOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentParams {
  appOrderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createPaymentOrder(params: { shippingAddress: ShippingAddress }) {
  const res = await api.post("/payment/create-order", params);
  return res.data as CreatePaymentOrderResponse;
}

export async function verifyPayment(params: VerifyPaymentParams) {
  const res = await api.post("/payment/verify", params);
  return res.data;
}

export async function getMyOrders() {
  const res = await api.get("/orders/my");
  return res.data;
}

export async function getInvoice(orderId: string) {
  const res = await api.get(`/invoice/${orderId}`);
  return res.data;
}

export async function getAdminInvoice(orderId: string) {
  const res = await api.get(`/admin/invoice/${orderId}`);
  return res.data;
}

async function getInvoicePdfBlob(url: string) {
  const res = await api.get(url, {
    responseType: "blob",
    validateStatus: () => true,
  });
  if (res.status !== 200) {
    let message = "Invoice is not available yet";
    try {
      const text = await (res.data as Blob).text();
      const j = JSON.parse(text) as { message?: string };
      if (typeof j.message === "string") message = j.message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return res.data as Blob;
}

export async function downloadInvoice(orderId: string) {
  return getInvoicePdfBlob(`/invoice/${orderId}/download`);
}

export async function downloadAdminInvoice(orderId: string) {
  return getInvoicePdfBlob(`/admin/invoice/${orderId}/download`);
}
