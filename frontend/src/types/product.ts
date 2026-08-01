export interface ProductVariant {
  key: string;
  label: string;
  name?: string;
  type?: string;
  sku?: string;
  price: number;
  salePrice?: number;
  stock: number;
  isAvailable?: boolean;
  stockStatus?: "out_of_stock" | "low_stock" | "in_stock";
  images?: string[];
  status?: "active" | "inactive";
}

export type ProductVariantKey = string;
export type ProductVariantInfo = ProductVariant;

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  shortDescription: string;
  category: string;
  finishType: string;
  image: string;
  images?: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  stock?: number;
  variants?: Record<string, ProductVariant>;
  badge?: string;
  createdAt?: string;
}
