import { useState, useEffect } from 'react';
import { Product, products as fallbackProducts } from '@/data/products';
import defaultProductImage from '@/assets/default-product.jpg';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item._id,
            name: item.name,
            price: item.price,
            originalPrice: item.originalPrice || item.price * 1.2,
            description: item.description || "Premium metal finish solution.",
            shortDescription: item.description?.substring(0, 50) || "Premium finish",
            category: item.category || "General",
            finishType: item.category || "Standard",
            image: item.image || defaultProductImage,
            rating: item.rating || 5,
            reviews: item.reviews || 24,
            inStock: true,
            badge: item.badge || undefined
          }));
          setProducts(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { products, loading };
};
