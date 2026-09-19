import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { safeStorage } from "../../utils/storage";
import { useOnboardingStore } from "../../store/useOnboardingStore";

export default function PreStep_EmailVerify({ user: propUser }: { user?: any }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser, setUser, refreshUser, logout } = useAuth();
  const { setStep } = useOnboardingStore();

  const currentUser = propUser || authUser;
  const emailParam = searchParams.get("email") || "";
  const roleParam = searchParams.get("role") || currentUser?.role || "creator";
  const targetEmail = currentUser?.email || emailParam || "";

  const [otpSent, setOtpSent] = useState<boolean>(true); // Default to showing verification box since code was issued on signup
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(60);
  const [shake, setShake] = useState<boolean>(false);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (otpSent && inputs.current[0]) {
      inputs.current[0]?.focus();
    }
  }, [otpSent]);

  const handleSendOTP = async () => {
    if (!targetEmail) {
      toast.error("Email address is required.");
      return;
    }
    setLoading(true);
    try {
      await api.post("auth/resend-verification-otp", { email: targetEmail });
      setOtpSent(true);
      setCooldown(60);
      toast.success("Verification code sent! Please check your email inbox.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("auth/verify-email", { email: targetEmail, otp: code });
      if (data && data.success) {
        if (data.token) {
          safeStorage.setItem("ybex_token", data.token);
        }
        if (data.user) {
          safeStorage.setItem("ybex_user", JSON.stringify(data.user));
          setUser(data.user);
        }
        try { await refreshUser(); } catch(e){}

        toast.success("Email verified successfully!");
        setStep(1);
        if (window.location.pathname.includes("/verify-email")) {
          navigate(`/onboarding?role=${roleParam}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(err.response?.data?.detail || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal.length > 1) {
      const digits = rawVal.slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      inputs.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = rawVal;
    setOtp(newOtp);

    if (rawVal && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const digits = pastedData.split("");
      const newOtp = ["", "", "", "", "", ""];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length - 1, 5);
      inputs.current[nextIdx]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const maskedEmail = targetEmail ? targetEmail.replace(
    /(.{2})(.*)(?=@)/,
    (_gp0: string, gp1: string, gp3: string) => {
      return gp1 + "*".repeat(Math.max(3, gp3.length));
    },
  ) : "your email";

  return (
    <div className="w-full flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
          Check your inbox
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8 mt-2">
          We sent a 6-digit verification code to{" "}
          <strong className="font-semibold text-[var(--text-primary)]">{maskedEmail}</strong>
        </p>
        

        {!otpSent ? (
          <button
            onClick={handleSendOTP}
            disabled={loading}
            className="w-full bg-[#3B82F6] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#2563EB] transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            Send OTP
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: shake ? [-10, 10, -10, 10, 0] : 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="flex justify-between gap-2 sm:gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onPaste={handlePaste}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/20 shadow-md outline-none text-slate-900 dark:text-white transition-all"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.join("").length < 6}
              className="w-full bg-[#7C3AED] text-white font-bold py-3.5 px-4 rounded-xl hover:bg-[#6D28D9] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : null}
              Verify Email
            </button>

            <div className="text-center text-sm mt-4">
              <span className="text-[var(--text-secondary)]">Didn't receive the code? </span>
              {cooldown > 0 ? (
                <span className="text-[var(--text-tertiary)] font-medium">Resend in {cooldown}s</span>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="text-[#7C3AED] font-semibold hover:underline transition"
                >
                  Resend now
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs text-[var(--text-secondary)]">
                Wrong email address or need to start over?{" "}
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.href = "/login";
                  }}
                  className="font-bold text-[#7C3AED] hover:underline inline-flex items-center gap-1 transition ml-1"
                >
                  <LogOut size={12} /> Log out / Switch account
                </button>
              </p>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#FFFBF0] dark:bg-amber-900/20 border border-[#FDE68A] dark:border-amber-700/50 text-xs text-slate-800 dark:text-slate-200 font-medium space-y-2 shadow-sm">
              <p className="flex items-center gap-1.5 font-bold text-[#D97706] dark:text-amber-400">
                <span>📬</span> Check your Spam / Junk or Promotions folder
              </p>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                Emails sent via Resend from <strong className="font-semibold text-slate-900 dark:text-white">noreply@ybexmedia.in</strong> often go directly to Gmail's <strong className="underline">Spam</strong> or <strong className="underline">Promotions</strong> tab.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
