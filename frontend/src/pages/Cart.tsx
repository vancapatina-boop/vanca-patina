import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { motion } from "framer-motion";

const Cart = () => {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2 mb-6">Add some premium products to get started.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <motion.div key={item.product.id} layout className="glass-card p-4 flex gap-4">
                <img src={item.product.image} alt={item.product.name} className="w-24 h-24 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`} className="font-display font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">{item.product.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center glass rounded-lg">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2 text-muted-foreground hover:text-foreground">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2 text-muted-foreground hover:text-foreground">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-foreground">₹{(item.product.price * item.quantity).toLocaleString()}</span>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card p-8 h-fit sticky top-24">
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Order Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>₹{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span><span>Calculated at checkout</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold text-foreground">
                <span>Total</span><span>₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <button className="w-full mt-6 px-6 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all">
              Proceed to Checkout
            </button>
            <Link to="/shop" className="block text-center text-sm text-primary mt-4 hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
