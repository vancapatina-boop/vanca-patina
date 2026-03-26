import { useEffect, useState } from "react";
import { Product } from "@/types/product";
import api from "@/services/api";
import { mapBackendProduct } from "@/lib/mapBackendProduct";

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get("/api/products", { params: { pageNumber: 1, pageSize: 200 } })
      .then((res) => {
        const payload = res.data;
        const list = payload?.products ?? payload ?? [];
        if (!Array.isArray(list)) return;
        if (cancelled) return;
        setProducts(list.map(mapBackendProduct));
      })
      .catch((e) => {
        const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load products";
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
};
