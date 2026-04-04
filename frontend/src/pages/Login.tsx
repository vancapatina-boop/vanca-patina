import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/apiError";

interface LoginProps {
  defaultMode?: "login" | "signup";
}

const getPasswordRules = (password: string) => [
  { label: "8+ characters", passes: password.length >= 8 },
  { label: "Uppercase letter", passes: /[A-Z]/.test(password) },
  { label: "Lowercase letter", passes: /[a-z]/.test(password) },
  { label: "Number", passes: /\d/.test(password) },
  { label: "Special character", passes: /[^A-Za-z0-9]/.test(password) },
];

const Login = ({ defaultMode = "login" }: LoginProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(defaultMode === "signup");
  const [name, setName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => {
    setIsSignup(defaultMode === "signup");
  }, [defaultMode]);

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);
  const passwordScore = passwordRules.filter((rule) => rule.passes).length;
  const passwordsMatch = !isSignup || (confirmPassword.length > 0 && password === confirmPassword);

  const resetMessages = () => {
    setErrorMsg("");
    setInfoMsg("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      if (isSignup) {
        const response = await register({
          name,
          email,
          password,
          confirmPassword,
          acceptTerms,
        });

        navigate(
          `/email-verification?status=pending&message=${encodeURIComponent(
            response.message || "Verification email sent."
          )}&email=${encodeURIComponent(response.email || email)}`
        );
        return;
      }

      await login(email, password);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, "Network error"));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    const nextIsSignup = !isSignup;
    setIsSignup(nextIsSignup);
    setPassword("");
    setConfirmPassword("");
    setAcceptTerms(false);
    resetMessages();
    navigate(nextIsSignup ? "/register" : "/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden px-4 pt-32 pb-12 selection:bg-primary/30">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300">
            <h1 className="text-3xl font-bold tracking-widest text-[#D4AF37] font-display">
              VANCA PATINA
            </h1>
            <p className="text-xs tracking-[0.4em] text-zinc-400 mt-2 uppercase">Patina</p>
          </Link>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-zinc-100 tracking-wide">
                {isSignup ? "Create Your Account" : "Welcome Back"}
              </h2>
              <p className="text-sm text-zinc-400 mt-2 font-light">
                {isSignup
                  ? "Register with email verification and strong password protection."
                  : "Sign in to manage orders, addresses, and project purchases."}
              </p>
              {infoMsg && (
                <p className="text-sm text-emerald-300 mt-3 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                  {infoMsg}
                </p>
              )}
              {errorMsg && (
                <p className="text-sm text-red-400 mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  {errorMsg}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignup && (
                <>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative mt-2">
                      <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="your name"
                        className="h-12 pl-11 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-[#D4AF37]" />
                      <p className="text-xs leading-6 text-zinc-400">
                        New accounts must verify their email before first login. This protects saved addresses, order history, and checkout access.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-11 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                    autoComplete={isSignup ? "email" : "username"}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignup ? "Create a strong password" : "Enter your password"}
                    className="pl-11 pr-11 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {isSignup && (
                <>
                  <div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all ${passwordScore <= 2
                            ? "bg-red-400"
                            : passwordScore <= 4
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                        style={{ width: `${(passwordScore / passwordRules.length) * 100}%` }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {passwordRules.map((rule) => (
                        <div
                          key={rule.label}
                          className={`rounded-lg border px-3 py-2 text-xs ${rule.passes
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-white/10 bg-white/[0.03] text-zinc-500"
                            }`}
                        >
                          {rule.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm font-medium">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="mt-2 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                      autoComplete="new-password"
                      required
                    />
                    {confirmPassword && !passwordsMatch && (
                      <p className="mt-2 text-xs text-red-400">Passwords must match to continue.</p>
                    )}
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#D4AF37]"
                      required
                    />
                    <span className="leading-6">
                      I agree to the{" "}
                      <Link to="/terms-and-conditions" className="text-[#D4AF37] hover:text-[#f3d368]">
                        Terms & Conditions
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy-policy" className="text-[#D4AF37] hover:text-[#f3d368]">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}

              {!isSignup && (
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#D4AF37] hover:text-[#f3d368] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || (isSignup && (!acceptTerms || !passwordsMatch))}
                className="w-full h-12 mt-4 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[#D4AF37]/20 border-0"
              >
                {isLoading ? "Processing..." : isSignup ? "Create Secure Account" : "Access Securely"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4 transition-transform" />}
              </Button>
            </form>

            <p className="text-center text-sm text-zinc-400 mt-8">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={toggleMode}
                className="text-[#D4AF37] hover:text-[#f3d368] font-semibold transition-colors uppercase tracking-wider text-xs ml-1"
              >
                {isSignup ? "Login Instead" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
