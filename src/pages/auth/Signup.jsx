import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import MobileWelcome from "../../components/Onboarding/mobile/MobileWelcome";
import YbexLogo from "../../components/layout/YbexLogo";
import { supabase } from "../../lib/supabase";

import { api } from "../../lib/api";
import { safeStorage } from "../../utils/storage";
import TrustBadge from "../../components/common/TrustBadge";
import { ShieldCheck, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { COUNTRY_CODES } from "../../lib/constants";



// USP data for sliding/fade effect
const USPS = [
  {
    title: "Start Collaborating",
    coloredTitle: "Direct & Free",
    desc: "Join India's most innovative brand and creator ecosystem with dynamic, hidden optimization margins. Protect your true rates.",
    stats: [
      { num: "100%", text: "Transparent Deals" },
      { num: "Instant", text: "Onboarding" },
      { num: "Secure", text: "Escrow release" }
    ]
  },
  {
    title: "Deliver Instant Videos",
    coloredTitle: "In Under 24 Hours",
    desc: "Got rapid content requests? Sign up, claim high-priority orders, record your UGC videos, and get paid instantly within the chat workspace.",
    stats: [
      { num: "24h", text: "Standard" },
      { num: "15h", text: "In-house SLA" },
      { num: "Top", text: "Revenue Split" }
    ]
  },
  {
    title: "Secure Privacy Shield",
    coloredTitle: "No Off-Platform Leak",
    desc: "We guard personal contact data, filter out external details dynamically, negotiate directly, and secure payments so you never lose control.",
    stats: [
      { num: "100%", text: "Privacy Protected" },
      { num: "Zero", text: "Direct fee" },
      { num: "Instant", text: "Live Support" }
    ]
  }
];

export default function Signup() {
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(params.get("role") || "creator"); // matching role choice
  const refCode = params.get("ref") || params.get("referral_code") || "";
  const { user, signup, refreshUser, setUser, loading: authLoading } = useAuth();


  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showMobileWelcome, setShowMobileWelcome] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Sliding slide state
  const [slideIdx, setSlideIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % USPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate(user.onboarded || user.onboarding_completed || user.onboarding_complete ? "/dashboard" : "/onboarding");
    }
  }, [user, authLoading, navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms) {
       toast.error("You must agree to the Terms of Service & Privacy Policy");
       return;
    }

    // Validate Mobile Number
    const cleanPhone = phone.replace(/\D/g, "");
    if (countryCode === "+91") {
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        toast.error("Please enter a valid 10-digit mobile number (starting with 6, 7, 8, or 9)");
        return;
      }
    } else {
      if (cleanPhone.length < 6 || cleanPhone.length > 15) {
        toast.error("Please enter a valid mobile number");
        return;
      }
    }

    setLoading(true);
    try {
      const formattedPhone = `${countryCode}${cleanPhone}`;
      const res = await signup(name, email, password, role, formattedPhone, refCode);

      if (res && res.requiresVerification) {
        toast.success("Account created! Please check your email inbox for the verification code.");
        navigate(`/verify-email?email=${encodeURIComponent(email)}&role=${role}`);
      } else {
        toast.success("Account created!");
        navigate(`/onboarding?role=${role}`);
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.detail || "Signup failed");
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
               toast.success("Account created successfully!");
               navigate(loggedUser.onboarded || loggedUser.onboarding_completed || loggedUser.onboarding_complete ? "/dashboard" : "/onboarding");
            } catch (err) {
               toast.error("Failed to load profile");
               setLoading(false);
            }
          } else if (event.data?.type === 'OAUTH_FAILURE') {
            window.removeEventListener('message', handleMessage);
            toast.error("Google Signup failed");
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
      toast.error(err.response?.data?.error || "Failed to initiate Google Signup");
      setLoading(false);
    }
  };


  const activeUSP = USPS[slideIdx];

  if (isMobile && showMobileWelcome) {
    return (
      <MobileWelcome
        role={role}
        setRole={setRole}
        onEmailSignup={() => setShowMobileWelcome(false)}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--bg-base)] text-[var(--text-primary)]" data-testid="signup-page">
      {/* LEFT PANEL — Smooth horizontal gradient blending into deep black, wider span — Hidden on mobile / tablet for clean auth flow */}
      <section className="hidden lg:flex lg:col-span-7 bg-gradient-to-b lg:bg-gradient-to-r from-card via-background to-background p-10 md:p-14 flex-col justify-between relative overflow-hidden min-h-[50vh] lg:min-h-screen">
        {/* Subtle grid background accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Ambient colored blobs to smooth out different container vibes */}
        <div className="absolute bottom-1/4 -left-10 w-[450px] h-[450px] bg-[var(--violet)]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-10 right-10 w-[350px] h-[350px] bg-[var(--violet)]/4 rounded-full blur-[100px] pointer-events-none" />

        {/* USP container */}
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
              <div className="mt-8 grid grid-cols-3 gap-6">
                {activeUSP.stats?.map((stat, sId) => (
                  <div key={sId}>
                    <div className="font-display font-black text-3xl sm:text-4xl lg:text-4xl xl:text-5xl text-[var(--violet)]" data-testid={`stat-num-${sId}`}>
                      {stat.num}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--text-primary)]/60 font-bold uppercase tracking-wider mt-2" data-testid={`stat-lbl-${sId}`}>
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

      {/* RIGHT PANEL — Clean, spacious signup screen matching mockup spacing — Compact & centered for mobile */}
      <section className="lg:col-span-5 flex flex-col justify-center items-center px-6 sm:px-12 md:px-16 lg:px-24 bg-[var(--bg-base)] min-h-screen overflow-y-auto pt-24 pb-12">
        <div className="w-full max-w-sm sm:max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-4 text-center sm:text-left">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] font-bold tracking-tight">Create your account</h1>
            <p className="text-[var(--text-primary)]/60 mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium">Start collaborating with India&apos;s premium brand network.</p>
          </div>

          {/* Selector Tabs matching login role choices */}
          <div className="p-1 bg-foreground/5 border border-[var(--border-default)] rounded-xl grid grid-cols-2 gap-1 mb-5 sm:mb-6">
            <button
              onClick={() => setRole("creator")}
              type="button"
              className={`py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${role === "creator" ? "bg-[var(--violet)] text-white shadow-md shadow-[var(--violet)]/20" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              👤 Creator
            </button>
            <button
              onClick={() => setRole("brand")}
              type="button"
              className={`py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${role === "brand" ? "bg-[var(--violet)] text-white shadow-md shadow-[var(--violet)]/20" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              🏢 Brand / Agency
            </button>
          </div>




          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">First Name</label>
                <input
                  data-testid="signup-first-name"
                  type="text"
                  required
                  value={name.split(" ")[0] || ""}
                  onChange={(e) => {
                    const lastName = name.split(" ").slice(1).join(" ");
                    setName(`${e.target.value} ${lastName}`.trim());
                  }}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-background transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">Last Name</label>
                <input
                  data-testid="signup-last-name"
                  type="text"
                  required
                  value={name.split(" ").slice(1).join(" ") || ""}
                  onChange={(e) => {
                    const firstName = name.split(" ")[0] || "";
                    setName(`${firstName} ${e.target.value}`.trim());
                  }}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-background transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">Email</label>
              <input
                data-testid="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-background transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">Mobile Number</label>
              <div className="flex items-center gap-2">
                <select
                  data-testid="signup-country-code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-foreground/10 border border-[var(--border-default)] px-2.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[var(--text-primary)] shrink-0 outline-none focus:border-[var(--violet)] cursor-pointer"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.country} value={c.code} className="bg-[var(--bg-elevated)] text-[var(--text-primary)] font-sans">
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  data-testid="signup-phone"
                  type="tel"
                  required
                  maxLength={countryCode === "+91" ? 10 : 15}
                  value={phone}
                  onChange={(e) => {
                    const maxLen = countryCode === "+91" ? 10 : 15;
                    const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                    setPhone(digits);
                  }}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-background transition-all font-mono tracking-wider font-bold"
                  placeholder={countryCode === "+91" ? "9876543210" : "Mobile number"}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] sm:text-xs uppercase tracking-widest font-black text-[var(--text-primary)]/60 block mb-1 sm:mb-1.5">Password</label>
              <div className="relative">
                <input
                  data-testid="signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl pl-3 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-2.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--violet)]/20 focus:bg-background transition-all"
                  placeholder="Create a password"
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
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">Must be at least 8 characters</p>
            </div>

            <label htmlFor="terms" className="flex items-center gap-2.5 mt-3 cursor-pointer select-none group">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all duration-150 ${
                  agreeTerms
                    ? "bg-[var(--violet)] border-[var(--violet)] text-white shadow-xs"
                    : "bg-foreground/5 border-foreground/20 group-hover:border-foreground/40"
                }`}
              >
                {agreeTerms && (
                  <svg className="w-2.5 h-2.5 text-white stroke-[3.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                id="terms"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="sr-only"
              />
              <span className="text-xs text-[var(--text-primary)]/70 leading-none">
                I agree to the <a href="/terms" onClick={(e) => e.stopPropagation()} className="text-[var(--violet)] font-semibold hover:underline">Terms of Service</a> and <a href="/privacy" onClick={(e) => e.stopPropagation()} className="text-[var(--violet)] font-semibold hover:underline">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              data-testid="signup-submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 sm:py-3 bg-[var(--violet)] text-white font-semibold text-xs sm:text-sm rounded-xl hover:bg-[#6849E0] shadow-[0_4px_16px_rgba(124,92,255,0.3)] hover:shadow-[0_4px_20px_rgba(124,92,255,0.45)] transform active:scale-[0.99] transition-all flex items-center justify-center gap-2 duration-150 cursor-pointer"
            >
              {loading ? "Creating..." : "Create Account →"}
            </button>
          </form>
          <div className="flex items-center gap-4 my-3">
            <div className="flex-1 h-px bg-foreground/10"></div>
            <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)] font-black tracking-widest uppercase">OR CONTINUE WITH</span>
            <div className="flex-1 h-px bg-foreground/10"></div>
          </div>
          <div className="mt-3 mb-3">
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


          <p className="mt-4 text-center text-xs sm:text-sm text-[var(--text-primary)]/60 font-semibold">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--violet)] font-black hover:underline animate-pulse">
              Log in
            </Link>
          </p>
          
          
        </div>
      </section>
    </div>
  );
}
