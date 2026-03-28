import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { OtpInput } from "./OtpInput";

interface OtpStepProps {
  email: string;
  onNext: (otp: string) => void;
  onResend: () => void;
  isLoading: boolean;
  error: string | null;
  canResend: boolean;
  countdown: number;
}

export const OtpStep: React.FC<OtpStepProps> = ({
  email,
  onNext,
  onResend,
  isLoading,
  error,
  canResend,
  countdown,
}) => {
  const [otp, setOtp] = useState("");

  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    const maskedLocal = local.charAt(0) + "*".repeat(Math.max(0, local.length - 2)) + local.slice(-1);
    return `${maskedLocal}@${domain}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      onNext(otp);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-zinc-100 tracking-wide">
          Verify Your Email
        </h2>
        <p className="text-sm text-zinc-400 mt-2 font-light">
          We've sent a 6-digit code to {maskEmail(email)}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
          />

          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-2">Didn't receive the code?</p>
            <Button
              type="button"
              variant="ghost"
              onClick={onResend}
              disabled={!canResend || isLoading}
              className="text-[#D4AF37] hover:text-[#f3d368] disabled:text-zinc-600"
            >
              {canResend ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              ) : (
                `Resend in ${countdown}s`
              )}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full h-12 mt-6 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[#D4AF37]/20 border-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify Code
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};