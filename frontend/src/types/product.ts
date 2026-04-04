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
  badge?: string;
  createdAt?: string;
}
