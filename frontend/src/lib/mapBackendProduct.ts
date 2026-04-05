import defaultProductImage from "@/assets/default-product.jpg";
import { BACKEND_ORIGIN } from "@/lib/apiConfig";
import { BackendProduct } from "@/types/backend";
import { Product } from "@/types/product";

function normalizeImageUrl(imagePath: string | undefined): string {
  if (!imagePath) return defaultProductImage;

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  if (imagePath.startsWith("/uploads/")) {
    return `${BACKEND_ORIGIN}${imagePath}`;
  }

  return defaultProductImage;
}

export function mapBackendProduct(item: BackendProduct): Product {
  const price = Number(item.price ?? 0);
  const rating = Number(item.ratings ?? item.rating ?? 0);
  const reviews = Number(item.numReviews ?? item.reviews ?? 0);
  const stock = Number(item.stock ?? 0);
  const image = item.image;

  if (!image || image.includes("undefined")) {
    console.warn(`Product "${item.name ?? "Unnamed"}" has an invalid image path:`, image);
  }

  // Map images array - ensure all are normalized URLs
  const images = Array.isArray(item.images) 
    ? item.images
        .map(normalizeImageUrl)
        .filter(url => url && url !== defaultProductImage && url.trim() !== '')
    : [];

  return {
    id: String(item._id ?? item.id ?? ""),
    name: item.name ?? "",
    price,
    originalPrice: price > 0 ? Math.round(price * 1.2) : undefined,
    description: item.description ?? "",
    shortDescription: String(item.description ?? "").slice(0, 60),
    category: item.category ?? "General",
    finishType: item.finishType ?? item.category ?? "Standard",
    image: normalizeImageUrl(image),
    images: images.length > 0 ? images : [normalizeImageUrl(image)],
    rating,
    reviews,
    inStock: stock > 0,
    badge: item.badge ?? undefined,
    createdAt: item.createdAt,
  };
}
