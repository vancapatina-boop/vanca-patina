import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, PackageOpen, LogOut, Edit, Trash2 } from "lucide-react";
import api from "@/services/api";
import { logoutUser } from "@/services/authService";

type AdminProduct = {
  _id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
  image?: string;
  images?: string[];
};

type AdminOrder = {
  _id: string;
  user?: { name?: string; email?: string; _id?: string };
  orderItems: { name: string; qty: number; price: number }[];
  totalPrice: number;
  status: "processing" | "shipped" | "delivered";
  isPaid: boolean;
  createdAt: string;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Product form
  const emptyProductForm = useMemo(
    () => ({
      name: "",
      price: "",
      category: "",
      description: "",
      stock: "",
    }),
    []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [productActionLoading, setProductActionLoading] = useState(false);
  const [productActionError, setProductActionError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") navigate("/admin/login");
  }, [navigate]);

  const handleLogout = () => {
    void logoutUser().catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await api.get("/api/admin/stats");
      setStats(res.data);
    } catch (e: any) {
      setStatsError(e?.response?.data?.message ?? e?.message ?? "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await api.get("/api/products", { params: { pageNumber: 1, pageSize: 200 } });
      const payload = res.data;
      const list = payload?.products ?? payload ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setProductsError(e?.response?.data?.message ?? e?.message ?? "Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await api.get("/api/admin/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setOrdersError(e?.response?.data?.message ?? e?.message ?? "Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await api.get("/api/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setUsersError(e?.response?.data?.message ?? e?.message ?? "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data on tab activation.
    if (activeTab === "dashboard") void fetchStats();
    if (activeTab === "products") void fetchProducts();
    if (activeTab === "orders") void fetchOrders();
    if (activeTab === "users") void fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const startEdit = (p: AdminProduct) => {
    setEditingId(p._id);
    setProductForm({
      name: p.name ?? "",
      price: String(p.price ?? ""),
      category: p.category ?? "",
      description: p.description ?? "",
      stock: String(p.stock ?? ""),
    });
    setProductImageFile(null);
    setProductImageUrl(p.image ?? "");
    setProductActionError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setProductForm(emptyProductForm);
    setProductImageFile(null);
    setProductImageUrl("");
    setProductActionError(null);
  };

  const maybeUploadImage = async (productId: string) => {
    if (!productImageFile) return;

    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("image", productImageFile);

    const res = await api.post("/api/products/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // Backend updates DB; we just keep going.
    return res.data;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductActionLoading(true);
    setProductActionError(null);

    try {
      const payload = {
        name: productForm.name,
        price: Number(productForm.price),
        category: productForm.category,
        description: productForm.description,
        stock: Number(productForm.stock),
        // URL-based image support (optional)
        image: productImageUrl ? productImageUrl : undefined,
      };

      let saved: AdminProduct;
      if (editingId) {
        const res = await api.put(`/api/products/${editingId}`, payload);
        saved = res.data;
      } else {
        const res = await api.post("/api/products", payload);
        saved = res.data;
      }

      if (productImageFile) {
        await maybeUploadImage(saved._id ?? editingId);
      }

      resetForm();
      await fetchProducts();
    } catch (e: any) {
      setProductActionError(e?.response?.data?.message ?? e?.message ?? "Failed to save product");
    } finally {
      setProductActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    setProductActionError(null);
    setProductActionLoading(true);
    try {
      await api.delete(`/api/products/${id}`);
      await fetchProducts();
    } catch (e: any) {
      setProductActionError(e?.response?.data?.message ?? e?.message ?? "Failed to delete product");
    } finally {
      setProductActionLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: AdminOrder["status"]) => {
    try {
      await api.put(`/api/admin/orders/${orderId}`, { status });
      await fetchOrders();
    } catch (e) {
      setOrdersError((e as any)?.response?.data?.message ?? (e as any)?.message ?? "Failed to update order");
    }
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <aside className="w-64 border-r border-border/50 bg-secondary/20 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-border/50">
          <Link to="/admin/dashboard" className="inline-block">
            <h1 className="text-xl font-bold tracking-wider text-primary font-['Playfair_Display']">
              VANCA INTERIO
            </h1>
            <p className="text-[10px] tracking-[0.3em] text-muted-foreground mt-1 text-center">ADMIN PORTAL</p>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "products"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackageOpen className="h-5 w-5" />
            <span className="font-medium">Products</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "orders"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-medium">Orders</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground shadow-md"
                : "hover:bg-accent/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="font-medium">Users</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-semibold capitalize tracking-tight">{activeTab}</h2>
          <p className="text-muted-foreground mt-1">Manage your catalog, orders & users.</p>
        </header>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsLoading ? (
              <div className="glass-card p-6 col-span-full text-center text-muted-foreground">
                Loading stats...
              </div>
            ) : statsError ? (
              <div className="glass-card p-6 col-span-full text-center text-destructive">
                {statsError}
              </div>
            ) : (
              <>
                <div className="glass-card rounded-2xl p-6 border border-border/50 bg-secondary/10 backdrop-blur-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</p>
                  <p className="text-3xl font-bold text-foreground">₹{Number(stats?.totalRevenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-border/50 bg-secondary/10 backdrop-blur-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Orders</p>
                  <p className="text-3xl font-bold text-foreground">{Number(stats?.totalOrders ?? 0).toLocaleString()}</p>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-border/50 bg-secondary/10 backdrop-blur-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Registered Users</p>
                  <p className="text-3xl font-bold text-foreground">{Number(stats?.totalUsers ?? 0).toLocaleString()}</p>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-border/50 bg-secondary/10 backdrop-blur-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Latest Orders</p>
                  <p className="text-3xl font-bold text-foreground">{Array.isArray(stats?.latestOrders) ? stats.latestOrders.length : 0}</p>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Product Catalog</h3>
                <button onClick={resetForm} className="text-sm text-muted-foreground hover:text-foreground">
                  New Product
                </button>
              </div>

              {productsLoading ? (
                <div className="text-muted-foreground">Loading products...</div>
              ) : productsError ? (
                <div className="text-destructive">{productsError}</div>
              ) : (
                <div className="space-y-3">
                  {products.map((p) => (
                    <div key={p._id} className="p-4 border border-border/50 rounded-lg flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{p.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{p.category} • Stock: {p.stock}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50" onClick={() => startEdit(p)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50" onClick={() => handleDeleteProduct(p._id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-6 h-fit sticky top-24">
              <h3 className="text-xl font-semibold mb-4">{editingId ? "Edit Product" : "Create Product"}</h3>
              {productActionError && <div className="text-destructive text-sm mb-3">{productActionError}</div>}
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <input
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                    value={productForm.name}
                    onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <input
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                    value={productForm.category}
                    onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Price</label>
                    <input
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                      value={productForm.price}
                      onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Stock</label>
                    <input
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                      value={productForm.stock}
                      onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <textarea
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                    value={productForm.description}
                    onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Image URL (optional)</label>
                  <input
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                    value={productImageUrl}
                    onChange={(e) => setProductImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Upload Image File (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 w-full"
                    onChange={(e) => setProductImageFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <button
                  disabled={productActionLoading}
                  type="submit"
                  className="w-full px-6 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all disabled:opacity-60"
                >
                  {productActionLoading ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Orders</h3>
              <button onClick={() => void fetchOrders()} className="text-sm text-muted-foreground hover:text-foreground">
                Refresh
              </button>
            </div>

            {ordersLoading ? (
              <div className="text-muted-foreground">Loading orders...</div>
            ) : ordersError ? (
              <div className="text-destructive">{ordersError}</div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o._id} className="p-4 border border-border/50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order ID: {o._id}</p>
                        <p className="font-semibold">
                          {o.user?.name ?? "Customer"} • Total: ₹{Number(o.totalPrice ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Placed: {new Date(o.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <select
                          className="mt-1 w-full px-2 py-2 rounded-lg bg-secondary border border-border text-foreground"
                          value={o.status}
                          onChange={(e) => void handleUpdateOrderStatus(o._id, e.target.value as any)}
                        >
                          <option value="processing">processing</option>
                          <option value="shipped">shipped</option>
                          <option value="delivered">delivered</option>
                        </select>
                        <p className="text-xs mt-1 text-muted-foreground">{o.isPaid ? "Paid" : "Unpaid"}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {o.orderItems.map((it, idx) => (
                        <p key={`${o._id}-${idx}`} className="text-sm text-muted-foreground">
                          {it.name} × {it.qty} • ₹{Number(it.price ?? 0).toLocaleString()}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Users</h3>
              <button onClick={() => void fetchUsers()} className="text-sm text-muted-foreground hover:text-foreground">
                Refresh
              </button>
            </div>

            {usersLoading ? (
              <div className="text-muted-foreground">Loading users...</div>
            ) : usersError ? (
              <div className="text-destructive">{usersError}</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u._id} className="p-4 border border-border/50 rounded-lg flex justify-between gap-4">
                    <div>
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.role}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
