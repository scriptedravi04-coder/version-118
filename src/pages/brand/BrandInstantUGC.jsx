import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../lib/api";
import { useLoading } from "../../contexts/LoadingContext";
import { Badge } from "../../components/common/Badge";
import BrandUGCOrders from "./BrandUGCOrders";
import useIsMobile from "../../hooks/useIsMobile";
import BrandUGCMobile from "./BrandUGCMobile";
import { 
  Video, CheckCircle, Clock, PlayCircle, Star, MessageCircle, AlertTriangle, 
  ShieldCheck, ArrowRight, RefreshCw, User, Check, XCircle, Search, 
  Filter, Plus, ExternalLink, Film, Camera, Eye, ThumbsUp, RotateCcw, AlertCircle, Lock
} from "lucide-react";
import { toast } from "sonner";

// 8-stage perceived progress stage sequence definition
const PERCEIVED_STAGES = [
  { id: 1, label: "Finding Creators" },
  { id: 2, label: "Creator Shortlisted" },
  { id: 3, label: "Creator Signed Agreement" },
  { id: 4, label: "Creator Started Creating Content" },
  { id: 5, label: "Video In Production" },
  { id: 6, label: "Post-Production / Editing" },
  { id: 7, label: "Final Review" },
  { id: 8, label: "Delivered" }
];

function getPerceivedStageIndex(order) {
  const status = (order.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'SUBMITTED' || order.submission_link) {
    return 7; // Stage 8: Delivered
  }
  
  // Calculate based on elapsed hours (1 stage every ~3 hours over 24h window)
  const startTime = new Date(order.claimed_at || order.created_at || Date.now()).getTime();
  const elapsedMs = Math.max(0, Date.now() - startTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // Auto-advance up to Stage 7 (Final Review) via clock
  const stageByClock = Math.min(6, Math.floor(elapsedHours / 3));
  return Math.max(0, stageByClock);
}

// Global SLA & Delivery Timer calculation logic
function getUnifiedSlaData(createdAt, slaDeadline, statusLower, claimedCount = 0, maxCreators = 1) {
  const now = Date.now();
  const isCompleted = statusLower === "completed";

  // Fix 13: Remove Date.now() fallback when deadline and createdAt are missing
  if (!slaDeadline && !createdAt) {
    return {
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
      timeText: "Deadline Pending",
      formatted: "Deadline Pending",
      timeTextColorClass: "text-slate-500 font-bold",
      timelineProgressColor: "bg-slate-300",
      boundaryColorClass: "border-2 border-slate-300",
      percent: 0,
      isExpired: false,
      needsAdminAlert: false,
      isPending: true
    };
  }

  let endMs;
  if (slaDeadline) {
    endMs = new Date(slaDeadline).getTime();
  } else {
    endMs = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  }

  if (isNaN(endMs)) {
    return {
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
      timeText: "Deadline Pending",
      formatted: "Deadline Pending",
      timeTextColorClass: "text-slate-500 font-bold",
      timelineProgressColor: "bg-slate-300",
      boundaryColorClass: "border-2 border-slate-300",
      percent: 0,
      isExpired: false,
      needsAdminAlert: false,
      isPending: true
    };
  }

  if (isCompleted) {
    return {
      hoursLeft: 24,
      minsLeft: 0,
      secsLeft: 0,
      timeText: "Delivered",
      formatted: "Delivered",
      timeTextColorClass: "text-teal-600 font-extrabold",
      timelineProgressColor: "bg-teal-500",
      boundaryColorClass: "border-2 border-teal-500",
      percent: 100,
      isExpired: false,
      needsAdminAlert: false
    };
  }

  const diffMs = endMs - now;

  if (diffMs <= 0) {
    const unassigned = claimedCount < maxCreators;
    return {
      hoursLeft: 0,
      minsLeft: 0,
      secsLeft: 0,
      timeText: unassigned ? "Expired (Admin Alerted)" : "0h 0m left",
      formatted: "00h 00m 00s",
      timeTextColorClass: "text-red-600 font-extrabold animate-pulse",
      timelineProgressColor: "bg-red-500",
      boundaryColorClass: "border-2 border-red-500 shadow-md shadow-red-500/10",
      percent: 0,
      isExpired: true,
      needsAdminAlert: unassigned
    };
  }

  const totalSlaMs = 24 * 60 * 60 * 1000;
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const secsLeft = Math.floor((diffMs % (1000 * 60)) / 1000);
  const percent = Math.max(0, Math.min(100, (diffMs / totalSlaMs) * 100));

  const timeText = `${hoursLeft}h ${minsLeft}m left`;
  const formatted = `${hoursLeft}h ${minsLeft.toString().padStart(2, '0')}m ${secsLeft.toString().padStart(2, '0')}s`;

  let timeTextColorClass = "text-emerald-600 font-extrabold";
  let timelineProgressColor = "bg-emerald-500";
  let boundaryColorClass = "border-2 border-emerald-500 shadow-xs";

  if (hoursLeft < 3) {
    timeTextColorClass = "text-red-600 font-extrabold animate-pulse";
    timelineProgressColor = "bg-red-500";
    boundaryColorClass = "border-2 border-red-500 shadow-md shadow-red-500/10";
  } else if (hoursLeft < 10) {
    timeTextColorClass = "text-orange-600 font-extrabold";
    timelineProgressColor = "bg-orange-500";
    boundaryColorClass = "border-2 border-orange-500 shadow-xs";
  } else if (hoursLeft < 18) {
    timeTextColorClass = "text-amber-600 font-extrabold";
    timelineProgressColor = "bg-amber-500";
    boundaryColorClass = "border-2 border-amber-400 shadow-xs";
  }

  return {
    hoursLeft,
    minsLeft,
    secsLeft,
    timeText,
    formatted,
    timeTextColorClass,
    timelineProgressColor,
    boundaryColorClass,
    percent,
    isExpired: false,
    needsAdminAlert: false
  };
}



function VerticalOrderTracker({ order }) {
  const currentStageIndex = getPerceivedStageIndex(order);
  const rawStatus = (order.status || '').toUpperCase();
  const isCompleted = rawStatus === "COMPLETED" || rawStatus === "APPROVED";
  const deliverableUrl = order.submission_link || order.video_url || order.delivery_url || (Array.isArray(order.deliverables) ? order.deliverables[0]?.video_url : order.deliverables);
  const isSubmitted = rawStatus === "SUBMITTED" || rawStatus === "PENDING_REVIEW" || rawStatus === "QUALITY_REVIEW" || rawStatus === "CONTENT_SUBMITTED" || Boolean(deliverableUrl);
  const isRevision = rawStatus === "REVISION_REQ" || rawStatus === "REVISION_REQUESTED" || rawStatus === "IN_REVISION";

  const timelineSteps = [
    { id: 1, label: "Finding Creator", sub: `Payment received — brief assigned`, date: new Date(order.claimed_at || order.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
    { id: 2, label: "Creator Assigned", sub: "Creator claimed brief — production started", date: currentStageIndex >= 2 ? "DONE" : "" },
    { id: 3, label: "In Production", sub: isRevision ? "Revision requested — creator editing video" : "Content shooting & post-editing", date: (currentStageIndex >= 4 || isSubmitted || isCompleted) ? "DONE" : "" },
    { id: 4, label: isCompleted ? "Approved & Paid" : isSubmitted ? "Video Delivered" : "Review Deliverable", sub: isCompleted ? "Escrow payment released to creator" : isSubmitted ? "Video uploaded — ready for brand approval" : "Deliverable will appear here for review", date: isCompleted ? "DONE" : isSubmitted ? "READY" : "" }
  ];

  let activeStep = 0;
  if (isCompleted) activeStep = 4;
  else if (isSubmitted) activeStep = 3;
  else if (currentStageIndex >= 4) activeStep = 2;
  else if (currentStageIndex >= 2) activeStep = 1;

  return (
    <div className="relative py-2 px-1">
      <div className="absolute top-4 bottom-8 left-[15px] w-[1px] border-l-[1.5px] border-dashed border-[var(--border-default)]" />
      <div 
        className="absolute top-4 left-[15px] w-[2px] bg-emerald-500 transition-all duration-700" 
        style={{ height: `${Math.min(100, (activeStep / 3) * 100)}%` }}
      />
      
      <div className="space-y-6 relative z-10">
        {timelineSteps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const isUpcoming = idx > activeStep;
          
          return (
            <div key={idx} className={`flex items-start gap-4 ${isUpcoming ? 'opacity-50' : ''}`}>
              <div className="relative mt-1 shrink-0">
                <div className="bg-white relative z-10 w-6 h-6 flex items-center justify-center">
                  {isDone ? (
                    <div className="w-[18px] h-[18px] rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <Check size={11} strokeWidth={3.5} />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-[18px] h-[18px] rounded-full bg-white border-[2px] border-emerald-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full bg-slate-50 border-[1.5px] border-[var(--border-default)] text-[var(--text-secondary)] flex items-center justify-center text-[9px] num-bold">
                      {step.id}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-grow flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`text-[13px] font-extrabold ${isUpcoming ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                      {step.label}
                    </h4>
                    {isDone && step.date === "DONE" && (
                      <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm tracking-widest">Done</span>
                    )}
                    {isCurrent && !isCompleted && (
                      <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-sm tracking-widest flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[9px] font-bold uppercase bg-[var(--bg-elevated)] text-[var(--text-tertiary)] px-1.5 py-0.5 rounded-sm tracking-widest">Pending</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{step.sub}</p>
                </div>
                {step.date && step.date !== "DONE" && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md whitespace-nowrap ml-2 mt-0.5">{step.date}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PerceivedProgressStepper({ order }) {
  const currentStageIndex = getPerceivedStageIndex(order);
  const currentStage = PERCEIVED_STAGES[currentStageIndex];

  return (
    <div className="space-y-3 py-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
          
          Live Production Pipeline
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--violet)]/10 text-[var(--violet)]">
          Stage {currentStage.id} of 8: {currentStage.label}
        </span>
      </div>

      {/* Horizontal Timeline Tracker Nodes */}
      <div className="relative py-2">
        {/* Connector Line */}
        <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-[var(--border-default)] -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-3 h-0.5 bg-[var(--violet)] -translate-y-1/2 z-0 transition-all duration-700" 
          style={{ width: `${(currentStageIndex / 7) * 100}%` }}
        />

        {/* Nodes Grid */}
        <div className="relative z-10 flex items-center justify-between">
          {PERCEIVED_STAGES.map((stg, idx) => {
            const isDone = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div key={stg.id} className="flex flex-col items-center group relative cursor-pointer">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] num-bold transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-500 text-white shadow-sm"
                      : isCurrent
                        ? "bg-[var(--violet)] text-white shadow-[0_0_12px_rgba(124,58,237,0.8)] ring-4 ring-[var(--violet)]/20 scale-110"
                        : "bg-[var(--bg-elevated)] border-2 border-[var(--border-default)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {isDone ? <CheckCircle size={12} strokeWidth={3} /> : stg.id}
                </div>
                {/* Stage label preview */}
                <span className={`absolute -bottom-6 text-[9px] font-bold whitespace-nowrap hidden sm:block ${
                  isCurrent ? "text-[var(--violet)]" : isDone ? "text-emerald-500" : "text-[var(--text-tertiary)]"
                }`}>
                  {stg.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Live 24-Hour Delivery Countdown Timer component
function SlaCountdownTimer({ deadline, createdAt, isCompleted, variant = "default", claimedCount = 1, maxCreators = 1 }) {
  const [sla, setSla] = useState(() => 
    getUnifiedSlaData(createdAt, deadline, isCompleted ? "completed" : "open", claimedCount, maxCreators)
  );

  useEffect(() => {
    const calculateTimer = () => {
      setSla(getUnifiedSlaData(createdAt, deadline, isCompleted ? "completed" : "open", claimedCount, maxCreators));
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, createdAt, isCompleted, claimedCount, maxCreators]);

  if (variant === "compact") {
    if (isCompleted) {
      return (
        <span className="text-[11px] font-extrabold uppercase bg-teal-500/10 text-teal-600 px-2.5 py-1 rounded-md tracking-wider border border-teal-500/20">
          Delivered
        </span>
      );
    }

    if (sla.isExpired) {
      return (
        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap bg-red-500/10 text-red-600 border border-red-500/30 animate-pulse">
          <AlertCircle size={12} className="text-red-500 shrink-0" /> SLA Expired (Admin Alerted)
        </span>
      );
    }

    let bgBorderClass = "bg-emerald-500/10 border-emerald-500/20";
    if (sla.hoursLeft < 3) bgBorderClass = "bg-red-500/10 border-red-500/20";
    else if (sla.hoursLeft < 10) bgBorderClass = "bg-orange-500/10 border-orange-500/20";
    else if (sla.hoursLeft < 18) bgBorderClass = "bg-amber-500/10 border-amber-500/20";

    return (
      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1.5 whitespace-nowrap border ${bgBorderClass} ${sla.timeTextColorClass}`}>
        <Clock size={12} /> {sla.formatted}
      </span>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-3 flex items-center justify-between text-teal-600">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-wide">Production Completed</span>
        </div>
        <span className="text-[10px] font-extrabold bg-teal-500/20 px-2.5 py-0.5 rounded-full">Fulfilled</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className={sla.isExpired ? "text-red-500 animate-spin" : sla.hoursLeft < 3 ? "text-red-500" : "text-[var(--violet)]"} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">24h Delivery Countdown</span>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
          sla.isExpired 
            ? "bg-red-500/20 text-red-600 border border-red-300" 
            : "bg-[var(--violet)]/15 text-[var(--violet)]"
        }`}>
          {sla.isExpired ? "OVERDUE" : "LIVE TIMER"}
        </span>
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <span className={`text-2xl num-black tracking-tight ${sla.timeTextColorClass}`}>
          {sla.formatted}
        </span>
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          {sla.isExpired ? "SLA Overdue" : "Time Remaining"}
        </span>
      </div>
      <div className="w-full bg-[var(--border-default)] h-1.5 rounded-full overflow-hidden mt-2">
        <div 
          className={`h-full transition-all duration-1000 ${sla.timelineProgressColor}`}
          style={{ width: `${sla.percent}%` }}
        />
      </div>
    </div>
  );
}
function BrandInstantUGCDesktop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") === "orders" ? "orders" : "briefs";

  const { startLoading, stopLoading } = useLoading();

  // Briefs tab state
  const [briefs, setBriefs] = useState([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Orders tab state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedBriefApps, setSelectedBriefApps] = useState(null); // Modal state for view applications

  const [hasDraft, setHasDraft] = useState(false);

  // Revision Modal state
  const [revisionModalOrder, setRevisionModalOrder] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  useEffect(() => {
    fetchBriefs();
    fetchOrders();
    if (localStorage.getItem('ugc_draft')) {
      setHasDraft(true);
    }
  }, []);

  const fetchBriefs = async () => {
    setBriefsLoading(true);
    try {
      const res = await api.get("ugc/briefs/my");
      setBriefs(res?.data?.briefs || res?.briefs || (Array.isArray(res?.data) ? res.data : []));
    } catch (err) {
      console.error("Failed to fetch briefs:", err);
      // Fallback empty
      setBriefs([]);
    } finally {
      setBriefsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get("ugc/orders/brand");
      setOrders(res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []));
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const getApplicationsForBrief = (brief) => {
    if (!brief) return [];
    if (Array.isArray(brief.applications) && brief.applications.length > 0) {
      return brief.applications.map((app) => {
        const s = String(app.status || "").toLowerCase();
        let displayStatus = app.status || "Claimed";
        if (s === "completed" || s === "paid" || s === "released") {
          displayStatus = "Completed & Paid";
        }
        const matchingOrder = (orders || []).find((o) => o.id === app.order_id || o.creator_id === app.creator_id) || (brief.orders || []).find((o) => o.id === app.order_id || o.creator_id === app.creator_id);
        const resolvedName = (app.creator_name && app.creator_name !== "Verified UGC Creator") 
          ? app.creator_name 
          : (matchingOrder?.creator?.name || matchingOrder?.creator_name || app.creator_name || "Verified UGC Creator");
        const resolvedAvatar = app.creator_avatar || app.creator_picture || matchingOrder?.creator?.avatar || matchingOrder?.creator?.picture || matchingOrder?.creator_avatar || null;
        return {
          ...app,
          creator_name: resolvedName,
          creator_avatar: resolvedAvatar,
          status: displayStatus
        };
      });
    }
    // Check matching orders for this brief
    const matchingOrders = (orders || []).filter(
      (o) => String(o.brief_id || o.brief?.id) === String(brief.id)
    );
    if (matchingOrders.length > 0) {
      return matchingOrders.map((o) => {
        const s = String(o.status || o.brand_status || "").toLowerCase();
        const p = String(o.payment_status || "").toLowerCase();
        let displayStatus = o.status || o.brand_status || "Claimed & In Production";
        if (s === "completed" || s === "paid" || s === "released" || p === "released" || p === "paid") {
          displayStatus = "Completed & Paid";
        }
        return {
          creator_id: o.creator_user_id || o.creator?.id || o.creator_id,
          creator_name: o.creator?.name || o.creator?.full_name || o.creator_name || "Verified UGC Creator",
          creator_avatar: o.creator?.avatar || o.creator?.profile_pic || o.creator_avatar,
          status: displayStatus,
          order_id: o.id
        };
      });
    }
    // Fallback if brief has creator attached
    if (brief.creator || brief.creator_name) {
      const s = String(brief.status || "").toLowerCase();
      let displayStatus = brief.status || "Claimed";
      if (s === "completed" || s === "paid" || s === "released") {
        displayStatus = "Completed & Paid";
      }
      return [{
        creator_id: brief.creator_user_id || brief.creator?.id || brief.creator_id,
        creator_name: brief.creator?.name || brief.creator?.full_name || brief.creator_name || "Verified UGC Creator",
        creator_avatar: brief.creator?.avatar || brief.creator?.profile_pic || brief.creator_avatar,
        status: displayStatus
      }];
    }
    return [];
  };

  const getBriefEffectiveStatus = (brief) => {
    if (!brief) return "open";
    const rawStatus = String(brief.status || "open").toLowerCase();
    if (rawStatus === "completed") return "completed";

    // Check matching orders from orders state or brief.orders
    const matchingOrders = (orders || []).filter(
      (o) => String(o.brief_id || o.brief?.id) === String(brief.id)
    );
    const combinedOrders = matchingOrders.length > 0 ? matchingOrders : (brief.orders || []);

    const isOrderComplete = (o) => {
      const s = String(o.status || o.brand_status || o.creator_status || "").toLowerCase();
      const p = String(o.payment_status || "").toLowerCase();
      return s === "completed" || s === "paid" || s === "released" || p === "released" || p === "paid";
    };

    if (combinedOrders.length > 0 && combinedOrders.every(isOrderComplete)) {
      return "completed";
    }

    // Check brief.applications if present
    if (Array.isArray(brief.applications) && brief.applications.length > 0) {
      const allAppsDone = brief.applications.every((a) => {
        const s = String(a.status || "").toLowerCase();
        return s === "completed" || s === "paid" || s === "released";
      });
      if (allAppsDone) return "completed";
    }

    return rawStatus;
  };

  const handleApproveOrder = async (orderId) => {
    try {
      startLoading("Approving UGC order and releasing escrow payment...");
      await api.post(`ugc/orders/${orderId}/approve`);
      toast.success("Order approved! Escrow payment released to creator.");
      fetchOrders();
      fetchBriefs();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to approve order.");
    } finally {
      stopLoading();
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionModalOrder) return;
    if (!revisionNotes.trim()) {
      toast.error("Please enter revision instructions for the creator.");
      return;
    }

    try {
      setIsSubmittingRevision(true);
      await api.post(`ugc/orders/${revisionModalOrder.id}/revision`, { notes: revisionNotes });
      toast.success("Revision request sent to creator.");
      setRevisionModalOrder(null);
      setRevisionNotes("");
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to submit revision.");
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Helper formatting for deliverable badges
  const getDeliverableBadge = (type) => {
    if (type === 'collaboration_reel' || type === 'instagram_reel') {
      return (
        <Badge variant="info" icon={<Film size={12} />}>
          COLLABORATION REEL
        </Badge>
      );
    }
    if (type === 'ugc_video_raw' || type === 'ugc_raw_video') {
      return (
        <Badge variant="info" icon={<Camera size={12} />}>
          UGC VIDEO — RAW
        </Badge>
      );
    }
    return (
      <Badge variant="info" icon={<Video size={12} />}>
        UGC VIDEO — EDITED
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'COMPLETED') {
      return <Badge variant="success">COMPLETED</Badge>;
    }
    if (s === 'IN_PRODUCTION' || s === 'CLAIMED' || s === 'IN PRODUCTION') {
      return <Badge variant="warning">IN PRODUCTION</Badge>;
    }
    if (s === 'SUBMITTED') {
      return <Badge variant="warning">PENDING APPROVAL</Badge>;
    }
    return <Badge variant="success">OPEN</Badge>;
  };

  // Filtered briefs
  const filteredBriefs = briefs.filter(b => {
    const titleMatch = (b.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (b.product_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    let formatMatch = true;
    if (formatFilter === "collaboration_reel") {
      formatMatch = b.deliverable_type === "collaboration_reel" || b.deliverable_type === "instagram_reel";
    } else if (formatFilter === "ugc_video_raw") {
      formatMatch = b.deliverable_type === "ugc_video_raw" || b.deliverable_type === "ugc_raw_video";
    } else if (formatFilter === "ugc_video_edited") {
      formatMatch = b.deliverable_type === "ugc_video_edited";
    }

    let statusMatch = true;
    if (statusFilter !== "all") {
      const effStatus = getBriefEffectiveStatus(b);
      if (statusFilter.toLowerCase() === "completed") {
        statusMatch = effStatus === "completed";
      } else if (statusFilter.toLowerCase() === "in_production") {
        statusMatch = effStatus.includes("production") || effStatus === "claimed";
      } else if (statusFilter.toLowerCase() === "open") {
        statusMatch = effStatus === "open";
      } else {
        statusMatch = effStatus === statusFilter.toLowerCase();
      }
    }

    return titleMatch && formatMatch && statusMatch;
  });

  return (
    <div className="w-full max-w-none text-left pb-12" data-testid="brand-instant-ugc-page">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            Instant UGC
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Recruit certified creators & track 24-hour UGC orders.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              fetchBriefs();
              fetchOrders();
              toast.success("Refreshed!");
            }}
            className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--border-default)] rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title="Refresh Briefs & Orders"
          >
            <RefreshCw size={16} className={briefsLoading || ordersLoading ? "animate-spin" : ""} />
          </button>
          {hasDraft && (
            <Link
              to="/brand/ugc/post"
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={16} strokeWidth={3} />
              <span>Resume Draft</span>
            </Link>
          )}
          <Link
            to="/brand/ugc/post"
            className="px-5 py-3 rounded-xl bg-[var(--violet)] hover:bg-[#6B4AFF] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Post Brief</span>
          </Link>
        </div>
      </div>

      {/* TWO INTERNAL TABS - CENTERED SEGMENT CONTROL (WHITE CAPSULE WITH DARK ACTIVE PILL) */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="bg-[var(--bg-elevated)] p-1 rounded-full border border-[var(--border-default)] shadow-xs inline-flex items-center gap-1 relative">
          <button
            type="button"
            onClick={() => handleTabChange("briefs")}
            className={`relative px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer z-10 ${
              activeTab === "briefs"
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {activeTab === "briefs" && (
              <motion.div
                layoutId="brandInstantUgcTabPill"
                className="absolute inset-0 bg-[var(--violet)] rounded-full shadow-sm z-0"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">My Briefs</span>
            <span className={`relative z-10 px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs num-bold transition-colors ${
              activeTab === "briefs" ? "bg-white/20 text-white" : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]"
            }`}>
              {briefs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("orders")}
            className={`relative px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer z-10 ${
              activeTab === "orders"
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {activeTab === "orders" && (
              <motion.div
                layoutId="brandInstantUgcTabPill"
                className="absolute inset-0 bg-[var(--violet)] rounded-full shadow-sm z-0"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">Orders</span>
            <span className={`relative z-10 px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs num-bold transition-colors ${
              activeTab === "orders" ? "bg-white/20 text-white" : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]"
            }`}>
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="w-full max-w-none">
        {/* ================= TAB 1: MY BRIEFS ================= */}
        {activeTab === "briefs" && (
          <div className="space-y-5">
            {/* Filter & Search Bar - Sleek & Simple */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-default)] shadow-xs">
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search brief title or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--violet)] transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <select
                    value={formatFilter}
                    onChange={(e) => setFormatFilter(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-xl px-3 py-2 text-xs font-medium outline-none cursor-pointer hover:border-[var(--violet-border)] transition-colors"
                  >
                    <option value="all">All Formats</option>
                    <option value="collaboration_reel">Collaboration Reel</option>
                    <option value="ugc_video_raw">UGC Video — Raw</option>
                    <option value="ugc_video_edited">UGC Video — Edited</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] rounded-xl px-3 py-2 text-xs font-medium outline-none cursor-pointer hover:border-[var(--violet-border)] transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_production">In Production</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="text-xs font-semibold text-[var(--text-tertiary)] px-2.5 py-1.5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] shrink-0">
                  <span className="text-[var(--text-primary)] font-bold">{filteredBriefs.length}</span> Total Briefs
                </div>
              </div>
            </div>

            {/* Briefs Grid */}
            {briefsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-52 bg-[var(--bg-card)] rounded-2xl animate-pulse border border-[var(--border-default)]" />
                ))}
              </div>
            ) : filteredBriefs.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-8 max-w-md mx-auto my-6 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center mx-auto mb-3 border border-[var(--violet-border)]">
                  <Video size={24} />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No UGC Briefs Found</h3>
                <p className="text-xs text-[var(--text-tertiary)] max-w-xs mx-auto mb-5 leading-relaxed">
                  {searchQuery || formatFilter !== "all" || statusFilter !== "all"
                    ? "No briefs matched your filter criteria. Try adjusting search terms."
                    : "Create your first brief to recruit top creators and get 24-hour UGC video delivery."}
                </p>
                <Link
                  to="/brand/ugc/post"
                  className="hidden sm:inline-flex items-center gap-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all"
                >
                  <Plus size={14} /> Post First Brief
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                {filteredBriefs.map((brief, idx) => {
                  const briefApps = getApplicationsForBrief(brief);
                  const maxC = brief.max_creators || 1;
                  const claimedC = brief.claimed_count || briefApps.length;
                  const appCount = briefApps.length;
                  const briefId = `#${brief.id ? String(brief.id).slice(-4) : idx + 101}`;
                  const statusLower = getBriefEffectiveStatus(brief);

                  // 1. Deliverable Type Badge
                  let deliverableLabel = "UGC VIDEO";
                  if (brief.deliverable_type === "collaboration_reel" || brief.deliverable_type === "instagram_reel") {
                    deliverableLabel = "COLLABORATION VIDEO";
                  } else if (brief.deliverable_type === "ugc_video_edited") {
                    deliverableLabel = "UGC VIDEO (EDITED)";
                  } else if (brief.deliverable_type === "ugc_video_raw") {
                    deliverableLabel = "UGC VIDEO (RAW)";
                  }

                  // 2. Stage / Status Pill
                  let stageLabel = "Finding Creator";
                  let stagePillClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
                  let stageDotClass = "bg-emerald-500 animate-pulse";

                  if (statusLower === "completed") {
                    stageLabel = "Completed";
                    stagePillClass = "text-teal-700 bg-teal-50 border-teal-200";
                    stageDotClass = "bg-teal-500";
                  } else if (statusLower.includes("production") || statusLower === "claimed") {
                    stageLabel = "In Production";
                    stagePillClass = "text-amber-700 bg-amber-50 border-amber-200";
                    stageDotClass = "bg-amber-500 animate-pulse";
                  } else if (claimedC > 0) {
                    stageLabel = "Creator Assigned";
                    stagePillClass = "text-indigo-700 bg-indigo-50 border-indigo-200";
                    stageDotClass = "bg-indigo-500";
                  }

                  // 3. Dynamic Unified SLA Timing & Color
                  const sla = getUnifiedSlaData(
                    brief.created_at,
                    brief.sla_deadline,
                    statusLower,
                    claimedC,
                    maxC
                  );

                  return (
                    <div
                      key={brief.id}
                      className={`bg-[var(--bg-card)] rounded-2xl p-5 ${sla.boundaryColorClass} transition-all flex flex-col justify-between group relative hover:shadow-md`}
                    >
                      <div>
                        {/* Top Stage & Deliverable Badge (DEAL ID REMOVED FROM MAIN VIEW) */}
                        <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stagePillClass} whitespace-nowrap`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stageDotClass}`}></span>
                              {stageLabel}
                            </span>
                            {sla.needsAdminAlert && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 animate-pulse whitespace-nowrap">
                                <AlertCircle size={11} /> Admin Alerted
                              </span>
                            )}
                          </div>

                          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--violet)] bg-[var(--violet-soft)] px-2.5 py-1 rounded-lg border border-[var(--violet-border)] whitespace-nowrap shrink-0 mt-1 sm:mt-0">
                            {deliverableLabel}
                          </span>
                        </div>

                        {/* Title & Product Name */}
                        <div className="mb-3">
                          <h3 className="text-base font-extrabold text-[var(--text-primary)] leading-tight mb-1 group-hover:text-[var(--violet)] transition-colors line-clamp-2">
                            {brief.title || brief.product_name || "UGC Brief"}
                          </h3>
                          <p className="text-xs text-[var(--text-tertiary)] opacity-70 font-medium line-clamp-1">
                            Product: <span className="font-semibold text-[var(--text-secondary)]">{brief.product_name || "General"}</span>
                          </p>
                        </div>

                        {/* Budget & Timeline SLA Bar with Matched Dynamic Text Colors */}
                        <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)] mb-4 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider font-bold">Budget & Escrow</span>
                            <span className="text-sm font-extrabold text-[var(--text-primary)]">₹{(brief.budget || 2000).toLocaleString()}</span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[10px] font-sans font-bold mb-1">
                              <span className={sla.timeTextColorClass}>Recruited ({claimedC}/{maxC})</span>
                              <span className={sla.timeTextColorClass}>{sla.timeText}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${sla.timelineProgressColor} transition-all duration-500 rounded-full`}
                                style={{ width: `${sla.percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border-default)]">
                        <button
                          onClick={() => setSelectedBriefApps(brief)}
                          className="bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] py-2 px-2.5 rounded-xl text-xs font-bold border border-[var(--border-default)] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Eye size={14} className="text-[var(--violet)]" />
                          View Applicants ({appCount})
                        </button>

                        <button
                          onClick={() => handleTabChange("orders")}
                          className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                        >
                          Manage Orders
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ORDERS & TRACKING ================= */}
        {activeTab === "orders" && (
          <BrandUGCOrders embedded={true} />
        )}
      </div>

      
      {/* APPLICATIONS MODAL */}
      {selectedBriefApps && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">Applications & Claims</h3>
                <p className="text-xs text-[var(--text-tertiary)]">{selectedBriefApps.title || selectedBriefApps.product_name || "UGC Campaign"}</p>
              </div>
              <button
                onClick={() => setSelectedBriefApps(null)}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                CLAIMED BY
              </p>

              {(() => {
                const modalApps = getApplicationsForBrief(selectedBriefApps);
                if (modalApps.length === 0) {
                  return (
                    <div className="p-8 bg-[var(--bg-elevated)] rounded-2xl border border-dashed border-[var(--border-default)] flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center mb-3 shadow-sm">
                        <Clock size={20} className="text-[var(--text-tertiary)] opacity-60" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">Waiting for creators to claim this brief</h4>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 max-w-[250px]">
                        Once a verified creator claims this project and begins production, their profile and status will appear here.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {modalApps.map((app, idx) => (
                      <div key={idx} className="p-4 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-default)] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-tertiary)] flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs overflow-hidden">
                            {app.creator_avatar ? (
                              <img src={app.creator_avatar} alt={app.creator_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              app.creator_name ? app.creator_name.charAt(0) : "V"
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-[var(--text-primary)] line-clamp-2 leading-tight">{app.creator_name || "Verified UGC Creator"}</h4>
                            <p className="text-[11px] text-[var(--text-tertiary)]">Status: <span className="font-semibold text-emerald-600">{app.status || "Claimed"}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/brand/inbox?creator=${app.creator_id || 'creator'}`}
                            onClick={() => setSelectedBriefApps(null)}
                            className="w-9 h-9 rounded-full bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border border-[var(--border-default)] flex items-center justify-center transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95"
                            title="Chat with Creator"
                          >
                            <MessageCircle size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBriefApps(null);
                              handleTabChange("orders");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
                          >
                            Manage Order
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-default)] flex justify-end">
              <button
                onClick={() => setSelectedBriefApps(null)}
                className="bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-primary)] px-5 py-2 rounded-xl text-xs font-bold border border-[var(--border-default)] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISION MODAL */}
      {revisionModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Request Revision</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Order #{revisionModalOrder.id}</p>
              </div>
              <button
                onClick={() => setRevisionModalOrder(null)}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Provide clear, specific feedback to the creator about what changes or additions are required.
              </p>

              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="e.g. Please re-shoot the second scene with brighter lighting and speak louder during product callout..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-default)] flex items-center justify-end gap-3">
              <button
                onClick={() => setRevisionModalOrder(null)}
                className="bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--border-default)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingRevision}
                onClick={handleRequestRevision}
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingRevision ? "Sending..." : "Submit Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandInstantUGC() {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "orders" ? "orders" : "briefs";

  if (isMobile) {
    return <BrandUGCMobile initialTab={activeTab} initialView="main" />;
  }

  return <BrandInstantUGCDesktop />;
}
