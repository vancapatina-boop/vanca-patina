import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Unable to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 pt-32 pb-12 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Account Recovery</p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-100">Forgot Password</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Enter your email and we will send a secure password reset link if the account exists.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-[#D4AF37]" />
            <p className="text-xs leading-6 text-zinc-400">
              Reset links expire automatically and are only sent to verified accounts.
            </p>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="text-zinc-300 text-sm font-medium">
              Email Address
            </Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-11 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Remembered your password?{" "}
          <Link to="/login" className="text-[#D4AF37] hover:text-[#f3d368]">
            Go back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
