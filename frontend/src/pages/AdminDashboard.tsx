import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  LayoutDashboard, PackageOpen, ShoppingCart, Users, LogOut,
  Edit, Trash2, Plus, Search, RefreshCw, Eye, X, Save, Loader2,
  Phone, Mail, UserX, ChevronRight, TrendingUp, IndianRupee,
  Package, CheckCircle2, Truck, Clock, AlertCircle, ShieldCheck,
  ImagePlus, XCircle, BarChart3, Download, FileText
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";
import { logoutUser } from "@/services/authService";
import { downloadAdminInvoice } from "@/services/ordersService";

// ─── Types ──────────────────────────────────────────────────────────────────

type AdminProduct = {
  _id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
  image?: string;
  images?: string[];
  finishType?: string;
  ratings?: number;
  numReviews?: number;
};

type AdminOrder = {
  _id: string;
  orderId?: string;
  user?: { name?: string; email?: string; _id?: string };
  orderItems: { name: string; qty: number; price: number; image?: string }[];
  totalPrice: number;
  itemsPrice?: number;
  taxPrice?: number;
  shippingPrice?: number;
  status: string;
  isPaid: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  paidAt?: string;
  createdAt: string;
  shippingAddress?: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  invoice?: { invoiceNumber?: string; invoiceUrl?: string; status?: string };
};

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  addresses?: AdminAddress[];
};

type DashStats = {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  latestOrders: AdminOrder[];
};

type Tab = "dashboard" | "products" | "orders" | "users";
type AdminAddress = {
  _id?: string;
  label?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; icon: LucideIcon; label: string }> = {
  pending:    { color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",   icon: Clock,        label: "Pending" },
  confirmed:  { color: "text-sky-400",     bg: "bg-sky-400/10 border-sky-400/20",       icon: ShieldCheck,  label: "Confirmed" },
  processing: { color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20",     icon: Package,      label: "Processing" },
  shipped:    { color: "text-purple-400",   bg: "bg-purple-400/10 border-purple-400/20", icon: Truck,        label: "Shipped" },
  delivered:  { color: "text-emerald-400",  bg: "bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2, label: "Delivered" },
  cancelled:  { color: "text-red-400",      bg: "bg-red-400/10 border-red-400/20",       icon: XCircle,      label: "Cancelled" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] || statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

/** Must match backend `updateOrderStatus` transitions (fulfillment pipeline). */
const transitions: Record<string, string[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "shipped", "delivered", "cancelled"],
  processing: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const transitionActionLabel: Record<string, string> = {
  confirmed: "Confirm payment received",
  processing: "Start processing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

function orderIsPaid(o: AdminOrder) {
  return o.paymentStatus === "paid" || o.isPaid === true;
}

function canDownloadInvoice(o: AdminOrder) {
  if (o.status === "cancelled" && !orderIsPaid(o)) return false;
  return orderIsPaid(o) || o.status === "delivered";
}

const sidebarItems: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: PackageOpen },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "users", label: "Users", icon: Users },
];

// ─── Main Component ─────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Dashboard stats
  const [stats, setStats] = useState<DashStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Products
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Orders
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Product form
  const emptyForm = useMemo(() => ({
    name: "", price: "", category: "", description: "", stock: "", finishType: "Standard",
  }), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyForm);
  // Multi-image support
  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") navigate("/admin/login");
  }, [navigate]);

  // ── API calls ─────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load stats"));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await api.get("/admin/products", { params: { page: 1, limit: 200 } });
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load products"));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("/admin/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load orders"));
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load users"));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "products") fetchProducts();
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "users") fetchUsers();
  }, [activeTab, fetchStats, fetchProducts, fetchOrders, fetchUsers]);

  // ── Product handlers ──────────────────────────────────────────────────

  const resetProductForm = () => {
    setEditingId(null);
    setProductForm(emptyForm);
    setProductImageFiles([]);
    setProductImagePreviews([]);
    setProductImageUrl("");
    setShowProductForm(false);
  };

  const startEdit = (p: AdminProduct) => {
    setEditingId(p._id);
    setProductForm({
      name: p.name, price: String(p.price), category: p.category,
      description: p.description, stock: String(p.stock), finishType: p.finishType || "Standard",
    });
    // Pre-populate existing images from DB
    const existingImgs = [p.image, ...(p.images || [])].filter((v, i, a) => v && a.indexOf(v) === i) as string[];
    setProductImageUrl(existingImgs[0] || "");
    setProductImagePreviews(existingImgs);
    setProductImageFiles([]);
    setShowProductForm(true);
  };

  const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setProductImageFiles(prev => [...prev, ...files]);
    setProductImagePreviews(prev => [...prev, ...newPreviews]);
    // reset input so same file can be re-added if needed
    e.target.value = "";
  };

  const removeImagePreview = (index: number) => {
    setProductImageFiles(prev => prev.filter((_, i) => i !== index));
    setProductImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: {
        name: string;
        price: number;
        category: string;
        description: string;
        stock: number;
        finishType: string;
        image?: string;
      } = {
        name: productForm.name,
        price: Number(productForm.price),
        category: productForm.category,
        description: productForm.description,
        stock: Number(productForm.stock),
        finishType: productForm.finishType,
      };
      // Use URL field if no file is selected and no existing previews
      if (productImageUrl && productImageFiles.length === 0 && productImagePreviews.length === 0) {
        payload.image = productImageUrl;
      }

      let savedProduct: AdminProduct;
      if (editingId) {
        const res = await api.put(`/admin/products/${editingId}`, payload);
        savedProduct = res.data;
      } else {
        const res = await api.post("/admin/products", payload);
        savedProduct = res.data;
      }

      // Upload all selected image files one by one
      if (productImageFiles.length > 0) {
        for (const file of productImageFiles) {
          const fd = new FormData();
          fd.append("productId", savedProduct._id || editingId!);
          fd.append("image", file);
          await api.post("/admin/products/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
      }

      toast.success(editingId ? "Product updated!" : "Product created!");
      resetProductForm();
      await fetchProducts();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to save product"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success("Product deleted");
      await fetchProducts();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete"));
    }
  };

  // ── Order handlers ────────────────────────────────────────────────────

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (status === "cancelled" && !confirm("Cancel this order? Stock will be restored for items that were not already shipped or delivered.")) {
      return;
    }
    try {
      setStatusUpdatingId(orderId);
      await api.put(`/admin/orders/${orderId}`, { status });
      toast.success(`Order updated: ${statusConfig[status]?.label || status}`);
      await fetchOrders();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update order"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDownloadInvoice = async (order: AdminOrder) => {
    const orderId = order._id;
    try {
      setInvoiceLoadingId(orderId);
      const blob = await downloadAdminInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const invNo = order.invoice?.invoiceNumber?.replace(/[^\w-]+/g, "_") || order.orderId?.replace(/[^\w-]+/g, "_") || orderId.slice(-8);
      link.download = `Invoice_${invNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Invoice is not available yet"));
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  // ── User handlers ─────────────────────────────────────────────────────

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This will also delete their orders.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("User deleted");
      await fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete user"));
    }
  };

  const handleLogout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("adminName");
    navigate("/admin/login");
  };

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ────────────────────────────────────────────────────────────────────────
  // RENDER SECTIONS
  // ────────────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: IndianRupee, gradient: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconColor: "text-emerald-400" },
              { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, gradient: "from-blue-500/20 to-blue-600/5 border-blue-500/20", iconColor: "text-blue-400" },
              { label: "Total Products", value: stats.totalProducts, icon: PackageOpen, gradient: "from-purple-500/20 to-purple-600/5 border-purple-500/20", iconColor: "text-purple-400" },
              { label: "Registered Users", value: stats.totalUsers, icon: Users, gradient: "from-amber-500/20 to-amber-600/5 border-amber-500/20", iconColor: "text-amber-400" },
            ].map((card) => (
              <div key={card.label} className={`bg-gradient-to-br ${card.gradient} border rounded-xl p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                </div>
                <p className="text-2xl font-bold text-zinc-100">{card.value}</p>
                <p className="text-xs text-zinc-400 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4AF37]" /> Recent Orders
              </h3>
              <button onClick={() => setActiveTab("orders")} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {stats.latestOrders.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.latestOrders.map((o) => (
                  <div key={o._id} className="flex items-center justify-between gap-4 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{o.user?.name || "Guest"} - {o.orderItems.map(i => i.name).join(", ")}</p>
                      <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-bold text-zinc-200">{formatCurrency(o.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
          />
        </div>
        <Button onClick={() => { resetProductForm(); setShowProductForm(true); }} className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90">
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
        <Button variant="outline" size="icon" onClick={() => fetchProducts()} className="border-white/10 text-zinc-400 hover:bg-white/5">
          <RefreshCw className={`w-4 h-4 ${productsLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Product List */}
        <div className={`${showProductForm ? "xl:col-span-2" : "xl:col-span-3"} space-y-2`}>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
              <PackageOpen className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">{productSearch ? "No products match your search" : "No products yet"}</p>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_100px_80px_90px_80px] gap-4 px-4 py-3 bg-white/[0.02] border-b border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span className="w-12">Image</span>
                <span>Product</span>
                <span>Category</span>
                <span className="text-right">Price</span>
                <span className="text-center">Stock</span>
                <span className="text-center">Actions</span>
              </div>
              {filteredProducts.map((p) => (
                <div key={p._id} className={`grid grid-cols-[auto_1fr_100px_80px_90px_80px] gap-4 px-4 py-3 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors ${editingId === p._id ? "bg-[#D4AF37]/5" : ""}`}>
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><PackageOpen className="w-4 h-4 text-zinc-600" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.finishType || "Standard"} | Rating {p.ratings || 0}</p>
                  </div>
                  <span className="text-xs text-zinc-400 truncate">{p.category}</span>
                  <span className="text-sm font-semibold text-zinc-200 text-right">{formatCurrency(p.price)}</span>
                  <div className="text-center">
                    <Badge className={`text-[10px] ${p.stock > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-[#D4AF37]/10 text-zinc-400 hover:text-[#D4AF37] transition-colors" title="Edit">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteProduct(p._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Form */}
        <AnimatePresence>
          {showProductForm && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5 h-fit sticky top-24"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {editingId ? "Edit Product" : "New Product"}
                </h3>
                <button onClick={resetProductForm} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3">
                {/* Multi-image previews */}
                {productImagePreviews.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1.5">{productImagePreviews.length} image{productImagePreviews.length > 1 ? "s" : ""} selected</p>
                    <div className="grid grid-cols-3 gap-2">
                      {productImagePreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                          <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImagePreview(idx)}
                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 text-[9px] bg-[#D4AF37]/80 text-black font-bold px-1 rounded">MAIN</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
                  <Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Category *</label>
                  <Input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} required className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Price (INR) *</label>
                    <Input type="number" min="0" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} required className="bg-white/5 border-white/10 text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Stock *</label>
                    <Input type="number" min="0" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))} required className="bg-white/5 border-white/10 text-white text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Finish Type</label>
                  <select value={productForm.finishType} onChange={e => setProductForm(f => ({ ...f, finishType: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                    <option value="Standard">Standard</option>
                    <option value="Matte">Matte</option>
                    <option value="Glossy">Glossy</option>
                    <option value="Satin">Satin</option>
                    <option value="Antique">Antique</option>
                    <option value="Brushed">Brushed</option>
                    <option value="Polished">Polished</option>
                    <option value="Textured">Textured</option>
                    <option value="Metallic">Metallic</option>
                    <option value="Clear Coat">Clear Coat</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Description *</label>
                  <textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={3} required className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Image URL (optional)</label>
                  <Input value={productImageUrl} onChange={e => setProductImageUrl(e.target.value)} placeholder="https://... or /uploads/img.jpg" className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5 block">
                    <ImagePlus className="w-3.5 h-3.5" /> Upload Photos
                    <span className="text-zinc-600">(select multiple)</span>
                  </label>
                  <label className="flex flex-col items-center gap-2 px-3 py-4 rounded-lg border-2 border-dashed border-white/20 hover:border-[#D4AF37]/50 cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04]">
                    <ImagePlus className="w-6 h-6 text-zinc-500" />
                    <span className="text-xs text-zinc-500 text-center">
                      Click to add photos<br />
                      <span className="text-zinc-600">You can add multiple files - each click adds more</span>
                    </span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageFilesChange} />
                  </label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving} className="flex-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingId ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetProductForm} className="border-white/10 text-zinc-400 hover:bg-white/5">
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(f => (
          <button
            key={f}
            onClick={() => setOrderFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              orderFilter === f
                ? "bg-[#D4AF37] text-black"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && <span className="ml-1 opacity-70">({orders.filter(o => o.status === f).length})</span>}
          </button>
        ))}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => fetchOrders()} className="border-white/10 text-zinc-400 hover:bg-white/5">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${ordersLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {ordersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <ShoppingCart className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">{orderFilter === "all" ? "No orders yet" : `No ${orderFilter} orders`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(o => (
            <div key={o._id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              {/* Order header */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpandedOrder(expandedOrder === o._id ? null : o._id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">#{(o.orderId || o._id).slice(-12).toUpperCase()}</p>
                    <p className="text-sm font-medium text-zinc-200">{o.user?.name || "Guest"}</p>
                    <p className="text-xs text-zinc-500">{o.user?.email || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-100">{formatCurrency(o.totalPrice)}</p>
                    <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${expandedOrder === o._id ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedOrder === o._id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 space-y-4 bg-white/[0.01]">
                      {/* Items */}
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Items</p>
                        {o.orderItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                            <div className="w-10 h-10 rounded bg-white/5 overflow-hidden shrink-0">
                              {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-zinc-600 m-auto mt-3" />}
                            </div>
                            <span className="text-sm text-zinc-300 flex-1">{item.name}</span>
                            <span className="text-xs text-zinc-500">Qty: {item.qty}</span>
                            <span className="text-sm font-medium text-zinc-200">{formatCurrency(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Shipping + Payment */}
                      <div className="grid grid-cols-2 gap-4">
                        {o.shippingAddress && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Ship to</p>
                            {o.shippingAddress.fullName && (
                              <p className="text-sm font-medium text-zinc-200">{o.shippingAddress.fullName}</p>
                            )}
                            <p className="text-sm text-zinc-300">
                              {o.shippingAddress.address1 || o.shippingAddress.address || "—"}
                              {o.shippingAddress.address2 ? `, ${o.shippingAddress.address2}` : ""}
                            </p>
                            <p className="text-sm text-zinc-400">
                              {[o.shippingAddress.city, o.shippingAddress.state].filter(Boolean).join(", ")}
                              {o.shippingAddress.postalCode ? ` ${o.shippingAddress.postalCode}` : ""}
                            </p>
                            {o.shippingAddress.country && (
                              <p className="text-xs text-zinc-500">{o.shippingAddress.country}</p>
                            )}
                            {(o.shippingAddress.phoneNumber || o.shippingAddress.email) && (
                              <p className="text-xs text-zinc-500 mt-1">
                                {o.shippingAddress.phoneNumber && <span>{o.shippingAddress.phoneNumber}</span>}
                                {o.shippingAddress.phoneNumber && o.shippingAddress.email && <span> · </span>}
                                {o.shippingAddress.email && <span>{o.shippingAddress.email}</span>}
                              </p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Payment</p>
                          <p className="text-sm text-zinc-300">
                            {o.paymentMethod || "N/A"} | {o.paymentStatus || (o.isPaid ? "paid" : "pending")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {o.isPaid ? `Paid ${o.paidAt ? `on ${new Date(o.paidAt).toLocaleDateString()}` : ""}` : "Awaiting payment"}
                          </p>
                          {o.shippingPrice !== undefined && (
                            <p className="text-xs text-zinc-500">Shipping: {formatCurrency(o.shippingPrice ?? 0)} | Tax: {formatCurrency(o.taxPrice ?? 0)}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex flex-col gap-0.5 text-sm text-zinc-400 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#D4AF37] shrink-0" />
                            <span className="font-medium text-zinc-300">
                              {o.invoice?.invoiceNumber
                                ? `Invoice ${o.invoice.invoiceNumber}`
                                : orderIsPaid(o)
                                  ? "Tax invoice — PDF will generate on download if missing"
                                  : "Invoice available after payment is confirmed"}
                            </span>
                          </div>
                          {o.invoice?.status === "failed" && (
                            <p className="text-xs text-amber-400/90 pl-6">PDF generation had an error; try download again or check server logs.</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            invoiceLoadingId === o._id ||
                            !canDownloadInvoice(o)
                          }
                          onClick={() => handleDownloadInvoice(o)}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {invoiceLoadingId === o._id ? "Preparing…" : "Download invoice (PDF)"}
                        </Button>
                      </div>

                      {/* Status transition */}
                      {transitions[o.status]?.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Fulfillment — update status</p>
                          <p className="text-[11px] text-zinc-600 mb-2">
                            Typical flow: confirmed → processing → shipped → delivered (or skip steps if your process allows).
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {transitions[o.status].map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                disabled={statusUpdatingId === o._id}
                                onClick={() => handleUpdateOrderStatus(o._id, s)}
                                className={`text-xs ${
                                  s === "cancelled"
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
                                    : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/20"
                                }`}
                              >
                                {s === "cancelled" ? <XCircle className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                                {transitionActionLabel[s] || `Mark as ${s}`}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
          />
        </div>
        <Badge className="bg-white/5 text-zinc-400 border-white/10">{users.length} users</Badge>
        <Button variant="outline" size="icon" onClick={() => fetchUsers()} className="border-white/10 text-zinc-400 hover:bg-white/5">
          <RefreshCw className={`w-4 h-4 ${usersLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">{userSearch ? "No users match your search" : "No users yet"}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_180px_80px_100px_140px] gap-4 px-4 py-3 bg-white/[0.02] border-b border-white/5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            <span>User</span>
            <span>Joined</span>
            <span className="text-center">Role</span>
            <span className="text-center">Status</span>
            <span className="text-center">Actions</span>
          </div>
          {filteredUsers.map(u => (
            <div key={u._id} className="grid grid-cols-[1fr_180px_80px_100px_140px] gap-4 px-4 py-3 items-center border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{u.name}</p>
                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                {u.phone && <p className="text-xs text-zinc-500">{u.phone}</p>}
              </div>
              <span className="text-xs text-zinc-400">{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              <div className="text-center">
                <Badge className={`text-[10px] ${u.role === "admin" ? "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20" : "bg-white/5 text-zinc-400 border-white/10"}`}>
                  {u.role === "admin" ? <><ShieldCheck className="w-3 h-3 mr-1" /> Admin</> : "User"}
                </Badge>
              </div>
              <div className="text-center">
                <Badge className={`text-[10px] ${u.isBlocked ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                  {u.isBlocked ? "Blocked" : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-center gap-1">
                {/* Call */}
                {u.phone && (
                  <a href={`tel:${u.phone}`} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 transition-colors" title={`Call ${u.phone}`}>
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                {/* Email */}
                <a href={`mailto:${u.email}`} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-zinc-400 hover:text-blue-400 transition-colors" title={`Email ${u.email}`}>
                  <Mail className="w-3.5 h-3.5" />
                </a>
                {/* Delete (only non-admin) */}
                {u.role !== "admin" && (
                  <button onClick={() => handleDeleteUser(u._id, u.email)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors" title="Delete user">
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const sections: Record<Tab, () => JSX.Element> = {
    dashboard: renderDashboard,
    products: renderProducts,
    orders: renderOrders,
    users: renderUsers,
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex text-zinc-200 pt-20 lg:pt-24">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-white/[0.02]">
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="inline-block">
            <h1 className="text-xl font-bold tracking-wider text-[#D4AF37] font-['Playfair_Display']">VANCA PATINA</h1>
            <p className="text-[10px] tracking-[0.3em] text-zinc-500 mt-1 text-center">ADMIN PORTAL</p>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{localStorage.getItem("adminName") || "Admin"}</p>
              <p className="text-[10px] text-zinc-500">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile nav ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-around">
        {sidebarItems.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                active ? "text-[#D4AF37]" : "text-zinc-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 pt-2 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-100 capitalize">{activeTab}</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Manage your catalog, orders & users</p>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {sections[activeTab]()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
