export interface BackendProduct {
  _id?: string;
  id?: string;
  name?: string;
  price?: number | string;
  image?: string;
  images?: string[];
  category?: string;
  description?: string;
  stock?: number | string;
  finishType?: string;
  ratings?: number | string;
  rating?: number | string;
  numReviews?: number | string;
  reviews?: number | string;
  badge?: string;
  createdAt?: string;
}

export interface BackendCartItem {
  product: BackendProduct | null;
  qty?: number | string;
}

export interface BackendCart {
  items?: BackendCartItem[];
}

export interface BackendProductsResponse {
  products?: BackendProduct[];
  page?: number;
  pages?: number;
  total?: number;
}

export type BackendProductsPayload = BackendProduct[] | BackendProductsResponse;

export interface ShippingAddress {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  addressType?: 'home' | 'work' | 'other';
  isDefault?: boolean;
  // Legacy fields (for backward compatibility)
  address?: string;
}

export interface AddressRecord {
  _id: string;
  label: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  address1?: string;
  address2?: string;
  addressType?: "home" | "work" | "other";
}
