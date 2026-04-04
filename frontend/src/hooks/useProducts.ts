import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiError";
import { mapBackendProduct } from "@/lib/mapBackendProduct";
import api from "@/services/api";
import { BackendProduct, BackendProductsPayload } from "@/types/backend";
import { Product } from "@/types/product";

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
        if (cancelled) return;

        const data = res.data as BackendProductsPayload;
        let list: BackendProduct[] = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data.products)) {
          list = data.products;
        } else {
          throw new Error("Invalid response format from API");
        }

        setProducts(list.map(mapBackendProduct));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setError(getApiErrorMessage(error, "Failed to load products"));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
};
