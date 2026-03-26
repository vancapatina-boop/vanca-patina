import defaultProductImage from "@/assets/default-product.jpg";
import { Product } from "@/types/product";

export function mapBackendProduct(item: any): Product {
  const price = Number(item.price ?? 0);
  const rating = Number(item.ratings ?? item.rating ?? 0);
  const reviews = Number(item.numReviews ?? item.reviews ?? 0);
  const stock = Number(item.stock ?? 0);

  return {
    id: String(item._id ?? item.id),
    name: item.name ?? "",
    price,
    originalPrice: price > 0 ? Math.round(price * 1.2) : undefined,
    description: item.description ?? "",
    shortDescription: String(item.description ?? "").slice(0, 60),
    category: item.category ?? "General",
    finishType: item.category ?? "Standard",
    image: item.image ?? defaultProductImage,
    rating,
    reviews,
    inStock: stock > 0,
    badge: item.badge ?? undefined,
  };
}

