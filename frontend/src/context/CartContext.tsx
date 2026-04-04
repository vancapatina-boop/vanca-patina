import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { mapBackendProduct } from "@/lib/mapBackendProduct";
import api from "@/services/api";
import { BackendCart, BackendCartItem, BackendProduct } from "@/types/backend";
import { Product } from "@/types/product";

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
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCart = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/cart");
      const backendCart = res.data as BackendCart;

      const mapped: CartItem[] = (backendCart.items ?? [])
        .filter((item): item is BackendCartItem & { product: BackendProduct } => item.product != null)
        .map((item) => ({
          product: mapBackendProduct(item.product),
          quantity: Number(item.qty ?? 0),
        }));

      setItems(mapped);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to sync cart"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void syncCart();
      return;
    }

    setItems([]);
    setError(null);
  }, [syncCart, token]);

  const addToCart = useCallback(async (product: Product, qty: number = 1) => {
    if (!token) {
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
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Failed to add to cart");
      setError(message);
      throw error;
    }
  }, [syncCart, token]);

  const removeFromCart = useCallback(async (productId: string) => {
    if (!token) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }

    setError(null);
    await api.delete(`/api/cart/${productId}`);
    await syncCart();
  }, [syncCart, token]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    const qty = Number(quantity);

    if (!token) {
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
  }, [removeFromCart, syncCart, token]);

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
