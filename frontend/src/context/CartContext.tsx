import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { mapBackendProduct } from "@/lib/mapBackendProduct";
import { getDefaultVariantKey, getVariantInfo } from "@/lib/productVariant";
import { normalizeVariant, variantToMl, computeOrderPricing } from "@/lib/pricing";
import type { ProductVariantKey } from "@/types/product";
import api from "@/services/api";
import { BackendCart, BackendCartItem, BackendProduct } from "@/types/backend";
import { Product } from "@/types/product";

export interface CartItem {
  product: Product;
  quantity: number;
  variant: ProductVariantKey;
}

const CART_STORAGE_KEY = "vp-cart-items";

function readCartFromStorage(source: string): CartItem[] {
  try {
    const rawCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!rawCart) {
      console.log(`[CartContext] No saved cart found (${source})`);
      return [];
    }

    const parsedCart = JSON.parse(rawCart);
    if (!Array.isArray(parsedCart)) {
      console.warn(`[CartContext] Ignoring invalid saved cart payload (${source})`, parsedCart);
      return [];
    }

    console.log(`[CartContext] Loaded cart from localStorage (${source})`, parsedCart);
    return parsedCart as CartItem[];
  } catch (error) {
    console.error(`[CartContext] Failed to read cart from localStorage (${source})`, error);
    return [];
  }
}

function writeCartToStorage(nextItems: CartItem[], source: string) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    console.log(`[CartContext] Saved cart to localStorage (${source})`, nextItems);
  } catch (error) {
    console.error(`[CartContext] Failed to persist cart to localStorage (${source})`, error);
  }
}

function mapBackendCartToItems(backendCart: BackendCart): CartItem[] {
  return (backendCart.items ?? [])
    .filter((item): item is BackendCartItem & { product: BackendProduct } => item.product != null)
    .map((item) => ({
      product: mapBackendProduct(item.product),
      quantity: Number(item.qty ?? 0),
      variant: normalizeVariant(item.variantKey),
    }));
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number, variant?: ProductVariantKey) => Promise<void>;
  removeFromCart: (productId: string, variant?: ProductVariantKey) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variant?: ProductVariantKey) => Promise<void>;
  clearCart: () => void;
  hydrateCartFromStorage: () => CartItem[];
  totalItems: number;
  totalPrice: number;
  /** Total product ml in cart (for shipping). */
  totalMl: number;
  orderPricing: ReturnType<typeof computeOrderPricing>;
  loading: boolean;
  error: string | null;
  syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // isLoading tells us AuthContext is still reading token from localStorage
  const { token, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => readCartFromStorage("initial"));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("token")));
  const [error, setError] = useState<string | null>(null);

  const commitCart = useCallback(
    (updater: CartItem[] | ((currentItems: CartItem[]) => CartItem[]), source: string) => {
      setItems((currentItems) => {
        const nextItems =
          typeof updater === "function"
            ? (updater as (items: CartItem[]) => CartItem[])(currentItems)
            : updater;

        console.log(`[CartContext] Cart state update (${source})`, nextItems);
        writeCartToStorage(nextItems, source);
        return nextItems;
      });
    },
    []
  );

  const hydrateCartFromStorage = useCallback(() => {
    const storedItems = readCartFromStorage("hydrateCartFromStorage");
    if (storedItems.length > 0) {
      commitCart(storedItems, "hydrateCartFromStorage");
    }
    return storedItems;
  }, [commitCart]);

  const syncCart = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/cart");
      const mapped = mapBackendCartToItems(res.data as BackendCart);
      console.log("[CartContext] Synced cart from backend", mapped);
      commitCart(mapped, "syncCart");
    } catch (error: unknown) {
      const storedItems = readCartFromStorage("syncCart:error");
      if (storedItems.length > 0) {
        commitCart(storedItems, "syncCart:storage-fallback");
      }
      setError(getApiErrorMessage(error, "Failed to sync cart"));
    } finally {
      setLoading(false);
    }
  }, [commitCart, token]);

  useEffect(() => {
    console.log("[CartContext] Current cart state", items);
    console.log("[CartContext] Current localStorage cart", localStorage.getItem(CART_STORAGE_KEY));
  }, [items]);

  useEffect(() => {
    // Wait until auth has finished bootstrapping from localStorage.
    // Without this guard the cart clears on refresh because token is
    // null for a brief moment before AuthContext reads localStorage.
    if (authLoading) return;

    if (token) {
      void syncCart();
      return;
    }

    setItems([]);
    setError(null);
    setLoading(false);
  }, [authLoading, syncCart, token]);

  const addToCart = useCallback(
    async (product: Product, qty: number = 1, variant?: ProductVariantKey) => {
      const v = variant ? normalizeVariant(variant) : getDefaultVariantKey(product);
      if (!token) {
        commitCart((prev) => {
          const existing = prev.find((item) => item.product.id === product.id && item.variant === v);
          if (existing) {
            return prev.map((item) =>
              item.product.id === product.id && item.variant === v
                ? { ...item, quantity: item.quantity + qty }
                : item
            );
          }
          return [...prev, { product, quantity: qty, variant: v }];
        }, "addToCart:local");
        return;
      }

      setError(null);
      try {
        const res = await api.post("/cart", { productId: product.id, qty, variantKey: v });
        commitCart(mapBackendCartToItems(res.data as BackendCart), "addToCart:api");
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, "Failed to add to cart");
        setError(message);
        throw error;
      }
    },
    [commitCart, token]
  );

  const removeFromCart = useCallback(
    async (productId: string, variant: ProductVariantKey = "250ml") => {
      const v = normalizeVariant(variant);
      if (!token) {
        commitCart(
          (prev) => prev.filter((item) => !(item.product.id === productId && item.variant === v)),
          "removeFromCart:local"
        );
        return;
      }

      setError(null);
      const res = await api.delete(`/cart/${productId}`, { data: { variantKey: v } });
      commitCart(mapBackendCartToItems(res.data as BackendCart), "removeFromCart:api");
    },
    [commitCart, token]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number, variant: ProductVariantKey = "250ml") => {
      const v = normalizeVariant(variant);
      const qty = Number(quantity);

      if (!token) {
        if (qty <= 0) {
          commitCart(
            (prev) => prev.filter((item) => !(item.product.id === productId && item.variant === v)),
            "updateQuantity:local:remove"
          );
        } else {
          commitCart(
            (prev) =>
              prev.map((item) =>
                item.product.id === productId && item.variant === v ? { ...item, quantity: qty } : item
              ),
            "updateQuantity:local"
          );
        }
        return;
      }

      if (qty <= 0) {
        await removeFromCart(productId, v);
        return;
      }

      setError(null);
      const res = await api.put("/cart", { productId, qty, variantKey: v });
      commitCart(mapBackendCartToItems(res.data as BackendCart), "updateQuantity:api");
    },
    [commitCart, removeFromCart, token]
  );

  const clearCart = useCallback(() => commitCart([], "clearCart"), [commitCart]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const totalMl = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * variantToMl(item.variant), 0),
    [items]
  );

  const totalPrice = useMemo(
    () =>
      items.reduce((sum, item) => {
        const { price } = getVariantInfo(item.product, item.variant);
        return sum + price * item.quantity;
      }, 0),
    [items]
  );

  const orderPricing = useMemo(() => computeOrderPricing(totalPrice, totalMl), [totalPrice, totalMl]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        hydrateCartFromStorage,
        totalItems,
        totalPrice,
        totalMl,
        orderPricing,
        loading,
        error,
        syncCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
