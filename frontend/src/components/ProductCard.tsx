import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Star, Loader } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatCurrency } from "@/lib/formatCurrency";
import { addToWishlist } from "@/services/dashboardService";
import { Product } from "@/types/product";

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  const requireLogin = (message: string) => {
    if (isAuthenticated) return false;
    toast.error(message);
    navigate("/login");
    return true;
  };

  const handleAddToCart = async () => {
    if (requireLogin("Please login to add items to cart")) return;

    try {
      setIsLoading(true);
      await addToCart(product);
      toast.success(`${product.name} added to cart!`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to add to cart"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (requireLogin("Please login to add items to wishlist")) return;

    try {
      setIsWishlistLoading(true);
      await addToWishlist(product.id);
      toast.success(`${product.name} added to wishlist!`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to add to wishlist"));
    } finally {
      setIsWishlistLoading(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="glass-card overflow-hidden group"
    >
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={800}
          height={800}
          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.badge && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold gradient-copper text-primary-foreground rounded-full">
            {product.badge}
          </span>
        )}
      </Link>

      <div className="p-5">
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 fill-primary text-primary" />
          <span className="text-xs text-muted-foreground">
            {product.rating} ({product.reviews})
          </span>
        </div>

        <Link to={`/product/${product.id}`}>
          <h3 className="font-display font-semibold text-foreground mb-1 line-clamp-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{product.shortDescription}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground truncate">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAddToWishlist}
              disabled={isWishlistLoading}
              className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add to wishlist"
            >
              {isWishlistLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isLoading}
              className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add to cart"
            >
              {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
