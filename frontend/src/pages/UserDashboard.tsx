import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  LayoutDashboard, Package, Heart, UserCircle, MapPin, LogOut,
  ShoppingCart, ChevronRight, Trash2, Edit2, Plus, Star, Eye,
  CheckCircle2, Truck, Clock, X, Save, Loader2, ShoppingBag,
  Download, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getProfile, updateProfile, getAddresses, addAddress, updateAddress, deleteAddress, getWishlist, removeFromWishlist } from "@/services/dashboardService";
import { downloadInvoice, getMyOrders } from "@/services/ordersService";
import { useCart } from "@/context/CartContext";
import type { Product as CartProduct } from "@/types/product";

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderItem = { name: string; qty: number; price: number; image?: string; product?: string };
type OrderShippingAddress = { address?: string; city?: string; postalCode?: string; country?: string };
type Order = {
  _id: string;
  orderId?: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: string;
  isPaid: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt: string;
  shippingAddress?: OrderShippingAddress;
  invoice?: { invoiceNumber?: string; invoiceUrl?: string; status?: string };
};
type Product = { _id: string; name: string; price: number; image?: string; category?: string; ratings?: number };
type Address = { _id: string; label: string; address: string; city: string; postalCode: string; country: string; isDefault: boolean };
type ProfileData = { _id: string; name: string; email: string; phone: string; role: string; addresses: Address[] };

type Section = "overview" | "orders" | "wishlist" | "profile" | "addresses";

interface UserDashboardProps {
  initialSection?: Section;
}

const sidebarItems: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "My Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "addresses", label: "Addresses", icon: MapPin },
];

// ─── Status helpers ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: Clock },
  confirmed: { color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/20", icon: CheckCircle2 },
  processing: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", icon: Package },
  shipped: { color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", icon: Truck },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  cancelled: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: X },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const UserDashboard = ({ initialSection = "overview" }: UserDashboardProps) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [section, setSection] = useState<Section>(initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data states
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({ label: "Home", address: "", city: "", postalCode: "", country: "India", isDefault: false });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Load all data on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, wishlistRes] = await Promise.allSettled([
        getProfile(),
        getMyOrders(),
        getWishlist(),
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value);
        setProfileForm({ name: profileRes.value.name, email: profileRes.value.email, phone: profileRes.value.phone || "", password: "" });
        setAddresses(profileRes.value.addresses || []);
      }
      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value) ? ordersRes.value : []);
      if (wishlistRes.status === "fulfilled") setWishlist(Array.isArray(wishlistRes.value) ? wishlistRes.value : []);
    } catch { /* handled per-request */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleInvoiceDownload = async (order: Order) => {
    const id = order._id;
    try {
      setInvoiceLoadingId(id);
      const blob = await downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const inv = order.invoice?.invoiceNumber?.replace(/[^\w-]+/g, "_") || order.orderId?.replace(/[^\w-]+/g, "_") || id.slice(-8);
      link.download = `Invoice_${inv}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not download invoice. If this persists, contact support."));
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const canDownloadInvoice = (order: Order) => {
    if (order.status === "cancelled" && order.paymentStatus !== "paid" && !order.isPaid) return false;
    return order.paymentStatus === "paid" || order.isPaid || order.status === "delivered";
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const payload: { name?: string; email?: string; phone?: string; password?: string } = {};
      if (profileForm.name) payload.name = profileForm.name;
      if (profileForm.email) payload.email = profileForm.email;
      if (profileForm.phone) payload.phone = profileForm.phone;
      if (profileForm.password) payload.password = profileForm.password;
      const updated = await updateProfile(payload);
      setProfile(updated);
      setProfileForm(f => ({ ...f, password: "" }));
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update profile"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const updated = await removeFromWishlist(productId);
      setWishlist(updated);
      toast.success("Removed from wishlist");
    } catch { toast.error("Failed to remove"); }
  };

  const handleMoveToCart = async (product: Product) => {
    try {
      const cartProduct: CartProduct = {
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.image || "",
        description: "",
        shortDescription: "",
        category: product.category || "",
        finishType: "Standard",
        rating: product.ratings || 0,
        reviews: 0,
        inStock: true,
      };
      await addToCart(cartProduct, 1);
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  const handleAddressSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let updated;
      if (editingAddress) {
        updated = await updateAddress(editingAddress._id, addressForm);
      } else {
        updated = await addAddress(addressForm);
      }
      setAddresses(updated);
      setShowAddressForm(false);
      setEditingAddress(null);
      setAddressForm({ label: "Home", address: "", city: "", postalCode: "", country: "India", isDefault: false });
      toast.success(editingAddress ? "Address updated" : "Address added");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save address"));
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const updated = await deleteAddress(id);
      setAddresses(updated);
      toast.success("Address deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const startEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({ label: addr.label, address: addr.address, city: addr.city, postalCode: addr.postalCode, country: addr.country, isDefault: addr.isDefault });
    setShowAddressForm(true);
  };

  // ── Derived data ────────────────────────────────────────────────────────

  const recentOrders = orders.slice(0, 5);
  const totalSpent = orders.reduce((s, o) => s + o.totalPrice, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  // ── Render sections ─────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-zinc-100">Welcome back, {user?.name || "User"}</h2>
        <p className="text-zinc-400 mt-1">Here's what's happening with your account.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: Package, color: "from-blue-500/20 to-blue-600/5 border-blue-500/20" },
          { label: "Wishlist Items", value: wishlist.length, icon: Heart, color: "from-pink-500/20 to-pink-600/5 border-pink-500/20" },
          { label: "Total Spent", value: formatCurrency(totalSpent), icon: ShoppingBag, color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20" },
          { label: "Saved Addresses", value: addresses.length, icon: MapPin, color: "from-purple-500/20 to-purple-600/5 border-purple-500/20" },
        ].map((card) => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} border rounded-xl p-4 sm:p-5`}>
            <card.icon className="w-5 h-5 text-zinc-400 mb-3" />
            <p className="text-2xl font-bold text-zinc-100">{card.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Recent Orders</h3>
          {orders.length > 0 && (
            <button onClick={() => setSection("orders")} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {recentOrders.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No orders yet</p>
            <Button onClick={() => navigate("/shop")} variant="outline" className="mt-4 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order._id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {order.orderItems.map(i => i.name).join(", ")}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-semibold text-zinc-200">{formatCurrency(order.totalPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-zinc-100">My Orders</h3>
      {orders.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">No orders yet</p>
          <p className="text-zinc-500 text-sm mb-4">Once you place an order, it'll appear here.</p>
          <Button onClick={() => navigate("/shop")} className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              {/* Order header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
                <div>
                  <p className="text-xs text-zinc-500">Order ID</p>
                  <p className="text-sm font-mono text-zinc-300">#{order.orderId || order._id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="text-right sm:text-left">
                  <p className="text-xs text-zinc-500">Placed on</p>
                  <p className="text-sm text-zinc-300">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <StatusBadge status={order.status} />
                <p className="text-lg font-bold text-zinc-100">{formatCurrency(order.totalPrice)}</p>
              </div>
              {/* Order items */}
              <div className="p-4 space-y-3">
                {order.orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-zinc-600" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.qty} x {formatCurrency(item.price)}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-300 shrink-0">{formatCurrency(item.qty * item.price)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
                <div className="flex flex-col gap-0.5 text-xs text-zinc-500 min-w-0">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>
                      {order.invoice?.invoiceNumber
                        ? `Invoice ${order.invoice.invoiceNumber}`
                        : canDownloadInvoice(order)
                          ? "Tax invoice — download PDF"
                          : "Invoice available after payment is confirmed"}
                    </span>
                  </div>
                  {order.invoice?.status === "failed" && (
                    <p className="text-amber-400/90 pl-6">PDF had an error earlier — try download again.</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canDownloadInvoice(order) || invoiceLoadingId === order._id}
                  onClick={() => handleInvoiceDownload(order)}
                  className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  {invoiceLoadingId === order._id ? "Preparing…" : "Download invoice"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWishlist = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-zinc-100">My Wishlist</h3>
      {wishlist.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-12 text-center">
          <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">Your wishlist is empty</p>
          <p className="text-zinc-500 text-sm mb-4">Save items you love for later.</p>
          <Button onClick={() => navigate("/shop")} className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
            Explore Products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((product) => (
            <div key={product._id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden group">
              <div className="aspect-[4/3] bg-white/5 overflow-hidden relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Heart className="w-8 h-8 text-zinc-700" /></div>
                )}
                <button
                  onClick={() => handleRemoveFromWishlist(product._id)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-zinc-200 truncate">{product.name}</p>
                {product.category && <p className="text-xs text-zinc-500 mt-0.5">{product.category}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-lg font-bold text-[#D4AF37]">{formatCurrency(product.price)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10" onClick={() => navigate(`/product/${product._id}`)}>
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90" onClick={() => handleMoveToCart(product)}>
                      <ShoppingCart className="w-3 h-3 mr-1" /> Cart
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-xl font-semibold text-zinc-100">Profile & Settings</h3>
      <form onSubmit={handleProfileSave} className="bg-white/[0.03] border border-white/10 rounded-xl p-6 space-y-5">
        {[
          { id: "name", label: "Full Name", type: "text", value: profileForm.name, key: "name" as const },
          { id: "email", label: "Email Address", type: "email", value: profileForm.email, key: "email" as const },
          { id: "phone", label: "Phone Number", type: "tel", value: profileForm.phone, key: "phone" as const },
          { id: "password", label: "New Password", type: "password", value: profileForm.password, key: "password" as const },
        ].map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="text-sm font-medium text-zinc-400 block mb-2">{f.label}</label>
            <Input
              id={f.id}
              type={f.type}
              value={f.value}
              onChange={(e) => setProfileForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.key === "password" ? "Leave blank to keep current" : ""}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/50"
            />
          </div>
        ))}
        <Button type="submit" disabled={profileSaving} className="w-full bg-[#D4AF37] text-black font-semibold hover:bg-[#D4AF37]/90">
          {profileSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </form>
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-zinc-100">My Addresses</h3>
        <Button size="sm" onClick={() => { setEditingAddress(null); setAddressForm({ label: "Home", address: "", city: "", postalCode: "", country: "India", isDefault: false }); setShowAddressForm(true); }} className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
          <Plus className="w-4 h-4 mr-1" /> Add Address
        </Button>
      </div>

      {/* Address form */}
      <AnimatePresence>
        {showAddressForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddressSave}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4 overflow-hidden"
          >
            <h4 className="text-sm font-semibold text-zinc-200">{editingAddress ? "Edit Address" : "New Address"}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Label</label>
                <Input value={addressForm.label} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} placeholder="Home / Office" className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Country</label>
                <Input value={addressForm.country} onChange={e => setAddressForm(f => ({ ...f, country: e.target.value }))} className="bg-white/5 border-white/10 text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Street Address</label>
              <Input value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main Street" className="bg-white/5 border-white/10 text-white text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">City</label>
                <Input value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} className="bg-white/5 border-white/10 text-white text-sm" required />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Postal Code</label>
                <Input value={addressForm.postalCode} onChange={e => setAddressForm(f => ({ ...f, postalCode: e.target.value }))} className="bg-white/5 border-white/10 text-white text-sm" required />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} className="accent-[#D4AF37]" />
              Set as default address
            </label>
            <div className="flex gap-3">
              <Button type="submit" size="sm" className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
                <Save className="w-3 h-3 mr-1" /> {editingAddress ? "Update" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="border-white/10 text-zinc-400 hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Address list */}
      {addresses.length === 0 && !showAddressForm ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <MapPin className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No saved addresses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr._id} className={`bg-white/[0.03] border rounded-xl p-4 relative ${addr.isDefault ? "border-[#D4AF37]/40" : "border-white/10"}`}>
              {addr.isDefault && (
                <Badge className="absolute top-3 right-3 bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30 text-[10px]">Default</Badge>
              )}
              <p className="text-sm font-semibold text-zinc-200">{addr.label}</p>
              <p className="text-sm text-zinc-400 mt-1">{addr.address}</p>
              <p className="text-sm text-zinc-400">{addr.city}, {addr.postalCode}</p>
              <p className="text-xs text-zinc-500">{addr.country}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => startEditAddress(addr)} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDeleteAddress(addr._id)} className="text-xs text-red-400 hover:underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const sections: Record<Section, () => JSX.Element> = {
    overview: renderOverview,
    orders: renderOrders,
    wishlist: renderWishlist,
    profile: renderProfile,
    addresses: renderAddresses,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex gap-6">
          {/* ── Sidebar (desktop) ────────────────────────────────────────── */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-28 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2 border-t border-white/5 mt-2">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* ── Mobile tab bar ───────────────────────────────────────────── */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-around">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                    active ? "text-[#D4AF37]" : "text-zinc-500"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sections[section]()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
