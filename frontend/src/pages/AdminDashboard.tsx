import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard, PackageOpen, ShoppingCart, Users, LogOut,
  Edit, Trash2, Plus, Search, RefreshCw, Eye, X, Save, Loader2,
  Phone, Mail, UserX, ChevronRight, TrendingUp, IndianRupee,
  Package, CheckCircle2, Truck, Clock, AlertCircle, ShieldCheck,
  ImagePlus, XCircle, BarChart3, Download, FileText
} from "lucide-react";
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
  shippingAddress?: { address?: string; city?: string; postalCode?: string; country?: string };
  invoice?: { invoiceNumber?: string; invoiceUrl?: string };
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
  addresses?: any[];
};

type DashStats = {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  latestOrders: AdminOrder[];
};

type Tab = "dashboard" | "products" | "orders" | "users";

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
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

const transitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const sidebarItems: { id: Tab; label: string; icon: any }[] = [
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
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productImagePreview, setProductImagePreview] = useState("");
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
      const res = await api.get("/api/admin/stats");
      setStats(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load stats");
    }
    setStatsLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await api.get("/api/admin/products", { params: { page: 1, limit: 200 } });
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load products");
    }
    setProductsLoading(false);
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("/api/admin/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load orders");
    }
    setOrdersLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/api/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load users");
    }
    setUsersLoading(false);
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
    setProductImageFile(null);
    setProductImageUrl("");
    setProductImagePreview("");
    setShowProductForm(false);
  };

  const startEdit = (p: AdminProduct) => {
    setEditingId(p._id);
    setProductForm({
      name: p.name, price: String(p.price), category: p.category,
      description: p.description, stock: String(p.stock), finishType: p.finishType || "Standard",
    });
    setProductImageUrl(p.image || "");
    setProductImagePreview(p.image || "");
    setProductImageFile(null);
    setShowProductForm(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImageFile(file);
      setProductImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: productForm.name,
        price: Number(productForm.price),
        category: productForm.category,
        description: productForm.description,
        stock: Number(productForm.stock),
        finishType: productForm.finishType,
      };
      if (productImageUrl && !productImageFile) payload.image = productImageUrl;

      let savedProduct: AdminProduct;
      if (editingId) {
        const res = await api.put(`/api/admin/products/${editingId}`, payload);
        savedProduct = res.data;
      } else {
        const res = await api.post(`/api/admin/products`, payload);
        savedProduct = res.data;
      }

      // Upload image file if selected
      if (productImageFile) {
        const fd = new FormData();
        fd.append("productId", savedProduct._id || editingId!);
        fd.append("image", productImageFile);
        await api.post("/api/admin/products/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }

      toast.success(editingId ? "Product updated!" : "Product created!");
      resetProductForm();
      await fetchProducts();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.issues?.[0]?.message || "Failed to save product";
      toast.error(msg);
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      toast.success("Product deleted");
      await fetchProducts();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete");
    }
  };

  // ── Order handlers ────────────────────────────────────────────────────

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/api/admin/orders/${orderId}`, { status });
      toast.success(`Order ${status}`);
      await fetchOrders();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update order");
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      setInvoiceLoadingId(orderId);
      const blob = await downloadAdminInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Invoice is not available yet");
    }
    setInvoiceLoadingId(null);
  };

  // ── User handlers ─────────────────────────────────────────────────────

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This will also delete their orders.`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast.success("User deleted");
      await fetchUsers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete user");
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
              { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, gradient: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20", iconColor: "text-emerald-400" },
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
                      <p className="text-sm font-medium text-zinc-200 truncate">{o.user?.name || "Guest"} — {o.orderItems.map(i => i.name).join(", ")}</p>
                      <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-bold text-zinc-200">₹{o.totalPrice.toLocaleString()}</span>
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
                    <p className="text-xs text-zinc-500">{p.finishType || "Standard"} • {p.ratings || 0}★</p>
                  </div>
                  <span className="text-xs text-zinc-400 truncate">{p.category}</span>
                  <span className="text-sm font-semibold text-zinc-200 text-right">₹{p.price.toLocaleString()}</span>
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
                {/* Image preview */}
                {productImagePreview && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setProductImagePreview(""); setProductImageFile(null); setProductImageUrl(""); }} className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-500/60">
                      <X className="w-3 h-3" />
                    </button>
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
                    <label className="text-xs text-zinc-400 mb-1 block">Price (₹) *</label>
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
                  <label className="text-xs text-zinc-400 mb-1 block">Image URL</label>
                  <Input value={productImageUrl} onChange={e => { setProductImageUrl(e.target.value); setProductImagePreview(e.target.value); }} placeholder="/uploads/img.jpg or https://..." className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Or Upload Image</label>
                  <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-[#D4AF37]/40 cursor-pointer transition-colors bg-white/[0.02]">
                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">{productImageFile ? productImageFile.name : "Choose file..."}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
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
                    <p className="text-lg font-bold text-zinc-100">₹{o.totalPrice.toLocaleString()}</p>
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
                            <span className="text-xs text-zinc-500">×{item.qty}</span>
                            <span className="text-sm font-medium text-zinc-200">₹{(item.price * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      {/* Shipping + Payment */}
                      <div className="grid grid-cols-2 gap-4">
                        {o.shippingAddress && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Shipping</p>
                            <p className="text-sm text-zinc-300">{o.shippingAddress.address}</p>
                            <p className="text-sm text-zinc-400">{o.shippingAddress.city}, {o.shippingAddress.postalCode}</p>
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
                            <p className="text-xs text-zinc-500">Shipping: ₹{o.shippingPrice} | Tax: ₹{o.taxPrice}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <FileText className="w-4 h-4 text-[#D4AF37]" />
                          <span>{o.invoice?.invoiceNumber || "Invoice is generated automatically once payment clears or COD is delivered"}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={invoiceLoadingId === o._id || (!o.invoice?.invoiceUrl && o.paymentStatus !== "paid" && o.status !== "delivered")}
                          onClick={() => handleDownloadInvoice(o._id)}
                          className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {invoiceLoadingId === o._id ? "Preparing..." : "Download Invoice"}
                        </Button>
                      </div>

                      {/* Status transition */}
                      {transitions[o.status]?.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Update Status</p>
                          <div className="flex gap-2">
                            {transitions[o.status].map(s => (
                              <Button
                                key={s}
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(o._id, s)}
                                className={`text-xs ${s === "cancelled" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20" : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/20"}`}
                              >
                                {s === "cancelled" ? <XCircle className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                                Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
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
            <h1 className="text-xl font-bold tracking-wider text-[#D4AF37] font-['Playfair_Display']">VANCA INTERIO</h1>
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
