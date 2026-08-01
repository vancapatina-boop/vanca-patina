import defaultProductImage from "@/assets/default-product.jpg";
import { BACKEND_ORIGIN } from "@/lib/apiConfig";
import { compareVariantKeys } from "@/lib/pricing";
import { BackendProduct } from "@/types/backend";
import type { Product, ProductVariantInfo } from "@/types/product";

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

  let variants: Product["variants"] | undefined;
  const raw = item.variants;
  if (raw && typeof raw === "object") {
    const out: Record<string, ProductVariantInfo> = {};

    for (const [key, entry] of Object.entries(raw)) {
      if (!entry || typeof entry !== "object") continue;

      const normalizedKey = String(key).trim();
      if (!normalizedKey) continue;

      const variantPrice = Number(entry.price);
      if (!Number.isFinite(variantPrice)) continue;

      const variantStock = Number(entry.stock ?? 0);
      out[normalizedKey] = {
        key: normalizedKey,
        label: entry.label || entry.name || normalizedKey,
        name: entry.name || entry.label || normalizedKey,
        type: entry.type,
        sku: entry.sku,
        price: variantPrice,
        salePrice: entry.salePrice == null || entry.salePrice === "" ? undefined : Number(entry.salePrice),
        stock: Number.isFinite(variantStock) ? variantStock : 0,
        images: Array.isArray(entry.images) ? entry.images.map(normalizeImageUrl) : undefined,
        status: entry.status === "inactive" ? "inactive" : "active",
      };
    }

    const sortedKeys = Object.keys(out).sort(compareVariantKeys);
    if (sortedKeys.length > 0) {
      variants = Object.fromEntries(sortedKeys.map((key) => [key, out[key]])) as Product["variants"];
    }
  }
  const inStock = variants ? Object.values(variants).some((x) => x.stock > 0) : stock > 0;

  if (!image || image.includes("undefined")) {
    console.warn(`Product "${item.name ?? "Unnamed"}" has an invalid image path:`, image);
  }

  // Map images array - ensure all are normalized URLs
  const images = Array.isArray(item.images) 
    ? item.images
        .map(normalizeImageUrl)
        .filter(url => url && url !== defaultProductImage && url.trim() !== '')
    : [];

  const variantKeys = variants ? Object.keys(variants).sort(compareVariantKeys) : [];
  const baseVariantKey = variantKeys.find((key) => Number(variants?.[key]?.stock ?? 0) > 0) ?? variantKeys[0];
  const basePrice = (baseVariantKey ? variants?.[baseVariantKey]?.price : undefined) ?? price;

  return {
    id: String(item._id ?? item.id ?? ""),
    name: item.name ?? "",
    price: basePrice,
    originalPrice: basePrice > 0 ? Math.round(basePrice * 1.2) : undefined,
    description: item.description ?? "",
    shortDescription: String(item.description ?? "").slice(0, 60),
    category: item.category ?? "General",
    finishType: item.finishType ?? item.category ?? "Standard",
    image: normalizeImageUrl(image),
    images: images.length > 0 ? images : [normalizeImageUrl(image)],
    rating,
    reviews,
    stock: variants ? undefined : stock,
    variants,
    inStock,
    badge: item.badge ?? undefined,
    createdAt: item.createdAt,
  };
}
