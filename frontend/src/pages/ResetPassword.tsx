import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/services/authService";

const getPasswordRules = (password: string) => [
  { label: "8+ characters", passes: password.length >= 8 },
  { label: "Uppercase", passes: /[A-Z]/.test(password) },
  { label: "Lowercase", passes: /[a-z]/.test(password) },
  { label: "Number", passes: /\d/.test(password) },
  { label: "Special", passes: /[^A-Za-z0-9]/.test(password) },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rules = useMemo(() => getPasswordRules(password), [password]);
  const isStrongPassword = rules.every((rule) => rule.passes);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is invalid or incomplete.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword(token, password, confirmPassword);
      setMessage(response.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 pt-32 pb-12 text-white">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Account Recovery</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-100">Create a New Password</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Choose a strong new password for {email || "your account"}.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-[#D4AF37]" />
            <p className="text-xs leading-6 text-zinc-400">
              Resetting your password invalidates older sessions so only the new credentials remain active.
            </p>
          </div>
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <Label htmlFor="password" className="text-zinc-300 text-sm font-medium">
              New Password
            </Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-11 pr-11 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600"
                placeholder="Enter a strong password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {rules.map((rule) => (
              <div
                key={rule.label}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  rule.passes
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-500"
                }`}
              >
                {rule.label}
              </div>
            ))}
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
              className="mt-2 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-2 text-xs text-red-400">Passwords must match.</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isStrongPassword || password !== confirmPassword}
            className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90"
          >
            {isSubmitting ? "Updating..." : "Reset Password"}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Need to sign in instead?{" "}
          <Link to="/login" className="text-[#D4AF37] hover:text-[#f3d368]">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
