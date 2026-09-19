/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TrustStrip from "../../components/common/TrustStrip";
import BrandGridSection from "../../components/landing/BrandGridSection";
import ExclusiveBentoSection from "../../components/landing/ExclusiveBentoSection";
import ReviewsSection from "../../components/landing/ReviewsSection";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import YbexLogo from "../../components/layout/YbexLogo";
import {
  ArrowRight, IndianRupee, TrendingUp, Map, Shield, Search, Handshake, LineChart,
  Bell, Award, Trophy, Medal, Instagram, Facebook, Youtube, Linkedin,
  Play, Check, ChevronDown, Wand2, MessageSquare, Flame, CheckCircle2, ShieldCheck,
  Zap, Video, Sliders, Users, FileText, ArrowUpRight, Film, Clapperboard
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ creators: "140K+", cities: "500+", categories: "25+", collabs: "10K+" });

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.team_role === 'sub_admin') {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get("creators").then(({data}) => {
      if (Array.isArray(data) && data.length) {
        setStats((s) => ({ ...s, creators: `${data.length}+ Demo · 140K+ Target` }));
      }
    }).catch(()=>{});
  }, []);

  return (
    <div className="text-[var(--text-primary)] bg-[var(--bg-base)] min-h-screen selection:bg-[var(--violet)] selection:text-white" data-testid="landing-page">
      <Hero />
      <StatsBar />
      <BrandGridSection />
      <ExclusiveBentoSection />
      <ReviewsSection />
      <PerformanceRankShowcase />
      <FaqSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}

/* ====================== LIVE NETWORK TICKER ====================== */
function LiveActivityPill() {
  const [events, setEvents] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get("creators").catch(() => ({ data: [] })),
      api.get("campaigns").catch(() => ({ data: [] }))
    ]).then(([creatorsRes, campaignsRes]) => {
      const list = [
        { text: "⚡ Ravi Sharma just registered from Delhi!", type: "register" },
        { text: "🔥 New Campaign: Titan launched 'Ultimate Sportswear Drive'", type: "campaign" },
        { text: "🤝 Ananya just got selected for Nykaa's Summer Glowup Reel", type: "collab" },
        { text: "🔒 Escrow Locked: ₹35,000 net secured in neutral Ybex escrow", type: "escrow" },
        { text: "✅ Karan received ₹35,000 payout with 0% platform cuts!", type: "payment" }
      ];

      setEvents(list);
    }).catch(() => {
      setEvents([
        { text: "⚡ Ravi Sharma just registered from Delhi!", type: "register" },
        { text: "🔥 New Campaign: Titan launched 'Ultimate Sportswear Drive'", type: "campaign" },
        { text: "🤝 Ananya just got selected for Nykaa's Summer Glowup Reel", type: "collab" },
        { text: "🔒 Escrow Locked: ₹35,000 net secured in neutral Ybex escrow", type: "escrow" },
        { text: "✅ Karan received ₹35,000 payout with 0% platform cuts!", type: "payment" }
      ]);
    });
  }, []);

  useEffect(() => {
    if (!events.length) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [events]);

  if (!events.length) return null;

  const activeEvent = events[index];

  return (
    <div className="h-10 flex items-center justify-center relative select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--violet-border)] text-xs font-semibold text-[var(--text-primary)] shadow-sm max-w-lg truncate"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="truncate">{activeEvent.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* Official Social Media SVG Brand Logos */
function YoutubeLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/>
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF"/>
    </svg>
  );
}

function InstagramLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <radialGradient id="ig-grad-hero" cx="30%" cy="107%" r="125%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="100%" stopColor="#285AEB" />
      </radialGradient>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad-hero)" />
      <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm5.25-8.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z" fill="#FFFFFF" />
    </svg>
  );
}

function LinkedinLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

function FacebookLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function MetaLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0668E1">
      <path d="M16.82 5.04c-1.57 0-3.04.82-4.82 2.76-1.78-1.94-3.25-2.76-4.82-2.76C3.96 5.04 1.5 7.6 1.5 11.23c0 4.27 3.47 7.73 7.02 7.73 2.02 0 3.73-.89 5.48-2.91 1.75 2.02 3.46 2.91 5.48 2.91 3.55 0 7.02-3.46 7.02-7.73 0-3.63-2.46-6.19-5.68-6.19zm-9.8 11.66c-2.46 0-4.78-2.39-4.78-5.47 0-2.41 1.57-4.14 3.78-4.14 1.09 0 2.19.64 3.58 2.18-1.12 2.58-1.99 5.01-2.58 7.43zm9.8 0c-.59-2.42-1.46-4.85-2.58-7.43 1.39-1.54 2.49-2.18 3.58-2.18 2.21 0 3.78 1.73 3.78 4.14 0 3.08-2.32 5.47-4.78 5.47z"/>
    </svg>
  );
}

function WhatsappLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 2.137.672 4.116 1.82 5.74L2.05 22l4.417-1.725A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm.052 16.5c-1.815 0-3.52-.524-4.966-1.43l-.356-.226-2.624 1.025.962-2.463-.255-.386A7.95 7.95 0 013.95 12c0-4.44 3.612-8.05 8.102-8.05 4.49 0 8.102 3.61 8.102 8.05 0 4.44-3.612 8.05-8.102 8.05zm4.439-6.046c-.244-.122-1.442-.712-1.666-.793-.224-.082-.387-.122-.55.122-.163.244-.631.793-.773.956-.143.163-.285.184-.529.061-.244-.122-1.031-.38-1.964-1.212-.726-.648-1.217-1.448-1.36-1.692-.142-.244-.015-.377.107-.498.11-.11.244-.285.366-.428.122-.143.163-.244.244-.407.082-.163.041-.305-.02-.428-.061-.122-.55-1.324-.753-1.813-.198-.476-.399-.412-.55-.42l-.468-.008c-.163 0-.428.061-.652.305-.224.244-.855.835-.855 2.037 0 1.202.875 2.362.997 2.525.122.163 1.723 2.631 4.174 3.689.583.252 1.038.403 1.393.516.586.186 1.119.16 1.54.098.47-.07 1.442-.59 1.646-1.161.204-.57.204-1.059.143-1.161-.061-.102-.224-.184-.468-.306z" fill="#25D366"/>
    </svg>
  );
}

function MojLogoSvg() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#FF2E63" />
      <path d="M8 17V7l9 5-9 5z" fill="#FFFFFF" />
    </svg>
  );
}

/* ====================== HERO SECTION (MINIMAL REDESIGN WITH ORBITING PLATFORMS & 4 CORE CARDS) ====================== */
function Hero() {
  const [budgetVal, setBudgetVal] = useState(50000);

  // Dynamic calculations for 0% Commission Guarantee
  const traditionalAgencyFee = Math.round(budgetVal * 0.20);
  const ybexFee = 0;
  const netSaved = traditionalAgencyFee - ybexFee;

  return (
    <section className="relative pt-10 sm:pt-14 pb-16 md:pb-20 overflow-hidden bg-[var(--bg-base)]">
      
      {/* 1. Dotted Network Matrix Background Pattern & Light Ambient Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* SVG Dot Matrix Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-30" width="100%" height="100%">
          <defs>
            <pattern id="dot-grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" className="fill-[var(--violet)]/40" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-pattern)" />
        </svg>

        {/* Ambient Light Orbs using native violet color */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[var(--violet-glow)] blur-[120px]" />
        <div className="absolute top-48 left-10 w-[300px] h-[300px] rounded-full bg-[var(--violet)]/10 blur-[100px]" />
        <div className="absolute top-48 right-10 w-[300px] h-[300px] rounded-full bg-[var(--violet)]/10 blur-[100px]" />
      </div>

      <div className="relative max-w-none px-4 sm:px-6 lg:px-8 z-10">
        
        {/* ================= HERO CENTER CONTENT ================= */}
        <div className="max-w-4xl mx-auto text-center relative z-20">

          {/* Live Activity Ticker Signal */}
          <div className="mb-6">
            <LiveActivityPill />
          </div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display tracking-tight text-center"
          >
            <span className="block text-[var(--text-primary)] font-extrabold text-2xl sm:text-4xl md:text-[50px] -mb-1 sm:-mb-2.5">
              Connect Directly
            </span>
            <span className="block bg-gradient-to-r from-[var(--violet)] via-[#9F62FF] to-[var(--violet)] bg-clip-text text-transparent font-extrabold text-3xl sm:text-5xl md:text-[67px] md:leading-[92.5px] -mb-2 sm:-mb-3.5">
              With India's Top
            </span>
            <span className="block bg-gradient-to-r from-[var(--violet)] via-[#9F62FF] to-[var(--violet)] bg-clip-text text-transparent font-extrabold text-3xl sm:text-6xl md:text-[74px] md:leading-[1.1]">
              Creators & Brands
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed font-normal"
          >
            Direct connections. Transparent rates. Zero commission.
          </motion.p>

          {/* Main CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-col items-center justify-center gap-3"
          >
            <Link
              to="/signup"
              data-testid="hero-primary-cta"
              className="btn-primary text-sm !px-8 !py-4 !rounded-full shadow-lg"
            >
              <span>Get Started for Free</span>
              <ArrowRight size={18} />
            </Link>

            <span className="text-xs font-medium text-[var(--text-tertiary)]">
              No Insta login needed.
            </span>
          </motion.div>

          {/* Trust & Security Badge Banner using auto-rotating TrustStrip */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-6"
          >
            <TrustStrip compact={true} />
          </motion.div>

        </div>

      </div>

      {/* ================= INTERACTIVE 0% COMMISSION CALCULATOR ================= */}
      <div className="max-w-6xl mx-auto mt-16 px-4 sm:px-6 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative p-6 sm:p-10 rounded-3xl bg-white border border-gray-200/80 shadow-xl overflow-hidden"
        >
          {/* Header Banner - Clean Inline Ybex Logo */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#0A0A0A] font-extrabold flex items-center flex-wrap gap-x-2">
                <span>See how much money you <span className="text-[#7C3AED]">save with</span></span>
                <YbexLogo className="h-7 sm:h-8 lg:h-9 text-[#0A0A0A] inline-block align-middle" />
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] max-w-sm font-normal leading-relaxed md:text-right">
              Traditional agencies take a 15% – 25% cut on every deal. Ybex connects brands & creators directly with <strong className="text-[#0A0A0A] font-semibold">₹0 platform commission</strong>.
            </p>
          </div>

          {/* Clean 2-Column Layout Without Nested Sub-Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Side: Budget Slider & Quick Select (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Monthly Influencer Budget
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0A0A0A]">
                    ₹{budgetVal.toLocaleString('en-IN')}
                    <span className="text-xs font-medium text-[#9CA3AF] ml-1">/ month</span>
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="10000"
                  max="500000"
                  step="5000"
                  value={budgetVal}
                  onChange={(e) => setBudgetVal(Number(e.target.value))}
                  className="w-full h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                />

                <div className="flex justify-between text-[11px] font-semibold text-[#9CA3AF] mt-1.5">
                  <span>₹10,000</span>
                  <span>₹2,50,000</span>
                  <span>₹5,00,000</span>
                </div>
              </div>

              {/* Quick Select Presets - Minimal Pills */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-[#6B7280] font-medium mr-1">Quick Select:</span>
                {[25000, 50000, 100000, 250000, 500000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBudgetVal(preset)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      budgetVal === preset
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"
                    }`}
                  >
                    ₹{(preset / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              {/* Clean Minimal Breakdown Rows - No Sub-Boxes */}
              <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#6B7280]">
                  <span>Traditional Agency Cut (20%)</span>
                  <span className="font-semibold text-rose-600">-₹{traditionalAgencyFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[#6B7280]">
                  <span>Ybex Platform Fee (0%)</span>
                  <span className="font-semibold text-[#7C3AED]">₹0</span>
                </div>
              </div>

            </div>

            {/* Right Side: Sleek Savings Display & CTA (5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#F5F0FF] to-emerald-50/50 p-6 sm:p-8 rounded-2xl border border-[#DDD6FE]/60 text-center flex flex-col justify-between space-y-6">
              
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
                  Your Direct Monthly Savings
                </span>
                
                <div className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight mt-1">
                  +₹{netSaved.toLocaleString('en-IN')}
                </div>
                
                <p className="text-xs font-medium text-[#6B7280] mt-2">
                  Saves <strong className="text-[#0A0A0A] font-semibold">₹{(netSaved * 12).toLocaleString('en-IN')}</strong> every year by eliminating agency cuts.
                </p>
              </div>

              <Link
                to="/signup"
                className="w-full py-3.5 px-6 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold shadow-sm transition-all text-center block"
              >
                Claim 0% Commission
              </Link>

            </div>

          </div>
        </motion.div>
      </div>

    </section>
  );
}

/* ====================== STATS BAR ====================== */
function StatsBar() {
  const items = [
    { n: "140K+", l: "Verified Creators" },
    { n: "500+", l: "Indian Cities Covered" },
    { n: "25+", l: "Niche Categories" },
    { n: "10K+", l: "Brand Collaborations" },
  ];
  return (
    <section className="relative border-y border-[var(--border-default)] bg-[var(--bg-surface)] z-10" data-testid="stats-bar">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {items?.map((s, i) => (
          <motion.div key={s.l} className={i >= 2 ? "hidden md:block" : ""} initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.07, duration:0.4}}>
            <div className="font-display text-3xl md:text-4xl tracking-tight text-[var(--violet)]">{s.n}</div>
            <div className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-1">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ====================== WHAT MAKES YBEX DIFFERENT ====================== */

/* ====================== PERFORMANCE RANK SHOWCASE ====================== */
function PerformanceRankShowcase() {
  return (
    <section className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="performance-showcase">
      <div className="card-elevated p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="pill pill-violet">
              <Trophy size={14} /> Performance Score 9.8/10
            </span>
            <h2 className="font-display text-3xl md:text-5xl mt-6 tracking-tight text-[var(--text-primary)]">
              Ranked Creators. Proven ROI.
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 text-sm md:text-base leading-relaxed">
              Ybex algorithms evaluate content engagement, audience quality, and post-campaign conversion metrics. Work only with high-performing creators.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/creators" className="btn-primary text-xs !py-3 !px-6">
                Browse Top Ranked Creators
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { rank: "#1", name: "Ravi Sharma", score: "9.9", niche: "Tech & Gadgets", city: "Delhi", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" },
              { rank: "#2", name: "Ananya Iyer", score: "9.8", niche: "Beauty & Fashion", city: "Bangalore", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" },
              { rank: "#3", name: "Karan Bajaj", score: "9.7", niche: "Fitness & Wellness", city: "Mumbai", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80" }
            ].map((c) => (
              <div key={c.rank} className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-[var(--violet)] text-sm w-6">{c.rank}</span>
                  <img src={c.img} className="w-10 h-10 rounded-full object-cover" alt={c.name} />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">{c.name}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{c.niche} • {c.city}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-black text-emerald-600">{c.score}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--text-tertiary)]">ROI Rating</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== FREQUENTLY ASKED QUESTIONS (FAQ) ====================== */
const FAQ_ITEMS = [
  {
    id: 1,
    question: "What is YBEX?",
    answer: "YBEX is an open influencer marketing platform connecting Indian brands directly with 140K+ verified creators — transparent rate cards, AI-matched briefs, and escrow-protected payments. No agency middlemen."
  },
  {
    id: 2,
    question: "Is YBEX an agency or a marketplace?",
    answer: "YBEX isn't an agency — it's an open marketplace. Brands and creators discover each other directly and negotiate deals themselves; YBEX just handles verification, matching, and secure payments."
  },
  {
    id: 3,
    question: "Do creators need to pay to join YBEX?",
    answer: "No. Creators join for free — verify KYC, build your profile, and start receiving brand collab requests."
  },
  {
    id: 4,
    question: "How does YBEX verify creators and brands?",
    answer: "Every creator completes KYC (PAN + Aadhaar + bank/UPI details) before they can transact on the platform. On top of that, our team manually reviews each creator's Instagram profile — cross-checking their follower count, engagement, and content quality against what's submitted — so brands only see genuine, verified creators, not inflated numbers. Brands verify with GST + PAN + a proof document."
  },
  {
    id: 5,
    question: "How do you make sure creator numbers aren't fake?",
    answer: "Our team manually verifies each creator's Instagram data — followers, reach, and engagement — before they go live on the platform. If something looks inflated or inconsistent, we flag it. Brands only see creators who've passed this check."
  },
  {
    id: 6,
    question: "How does payment/escrow work?",
    answer: "Brand campaign budgets are locked in escrow upfront. Funds are released to the creator only after the deliverable is submitted and approved — so both sides are protected.",
    pendingNote: "{{PENDING: confirm commission model text}}"
  },
  {
    id: 7,
    question: "Do I need to connect my Instagram account?",
    answer: "No OAuth connection needed right now — during onboarding you manually add your Instagram handle along with your follower count, average reach, and views. This helps brands find the right fit for their briefs."
  },
  {
    id: 8,
    question: "Is my data/payment safe on YBEX?",
    answer: "Yes — escrow-protected payments, KYC-gated access, and verified rate cards mean no fake profiles or payment disputes."
  },
  {
    id: 9,
    question: "Can I use YBEX if I already work with an agency?",
    answer: "Yes — YBEX doesn't replace your existing relationships, it just gives you a direct channel to more brands without a cut."
  }
];

function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 md:py-24" data-testid="faq-section" id="faq">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        {/* Eyebrow label pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F0FF] border border-[#DDD6FE] mb-4">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#7C3AED]">
            FREQUENTLY ASKED QUESTIONS
          </span>
        </div>

        {/* Headline */}
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0A0A0A] tracking-tight leading-tight">
          Everything You Need to Know About Us.
        </h2>

        {/* Subtext */}
        <p className="mt-3 text-sm sm:text-base text-[#6B7280] font-normal leading-relaxed">
          Straight answers about YBEX — verification, payments, and how it all works.
        </p>
      </div>

      {/* Accordion Container - Open border list style */}
      <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.id} className="py-2 transition-colors">
              <button
                type="button"
                onClick={() => toggleAccordion(index)}
                className="w-full text-left py-4 sm:py-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none group"
                aria-expanded={isOpen}
              >
                <span className={`font-semibold text-base sm:text-lg transition-colors leading-snug ${
                  isOpen ? "text-[#7C3AED]" : "text-[#0A0A0A] group-hover:text-[#7C3AED]"
                }`}>
                  {item.question}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isOpen
                      ? "bg-[#F5F0FF] text-[#7C3AED] rotate-180"
                      : "text-[#9CA3AF] group-hover:text-[#6B7280] group-hover:bg-gray-100"
                  }`}
                >
                  <ChevronDown size={18} />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-5 sm:pb-6 text-sm sm:text-base text-[#6B7280] leading-relaxed pr-6">
                      {/* {{PENDING: confirm commission model text}} */}
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ====================== FINAL CTA ====================== */
function FinalCTA() {
  return (
    <section className="max-w-5xl mx-auto px-6 my-20" data-testid="final-cta">
      <div className="rounded-3xl p-10 md:p-16 text-center bg-gradient-to-br from-[var(--violet)] to-[#5B3EE0] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">Ready to Experience 100% Transparency?</h2>
          <p className="mt-4 text-white/80 text-sm md:text-base">Join 140,000+ creators and top Indian D2C brands collaborating with zero hidden fees.</p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link to="/signup?role=brand" className="px-6 py-3.5 rounded-full bg-white text-[var(--violet)] font-extrabold text-sm hover:bg-slate-100 transition-colors shadow-lg">
              Launch Campaign as Brand
            </Link>
            <Link to="/signup?role=creator" className="px-6 py-3.5 rounded-full bg-black/30 border border-white/30 text-white font-extrabold text-sm hover:bg-black/50 transition-colors">
              Join as Creator
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== FOOTER ====================== */
function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-[#f6f6f9] pt-16 pb-10 text-xs text-slate-600">
      <div className="max-w-none px-6 sm:px-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 lg:gap-16 pb-12">
          
          {/* Left Column: Brand Info & Bio */}
          <div className="w-full md:max-w-md space-y-5">
            <Link to="/" className="inline-block">
              <YbexLogo className="h-8 text-black w-auto" />
            </Link>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-sm">
              Ybex is an OPEN Professional Network for Creators, Celebrities, Talent Managers and Brands. Connect and collaborate freely.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform" title="Instagram">
                <img src="/assets/instagram.svg" className="w-full h-full object-contain" alt="Instagram" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform" title="Facebook">
                <img src="/assets/facebook.svg" className="w-full h-full object-contain" alt="Facebook" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform" title="YouTube">
                <img src="/assets/youtube.svg" className="w-full h-full object-contain" alt="YouTube" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform" title="LinkedIn">
                <img src="/assets/linkedin.svg" className="w-full h-full object-contain" alt="LinkedIn" />
              </a>
            </div>
          </div>

          {/* Col 2: OUR NETWORK */}
          <div className="space-y-4 shrink-0 min-w-[160px] md:ml-auto">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
              OUR NETWORK
            </div>
            <ul className="space-y-3 font-medium text-slate-600 text-xs sm:text-[13px]">
              <li>
                <Link to="/creators" className="hover:text-purple-600 transition-colors">
                  Talent Agencies
                </Link>
              </li>
              <li>
                <Link to="/signup?role=brand" className="hover:text-purple-600 transition-colors">
                  Brand Managers
                </Link>
              </li>
              <li>
                <Link to="/creators" className="hover:text-purple-600 transition-colors">
                  Verified Creators
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: RESOURCES & SAFETY */}
          <div className="space-y-4 shrink-0 min-w-[180px] pl-1">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
              RESOURCES & SAFETY
            </div>
            <ul className="space-y-3 font-medium text-slate-600 text-xs sm:text-[13px]">
              <li>
                <Link to="/help" className="hover:text-purple-600 transition-colors">
                  Creator Handbooks
                </Link>
              </li>
              <li>
                <Link to="/info/terms" className="hover:text-purple-600 transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link to="/apply-creator" className="hover:text-purple-600 transition-colors font-semibold text-purple-600">
                  Form For Creators
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar Divider & Info */}
        <div className="pt-8 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div>© 2026 Ybex. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link to="/blog" className="hover:text-purple-600 transition-colors">Blogs</Link>
            <Link to="/help" className="hover:text-purple-600 transition-colors">Help Center</Link>
            <Link to="/privacy-policy" className="hover:text-purple-600 transition-colors">Privacy Policy</Link>
            <Link to="/info/terms" className="hover:text-purple-600 transition-colors">Terms of Use</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

