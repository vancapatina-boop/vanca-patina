import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/services/api";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      console.log("🔐 Admin login attempt:", { email });
      const response = await api.post("/api/auth/admin-login", { email, password });

      localStorage.setItem("token", response.data.token);
      if (response.data.refreshToken) localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("adminName", response.data.name);

      toast.success("Admin login successful!");
      console.log("✅ Admin authenticated");
      navigate("/admin/dashboard");
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Login failed";
      setErrorMsg(message);
      toast.error(message);
      console.error("❌ Admin login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-wider text-primary font-['Playfair_Display']">
              VANCA INTERIO
            </h1>
            <p className="text-xs tracking-[0.3em] text-muted-foreground mt-1">PATINA</p>
          </Link>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-8 border border-accent/20">
          {/* Admin badge */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wide uppercase">
                Admin Portal
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Admin Access</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Authorized personnel only
            </p>
            {errorMsg && (
              <p className="text-sm text-red-500 mt-2 bg-red-100 p-2 rounded-md">
                {errorMsg}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-email" className="text-foreground/80 text-sm">
                Admin Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vancainterio.com"
                  className="pl-10 bg-secondary/50 border-border/50 focus:border-accent/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-password" className="text-foreground/80 text-sm">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-secondary/50 border-border/50 focus:border-accent/50 text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 group"
            >
              Access Dashboard
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
