import { useParams, Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, ShieldCheck, Droplets, Minus, Plus, Loader, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ProductRating from "@/components/ProductRating";
import ProductReviews from "@/components/ProductReviews";
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
  const [selectedVariantKey, setSelectedVariantKey] = useState<string | undefined>();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/products/${id}`)
      .then((res) => {
        if (cancelled) return;
        const mappedProduct = mapBackendProduct(res.data);
        const variantsList = Object.values(mappedProduct.variants ?? {}).filter((v) => v.status !== "inactive");

        // Default to first in-stock variant, or first variant if all out of stock
        const firstAvailable = variantsList.find((v) => v.stock > 0) ?? variantsList[0];

        setProduct(mappedProduct);
        setSelectedVariantKey(firstAvailable?.label || firstAvailable?.key);
        setQty(1);
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

  const variants = useMemo(() => {
    if (!product?.variants) return [];
    return Object.values(product.variants).filter((v) => v.status !== "inactive");
  }, [product]);

  // Selected variant lookup (by label or key or name)
  const selectedVariant = useMemo(() => {
    if (!product?.variants || !selectedVariantKey) return undefined;
    if (product.variants[selectedVariantKey]) return product.variants[selectedVariantKey];
    return Object.values(product.variants).find(
      (v) => v.label === selectedVariantKey || v.name === selectedVariantKey || v.key === selectedVariantKey
    );
  }, [product, selectedVariantKey]);

  // Price & stock computations
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayStock = selectedVariant ? selectedVariant.stock : product?.stock ?? 0;
  const isOutOfStock = displayStock <= 0;
  const isLowStock = displayStock > 0 && displayStock <= 3;

  // Enforce qty cap whenever selected variant or stock changes
  useEffect(() => {
    if (displayStock > 0 && qty > displayStock) {
      setQty(displayStock);
    }
  }, [displayStock, qty]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    if (isOutOfStock) {
      toast.error("This option is currently out of stock");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    try {
      setIsAddingToCart(true);
      const targetKey = selectedVariant?.key || selectedVariantKey;
      await addToCart(product, qty, targetKey);
      const label = selectedVariant?.label || selectedVariantKey ? ` (${selectedVariant?.label || selectedVariantKey})` : "";
      toast.success(`${product.name}${label} added to cart!`);
      setQty(1);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to add to cart"));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleReviewRatingChange = useCallback((rating: number, reviews: number) => {
    setProduct((current) => {
      if (!current || (current.rating === rating && current.reviews === reviews)) {
        return current;
      }

      return { ...current, rating, reviews };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="animate-pulse text-zinc-400 font-medium text-lg flex items-center gap-3">
          <Loader className="w-5 h-5 animate-spin text-accent" /> Loading product details...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center px-4 text-center">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-border shadow-2xl space-y-4">
          <h2 className="text-2xl font-display font-bold text-foreground">Product Not Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {error ?? "The product you are looking for does not exist or may have been moved."}
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all mt-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </div>
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
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="glass-card overflow-hidden rounded-xl">
              <ProductGallery
                images={product.images && product.images.length > 0 ? product.images : [product.image]}
                productName={product.name}
              />
            </div>
          </motion.div>

          {/* Details & Variants */}
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
            <ProductRating rating={product.rating} count={product.reviews} className="mt-3" />

            {/* Price & Selected Stock Summary */}
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <span className="text-3xl font-bold text-foreground">{formatCurrency(displayPrice)}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}

              {/* Top Summary Stock Status */}
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full">
                  <XCircle className="w-3.5 h-3.5" /> Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> Only {displayStock} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {displayStock} in stock
                </span>
              )}
            </div>

            <p className="text-muted-foreground mt-6 leading-relaxed">{renderDescription(product.description)}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.category}</span>
              <span className="px-3 py-1 text-xs glass rounded-full text-muted-foreground">{product.finishType}</span>
            </div>

            {/* ── Variant Selector Cards ────────────────────────────────────── */}
            {variants.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Select Variant</p>
                  <span className="text-xs text-muted-foreground">{variants.length} sizes available</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variants.map((v) => {
                    const isSelected = selectedVariantKey === v.label || selectedVariantKey === v.key || selectedVariantKey === v.name;
                    const vOutOfStock = v.stock <= 0;
                    const vLowStock = v.stock > 0 && v.stock <= 3;

                    return (
                      <button
                        key={v.key || v.label}
                        type="button"
                        onClick={() => {
                          setSelectedVariantKey(v.label || v.key);
                          setQty(1);
                        }}
                        className={`relative rounded-xl border p-4 text-left transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 text-foreground ring-1 ring-primary"
                            : vOutOfStock
                            ? "border-border/40 bg-zinc-900/40 text-muted-foreground hover:border-border cursor-pointer opacity-85"
                            : "border-border/80 glass text-muted-foreground hover:border-primary/60 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-bold text-foreground tracking-wide">
                            {v.label || v.name}
                          </span>
                          {v.sku && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                              {v.sku}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-foreground">
                            {formatCurrency(v.price)}
                          </span>

                          {/* Individual Variant Stock Badge */}
                          {vOutOfStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                              <span>❌</span> Out of Stock
                            </span>
                          ) : vLowStock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                              <span>⚠️</span> Only {v.stock} left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <span>✅</span> {v.stock} in stock
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quantity & Add To Cart ───────────────────────────────────── */}
            <div className="flex items-center gap-4 mt-8">
              <div className="flex items-center glass rounded-lg">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-3 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={isAddingToCart || qty <= 1 || isOutOfStock}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-foreground font-semibold min-w-[2rem] text-center">
                  {isOutOfStock ? 0 : qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(displayStock, qty + 1))}
                  className="p-3 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={isAddingToCart || qty >= displayStock || isOutOfStock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || isOutOfStock}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" /> Adding...
                  </>
                ) : isOutOfStock ? (
                  "Out of Stock"
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

        {/* Related Products */}
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

        <ProductReviews
          productId={product.id}
          onRatingChange={handleReviewRatingChange}
        />
      </div>
    </div>
  );
};

export default ProductDetail;
