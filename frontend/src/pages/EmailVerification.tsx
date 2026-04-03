import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/services/authService";

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "success";
  const message =
    searchParams.get("message") ||
    (status === "success"
      ? "Your email has been verified. You can now log in."
      : status === "pending"
        ? "Check your inbox to verify your email and activate your account."
        : "This verification link is invalid or has expired.");
  const email = searchParams.get("email") || "";

  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setError("We could not detect your email address from the verification link.");
      return;
    }

    setIsResending(true);
    setError("");

    try {
      const response = await resendVerificationEmail(email);
      setFeedback(response.message || "A new verification email has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Unable to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  const isSuccess = status === "success";
  const isPending = status === "pending";

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 pt-32 pb-16 text-white">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 sm:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 text-[#D4AF37]">
          {isSuccess ? <CheckCircle2 className="h-10 w-10" /> : isPending ? <Mail className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Account Security</p>
            <h1 className="text-3xl font-semibold text-zinc-100">
              {isSuccess ? "Email Verified" : isPending ? "Check Your Email" : "Verification Failed"}
            </h1>
          </div>
        </div>

        <p className="mt-6 text-base leading-7 text-zinc-300">{message}</p>

        {email && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <Mail className="h-4 w-4 text-[#D4AF37]" />
              <span>{email}</span>
            </div>
          </div>
        )}

        {feedback && (
          <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {feedback}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 flex-1 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black hover:opacity-90">
            <Link to={isPending ? "/register" : "/login"}>{isPending ? "Back to Sign Up" : "Go to Login"}</Link>
          </Button>

          {!isSuccess && email && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={isResending}
              className="h-11 flex-1 border-[#D4AF37]/30 bg-transparent text-[#f2d27c] hover:bg-[#D4AF37]/10 hover:text-[#f7de9c]"
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
              {isResending ? "Sending..." : "Resend Email"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
