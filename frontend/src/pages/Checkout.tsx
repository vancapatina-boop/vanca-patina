import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { checkoutOrder } from "@/services/ordersService";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, syncCart, loading: cartLoading, error: cartError } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: "India",
  });

  const [paymentMethod, setPaymentMethod] = useState<"PayPal" | "COD">("PayPal");

  const canSubmit = useMemo(() => items.length > 0 && !isSubmitting, [items.length, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await checkoutOrder({ shippingAddress, paymentMethod });
      clearCart();
      await syncCart();
      navigate("/orders");
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? "Checkout failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!localStorage.getItem("token")) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <p className="text-muted-foreground">Please log in to checkout.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-6 py-3 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Checkout</h1>

        {cartLoading && <div className="text-muted-foreground">Loading cart...</div>}
        {cartError && <div className="text-destructive mb-4">{cartError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Shipping Address</label>
                <div className="space-y-3 mt-3">
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                    placeholder="Address"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress((s) => ({ ...s, address: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress((s) => ({ ...s, city: e.target.value }))}
                    />
                    <input
                      className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                      placeholder="Postal Code"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress((s) => ({ ...s, postalCode: e.target.value }))}
                    />
                  </div>
                  <input
                    className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-foreground"
                    placeholder="Country"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress((s) => ({ ...s, country: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                <div className="mt-3 flex gap-3 flex-wrap">
                  <button
                    type="button"
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      paymentMethod === "PayPal" ? "bg-primary/15 border-primary" : "bg-secondary/40 border-border"
                    }`}
                    onClick={() => setPaymentMethod("PayPal")}
                  >
                    PayPal
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-3 rounded-lg border transition-colors ${
                      paymentMethod === "COD" ? "bg-primary/15 border-primary" : "bg-secondary/40 border-border"
                    }`}
                    onClick={() => setPaymentMethod("COD")}
                  >
                    Cash on Delivery
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full mt-2 px-6 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all disabled:opacity-60"
              >
                {isSubmitting ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </div>

          <div className="glass-card p-6 h-fit sticky top-24">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>

            {items.length === 0 ? (
              <p className="text-muted-foreground">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                {items.map((it) => (
                  <div key={it.product.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{it.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {it.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      ₹{(it.product.price * it.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}

                <div className="border-t border-border pt-4 flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold text-foreground">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

