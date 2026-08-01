import { compareVariantKeys, normalizeVariant } from "@/lib/pricing";
import type { Product, ProductVariant, ProductVariantKey } from "@/types/product";

function activeVariants(product: Product) {
  return Object.entries(product.variants ?? {})
    .map(([key, variant]) => ({
      ...variant,
      key: variant.key || key,
      label: variant.label || variant.name || key,
    }))
    .filter((variant) => variant.status !== "inactive")
    .sort((a, b) => compareVariantKeys(a.key, b.key));
}

export function getDefaultVariantKey(product: Product): ProductVariantKey {
  const variants = activeVariants(product);
  const available = variants.find((variant) => Number(variant.stock ?? 0) > 0);
  return normalizeVariant((available ?? variants[0])?.key || "250ml");
}

export function getVariantInfo(product: Product, variant?: ProductVariantKey): ProductVariant {
  const requestedKey = normalizeVariant(variant);
  const variants = activeVariants(product);
  const matched =
    product.variants?.[requestedKey] ||
    variants.find((item) => normalizeVariant(item.key) === requestedKey) ||
    variants.find((item) => normalizeVariant(item.label) === requestedKey) ||
    variants[0];

  if (matched) {
    const key = matched.key || requestedKey;
    const label = matched.label || matched.name || key;
    const salePrice = matched.salePrice == null ? undefined : Number(matched.salePrice);
    const basePrice = Number(matched.price ?? product.price ?? 0);
    const price = Number.isFinite(salePrice) ? salePrice : basePrice;

    return {
      ...matched,
      key,
      label,
      price: Number.isFinite(price) ? price : 0,
      stock: Number(matched.stock ?? 0),
    };
  }

  return {
    key: requestedKey,
    label: requestedKey,
    price: Number(product.price ?? 0),
    stock: Number(product.stock ?? 0),
    status: product.inStock ? "active" : "inactive",
  };
}
