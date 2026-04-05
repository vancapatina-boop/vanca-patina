import api from "./api";

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const res = await api.get("/users/profile");
  return res.data;
}

export async function updateProfile(data: { name?: string; email?: string; phone?: string; password?: string }) {
  const res = await api.put("/users/profile", data);
  return res.data;
}

// ── Addresses ────────────────────────────────────────────────────────────────

export async function getAddresses() {
  const res = await api.get("/users/addresses");
  return res.data;
}

export type SavedAddressPayload = {
  label?: string;
  address: string;
  address1?: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  addressType?: "home" | "work" | "other";
  isDefault?: boolean;
};

export async function addAddress(data: SavedAddressPayload) {
  const res = await api.post("/users/addresses", data);
  return res.data;
}

export async function updateAddress(addressId: string, data: Partial<SavedAddressPayload>) {
  const res = await api.put(`/users/addresses/${addressId}`, data);
  return res.data;
}

export async function deleteAddress(addressId: string) {
  const res = await api.delete(`/users/addresses/${addressId}`);
  return res.data;
}

// ── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlist() {
  const res = await api.get("/wishlist");
  return res.data;
}

export async function addToWishlist(productId: string) {
  const res = await api.post("/wishlist", { productId });
  return res.data;
}

export async function removeFromWishlist(productId: string) {
  const res = await api.delete(`/wishlist/${productId}`);
  return res.data;
}
