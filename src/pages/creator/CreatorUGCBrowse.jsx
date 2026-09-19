import React, { useEffect, useState } from "react";
import { safeLower } from "../../utils/safeFormat";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useLoading } from "../../contexts/LoadingContext";
import { Zap, Search, Video, PlayCircle, Clock, ShieldCheck, Check, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import UGCContractModal from "../../components/chat/UGCContractModal";
import TrustBadgeRotator from "../../components/TrustBadgeRotator";
import ManageUGCOrdersView from "./ManageUGCOrdersView";
import BrandPublicProfileModal from "../../components/profile/BrandPublicProfileModal";

export default function CreatorUGCBrowse({ defaultTab = "explore" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  const queryOrderId = searchParams.get("orderId") || searchParams.get("dealId");

  const initialIsManage = queryTab === "manage" || queryTab === "orders" || defaultTab === "orders" || defaultTab === "manage";
  const [activeTab, setActiveTab] = useState(initialIsManage ? "manage" : "explore");
  const [briefs, setBriefs] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [showUGCContractModal, setShowUGCContractModal] = useState(false);
  const [claimedData, setClaimedData] = useState(null);
  const [selectedBrandForModal, setSelectedBrandForModal] = useState(null);
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  useEffect(() => {
    if (queryTab === "manage" || queryTab === "orders" || defaultTab === "orders" || defaultTab === "manage") {
      setActiveTab("manage");
    } else if (queryTab === "explore" || defaultTab === "browse" || defaultTab === "explore") {
      setActiveTab("explore");
    }
  }, [queryTab, defaultTab]);

  const loadData = () => {
    startLoading();
    Promise.all([
      api.get("ugc/briefs/available").catch(() => ({ data: [] })),
      api.get("ugc/orders/creator").catch(() => ({ data: [] }))
    ])
      .then(([briefsRes, ordersRes]) => {
        setBriefs(briefsRes.data || []);
        setMyOrders(ordersRes.data || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load available briefs. Please try again.");
      })
      .finally(() => stopLoading());
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMatchingOrderForBrief = (briefId) => {
    if (!briefId || !myOrders || myOrders.length === 0) return null;
    return myOrders.find(o => 
      (o.brief_id && String(o.brief_id) === String(briefId)) ||
      (o.brief?.id && String(o.brief.id) === String(briefId)) ||
      (o.deal_id && String(o.deal_id) === String(briefId))
    );
  };

  const handleClaim = () => {
    if (!selectedBrief) return;
    setClaimedData({
      brief: selectedBrief
    });
    setSelectedBrief(null);
    setShowUGCContractModal(true);
  };

  const getPayout = (budget) => {
    const feePercent = budget < 20000 ? 5 : 2;
    return budget;
  };

  const resolveBrandLogo = (b) => {
    const directLogo = b.brand_logo || b.brand?.logo || b.brand?.avatar || b.brand_avatar;
    if (directLogo && typeof directLogo === 'string' && directLogo.trim().length > 0) {
      return directLogo;
    }
    const brandName = (b.brand_name || b.brand?.name || b.brand?.company_name || b.company_name || "").toLowerCase();
    const prodName = (b.product_name || b.title || "").toLowerCase();

    if (brandName.includes("beardo") || prodName.includes("beardo")) {
      return "/api/files/file_8uced48g9du";
    }
    if (brandName.includes("nexus") || brandName.includes("zepto") || prodName.includes("nexus")) {
      return "https://iili.io/CeJ5cla.webp";
    }
    if (brandName.includes("fevicol") || prodName.includes("fevicol")) {
      return "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822669069-3b576cdf-128a-455e-8bdf-902c6711e39f.jpeg";
    }
    if (brandName.includes("bsc") || brandName.includes("bombay shaving")) {
      return "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822692830-ebf3623c-1842-422d-b51b-c8d10c64d51e.png";
    }
    if (prodName.includes("protein") || prodName.includes("whey") || brandName.includes("protein") || brandName.includes("whey")) {
      return "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=150&auto=format&fit=crop&q=80";
    }
    if (brandName.includes("swiggy")) return "https://iili.io/CeJTOuI.png";
    if (brandName.includes("country")) return "https://iili.io/CeJRkZP.png";
    if (brandName.includes("uber")) return "https://iili.io/CeJRBvR.jpg";

    const seed = encodeURIComponent(b.brand_name || b.product_name || "Brand");
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6366f1&fontFamily=Arial&fontWeight=800`;
  };

  const filteredBriefs = briefs.filter(b => {
    // Hide briefs that are fully claimed
    if ((b.claimed_count || 0) >= (b.max_creators || 1)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.title && safeLower(b.title).includes(q)) ||
      (b.product_name && safeLower(b.product_name).includes(q)) ||
      (b.brand_name && safeLower(b.brand_name).includes(q))
    );
  });

  return (
    <div className="w-full max-w-none animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[var(--border-default)] pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">Explore UGC</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-sm text-[var(--text-tertiary)] opacity-70 font-semibold">
              Instant UGC Market Place
            </p>
            <TrustBadgeRotator page="exploreUgc" />
          </div>
        </div>

        {/* Top Header Toggle Pill (Explore vs Manage Orders) */}
        <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-default)] shadow-xs shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              setActiveTab("explore");
              setSearchParams({ tab: "explore" });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "explore"
                ? "bg-[var(--violet)] text-white shadow-md"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            
            <span>EXPLORE</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("manage");
              setSearchParams({ tab: "manage" });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "manage"
                ? "bg-[var(--violet)] text-white shadow-md"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            <Clock size={14} />
            <span>MANAGE ORDERS</span>
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB VIEW */}
      {activeTab === "manage" ? (
        <ManageUGCOrdersView
          initialOrderId={queryOrderId || claimedData?.order_id}
          onSelectBriefToExplore={() => {
            setActiveTab("explore");
            setSearchParams({ tab: "explore" });
          }}
        />
      ) : (
        <>
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={15} />
              <input
                type="text"
                placeholder="Search briefs by title, product, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] rounded-2xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-all shadow-xs"
              />
            </div>
            <p className="text-xs text-[var(--text-tertiary)] font-semibold">
              Showing <span className="text-[var(--text-primary)] font-bold">{filteredBriefs.length}</span> available brief{filteredBriefs.length === 1 ? '' : 's'}
            </p>
          </div>

          {/* Grid of Briefs */}
          {filteredBriefs.length === 0 ? (
            <div className="text-center py-20 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl">
              <p className="text-[var(--text-tertiary)] font-medium">No open briefs matching your search right now. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 relative z-10">
              {filteredBriefs.map(b => {
                const brandName = b.brand_name || b.brand?.name || b.brand?.company_name || b.company_name || "Verified Brand";
                const brandLogo = resolveBrandLogo(b);
                const title = b.title || "UGC Video Brief";
                const payout = getPayout(b.budget || 15000);
                const description = b.product_description || b.detailed_requirements || b.description || b.instructions || b.product_name || "Create authentic UGC video content for brand promotion.";
                const matchingOrder = getMatchingOrderForBrief(b.id);
                const isApplied = Boolean(matchingOrder);

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBrief(b)}
                    className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-default)] hover:border-[var(--violet)] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      {/* Top Row: Brand Logo + Title & Brand Name + Dark Green Payout */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        {/* Left: Brand Logo + Title + By Brand */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBrandForModal({
                                userId: b.brand_user_id || b.brand_id || b.brand?.user_id || b.brand?.id,
                                name: brandName,
                                logo: brandLogo
                              });
                            }}
                            className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--violet)] cursor-pointer overflow-hidden flex items-center justify-center shrink-0 shadow-2xs font-black text-base text-[var(--violet)] transition-all hover:scale-105"
                            title="View Brand Profile"
                          >
                            {brandLogo ? (
                              <img 
                                src={brandLogo} 
                                alt={brandName} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName)}&backgroundColor=6366f1&fontFamily=Arial&fontWeight=800`;
                                }}
                              />
                            ) : (
                              <span>{brandName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-extrabold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors line-clamp-2 leading-snug">
                              {title}
                            </h3>
                            <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5 truncate">
                              by <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBrandForModal({
                                    userId: b.brand_user_id || b.brand_id || b.brand?.user_id || b.brand?.id,
                                    name: brandName,
                                    logo: brandLogo
                                  });
                                }}
                                className="text-[var(--text-secondary)] font-bold hover:text-[var(--violet)] hover:underline cursor-pointer"
                                title="View Brand Profile"
                              >{brandName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Payout in Dark Green */}
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block mb-0.5">Payout</span>
                          <span className="text-base font-black text-[#027A48] font-mono block">
                            ₹{payout.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Description (Limited & Clean) */}
                      <p className="text-xs text-[var(--text-tertiary)] font-medium line-clamp-2 leading-relaxed mb-5">
                        {description}
                      </p>
                    </div>

                    {/* Footer: Limited Clean Indicators */}
                    <div className="pt-3 border-t border-[var(--border-default)] flex items-end justify-between">
                      <div className="flex flex-col gap-1 pt-0 pl-0 mt-0 ml-0 mr-0 -mb-[5px]">
                        <div className="relative inline-flex items-center gap-1.5 text-[var(--violet)] font-bold text-[11px]">
                          <Zap size={12} />
                          <span>24H Delivery</span>
                          <div className="absolute -top-3.5 -right-6 z-20 overflow-hidden rounded">
                            <span className="relative inline-block bg-[#FF0033] shadow-[0_0_8px_rgba(255,0,51,0.5)] text-white text-[7.5px] font-black px-1.5 py-[3px] leading-none rounded uppercase tracking-wider overflow-hidden">
                              <span className="relative z-10 drop-shadow-sm">NEW</span>
                              <span className="absolute top-0 bottom-0 left-0 w-full bg-white opacity-60 animate-shine"></span>
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] text-[var(--text-tertiary)] ml-[18px] leading-none font-bold">*T&C Apply</span>
                      </div>

                      <div className="flex items-center gap-3 mb-[3px]">
                        {isApplied && (
                          <div className="relative inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 px-2.5 py-0.5 rounded-full overflow-hidden shadow-xs">
                            <Check size={11} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                            <span>Applied</span>
                            <span className="absolute top-0 bottom-0 left-0 w-full bg-white opacity-60 animate-shine pointer-events-none"></span>
                          </div>
                        )}
                        <span className="text-[11px] font-bold text-[var(--violet)] group-hover:translate-x-1 transition-transform">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Claim Modal */}
      <AnimatePresence>
        {selectedBrief && (() => {
          const selectedBriefMatchingOrder = getMatchingOrderForBrief(selectedBrief.id);
          const isSelectedBriefApplied = Boolean(selectedBriefMatchingOrder);
          const modalBrandName = selectedBrief.brand_name || selectedBrief.brand?.name || selectedBrief.brand?.company_name || selectedBrief.company_name || "Verified Brand";
          const modalBrandLogo = resolveBrandLogo(selectedBrief);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={()=>setSelectedBrief(null)} />
              <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 max-w-lg w-full relative z-10 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
                {/* Close button */}
                <button 
                  onClick={() => setSelectedBrief(null)} 
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center font-bold transition-colors cursor-pointer"
                  title="Close"
                >
                  &times;
                </button>

                <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-[var(--violet-soft)] text-[var(--violet)] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-[var(--violet-border)]">
                        <Zap size={10} /> 22-Hour Delivery Promise
                      </div>
                    </div>

                    {/* Brand Banner / Profile snippet in modal */}
                    <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-3 rounded-2xl border border-[var(--border-default)]">
                      <div 
                        onClick={() => {
                          setSelectedBrandForModal({
                            userId: selectedBrief.brand_user_id || selectedBrief.brand_id || selectedBrief.brand?.user_id || selectedBrief.brand?.id,
                            name: modalBrandName,
                            logo: modalBrandLogo
                          });
                        }}
                        className="w-12 h-12 rounded-xl bg-white border border-[var(--border-default)] overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-[var(--violet)] hover:scale-105 transition-all shadow-xs"
                        title="View Brand Profile"
                      >
                        {modalBrandLogo ? (
                          <img 
                            src={modalBrandLogo} 
                            alt={modalBrandName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(modalBrandName)}&backgroundColor=6366f1&fontFamily=Arial&fontWeight=800`;
                            }}
                          />
                        ) : (
                          <span className="font-bold text-base text-[var(--violet)]">{modalBrandName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={() => {
                              setSelectedBrandForModal({
                                userId: selectedBrief.brand_user_id || selectedBrief.brand_id || selectedBrief.brand?.user_id || selectedBrief.brand?.id,
                                name: modalBrandName,
                                logo: modalBrandLogo
                              });
                            }}
                            className="font-extrabold text-sm text-[var(--text-primary)] hover:text-[var(--violet)] hover:underline cursor-pointer truncate"
                            title="View Brand Profile"
                          >
                            {modalBrandName}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">Brand Partner • Direct Collaboration</p>
                      </div>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-snug">{selectedBrief.title}</h3>
                    {selectedBrief.product_description && (
                      <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)] max-h-36 overflow-y-auto">
                        <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Product Description</h4>
                        <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed whitespace-pre-line">{selectedBrief.product_description}</p>
                      </div>
                    )}

                    {selectedBrief.detailed_requirements && (
                      <div>
                        <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Detailed Requirements</h4>
                        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)] max-h-40 overflow-y-auto whitespace-pre-line">{selectedBrief.detailed_requirements}</p>
                      </div>
                    )}
                    {selectedBrief.sample_content_url && (
                      <div>
                        <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Sample Reference</h4>
                        <a href={selectedBrief.sample_content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--violet)] hover:underline underline-offset-4 flex items-center gap-1">
                          View Sample Content
                        </a>
                      </div>
                    )}
                    <div>
                      <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Must Do</h4>
                      <ul className="text-xs text-emerald-600 space-y-1">
                        {selectedBrief.dos?.[0] ? selectedBrief.dos?.map((d, i) => <li key={i}>✅ {d}</li>) : <li>No specific requirements</li>}
                      </ul>
                    </div>
                    {selectedBrief.donts?.[0] && (
                      <div>
                        <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Must Not Do</h4>
                        <ul className="text-xs text-rose-600 space-y-1">
                          {selectedBrief.donts?.map((d, i) => <li key={i}>❌ {d}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="bg-[var(--bg-elevated)] border border-[#7c3aed]/30 rounded-xl p-3.5 mt-2">
                      <p className="text-xs font-medium text-[var(--text-secondary)]">By claiming this brief, you commit to delivering the video within strictly 22 hours. Missing the deadline will cancel the order.</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#7c3aed]/20">
                        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold">Your Payout</span>
                        <span className="text-[#027A48] font-bold text-xl font-sans">₹{getPayout(selectedBrief.budget).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {isSelectedBriefApplied ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 mt-auto border-t border-[var(--border-default)] shrink-0 w-full">
                      <button
                        type="button"
                        onClick={() => setSelectedBrief(null)}
                        className="w-full sm:w-auto px-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-default)] active:scale-95 transition-transform text-xs sm:text-sm cursor-pointer"
                      >
                        Close
                      </button>

                      <div className="relative flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider text-xs sm:text-sm overflow-hidden shadow-xs">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Already applied</span>
                        <span className="absolute top-0 bottom-0 left-0 w-full bg-white opacity-50 animate-shine pointer-events-none"></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const targetOrderId = selectedBriefMatchingOrder?.id || selectedBriefMatchingOrder?.deal_id;
                          setSelectedBrief(null);
                          setActiveTab("manage");
                          setSearchParams(targetOrderId ? { tab: "manage", orderId: targetOrderId } : { tab: "manage" });
                        }}
                        className="flex-1 w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold uppercase tracking-wider py-3 px-4 rounded-xl active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.3)] text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Go to manage orders</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3 pt-3 mt-auto border-t border-[var(--border-default)] shrink-0">
                      <button onClick={() => setSelectedBrief(null)} className="w-1/3 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-default)] active:scale-95 transition-transform text-xs sm:text-sm cursor-pointer">Cancel</button>
                      <button onClick={handleClaim} className="flex-1 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-black uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.3)] text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer">
                        <Zap size={16} /> I Commit — Claim Now
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {showUGCContractModal && claimedData && (
        <UGCContractModal
          brief={claimedData.brief}
          orderId={claimedData.order_id}
          threadId={claimedData.thread_id}
          onClose={() => {
            setShowUGCContractModal(false);
            setClaimedData(null);
            loadData();
          }}
          onSigned={(signedOrderId) => {
            setShowUGCContractModal(false);
            setClaimedData(null);
            setActiveTab("manage");
            setSearchParams({ tab: "manage" });
            loadData();
          }}
          onStartChat={() => {
            setShowUGCContractModal(false);
            setClaimedData(null);
            setActiveTab("manage");
            setSearchParams({ tab: "manage" });
            loadData();
          }}
        />
      )}

      <BrandPublicProfileModal 
        isOpen={Boolean(selectedBrandForModal)} 
        onClose={() => setSelectedBrandForModal(null)} 
        brandUserId={selectedBrandForModal?.userId} 
        brandName={selectedBrandForModal?.name} 
        brandLogo={selectedBrandForModal?.logo} 
      />

    </div>
  );
}

