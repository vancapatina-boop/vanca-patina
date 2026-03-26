import api from "./api";

export async function checkoutOrder(params: {
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "PayPal" | "COD";
}) {
  const res = await api.post("/api/orders", params);
  return res.data;
}

export async function getMyOrders() {
  const res = await api.get("/api/orders/my");
  return res.data;
}

