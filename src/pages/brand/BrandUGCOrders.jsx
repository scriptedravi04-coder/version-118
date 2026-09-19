import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatAmount, safeLower } from "../../utils/safeFormat";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { useLoading } from "../../contexts/LoadingContext";
import { 
  Video, CheckCircle2, Clock, PlayCircle, Star, MessageCircle, AlertTriangle, 
  ShieldCheck, ArrowRight, RefreshCw, User, Check, X, Search, 
  Filter, Plus, ExternalLink, RotateCcw, Lock, Zap, Globe, FileText, ChevronRight, AlertCircle, Eye, ShieldAlert,
  Copy, Instagram, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import DealProgressStepper from "../../components/deals/DealProgressStepper";
import VideoEmbedPreview from "../../components/shared/VideoEmbedPreview";
import UniversalPreviewModal from "../../components/shared/UniversalPreviewModal";
import OrderSupportModal from "../../components/chat/OrderSupportModal";
import useIsMobile from "../../hooks/useIsMobile";
import BrandUGCMobile from "./BrandUGCMobile";

// Local Mini Countdown component for live SLA tracking
function MiniCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!deadline) return;

    const updateTimer = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("SLA Exceeded");
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m left`);
      setIsUrgent(diff < 6 * 60 * 60 * 1000); // < 6 hours
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
      isUrgent ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
      <span>{timeLeft}</span>
    </div>
  );
}

// 24H SLA Production Countdown Card
function SlaCountdownTimerCard({ deadline, isCompleted }) {
  const [timeLeft, setTimeLeft] = useState({ formatted: "24h 00m 00s", percent: 100, isOverdue: false });

  useEffect(() => {
    if (isCompleted) return;

    const calculateTimer = () => {
      const now = Date.now();
      const end = deadline ? new Date(deadline).getTime() : now + 24 * 60 * 60 * 1000;
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ formatted: "00h 00m 00s (SLA Expired)", percent: 0, isOverdue: true });
        return;
      }

      const totalSlaMs = 24 * 60 * 60 * 1000;
      const percentLeft = Math.max(0, Math.min(100, (diff / totalSlaMs) * 100));

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

      setTimeLeft({ formatted, percent: percentLeft, isOverdue: false });
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, isCompleted]);

  if (isCompleted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between text-emerald-700">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Production Completed</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-800">SLA Fulfilled</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-5 border transition-all ${
      timeLeft.isOverdue 
        ? "bg-rose-50 border-rose-200 text-rose-800" 
        : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)]"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className={timeLeft.isOverdue ? "text-rose-500 animate-spin" : "text-[var(--violet)]"} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">24H SLA Delivery Countdown</span>
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
          timeLeft.isOverdue 
            ? "bg-rose-100 text-rose-700 border border-rose-300" 
            : "bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--violet)]/20"
        }`}>
          {timeLeft.isOverdue ? "OVERDUE" : "LIVE TIMER"}
        </span>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <span className={`text-2xl font-black font-mono tracking-tight ${
          timeLeft.isOverdue ? "text-rose-600" : "text-[var(--text-primary)]"
        }`}>
          {timeLeft.formatted}
        </span>
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          {timeLeft.isOverdue ? "SLA Overdue" : "Time Remaining"}
        </span>
      </div>

      <div className="w-full bg-[var(--bg-surface)] h-2 rounded-full overflow-hidden mt-3 border border-[var(--border-default)]">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft.isOverdue 
              ? "bg-rose-500" 
              : "bg-gradient-to-r from-[var(--violet)] to-blue-500"
          }`}
          style={{ width: `${Math.max(5, timeLeft.percent)}%` }}
        />
      </div>
    </div>
  );
}

function BrandUGCOrdersDesktop({ embedded = false }) {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();

  const [orders, setOrders] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "in_production" | "pending_review" | "CHANGES_REQUESTED" | "completed"
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get("ugc/orders/brand");
      const fetchedOrders = res.data?.orders || res.data || [];
      setOrders(fetchedOrders);

      const briefRes = await api.get("ugc/briefs/my").catch(err => {
        console.error(err);
        toast.error("Failed to load your briefs.");
        return { data: [] };
      });
      const fetchedBriefs = briefRes.data?.briefs || briefRes.data || [];
      setBriefs(fetchedBriefs);

      if (fetchedOrders.length > 0) {
        setSelectedOrderId(prev => prev && fetchedOrders.some(o => String(o.id) === String(prev)) ? prev : null);
      } else {
        setSelectedOrderId(null);
      }
    } catch (e) {
      console.error("Error fetching brand UGC orders:", e);
      toast.error("Failed to load UGC orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success("Brand orders updated!");
  };

  // Mapped orders
  const mappedOrders = useMemo(() => {
    return (orders || []).map(o => {
      const rawStatus = (o.brand_status || o.status || o.creator_status || '').toUpperCase();
      const paymentStatus = (o.payment_status || '').toUpperCase();
      const utrNumber = o.utr_number || o.payout_reference || null;
      const deliveryStatus = (o.latestDelivery?.status || (Array.isArray(o.deliverables) && o.deliverables[0]?.status) || '').toUpperCase();
      const isDeclined = rawStatus === 'REVISION_DECLINED' || 
                         rawStatus === 'DECLINED_REVISION' || 
                         rawStatus === 'RESUBMISSION_DECLINED' || 
                         rawStatus === 'REVISION_DECLINED_LINKS' ||
                         rawStatus.includes('DECLINED') || 
                         deliveryStatus.includes('DECLINE');
      let stage = "IN_PROGRESS";

      // Check if deliverable was resubmitted after revision was requested
      const deliveredTime = Date.parse(o.delivered_at || '') || 0;
      const updatedTime = Date.parse(o.updated_at || '') || 0;
      const hasFreshSubmission = (rawStatus === 'SUBMITTED' || rawStatus === 'CONTENT_SUBMITTED' || rawStatus === 'DELIVERED') ||
        (deliveredTime > 0 && deliveredTime >= updatedTime && (o.submission_link || o.video_url || o.delivery_url));

      const liveLink = o.live_link || (o.proof && (o.proof.live_link || o.proof.link)) || null;
      const hasLiveLink = Boolean(liveLink);
      const isAwaitingLiveLink = rawStatus === 'CONTENT_APPROVED' || rawStatus === 'COMPLETED_APPROVAL' || rawStatus === 'AWAITING_LIVE_LINK';
      const isLiveLinkSubmitted = Boolean(hasLiveLink || rawStatus === 'PROOF_SUBMITTED' || rawStatus === 'LIVE_LINK_SUBMITTED');

      if (rawStatus === 'COMPLETED' || rawStatus === 'APPROVED' || paymentStatus === 'RELEASED' || paymentStatus === 'PAID' || utrNumber) {
        stage = "COMPLETED";
      } else if (isDeclined) {
        stage = "REVISION_DECLINED";
      } else if (rawStatus === 'REVISION_REQUESTED' || rawStatus === 'REVISION_REQ' || rawStatus === 'IN_REVISION' || rawStatus === 'REVISION_REQUESTED_LINKS') {
        stage = "REVISION_REQUESTED";
      } else if (isLiveLinkSubmitted) {
        stage = "LIVE_LINK_SUBMITTED";
      } else if (isAwaitingLiveLink) {
        stage = "AWAITING_LIVE_LINK";
      } else if (hasFreshSubmission || rawStatus === 'QUALITY_REVIEW' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'IN_REVIEW' || rawStatus === 'UNDER_REVIEW' || o.submission_link || o.video_url || o.delivery_url) {
        stage = "IN_REVIEW";
      } else {
        stage = "IN_PROGRESS";
      }

      const amount = Number(o.creator_payout ?? o.agreed_amount ?? o.escrow_amount ?? o.brief?.budget ?? o.brief?.price_per_video ?? 0);
      const title = o.brief?.title || o.title || "UGC Video Brief";
      const productName = o.brief?.product_name || o.product_name || "Product Item";
      
      let creatorName = o.creator?.name || o.creator?.full_name || o.creator_name || "Assigned Creator";
      if (creatorName.toLowerCase().includes("bypass") || creatorName.toLowerCase().includes("dev")) {
        creatorName = "Verified UGC Creator";
      }
      
      const creatorAvatar = o.creator?.avatar || o.creator?.profile_pic || o.creator_avatar;
      const creatorHandle = o.creator?.username ? `@${o.creator.username}` : "Verified UGC Creator";
      const creatorId = o.creator_user_id || o.creator?.id || o.creator_id;

      let deliverableUrl = o.submission_link || o.video_url || o.delivery_url;
      if (!deliverableUrl && o.deliverables) {
        if (Array.isArray(o.deliverables) && o.deliverables[0]) {
          deliverableUrl = o.deliverables[0].video_url || o.deliverables[0].url || o.deliverables[0];
        } else if (typeof o.deliverables === "string") {
          deliverableUrl = o.deliverables;
        }
      }

      const creatorNotes = o.creator_notes || o.notes || (Array.isArray(o.deliverables) ? o.deliverables[0]?.creator_notes : null);

      let extractedRevisionNotes = o.revision_notes || o.revision_feedback || o.brand_feedback || o.notes || "";
      if (!extractedRevisionNotes && typeof o.creator_notes === "string" && o.creator_notes.includes("Revision feedback:")) {
        extractedRevisionNotes = o.creator_notes.replace(/^Revision feedback:\s*/i, "").trim();
      }

      const deliverableType = String(o.deliverable_type || o.brief?.deliverable_type || "collaboration_reel").toLowerCase();
      const isCollabOrder = o.requires_live_link !== undefined
        ? Boolean(o.requires_live_link)
        : (o.is_collaboration !== undefined
          ? Boolean(o.is_collaboration)
          : (!deliverableType.includes('raw') && !deliverableType.includes('edited') && !deliverableType.startsWith('ugc_video')));

      return {
        id: o.id,
        orderNumber: o.order_number || `#ORD-${String(o.id).slice(-6).toUpperCase()}`,
        title,
        productName,
        creatorName,
        creatorAvatar,
        creatorHandle,
        creatorId,
        rawStatus,
        paymentStatus,
        utrNumber,
        stage,
        amount,
        deadline: o.internal_deadline || o.sla_expires_at || o.deadline,
        dos: o.brief?.dos || [],
        donts: o.brief?.donts || [],
        requirements: o.brief?.detailed_requirements || o.brief?.instructions || "",
        productDescription: o.brief?.product_description || o.brief?.description || "",
        sampleUrl: o.brief?.sample_content_url || o.brief?.sample_url || null,
        deliverableUrl,
        driveUrl: o.drive_url || null,
        liveLink,
        deliverableType,
        isCollabOrder,
        creatorNotes,
        revisionNotes: extractedRevisionNotes,
        declineReason: o.decline_reason || o.creator_notes || extractedRevisionNotes || "Creator declined the changes requested.",
        threadId: o.thread_id || o.chat_thread_id || o.thread?.id || null,
        raw: o
      };
    }).sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return mappedOrders.filter(o => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          safeLower(o.title).includes(q) ||
          safeLower(o.productName).includes(q) ||
          safeLower(o.creatorName).includes(q) ||
          safeLower(o.orderNumber).includes(q)
        );
        if (!matches) return false;
      }

      if (activeFilter === "all") return true;
      if (activeFilter === "in_production") return o.stage === "IN_PROGRESS" || o.stage === "AWAITING_LIVE_LINK";
      if (activeFilter === "pending_review") return o.stage === "IN_REVIEW" || o.stage === "LIVE_LINK_SUBMITTED" || o.stage === "REVISION_DECLINED";
      if (activeFilter === "CHANGES_REQUESTED") return o.stage === "REVISION_REQUESTED" || o.stage === "REVISION_DECLINED";
      if (activeFilter === "completed") return o.stage === "COMPLETED";
      return true;
    });
  }, [mappedOrders, searchQuery, activeFilter]);

  // Currently selected order object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return mappedOrders.find(o => String(o.id) === String(selectedOrderId)) || null;
  }, [mappedOrders, selectedOrderId]);

  // Approve Order Handler (handles draft or live link approval)
  const handleApprove = async (orderId, action = null) => {
    if (approvingId) return; // a second tap while the first is in flight duplicates the request
    setApprovingId(orderId);
    const isDraft = action === 'approve_draft';
    toast.loading(isDraft ? "Approving video draft..." : "Approving & releasing escrow payout...", { id: "brand-approve" });
    try {
      const payload = action ? { action } : {};
      const response = await api.post(`/ugc/orders/${orderId}/approve`, payload);

      if (response.data?.already_approved) {
        toast.success("This order was already approved — payout is in progress.", { id: "brand-approve" });
      } else if (response.data?.message?.includes("Awaiting live links") || isDraft) {
        toast.success("Video draft approved! Creator notified to post & submit live link.", { id: "brand-approve" });
      } else {
        toast.success("Order approved! Escrow payout released to creator.", { id: "brand-approve" });
      }

      setShowPayoutModal(false);
      await fetchOrders();
    } catch(e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to approve order", { id: "brand-approve" });
      fetchOrders();
    } finally {
      setApprovingId(null);
    }
  };

  // Submit Revision Request Handler
  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!revisionNotes.trim()) {
      toast.error("Please enter revision feedback for the creator.");
      return;
    }

    setSubmittingRevision(true);
    toast.loading("Sending revision request to creator...", { id: "brand-revision" });
    try {
      await api.post(`/ugc/orders/${selectedOrder.id}/revision`, { notes: revisionNotes.trim() });
      toast.success("Revision request sent! Creator has been notified.", { id: "brand-revision" });
      setShowRevisionModal(false);
      setRevisionNotes("");
      fetchOrders();
    } catch(e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to submit revision request", { id: "brand-revision" });
    } finally {
      setSubmittingRevision(false);
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case "IN_PROGRESS":
        return <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">In Production</span>;
      case "IN_REVIEW":
        return <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">Draft Under Review</span>;
      case "AWAITING_LIVE_LINK":
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Waiting for Live Link</span>;
      case "LIVE_LINK_SUBMITTED":
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full animate-pulse">Live Link Review</span>;
      case "REVISION_REQUESTED":
        return <span className="bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Revision Requested</span>;
      case "REVISION_DECLINED":
        return <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Revisions Declined</span>;
      case "COMPLETED":
        return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Completed & Paid</span>;
      default:
        return <span className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{stage}</span>;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[var(--violet)]" size={32} />
          <p className="text-sm text-[var(--text-tertiary)] font-semibold">Loading your brand UGC orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-8 max-w-md mx-auto my-6 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center mx-auto mb-3 border border-[var(--violet-border)]">
          <Video size={24} />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No UGC Orders Found</h3>
        <p className="text-xs text-[var(--text-tertiary)] max-w-xs mx-auto mb-5 leading-relaxed">
          Create your first brief to recruit top creators and get 24-hour UGC video delivery.
        </p>
        <Link
          to="/brand/ugc/post"
          className="inline-flex items-center gap-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} /> Post First Brief
        </Link>
      </div>
    );
  }

  const renderOrderWorkspaceContent = (selectedOrder) => {
    if (!selectedOrder) return null;
    return (
      <div className="space-y-6">
        {/* Stepper Header */}
        <DealProgressStepper 
          stage={selectedOrder.stage} 
          orderNumber={selectedOrder.orderNumber}
          brandName={selectedOrder.creatorName}
          brandLogo={selectedOrder.creatorAvatar}
          trackingCode={selectedOrder.orderNumber ? selectedOrder.orderNumber.replace('#', '') : `TRK-${selectedOrder.id}`}
          deadline={selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : null}
          title={selectedOrder.title}
          payout={selectedOrder.amount}
        />

        {/* Creator Info & Communication Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden flex items-center justify-center shrink-0">
              {selectedOrder.creatorAvatar ? (
                <img src={selectedOrder.creatorAvatar} alt={selectedOrder.creatorName} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-[var(--text-tertiary)]" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                {selectedOrder.creatorName}
                
              </h3>
              <span className="text-xs text-[var(--text-tertiary)] font-medium block mt-0.5">{selectedOrder.creatorHandle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
              selectedOrder.stage === "COMPLETED"
                ? "text-emerald-700 bg-emerald-100 border border-emerald-300"
                : "text-[var(--violet)] bg-[var(--violet)]/10 border border-[var(--violet)]/20"
            }`}>
              <ShieldCheck size={12} />
              <span>Escrow Protected (₹{formatAmount(selectedOrder.amount)})</span>
            </span>

            <button
              onClick={() => {
                const targetId = selectedOrder.threadId || selectedOrder.id || selectedOrder.creatorId;
                navigate(`/brand/inbox/${targetId}`);
              }}
              className="px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] rounded-xl border border-[var(--border-default)] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 font-bold text-xs hover:border-[var(--violet)] active:scale-95"
              title="Open Chat with Creator"
            >
              <MessageCircle size={15} className="text-[var(--violet)]" />
              <span>Chat</span>
            </button>
          </div>
        </div>

        {/* Live 24H SLA Production Countdown Card */}
        <SlaCountdownTimerCard 
          deadline={selectedOrder.deadline} 
          isCompleted={selectedOrder.stage === "COMPLETED"} 
        />

        {/* Deliverables & Actions Workspace */}
        <div className="space-y-4 pt-2 border-t border-[var(--border-default)]">
          <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center gap-1.5">
            <Video size={14} className="text-[var(--violet)]" />
            <span>Creator Deliverables & Production Assets</span>
          </h3>

          {/* CASE 1: IN PROGRESS */}
          {selectedOrder.stage === "IN_PROGRESS" && (
            <div className="bg-amber-50 border border-amber-200/80 p-5 rounded-2xl flex items-start gap-3">
              <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Video Production in Progress</h4>
                <p className="text-xs text-amber-800/90 leading-relaxed mt-0.5">
                  The creator is filming and editing your UGC reel. You will receive a notification as soon as the deliverable link is uploaded.
                </p>
              </div>
            </div>
          )}

          {/* CASE 2: PENDING REVIEW (Deliverable Submitted) */}
          {(selectedOrder.stage === "IN_REVIEW" || selectedOrder.stage === "PENDING_REVIEW") && (
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-5 rounded-2xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <PlayCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Deliverable Submitted for Review</h4>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Uploaded by creator</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Eye size={14} />
                  <span>Preview & Review Video</span>
                </button>
              </div>

              {/* Video Preview Embed Container */}
              {(selectedOrder.deliverableUrl || selectedOrder.driveUrl) && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5">
                  <VideoEmbedPreview 
                    url={selectedOrder.deliverableUrl || selectedOrder.driveUrl} 
                    isApproved={selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED"}
                    watermark={!(selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED")}
                  />
                </div>
              )}

              {/* Creator Notes */}
              {selectedOrder.creatorNotes && (
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)] block mb-0.5">Creator Notes:</span>
                  <p>{selectedOrder.creatorNotes}</p>
                </div>
              )}

              {/* Previous Revision Feedback (if creator has resubmitted after changes requested) */}
              {selectedOrder.revisionNotes && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <span>Previous Revision Requested (Need Changes):</span>
                  </div>
                  <p className="text-[var(--text-primary)] font-medium bg-[var(--bg-card)] p-2.5 rounded-lg border border-amber-500/20">
                    {selectedOrder.revisionNotes}
                  </p>
                </div>
              )}

              {/* Approval & Revision Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>Request Revision</span>
                </button>

                {selectedOrder.isCollabOrder ? (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedOrder.id, 'approve_draft')}
                    disabled={approvingId === selectedOrder.id}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    title="Approve video draft and notify creator to post & submit live link"
                  >
                    {approvingId === selectedOrder.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Approve Video Draft</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(true)}
                    disabled={approvingId === selectedOrder.id}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    {approvingId === selectedOrder.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Approve & Release Payout (₹{formatAmount(selectedOrder.amount)})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CASE 2B: AWAITING LIVE LINK (Draft Approved, Waiting for Creator to Post & Submit Link) */}
          {selectedOrder.stage === "AWAITING_LIVE_LINK" && (
            <div className="bg-[var(--bg-elevated)] border border-emerald-500/30 p-5 rounded-2xl space-y-4 shadow-xs relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">Video Draft Approved by Brand</h4>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                        Draft Approved
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">
                      Waiting for creator to publish reel/post on social media and submit the live link
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border border-[var(--border-default)] font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Eye size={14} className="text-[var(--violet)]" />
                  <span>View Approved Draft</span>
                </button>
              </div>

              {/* Video Preview Embed Container */}
              {(selectedOrder.deliverableUrl || selectedOrder.driveUrl) && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5">
                  <VideoEmbedPreview 
                    url={selectedOrder.deliverableUrl || selectedOrder.driveUrl} 
                    isApproved={true}
                    watermark={false}
                  />
                </div>
              )}

              {/* Waiting for Live Link Banner */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                      Waiting for live link submission... ⏳
                    </span>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                      The creator has been instructed to publish to their social handle. Once submitted, you can preview the live post and release payout.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetId = selectedOrder.threadId || selectedOrder.id;
                    navigate(`/brand/inbox/${targetId}`);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap self-start sm:self-auto"
                >
                  <MessageCircle size={14} />
                  <span>Chat with Creator</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 2C: LIVE LINK SUBMITTED (Review Live Post Proof & Release Escrow) */}
          {selectedOrder.stage === "LIVE_LINK_SUBMITTED" && (
            <div className="bg-[var(--bg-elevated)] border border-indigo-500/30 p-5 rounded-2xl space-y-4 shadow-xs relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 flex items-center justify-center shrink-0">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">Live Post Submitted for Verification</h4>
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                        Live Proof Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">
                      Verify the live social post before approving and releasing final escrow payout
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Link Card */}
              <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <Globe size={13} className="text-indigo-500" />
                    <span>Live Post URL:</span>
                  </span>
                  {selectedOrder.liveLink && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.liveLink);
                        toast.success("Live post link copied!");
                      }}
                      className="text-[11px] text-[var(--violet)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Copy Link</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[var(--bg-base)] rounded-xl border border-[var(--border-default)]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0">
                      <Instagram size={18} />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate font-mono">
                      {selectedOrder.liveLink || "Live post submitted"}
                    </span>
                  </div>

                  {selectedOrder.liveLink && (
                    <a
                      href={selectedOrder.liveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    >
                      <ExternalLink size={14} />
                      <span>Open Live Post ↗</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Video Preview Embed for the live link */}
              {selectedOrder.liveLink && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5">
                  <VideoEmbedPreview 
                    url={selectedOrder.liveLink} 
                    isApproved={true}
                    watermark={false}
                  />
                </div>
              )}

              {/* Approval & Revision Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>Request Revision</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPayoutModal(true)}
                  disabled={approvingId === selectedOrder.id}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  {approvingId === selectedOrder.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Approve & Release Payout (₹{formatAmount(selectedOrder.amount)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: REVISION REQUESTED */}
          {selectedOrder.stage === "REVISION_REQUESTED" && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-sm relative overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Brand Needs Some Changes</h4>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                      Revision Request
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
                    The creator has been notified and is editing the video according to your feedback.
                  </p>
                </div>
              </div>

              {/* Revision Instructions Note in Yellow Sync with Chat */}
              <div className="p-3.5 md:p-4 bg-[var(--bg-base)] border border-amber-500/30 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Need Changes (Revision Instructions):
                  </span>
                </div>
                <p className="text-xs md:text-sm text-[var(--text-primary)] font-semibold leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                  {selectedOrder.revisionNotes || "Need changes requested for deliverable."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                <div className="flex items-center gap-2">
                  <RotateCcw size={14} className="animate-spin text-amber-500" />
                  <span>Waiting for creator to upload revised content...</span>
                </div>
                {selectedOrder.threadId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/brand/inbox/${selectedOrder.threadId}`)}
                    className="text-xs font-bold text-[var(--violet)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View in Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CASE 3B: REVISION DECLINED BY CREATOR */}
          {selectedOrder.stage === "REVISION_DECLINED" && (
            <div className="bg-[var(--bg-elevated)] border border-rose-500/30 p-5 rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Revisions Declined</h4>
                    <span className="text-[10px] text-rose-500 uppercase tracking-wider font-extrabold">Creator Declined Changes</span>
                  </div>
                </div>

                {(selectedOrder.deliverableUrl || selectedOrder.driveUrl) && (
                  <button
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Eye size={14} />
                    <span>Preview Video Draft</span>
                  </button>
                )}
              </div>

              {/* Creator Decline Reason Note */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-[var(--text-primary)] font-semibold leading-relaxed">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Creator Note / Decline Reason:</span>
                <p>"{selectedOrder.declineReason || selectedOrder.revisionNotes || "Creator declined the changes requested for this deliverable."}"</p>
              </div>

              {/* Video Preview Embed Container if deliverable exists */}
              {(selectedOrder.deliverableUrl || selectedOrder.driveUrl) && (
                <div className="rounded-2xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1.5">
                  <VideoEmbedPreview 
                    url={selectedOrder.deliverableUrl || selectedOrder.driveUrl} 
                    isApproved={false}
                    watermark={true}
                  />
                </div>
              )}

              {/* 3 Action Buttons for Brand */}
              <div className="pt-3 border-t border-[var(--border-default)]">
                <div className="flex flex-col gap-2.5 w-full">
                  {/* Top Row: 2 Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                    {/* 1: Contact Support (White background) */}
                    <button
                      type="button"
                      onClick={() => setIsSupportModalOpen(true)}
                      className="w-full py-2.5 px-3 bg-white dark:bg-[var(--bg-elevated)] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                      title="Contact Ybex Dispute Mediation for support"
                    >
                      <ShieldAlert size={14} className="text-slate-600 dark:text-slate-300 shrink-0" />
                      <span className="truncate">Contact Support</span>
                    </button>

                    {/* 2: Re-request Changes (Yellow background) */}
                    <button
                      type="button"
                      onClick={() => setShowRevisionModal(true)}
                      className="w-full py-2.5 px-3 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                      title="Re-request revision with updated details"
                    >
                      <RefreshCw size={14} className="text-amber-700 dark:text-amber-300 shrink-0" />
                      <span className="truncate">Re-request Changes</span>
                    </button>
                  </div>

                  {/* 3: Approve & Release Payout (Large Green Button) */}
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedOrder.id)}
                    disabled={approvingId === selectedOrder.id}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    title="Accept deliverable draft and release payout"
                  >
                    {approvingId === selectedOrder.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Approve & Release Payout (₹{formatAmount(selectedOrder.amount)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CASE 4: APPROVED OR COMPLETED */}
          {(selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED") && (
            <div className={`p-6 rounded-2xl space-y-4 border ${
              selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${
                    selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }`}>
                    {selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                      ? "Order Completed & Payment Transferred!"
                      : "Deliverable Approved — Escrow Payout Processing"}
                  </h4>
                  <p className={`text-xs leading-relaxed ${
                    selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                      ? "text-emerald-800/90"
                      : "text-amber-800/90"
                  }`}>
                    {selectedOrder.stage === "COMPLETED" || selectedOrder.utrNumber
                      ? `₹${formatAmount(selectedOrder.amount)} escrow payout was released to ${selectedOrder.creatorName}.${selectedOrder.utrNumber ? ` (UTR: ${selectedOrder.utrNumber})` : ''}`
                      : `You have approved the video! Escrow payout of ₹${formatAmount(selectedOrder.amount)} is queued with Ybex for bank transfer to ${selectedOrder.creatorName}.`}
                  </p>
                </div>
              </div>

              {selectedOrder.deliverableUrl && (
                <div className="pt-2">
                  <a
                    href={selectedOrder.deliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm"
                  >
                    <Video size={14} />
                    <span>View Approved Video Asset</span>
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className={`w-full space-y-6 animate-in fade-in duration-300 ${embedded ? "" : "max-w-none px-4 sm:px-8 pt-6 pb-10 min-h-screen bg-[var(--bg-base)]"}`}>
      
      {/* Top Header Row (When standalone) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-default)] shadow-xs">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              Orders & SLA Tracking
              <span className="bg-[var(--violet)]/10 text-[var(--violet)] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[var(--violet)]/20">
                {orders.length} Active
              </span>
            </h1>
            <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">
              Live monitoring of creator deliverables, 24-hour SLA timers, escrow safety, and video approval.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] px-3.5 py-2 rounded-xl border border-[var(--border-default)] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-[var(--violet)]" : ""} />
              <span>Refresh</span>
            </button>

            <Link
              to="/brand/ugc/post"
              className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[var(--violet)]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Post Brief</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Split Grid Layout (Left: Orders List | Right: Workspace & Review Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Orders List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Search & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={14} />
              <input
                type="text"
                placeholder="Search by title or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "all", label: "All" },
                { id: "pending_review", label: "Review" },
                { id: "in_production", label: "In Production" },
                { id: "CHANGES_REQUESTED", label: "Revision" },
                { id: "completed", label: "Completed" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    activeFilter === f.id
                      ? "bg-[var(--violet)] text-white shadow-xs"
                      : "bg-[var(--bg-card)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl">
                <p className="text-xs text-[var(--text-tertiary)] font-medium">No orders match this filter.</p>
              </div>
            ) : (
              filteredOrders.map((o) => {
                const isSelected = selectedOrder && String(selectedOrder.id) === String(o.id);

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-[var(--bg-card)] border-[var(--violet)] shadow-md ring-2 ring-[var(--violet)]/20"
                        : "bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] overflow-hidden flex items-center justify-center shrink-0">
                          {o.creatorAvatar ? (
                            <img src={o.creatorAvatar} alt={o.creatorName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-[var(--text-tertiary)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">{o.title}</h4>
                          <span className="text-[10px] text-[var(--text-tertiary)] font-medium block truncate">
                            {o.creatorName} • {o.orderNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-default)]">
                      <div>
                        <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider block">Escrow Amount</span>
                        <span className="text-xs font-black font-mono text-[var(--text-primary)]">₹{formatAmount(o.amount)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStageBadge(o.stage)}
                      </div>
                    </div>

                    {o.stage === "IN_PROGRESS" && o.deadline && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--border-default)] flex justify-between items-center">
                        <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase">SLA Timer:</span>
                        <MiniCountdown deadline={o.deadline} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Workspace & Deliverable Review (Desktop: 8 Cols | Mobile: Slide-Up Drawer Modal) */}
        <div className="hidden lg:block lg:col-span-8">
          {!selectedOrder ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-12 text-center">
              <p className="text-sm text-[var(--text-tertiary)] font-medium">Select an order from the list to manage deliverables and release escrow payout.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              {renderOrderWorkspaceContent(selectedOrder)}
            </div>
          )}
        </div>

      </div>

      {/* MOBILE ORDER WORKSPACE SLIDE-UP DRAWER MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="w-full bg-[var(--bg-card)] border-t border-[var(--border-default)] rounded-t-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl relative"
            >
              {/* Drawer Header with Drag indicator & Close Button */}
              <div className="sticky top-0 z-20 -mt-2 -mx-2 pt-2 pb-3 bg-[var(--bg-card)] border-b border-[var(--border-default)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-[var(--border-default)] rounded-full mx-auto" />
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Order Workspace</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Close workspace"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Workspace Content */}
              {renderOrderWorkspaceContent(selectedOrder)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* REVISION REQUEST MODAL */}
      {showRevisionModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-500" />
                Request Video Revision
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5">
                  Specific Revision Instructions for {selectedOrder.creatorName}:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail exact timestamp modifications, lighting adjustments, script corrections, or audio changes required..."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full p-3.5 bg-[var(--bg-elevated)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingRevision}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {submittingRevision ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      <span>Send Revision Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrder && (
        <UniversalPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          url={selectedOrder.deliverableUrl || selectedOrder.driveUrl}
          notes={selectedOrder.creatorNotes}
          title={`${selectedOrder.title} • Video Deliverable`}
          creatorName={selectedOrder.creatorName}
          isBrand={true}
          isApproved={selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED"}
          onApprove={() => {
            setIsPreviewModalOpen(false);
            handleApprove(selectedOrder.id);
          }}
          onRequestChanges={() => {
            setIsPreviewModalOpen(false);
            setShowRevisionModal(true);
          }}
        />
      )}

      {/* Dispute / Mediation Support Modal */}
      {selectedOrder && (
        <OrderSupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          order={selectedOrder.raw}
          orderId={selectedOrder.id}
          threadId={selectedOrder.threadId}
          isUserBrand={true}
          onTicketCreated={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Payout Release Confirmation Modal */}
      {showPayoutModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-left relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Release Escrow Payout</h3>
                  <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                    Order {selectedOrder.orderNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-tertiary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)] space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>Gross Deal Budget (Escrow):</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">₹{formatAmount(selectedOrder.amount)}</span>
              </div>
              {/* The brand is charged no platform fee — the commission comes out of the
                  creator's side at payout. Showing the brand a "- ₹350 commission" line was
                  simply wrong: it is not deducted from anything they pay. The backend fee
                  calculation is untouched; only this display changed. */}
              <div className="flex justify-between items-center text-emerald-600 font-medium">
                <span>Brand Fee:</span>
                <span className="font-bold font-mono">₹0 (Zero Fee)</span>
              </div>
              <div className="pt-2 border-t border-[var(--border-default)] flex justify-between items-center font-bold">
                <span className="text-[var(--text-primary)]">Total Escrow Amount:</span>
                <span className="text-emerald-600 text-sm font-mono">
                  ₹{formatAmount(selectedOrder.amount)}
                </span>
              </div>
            </div>

            {/* This is the point of no return — money leaves escrow the moment the button is
                pressed. It was previously tertiary grey text and read as boilerplate. */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
                By confirming, you approve the creator's live post submission. The escrow payment of{" "}
                <strong className="font-mono font-black">₹{formatAmount(selectedOrder.amount)}</strong>{" "}
                will be released immediately to the creator's wallet. This cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={approvingId === selectedOrder.id}
                onClick={() => handleApprove(selectedOrder.id, 'approve_live_links')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
              >
                {approvingId === selectedOrder.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm & Release Escrow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function BrandUGCOrders({ embedded = false }) {
  const isMobile = useIsMobile();
  if (!embedded && isMobile) {
    return <BrandUGCMobile initialTab="orders" initialView="main" />;
  }
  return <BrandUGCOrdersDesktop embedded={embedded} />;
}
