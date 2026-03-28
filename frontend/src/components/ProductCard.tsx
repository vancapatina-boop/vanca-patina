import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Star, Loader } from "lucide-react";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToCart = async () => {
    // 🔐 Check authentication
    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    try {
      setIsLoading(true);
      await addToCart(product);
      toast.success(`${product.name} added to cart!`);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Failed to add to cart";
      toast.error(message);
      console.error("🛒 Add to cart error:", error);
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">₹{product.price.toLocaleString()}</span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ₹{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
