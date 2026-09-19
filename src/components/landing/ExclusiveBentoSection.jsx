import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search,
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  FileCheck,
  IndianRupee,
  Building2,
  Users,
  Check,
  Clock,
  Shield,
  TrendingUp,
  Award
} from "lucide-react";

export default function ExclusiveBentoSection() {
  const [activeTab, setActiveTab] = useState("brands"); // "brands" | "creators"
  const [dealTickerIndex, setDealTickerIndex] = useState(0);
  
  const getDynamicCounts = () => {
    const baseDate = new Date("2026-08-01T00:00:00Z").getTime();
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - baseDate) / (1000 * 60 * 60));
    return {
      creators: 756 + Math.floor(hoursElapsed / 6),
      brands: 87 + Math.floor(hoursElapsed / 12)
    };
  };
  const initialCounts = getDynamicCounts();
  const [creatorsCount, setCreatorsCount] = useState(initialCounts.creators);
  const [brandsCount, setBrandsCount] = useState(initialCounts.brands);

  const liveDeals = [
    { brand: "Mamaearth", creator: "@arjun_fitness", amount: "₹42,000", action: "Escrow Locked", time: "at 05:00 PM" },
    { brand: "Titan EyeX", creator: "@ananyasharma", amount: "₹35,000", action: "Escrow Released", time: "at 14th August" },
    { brand: "Nykaa Beauty", creator: "@rohit_vlogs", amount: "₹50,000", action: "Contract Signed", time: "at 02:15 PM" },
    { brand: "Boat Lifestyle", creator: "@sneha_tech", amount: "₹28,000", action: "Milestone Paid", time: "at 10th August" },
    { brand: "Sugar Cosmetics", creator: "@priya_glam", amount: "₹65,000", action: "Deal Closed", time: "at 11:30 AM" },
    { brand: "Minimalist", creator: "@tanmay_fit", amount: "₹38,000", action: "Brief Approved", time: "at 08th August" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
       const counts = getDynamicCounts();
       setCreatorsCount(counts.creators);
       setBrandsCount(counts.brands);
    }, 1000 * 60 * 5);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const dealInterval = setInterval(() => {
      setDealTickerIndex((prev) => (prev + 1) % liveDeals.length);
    }, 6500);
    return () => clearInterval(dealInterval);
  }, [liveDeals.length]);

  return (
    <section className="py-8 sm:py-12 bg-[#FAFAFC] relative overflow-hidden" id="exclusive-features">
      
      <div className="max-w-none px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ================= SECTION HEADER ================= */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-[#111827] tracking-tight"
          >
            <span className="text-[#3b2d99]">One Network</span> for Creator Partnerships.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mt-1 sm:mt-1.5 text-sm sm:text-base font-bold text-[#111827]"
          >
            Everyone is Verified.
          </motion.p>
        </div>

        {/* ================= 2x2 BENTO GRID CONTAINER ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">

          {/* ================= TOP ROW ================= */}

          {/* CARD 1: Top-Left (Vertical White Card - Active Creators) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden"
          >
            {/* Live Green Dot */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
              <div className="uppercase tracking-widest text-xs sm:text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                Active Creators
              </div>
              
              <div className="relative h-14 sm:h-16 flex items-center justify-center overflow-hidden w-full">
                <AnimatePresence mode="popLayout">
                  <motion.div 
                    key={creatorsCount}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                    className="absolute text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none relative overflow-hidden inline-block pr-1 py-0.5"
                  >
                    <span className="text-[#111827]">{creatorsCount.toLocaleString()}</span>
                    <motion.span 
                      initial={{ x: "-150%", skewX: -20 }}
                      whileInView={{ x: "150%", skewX: -20 }}
                      viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                      className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-purple-300/60 to-transparent pointer-events-none" 
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            
            <p className="text-gray-500 font-medium text-xs leading-relaxed text-center mt-1">
              Thousands of creators are already growing on Ybex. Don't just watch the movement, be part of it.
            </p>
          </motion.div>

          {/* CARD 2: Top-Right (Horizontal Soft Lavender Card - Dual-Track Workflow & Live Deal Ticker) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="lg:col-span-8 bg-[#EAE4FE] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-purple-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between gap-3 sm:gap-3.5"
          >
            {/* Top Bar: Title + Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-10">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-xs text-[#5846E0] text-[11px] font-bold shadow-2xs mb-1">
                  <Zap size={11} className="fill-[#5846E0]" />
                  <span>Dual-Track Deal Engine</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-[#111827] tracking-tight leading-tight">
                  From Brief to Payout in 4 Steps.
                </h3>
              </div>

              {/* Brand vs Creator Toggle */}
              <div className="inline-flex p-0.5 rounded-xl bg-white/60 backdrop-blur-sm border border-purple-200/80 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab("brands")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === "brands"
                      ? "bg-[#5846E0] text-white shadow-xs"
                      : "text-gray-700 hover:text-[#5846E0]"
                  }`}
                >
                  <Building2 size={13} />
                  <span>For Brands</span>
                </button>
                <button
                  onClick={() => setActiveTab("creators")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    activeTab === "creators"
                      ? "bg-[#5846E0] text-white shadow-xs"
                      : "text-gray-700 hover:text-[#5846E0]"
                  }`}
                >
                  <Users size={13} />
                  <span>For Creators</span>
                </button>
              </div>
            </div>

            {/* 4 Interactive Workflow Steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 z-10">
              {activeTab === "brands" ? (
                <>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      01
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Post Brief / Browse</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Filter verified creators by niche &amp; ER</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      02
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Direct Negotiation</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Chat directly with standard transparent rate cards</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      03
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Lock In Escrow</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Funds protected until you approve final assets</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      04
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Approve &amp; Scale</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Instant payout release + automated invoice PDF</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      01
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Claim Profile</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Publish your verified bio, rate card &amp; portfolio</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      02
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">Receive Direct Deals</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Get direct brand offers without agency spam</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      03
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">E-Sign SLA</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Automated digital contract protects deliverables</div>
                  </div>
                  <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                      04
                    </div>
                    <div className="font-bold text-xs text-gray-900 leading-tight">0% Cut Payout</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">100% amount credited to bank without delays</div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Live Deal Ticker */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-purple-200/80 shadow-2xs flex items-center justify-between gap-2.5 z-10">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-gray-800 truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[#5846E0] font-black uppercase text-[9px] tracking-wider shrink-0">Live Deal Proof:</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={dealTickerIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="truncate text-gray-700 text-[11px] sm:text-xs font-medium"
                  >
                    <strong className="text-gray-900 font-bold">{liveDeals[dealTickerIndex].brand}</strong> locked <strong className="text-[#5846E0] font-bold">{liveDeals[dealTickerIndex].amount}</strong> with <strong className="text-gray-900 font-bold">{liveDeals[dealTickerIndex].creator}</strong> <span className="text-gray-500 font-normal text-[10px] sm:text-[11px]">{liveDeals[dealTickerIndex].time}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="shrink-0 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {liveDeals[dealTickerIndex].action}
              </span>
            </div>
          </motion.div>


          {/* ================= BOTTOM ROW ================= */}

          {/* CARD 3: Bottom-Left (Horizontal Soft Lavender Card - Zero Agency Risk & Protection Pillars) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="lg:col-span-8 bg-[#EAE4FE] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-purple-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden flex flex-col justify-between gap-3 sm:gap-3.5"
          >
            {/* Top Bar: Title + Trust Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-10">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-xs text-emerald-700 text-[11px] font-bold shadow-2xs mb-1">
                  <ShieldCheck size={11} className="text-emerald-600" />
                  <span>Zero Hidden Fees Guarantee</span>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-[#111827] tracking-tight leading-tight">
                  Why Top Brands &amp; Creators Choose Ybex.
                </h3>
              </div>

              {/* Agency Comparison Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/70 backdrop-blur-sm border border-purple-200/80 text-[11px] font-extrabold text-[#5846E0] shrink-0 self-start sm:self-auto shadow-2xs">
                <Shield size={12} className="text-[#5846E0]" />
                <span>Zero Agency Risk</span>
              </div>
            </div>

            {/* 4 Clean Protection Pillars (Matching Top-Right Step Cards Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 z-10">
              <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={13} />
                </div>
                <div className="font-bold text-xs text-gray-900 leading-tight">0% Creator Cut</div>
                <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">100% earnings to creator bank with no hidden deductions</div>
              </div>

              <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                  <Lock size={13} />
                </div>
                <div className="font-bold text-xs text-gray-900 leading-tight">100% Escrow Shield</div>
                <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Funds locked upfront and released upon approved deliverables</div>
              </div>

              <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#5846E0] flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                  <FileCheck size={13} />
                </div>
                <div className="font-bold text-xs text-gray-900 leading-tight">Automated Legal SLA</div>
                <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">Digital contract protects timelines, revisions &amp; usage rights</div>
              </div>

              <div className="bg-white/85 backdrop-blur-sm rounded-xl p-2.5 border border-purple-100/80 shadow-2xs hover:bg-white transition-all group">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] mb-1 group-hover:scale-105 transition-transform">
                  <Zap size={13} />
                </div>
                <div className="font-bold text-xs text-gray-900 leading-tight">Instant Settlement</div>
                <div className="text-[10px] text-gray-600 mt-0.5 leading-snug">GST ready invoices generated instantly upon completion</div>
              </div>
            </div>

            {/* Bottom Trust Guarantee Strip */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-purple-200/80 shadow-2xs flex items-center justify-between gap-2.5 z-10 text-[11px] sm:text-xs">
              <div className="flex items-center gap-2 text-gray-800 font-semibold truncate">
                <span className="text-emerald-600 font-black">✓</span>
                <span className="truncate text-gray-700">Replaces <strong>30%–50% agency markups</strong> with direct, transparent collaboration.</span>
              </div>
              <span className="shrink-0 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#5846E0] border border-purple-200">
                Verified Creators Only
              </span>
            </div>
          </motion.div>

          {/* CARD 4: Bottom-Right (Vertical White Card for Brands) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden"
          >
            {/* Live Green Dot */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
              <div className="uppercase tracking-widest text-xs sm:text-sm font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                Active Brands
              </div>
              
              <div className="relative h-14 sm:h-16 flex items-center justify-center overflow-hidden w-full">
                <AnimatePresence mode="popLayout">
                  <motion.div 
                    key={brandsCount}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                    className="absolute text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none relative overflow-hidden inline-block pr-1 py-0.5"
                  >
                    <span className="text-[#5846E0]">{brandsCount.toLocaleString()}</span>
                    <motion.span 
                      initial={{ x: "-150%", skewX: -20 }}
                      whileInView={{ x: "150%", skewX: -20 }}
                      viewport={{ once: true, margin: "0px 0px -100px 0px" }}
                      transition={{ duration: 1.5, ease: "easeInOut", delay: 0.6 }}
                      className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" 
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            
            <p className="text-gray-500 font-medium text-xs leading-relaxed text-center mt-1">
              Top tier brands and leading agencies are actively searching for authentic creators just like you.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
