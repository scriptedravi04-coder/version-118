import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, IndianRupee, Megaphone, ArrowRight, Search, MapPin, DollarSign, Clock, Briefcase, Plus, CheckCircle, Package, Monitor, X, PlayCircle, Instagram, Twitter, Youtube, Linkedin, Star, AlignLeft, SlidersHorizontal, ChevronDown, Check, Facebook, Zap, Video, Building, Share2 } from "lucide-react";
import GeminiIcon from "../../components/shared/GeminiIcon";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import TrustBadgeRotator from "../../components/TrustBadgeRotator";
import UGCContractModal from "../../components/chat/UGCContractModal";
import BrandPublicProfileModal from "../../components/profile/BrandPublicProfileModal";
import AgencyBadge from "../../components/common/AgencyBadge";
import { getCampaignStats, getCampaignAvatars } from "../../utils/campaignStats";

const PlatformIcon = ({ platform }) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return <img src="/assets/instagram.svg" className="w-4 h-4 object-contain" alt="Instagram" />;
    case 'youtube': return <img src="/assets/youtube.svg" className="w-4 h-4 object-contain" alt="YouTube" />;
    case 'tiktok': return <PlayCircle size={16} className="text-[var(--text-primary)]" />;
    case 'twitter': return <img src="/assets/x.svg" className="w-4 h-4 object-contain" alt="X" />;
    case 'facebook': return <img src="/assets/facebook.svg" className="w-4 h-4 object-contain" alt="Facebook" />;
    case 'linkedin': return <img src="/assets/linkedin.svg?v=2" className="w-4 h-4 object-contain" alt="LinkedIn" />;
    case 'snapchat': return <img src="/assets/snapchat.svg" className="w-4 h-4 object-contain" alt="Snapchat" />;
    default: return <Monitor size={16} className="text-[var(--text-tertiary)]" />;
  }
};

const getCreatorRequirementsString = (c) => {
  if (c.isUgc) {
    return "UGC Content Creators skilled in product demonstration videos.";
  }
  const niches = c.categories && c.categories.length > 0 ? c.categories.join(", ") : "Any Niche";
  const platforms = c.platforms && c.platforms.length > 0 ? c.platforms.join(" & ") : "Instagram";
  
  let reach = "";
  if (c.follower_min || c.follower_max) {
    const minK = c.follower_min ? `${c.follower_min >= 1000000 ? (c.follower_min/1000000) + 'M' : (c.follower_min/1000) + 'k'}` : "Any";
    const maxK = c.follower_max ? `${c.follower_max >= 1000000 ? (c.follower_max/1000000) + 'M' : (c.follower_max/1000) + 'k'}` : "";
    reach = maxK ? `${minK} - ${maxK} followers` : `${minK}+ followers`;
  } else {
    reach = "10k+ followers";
  }

  const genderText = c.gender && c.gender !== "Both" ? `${c.gender} creators` : "Creators (Any Gender)";
  const langText = c.languages && c.languages.length > 0 ? `fluent in ${c.languages.join(", ")}` : "";
  const locText = c.location ? `based in ${c.location}` : "Pan India";

  return `${niches} ${genderText} on ${platforms} with ${reach}, ${langText} ${locText}.`.replace(/ ,/g, ',').replace(/\s+/g, ' ').trim();
};

export default function Campaigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("Live Campaigns");

  const [showPaidFilter, setShowPaidFilter] = useState(false);
  const [isPaidOnly, setIsPaidOnly] = useState(false);
  
  const [showLocFilter, setShowLocFilter] = useState(false);
  const [showLangFilter, setShowLangFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  const [showActivity, setShowActivity] = useState(false);

  const [selectedBrief, setSelectedBrief] = useState(null);
  const [showUGCContractModal, setShowUGCContractModal] = useState(false);
  const [claimedData, setClaimedData] = useState(null);
  const [selectedBrandForModal, setSelectedBrandForModal] = useState(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [catFilter, setCatFilter] = useState("All");
  const [locFilter, setLocFilter] = useState("All");
  const [platFilter, setPlatFilter] = useState([]);
  const [budgetRange, setBudgetRange] = useState(100000); 
  
    useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const campsRes = await api.get("campaigns").catch(() => ({ data: [] }));
        const campsList = Array.isArray(campsRes.data) ? campsRes.data : [];

        const BRAND_LOGOS = [
          "https://iili.io/CeJRHhP.jpg", // Khiladi Adda
          "https://iili.io/CeJ5cla.webp", // Zepto / Nexus Brands
          "https://iili.io/CeJTOuI.png", // Swiggy
          "https://iili.io/CeJRkZP.png", // Country Delight
          "https://iili.io/CeJ7whB.png", // WinZO
          "https://iili.io/CeJRBvR.jpg"  // Uber
        ];

        const resolveBrandLogo = (brandName, logoCandidate, idx = 0) => {
          if (logoCandidate && typeof logoCandidate === 'string' && logoCandidate.trim().length > 0) {
            return logoCandidate;
          }
          const name = (brandName || "").toLowerCase();
          if (name.includes("khiladi")) return "https://iili.io/CeJRHhP.jpg";
          if (name.includes("nexus") || name.includes("zepto")) return "https://iili.io/CeJ5cla.webp";
          if (name.includes("swiggy")) return "https://iili.io/CeJTOuI.png";
          if (name.includes("country")) return "https://iili.io/CeJRkZP.png";
          if (name.includes("uber")) return "https://iili.io/CeJRBvR.jpg";
          return BRAND_LOGOS[idx % BRAND_LOGOS.length];
        };

        const mappedCamps = campsList?.filter(c => c.status === "live" || c.stage === "Live" || c.stage === "Under Review").map((c, idx) => {
          let days = 0;
          if (c.deadline) {
            const diff = new Date(c.deadline).getTime() - Date.now();
            days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
          }
          const bName = c.brand_name || "Brand Name";
          return {
            id: c.campaign_id || c.id,
            brand_name: bName,
            brand_logo: resolveBrandLogo(bName, c.brand_logo || c.brand_photo, idx),
            title: c.title,
            categories: c.categories || (c.category ? [c.category] : ["General"]),
            platforms: c.platforms || [],
            location: c.location_type || c.city || "Pan India",
            budget_min: c.budget_min || 0,
            budget_max: c.budget_max || 0,
            deliverables: c.deliverables || [],
            expiry_days: days,
            description: c.description || undefined,
            status: c.status,
            brand_type: c.brand_type || "Various",
            follower_min: c.follower_min,
            follower_max: c.follower_max,
            gender: c.gender || "Both",
            languages: c.languages || [],
            views: getCampaignStats(c).views,
            applied: getCampaignStats(c).applied,
            creator_name: c.creator_name || "Marketing Manager",
            time_ago: "1d ago",
            isUgc: false
          };
        });

        setData(mappedCamps);
        if (user && user.role === "creator") {
          api.get("ugc/orders/creator").then(res => setMyOrders(res.data || [])).catch(() => {});
        }
      } catch (e) {
        console.error(e);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [user]);

  const togglePlatform = (p) => {
    setPlatFilter(prev => prev.includes(p) ? prev?.filter(x => x !== p) : [...prev, p]);
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
    return budget - (budget * feePercent / 100);
  };

  const filtered = useMemo(() => {
    return data?.filter(c => {
      if (activeTab === "Live Campaigns" && (c.isUgc || c.status !== "live")) return false;
      if (activeTab === "Closed Campaigns" && (c.isUgc || c.status !== "closed")) return false;
      if (activeTab === "UGC Campaigns" && !c.isUgc) return false;
      
      if (search) {
        const q = search.toLowerCase();
        
        // 1. Match title
        const matchesTitle = c.title ? c.title.toLowerCase().includes(q) : false;
        
        // 2. Match brand name
        const matchesBrand = c.brand_name ? c.brand_name.toLowerCase().includes(q) : false;
        
        // 3. Match categories
        let matchesCategories = false;
        if (Array.isArray(c.categories)) {
          matchesCategories = c.categories.some(cat => cat ? cat.toLowerCase().includes(q) : false);
        } else if (typeof c.categories === 'string') {
          matchesCategories = c.categories.toLowerCase().includes(q);
        }
        
        // 4. Match niche/description
        const matchesNiche = (c.niche ? c.niche.toLowerCase().includes(q) : false) || 
                             (c.niche_target ? c.niche_target.toLowerCase().includes(q) : false) || 
                             (c.description ? c.description.toLowerCase().includes(q) : false);
        
        // 5. Match budget
        const budgetValue = c.budget_min || c.budget_max || c.budget || 0;
        const matchesBudgetText = (c.price_range ? c.price_range.toLowerCase().includes(q) : false) || String(budgetValue).includes(q);

        if (!matchesTitle && !matchesBrand && !matchesCategories && !matchesNiche && !matchesBudgetText) {
          return false;
        }
      }
      if (catFilter !== "All" && (!c.categories || !c.categories.includes(catFilter))) return false;
      if (locFilter !== "All" && c.location !== locFilter) return false;
      if (platFilter.length > 0 && (!c.platforms || !c.platforms.some(p => platFilter.includes(p)))) return false;
      if (c.budget_min > budgetRange) return false;
      if (isPaidOnly && c.budget_min === 0 && !c.price_range) return false;
      return true;
    });
  }, [data, search, catFilter, locFilter, platFilter, budgetRange, activeTab]);

  return (
    <div className="w-full max-w-none " data-testid="campaigns-page"> 
 
      {/* 100% Free Trust Banner for Logged out users */}
      {!user && (
        <div className="mb-6 w-full bg-[#F0FDF4] border border-[#DCFCE7] text-[var(--green)] px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="text-lg shrink-0">⚡</span>
            <p className="text-xs sm:text-sm font-bold tracking-wide">
              Free access. Always. No credit card, no trial period, no hidden fees — just sign up and start.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => navigate("/login")}
              className="bg-white hover:bg-neutral-50 text-[var(--green)] border border-[#DCFCE7] px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition duration-150"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate("/signup")}
              className="bg-[var(--green)] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-700/10 transition duration-150"
            >
              Sign Up 100% Free
            </button>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      <AnimatePresence>
        {showActivity && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--bg-elevated)]">
                <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2"><Clock size={20} className="text-[var(--violet)]"/> My Activity</h3>
                <button onClick={() => setShowActivity(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"><X size={20}/></button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="p-4 border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors flex gap-4 items-start">
                   <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle size={18} className="text-emerald-500"/>
                   </div>
                   <div>
                      <p className="font-bold text-[var(--text-primary)] text-sm">Application Accepted</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Nike Summer Fit Campaign approved your application.</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2 font-mono">2 hours ago</p>
                   </div>
                </div>
                <div className="p-4 border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors flex gap-4 items-start">
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Briefcase size={18} className="text-blue-500"/>
                   </div>
                   <div>
                      <p className="font-bold text-[var(--text-primary)] text-sm">Draft Submitted</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">UrbanOutfitters Reel Draft uploaded for review.</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2 font-mono">1 day ago</p>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-2 sm:mb-3">Campaigns</h1>
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="hidden sm:block text-sm text-[var(--text-secondary)] font-medium">No fee. Zero commissions.</p>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-600">•</span>
            <TrustBadgeRotator page="liveCampaigns" />
          </div>
        </div>
      </div>

      {/* Tabs and Smart Search Bar on the same row */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex overflow-x-auto gap-1 bg-[var(--bg-elevated)] p-1 rounded-2xl border border-[var(--border-default)] custom-scrollbar hide-scrollbar-arrows shrink-0 relative">
          {["Live Campaigns", "Closed Campaigns"].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative whitespace-nowrap px-6 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer z-10 ${
                  isActive ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="campaignTabPill"
                    className="absolute inset-0 bg-[var(--violet)] rounded-xl shadow-xs z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Smart/Unified Search Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto md:max-w-md flex-1">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search category, niche, brand, or budget (e.g. fashion, 20000)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl text-xs text-[var(--text-primary)] outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-all font-semibold shadow-xs"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {search && (
            <p className="text-xs text-[var(--text-secondary)] font-medium whitespace-nowrap shrink-0">
              Found <span className="font-bold text-[var(--violet)]">{filtered.length}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 pb-8">

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-sm animate-pulse flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 items-center w-full">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
                      <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-5/6"></div>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-4 mt-auto">
                  <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-28"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            {filtered?.map((c, index) => {
              return (
              <div 
                key={c.id + "-" + index} 
                className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xs hover:shadow-md hover:border-[#DDD6FE] transition-all cursor-pointer flex flex-col justify-between gap-2.5 sm:gap-5 group" 
                onClick={() => {
                  if (c.isUgc) {
                    setSelectedBrief(c.rawUgcBrief);
                  } else {
                    navigate(`/campaigns/${c.id}`);
                  }
                }}
              >
                 <div className="space-y-2 sm:space-y-4">
                    {/* Header: Brand Avatar + Name/Title + Verification */}
                    <div className="flex items-start justify-between gap-3">
                       <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <img
                             src={c.brand_logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.brand_name || 'Brand')}&backgroundColor=e5e7eb`}
                             alt="brand"
                             className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0 border border-slate-100 shadow-2xs cursor-pointer hover:opacity-80 transition-opacity"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedBrandForModal({
                                 userId: c.brand_user_id || c.brand_id,
                                 name: c.brand_name,
                                 logo: c.brand_logo
                               });
                             }}
                             onError={(e) => {
                               e.target.onerror = null;
                               e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.brand_name || 'Brand')}&backgroundColor=e5e7eb`;
                             }}
                          />
                          <div className="min-w-0 flex-1">
                             <h4 className="font-semibold sm:font-extrabold text-gray-900 text-[15px] sm:text-base group-hover:text-[var(--violet)] transition-colors leading-tight sm:leading-snug line-clamp-2">
                                {c.title}
                             </h4>
                             <p className="text-[12px] sm:text-xs text-gray-500 font-medium sm:font-semibold flex items-center gap-1 mt-0.5">
                                <span className="hover:underline cursor-pointer text-gray-700 hover:text-[var(--violet)] truncate font-semibold" onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBrandForModal({
                                    userId: c.brand_user_id || c.brand_id,
                                    name: c.brand_name,
                                    logo: c.brand_logo
                                  });
                                }}>{c.brand_name}</span> <CheckCircle size={12} className="text-emerald-500 fill-emerald-50 shrink-0" />
                                {c.is_agency && <AgencyBadge size="xs" className="shrink-0" />}
                                <span className="text-gray-300 mx-0.5">·</span>
                                <span className="text-[11px] text-gray-400">{c.time_ago || '1d ago'}</span>
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-xl border border-emerald-200">
                       <CheckCircle size={11} className="sm:w-[13px] sm:h-[13px]" /> Actively reviewing
                    </div>

                    {/* LOOKING FOR */}
                    <div>
                       <p className="hidden sm:block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">LOOKING FOR</p>
                       <p className="text-[13px] sm:text-xs font-medium sm:font-bold text-gray-800 leading-snug sm:leading-relaxed line-clamp-2">
                          {getCreatorRequirementsString(c)}
                       </p>
                    </div>

                    {/* Mobile Single Compact Row */}
                    <div className="sm:hidden flex items-center flex-wrap gap-1.5 text-[12px] text-gray-600 font-medium mt-1">
                       <span className="font-semibold text-gray-900 font-mono">
                          {c.isUgc 
                            ? `₹${getPayout(c.budget_min).toLocaleString('en-IN')}` 
                            : (c.budget_min === 0 ? "Barter" : (c.budget_max && c.budget_max > c.budget_min ? `₹${c.budget_min.toLocaleString('en-IN')}–${c.budget_max.toLocaleString('en-IN')}` : `₹${c.budget_min.toLocaleString('en-IN')}`))
                          }
                       </span>
                       <span className="text-gray-300">·</span>
                       <span className="flex items-center gap-0.5"><MapPin size={12} className="text-gray-400" /> {c.location || "Pan India"}</span>
                       <span className="text-gray-300">·</span>
                       <span className="truncate max-w-[130px] flex items-center gap-0.5"><Package size={12} className="text-gray-400 shrink-0" /> {Array.isArray(c.deliverables) && c.deliverables.length > 0 ? c.deliverables[0] : "1 Reel"}</span>
                    </div>

                    {/* Desktop 2x2 Details Grid */}
                    <div className="hidden sm:grid grid-cols-2 gap-2 text-left">
                       <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-700 font-bold shrink-0 shadow-2xs">
                             ₹
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">
                                {c.isUgc ? 'PAYOUT' : 'PER INFLUENCER'}
                             </p>
                             <p className="font-black text-gray-900 text-xs truncate font-mono">
                                {c.isUgc 
                                  ? `₹${getPayout(c.budget_min).toLocaleString('en-IN')}` 
                                  : (c.budget_min === 0 ? "Barter" : (c.budget_max && c.budget_max > c.budget_min ? `₹${c.budget_min.toLocaleString('en-IN')} - ₹${c.budget_max.toLocaleString('en-IN')}` : `₹${c.budget_min.toLocaleString('en-IN')}`))}
                             </p>
                          </div>
                       </div>

                       <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-700 shrink-0 shadow-2xs">
                             <Megaphone size={15} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">BRAND TYPE</p>
                             <p className="font-bold text-gray-900 text-xs truncate">{c.brand_type || "Various"}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-700 shrink-0 shadow-2xs">
                             <MapPin size={15} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">LOCATION</p>
                             <p className="font-bold text-gray-900 text-xs truncate">{c.location || "Pan India"}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-700 shrink-0 shadow-2xs">
                             <Package size={15} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider">DELIVERABLES</p>
                             <p className="font-bold text-gray-900 text-xs truncate" title={Array.isArray(c.deliverables) ? c.deliverables.join(", ") : c.deliverables}>
                                {Array.isArray(c.deliverables) && c.deliverables.length > 0 ? c.deliverables.join(", ") : "1x Dedicated Video"}
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Match callout - hidden on mobile to reduce height */}
                    <div className="hidden sm:block p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs text-gray-700 space-y-1">
                       <p className="font-bold text-gray-900 flex items-center gap-1">
                          <span>Creators, it's a match!</span>
                       </p>
                       <p className="text-gray-600 line-clamp-2 text-xs leading-relaxed font-medium">
                          {c.description || "Matching content creators and influencers for this campaign."}
                       </p>
                    </div>
                 </div>

                 {/* Footer Stats */}
                 <div className="border-t border-gray-100 pt-2 sm:pt-3 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1.5"><Eye size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400 animate-eye-blink" /> {c.views || 0} Views</span>
                    <span className="flex items-center gap-1 text-[var(--violet)] font-bold">
                       <div className="flex -space-x-1.5 mr-0.5 sm:mr-1">
                          {getCampaignAvatars(c, c.applied || 2, 4).map((avatarUrl, idx) => (
                             <img key={idx} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white bg-gray-100 object-cover" src={avatarUrl} alt="creator" />
                          ))}
                       </div>
                       {c.isUgc ? `${c.rawUgcBrief?.claimed_count || 0}+ claimed` : `${c.applied || 0}+ creators applied`}
                    </span>
                 </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl">
             <div className="w-16 h-16 rounded-full bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
               <Search size={24} />
             </div>
             <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">No campaigns found</h3>
             <p className="text-[var(--text-secondary)] text-sm max-w-sm">We couldn't find any campaigns matching your current filters. Try adjusting them to see more results.</p>
          </div>
        )}
      </div>

      {/* Claim Modal */}
      <AnimatePresence>
        {selectedBrief && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={()=>setSelectedBrief(null)} />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 max-w-lg w-full relative z-10 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
               {/* Close button */}
               <button 
                 onClick={() => setSelectedBrief(null)} 
                 className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center font-bold transition-colors"
                 title="Close"
               >
                 &times;
               </button>

               {user && user.role === "creator" ? (
                 <div className="flex flex-col h-full overflow-hidden">
                   <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-2">
                     <div className="inline-flex items-center gap-1.5 bg-[var(--violet-soft)] text-[var(--violet)] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-[var(--violet-border)] mb-1">
                       <Zap size={10} /> 22-Hour Delivery Promise
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
                       <ul className="text-xs text-emerald-600 font-medium space-y-1">
                         {selectedBrief.dos?.[0] ? selectedBrief.dos?.map((d, i) => <li key={i}>✅ {d}</li>) : <li>No specific requirements</li>}
                       </ul>
                     </div>
                     {selectedBrief.donts?.[0] && (
                       <div>
                         <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Must Not Do</h4>
                         <ul className="text-xs text-[#ef4444] space-y-1">
                           {selectedBrief.donts?.map((d, i) => <li key={i}>❌ {d}</li>)}
                         </ul>
                       </div>
                     )}

                     <div className="bg-[var(--bg-elevated)] border border-[var(--violet)]/30 rounded-xl p-3.5 mt-2">
                       <p className="text-xs font-medium text-[var(--text-secondary)]">By claiming this brief, you commit to delivering the video within exactly 22 hours. Missing the deadline will cancel the order.</p>
                       <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--violet)]/20">
                         <span className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-bold">Your Payout</span>
                         <span className="text-[#027A48] font-bold text-xl font-sans">₹{getPayout(selectedBrief.budget).toLocaleString()}</span>
                       </div>
                     </div>
                   </div>

                   {(() => {
                     const matchingOrder = (myOrders || []).find(o => 
                       (o.brief_id && String(o.brief_id) === String(selectedBrief?.id)) ||
                       (o.brief?.id && String(o.brief.id) === String(selectedBrief?.id)) ||
                       (o.deal_id && String(o.deal_id) === String(selectedBrief?.id))
                     );
                     const isApplied = Boolean(matchingOrder);

                     if (isApplied) {
                       return (
                         <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 mt-auto border-t border-[var(--border-default)] shrink-0 w-full">
                           <button
                             type="button"
                             onClick={() => setSelectedBrief(null)}
                             className="w-full sm:w-auto px-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-default)] active:scale-95 transition-transform text-xs sm:text-sm cursor-pointer"
                           >
                             Close
                           </button>

                           <div className="relative flex-1 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider text-xs sm:text-sm overflow-hidden shadow-xs">
                             <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                             <span>Already applied</span>
                             <span className="absolute top-0 bottom-0 left-0 w-full bg-white opacity-50 animate-shine pointer-events-none"></span>
                           </div>

                           <button
                             type="button"
                             onClick={() => {
                               const targetOrderId = matchingOrder?.id || matchingOrder?.deal_id;
                               setSelectedBrief(null);
                               navigate(targetOrderId ? `/ugc?tab=manage&orderId=${targetOrderId}` : `/ugc?tab=manage`);
                             }}
                             className="flex-1 w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold uppercase tracking-wider py-3 px-4 rounded-xl active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.3)] text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                           >
                             <span>Go to manage orders</span>
                             <ArrowRight size={16} />
                           </button>
                         </div>
                       );
                     }

                     return (
                       <div className="flex gap-3 pt-3 mt-auto border-t border-[var(--border-default)] shrink-0">
                         <button onClick={() => setSelectedBrief(null)} className="w-1/3 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-default)] active:scale-95 transition-transform text-xs sm:text-sm">Cancel</button>
                         <button onClick={handleClaim} className="flex-1 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-black uppercase tracking-wider py-3 rounded-xl active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.3)] text-xs sm:text-sm flex items-center justify-center gap-2">
                           <Zap size={16} /> I Commit — Claim Now
                         </button>
                       </div>
                     );
                   })()}
                 </div>
               ) : (
                 <div className="text-center p-4 sm:p-6 flex flex-col items-center justify-center gap-4 relative my-auto">
                   <div className="w-14 h-14 rounded-full bg-[var(--violet-soft)] border border-[var(--violet-border)] flex items-center justify-center text-2xl mb-1">🔒</div>
                   <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-tight">Sign in as a creator to claim this order</h3>
                   <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
                     You need a creator account to claim high-priority UGC briefs and start producing original mobile-optimized reviews.
                   </p>
                   <div className="flex gap-3 w-full mt-2">
                     <button onClick={() => setSelectedBrief(null)} className="flex-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-default)] active:scale-95 transition-transform text-sm">
                       Cancel
                     </button>
                     <button 
                       onClick={() => {
                         setSelectedBrief(null);
                         navigate("/login?role=creator");
                       }}
                       className="flex-1 px-6 py-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                     >
                       Sign In to Claim
                     </button>
                   </div>
                 </div>
               )}
             </motion.div>
           </div>
         )}
       </AnimatePresence>

      {showUGCContractModal && claimedData && (
        <UGCContractModal
          brief={claimedData.brief}
          orderId={claimedData.order_id}
          threadId={claimedData.thread_id}
          onClose={() => {
            setShowUGCContractModal(false);
            setClaimedData(null);
            // Was `loadData()` — a function that does not exist in this file. It threw a
            // ReferenceError the moment a creator closed the claim modal. The only loader
            // here, fetchCampaigns, is scoped inside a useEffect and cannot be called from
            // this callback, so the refresh is simply dropped rather than faked.
          }}
          onSigned={(signedOrderId) => {
            setShowUGCContractModal(false);
            const targetId = signedOrderId || claimedData.order_id;
            setClaimedData(null);
            if (targetId) {
              navigate(`/creator/ugc/orders?dealId=${targetId}`);
            } else {
              navigate('/creator/ugc/orders');
            }
          }}
          onStartChat={() => {
            setShowUGCContractModal(false);
            const targetId = claimedData.order_id;
            setClaimedData(null);
            if (targetId) {
              navigate(`/creator/ugc/orders?dealId=${targetId}`);
            } else {
              navigate('/creator/ugc/orders');
            }
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
