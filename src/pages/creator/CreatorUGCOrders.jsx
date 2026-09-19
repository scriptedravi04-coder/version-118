import React, { useEffect, useState, useMemo, useRef } from "react";
import { safeLower } from "../../utils/safeFormat";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useLoading } from "../../contexts/LoadingContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { Badge } from "../../components/common/Badge";
import { 
  Briefcase, MessageCircle, FileText, ChevronRight, Clock, RefreshCw, 
  Search, ArrowRight, Video, HelpCircle, ShieldCheck, Lock, Check, X
} from "lucide-react";

// Sub-components
import DealSummaryStats from "../../components/deals/DealSummaryStats";
import DealFilterTabs from "../../components/deals/DealFilterTabs";
import DealProgressStepper from "../../components/deals/DealProgressStepper";
import DealDetailDrawer from "../../components/deals/DealDetailDrawer";
import TrustBadgeRotator from "../../components/TrustBadgeRotator";

// Local Mini Countdown component
function MiniCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const updateTimer = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Deadline Exceeded");
        setIsUrgent(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m left`);
      }
      setIsUrgent(diff < 48 * 60 * 60 * 1000); // Genuine urgency: < 48 hours
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
      isUrgent ? "bg-rose-50 text-rose-500 border border-rose-100 animate-pulse" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
      <span>{timeLeft}</span>
    </div>
  );
}

// GSAP-powered payout count-up counter component
function PayoutCounter({ amount, isCompleted }) {
  const countRef = useRef(null);

  useEffect(() => {
    if (!countRef.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: amount,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (countRef.current) {
          countRef.current.innerText = "₹" + Math.floor(obj.val).toLocaleString("en-IN");
        }
      }
    });
  }, [amount]);

  if (isCompleted) {
    return (
      <div className="flex flex-col items-start">
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block leading-none">payout</span>
        <div className="mt-1 flex items-center gap-1.5 bg-emerald-50 text-emerald-600 font-mono font-black text-xs px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
          <span ref={countRef}>₹0</span>
        </div>
        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider block mt-1.5">Releasing in 2-3 days</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block leading-none">payout</span>
      <span ref={countRef} className="text-sm font-bold font-mono text-[#027A48] block mt-0.5">₹0</span>
    </div>
  );
}

export default function CreatorUGCOrders({ embedded = false, filterType = "all" }) {
  const navigate = useNavigate();

  // Raw states
  const [orders, setOrders] = useState([]); // UGC orders
  const [collabDeals, setCollabDeals] = useState([]); // Campaign collabs
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMilestoneBanner, setShowMilestoneBanner] = useState(false);
  const [milestoneType, setMilestoneType] = useState("count"); // "count" | "earnings"

  // Active filters and views
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Map raw deals to unified structures
  const unifiedDeals = useMemo(() => {
    const list = [];

    // 1. Map UGC Orders
    (orders || []).forEach(o => {
      const creatorStatus = (o.status || o.creator_status || '').toUpperCase();
      let stage = "IN_PROGRESS";

      if (creatorStatus === 'REVISION_REQUESTED' || creatorStatus === 'REVISION_REQ' || creatorStatus === 'IN_REVISION') {
        stage = "REVISION_REQUESTED";
      } else if (creatorStatus === 'SUBMITTED' || creatorStatus === 'DELIVERED') {
        stage = "IN_REVIEW";
      } else if (creatorStatus === 'COMPLETED') {
        stage = "COMPLETED";
      } else {
        stage = "IN_PROGRESS";
      }

      list.push({
        id: o.id,
        title: o.brief?.title || "UGC Video Brief",
        subtitle: o.brief?.product_name || "UGC Order",
        brandName: o.brief?.brand_name || "Brand Partner",
        brandLogo: o.brief?.brand_logo || null,
        type: "ugc_order",
        status: o.status || o.creator_status || "PENDING",
        stage,
        payout: Number(o.creator_payout ?? o.agreed_amount ?? o.escrow_amount ?? o.brief?.budget ?? o.brief?.price_per_video ?? 0),
        deadline: o.internal_deadline || o.deadline,
        deliverables: o.brief?.detailed_requirements || "",
        dos: o.brief?.dos || [],
        donts: o.brief?.donts || [],
        sampleUrl: o.brief?.sample_content_url || null,
        videoUrl: o.video_url || null,
        notes: o.creator_notes || "",
        brandUserId: o.brand_id,
        raw: o
      });
    });

    // 2. Map Campaign Deals (collabs)
    (collabDeals || []).forEach(d => {
      const status = (d.status || '').toUpperCase();
      let stage = "IN_PROGRESS";

      if (status === 'REVISION_REQUESTED' || status === 'REVISION_REQ' || status === 'CHANGES_REQUESTED') {
        stage = "REVISION_REQUESTED";
      } else if (status === 'CONTENT_SUBMITTED' || status === 'PENDING_REVIEW' || status === 'CONTENT_APPROVED' || status === 'PROOF_SUBMITTED' || status === 'PAYMENT_PENDING' || status === 'COMPLETED_APPROVAL' || status === 'UNDER_REVIEW') {
        stage = "IN_REVIEW";
      } else if (status === 'COMPLETED') {
        stage = "COMPLETED";
      } else {
        stage = "IN_PROGRESS";
      }

      list.push({
        id: d.id,
        title: d.title || d.deliverables || "Campaign Collaboration",
        subtitle: d.subtitle || d.campaign_title || "Direct Deal",
        brandName: d.brand_name || "Brand Partner",
        brandLogo: d.brand_logo || null,
        type: "campaign_deal",
        status: d.status || "PENDING",
        stage,
        payout: d.payout || d.agreed_rate || 0,
        deadline: d.deadline || d.due_date,
        deliverables: d.deliverables || "",
        dos: d.dos || [],
        donts: d.donts || [],
        sampleUrl: d.sample_url || null,
        videoUrl: d.video_url || null,
        notes: d.notes || "",
        brandUserId: d.brand_id || d.raw?.brand_id || d.raw?.from_user_id || d.brand_user_id || d.raw?.brand_user_id,
        raw: d
      });
    });

    return list.sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
  }, [orders, collabDeals]);

  useEffect(() => {
    if (unifiedDeals.length === 0) {
      setShowMilestoneBanner(false);
      return;
    }
    const completedDeals = unifiedDeals.filter(d => d.stage === "COMPLETED" || d.status?.toUpperCase() === "COMPLETED");
    const totalEarnings = completedDeals.reduce((sum, d) => sum + Number(d.payout || 0), 0);
    
    if (totalEarnings >= 25000) {
      setMilestoneType("earnings");
      setShowMilestoneBanner(true);
    } else if (unifiedDeals.length >= 3) {
      setMilestoneType("count");
      setShowMilestoneBanner(true);
    } else {
      setShowMilestoneBanner(false);
    }
  }, [unifiedDeals]);

  const loadData = async () => {
    try {
      const [ugcRes, collabRes] = await Promise.all([
        api.get("ugc/orders/creator").catch(() => ({ data: [] })),
        api.get("collabs").catch(() => ({ data: { received: [], sent: [], campaign_applications: [], waves_received: [], waves_sent: [] } }))
      ]);

      setOrders(ugcRes.data || []);
      const collabData = collabRes.data || {};
      const rawCollabs = [
        ...(collabData.received || []),
        ...(collabData.sent || []),
        ...(collabData.campaign_applications || []).map(a => ({
          id: a.application_id || a.id,
          title: a.campaign_title || a.title || "Campaign Collaboration",
          subtitle: a.brand_name || "Direct Application",
          brand_name: a.brand_name || "Brand Partner",
          brand_logo: a.brand_logo || null,
          payout: a.proposed_amount || a.payout || a.agreed_rate || 0,
          status: a.status || "ACCEPTED",
          deliverables: a.pitch || "",
          brand_id: a.brand_id || a.from_user_id || a.raw?.brand_id,
          raw: a
        })),
        ...(collabData.waves_received || []),
        ...(collabData.waves_sent || [])
      ];
      setCollabDeals(rawCollabs);
    } catch (err) {
      console.error("Error loading deals:", err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to load ongoing deals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Deals pipeline refreshed!");
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Deep link auto-open and scroll logic
  useEffect(() => {
    if (unifiedDeals.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const dealId = params.get("dealId");
    if (dealId) {
      const foundDeal = unifiedDeals.find(d => String(d.id) === String(dealId));
      if (foundDeal) {
        setSelectedDeal(foundDeal);
        
        setTimeout(() => {
          const element = document.getElementById(`deal-card-${dealId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-[var(--violet)]", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-[var(--violet)]", "ring-offset-2");
            }, 3000);
          }
        }, 500);
      }
    }
  }, [unifiedDeals]);

  // Filter deals based on active tab and search query
  const filteredDeals = useMemo(() => {
    let list = unifiedDeals;

    // Filter by filterType prop
    if (filterType === "campaign") {
      list = list?.filter(d => d.type === "campaign_deal");
    } else if (filterType === "ugc") {
      list = list?.filter(d => d.type === "ugc_order");
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list?.filter(d => 
        safeLower(d.title).includes(q) || 
        safeLower(d.brandName).includes(q) ||
        safeLower(d.subtitle).includes(q)
      );
    }

    // Active tab
    if (activeTab === "all") return list;
    if (activeTab === "awaiting_action") {
      return list?.filter(d => d.stage === "REVISION_REQUESTED");
    }
    if (activeTab === "in_progress") {
      return list?.filter(d => d.stage === "IN_PROGRESS" || d.stage === "REVISION_REQUESTED");
    }
    if (activeTab === "in_review") {
      return list?.filter(d => d.stage === "IN_REVIEW");
    }
    if (activeTab === "completed") {
      return list?.filter(d => d.stage === "COMPLETED");
    }
    return list;
  }, [unifiedDeals, activeTab, searchQuery, filterType]);

  // Handle contract signature
  const handleSignContract = async (dealId, signature, type) => {
    toast.loading("Applying electronic signature seal...", { id: "sign-deal" });
    try {
      if (type === "ugc_order") {
        await api.post(`/ugc/orders/${dealId}/sign`, { signature });
      } else {
        await api.post(`/deals/${dealId}/sign`);
      }
      toast.success("Agreement signed successfully! Deal is now active.", { id: "sign-deal" });
      await loadData();

      // Refresh drawer representation if active
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal(prev => prev ? {
          ...prev,
          stage: "IN_PROGRESS",
          status: "ACTIVE",
          raw: {
            ...prev.raw,
            agreement_signed_creator: true
          }
        } : null);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to sign contract agreement", { id: "sign-deal" });
    }
  };

  // Handle deliverable submissions
  const handleSubmitDeliverable = async (dealId, file, url, notesText, type) => {
    toast.loading("Uploading and submitting video asset...", { id: "submit-deal" });
    try {
      if (type === "ugc_order") {
        const formData = new FormData();
        if (file) {
          formData.append('file', file);
        }
        if (url.trim()) {
          formData.append('videoUrl', url.trim());
        }
        formData.append('notes', notesText || '');

        await api.post(`/ugc/order/${dealId}/submit`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post(`/deals/${dealId}/submit-draft`, {
          video_url: url,
          caption: "",
          notes: notesText
        });
      }
      toast.success("Deliverable submitted! Brand panel has been notified.", { id: "submit-deal" });
      await loadData();

      // Refresh drawer representation if active
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal(prev => prev ? {
          ...prev,
          stage: "IN_REVIEW",
          status: "SUBMITTED",
          videoUrl: url || (file ? URL.createObjectURL(file) : null),
          notes: notesText
        } : null);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to submit deliverable assets", { id: "submit-deal" });
    }
  };

  // Framer Motion layout variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 130, damping: 18 } }
  };

  return (
    <div className={embedded ? "w-full font-sans transition-colors duration-300" : "w-full min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] py-8 px-4 md:px-8 font-sans transition-colors duration-300"}>
      <div className="max-w-none space-y-6">
        
        {/* Header Section */}
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 leading-none">
                Ongoing Deals 
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <p className="text-xs text-gray-400 font-medium tracking-tight">
                  Manage agreements and upload deliverables before your timer runs out.
                </p>
                <span className="hidden sm:inline text-gray-400 font-bold">•</span>
                <TrustBadgeRotator page="ongoingDeals" />
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search brand or deal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-60 pl-9 pr-4 py-2 bg-white rounded-xl text-xs text-gray-800 border border-gray-200 outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] transition-all font-medium"
                />
              </div>

              {/* Refresh Button */}
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin text-[var(--violet)]" : ""} />
              </button>
            </div>
          </div>
        )}

        {/* Summary Stat Strip - only when not embedded */}
        {!embedded && <DealSummaryStats deals={unifiedDeals} />}

        {/* Filter Navigation Tabs */}
        <DealFilterTabs activeTab={activeTab} setActiveTab={setActiveTab} deals={unifiedDeals} />

        {/* List of Deals Container */}
        <div className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3.5 items-center w-full">
                      <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
                        <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded w-full my-2"></div>
                  <div className="flex justify-between items-center border-t border-gray-50 pt-4 mt-2">
                    <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-28"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDeals.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-100 rounded-2xl p-16 text-center max-w-xl mx-auto flex flex-col items-center justify-center shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--violet)]/10 text-[var(--violet)] rounded-full flex items-center justify-center mb-4">
                <Briefcase size={20} />
              </div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight mb-1">No active ongoing deals</h3>
              <p className="text-xs text-gray-400 font-medium max-w-xs leading-relaxed mb-6">
                {searchQuery 
                  ? "We couldn't find any deals matching your search terms." 
                  : "Any collaboration contracts, brand pitches, or active UGC briefs will appear here."}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link 
                  to="/creator/ugc/browse" 
                  className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                >
                  Browse UGC Briefs
                </Link>
                <Link 
                  to="/campaigns" 
                  className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
                >
                  Explore Campaigns
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredDeals?.map((deal, idx) => {
                const isAwaitingSig = deal.stage === "AWAITING_SIGNATURE";
                const isInProd = deal.stage === "IN_PROGRESS" || deal.stage === "REVISION_REQUESTED";

                return (
                  <motion.div
                    id={`deal-card-${deal.id}`}
                    key={`${deal.id || 'deal'}-${idx}`}
                    variants={cardVariants}
                    className="bg-white border border-gray-100/80 rounded-2xl p-5 hover:border-gray-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-sm"
                  >
                    <div className="space-y-4">
                      {/* Card Header: Brand info + Type badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {deal.brandLogo ? (
                            <img src={deal.brandLogo} alt={deal.brandName} className="w-8 h-8 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs uppercase font-sans">
                              {deal.brandName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-black text-gray-800 tracking-tight leading-none">{deal.brandName}</h4>
                            <span className="text-[10px] text-gray-400 mt-0.5 inline-block font-medium">
                              {deal.type === "ugc_order" ? "UGC Direct" : "Sponsorship"}
                            </span>
                          </div>
                        </div>

                        {/* Top right badges/timers */}
                        <div className="flex flex-col items-end gap-1">
                          {isInProd && deal.deadline && (
                            <MiniCountdown deadline={deal.deadline} />
                          )}
                          {deal.stage === "REVISION_REQUESTED" && (
                            <Badge variant="warning">
                              REVISION REQUESTED
                            </Badge>
                          )}
                          {deal.stage !== "REVISION_REQUESTED" && !isInProd && (
                            <Badge variant={deal.stage}>
                              {deal.stage?.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Card Body: Campaign brief info */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-tight group-hover:text-[var(--violet)] transition-colors">
                          {deal.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium tracking-tight mt-0.5">
                          {deal.subtitle}
                        </p>
                      </div>

                      {/* Stepper progress indicator */}
                      <DealProgressStepper stage={deal.stage} />

                      {/* Card Footer actions and payout */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex flex-col items-start">
                          <PayoutCounter amount={deal.payout} isCompleted={deal.stage === "COMPLETED"} />
                          {deal.stage !== "AWAITING_SIGNATURE" && deal.stage !== "COMPLETED" && (
                            <span className="inline-flex items-center gap-0.5 mt-1 text-[8px] text-[var(--violet)] font-bold bg-[var(--violet)]/5 px-1.5 py-0.5 rounded uppercase tracking-wider self-start">
                              <ShieldCheck size={9} /> Secured in escrow
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const isUnsigned = deal.stage === "AWAITING_SIGNATURE" || (!deal.raw?.agreement_signed_creator && deal.type === "ugc_order");
                              if (isUnsigned) {
                                toast.error("Please sign the SLA Agreement first to unlock chat with brand.");
                                setSelectedDeal(deal);
                                return;
                              }
                              let targetId = deal.raw?.thread_id || deal.thread_id || deal.raw?.id || deal.id || deal.brandUserId || deal.raw?.brand_id || deal.raw?.brand_user_id || "brand";
                              if (deal.type === "ugc_order" && deal.id) {
                                targetId = `thread_ugc_${deal.id}`;
                              } else if (deal.id && !targetId.startsWith("thread_")) {
                                targetId = `thread_camp_${deal.id}`;
                              }
                              navigate(`/chat/${targetId}`);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 ${
                              isAwaitingSig ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200" : "bg-purple-50 hover:bg-purple-100 text-[var(--violet)] border border-purple-100"
                            }`}
                            title={isAwaitingSig ? "Sign agreement to unlock chat" : "Message Brand"}
                          >
                            <MessageCircle size={13} className="stroke-[2.5]" />
                            <span>VIEW CHAT</span>
                          </button>

                          <button 
                            onClick={() => setSelectedDeal(deal)}
                            className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm shadow-[var(--violet)]/20 cursor-pointer active:scale-95"
                          >
                            <span>Manage</span>
                            <ChevronRight size={11} className="stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Slide-In Details Drawer */}
        <AnimatePresence>
          {selectedDeal && (
            <DealDetailDrawer 
              deal={selectedDeal}
              onClose={() => setSelectedDeal(null)}
              onSign={handleSignContract}
              onSubmitDeliverable={handleSubmitDeliverable}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
