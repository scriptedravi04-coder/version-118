import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import YbexLogo from "../../components/layout/YbexLogo";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/storage";
import { Eye, EyeOff } from "lucide-react";

// USP data for sliding/fade effect
const USPS = [
  {
    title: "Where Creators",
    coloredTitle: "Get Chosen",
    desc: "Join India's premium influencer marketing platform. Connect with top brands and grow your career.",
    stats: [
      { num: "786+", text: "Creators" },
      { num: "87+", text: "Brands" },
      { num: "₹27 Lac+", text: "Paid Out" }
    ]
  },
  {
    title: "Instant UGC Video",
    coloredTitle: "Within 24 Hours",
    desc: "Seamless video delivery on-demand. Post requirements and get high-quality original videos delivered instantly.",
    stats: [
      { num: "24h", text: "Turnaround" },
      { num: "100%", text: "In-house backup" },
      { num: "Zero", text: "Hassle" }
    ]
  },
  {
    title: "Complete Deal Log",
    coloredTitle: "No Hidden Fees",
    desc: "Enjoy transparent price negotiations, live contract statuses, secure chats, and end-to-end milestone releases.",
    stats: [
      { num: "0%", text: "Upfront Fee" },
      { num: "Secure", text: "Payments" },
      { num: "Instant", text: "Contracts" }
    ]
  }
];

export default function Login() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(params.get("role") || "creator"); // tab selection: 'creator' or 'brand'
  const { user, login, refreshUser, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleBypassLogin = async (token, bypassRole, targetPath) => {
    const toastId = toast.loading(`Bypassing login (${bypassRole.toUpperCase()})...`);
    try {
      safeStorage.setItem("ybex_token", token);
      const { data } = await api.get("auth/me", { bypassCache: true });
      if (data && (data.user || data.user_id)) {
        const loggedUser = data.user || data;
        safeStorage.setItem("ybex_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
        toast.success(`Bypassed login (${bypassRole.toUpperCase()} Mode)`, { id: toastId });
        navigate(targetPath);
      } else {
        throw new Error("Could not fetch user details");
      }
    } catch (err) {
      console.error("Bypass login failed:", err);
      toast.error("Bypass login failed. Please try again.", { id: toastId });
    }
  };

  // Sliding slide state
  const [slideIdx, setSlideIdx] = useState(0);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(user.onboarded || user.onboarding_completed || user.onboarding_complete ? "/dashboard" : "/onboarding");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % USPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && result.requiresVerification) {
        toast.error("Please verify your email to log in.");
        navigate(`/verify-email?email=${encodeURIComponent(email)}&role=${role}`);
        return;
      }
      const user = result;
      toast.success("Welcome back!");
      navigate(user.onboarded || user.onboarding_completed || user.onboarding_complete ? "/dashboard" : "/onboarding");
    } catch (err) {
      console.error("Login catch error:", err, err.response?.data);
      const data = err.response?.data || {};
      const errorCode = data.code;
      if (errorCode === "ACCOUNT_DELETED" || errorCode === "ACCOUNT_BANNED" || errorCode === "ACCOUNT_SUSPENDED") {
        navigate("/account-status", { 
          state: { 
            status: errorCode, 
            message: data.detail || data.error,
            user_id: data.user_id,
            role: data.role
          } 
        });
      } else {
        toast.error(data.detail || data.error || err.message || "Login failed");
      }
    } finally { setLoading(false); }
  };

  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/google/url", { bypassCache: true });
      if (res.data && res.data.url) {
        const width = 500;
        const height = 600;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);
        const popup = window.open(res.data.url, "GoogleAuth", `width=${width},height=${height},top=${top},left=${left}`);

        if (!popup) {
          toast.error("Please allow popups to sign in with Google");
          setLoading(false);
          return;
        }

        const handleMessage = async (event) => {
          if (event.data?.type === 'OAUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            const { token, supabaseSession } = event.data;
            safeStorage.setItem("ybex_token", token);
            try {
               const { data } = await api.get("auth/me", { bypassCache: true });
               const loggedUser = data.user || data;
               safeStorage.setItem("ybex_user", JSON.stringify(loggedUser));
               setUser(loggedUser);
               toast.success("Welcome back!");
               navigate(loggedUser.onboarded || loggedUser.onboarding_completed || loggedUser.onboarding_complete ? "/dashboard" : "/onboarding");
            } catch (err) {
               toast.error("Failed to load profile");
               setLoading(false);
            }
          } else if (event.data?.type === 'OAUTH_FAILURE') {
            window.removeEventListener('message', handleMessage);
            toast.error("Google Login failed");
            setLoading(false);
          }
        };
        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
          }
        }, 1000);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to initiate Google Login");
      setLoading(false);
    }
  };


  const activeUSP = USPS[slideIdx];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--bg-base)] text-[var(--text-primary)]" data-testid="login-page">
      {/* LEFT PANEL — Smooth horizontal gradient blending into deep black, wider span — Hidden on mobile / tablet for clean auth flow */}
      <section className="hidden lg:flex lg:col-span-7 bg-gradient-to-b lg:bg-gradient-to-r from-card via-background to-background p-10 md:p-14 flex-col justify-between relative overflow-hidden min-h-[50vh] lg:min-h-screen">
        {/* Subtle grid background accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Ambient colored blobs to smooth out different container vibes */}
        <div className="absolute bottom-1/4 -left-10 w-[450px] h-[450px] bg-[var(--violet)]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-10 right-10 w-[350px] h-[350px] bg-[var(--violet)]/4 rounded-full blur-[100px] pointer-events-none" />

        {/* USP Slideshow container */}
        <div className="my-auto py-12 z-10 max-w-xl relative min-h-[360px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={slideIdx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full"
            >
              <h2 className="font-display text-4xl sm:text-5xl lg:text-5xl xl:text-6xl text-[var(--text-primary)] leading-tight font-bold tracking-tight">
                {activeUSP.title} <br />
                <span className="text-[var(--violet)] font-black">{activeUSP.coloredTitle}</span>
              </h2>
              <p className="text-[var(--text-primary)] mt-6 text-base sm:text-lg lg:text-xl leading-relaxed font-medium">
                {activeUSP.desc}
              </p>

              {/* Stats list */}
              <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6 items-start">
                {activeUSP.stats?.map((stat, sId) => (
                  <div key={sId} className="flex flex-col">
                    <div className="font-display font-black text-2xl sm:text-3xl lg:text-3xl xl:text-4xl text-[var(--violet)] whitespace-nowrap tracking-tight" data-testid={`stat-num-${sId}`}>
                      {stat.num}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--text-primary)]/60 font-bold uppercase tracking-wider mt-2 whitespace-nowrap" data-testid={`stat-lbl-${sId}`}>
                      {stat.text}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom copyright */}
        <div className="text-xs text-[var(--text-primary)]/30 font-semibold z-10 uppercase tracking-widest select-none pt-4 border-t border-foreground/5">
          2026 Ybex Media. All rights reserved.
        </div>
      </section>

      {/* RIGHT PANEL — Clean, spacious login screen matching mockup form spacing — Compact & centered for mobile */}
      <section className="lg:col-span-5 flex flex-col justify-center items-center px-6 sm:px-12 md:px-16 lg:px-24 bg-[var(--bg-base)] min-h-screen overflow-y-auto pt-24 pb-12">
        <div className="w-full max-w-sm sm:max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] font-bold tracking-tight">Welcome back</h1>
            <p className="text-[var(--text-primary)]/60 mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium">Sign in to continue to your dashboard</p>
          </div>


          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">Email</label>
              <input
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-foreground/10 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.01)]"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60">Password</label>
                <Link to="/forgot-password" className="text-[10px] sm:text-xs text-[var(--violet)] font-bold hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl pl-3 pr-10 py-2.5 sm:pl-4 sm:pr-12 sm:py-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-foreground/10 transition-all shadow-[inset_0_1px_2px_rgba(255,255,255,0.01)]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full mt-2.5 sm:mt-3 py-2.5 sm:py-3 bg-[var(--violet)] text-white font-semibold text-xs sm:text-sm rounded-xl hover:bg-[#6849E0] shadow-[0_4px_16px_rgba(124,92,255,0.3)] hover:shadow-[0_4px_20px_rgba(124,92,255,0.45)] transform active:scale-[0.99] transition-all flex items-center justify-center gap-2 duration-150 cursor-pointer"
            >
              {loading ? "Signing In..." : "Sign In →"}
            </button>
          </form>
          <div className="flex items-center gap-4 my-4 sm:my-5">
            <div className="flex-1 h-px bg-foreground/10"></div>
            <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)] font-black tracking-widest uppercase">OR CONTINUE WITH</span>
            <div className="flex-1 h-px bg-foreground/10"></div>
          </div>
          <div className="mt-4 sm:mt-5 mb-4 sm:mb-5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-white text-[var(--text-primary)] border border-[var(--border-strong)] font-semibold text-xs sm:text-sm rounded-xl hover:bg-foreground/5 shadow-sm transform active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {loading ? (
                 <div className="w-5 h-5 border-2 border-[var(--violet)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>
          </div>


          <div className="flex items-center gap-4 my-4 sm:my-6">
            <div className="flex-1 h-px bg-foreground/10"></div>
            <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)] font-black tracking-widest uppercase">Quick Demo Access</span>
            <div className="flex-1 h-px bg-foreground/10"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleBypassLogin("dev_bypass", "creator", "/dashboard");
              }}
              className="w-full bg-[var(--violet)]/10 border border-[var(--violet)]/20 py-2 sm:py-2.5 text-xs font-bold text-[var(--violet)] hover:bg-[var(--violet)]/20 transition-all rounded-xl shadow-sm text-center cursor-pointer"
            >
              Creator Demo
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleBypassLogin("dev_bypass_brand", "brand", "/dashboard");
              }}
              className="w-full bg-[var(--violet-soft)] border border-[var(--violet-border)] py-2 sm:py-2.5 text-xs font-bold text-[var(--violet)] hover:bg-[var(--violet)]/20 transition-all rounded-xl shadow-sm text-center cursor-pointer"
            >
              Brand Demo
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleBypassLogin("dev_bypass_admin", "admin", "/admin");
              }}
              className="w-full col-span-2 bg-[#EF4444]/10 border border-[#EF4444]/20 py-2 sm:py-2.5 text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/20 transition-all rounded-xl shadow-sm text-center cursor-pointer"
            >
              Admin Demo (Super Admin)
            </button>
          </div>



          <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-[var(--text-primary)]/60 font-medium">
            Don't have an account?{" "}
            <Link to={`/signup?role=${role}`} className="text-[var(--violet)] font-black hover:underline animate-pulse">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
