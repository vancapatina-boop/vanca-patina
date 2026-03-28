import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Product } from "@/types/product";
import api from "@/services/api";
import { mapBackendProduct } from "@/lib/mapBackendProduct";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  loading: boolean;
  error: string | null;
  syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const syncCart = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/cart");
      const backendCart = res.data;

      const mapped: CartItem[] = (backendCart.items ?? []).map((it: any) => ({
        product: mapBackendProduct(it.product),
        quantity: Number(it.qty),
      }));

      setItems(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to sync cart");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial sync when the user is already logged in.
    if (token) void syncCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addToCart = useCallback(async (product: Product, qty: number = 1) => {
    const t = localStorage.getItem("token");
    if (!t) {
      // Guest fallback (best-effort). Authenticated users will be synced from DB.
      setItems((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        }
        return [...prev, { product, quantity: qty }];
      });
      return;
    }

    setError(null);
    try {
      await api.post("/api/cart", { productId: product.id, qty });
      await syncCart();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Failed to add to cart";
      setError(message);
      throw error;
    }
  }, [syncCart]);

  const removeFromCart = useCallback(async (productId: string) => {
    const t = localStorage.getItem("token");
    if (!t) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }

    setError(null);
    await api.delete(`/api/cart/${productId}`);
    await syncCart();
  }, [syncCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const qty = Number(quantity);
    const t = localStorage.getItem("token");

    if (!t) {
      if (qty <= 0) {
        setItems((prev) => prev.filter((item) => item.product.id !== productId));
      } else {
        setItems((prev) =>
          prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
        );
      }
      return;
    }

    if (qty <= 0) {
      await removeFromCart(productId);
      return;
    }

    setError(null);
    await api.put("/api/cart", { productId, qty });
    await syncCart();
  }, [removeFromCart, syncCart]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
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
