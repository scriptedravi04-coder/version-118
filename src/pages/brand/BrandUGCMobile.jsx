import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatAmount } from "../../utils/safeFormat";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { processRazorpayPayment } from "../../lib/razorpay";
import { 
  Video, CheckCircle2, Clock, PlayCircle, Star, MessageCircle, AlertTriangle, 
  ShieldCheck, ArrowRight, RefreshCw, User, Check, X, Search, 
  Filter, Plus, ExternalLink, RotateCcw, Lock, Zap, Sparkles, 
  ChevronRight, ChevronLeft, AlertCircle, Eye, Share2, Camera, Film, 
  Download, Maximize2, FileText, Send
} from "lucide-react";
import { toast } from "sonner";
import OrderSupportModal from "../../components/chat/OrderSupportModal";

// SLA Calculation helper
function getSlaTimeLeft(deadline) {
  if (!deadline) return { text: "24h SLA Active", isUrgent: false, percent: 100 };
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: "SLA Exceeded", isUrgent: true, percent: 0 };
  const totalSlaMs = 24 * 60 * 60 * 1000;
  const percent = Math.max(0, Math.min(100, (diff / totalSlaMs) * 100));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return {
    text: `${hours}h ${minutes}m left`,
    isUrgent: diff < 6 * 60 * 60 * 1000,
    percent
  };
}

// Format Label Helper
function getFormatLabel(type) {
  switch (type) {
    case 'ugc_video_raw': return 'UGC Video (Raw)';
    case 'ugc_video_edited': return 'UGC Video (Edited)';
    case 'collaboration_reel': return 'Collaboration Reel';
    default: return 'Collaboration Reel';
  }
}

// Minimum budget calculation
function getMinBudget(type) {
  const isProd = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    !window.location.hostname.includes('run.app');
  if (!isProd) return 1;
  switch (type) {
    case 'ugc_video_raw': return 1500;
    case 'ugc_video_edited': return 2500;
    case 'collaboration_reel': return 2000;
    default: return 2000;
  }
}

export default function BrandUGCMobile({ initialTab = "briefs", initialView = "main" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Primary State
  const [activeTab, setActiveTab] = useState(initialTab); // 'briefs' | 'orders'
  const [view, setView] = useState(initialView); // 'main' | 'post' | 'order-detail'
  
  // Data State
  const [briefs, setBriefs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchOpen, setSearchOpen] = useState(false);
  const [briefSearch, setBriefSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all"); // 'all' | 'review' | 'in_progress' | 'done'

  // Selected Order for Detail View
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // FAB Menu State (Screen 01b)
  const [fabOpen, setFabOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Post Brief Wizard State (Screens 03-07)
  const [postStep, setPostStep] = useState(1);
  const [postData, setPostData] = useState({
    title: "",
    product_name: "",
    product_description: "",
    detailed_requirements: "",
    sample_content_url: "",
    deliverable_type: "collaboration_reel",
    video_duration: "30s",
    budget: 2000,
    max_creators: 1,
    dos: ["Show product texture clearly in natural daylight", "Include first 3-second hook"],
    donts: ["Do not mention competitor brand names", "Do not use heavy artificial smoothing filters"]
  });

  // Modals & Bottom Sheets
  const [showLivePreview, setShowLivePreview] = useState(false); // Screen 08
  const [showApprovedModal, setShowApprovedModal] = useState(false); // Screen 11
  const [approvedOrderData, setApprovedOrderData] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [approvingOrder, setApprovingOrder] = useState(false);
  const [showApplicantsSheet, setShowApplicantsSheet] = useState(false);
  const [activeBriefForApplicants, setActiveBriefForApplicants] = useState(null);
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Check LocalStorage for draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem("ugc_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && (parsed.title || parsed.product_name)) {
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync draft to LocalStorage
  useEffect(() => {
    if (view === "post" && (postData.title || postData.product_name)) {
      try {
        localStorage.setItem("ugc_draft", JSON.stringify(postData));
        setHasDraft(true);
      } catch (e) {}
    }
  }, [postData, view]);

  // Fetch Briefs and Orders from real APIs
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [briefsRes, ordersRes] = await Promise.allSettled([
        api.get("ugc/briefs/my"),
        api.get("ugc/orders/brand")
      ]);

      if (briefsRes.status === "fulfilled") {
        setBriefs(briefsRes.value?.data || []);
      }
      if (ordersRes.status === "fulfilled") {
        const rawOrders = ordersRes.value?.data?.orders || ordersRes.value?.data || [];
        setOrders(Array.isArray(rawOrders) ? rawOrders : []);
      }
    } catch (err) {
      console.error("Error fetching mobile UGC data:", err);
      toast.error("Failed to load UGC data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Keep selected order synchronized with orders list
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const found = orders.find(o => String(o.id) === String(selectedOrderId));
      if (found) setSelectedOrder(found);
    }
  }, [selectedOrderId, orders]);

  // Filtered Briefs
  const filteredBriefs = useMemo(() => {
    if (!briefSearch.trim()) return briefs;
    const q = briefSearch.toLowerCase();
    return briefs.filter(b => 
      (b.title || "").toLowerCase().includes(q) ||
      (b.product_name || "").toLowerCase().includes(q)
    );
  }, [briefs, briefSearch]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Stage mapping
      const stage = (o.stage || o.status || "").toUpperCase();
      if (orderFilter === "review" && stage !== "IN_REVIEW" && stage !== "SUBMITTED" && stage !== "REVISION_DECLINED") return false;
      if (orderFilter === "in_progress" && stage !== "IN_PROGRESS" && stage !== "ACCEPTED") return false;
      if (orderFilter === "done" && stage !== "COMPLETED" && stage !== "PAID") return false;

      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matches = 
          (o.title || o.campaign_title || "").toLowerCase().includes(q) ||
          (o.creator_name || o.creatorName || "").toLowerCase().includes(q) ||
          (o.order_number || o.id || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  // Handle Resume Draft
  const handleResumeDraft = () => {
    try {
      const draft = localStorage.getItem("ugc_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        setPostData(prev => ({ ...prev, ...parsed }));
        toast.success("Resumed saved draft");
      }
    } catch (e) {}
    setFabOpen(false);
    setView("post");
  };

  // Handle New Brief Start
  const handleStartNewBrief = () => {
    setPostData({
      title: "",
      product_name: "",
      product_description: "",
      detailed_requirements: "",
      sample_content_url: "",
      deliverable_type: "collaboration_reel",
      video_duration: "30s",
      budget: getMinBudget("collaboration_reel"),
      max_creators: 1,
      dos: ["Show product texture clearly in natural daylight", "Include first 3-second hook"],
      donts: ["Do not mention competitor brand names", "Do not use heavy artificial smoothing filters"]
    });
    setPostStep(1);
    setFabOpen(false);
    setView("post");
  };

  // AI Brief Generator / Enhancer
  const handleGenerateWithAi = async (customPrompt = "") => {
    setAiGenerating(true);
    toast.loading("Generating high-converting UGC brief with AI...", { id: "ai-brief" });
    try {
      const res = await api.post("/ugc/ai-generate-brief", {
        product_name: postData.product_name || customPrompt || "D2C Product",
        focus_area: customPrompt || "Authentic viral conversion",
        current_title: postData.title,
        current_requirements: postData.detailed_requirements
      });

      if (res.data?.ok && res.data?.data) {
        const ai = res.data.data;
        setPostData(prev => ({
          ...prev,
          title: ai.title || prev.title,
          product_name: prev.product_name || ai.product_name || prev.product_name,
          product_description: ai.product_description || prev.product_description,
          detailed_requirements: ai.detailed_requirements || prev.detailed_requirements,
          dos: Array.isArray(ai.dos) && ai.dos.length > 0 ? ai.dos : prev.dos,
          donts: Array.isArray(ai.donts) && ai.donts.length > 0 ? ai.donts : prev.donts,
          deliverable_type: ai.recommended_format || prev.deliverable_type,
          video_duration: ai.recommended_duration || prev.video_duration
        }));
        toast.success("AI brief generated! Review and tweak below.", { id: "ai-brief" });
        setShowAiAssist(false);
      } else {
        toast.error("AI response format error, please try again.", { id: "ai-brief" });
      }
    } catch (err) {
      console.error("AI Generation error:", err);
      toast.error("Could not reach AI generator. Default template applied.", { id: "ai-brief" });
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit Brief and Process Payment (Step 5 -> Screen 08 -> Pay)
  const handleProceedPayment = async () => {
    const minBudget = getMinBudget(postData.deliverable_type);
    const finalBudget = Math.max(postData.budget, minBudget);
    const totalEscrow = finalBudget * postData.max_creators;

    setShowLivePreview(false);
    toast.loading("Opening secure escrow checkout...", { id: "ugc-pay" });

    try {
      await processRazorpayPayment({
        grossAmount: totalEscrow,
        amount: totalEscrow,
        description: `Ybex UGC Escrow: ${postData.title}`,
        notes: {
          product_name: postData.product_name,
          format: postData.deliverable_type,
          creators: postData.max_creators
        },
        user: {
          name: user?.name || "Brand Partner",
          email: user?.email || ""
        },
        onSuccess: async (paymentData) => {
          toast.loading("Securing brief & locking escrow funds...", { id: "ugc-pay" });
          try {
            await api.post("ugc/briefs", {
              ...postData,
              budget: finalBudget,
              total_budget: totalEscrow,
              payment_id: paymentData?.razorpay_payment_id || paymentData?.payment_id || `escrow_ugc_${Date.now()}`
            });
            localStorage.removeItem("ugc_draft");
            setHasDraft(false);
            toast.success("Brief posted successfully! Certified creators notified.", { id: "ugc-pay" });
            setView("main");
            setActiveTab("briefs");
            fetchData();
          } catch (err) {
            console.error("Failed to save brief after payment:", err);
            toast.error(err?.response?.data?.error || "Failed to finalize brief", { id: "ugc-pay" });
          }
        },
        onError: (err) => {
          toast.error(err?.message || "Payment cancelled or failed", { id: "ugc-pay" });
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("Payment initialization failed", { id: "ugc-pay" });
    }
  };

  // Approve Order (draft or live link escrow release)
  const handleApproveOrder = async (orderId, action = null) => {
    if (approvingOrder) return;
    setApprovingOrder(true);
    const isDraft = action === 'approve_draft';
    toast.loading(isDraft ? "Approving video draft..." : "Releasing escrow payout to creator...", { id: "ugc-approve" });
    try {
      const payload = action ? { action } : {};
      const res = await api.post(`/ugc/orders/${orderId}/approve`, payload);
      if (isDraft || res.data?.message?.includes("Awaiting live links")) {
        toast.success("Video draft approved! Creator notified to post live link.", { id: "ugc-approve" });
      } else {
        toast.success("Escrow payout released! Order completed.", { id: "ugc-approve" });
        setApprovedOrderData(selectedOrder);
        setShowApprovedModal(true);
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to approve order", { id: "ugc-approve" });
    } finally {
      setApprovingOrder(false);
    }
  };

  // Submit Revision
  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!revisionNotes.trim()) {
      toast.error("Please enter revision instructions.");
      return;
    }

    setSubmittingRevision(true);
    toast.loading("Sending revision request...", { id: "ugc-rev" });
    try {
      await api.post(`/ugc/orders/${selectedOrder.id}/revision`, { notes: revisionNotes.trim() });
      toast.success("Revision requested! Creator notified.", { id: "ugc-rev" });
      setShowRevisionModal(false);
      setRevisionNotes("");
      await fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to submit revision", { id: "ugc-rev" });
    } finally {
      setSubmittingRevision(false);
    }
  };

  // ----------------------------------------------------
  // RENDER: SUB-VIEWS
  // ----------------------------------------------------

  // SCREEN 10: Order Detail View
  if (view === "order-detail" && selectedOrder) {
    const rawStatus = (selectedOrder.brand_status || selectedOrder.stage || selectedOrder.status || "IN_PROGRESS").toUpperCase();
    const liveLink = selectedOrder.live_link || (selectedOrder.proof && (selectedOrder.proof.live_link || selectedOrder.proof.link)) || null;
    const isLiveLinkSubmitted = Boolean(liveLink || rawStatus === 'PROOF_SUBMITTED' || rawStatus === 'LIVE_LINK_SUBMITTED');
    const isAwaitingLiveLink = rawStatus === 'CONTENT_APPROVED' || rawStatus === 'COMPLETED_APPROVAL' || rawStatus === 'AWAITING_LIVE_LINK';
    const isCompleted = rawStatus === "COMPLETED" || rawStatus === "PAID" || rawStatus === "RELEASED" || Boolean(selectedOrder.utr_number || selectedOrder.utrNumber);
    const isInReview = !isCompleted && !isAwaitingLiveLink && !isLiveLinkSubmitted && (rawStatus === "IN_REVIEW" || rawStatus === "SUBMITTED" || rawStatus === "CONTENT_SUBMITTED" || rawStatus === "DELIVERED" || selectedOrder.submission_link || selectedOrder.video_url);
    const deliverableType = String(selectedOrder.deliverable_type || selectedOrder.brief?.deliverable_type || "collaboration_reel").toLowerCase();
    const isCollabOrder = selectedOrder.requires_live_link !== undefined
      ? Boolean(selectedOrder.requires_live_link)
      : (selectedOrder.is_collaboration !== undefined
        ? Boolean(selectedOrder.is_collaboration)
        : (!deliverableType.includes('raw') && !deliverableType.includes('edited') && !deliverableType.startsWith('ugc_video')));

    const sla = getSlaTimeLeft(selectedOrder.deadline || selectedOrder.sla_deadline);
    const amount = Number(selectedOrder.amount || selectedOrder.budget || 2000);
    const orderNumber = selectedOrder.order_number || selectedOrder.orderNumber || `#ORD-${String(selectedOrder.id).slice(-6).toUpperCase()}`;
    const deliverableUrl = selectedOrder.deliverable_url || selectedOrder.submission_url || selectedOrder.video_url || selectedOrder.submission_link;

    return (
      <div className="min-h-screen bg-[#F2F2F7] text-[#0A0A0A] font-['DM_Sans'] pb-28 relative">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setSelectedOrderId(null);
                setView("main");
                setActiveTab("orders");
              }}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] active:bg-[#E5E5EA] flex items-center justify-center text-[#0A0A0A] transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6D28D9] bg-[#F1E8FF] px-2 py-0.5 rounded-md">
                  {orderNumber}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#0A0A0A] line-clamp-1 max-w-[200px]">
                {selectedOrder.title || selectedOrder.campaign_title || "UGC Order"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSupportModal(true)}
              className="w-9 h-9 rounded-full bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center active:scale-95 transition-all shadow-xs cursor-pointer"
              title="Open Chat"
            >
              <MessageCircle size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Progress Stage Tracker (4 steps) */}
          <div className="bg-white rounded-[20px] p-4 border border-[#E5E5EA] shadow-xs">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                {isCompleted ? "Order Completed" : isLiveLinkSubmitted ? "Live Post Review" : isAwaitingLiveLink ? "Draft Approved • Waiting for Live Link" : isInReview ? "Draft Video Review" : "In Production"}
              </span>
              <span className="text-[11px] font-bold text-[#7C3AED]">
                {isCompleted ? "Step 4 of 4" : isLiveLinkSubmitted ? "Step 3 of 4" : isAwaitingLiveLink ? "Step 2 of 4" : isInReview ? "Step 2 of 4" : "Step 1 of 4"}
              </span>
            </div>
            
            {/* 4 Steps progress bar */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <div className={`h-1.5 rounded-full ${rawStatus !== 'CANCELLED' ? 'bg-[#7C3AED]' : 'bg-gray-200'}`} />
              <div className={`h-1.5 rounded-full ${isInReview || isAwaitingLiveLink || isLiveLinkSubmitted || isCompleted ? 'bg-[#7C3AED]' : 'bg-[#E5E5EA]'}`} />
              <div className={`h-1.5 rounded-full ${isLiveLinkSubmitted || isCompleted ? 'bg-[#7C3AED]' : 'bg-[#E5E5EA]'}`} />
              <div className={`h-1.5 rounded-full ${isCompleted ? 'bg-[#10B981]' : 'bg-[#E5E5EA]'}`} />
            </div>

            <div className="flex justify-between text-[9.5px] font-bold text-[#9CA3AF] uppercase tracking-wider">
              <span className="text-[#7C3AED]">Draft</span>
              <span className={isInReview || isAwaitingLiveLink || isLiveLinkSubmitted || isCompleted ? "text-[#7C3AED]" : ""}>Approve</span>
              <span className={isLiveLinkSubmitted || isCompleted ? "text-[#7C3AED]" : ""}>Live Link</span>
              <span className={isCompleted ? "text-[#10B981]" : ""}>Payout</span>
            </div>
          </div>

          {/* Creator Info Card */}
          <div className="bg-white rounded-[20px] p-4 border border-[#E5E5EA] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white flex items-center justify-center font-bold text-base shadow-sm">
                {(selectedOrder.creator_name || selectedOrder.creatorName || "C")[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#0A0A0A]">
                    {selectedOrder.creator_name || selectedOrder.creatorName || "Verified UGC Creator"}
                  </h4>
                  <ShieldCheck size={14} className="text-[#10B981]" />
                </div>
                <p className="text-[11px] font-medium text-[#6B7280]">
                  Escrow Protected · <span className="font-bold text-[#0A0A0A]">₹{amount.toLocaleString()}</span>
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowSupportModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#F2F2F7] text-[#0A0A0A] font-bold text-xs flex items-center gap-1.5 border border-[#E5E5EA] active:scale-95 transition-all"
            >
              <MessageCircle size={13} /> Chat
            </button>
          </div>

          {/* SLA Countdown Banner */}
          <div className="bg-white rounded-[20px] p-4 border border-[#E5E5EA] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A0A0A]">
                <Clock size={15} className="text-[#7C3AED]" />
                <span>24h SLA Remaining</span>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                sla.isUrgent ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-[#F1E8FF] text-[#6D28D9]'
              }`}>
                {sla.text}
              </span>
            </div>
            <div className="w-full bg-[#E5E5EA] h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${sla.isUrgent ? 'bg-rose-500' : 'bg-[#7C3AED]'}`}
                style={{ width: `${sla.percent}%` }}
              />
            </div>
          </div>

          {/* Deliverable Video Preview Card */}
          <div className="bg-white rounded-[20px] p-4 border border-[#E5E5EA] shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  Protected Draft
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                isCompleted ? 'bg-[#E9F9EF] text-[#16A34A]' : 'bg-[#FEF7E0] text-[#B45309]'
              }`}>
                {isCompleted ? "Approved" : "Unapproved"}
              </span>
            </div>

            {/* Video Player Container */}
            <div className="relative w-full aspect-[9/16] max-h-[380px] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner group">
              {deliverableUrl && deliverableUrl.startsWith("http") ? (
                <video 
                  src={deliverableUrl} 
                  controls 
                  playsInline 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto text-white shadow-xl">
                    <PlayCircle size={38} className="text-white fill-white/20" />
                  </div>
                  <div>
                    <h5 className="text-white text-sm font-bold">Preview Video Ready</h5>
                    <p className="text-white/60 text-xs mt-1">Watermarked Draft v1 · 1080p</p>
                  </div>
                  {deliverableUrl && (
                    <a 
                      href={deliverableUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      <ExternalLink size={13} /> Open Cloud Link
                    </a>
                  )}
                </div>
              )}

              {/* Watermark Tag Overlay */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                <Lock size={10} /> Watermarked Preview
              </div>
            </div>

            {/* Deliverable Metadata */}
            <div className="flex justify-between items-center text-xs text-[#6B7280] pt-1">
              <span>Reel · {selectedOrder.duration || "30s"} · v1</span>
              <span>Submitted recently</span>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E5E5EA] p-4 z-30 shadow-lg space-y-2">
          {!isCompleted ? (
            isAwaitingLiveLink ? (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  <span>Waiting for live link from creator...</span>
                </div>
                <button 
                  onClick={() => setShowSupportModal(true)}
                  className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  Chat
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRevisionModal(true)}
                  className="flex-1 bg-[#FEF7E0] hover:bg-[#FDE68A] text-[#92400E] border border-[#F7E3AE] font-bold py-3.5 px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} /> Request Revision
                </button>

                {isCollabOrder && !isLiveLinkSubmitted ? (
                  <button 
                    disabled={approvingOrder}
                    onClick={() => handleApproveOrder(selectedOrder.id, 'approve_draft')}
                    className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-3.5 px-4 rounded-xl text-xs active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {approvingOrder ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} /> Approve Video Draft
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    disabled={approvingOrder}
                    onClick={() => handleApproveOrder(selectedOrder.id, 'approve_live_links')}
                    className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-3.5 px-4 rounded-xl text-xs active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {approvingOrder ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} /> Approve & Release ₹{amount.toLocaleString()}
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="flex items-center justify-between p-3 bg-[#E9F9EF] rounded-xl border border-[#BBF7D0] text-[#16A34A]">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 size={16} />
                <span>Order Approved & Escrow Released</span>
              </div>
              {deliverableUrl && (
                <a 
                  href={deliverableUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#16A34A] text-white px-3 py-1 rounded-lg text-xs font-bold"
                >
                  Download
                </a>
              )}
            </div>
          )}
        </div>

        {/* Revision Modal */}
        <AnimatePresence>
          {showRevisionModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowRevisionModal(false)} 
                className="fixed inset-0 bg-black/50 backdrop-blur-xs" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                className="relative bg-white w-full max-w-lg rounded-t-[26px] sm:rounded-[26px] p-6 z-10 space-y-4 max-h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#0A0A0A]">Request Free Revision</h3>
                  <button onClick={() => setShowRevisionModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Be specific about required adjustments (e.g. cut length, caption placement, lighting).
                </p>
                <textarea 
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Please show the texture at 0:08 for 2 more seconds, and update the link CTA overlay."
                  className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl p-3.5 text-xs text-[#0A0A0A] outline-none focus:border-[#7C3AED]"
                />
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowRevisionModal(false)} 
                    className="flex-1 py-3 bg-[#F2F2F7] rounded-xl text-xs font-bold text-[#0A0A0A]"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={submittingRevision}
                    onClick={handleSubmitRevision}
                    className="flex-1 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-50"
                  >
                    {submittingRevision ? "Submitting..." : "Send Request"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Screen 11: Approved Payout Modal */}
        <AnimatePresence>
          {showApprovedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="relative bg-white w-full max-w-md rounded-[28px] p-6 z-10 text-center space-y-4 shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full bg-[#E9F9EF] text-[#16A34A] flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-[#0A0A0A]">Payout Released</h3>
                  <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                    ₹{amount.toLocaleString()} has been sent to {selectedOrder.creator_name || "the creator"}. The watermark-free master file is now unlocked in your assets.
                  </p>
                </div>

                <div className="bg-[#F9F9FB] border border-[#ECECF0] rounded-2xl p-4 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Deliverable</span>
                    <span className="font-bold text-[#0A0A0A]">Reel · {selectedOrder.duration || "30s"} · Master v1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Released from Escrow</span>
                    <span className="font-bold text-[#16A34A]">₹{amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Usage Rights</span>
                    <span className="font-bold text-[#0A0A0A]">Paid Ads & Social · 6 Months</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {deliverableUrl && (
                    <a 
                      href={deliverableUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Download size={14} /> Download Master File
                    </a>
                  )}
                  <button 
                    onClick={() => {
                      setShowApprovedModal(false);
                      setSelectedOrderId(null);
                      setView("main");
                      setActiveTab("orders");
                    }}
                    className="w-full py-3 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#0A0A0A] rounded-xl font-bold text-xs"
                  >
                    Back to Orders
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Support/Chat Modal */}
        {showSupportModal && (
          <OrderSupportModal 
            isOpen={showSupportModal} 
            onClose={() => setShowSupportModal(false)} 
            orderId={selectedOrder.id} 
          />
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 03 - 07: Post UGC Brief Wizard (Mobile)
  // ----------------------------------------------------
  if (view === "post") {
    const minBudget = getMinBudget(postData.deliverable_type);
    const wordCountDesc = (postData.product_description || "").trim().split(/\s+/).filter(Boolean).length;
    const wordCountReq = (postData.detailed_requirements || "").trim().split(/\s+/).filter(Boolean).length;

    return (
      <div className="min-h-screen bg-[#F2F2F7] text-[#0A0A0A] font-['DM_Sans'] pb-28">
        {/* Post Wizard Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (postStep > 1) setPostStep(s => s - 1);
                else setView("main");
              }}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] active:bg-[#E5E5EA] flex items-center justify-center text-[#0A0A0A] transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-[#0A0A0A]">Post UGC Brief</h2>
              <p className="text-[10px] text-[#6B7280]">Step {postStep} of 5</p>
            </div>
          </div>

          <button 
            onClick={() => setShowLivePreview(true)}
            className="text-xs font-bold text-[#7C3AED] bg-[#F1E8FF] px-3 py-1.5 rounded-xl border border-[#7C3AED]/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Eye size={13} /> Preview
          </button>
        </header>

        {/* 5-Step Stepper Bar */}
        <div className="px-5 py-3 bg-white border-b border-[#E5E5EA] flex items-center justify-between">
          {[1, 2, 3, 4, 5].map(num => (
            <React.Fragment key={num}>
              <div 
                onClick={() => {
                  // Only allow jumping back, not forward past filled steps
                  if (num < postStep) setPostStep(num);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  postStep === num 
                    ? 'bg-[#7C3AED] text-white shadow-sm ring-2 ring-[#7C3AED]/20' 
                    : postStep > num 
                      ? 'bg-[#10B981] text-white' 
                      : 'bg-[#F2F2F7] text-[#9CA3AF]'
                }`}
              >
                {postStep > num ? <Check size={13} strokeWidth={3} /> : num}
              </div>
              {num < 5 && (
                <div className={`h-0.5 flex-1 mx-1.5 rounded-full ${postStep > num ? 'bg-[#10B981]' : 'bg-[#E5E5EA]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Wizard Step Content */}
        <div className="p-4 space-y-5">
          {/* STEP 1: Campaign Title & Detailed Requirements */}
          {postStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Campaign Title *
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowAiAssist(true)}
                    className="text-[10px] font-bold text-[#7C3AED] flex items-center gap-1 bg-[#F1E8FF] px-2 py-0.5 rounded-md hover:bg-[#E9D5FF] transition-all cursor-pointer"
                  >
                    <Sparkles size={11} /> AI Assist
                  </button>
                </div>

                <input 
                  type="text"
                  placeholder="e.g. Summer Skincare Unboxing & Routine"
                  value={postData.title}
                  onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                  className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-4 py-3 text-xs text-[#0A0A0A] font-medium outline-none focus:border-[#7C3AED] transition-colors"
                />

                {/* AI Quick preset tags */}
                <div className="pt-1">
                  <p className="text-[10px] text-[#9CA3AF] mb-1.5 font-bold uppercase tracking-wider">Quick Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Honest 30s Review", "Routine / How-to", "Unboxing & First Look", "Problem vs Solution"].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPostData({ ...postData, title: `${preset} - ${postData.product_name || "Product"}` })}
                        className="text-[10px] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#3F3F46] font-medium px-2.5 py-1 rounded-lg border border-[#E5E5EA]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Detailed Requirements *
                    </label>
                    <span className={`text-[10px] font-bold ${wordCountReq > 200 ? 'text-rose-500' : 'text-[#9CA3AF]'}`}>
                      {wordCountReq} / 200 words
                    </span>
                  </div>
                  <textarea 
                    rows={4}
                    placeholder="Describe what you expect from the creator: tone, key product benefits to highlight, call to action (Min 10 chars, Max 200 words)..."
                    value={postData.detailed_requirements}
                    onChange={(e) => setPostData({ ...postData, detailed_requirements: e.target.value })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl p-3.5 text-xs text-[#0A0A0A] font-medium outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (postData.title.trim().length < 5) {
                    toast.error("Campaign Title must be at least 5 characters");
                    return;
                  }
                  if (postData.detailed_requirements.trim().length < 10) {
                    toast.error("Requirements must be at least 10 characters");
                    return;
                  }
                  if (wordCountReq > 200) {
                    toast.error("Requirements exceed 200 words");
                    return;
                  }
                  setPostStep(2);
                }}
                className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Next: Product Info
              </button>
            </div>
          )}

          {/* STEP 2: Product Info */}
          {postStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Product Name *
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Hydrating Barrier Repair Serum"
                    value={postData.product_name}
                    onChange={(e) => setPostData({ ...postData, product_name: e.target.value })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-4 py-3 text-xs text-[#0A0A0A] font-medium outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5">
                    Sample Content URL (Optional)
                  </label>
                  <input 
                    type="url"
                    placeholder="https://instagram.com/reel/... (Reference Reel)"
                    value={postData.sample_content_url}
                    onChange={(e) => setPostData({ ...postData, sample_content_url: e.target.value })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-4 py-3 text-xs text-[#0A0A0A] font-medium outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Product Description *
                    </label>
                    <span className={`text-[10px] font-bold ${wordCountDesc > 100 ? 'text-rose-500' : 'text-[#9CA3AF]'}`}>
                      {wordCountDesc} / 100 words
                    </span>
                  </div>
                  <textarea 
                    rows={3}
                    placeholder="Briefly describe what the product does and why buyers love it..."
                    value={postData.product_description}
                    onChange={(e) => setPostData({ ...postData, product_description: e.target.value })}
                    className="w-full bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl p-3.5 text-xs text-[#0A0A0A] font-medium outline-none focus:border-[#7C3AED]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPostStep(1)} 
                  className="flex-1 py-4 bg-[#F2F2F7] text-[#0A0A0A] rounded-2xl font-bold text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    if (postData.product_name.trim().length < 2) {
                      toast.error("Product name is required");
                      return;
                    }
                    if (postData.product_description.trim().length < 10) {
                      toast.error("Product description must be at least 10 characters");
                      return;
                    }
                    if (wordCountDesc > 100) {
                      toast.error("Product description exceeds 100 words");
                      return;
                    }
                    setPostStep(3);
                  }} 
                  className="flex-[2] py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  Next: Deliverables
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Format, Duration & Rules */}
          {postStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Select Campaign Format
                </label>

                {/* Format selection cards */}
                <div className="space-y-3">
                  {/* Collaboration Reel */}
                  <div 
                    onClick={() => setPostData({ ...postData, deliverable_type: "collaboration_reel" })}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      postData.deliverable_type === 'collaboration_reel'
                        ? 'border-[#7C3AED] bg-[#F8F4FF] shadow-xs'
                        : 'border-[#E5E5EA] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          postData.deliverable_type === 'collaboration_reel' ? 'bg-[#7C3AED] text-white' : 'bg-purple-50 text-[#7C3AED]'
                        }`}>
                          <Film size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0A0A0A]">Collaboration Reel</h4>
                          <p className="text-[11px] text-[#6B7280] leading-snug mt-0.5">
                            Creator posts directly on their Instagram with brand tag.
                          </p>
                        </div>
                      </div>
                      {postData.deliverable_type === 'collaboration_reel' && (
                        <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UGC Video */}
                  <div 
                    onClick={() => {
                      if (!postData.deliverable_type.startsWith("ugc_video")) {
                        setPostData({ ...postData, deliverable_type: "ugc_video_edited" });
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      postData.deliverable_type.startsWith('ugc_video')
                        ? 'border-[#7C3AED] bg-[#F8F4FF] shadow-xs'
                        : 'border-[#E5E5EA] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          postData.deliverable_type.startsWith('ugc_video') ? 'bg-[#7C3AED] text-white' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Camera size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#0A0A0A]">UGC Video</h4>
                          <p className="text-[11px] text-[#6B7280] leading-snug mt-0.5">
                            Creator delivers files via Google Drive. You review before payout.
                          </p>
                        </div>
                      </div>
                      {postData.deliverable_type.startsWith('ugc_video') && (
                        <div className="w-5 h-5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Sub-format toggle */}
                    {postData.deliverable_type.startsWith('ugc_video') && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E5E5EA]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostData({ ...postData, deliverable_type: "ugc_video_raw" });
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            postData.deliverable_type === 'ugc_video_raw'
                              ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                              : 'bg-white text-[#6B7280] border-[#E5E5EA]'
                          }`}
                        >
                          Completely Raw
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPostData({ ...postData, deliverable_type: "ugc_video_edited" });
                          }}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            postData.deliverable_type === 'ugc_video_edited'
                              ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                              : 'bg-white text-[#6B7280] border-[#E5E5EA]'
                          }`}
                        >
                          Fully Edited
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Duration Pills */}
                {postData.deliverable_type !== 'ugc_video_raw' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                      Video Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['15s', '30s', '60s', '90s'].map(dur => (
                        <button 
                          key={dur}
                          type="button"
                          onClick={() => setPostData({ ...postData, video_duration: dur })}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            postData.video_duration === dur
                              ? 'border-[#7C3AED] bg-[#F1E8FF] text-[#7C3AED]'
                              : 'border-[#E5E5EA] bg-[#F9F9FB] text-[#3F3F46]'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules: Must DO & Must NOT DO */}
                <div className="pt-2 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Must Do
                    </label>
                    {postData.dos?.map((rule, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          value={rule}
                          onChange={(e) => {
                            const newDos = [...postData.dos];
                            newDos[idx] = e.target.value;
                            setPostData({ ...postData, dos: newDos });
                          }}
                          className="flex-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#0A0A0A]"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const newDos = postData.dos.filter((_, i) => i !== idx);
                            setPostData({ ...postData, dos: newDos });
                          }}
                          className="text-gray-400 hover:text-red-500 px-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setPostData({ ...postData, dos: [...postData.dos, ""] })}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      + Add Rule
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1">
                      <AlertCircle size={13} /> Must Not Do
                    </label>
                    {postData.donts?.map((rule, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          value={rule}
                          onChange={(e) => {
                            const newDonts = [...postData.donts];
                            newDonts[idx] = e.target.value;
                            setPostData({ ...postData, donts: newDonts });
                          }}
                          className="flex-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#0A0A0A]"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const newDonts = postData.donts.filter((_, i) => i !== idx);
                            setPostData({ ...postData, donts: newDonts });
                          }}
                          className="text-gray-400 hover:text-red-500 px-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setPostData({ ...postData, donts: [...postData.donts, ""] })}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700"
                    >
                      + Add Rule
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPostStep(2)} 
                  className="flex-1 py-4 bg-[#F2F2F7] text-[#0A0A0A] rounded-2xl font-bold text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={() => setPostStep(4)} 
                  className="flex-[2] py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  Next: Budget
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Budget & Quantity */}
          {postStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Budget per Video (₹)
                  </label>
                  <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F1E8FF] px-2.5 py-1 rounded-full">
                    Min: ₹{minBudget.toLocaleString()}
                  </span>
                </div>

                {/* Big Budget Value Display */}
                <div className="text-center py-2">
                  <div className="text-4xl font-black text-[#0A0A0A] tracking-tight">
                    ₹{Number(postData.budget || minBudget).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Minimum required for {getFormatLabel(postData.deliverable_type)} is ₹{minBudget.toLocaleString()}
                  </p>
                </div>

                {/* Slider */}
                <input 
                  type="range"
                  min={minBudget}
                  max={25000}
                  step={500}
                  value={postData.budget < minBudget ? minBudget : postData.budget}
                  onChange={(e) => setPostData({ ...postData, budget: Math.max(minBudget, Number(e.target.value)) })}
                  className="w-full accent-[#7C3AED]"
                />

                {/* Creator Count Selector */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                    Number of Creators Needed
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 5, 10].map(cnt => (
                      <button 
                        key={cnt}
                        type="button"
                        onClick={() => setPostData({ ...postData, max_creators: cnt })}
                        className={`py-2.5 rounded-xl border text-xs font-black transition-all ${
                          postData.max_creators === cnt
                            ? 'border-[#7C3AED] bg-[#F1E8FF] text-[#7C3AED] ring-2 ring-[#7C3AED]/20 shadow-xs'
                            : 'border-[#E5E5EA] bg-[#F9F9FB] text-[#3F3F46]'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Escrow total card */}
                <div className="bg-[#F8F4FF] border border-[#7C3AED]/20 rounded-xl p-3.5 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">Total Escrow Hold</span>
                    <p className="text-xs text-[#6B7280]">{postData.max_creators} creator(s) × ₹{formatAmount(postData.budget)}</p>
                  </div>
                  <span className="text-lg font-black text-[#7C3AED]">
                    ₹{(postData.budget * postData.max_creators).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPostStep(3)} 
                  className="flex-1 py-4 bg-[#F2F2F7] text-[#0A0A0A] rounded-2xl font-bold text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={() => setPostStep(5)} 
                  className="flex-[2] py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  Review & Pay
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Secure Escrow */}
          {postStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[20px] p-5 border border-[#E5E5EA] shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-black text-[#0A0A0A] leading-tight">
                    {postData.title || `Review of ${postData.product_name}`}
                  </h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">{postData.product_name}</p>
                </div>

                <div className="space-y-2.5 text-xs text-[#6B7280] pb-4 border-b border-[#E5E5EA]">
                  <div className="flex justify-between">
                    <span className="uppercase text-[10px] font-bold">Format</span>
                    <span className="font-bold text-[#7C3AED]">{getFormatLabel(postData.deliverable_type)} · {postData.video_duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase text-[10px] font-bold">Quantity</span>
                    <span className="font-bold text-[#0A0A0A]">{postData.max_creators} Creator(s)</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="uppercase text-[10px] font-bold text-[#0A0A0A]">Total Budget Escrow</span>
                    <span className="text-[#7C3AED] font-black">₹{(postData.budget * postData.max_creators).toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery Promise */}
                <div className="bg-[#F8F4FF] border border-[#7C3AED]/20 rounded-xl p-3.5 flex gap-3 text-xs text-[#6D28D9]">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-[#7C3AED]" />
                  <div>
                    <h5 className="font-bold text-[11px] uppercase tracking-wider text-[#7C3AED]">⚡ Delivery Promise</h5>
                    <p className="text-[#6D28D9]/80 text-[11px] mt-0.5 leading-relaxed">
                      {postData.deliverable_type === 'collaboration_reel'
                        ? "Creator publishes directly with live link submission. Escrow automatically releases upon live link verification."
                        : "Creator delivers video files via Google Drive within 24 hours. Brand has full approval before payment release."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setPostStep(4)} 
                  className="flex-1 py-4 bg-[#F2F2F7] text-[#0A0A0A] rounded-2xl font-bold text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={() => setShowLivePreview(true)}
                  className="flex-[2] py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Lock size={13} /> Secure Brief & Pay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Screen 08: Live Preview Bottom Sheet (Confirm before pay / preview button) */}
        <AnimatePresence>
          {showLivePreview && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowLivePreview(false)} 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white w-full rounded-t-[28px] p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
                
                <div className="text-center">
                  <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest bg-[#F1E8FF] px-2.5 py-1 rounded-full">
                    How creators will see it
                  </span>
                </div>

                {/* Preview 9:16 Mockup Card */}
                <div className="w-full max-w-[280px] mx-auto bg-slate-900 rounded-[24px] overflow-hidden aspect-[9/16] relative p-5 flex flex-col justify-between text-white shadow-2xl border border-slate-800">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold uppercase bg-[#7C3AED] text-white px-2 py-0.5 rounded-md">
                      {getFormatLabel(postData.deliverable_type)}
                    </span>
                    <span className="text-[10px] font-mono text-white/80">
                      {postData.video_duration}
                    </span>
                  </div>

                  <div className="text-center my-auto space-y-2">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-white">
                      <Video size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-2 px-2">
                      {postData.title || "UGC Campaign Title"}
                    </h4>
                    <p className="text-[11px] text-white/70 line-clamp-3 px-2">
                      {postData.product_description || "Product description preview..."}
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex justify-between items-center border border-white/10">
                    <div>
                      <span className="text-[9px] text-white/60 font-bold uppercase">Budget</span>
                      <p className="text-base font-black text-white">₹{formatAmount(postData.budget)}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                      Verified Escrow
                    </span>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="space-y-2 pt-2">
                  <button 
                    onClick={handleProceedPayment}
                    className="w-full py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock size={14} /> Proceed & Pay ₹{(postData.budget * postData.max_creators).toLocaleString()}
                  </button>
                  <button 
                    onClick={() => setShowLivePreview(false)}
                    className="w-full py-3 bg-[#F2F2F7] text-[#0A0A0A] rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Back to editing
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Prompt Assistant Sheet */}
        <AnimatePresence>
          {showAiAssist && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setShowAiAssist(false)} 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }} 
                className="relative bg-white w-full max-w-lg rounded-t-[28px] p-6 z-10 space-y-4 max-h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <h3 className="text-base font-bold text-[#0A0A0A]">AI UGC Brief Generator</h3>
                  </div>
                  <button onClick={() => setShowAiAssist(false)} className="text-gray-400">
                    <X size={20} />
                  </button>
                </div>

                <p className="text-xs text-[#6B7280]">
                  Pick a niche template or generate custom requirements powered by Gemini AI.
                </p>

                {/* Category Preset chips */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Skincare Glow Routine", prompt: "Skincare serum hydrating detan" },
                    { label: "D2C Snack / Drink", prompt: "Healthy organic energy beverage" },
                    { label: "Fitness & Gym Wear", prompt: "Athleisure gym compression activewear" },
                    { label: "Tech / App Review", prompt: "Mobile app fintech productivity tool" }
                  ].map(cat => (
                    <button
                      key={cat.label}
                      disabled={aiGenerating}
                      onClick={() => handleGenerateWithAi(cat.prompt)}
                      className="p-3 rounded-xl border border-[#E5E5EA] bg-[#F9F9FB] text-left hover:border-[#7C3AED] hover:bg-[#F8F4FF] transition-all disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-[#0A0A0A] block">{cat.label}</span>
                      <span className="text-[10px] text-[#7C3AED] font-semibold">Generate →</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    disabled={aiGenerating}
                    onClick={() => handleGenerateWithAi(postData.product_name || postData.title)}
                    className="w-full py-3.5 bg-[#7C3AED] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {aiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate from Current Form
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 01 & 09: Main Mobile UGC Tabs (My Briefs / Orders)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#0A0A0A] font-['DM_Sans'] pb-28 relative">
      {/* SCREEN 01 HEADER: Instant UGC BETA + Search + Refresh */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#0A0A0A] tracking-tight">Instant UGC</h1>
              <span className="bg-[#F1E8FF] text-[#6D28D9] font-bold text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#7C3AED]/20">
                BETA
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">
              Recruit certified creators & track 24-hour UGC orders.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                searchOpen ? 'bg-[#7C3AED] text-white' : 'bg-[#F2F2F7] text-[#0A0A0A] active:bg-[#E5E5EA]'
              }`}
              title="Search"
            >
              <Search size={16} />
            </button>
            <button 
              onClick={() => fetchData(true)}
              className="w-9 h-9 rounded-full bg-[#F2F2F7] active:bg-[#E5E5EA] flex items-center justify-center text-[#0A0A0A] transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin text-[#7C3AED]" : ""} />
            </button>
          </div>
        </div>

        {/* Collapsible Search Input */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden pt-2"
            >
              <input 
                type="text"
                autoFocus
                placeholder={activeTab === 'briefs' ? "Search by brief or product title..." : "Search by title or creator..."}
                value={activeTab === 'briefs' ? briefSearch : orderSearch}
                onChange={(e) => activeTab === 'briefs' ? setBriefSearch(e.target.value) : setOrderSearch(e.target.value)}
                className="w-full bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl px-3.5 py-2 text-xs text-[#0A0A0A] outline-none focus:border-[#7C3AED]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Segmented Tabs: My Briefs vs Orders */}
        <div className="mt-3 bg-[#F4F4F7] p-1 rounded-xl flex items-center">
          <button 
            onClick={() => setActiveTab("briefs")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "briefs" 
                ? 'bg-[#7C3AED] text-white shadow-xs' 
                : 'text-[#6B7280] hover:text-[#0A0A0A]'
            }`}
          >
            <span>My Briefs</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "briefs" ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#6B7280]'
            }`}>
              {briefs.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "orders" 
                ? 'bg-[#7C3AED] text-white shadow-xs' 
                : 'text-[#6B7280] hover:text-[#0A0A0A]'
            }`}
          >
            <span>Orders</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "orders" ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#6B7280]'
            }`}>
              {orders.length}
            </span>
          </button>
        </div>
      </header>

      {/* TAB CONTENT */}
      <div className="p-4 space-y-3.5">
        {/* ======================================================== */}
        {/* TAB: MY BRIEFS */}
        {/* ======================================================== */}
        {activeTab === "briefs" && (
          <div className="space-y-3.5">
            {loading && briefs.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-[#7C3AED] mx-auto" />
                <p className="text-xs text-[#6B7280] font-medium">Loading your UGC briefs...</p>
              </div>
            ) : filteredBriefs.length === 0 ? (
              <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5E5EA] shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center mx-auto">
                  <Film size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A0A0A]">No Briefs Found</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-xs mx-auto">
                    {briefSearch ? "No briefs match your search query." : "Post your first brief to recruit top creators and get 24-hour UGC delivery."}
                  </p>
                </div>
                <button 
                  onClick={handleStartNewBrief}
                  className="inline-flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Plus size={14} /> Post First Brief
                </button>
              </div>
            ) : (
              filteredBriefs.map(brief => {
                const claimed = brief.claimed_count || 0;
                const max = brief.max_creators || 1;
                const isAssigned = claimed >= max;
                const formatLabel = getFormatLabel(brief.deliverable_type);
                const budgetAmount = Number(brief.total_budget || brief.budget * max || brief.budget || 2000);
                const applicantsCount = brief.applications_count || brief.applicants?.length || 0;

                return (
                  <div 
                    key={brief.id}
                    className="bg-white rounded-[18px] p-4 border border-[#E5E5EA] shadow-xs space-y-3"
                  >
                    {/* Status badge & format tag */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          String(brief.status || '').toUpperCase() === 'COMPLETED' 
                            ? 'bg-teal-500' 
                            : isAssigned 
                              ? 'bg-[#7C3AED]' 
                              : 'bg-[#10B981] animate-pulse'
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          String(brief.status || '').toUpperCase() === 'COMPLETED'
                            ? 'bg-teal-50 text-teal-700'
                            : isAssigned 
                              ? 'bg-[#F1E8FF] text-[#6D28D9]' 
                              : 'bg-[#E9F9F1] text-[#047857]'
                        }`}>
                          {String(brief.status || '').toUpperCase() === 'COMPLETED' ? "Completed" : isAssigned ? "Creator Assigned" : "Finding Creator"}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#6D28D9] bg-[#F1E8FF] px-2 py-0.5 rounded-md">
                        {formatLabel}
                      </span>
                    </div>

                    {/* Brief Title & Product Name */}
                    <div>
                      <h3 className="text-sm font-bold text-[#0A0A0A] leading-snug">
                        {brief.title || `Review of ${brief.product_name}`}
                      </h3>
                      {brief.product_name && (
                        <p className="text-xs text-[#6B7280] mt-0.5 font-medium">
                          Product: <span className="text-[#0A0A0A]">{brief.product_name}</span>
                        </p>
                      )}
                    </div>

                    {/* Budget & Escrow Block */}
                    <div className="bg-[#F9F9FB] border border-[#ECECF0] rounded-[13px] p-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">Budget & Escrow</span>
                          <span className="text-sm font-black text-[#0A0A0A]">₹{budgetAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-[#7C3AED]">
                            Recruited ({claimed}/{max})
                          </span>
                          <p className="text-[9.5px] text-[#6B7280] font-medium">24h SLA Guarantee</p>
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#7C3AED] rounded-full transition-all"
                          style={{ width: `${Math.min(100, (claimed / max) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        onClick={() => {
                          setActiveBriefForApplicants(brief);
                          setShowApplicantsSheet(true);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[#3F3F46] font-bold text-xs flex items-center justify-center gap-1.5 active:bg-[#F2F2F7] transition-all cursor-pointer"
                      >
                        <Eye size={13} /> Applicants ({applicantsCount})
                      </button>

                      <button 
                        onClick={() => {
                          // Switch to orders tab or filter by this brief
                          setOrderSearch(brief.title || brief.product_name || "");
                          setActiveTab("orders");
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Manage Orders</span> <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: ORDERS (SCREEN 02 & SCREEN 09) */}
        {/* ======================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-3.5">
            {loading && orders.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw size={28} className="animate-spin text-[#7C3AED] mx-auto" />
                <p className="text-xs text-[#6B7280] font-medium">Loading your UGC orders...</p>
              </div>
            ) : orders.length === 0 ? (
              /* SCREEN 02: Orders Empty State */
              <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5E5EA] shadow-xs space-y-3.5 my-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center mx-auto">
                  <Video size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A0A0A]">No UGC Orders Found</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-xs mx-auto leading-relaxed">
                    Create your first brief to recruit top creators and get 24-hour UGC video delivery.
                  </p>
                </div>
                <button 
                  onClick={handleStartNewBrief}
                  className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={15} /> Post First Brief
                </button>
              </div>
            ) : (
              /* SCREEN 09: Manage Orders List */
              <>
                {/* Search & Filter pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: "all", label: "All" },
                    { id: "review", label: "Review" },
                    { id: "in_progress", label: "In Production" },
                    { id: "done", label: "Done" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOrderFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        orderFilter === tab.id
                          ? 'bg-[#7C3AED] text-white shadow-xs'
                          : 'bg-white border border-[#E5E5EA] text-[#6B7280] hover:text-[#0A0A0A]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Orders List */}
                <div className="space-y-3">
                  {filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-[18px] p-6 text-center border border-[#E5E5EA] text-xs text-[#6B7280]">
                      No orders match the selected filter.
                    </div>
                  ) : (
                    filteredOrders.map(order => {
                      const stage = (order.stage || order.status || "IN_PROGRESS").toUpperCase();
                      const isCompleted = stage === "COMPLETED" || stage === "PAID";
                      const isInReview = stage === "IN_REVIEW" || stage === "SUBMITTED";
                      const sla = getSlaTimeLeft(order.deadline || order.sla_deadline);
                      const amount = Number(order.amount || order.budget || 2000);
                      const orderNumber = order.order_number || order.orderNumber || `#ORD-${String(order.id).slice(-6).toUpperCase()}`;

                      return (
                        <div 
                          key={order.id}
                          className="bg-white rounded-[18px] p-4 border border-[#E5E5EA] shadow-xs space-y-3"
                        >
                          {/* Top Row: Creator Avatar + Title + Status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                {(order.creator_name || order.creatorName || "C")[0].toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#0A0A0A] line-clamp-1">
                                  {order.title || order.campaign_title || "UGC Deliverable"}
                                </h3>
                                <p className="text-[10px] text-[#6B7280] font-medium">
                                  {order.creator_name || order.creatorName || "Verified UGC Creator"} · <span className="font-mono">{orderNumber}</span>
                                </p>
                              </div>
                            </div>

                            {/* Badge */}
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                              isCompleted 
                                ? 'bg-[#E9F9EF] text-[#16A34A]' 
                                : isInReview 
                                  ? 'bg-[#FFF7E6] text-[#B45309] border border-[#FDE68A]' 
                                  : 'bg-[#EFF6FF] text-[#1D4ED8]'
                            }`}>
                              {isCompleted ? "Done" : isInReview ? "Review" : "In Production"}
                            </span>
                          </div>

                          {/* Progress & SLA */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[11px] font-medium text-[#6B7280]">
                                {isCompleted ? "Delivered & Approved" : isInReview ? "Waiting for approval" : "In production"}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[#6D28D9] flex items-center gap-1">
                                <Clock size={11} /> {sla.text}
                              </span>
                            </div>
                            <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${isCompleted ? 'bg-[#10B981]' : 'bg-[#7C3AED]'}`}
                                style={{ width: `${isCompleted ? 100 : sla.percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Escrow Held & Manage Button */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#E5E5EA]">
                            <div>
                              <span className="text-[9px] font-bold text-[#6B7280] uppercase tracking-wider block">Escrow Held</span>
                              <span className="text-xs font-black text-[#0A0A0A]">₹{amount.toLocaleString()}</span>
                            </div>

                            <button 
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setSelectedOrder(order);
                                setView("order-detail");
                              }}
                              className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                            >
                              <span>Manage order</span> <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Escrow Policy Notice Card */}
                <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3.5 flex gap-2.5 text-xs text-[#1E3A8A]">
                  <ShieldCheck size={18} className="shrink-0 text-[#2563EB]" />
                  <p className="text-[11px] leading-relaxed">
                    Escrow releases only after you approve the deliverable, or automatically if the SLA timer runs out.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SCREEN 01b: Floating Action Button (FAB) & Menu */}
      {/* ======================================================== */}
      {view === "main" && (
        <>
          {/* FAB Backdrop */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setFabOpen(false)} 
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" 
              />
            )}
          </AnimatePresence>

          {/* FAB Popup Menu */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.8, opacity: 0, y: 20 }} 
                className="fixed bottom-[164px] right-5 z-50 flex flex-col items-end gap-2.5"
              >
                {hasDraft && (
                  <button 
                    onClick={handleResumeDraft}
                    className="bg-white text-[#0A0A0A] font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-[#E5E5EA] flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={14} />
                    </div>
                    <span>Resume draft</span>
                  </button>
                )}

                <button 
                  onClick={handleStartNewBrief}
                  className="bg-white text-[#0A0A0A] font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-[#E5E5EA] flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center">
                    <Plus size={14} />
                  </div>
                  <span>New brief</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Floating Action Button (Raised cleanly above 84px bottom navbar) */}
          <button 
            onClick={() => setFabOpen(!fabOpen)}
            className="fixed bottom-[96px] right-5 z-40 w-14 h-14 rounded-[19px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-[0_14px_28px_-12px_rgba(124,58,237,.65)] active:scale-95 transition-all cursor-pointer"
            aria-label="Create Brief"
          >
            <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus size={24} strokeWidth={2.5} />
            </motion.div>
          </button>
        </>
      )}

      {/* Applicants Bottom Sheet Modal */}
      <AnimatePresence>
        {showApplicantsSheet && activeBriefForApplicants && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowApplicantsSheet(false)} 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="relative bg-white w-full max-w-lg rounded-t-[28px] p-6 z-10 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-[#0A0A0A]">Creator Applicants</h3>
                  <p className="text-xs text-[#6B7280]">{activeBriefForApplicants.title}</p>
                </div>
                <button onClick={() => setShowApplicantsSheet(false)} className="text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {activeBriefForApplicants.applicants && activeBriefForApplicants.applicants.length > 0 ? (
                  activeBriefForApplicants.applicants.map((app, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#F9F9FB] border border-[#E5E5EA] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold text-sm">
                          {(app.creator_name || "C")[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0A0A0A]">{app.creator_name || "Verified Creator"}</h4>
                          <p className="text-[10px] text-[#6B7280]">Applied recently · Certified</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          toast.success("Creator assigned to brief!");
                          setShowApplicantsSheet(false);
                          fetchData();
                        }}
                        className="px-3 py-1.5 bg-[#7C3AED] text-white font-bold text-xs rounded-xl"
                      >
                        Accept
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#6B7280] text-xs">
                    <p>No creator applicants yet.</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-1">
                      Certified creators are notified and will appear here shortly.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
