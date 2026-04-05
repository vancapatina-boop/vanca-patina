import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Star, ArrowLeft, ShieldCheck, Droplets, Minus, Plus, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import SectionHeading from "@/components/SectionHeading";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatCurrency } from "@/lib/formatCurrency";
import { mapBackendProduct } from "@/lib/mapBackendProduct";
import api from "@/services/api";

const renderDescription = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
    /^https?:\/\/[^\s]+$/.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-patina transition-colors break-all"
      >
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ReturnType<typeof mapBackendProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/products/${id}`)
      .then((res) => {
        if (cancelled) return;
        setProduct(mapBackendProduct(res.data));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setError(getApiErrorMessage(error, "Failed to load product"));
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
    return products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  }, [products, product]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCart(product, qty);
      toast.success(`${product.name} added to cart!`);
      setQty(1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to add to cart"));
    } finally {
      setIsAddingToCart(false);
    }
  };

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
        <Link to="/shop" className="text-primary mt-4 inline-block">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="glass-card overflow-hidden rounded-xl">
              <ProductGallery 
                images={product.images && product.images.length > 0 ? product.images : [product.image]} 
                productName={product.name} 
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {product.badge && (
              <span className="inline-block px-3 py-1 text-xs font-bold gradient-copper text-primary-foreground rounded-full mb-4">
                {product.badge}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${index < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <span className="text-3xl font-bold text-foreground">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground mt-6 leading-relaxed">{renderDescription(product.description)}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.category}</span>
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.finishType}</span>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <div className="flex items-center glass rounded-lg">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-3 text-muted-foreground hover:text-foreground"
                  disabled={isAddingToCart}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-foreground font-semibold">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="p-3 text-muted-foreground hover:text-foreground"
                  disabled={isAddingToCart}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" /> Adding...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" /> Add to Cart
                  </>
                )}
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

        {related.length > 0 && (
          <div className="mt-24">
            <SectionHeading subtitle="You May Also Like" title="Related Products" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
