import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { EmailStep } from "@/components/auth/EmailStep";
import { OtpStep } from "@/components/auth/OtpStep";
import { PasswordStep } from "@/components/auth/PasswordStep";

type AuthStep = "traditional" | "email" | "otp" | "password";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, sendOtp, verifyOtp, setPassword, isAuthenticated } = useAuth();

  const [authStep, setAuthStep] = useState<AuthStep>("traditional");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPasswordState] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (authStep === "otp" && countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [authStep, countdown, canResend]);

  const handleTraditionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const body = isSignup ? { name, email, password } : { email, password };

    try {
      if (isSignup) {
        await register(body.name, body.email, body.password);
      } else {
        await login(body.email, body.password);
      }

      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || error.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (emailAddress: string) => {
    setIsLoading(true);
    setErrorMsg("");
    setEmail(emailAddress);

    try {
      await sendOtp(emailAddress);
      setAuthStep("otp");
      setCanResend(false);
      setCountdown(30);
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    setIsLoading(true);
    setErrorMsg("");
    setOtp(otpCode);

    try {
      const result = await verifyOtp(email, otpCode);

      if (result.requiresPasswordSetup) {
        setAuthStep("password");
      } else {
        // Login successful
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || error.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (newPassword: string) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      await setPassword(email, otp, newPassword);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || error.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    handleSendOtp(email);
  };

  const switchToOtpFlow = () => {
    setAuthStep("email");
    setErrorMsg("");
  };

  const switchToTraditional = () => {
    setAuthStep("traditional");
    setErrorMsg("");
    setEmail("");
    setOtp("");
    setPasswordState("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden px-4 pt-32 pb-12 selection:bg-primary/30">
      {/* Background decorative elements */}
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
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block hover:scale-105 transition-transform duration-300">
            <h1 className="text-3xl font-bold tracking-widest text-[#D4AF37] font-display">
              VANCA INTERIO
            </h1>
            <p className="text-xs tracking-[0.4em] text-zinc-400 mt-2 uppercase">Patina</p>
          </Link>
        </div>

        {/* Glass card */}
        <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <AnimatePresence mode="wait">
            {authStep === "traditional" && (
              <motion.div
                key="traditional"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold text-zinc-100 tracking-wide">
                    {isSignup ? "Create Account" : "Access Portal"}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-2 font-light">
                    {isSignup
                      ? "Join the world of premium finishes"
                      : "Authenticate to continue"}
                  </p>
                  {errorMsg && (
                    <p className="text-sm text-red-500 mt-2 bg-red-100 p-2 rounded-md">
                      {errorMsg}
                    </p>
                  )}
                </div>

                <form onSubmit={handleTraditionalSubmit} className="space-y-5">
                  {isSignup && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="name" className="text-zinc-300 text-sm font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="mt-2 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                      />
                    </motion.div>
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
                        onChange={(e) => setPasswordState(e.target.value)}
                        placeholder="••••••••"
                        className="pl-11 pr-11 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37]/50 text-white placeholder:text-zinc-600 transition-all focus:bg-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

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
                    disabled={isLoading}
                    className="w-full h-12 mt-4 bg-gradient-to-r from-[#D4AF37] to-[#aa8b2b] text-black font-semibold hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg shadow-[#D4AF37]/20 border-0"
                  >
                    {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Access Securely")}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-8">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="px-4 text-xs font-medium text-zinc-500 tracking-widest uppercase">Or Continue With</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* OTP Login Button */}
                <Button
                  variant="outline"
                  onClick={switchToOtpFlow}
                  className="w-full h-12 bg-white/5 border-white/10 text-white font-medium hover:bg-white/10 transition-all hover:scale-[1.02]"
                >
                  <Mail className="mr-3 h-5 w-5" />
                  Login with Email OTP
                </Button>

                {/* Toggle signup/login */}
                <p className="text-center text-sm text-zinc-400 mt-8">
                  {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-[#D4AF37] hover:text-[#f3d368] font-semibold transition-colors uppercase tracking-wider text-xs ml-1"
                  >
                    {isSignup ? "Login Instead" : "Sign Up"}
                  </button>
                </p>
              </motion.div>
            )}

            {authStep === "email" && (
              <EmailStep
                onNext={handleSendOtp}
                isLoading={isLoading}
                error={errorMsg}
              />
            )}

            {authStep === "otp" && (
              <OtpStep
                email={email}
                onNext={handleVerifyOtp}
                onResend={handleResendOtp}
                isLoading={isLoading}
                error={errorMsg}
                canResend={canResend}
                countdown={countdown}
              />
            )}

            {authStep === "password" && (
              <PasswordStep
                email={email}
                otp={otp}
                onNext={handleSetPassword}
                isLoading={isLoading}
                error={errorMsg}
              />
            )}
          </AnimatePresence>

          {/* Back to traditional login */}
          {(authStep === "email" || authStep === "otp" || authStep === "password") && (
            <div className="text-center mt-6">
              <button
                onClick={switchToTraditional}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Back to password login
              </button>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
