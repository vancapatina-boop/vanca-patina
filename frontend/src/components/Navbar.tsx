import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Search, User, LayoutDashboard, Package, Heart, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch {
      navigate("/");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-gradient-copper">
              VANCA PATINA
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm tracking-wide transition-colors hover:text-primary ${
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-5 text-muted-foreground">
            <Link to="/shop" className="hover:text-primary transition-colors hover:scale-110 duration-300">
              <Search className="w-[1.15rem] h-[1.15rem]" />
            </Link>

            {!isAuthenticated ? (
              <Link to="/login" className="hover:text-primary transition-colors hover:scale-110 duration-300">
                <User className="w-[1.15rem] h-[1.15rem]" />
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none hover:text-primary transition-all hover:scale-110 duration-300">
                  <User className="w-[1.15rem] h-[1.15rem]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-background/95 backdrop-blur-lg border-border/50 mt-2 shadow-xl shadow-black/10">
                  {/* User info header */}
                  <div className="px-3 py-2.5 border-b border-border/30">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 py-2.5 mt-1">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-medium">Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-orders")} className="cursor-pointer gap-2 py-2.5">
                    <Package className="w-4 h-4" />
                    <span className="font-medium">My Orders</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer gap-2 py-2.5">
                    <Heart className="w-4 h-4" />
                    <span className="font-medium">Wishlist</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 py-2.5 text-red-500 focus:text-red-500 focus:bg-red-500/10 dark:focus:bg-red-500/10">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Link to="/cart" className="relative hover:text-primary transition-colors hover:scale-110 duration-300">
              <ShoppingBag className="w-[1.15rem] h-[1.15rem]" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-[1.125rem] h-[1.125rem] rounded-full gradient-copper flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="md:hidden hover:text-primary transition-colors hover:scale-110 duration-300 ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-lg transition-colors ${
                    location.pathname === link.to ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-lg text-muted-foreground hover:text-foreground transition-colors">
                    My Dashboard
                  </Link>
                  <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="text-lg text-red-500 text-left">
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
