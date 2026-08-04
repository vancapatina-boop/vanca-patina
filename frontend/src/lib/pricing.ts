export type OrderPricing = {
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
};

export const TAX_RATE = 0.18;
export const SHIPPING_PRICE = 200;

function roundMoney(value: number) {
  return Number((Number(value) || 0).toFixed(2));
}

export function normalizeVariant(variant?: string | null) {
  const raw = String(variant || "250ml").trim();
  if (!raw) return "250ml";

  const compact = raw.toLowerCase().replace(/\s+/g, "");
  if (compact === "1l" || compact === "1ltr" || compact === "1liter" || compact === "1litre") return "1000ml";

  const match = compact.match(/^(\d+(?:\.\d+)?)(ml|ltr|liter|litre|l)?$/);
  if (!match) return raw;

  const amount = Number(match[1]);
  const unit = match[2] || "ml";
  if (!Number.isFinite(amount)) return raw;

  if (unit === "l" || unit === "ltr" || unit === "liter" || unit === "litre") {
    return `${Math.round(amount * 1000)}ml`;
  }

  return `${Math.round(amount)}ml`;
}

export function variantToMl(variant?: string | null) {
  const normalized = normalizeVariant(variant);
  const match = normalized.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(ml|l|ltr|liter|litre)?/);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = match[2] || "ml";
  if (!Number.isFinite(amount)) return 0;

  return unit === "ml" ? amount : amount * 1000;
}

export function compareVariantKeys(a: string, b: string) {
  const aMl = variantToMl(a);
  const bMl = variantToMl(b);

  if (aMl && bMl && aMl !== bMl) return aMl - bMl;
  if (aMl && !bMl) return -1;
  if (!aMl && bMl) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function computeOrderPricing(itemsPrice: number, _totalMl = 0): OrderPricing {
  const normalizedItemsPrice = roundMoney(itemsPrice);
  const shippingPrice = normalizedItemsPrice <= 0 ? 0 : SHIPPING_PRICE;
  const taxPrice = roundMoney((normalizedItemsPrice + shippingPrice) * TAX_RATE);
  const totalPrice = roundMoney(normalizedItemsPrice + shippingPrice + taxPrice);

  return {
    itemsPrice: normalizedItemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  };
}
