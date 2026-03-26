import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, PackageOpen, LogOut } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    // Role based protection
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    if (!token || role !== "admin") {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-semibold capitalize tracking-tight">{activeTab}</h2>
          <p className="text-muted-foreground mt-1">Manage your {activeTab} & settings.</p>
        </header>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats Cards - Glassmorphism */}
            {["Total Sales", "Active Orders", "Total Products", "Registered Users"].map(
              (stat, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-6 border border-border/50 bg-secondary/10 backdrop-blur-lg hover:shadow-lg transition-all"
                >
                  <p className="text-sm font-medium text-muted-foreground mb-2">{stat}</p>
                  <p className="text-3xl font-bold text-foreground">
                    {i === 0 ? "$24,500" : i === 1 ? "124" : i === 2 ? "48" : "890"}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        <div className="glass-card rounded-2xl border border-border/50 p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium">Recent {activeTab} Activity</h3>
          </div>
          <div className="text-center text-muted-foreground py-20">
            <p>Data visualization for {activeTab} will appear here.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
