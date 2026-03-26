import { useParams, Link } from "react-router-dom";
import { ShoppingBag, Star, ArrowLeft, ShieldCheck, Droplets, Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { mapBackendProduct } from "@/lib/mapBackendProduct";

const ProductDetail = () => {
  const { id } = useParams();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<ReturnType<typeof mapBackendProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/api/products/${id}`)
      .then((res) => {
        if (cancelled) return;
        setProduct(mapBackendProduct(res.data));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message ?? e?.message ?? "Failed to load product");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
  }, [products, product]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="animate-pulse text-zinc-400 font-medium text-lg">Loading secure data...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <p className="text-muted-foreground">{error ?? "Product not found."}</p>
        <Link to="/shop" className="text-primary mt-4 inline-block">← Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="glass-card overflow-hidden">
              <img src={product.image} alt={product.name} width={800} height={800} className="w-full aspect-square object-cover" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            {product.badge && (
              <span className="inline-block px-3 py-1 text-xs font-bold gradient-copper text-primary-foreground rounded-full mb-4">
                {product.badge}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <span className="text-3xl font-bold text-foreground">₹{product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">₹{product.originalPrice.toLocaleString()}</span>
              )}
            </div>

            <p className="text-muted-foreground mt-6 leading-relaxed">{product.description}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.category}</span>
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.finishType}</span>
            </div>

            {/* Qty + Add to Cart */}
            <div className="flex items-center gap-4 mt-8">
              <div className="flex items-center glass rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-muted-foreground hover:text-foreground">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-foreground font-semibold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-3 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => void addToCart(product, qty)}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all"
              >
                <ShoppingBag className="w-5 h-5" /> Add to Cart
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-patina" /> Safe for professional use
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Droplets className="w-4 h-4 text-patina" /> Easy application
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-24">
            <SectionHeading subtitle="You May Also Like" title="Related Products" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
