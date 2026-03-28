import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface EmailStepProps {
  onNext: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const EmailStep: React.FC<EmailStepProps> = ({ onNext, isLoading, error }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onNext(email.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-zinc-100 tracking-wide">
          Enter Your Email
        </h2>
        <p className="text-sm text-zinc-400 mt-2 font-light">
          We'll send you a verification code
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isLoading}
              className="pl-11 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full h-12 mt-6 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[#D4AF37]/20 border-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending OTP...
            </>
          ) : (
            <>
              Send Verification Code
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
};