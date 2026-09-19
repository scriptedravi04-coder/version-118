import React, { useEffect, useState, useMemo, useRef } from "react";
import { formatAmount, safeArray, safeLower } from "../../utils/safeFormat";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { useLoading } from "../../contexts/LoadingContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, FileText, Clock, RefreshCw, Search, Video, 
  ShieldCheck, Check, X, Upload, ExternalLink, AlertTriangle, 
  CheckCircle2, PlayCircle, Lock, ArrowRight, Zap, FileVideo, Globe, MessageCircle, Maximize2,
  AlertCircle
} from "lucide-react";
import DealProgressStepper from "../../components/deals/DealProgressStepper";
import UGCContractModal from "../../components/chat/UGCContractModal";
import VideoEmbedPreview from "../../components/shared/VideoEmbedPreview";
import UniversalPreviewModal from "../../components/shared/UniversalPreviewModal";

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
      setIsUrgent(diff < 24 * 60 * 60 * 1000);
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

export default function ManageUGCOrdersView({ initialOrderId = null, onSelectBriefToExplore = null }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "active" | "in_review" | "completed"
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [appliedOrderId, setAppliedOrderId] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(Boolean(initialOrderId));
  
  // Signature modal state
  const [signingOrder, setSigningOrder] = useState(null);

  // Decline changes modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [showReuploadForm, setShowReuploadForm] = useState(false);

  // Deliverables upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [creatorNotes, setCreatorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const fileInputRef = useRef(null);

  const handleDeclineChanges = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOrder) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining revisions.");
      return;
    }
    setDeclining(true);
    try {
      await api.post(`/ugc/orders/${selectedOrder.id}/decline-revisions`, { feedback: declineReason.trim() });
      toast.success("Revisions declined successfully. Brand has been notified!");
      setShowDeclineModal(false);
      setDeclineReason("");
      loadOrders();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Failed to decline revisions");
    } finally {
      setDeclining(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("ugc/orders/creator");
      const fetchedOrders = res.data || [];
      setOrders(fetchedOrders);

      // Auto select first order or initialOrderId
      if (fetchedOrders.length > 0) {
        const match = initialOrderId ? fetchedOrders.find(o => 
          String(o.id) === String(initialOrderId) || 
          String(o.deal_id) === String(initialOrderId) || 
          String(o.brief_id) === String(initialOrderId) ||
          String(o.brief?.id) === String(initialOrderId)
        ) : null;

        if (match) {
          setAppliedOrderId(match.id);
          setSelectedOrderId(match.id);
          setMobileDrawerOpen(true);
        } else {
          setSelectedOrderId(prev => prev && fetchedOrders.some(o => String(o.id) === String(prev)) ? prev : fetchedOrders[0].id);
        }
      } else {
        setSelectedOrderId(null);
      }
    } catch (err) {
      console.error("Error loading UGC orders:", err);
      toast.error("Failed to load UGC orders. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);

    // Socket.io real-time listener for instant order/thread status updates
    let socket;
    try {
      socket = io(window.location.origin, { transports: ["websocket", "polling"] });
      socket.on("ugc_order_updated", (payload) => {
        if (payload?.orderId) {
          setOrders(prev => prev.map(o => {
            if (String(o.id) === String(payload.orderId)) {
              return {
                ...o,
                ...(payload.order || {}),
                status: payload.status || o.status,
                payment_status: payload.payment_status || o.payment_status,
                stage: payload.stage || o.stage
              };
            }
            return o;
          }));
        }
      });
      socket.on("thread_updated", (payload) => {
        if (payload?.threadId) {
          setOrders(prev => prev.map(o => {
            if (String(o.id) === String(payload.threadId) || String(o.thread_id) === String(payload.threadId)) {
              const isDone = payload.status === 'COMPLETED' || payload.flow_state === 'COMPLETED';
              return {
                ...o,
                thread_status: payload.status,
                thread_flow_state: payload.flow_state,
                status: isDone ? 'COMPLETED' : o.status,
                payment_status: isDone ? 'RELEASED' : o.payment_status,
                stage: isDone ? 'COMPLETED' : o.stage
              };
            }
            return o;
          }));
        }
      });
    } catch (e) {
      console.warn("Socket initialization error in ManageUGCOrdersView:", e);
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const match = orders.find(o => 
        String(o.id) === String(initialOrderId) || 
        String(o.deal_id) === String(initialOrderId) || 
        String(o.brief_id) === String(initialOrderId) ||
        String(o.brief?.id) === String(initialOrderId)
      );
      if (match) {
        setSelectedOrderId(match.id);
        setMobileDrawerOpen(true);
      }
    }
  }, [initialOrderId, orders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
    toast.success("UGC orders updated!");
  };

  // Process & map raw UGC orders
  const mappedOrders = useMemo(() => {
    return (orders || []).map(o => {
      const creatorStatus = (o.status || o.creator_status || '').toUpperCase();
      const paymentStatus = (o.payment_status || '').toUpperCase();
      const thrStatus = (o.thread_status || '').toUpperCase();
      const thrFlow = (o.thread_flow_state || '').toUpperCase();
      const isSigned = o.agreement_signed_creator === true || o.raw?.agreement_signed_creator === true;

      if (creatorStatus === 'CANCELLED') {
        return null;
      }

      let stage = "IN_PROGRESS";

      // Check if deliverable was resubmitted after revision was requested
      const deliveredTime = Date.parse(o.delivered_at || '') || 0;
      const updatedTime = Date.parse(o.updated_at || '') || 0;
      const hasFreshSubmission = (creatorStatus === 'SUBMITTED' || creatorStatus === 'DELIVERED' || creatorStatus === 'CONTENT_SUBMITTED') ||
        (deliveredTime > 0 && deliveredTime >= updatedTime && (o.submission_link || o.video_url || o.drive_url));

      if (
        creatorStatus === 'COMPLETED' || 
        creatorStatus === 'APPROVED' || 
        creatorStatus === 'PAID' || 
        creatorStatus === 'RELEASED' || 
        paymentStatus === 'RELEASED' || 
        paymentStatus === 'PAID' ||
        thrStatus === 'COMPLETED' ||
        thrFlow === 'COMPLETED' ||
        o.stage === 'COMPLETED'
      ) {
        stage = "COMPLETED";
      } else if (creatorStatus === 'COMPLETED_APPROVAL' || creatorStatus === 'AWAITING_LIVE_LINK') {
        stage = "COMPLETED_APPROVAL";
      } else if (hasFreshSubmission) {
        stage = "IN_REVIEW";
      } else if (creatorStatus === 'REVISION_REQUESTED' || creatorStatus === 'REVISION_REQ' || creatorStatus === 'IN_REVISION' || creatorStatus === 'REVISION_REQUESTED_LINKS') {
        stage = "REVISION_REQUESTED";
      } else if (creatorStatus === 'SUBMITTED' || creatorStatus === 'DELIVERED' || creatorStatus === 'IN_REVIEW' || creatorStatus === 'CONTENT_SUBMITTED' || creatorStatus === 'UNDER_REVIEW') {
        stage = "IN_REVIEW";
      } else if (!isSigned) {
        stage = "PENDING_SIGNATURE";
      } else {
        stage = "IN_PROGRESS";
      }

      const payout = o.creator_payout || o.agreed_amount || o.brief?.budget || 0;
      const title = o.brief?.title || o.title || o.brief?.product_name || o.product_name || o.raw?.title || o.raw?.product_name || "UGC Video Campaign";
      const productName = o.brief?.product_name || o.product_name || "Product Item";
      const brandName = o.brief?.brand_name || o.brand_name || "Brand Partner";
      let brandLogo = o.brief?.brand_logo || o.brand_logo || o.brand?.logo || null;
      if (!brandLogo) {
        const bLower = (brandName || "").toLowerCase();
        const pLower = (productName || title || "").toLowerCase();
        if (bLower.includes("beardo") || pLower.includes("beardo")) brandLogo = "/api/files/file_8uced48g9du";
        else if (bLower.includes("nexus") || bLower.includes("zepto") || pLower.includes("nexus")) brandLogo = "https://iili.io/CeJ5cla.webp";
        else if (bLower.includes("fevicol") || pLower.includes("fevicol")) brandLogo = "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822669069-3b576cdf-128a-455e-8bdf-902c6711e39f.jpeg";
        else if (bLower.includes("bsc") || bLower.includes("bombay shaving")) brandLogo = "https://mzcovvzkwzjvzskjqwwy.supabase.co/storage/v1/object/public/brand-logos/landing/1786822692830-ebf3623c-1842-422d-b51b-c8d10c64d51e.png";
        else if (pLower.includes("protein") || pLower.includes("whey")) brandLogo = "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=150&auto=format&fit=crop&q=80";
        else if (brandName && brandName !== "Brand Partner") brandLogo = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName)}&backgroundColor=6366f1&fontFamily=Arial&fontWeight=800`;
      }

      return {
        id: o.id,
        orderNumber: o.order_number || `#ORD-${String(o.id).slice(-6).toUpperCase()}`,
        title,
        productName,
        brandName,
        brandLogo,
        status: o.status || o.creator_status || "PENDING",
        stage,
        isSigned,
        payout,
        deadline: o.internal_deadline || o.deadline || o.sla_expires_at,
        dos: o.brief?.dos || [],
        donts: o.brief?.donts || [],
        requirements: o.brief?.detailed_requirements || o.requirements || "",
        productDescription: o.brief?.product_description || o.description || "",
        sampleUrl: o.brief?.sample_content_url || null,
        videoUrl: o.video_url || null,
        driveUrl: o.drive_url || null,
        notes: o.creator_notes || o.notes || "",
        revisionNotes: o.revision_notes || o.revision_feedback || o.brand_feedback || (typeof o.creator_notes === "string" && o.creator_notes.includes("Revision feedback:") ? o.creator_notes.replace(/^Revision feedback:\s*/i, "").trim() : "") || "",
        raw: o
      };
    }).filter(Boolean).sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [orders]);

  // Filtered orders list for left column
  const filteredOrders = useMemo(() => {
    return mappedOrders.filter(o => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = (
          safeLower(o.title).includes(q) ||
          safeLower(o.productName).includes(q) ||
          safeLower(o.brandName).includes(q) ||
          safeLower(o.orderNumber).includes(q)
        );
        if (!matchesQuery) return false;
      }

      if (activeFilter === "all") return true;
      if (activeFilter === "active") return o.stage === "IN_PROGRESS" || o.stage === "REVISION_REQUESTED";
      if (activeFilter === "in_review") return o.stage === "IN_REVIEW";
      if (activeFilter === "completed") return o.stage === "COMPLETED";
      return true;
    });
  }, [mappedOrders, searchQuery, activeFilter]);

  // Active selected order object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return mappedOrders.find(o => String(o.id) === String(selectedOrderId)) || null;
  }, [mappedOrders, selectedOrderId]);

  // Reset form when active order changes
  useEffect(() => {
    if (selectedOrder) {
      setSelectedFile(null);
      setDriveUrl(selectedOrder.driveUrl || "");
      setCreatorNotes(selectedOrder.notes || "");
    }
  }, [selectedOrder?.id]);

  // Handle deliverable submit
  const handleSubmitDeliverables = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedOrder) return;

    if (!selectedFile && !driveUrl.trim()) {
      toast.error("Please upload a video file or paste a Google Drive link to submit.");
      return;
    }

    setSubmitting(true);
    toast.loading("Uploading and submitting UGC deliverable...", { id: "ugc-submit" });

    try {
      let finalVideoUrl = driveUrl.trim();

      if (selectedFile) {
        toast.loading("Requesting secure upload link...", { id: "ugc-submit" });
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${selectedOrder.id}-${Date.now()}.${fileExt}`;
        const filePath = `ugc-videos/${selectedOrder.id}/${fileName}`;

        const { data: signedData } = await api.post("/upload/signed-url", {
          bucket: "content-submissions",
          path: filePath,
          contentType: selectedFile.type
        });

        toast.loading("Uploading UGC video...", { id: "ugc-submit" });

        const { error: uploadError } = await supabase.storage
          .from("content-submissions")
          .uploadToSignedUrl(signedData.path, signedData.token, selectedFile);

        if (uploadError) {
          throw uploadError;
        }

        finalVideoUrl = filePath; // Save relative path so backend can sign it later
      }

      toast.loading("Saving submission...", { id: "ugc-submit" });
      
      const submitPayload = {
        videoUrl: finalVideoUrl,
        notes: creatorNotes.trim()
      };

      await api.post(`/ugc/orders/${selectedOrder.id}/submit`, submitPayload);

      toast.success("Deliverable submitted! Waiting for brand review.", { id: "ugc-submit" });
      setSelectedFile(null);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.response?.data?.message || err.message || "Failed to submit deliverables.", { id: "ugc-submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case "IN_PROGRESS":
        return <span className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">In Production</span>;
      case "REVISION_REQUESTED":
        return <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Revision Requested</span>;
      case "IN_REVIEW":
        return <span className="bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Under Brand Review</span>;
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
          <p className="text-sm text-[var(--text-tertiary)] font-semibold">Loading your UGC orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm my-6">
        <div className="w-14 h-14 bg-[var(--violet)]/10 text-[var(--violet)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--violet)]/20">
          <Briefcase size={26} />
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-2">No Claimed UGC Orders Yet</h2>
        <p className="text-xs text-[var(--text-tertiary)] font-medium leading-relaxed max-w-md mx-auto mb-6">
          When you claim open briefs from the Explore UGC tab and sign the SLA agreement, your active production orders will appear here automatically.
        </p>
        {onSelectBriefToExplore && (
          <button
            onClick={onSelectBriefToExplore}
            className="inline-flex items-center gap-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Zap size={15} />
            <span>Explore Open UGC Briefs</span>
          </button>
        )}
      </div>
    );
  }

  const renderOrderWorkspaceContent = (selectedOrder) => {
    if (!selectedOrder) return null;
    return (
      <div className="space-y-6">
        {/* Order Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] p-3.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-secondary)]">UGC Order Deal:</span>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{selectedOrder.orderNumber || selectedOrder.id}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigate(`/chat/${selectedOrder.id}`);
            }}
            className="px-3.5 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--border-default)] text-[var(--text-primary)] rounded-xl border border-[var(--border-default)] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 font-bold text-xs hover:border-[var(--violet)] active:scale-95"
            title="Open Chat with Brand"
          >
            <MessageCircle size={14} className="text-[var(--violet)]" />
            <span>Chat with Brand</span>
          </button>
        </div>

        {/* Track Order Card Component */}
        <DealProgressStepper 
          stage={selectedOrder.stage} 
          orderNumber={selectedOrder.orderNumber}
          brandName={selectedOrder.brandName}
          brandLogo={selectedOrder.brandLogo}
          trackingCode={selectedOrder.orderNumber ? selectedOrder.orderNumber.replace('#', '') : `TRK-${selectedOrder.id}`}
          deadline={selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : null}
          title={selectedOrder.title}
          payout={selectedOrder.payout}
        />

        {/* Campaign Brief & Product Information */}
        {(() => {
          const hasProductDescription = Boolean(selectedOrder.productDescription && String(selectedOrder.productDescription).trim());
          const hasRequirements = Boolean(selectedOrder.requirements && String(selectedOrder.requirements).trim());
          const hasDos = Boolean(selectedOrder.dos && Array.isArray(selectedOrder.dos) && selectedOrder.dos.length > 0);
          const hasDonts = Boolean(selectedOrder.donts && Array.isArray(selectedOrder.donts) && selectedOrder.donts.length > 0);
          const hasSampleUrl = Boolean(selectedOrder.sampleUrl && String(selectedOrder.sampleUrl).trim());

          const hasAnyBriefData = hasProductDescription || hasRequirements || hasDos || hasDonts || hasSampleUrl;

          if (!hasAnyBriefData) return null;

          return (
            <div className="space-y-4 pt-3 border-t border-[var(--border-default)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FileText size={15} className="text-[var(--violet)]" />
                Brief Specifications & Requirements
              </h3>

              {/* Product Description */}
              {hasProductDescription && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Product Description</h4>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">{selectedOrder.productDescription}</p>
                </div>
              )}

              {/* Detailed Instructions */}
              {hasRequirements && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">Detailed Instructions</h4>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">{selectedOrder.requirements}</p>
                </div>
              )}

              {/* Do's and Don'ts */}
              {(hasDos || hasDonts) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {hasDos && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> What To Do (Do's)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-emerald-800 font-medium">
                        { safeArray(selectedOrder.dos).map((d, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasDonts && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                        <X size={15} /> What Not To Do (Don'ts)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-rose-800 font-medium">
                        { safeArray(selectedOrder.donts).map((d, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-600 font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Sample Content Reference */}
              {hasSampleUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-[var(--text-primary)] font-bold">Sample Content Reference:</span>
                  <a href={selectedOrder.sampleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--violet)] font-bold hover:underline inline-flex items-center gap-1">
                    <span>View Reference Video</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* ACTION & DELIVERABLES AREA */}
        <div className="pt-6 border-t border-[var(--border-default)] space-y-4">
          {/* STATE 1: PENDING_SIGNATURE */}
          {selectedOrder.stage === "PENDING_SIGNATURE" && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">SLA Contract Pending OTP Verification</h4>
                  <p className="text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed mt-0.5">
                    You have reserved this brief. To start your 22-hour production timer and unlock video deliverable upload, please verify your email/phone with OTP and execute the contract.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSigningOrder(selectedOrder)}
                  className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <FileText size={15} />
                  <span>Verify OTP & Sign Agreement</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to cancel this brief reservation?")) {
                      try {
                        await api.post(`/ugc/orders/${selectedOrder.id}/cancel-claim`);
                        toast.success("Brief reservation released.");
                        setSelectedOrderId(null);
                        loadOrders();
                      } catch (e) {
                        toast.error(e?.response?.data?.error || "Failed to cancel claim.");
                      }
                    }
                  }}
                  className="px-4 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-secondary)] font-bold text-xs rounded-xl border border-[var(--border-default)] transition-colors cursor-pointer"
                >
                  Cancel Claim
                </button>
              </div>
            </div>
          )}

          {/* Video Deliverable Preview Card (if video/drive exists) */}
          {(selectedOrder.videoUrl || selectedOrder.driveUrl) && (
            <div className="bg-[var(--bg-elevated)] p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video size={16} className="text-[var(--violet)]" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Submitted Video Deliverable
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(selectedOrder.videoUrl || selectedOrder.driveUrl);
                      setIsPreviewModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-[var(--violet)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 size={12} />
                    <span>Expand</span>
                  </button>
                  <a
                    href={selectedOrder.videoUrl || selectedOrder.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 hover:underline ml-2"
                  >
                    <ExternalLink size={12} />
                    <span>Open in Tab</span>
                  </a>
                </div>
              </div>

              {/* Embedded Player */}
              <div className="rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border border-[var(--border-default)] max-h-[420px] flex items-center justify-center">
                <VideoEmbedPreview
                  url={selectedOrder.videoUrl || selectedOrder.driveUrl}
                  title={selectedOrder.title}
                  className="w-full max-h-[400px] object-contain mx-auto"
                  isApproved={selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED"}
                  watermark={!(selectedOrder.stage === "COMPLETED" || selectedOrder.stage === "APPROVED")}
                />
              </div>

              {selectedOrder.notes && (
                <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)] block mb-0.5">Creator Notes:</span>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: REVISION_REQUESTED */}
          {selectedOrder.stage === "REVISION_REQUESTED" && (
            <div className="space-y-4">
              {/* Revision Alert Header in Yellow Amber matching chat */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-4 shadow-sm relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">Brand Needs Some Changes</h4>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-extrabold">
                        Revision Request
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
                      The brand has reviewed your draft and requested some revisions. Please review their instructions and upload the revised video below:
                    </p>
                  </div>
                </div>

                <div className="p-3.5 md:p-4 bg-[var(--bg-base)] border border-amber-500/30 rounded-xl shadow-xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle size={14} className="text-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Need Changes (Revision Instructions):
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-[var(--text-primary)] font-semibold leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    {selectedOrder.revisionNotes || "Brand requested modifications to the submitted video."}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(true)}
                    className="flex-1 py-2.5 px-4 bg-[var(--bg-card)] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <X size={14} />
                    <span>Decline Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReuploadForm(true);
                      setTimeout(() => {
                        fileInputRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="flex-1 py-2.5 px-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-violet-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload size={14} />
                    <span>Upload Revised Deliverable</span>
                  </button>
                </div>
              </div>

              {/* Upload Form for Revisions */}
              <form onSubmit={handleSubmitDeliverables} className="space-y-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-default)]">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Upload size={16} className="text-[var(--violet)]" />
                    Submit Revised Video Deliverable
                  </h4>
                  {selectedOrder.deadline && <MiniCountdown deadline={selectedOrder.deadline} />}
                </div>

                {/* Drag & Drop File Upload Box */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                    Revised Video File (MP4 / MOV / WebM)
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-card)] rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-[var(--bg-card)]/80 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/mov,video/webm,video/*"
                      onChange={(e) => {
  const file = e.target.files?.[0];
  if (file && file.size > 50 * 1024 * 1024) {
    toast.error("Please upload the file using a drive link or compress it to under 50 MB.");
    return;
  }
  setSelectedFile(file || null);
}}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileVideo size={28} className="text-[var(--violet)]" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{selectedFile.name}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] font-medium">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg ml-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">Click or drag revised video file here</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Max file size: 50MB (Use Drive link for larger files)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* OR Drive Link Alternative */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                    OR Paste Google Drive / Frame.io / Dropbox Share Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    className="w-full p-3 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all"
                  />
                </div>

                {/* Creator Notes */}
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                    Notes for Brand (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Explain what changes were made in this revision..."
                    value={creatorNotes}
                    onChange={(e) => setCreatorNotes(e.target.value)}
                    className="w-full p-3 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all resize-none"
                  />
                </div>

                {/* Submit Deliverable Button */}
                <button
                  type="submit"
                  disabled={submitting || (!selectedFile && !driveUrl.trim())}
                  className="w-full py-3.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:bg-[var(--border-default)] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Submit Revised Deliverable to Brand</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STATE 1: IN_PROGRESS (Initial Submission) */}
          {selectedOrder.stage === "IN_PROGRESS" && (
            <form onSubmit={handleSubmitDeliverables} className="space-y-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-default)]">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Upload size={16} className="text-[var(--violet)]" />
                  Upload & Submit Video Deliverables
                </h4>
                {selectedOrder.deadline && <MiniCountdown deadline={selectedOrder.deadline} />}
              </div>

              {/* Drag & Drop File Upload Box */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                  Video File (MP4 / MOV / WebM)
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-card)] rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-[var(--bg-card)]/80 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/mov,video/webm,video/*"
                    onChange={(e) => {
  const file = e.target.files?.[0];
  if (file && file.size > 50 * 1024 * 1024) {
    toast.error("Please upload the file using a drive link or compress it to under 50 MB.");
    return;
  }
  setSelectedFile(file || null);
}}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileVideo size={28} className="text-[var(--violet)]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[var(--text-primary)]">{selectedFile.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-medium">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded-lg ml-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <Upload size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">Click or drag video file here to attach</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Max file size: 50MB (Use Drive link for larger files)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OR Drive Link Alternative */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                  OR Paste Google Drive / Frame.io / Dropbox Share Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full p-3 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all"
                />
              </div>

              {/* Creator Notes */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                  Notes for Brand (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add any notes regarding edits, music licensing, or hook variations..."
                  value={creatorNotes}
                  onChange={(e) => setCreatorNotes(e.target.value)}
                  className="w-full p-3 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all resize-none"
                />
              </div>

              {/* Submit Deliverable Button */}
              <button
                type="submit"
                disabled={submitting || (!selectedFile && !driveUrl.trim())}
                className="w-full py-3.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:bg-[var(--border-default)] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <Check size={16} />
                    <span>Submit Deliverable to Brand</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STATE 3: IN_REVIEW */}
          {selectedOrder.stage === "IN_REVIEW" && (
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-900">Deliverable Under Brand Review</h4>
                  <p className="text-xs text-purple-800/90 leading-relaxed mt-0.5">
                    Your video deliverable was submitted! The brand is reviewing your content. You will be notified once approved or if revisions are requested.
                  </p>
                </div>
              </div>

              {/* Option to re-submit if needed */}
              <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                <span className="text-xs text-purple-800 font-medium">Need to update your submission?</span>
                <button
                  type="button"
                  onClick={() => setShowReuploadForm(!showReuploadForm)}
                  className="text-xs font-bold text-[var(--violet)] hover:underline cursor-pointer"
                >
                  {showReuploadForm ? "Hide Upload Form" : "Re-upload / Update Video"}
                </button>
              </div>

              {showReuploadForm && (
                <form onSubmit={handleSubmitDeliverables} className="space-y-3 pt-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-purple-300 bg-white rounded-xl p-4 text-center cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/mov,video/webm,video/*"
                      onChange={(e) => {
  const file = e.target.files?.[0];
  if (file && file.size > 50 * 1024 * 1024) {
    toast.error("Please upload the file using a drive link or compress it to under 50 MB.");
    return;
  }
  setSelectedFile(file || null);
}}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-900">
                        <FileVideo size={16} className="text-[var(--violet)]" />
                        <span>{selectedFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-purple-700 flex items-center justify-center gap-2">
                        <Upload size={14} />
                        <span>Choose updated video file</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !selectedFile}
                    className="w-full py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>Submit Update</span>
                  </button>
                </form>
              )}
            </div>
          )}


          
          {/* STATE 3.5: COMPLETED_APPROVAL */}
          {selectedOrder.stage === "COMPLETED_APPROVAL" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-sm font-bold text-emerald-600">Draft Approved! Submit Live Link</h3>
              <p className="text-xs text-[var(--text-primary)]/80 max-w-lg mx-auto leading-relaxed">
                Your video draft was approved. Please submit the final live link (reels, posts, etc.) to trigger payout.
              </p>
              
              <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const link = formData.get("live_link");
                  if (!link) return;
                  try {
                    toast.loading("Submitting live link...", { id: "live-link" });
                    const targetThreadId = selectedOrder.raw?.thread_id;
                    const isUgc = selectedOrder?.is_ugc || !!selectedOrder?.order_id || String(targetThreadId).startsWith("ugc_");
                    const submitEndpoint = isUgc
                      ? `/ugc/threads/${targetThreadId}/submit-live-link`
                      : `/campaign/threads/${targetThreadId}/submit-live-link`;
                    await api.post(submitEndpoint, { links: [link] });
                    toast.success("Live link submitted! Payment will be processed.", { id: "live-link" });
                    loadOrders();
                  } catch(err) {
                    toast.error("Failed to submit live link", { id: "live-link" });
                  }
                }} className="space-y-3 text-left">
                  <input 
                    type="url" 
                    name="live_link"
                    placeholder="https://instagram.com/..." 
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                    required
                  />
                  <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                    <span>Submit Live Link</span>
                  </button>
                </form>

                {selectedOrder.deal_id && (
                  <>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-[var(--border-default)]"></div>
                      <span className="shrink-0 px-3 text-xs text-[var(--text-tertiary)] uppercase font-bold tracking-wider">OR</span>
                      <div className="flex-grow border-t border-[var(--border-default)]"></div>
                    </div>
                    <button 
                      onClick={() => navigate(`/collabs/new?dealId=${selectedOrder.deal_id}`)}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} />
                      <span>Sync Live Metrics (Collab)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STATE 4: COMPLETED */}

          {selectedOrder.stage === "COMPLETED" && (
            <div className={`p-6 rounded-2xl space-y-3 border ${
              selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${
                    selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }`}>
                    {selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number
                      ? "Order Completed & Payment Transferred!"
                      : "Order Completed & Payout Approved!"}
                  </h4>
                  <p className={`text-xs leading-relaxed ${
                    selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number
                      ? "text-emerald-800/90"
                      : "text-amber-800/90"
                  }`}>
                    {selectedOrder.payout_status === 'RELEASED' || selectedOrder.utr_number
                      ? `₹${formatAmount(selectedOrder.payout)} has been transferred to your bank account. ${selectedOrder.utr_number ? `UTR: ${selectedOrder.utr_number}` : ''}`
                      : `₹${formatAmount(selectedOrder.payout)} payout is approved! Funds will be credited to your bank account within 1–2 working days.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header / Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-default)] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Manage UGC Orders
            <span className="bg-[var(--violet)]/10 text-[var(--violet)] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[var(--violet)]/20">
              {orders.length} Total
            </span>
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5">
            Upload deliverables, track review status, and receive direct payments.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] px-3.5 py-2 rounded-xl border border-[var(--border-default)] text-xs font-bold transition-all self-start sm:self-center cursor-pointer active:scale-95 shadow-xs"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-[var(--violet)]" : ""} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Main Split Grid Layout (Left: Cards List | Right: Order Detail & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Claimed Orders List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Search & Status Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={14} />
              <input
                type="text"
                placeholder="Search by title or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-card)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-[var(--violet)] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "In Production" },
                { id: "in_review", label: "In Review" },
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

          {/* List of Cards */}
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
                    onClick={() => {
                      setSelectedOrderId(o.id);
                      setMobileDrawerOpen(true);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-[var(--bg-card)] border-[var(--violet)] shadow-md ring-2 ring-[var(--violet)]/20"
                        : "bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        {o.brandLogo ? (
                          <img src={o.brandLogo} alt={o.brandName} className="w-9 h-9 rounded-xl object-cover border border-[var(--border-default)] shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {o.brandName?.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2 leading-tight">{o.title}</h4>
                          <span className="text-[10px] text-[var(--text-tertiary)] font-medium block truncate">{o.brandName} • {o.orderNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--border-default)]">
                      <div>
                        <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider block">Payout</span>
                        <span className="text-xs font-black font-mono text-[#027A48]">₹{formatAmount(o.payout)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStageBadge(o.stage)}
                      </div>
                    </div>

                    {o.stage === "IN_PROGRESS" && o.deadline && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--border-default)] flex justify-between items-center">
                        <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase">Timer:</span>
                        <MiniCountdown deadline={o.deadline} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Main Order Details & Actions Box (Desktop: 8 Cols | Mobile: Slide-Up Drawer) */}
        <div className="hidden lg:block lg:col-span-8">
          {!selectedOrder ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-12 text-center">
              <p className="text-sm text-[var(--text-tertiary)] font-medium">Select an order from the list to view brief details and submit content.</p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              {renderOrderWorkspaceContent(selectedOrder)}
            </div>
          )}
        </div>

      {/* MOBILE ORDER WORKSPACE SLIDE-UP DRAWER MODAL */}
      <AnimatePresence>
        {mobileDrawerOpen && selectedOrder && (
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
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Order Details & Workspace</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
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

      </div>

      {/* Signature SLA Contract Modal */}
      {signingOrder && (
        <UGCContractModal
          brief={signingOrder.raw?.brief || { title: signingOrder.title, budget: signingOrder.payout }}
          orderId={signingOrder.id}
          threadId={signingOrder.raw?.thread_id}
          onClose={() => setSigningOrder(null)}
          onSigned={() => {
            setSigningOrder(null);
            loadOrders();
            toast.success("SLA Agreement executed! Production phase unlocked.");
          }}
        />
      )}

      {/* Universal Preview Modal */}
      <UniversalPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        url={previewUrl || selectedOrder?.videoUrl || selectedOrder?.driveUrl || driveUrl}
        notes={selectedOrder?.creatorNotes || creatorNotes}
        title={selectedOrder?.title ? `${selectedOrder.title} • Live Deliverable` : "Video Deliverable Preview"}
        creatorName={selectedOrder?.creatorName || "Creator"}
        isApproved={selectedOrder?.stage === "COMPLETED" || selectedOrder?.stage === "APPROVED"}
      />

      {/* Decline Revisions Modal */}
      <AnimatePresence>
        {showDeclineModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle size={18} />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Decline Revision Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Provide a polite explanation to the brand on why these requested modifications cannot be accommodated (e.g. out of scope of initial brief, physical product limitation, etc.).
              </div>

              <div>
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1.5">
                  Reason for Declining
                </label>
                <textarea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why the requested changes cannot be fulfilled..."
                  className="w-full p-3 bg-[var(--bg-base)] rounded-xl text-xs font-medium text-[var(--text-primary)] border border-[var(--border-default)] outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="flex-1 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-secondary)] font-bold text-xs rounded-xl border border-[var(--border-default)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeclineChanges}
                  disabled={declining || !declineReason.trim()}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {declining ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />}
                  <span>Decline Revisions</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
