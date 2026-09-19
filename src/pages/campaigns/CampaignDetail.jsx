import GeminiIcon from "../../components/common/GeminiIcon";
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLoading } from "../../contexts/LoadingContext";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, Send, BarChart3, X, Users, Calendar, Award, 
  MapPin, Clock, ListTodo, ShieldAlert, CheckCircle, Ban, 
  FileText, ExternalLink, HelpCircle, Share2, Heart, Flag, Check,
  Eye, IndianRupee, Megaphone, Package, Briefcase, Loader2, ChevronRight, Building
} from "lucide-react";
import BrandPublicProfileModal from "../../components/profile/BrandPublicProfileModal";
import AgencyBadge from "../../components/common/AgencyBadge";
import KycPromptModal from "../../components/common/KycPromptModal";
import { getCampaignStats } from "../../utils/campaignStats";

const getCreatorRequirementsString = (c) => {
  if (!c) return "";
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

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isKycApproved } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  
  const [c, setC] = useState(null);
  const [pitch, setPitch] = useState("");
  const [amount, setAmount] = useState("");
  const [showBrandProfileModal, setShowBrandProfileModal] = useState(false);
  const [showKycPrompt, setShowKycPrompt] = useState(false);
  
  const [applying, setApplying] = useState(false);
  const [aiRoi, setAiRoi] = useState(null);
  // Not yet wired to an endpoint — see the Re-Collaborate block below.
  const leaderboard = null;
  const [isPredictingRoi, setIsPredictingRoi] = useState(false);

  const handlePredictRoi = async () => {
    setIsPredictingRoi(true);
    try {
      const { data } = await api.post("ai/predict-roi", { campaign: c, creators: [] });
      setAiRoi(data);
    } catch (e) {
      // toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to predict ROI");
    } finally {
      setIsPredictingRoi(false);
    }
  };

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState(null);

  // New Contract Workflow States
  const [creatorName, setCreatorName] = useState("");
  const [creatorLocation, setCreatorLocation] = useState("Mumbai, Maharashtra");
  const [dueDate, setDueDate] = useState("2026-07-25");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  useEffect(() => {
    if (user && user.role === 'creator') {
      api.get(`/creators/${user.user_id}`)
        .then(({ data }) => setCreatorProfile(data))
        .catch((e) => console.warn('Failed to load creator profile', e));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setCreatorName(user.name || undefined);
    }
  }, [user]);

  useEffect(() => {
    if (c) {
      if (c.campaign_id === "c_bread_1" || id === "c_bread_1") {
        setTermsAndConditions(`Deliver 1 Instagram Reel and 1 Story promoting ${c?.brand_name || "the brand"}, incorporating healthy breakfast aesthetics. The video must show the crispy crust and fluffy interior. Tag @goldencrust.`);
      } else {
        setTermsAndConditions(`Deliver high-quality content showcasing key elements of the campaign: "${c.title}". Keep aesthetics clean, tag the official brand account, and maintain high engagement.`);
      }
      setDueDate(c.deadline || "2026-07-25");
    }
  }, [c, id]);

  const isCategoryMatched = () => {
    if (!user || user.role !== "creator" || !creatorProfile || !c) return true;
    
    const subCats = Array.isArray(creatorProfile.sub_categories) ? creatorProfile.sub_categories : [];
    const rawNiches = [
      creatorProfile.category,
      creatorProfile.primary_niche,
      creatorProfile.content_niches,
      ...subCats
    ].filter(Boolean).map(n => n.toLowerCase().trim());
    // De-duplicate — category/primary_niche can legitimately hold the same
    // value, and we don't want that to show up twice in the match list.
    const creatorNiches = [...new Set(rawNiches)];

    if (creatorNiches.length === 0) return false;

    const campCategories = (c.categories || []).map(cat => cat.toLowerCase().trim());
    if (campCategories.length === 0) return true;

    const getKeywords = (str) => {
      return str
        .replace(/[&,]/g, " ")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2 && w !== "and" && w !== "the" && w !== "for" && w !== "with");
    };

    const creatorKeywords = creatorNiches.flatMap(getKeywords);
    const campKeywords = campCategories.flatMap(getKeywords);

    const hasKeywordOverlap = campKeywords.some(campWord => 
      creatorKeywords.some(creatorWord => 
        creatorWord.includes(campWord) || campWord.includes(creatorWord)
      )
    );

    if (hasKeywordOverlap) return true;

    return campCategories.some(campCat => 
      creatorNiches.some(creatorNiche => 
        creatorNiche.includes(campCat) || campCat.includes(creatorNiche)
      )
    );
  };

  const onApplyClick = () => {
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login?role=creator");
      return;
    }
    if (!isKycApproved) {
      setShowKycPrompt(true);
      return;
    }
    if (!isCategoryMatched()) {
      const campCatsStr = (c.categories || []).join(", ");
      const creatorCatsStr = [creatorProfile?.category, creatorProfile?.primary_niche, creatorProfile?.content_niches].filter(Boolean).join(", ");
      toast.error(`Your content category (${creatorCatsStr}) does not match this campaign's target categories (${campCatsStr}). Only matching creators can apply.`);
      return;
    }
    setApplyModalOpen(true);
  };

  const loadCampaignData = () => {
    startLoading();
    api.get(`/campaigns/${id}`)
      .then(({ data }) => {
        if (!data) {
          toast.error("Campaign not found");
          stopLoading();
          return;
        }
        const camp = {
          ...data,
          title: data.title || "Campaign",
          brand_name: data.brand_name || "Brand Partner",
          brand_logo: data.brand_logo || "",
          categories: Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : ["General"]),
          budget_min: data.budget_min !== undefined ? data.budget_min : 0,
          budget_max: data.budget_max !== undefined ? data.budget_max : 0,
          deliverables: Array.isArray(data.deliverables) && data.deliverables.length 
            ? data.deliverables 
            : (data.deliverables ? [data.deliverables] : ["1 Dedicated Reel"]),
          brand_type: data.brand_type || (Array.isArray(data.categories) && data.categories[0]) || "Brand Partner",
          location: data.location || data.location_type || data.city || "Pan India",
          description: data.description || "We are collaborating with an amazing brand and looking for creators to showcase this campaign.",
          follower_min: data.follower_min,
          follower_max: data.follower_max,
          gender: data.gender || "Both",
          languages: data.languages || [],
          views: getCampaignStats(data).views,
          applied: getCampaignStats(data).applied,
          creator_name: data.creator_name || "Marketing Manager",
          time_ago: data.time_ago || "Active"
        };
        setC(camp);
        setAmount(camp.budget_min ? String(camp.budget_min) : "");
        stopLoading();
      })
      .catch((err) => {
        console.error("Failed to load campaign:", err);
        toast.error("Failed to load campaign details");
        stopLoading();
      });
  };

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const handleApply = async () => {
    if (!user) { toast.error("Please login to apply"); return; }
    if (!user.onboarded) { 
      toast.error("Please complete your onboarding to apply for campaigns."); 
      window.location.href = "/onboarding";
      return; 
    }
    if (!isCategoryMatched()) {
      toast.error("Your content category does not match this campaign's target categories.");
      return;
    }
    if (user.role !== "creator") { toast.error("Only creators can apply"); return; }
    if (!amount || Number(amount) < 100) { toast.error("Please enter a valid rate estimate"); return; }
    if (pitch.length < 20) { toast.error("Please write a meaningful pitch (min 20 characters)"); return; }
    if (!creatorName.trim()) { toast.error("Please specify your display name"); return; }

    setApplying(true);
    try {
      // 1. Post application to backend
      const { data } = await api.post("campaigns/apply", { 
        campaign_id: id, 
        proposed_amount: Number(amount), 
        pitch,
        creator_name: creatorName,
        creator_location: creatorLocation,
        due_date: dueDate,
        terms_and_conditions: termsAndConditions
      });

      const activeThreadId = data.thread_id;
      setApplyModalOpen(false);
      
      // 2. Open step-by-step processing stepper!
      toast.success("Application submitted successfully! It has been moved to pending.");
      navigate("/collabs?tab=campaign_applications");


    } catch (e) { 
      const errData = e.response?.data;
      const errMsg = errData?.error?.message || errData?.error || errData?.detail || "Application failed.";
      const msgStr = typeof errMsg === 'string' ? errMsg : "Application failed.";
      if (msgStr.toLowerCase().includes("kyc") || msgStr.toLowerCase().includes("verification")) {
        setShowKycPrompt(true);
      } else {
        toast.error(msgStr);
      }
    } finally { 
      setApplying(false); 
    }
  };

  if (!c) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-6 py-16 text-center text-[var(--text-secondary)]">
        <div className="w-8 h-8 border-4 border-[var(--violet)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading details...
      </div>
    );
  }

  return (
    <div className="w-full max-w-none bg-[var(--bg-base)] text-[var(--text-primary)] min-h-screen" data-testid="campaign-detail">
      
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 font-semibold transition-colors">
          <ArrowLeft size={16} /> Back to Listings
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.success("Link copied!")} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-[var(--bg-card)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Details (Left Col) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border-default)]">
              <div 
                onClick={() => setShowBrandProfileModal(true)}
                className="flex gap-4 items-center cursor-pointer group"
                title="View Brand Profile"
              >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-[var(--border-default)] shrink-0 group-hover:border-[var(--violet)] transition-colors p-1 flex items-center justify-center shadow-xs">
                    <img src={c.brand_logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.brand_name || 'Brand')}`} alt="brand" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <div>
                    <h1 className="font-display font-black text-2xl sm:text-3xl text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors tracking-tight leading-snug">
                      {c.title}
                    </h1>
                    <p className="text-sm font-bold text-[var(--text-secondary)] mt-1 flex items-center gap-2 flex-wrap">
                      <span>by <span className="text-[var(--text-primary)] font-extrabold underline underline-offset-2 decoration-[var(--violet)]/40 group-hover:decoration-[var(--violet)]">{c.brand_name || "Brand Partner"}</span></span>
                      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                      {(c.is_agency || c.brand_is_agency) && (
                        <AgencyBadge size="xs" />
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-[var(--text-tertiary)] font-semibold">{c.time_ago || "1d ago"}</span>
                    </p>
                  </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-bold text-emerald-500 mb-6 bg-emerald-500/10 w-fit px-4 py-2 rounded-xl border border-emerald-500/20">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                <CheckCircle size={18} />
              </motion.div>
              Actively reviewing
            </div>

            <div className="mb-8">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Looking for</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {c.categories?.map((cat, i) => (
                  <span key={i} className="px-4 py-1.5 bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--violet)]/20 rounded-xl text-sm font-bold">
                    {cat}
                  </span>
                ))}
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed mt-2 font-medium">
                {getCreatorRequirementsString(c)}
              </p>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <motion.div whileHover={{ y: -2 }} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-colors hover:border-[var(--violet)]/30">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                    <IndianRupee size={18}/>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Per Influencer</p>
                    <p className="font-bold text-[var(--text-primary)] text-sm">₹{c.budget_min.toLocaleString()} {c.budget_max ? `- ₹${c.budget_max.toLocaleString()}` : '+'}</p>
                  </div>
              </motion.div>
              
              <motion.div whileHover={{ y: -2 }} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-colors hover:border-[var(--violet)]/30">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                    <Megaphone size={18}/>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Brand Type</p>
                    <p className="font-bold text-[var(--text-primary)] text-sm">{c.brand_type}</p>
                  </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-colors hover:border-[var(--violet)]/30">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                    <MapPin size={18}/>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Location</p>
                    <p className="font-bold text-[var(--text-primary)] text-sm">{c.location}</p>
                  </div>
              </motion.div>

              <motion.div whileHover={{ y: -2 }} className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-colors hover:border-[var(--violet)]/30">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                    <Package size={18}/>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Deliverables</p>
                    <div className="font-bold text-[var(--text-primary)] text-sm">
                        {c.deliverables?.map((d, i) => (
                          <div key={i} className="mb-2 whitespace-pre-wrap">{d}</div>
                        ))}
                    </div>
                  </div>
              </motion.div>
            </div>

            {/* Description Body */}
            <div>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Brief Details</p>
              <div className="text-sm text-[var(--text-primary)] leading-relaxed space-y-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-default)]">
                  <p><strong>Creators, it's a match!</strong></p>
                  <p className="whitespace-pre-wrap">{c.description}</p>
              </div>
            </div>

            {/* Re-Collaborate Smart Recommendation.
                `leaderboard` was referenced here but never declared anywhere in this file,
                so every brand opening this page threw a ReferenceError and lost the whole
                screen. Declared as null until the data source is actually wired up — the
                block then renders nothing, which is what it was meant to do with no data. */}
            {user?.role === "brand" && leaderboard?.filter(item => item.performance_score > 85).map((topCreator, idx) => {
              const deliveryPercent = Math.round((topCreator.delivered_reach / topCreator.promised_reach) * 100);
              return (
                <div key={idx} className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-[var(--violet)]/30 rounded-3xl p-6 relative overflow-hidden mt-6 shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/10 blur-3xl rounded-full" />
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[var(--violet)]/10 text-[var(--violet)] rounded-xl flex items-center justify-center shrink-0">
                      
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[var(--violet)] uppercase tracking-wider mb-1">
                        AI Re-Collaborate Recommendation
                      </h4>
                      <p className="text-sm font-bold text-gray-800 leading-relaxed">
                        Re-Collaborate Suggestion: <span className="text-[var(--violet)]">{topCreator.creator_name}</span> exceeded expectations by delivering <span className="text-emerald-600 font-extrabold">{deliveryPercent}%</span> of promised reach on-time!
                      </p>
                      <button 
                        onClick={() => {
                          toast.success(`Opening direct chat with ${topCreator.creator_name} to offer a premium contract extension...`);
                          navigate(`/chat/${topCreator.creator_id}`);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--violet)] hover:text-[var(--violet-hover)] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Extend sponsorship deal <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar (Right Col) */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 shadow-sm sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Apply to Campaign</h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-[var(--text-secondary)] flex items-center gap-1.5" title="Views">
                  <Eye size={14} className="text-[var(--text-tertiary)] animate-eye-blink" />
                  {c.views}
                </span>
                <span className="text-[var(--text-secondary)] flex items-center gap-1.5" title="Applied">
                  <Users size={14} className="text-[var(--text-tertiary)]" />
                  {c.applied}
                </span>
              </div>
            </div>
  
            {user?.role === "brand" && (
              <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
                <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  
                  <GeminiIcon className="w-4 h-4" /> Predictive AI ROI
                </h4>
                {aiRoi ? (
                  <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-default)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[var(--text-secondary)]">Est. Reach</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{aiRoi.estimatedReach?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[var(--text-secondary)]">Est. Engagement</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{aiRoi.estimatedEngagement?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs text-[var(--text-secondary)]">ROI Multiplier</span>
                      <span className="text-sm font-black text-emerald-500">{aiRoi.roiMultiplier}x</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">{aiRoi.analysis}</p>
                  </div>
                ) : (
                  <button 
                    onClick={handlePredictRoi}
                    disabled={isPredictingRoi}
                    className="w-full py-3 bg-[var(--bg-elevated)] border border-[var(--violet)]/20 hover:border-[var(--violet)]/50 text-[var(--violet)] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isPredictingRoi ? <Loader2 size={16} className="animate-spin" /> : <GeminiIcon className="w-4 h-4" />}
                    Run ROI Prediction
                  </button>
                )}
              </div>
            )}

            
            {user?.role === 'creator' ? (
              <>
                {!isCategoryMatched() && (
                  <div className="p-4 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium">
                    ⚠️ <strong>Category Mismatch</strong>
                    <p className="mt-1">
                      This campaign targets: <strong>{(c.categories || []).join(", ")}</strong>.
                    </p>
                    <p className="mt-1">
                      Your category is: <strong>{[...new Set([creatorProfile?.category, creatorProfile?.primary_niche, creatorProfile?.content_niches, ...(Array.isArray(creatorProfile?.sub_categories) ? creatorProfile.sub_categories : [])].filter(Boolean))].join(", ") || "None"}</strong>.
                    </p>
                  </div>
                )}
                <button 
                  onClick={onApplyClick}
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mb-6 ${
                    isCategoryMatched() 
                      ? "bg-[var(--violet)] text-white hover:bg-[#6b4aff]" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20 cursor-not-allowed opacity-80"
                  }`}
                >
                  Apply Now 
                </button>
              </>
            ) : (
              <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl mb-6 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Sign in as a creator to apply for this campaign.</p>
                <Link to="/login?role=creator" className="px-6 py-2.5 bg-[var(--violet)] text-white text-sm font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2">
                  Sign In to Apply
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Application Modal */}
      <AnimatePresence>
        {applyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setApplyModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] w-full max-w-xl rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <button 
                onClick={() => setApplyModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
              
              <h2 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-1">Submit Application</h2>
              <p className="text-[var(--text-secondary)] text-xs mb-6">Complete the contract details to launch the ad and notify {c.brand_name}.</p>
              
              <div className="space-y-4">
                

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wider">Display Name *</label>
                    <input 
                      type="text" 
                      value={creatorName} 
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="Your brand name"
                      className="w-full px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs focus:border-[var(--violet)] outline-none text-[var(--text-primary)] font-bold"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wider">Rate Estimate (₹) *</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs focus:border-[var(--violet)] outline-none text-[var(--text-primary)] font-bold"
                    />
                  </div>
                </div>

                {/* Pitch fit */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wider">Why are you a fit? *</label>
                  <textarea 
                    rows={2}
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    placeholder="Briefly explain your vision and why your audience matches their needs..."
                    className="w-full px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs focus:border-[var(--violet)] outline-none text-[var(--text-primary)] leading-relaxed resize-none"
                  />
                </div>

                <button 
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full py-3.5 mt-2 rounded-xl font-bold bg-[var(--violet)] text-white hover:bg-[#6b4aff] transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  {applying ? "Submitting Application..." : <><Send size={16}/> Submit Application & Start Campaign</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress / Stepper Modal */}
      <AnimatePresence>
        {false && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-strong)] w-full max-w-lg rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl text-[var(--text-primary)]"
            >
              <div className="flex flex-col items-center text-center mb-8">
                {/* Large Pulsing Ad Radar */}
                <div className="relative mb-6">
                  <motion.div 
                    animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -inset-4 bg-[var(--violet)] rounded-full blur-xl"
                  />
                  <div className="relative w-20 h-20 bg-gradient-to-tr from-[var(--violet)] to-[#5B3EE0] rounded-2xl flex items-center justify-center shadow-xl border border-[var(--violet-border)]">
                    
                  </div>
                </div>

                <h3 className="text-xl font-display font-black tracking-tight text-[var(--text-primary)] mb-2">Processing Collaboration</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">Please hold on while our automated campaign engine registers your ad and prompts the brand.</p>
              </div>

              {/* Progress Line Bar */}
              <div className="w-full bg-[var(--bg-elevated)] h-1.5 rounded-full mb-8 overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }} 
                  animate={{ width: `${(progressStep / 8) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-[var(--violet)] to-[#5B3EE0]"
                />
              </div>

              {/* Steps Checklist */}
              <div className="space-y-3.5 max-w-sm mx-auto">
                {[
                  { step: 0, label: "Bread campaign launched & verified" },
                  { step: 1, label: "Ad campaign saved in workspace" },
                  { step: 2, label: "Ad campaign marked in-progress" },
                  { step: 3, label: "Application submitted and processed" },
                  { step: 4, label: `Routing request to brand: ${c?.brand_name || "the brand"}` },
                  { step: 5, label: "Brand accepted and approved your request!" },
                  { step: 6, label: "Activating creator inbox dashboard" },
                  { step: 7, label: "AI compiled friendly contract using Gemini" }
                ].map((item) => {
                  const isActive = progressStep === item.step;
                  const isCompleted = progressStep > item.step;
                  
                  return (
                    <div 
                      key={item.step} 
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        isCompleted ? "text-emerald-500" : isActive ? "text-[var(--violet)] font-bold scale-[1.02]" : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      <div className="shrink-0">
                        {isCompleted ? (
                          <div className="w-5 h-5 bg-emerald-500/10 rounded-full border border-emerald-500 flex items-center justify-center text-emerald-500">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : isActive ? (
                          <div className="w-5 h-5 bg-[var(--violet-soft)] rounded-full border border-[var(--violet)] flex items-center justify-center text-[var(--violet)] animate-spin border-t-transparent" />
                        ) : (
                          <div className="w-5 h-5 bg-[var(--bg-elevated)] rounded-full border border-[var(--border-default)]" />
                        )}
                      </div>
                      <span className="text-xs">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BrandPublicProfileModal 
        isOpen={showBrandProfileModal} 
        onClose={() => setShowBrandProfileModal(false)} 
        brandUserId={c?.brand_user_id || c?.brand_id} 
        brandName={c?.brand_name} 
        brandLogo={c?.brand_logo} 
      />

      <KycPromptModal
        isOpen={showKycPrompt}
        onClose={() => setShowKycPrompt(false)}
        role="creator"
        actionType="apply_campaign"
      />
    </div>
  );
}
