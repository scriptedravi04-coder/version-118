import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { safeUpper } from "../../utils/safeFormat";
import { checkComprehensiveDisallowedContent } from "../../utils/contactSecurityFilter";
import { resolveReviewFlags } from "./chatFlowState";
import { Loader2, Send, Upload, FileText, FileSignature, CheckCircle, Info, MoreVertical, MessageCircle, Mail, MessageSquare, Search, ShieldAlert, Award, Lock, ShieldCheck, BarChart3, Handshake, Check, IndianRupee, CreditCard, Video, X, ExternalLink, Star, Clock, Eye, Building, AlertCircle, ChevronLeft } from "lucide-react";
import GeminiIcon from "../common/GeminiIcon";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import InvoiceModal from "../payments/InvoiceModal";
import { downloadInvoicePDF } from "../../utils/invoicePdf";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import axios from "axios";
import { toast } from "sonner";
import { showSecurityWarning } from "./SecurityWarningToast";
import SendBrief from "./SendBrief";
import BrandAgreement from "./BrandAgreement";
import AgreementSign from "./AgreementSign";
import DealInfoPanel from "./DealInfoPanel";
import NegotiationTable from "./NegotiationTable";
import BurgerMenuSupport from "./BurgerMenuSupport";
import SafetyModal from "./SafetyModal";
import ContractModal from "./ContractModal";
import UniversalPreviewModal from "../shared/UniversalPreviewModal";
import BrandPublicProfileModal from "../profile/BrandPublicProfileModal";
import AgencyBadge from "../common/AgencyBadge";
import { processRazorpayPayment } from "../../lib/razorpay";
import { io } from "socket.io-client";
import { safeStorage } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

export default function ChatBox({ thread, user: propUser, onlineUsers = [], onBack }) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [showBrandProfileModal, setShowBrandProfileModal] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [showBrandAgreeModal, setShowBrandAgreeModal] = useState(false);
  const [showCreatorAgreeModal, setShowCreatorAgreeModal] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showNegotiationTable, setShowNegotiationTable] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [showUniversalModal, setShowUniversalModal] = useState(false);
  const [universalPreviewUrl, setUniversalPreviewUrl] = useState("");
  
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [inputMode, setInputMode] = useState("chat");
  const [offerAmount, setOfferAmount] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const sendingOfferRef = useRef(false);

  // Custom fetch to update thread object locally if we don't have socket updates
  const [localThread, setLocalThread] = useState(thread);
  const [isPriceAccepted, setIsPriceAccepted] = useState(false);
  const [messagesLoadError, setMessagesLoadError] = useState(null);
  const [threadRefreshError, setThreadRefreshError] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const getDealAmount = (t) => {
    return t?.agreed_amount || t?.amount_fixed || t?.campaign?.budget || t?.campaign_budget || t?.ugc_order?.amount || t?.ugc_order?.creator_payout || t?.ugc_order?.agreed_amount || 0;
  };

  const isBrand = user?.role === 'brand' || user?.user_type === 'brand';
  
  const currentThread = (localThread && (localThread.id === thread?.id || localThread.deal_id === thread?.id || localThread.id === thread?.deal_id)) ? localThread : thread;
  const isTermsAccepted = currentThread ? (isBrand ? currentThread.terms_accepted_brand : currentThread.terms_accepted_creator) : false;

  const isCreatorSigned = Boolean(
    currentThread?.agreement_signed_creator || 
    currentThread?.is_signed_creator ||
    currentThread?.creator_signed ||
    currentThread?.contract_signed_creator
  );

  const isBrandSigned = Boolean(
    currentThread?.agreement_signed_brand || 
    currentThread?.is_signed_brand ||
    currentThread?.brand_signed ||
    currentThread?.contract_signed_brand
  );

  const isMySignatureSigned = isBrand ? isBrandSigned : isCreatorSigned;
  const isOtherPartySigned = isBrand ? isCreatorSigned : isBrandSigned;

  const rawStatus = (currentThread?.status || currentThread?.ugc_order?.status || "").toUpperCase();
  const ugcStatus = (currentThread?.ugc_order?.status || "").toUpperCase();
  const flowState = (currentThread?.flow_state || "").toUpperCase();

  const isUgcOrder = Boolean(
    currentThread?.is_ugc || 
    currentThread?.ugc_order_id || 
    currentThread?.ugc_brief_id ||
    currentThread?.ugc_order ||
    currentThread?.deal_type === 'UGC' || 
    currentThread?.type === 'ugc' ||
    currentThread?.ugc_title ||
    currentThread?.campaign_title?.toLowerCase()?.includes('ugc') ||
    currentThread?.title?.toLowerCase()?.includes('ugc') ||
    currentThread?.id?.startsWith('ugcord_') ||
    currentThread?.deal_id?.startsWith('ugcord_') ||
    currentThread?.id?.startsWith('thread_ugc_')
  );

  const isAgreementSigned = isUgcOrder ? true : (currentThread ? (
    (isBrandSigned && isCreatorSigned) ||
    false
  ) : false);

  const isDealFixed = isUgcOrder ? true : (currentThread ? (
    (currentThread?.status && safeUpper(currentThread.status) !== 'NEGOTIATING') || 
    currentThread?.flow_state === 'AI_AGREEMENT_READY' ||
    currentThread?.is_ugc
  ) : false);

  const hasCompletedMessage = React.useMemo(() => {
    return (messages || []).some(m => {
      const type = (m.message_type || '').toLowerCase();
      const content = (m.content || m.text || '').toLowerCase();
      return (
        type === 'payment_trigger' || 
        type === 'payout_released' || 
        type === 'chat_closed' ||
        content.includes('escrow payment released') ||
        content.includes('payout has been released') ||
        content.includes('collaboration completed') ||
        content.includes('ugc deliverable approved') ||
        content.includes('invoice generated and payment has been processed')
      );
    });
  }, [messages]);

  const isDealCompleted = currentThread ? Boolean(
    hasCompletedMessage ||
    ['COMPLETED', 'CLOSED', 'PAID', 'RELEASED', 'RESOLVED'].includes(currentThread?.status?.toUpperCase()) ||
    ['COMPLETED', 'CLOSED', 'PAID', 'RELEASED'].includes(currentThread?.ugc_order?.status?.toUpperCase()) ||
    ['COMPLETED', 'CLOSED', 'PAID', 'RELEASED'].includes(currentThread?.ugc_order?.payment_status?.toUpperCase()) ||
    ['COMPLETED', 'CLOSED', 'PAID', 'RELEASED'].includes(currentThread?.payout_status?.toUpperCase()) ||
    ['COMPLETED', 'CLOSED', 'PAID', 'RELEASED'].includes(currentThread?.flow_state?.toUpperCase()) ||
    Boolean(currentThread?.utr_number || currentThread?.transaction?.utr_number)
  ) : false;

  const isEscrowFunded = Boolean(
    currentThread?.payment_funded === true ||
    currentThread?.escrow_funded === true ||
    currentThread?.escrow_hold === true ||
    currentThread?.deal?.escrow_hold === true ||
    currentThread?.ugc_order?.escrow_hold === true ||
    Boolean(currentThread?.escrow_held_at || currentThread?.deal?.escrow_hold_at || currentThread?.ugc_order?.escrow_held_at) ||
    ['ESCROW_HELD', 'PAID', 'RELEASED', 'COMPLETED'].includes(currentThread?.payment_status?.toUpperCase()) ||
    ['ESCROW_HELD', 'PAID', 'RELEASED', 'COMPLETED'].includes(currentThread?.deal?.payment_status?.toUpperCase()) ||
    ['ESCROW_HELD', 'PAID', 'RELEASED', 'COMPLETED'].includes(currentThread?.ugc_order?.payment_status?.toUpperCase()) ||
    ['SUBMITTED', 'CONTENT_SUBMITTED', 'COMPLETED', 'APPROVED', 'IN_PROGRESS', 'ACCEPTED', 'REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_DECLINED', 'CONTENT_APPROVED', 'LIVE_LINKS_SUBMITTED', 'LIVE_LINK_REVISION', 'LIVE_LINKS_APPROVED'].includes(rawStatus) ||
    ['SUBMITTED', 'CONTENT_SUBMITTED', 'COMPLETED', 'APPROVED', 'IN_PROGRESS', 'ACCEPTED', 'REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_DECLINED', 'CONTENT_APPROVED', 'LIVE_LINKS_SUBMITTED', 'LIVE_LINK_REVISION', 'LIVE_LINKS_APPROVED'].includes(flowState) ||
    hasCompletedMessage ||
    Boolean(currentThread?.utr_number || currentThread?.transaction?.utr_number) ||
    (isUgcOrder && currentThread?.ugc_brief_id && currentThread?.payment_funded !== false) ||
    (messages || []).some(m => {
      const type = (m.message_type || '').toLowerCase();
      const text = (m.text || m.content || '').toLowerCase();
      const meta = m.metadata || {};
      return (
        type === 'payment_funded' ||
        type === 'payment_secured' ||
        meta.action === 'escrow_funded' ||
        meta.action === 'payment_secured' ||
        meta.isPayment === true ||
        meta.payment_funded === true ||
        text.includes('escrow payment secured') ||
        text.includes('secured into ybex escrow') ||
        text.includes('deposited into ybex escrow') ||
        text.includes('payment secured')
      );
    })
  );

  const isPaymentFunded = isEscrowFunded;

  const latestActionMsg = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    const relevant = messages.filter(m => 
      m.message_type === 'content_proof_submitted' || 
      m.message_type === 'CHANGES_REQUESTED' || 
      m.message_type === 'revision_requested' ||
      m.message_type === 'revision_declined' ||
      m.message_type === 'live_links_submitted'
    );
    return relevant.length > 0 ? relevant[relevant.length - 1] : null;
  }, [messages]);

  const dealStatus = (currentThread?.deal?.status || currentThread?.status || "").toUpperCase();
  const isContentApproved = !isDealCompleted && (
    ["APPROVED", "CONTENT_APPROVED", "REVISION_REQUESTED_LINKS", "REVISION_DECLINED_LINKS", "COMPLETED_APPROVAL"].includes(rawStatus) || 
    ["APPROVED", "CONTENT_APPROVED", "REVISION_REQUESTED_LINKS", "REVISION_DECLINED_LINKS", "COMPLETED_APPROVAL"].includes(ugcStatus) ||
    ["APPROVED", "CONTENT_APPROVED", "REVISION_REQUESTED_LINKS", "REVISION_DECLINED_LINKS", "COMPLETED_APPROVAL"].includes(flowState) ||
    ["APPROVED", "CONTENT_APPROVED", "REVISION_REQUESTED_LINKS", "REVISION_DECLINED_LINKS", "COMPLETED_APPROVAL"].includes(dealStatus) ||
    currentThread?.content_approved === true ||
    currentThread?.deal?.status === 'CONTENT_APPROVED' ||
    currentThread?.flow_state === 'CONTENT_APPROVED' ||
    (messages || []).some(m => m.message_type === 'content_approved' || (m.metadata && (m.metadata.action === 'draft_approved' || m.metadata.status === 'CONTENT_APPROVED')))
  );

  const {
    hasActiveRevisionMsg,
    hasActiveDeclineMsg,
    isRevisionRequested,
    isRevisionDeclined,
    isContentSubmitted
  } = resolveReviewFlags({
    isDealCompleted,
    isContentApproved,
    rawStatus,
    ugcStatus,
    flowState,
    latestActionType: latestActionMsg?.message_type || null
  });

  // CAMPAIGN ONLY. Once this user has signed the partnership contract the negotiation
  // table becomes view-only for them — otherwise a signature means nothing, because you
  // could sign and then re-open the table and move the numbers (creator-negotiate even
  // clears both signatures). Instant UGC has no signature stage and is untouched.
  const isUgcThread = Boolean(
    currentThread?.is_ugc ||
    currentThread?.ugc_order_id ||
    currentThread?.ugc_brief_id ||
    String(currentThread?.deal_type || '').toUpperCase() === 'UGC' ||
    String(currentThread?.type || '').toLowerCase() === 'ugc' ||
    String(currentThread?.id || '').startsWith('thread_ugc_') ||
    String(currentThread?.id || '').startsWith('ugcord_') ||
    String(currentThread?.deal_id || '').startsWith('ugcord_')
  );
  const isCampaignThread = !isUgcThread && Boolean(
    currentThread?.campaign_id ||
    String(currentThread?.deal_type || '').toUpperCase() === 'CAMPAIGN' ||
    String(currentThread?.type || '').toLowerCase() === 'campaign' ||
    String(currentThread?.id || '').startsWith('thread_camp_')
  );
  const isNegotiationLocked = isCampaignThread && Boolean(
    currentThread?.agreement_signed_brand ||
    currentThread?.agreement_signed_creator ||
    ['AI_AGREEMENT_READY', 'AWAITING_SIGNATURE', 'AGREEMENT_PENDING', 'CONTRACT_READY', 'CONTRACT_SIGNED', 'PROOF_SUBMITTED', 'ACTIVE', 'COMPLETED'].includes(String(currentThread?.flow_state || '').toUpperCase())
  );

  const isLiveLinksSubmitted = !isDealCompleted && (
    ["LIVE_LINKS_SUBMITTED", "LINKS_SUBMITTED", "LINKS_UNDER_REVIEW"].includes(rawStatus) ||
    ["LIVE_LINKS_SUBMITTED", "LINKS_SUBMITTED", "LINKS_UNDER_REVIEW"].includes(ugcStatus) ||
    (messages || []).some(m => m.message_type === 'live_links_submitted')
  );

  const showTabs = !isDealCompleted;

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [overallRating, setOverallRating] = useState(5);
  const [commRating, setCommRating] = useState(5);
  const [timeRating, setTimeRating] = useState(5);
  const [qualRating, setQualRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedInvoiceTxn, setSelectedInvoiceTxn] = useState(null);

  const handleViewInvoice = async () => {
    try {
      const { data } = await api.get('transactions');
      const match = data?.find(t => t.deal_id === currentThread?.deal_id || t.deal_id === currentThread?.id);
      if (match) {
        setSelectedInvoiceTxn(match);
      } else {
        const amt = currentThread?.amount_fixed || currentThread?.agreed_amount || 5000;
        setSelectedInvoiceTxn({
          id: `txn_${currentThread?.id?.slice(0, 8) || 'direct'}`,
          created_at: currentThread?.updated_at || new Date().toISOString(),
          campaign_title: currentThread?.campaign_title || "Campaign Partnership",
          amount: amt,
          fee_amount: amt * 0.1,
          net_amount: amt * 0.9,
          status: "SUCCESS"
        });
      }
    } catch (err) {
      const amt = currentThread?.amount_fixed || currentThread?.agreed_amount || 5000;
      setSelectedInvoiceTxn({
        id: `txn_${currentThread?.id?.slice(0, 8) || 'direct'}`,
        created_at: currentThread?.updated_at || new Date().toISOString(),
        campaign_title: currentThread?.campaign_title || "Campaign Partnership",
        amount: amt,
        fee_amount: amt * 0.1,
        net_amount: amt * 0.9,
        status: "SUCCESS"
      });
    }
  };

  const handleDownloadInvoice = async () => {
    let transaction = null;
    const amt = currentThread?.amount_fixed || currentThread?.agreed_amount || 5000;
    try {
      const { data } = await api.get('transactions');
      const match = data?.find(t => t.deal_id === currentThread?.deal_id || t.deal_id === currentThread?.id);
      if (match) {
        transaction = match;
      }
    } catch (err) {
      console.error(err);
    }

    if (!transaction) {
      transaction = {
        id: `txn_${currentThread?.id?.slice(0, 8) || 'direct'}`,
        created_at: currentThread?.updated_at || new Date().toISOString(),
        campaign_title: currentThread?.campaign_title || "Campaign Partnership",
        amount: amt,
        fee_amount: amt * 0.1,
        net_amount: amt * 0.9,
        status: "SUCCESS"
      };
    }

    const payeeName = currentThread?.creator?.name || currentThread?.creator?.username || "UGC Creator";
    downloadInvoicePDF(transaction, isBrand, payeeName);
    toast.success("Invoice PDF downloaded successfully! 🧾");
  };

  useEffect(() => {
    if (currentThread?.status === 'COMPLETED') {
      const hasReviewed = isBrand ? currentThread?.reviewed_by_brand : currentThread?.reviewed_by_creator;
      if (!hasReviewed) {
        setShowReviewModal(true);
      }
    }
  }, [currentThread?.status, currentThread?.reviewed_by_brand, currentThread?.reviewed_by_creator, isBrand]);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (currentThread?.id) {
      const stateSuffix = isPaymentFunded ? "funded" : "pending";
      setBannerDismissed(safeStorage.getItem(`dismissed_finalized_deal_${currentThread.id}_${stateSuffix}`) === "true");
    }
  }, [currentThread?.id, isPaymentFunded]);

  const dismissBanner = () => {
    if (currentThread?.id) {
      const stateSuffix = isPaymentFunded ? "funded" : "pending";
      safeStorage.setItem(`dismissed_finalized_deal_${currentThread.id}_${stateSuffix}`, "true");
    }
    setBannerDismissed(true);
  };

  const [aiLoading, setAiLoading] = useState(false);

  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const handleAiEvaluation = async () => {
    setIsAiEvaluating(true);
    try {
      // Simulate API call to track performance
      await new Promise(r => setTimeout(r, 1500));
      toast.success("AI Performance evaluation complete! Stats updated in Leaderboard.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to run AI evaluation.");
    } finally {
      setIsAiEvaluating(false);
    }
  };

  const handleAiAssist = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("ai/negotiation", {
        history: currentThread.messages || [],
        offer: currentThread.agreed_amount,
        brandContext: currentThread.campaign,
        creatorContext: currentThread.creator
      });
      if (data && data.suggestedResponse) {
        setText(data.suggestedResponse);
        toast.success(data.advice || "AI Suggestion loaded!");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to get AI assistance.");
    } finally {
      setAiLoading(false);
    }
  };


  const activeTabMode = showTabs ? inputMode : "chat";

  // Escrow Payment state & handlers
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleEscrowPayment = async () => {
    setPaymentLoading(true);
    setPaymentStep("Launching Razorpay Gateway...");
    const grossAmt = currentThread?.amount_fixed || currentThread?.agreed_amount || 15000;
    try {
      await processRazorpayPayment({
        dealId: currentThread?.deal_id || currentThread?.id,
        threadId: currentThread?.id,
        campaignId: currentThread?.campaign_id || null,
        creatorId: currentThread?.creator_id || null,
        grossAmount: grossAmt,
        onSuccess: async (res) => {
          setLocalThread(prev => ({
            ...prev,
            ...(res?.thread || {}),
            payment_funded: true,
            status: 'ACTIVE',
            production_started_at: new Date().toISOString()
          }));
          setPaymentSuccess(true);
          toast.success("Payment secured in Ybex Escrow! Creator has been notified.");
          setInputMode("chat");
          await refreshThread();
          await loadMessages();
        },
        onError: (err) => {
          toast.error(err?.message || "Razorpay transaction cancelled or failed.");
        }
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Payment authorization failed");
    } finally {
      setPaymentLoading(false);
      setPaymentStep("");
    }
  };

  // Creator Content Upload states & handlers
  const [contentUrl, setContentUrl] = useState("");
  const [contentNotes, setContentNotes] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [liveLinks, setLiveLinks] = useState([""]);
  const [livePostUrl, setLivePostUrl] = useState("");
  const [livePostNotes, setLivePostNotes] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isManualRevisionOpen, setIsManualRevisionOpen] = useState(false);
  const videoUploadInputRef = useRef(null);

  const handleAddLiveLink = () => {
    setLiveLinks([...liveLinks, ""]);
  };

  const handleLiveLinkChange = (index, value) => {
    const updated = [...liveLinks];
    updated[index] = value;
    setLiveLinks(updated);
  };

  const handleRemoveLiveLink = (index) => {
    if (liveLinks.length > 1) {
      setLiveLinks(liveLinks.filter((_, i) => i !== index));
    }
  };

  const handleSendLiveLinks = async () => {
    const rawLink = (livePostUrl || liveLinks[0] || "").trim();
    if (!rawLink) {
      toast.error("Please paste your live post link.");
      return;
    }
    setUploadLoading(true);
    try {
      const threadId = currentThread?.id;
      const dealId = currentThread?.deal_id || currentThread?.deal?.id || (threadId?.startsWith('thread_camp_') ? threadId.replace('thread_camp_', '') : threadId);

      // Call backend submit-live-link route
      const isUgc = Boolean(isUgcOrder || isUgcThread);
      const submitLiveLinkEndpoint = isUgc
        ? `/ugc/threads/${threadId}/submit-live-link`
        : `/campaign/threads/${threadId}/submit-live-link`;
      await api.post(submitLiveLinkEndpoint, {
        link: rawLink,
        links: [rawLink],
        notes: livePostNotes || contentNotes || ""
      });

      // Also call add-collab as safety sync if campaign deal
      if (dealId && !dealId.startsWith('ugcord_')) {
        try {
          await api.post(`/deals/${dealId}/add-collab`, {
            instagram_post_url: rawLink,
            notes: livePostNotes || contentNotes || ""
          });
        } catch (collabErr) {
          console.warn("[handleSendLiveLinks] /deals/:id/add-collab fallback notice:", collabErr);
        }
      }

      toast.success("Live link submitted successfully! 🚀");
      setInputMode("chat");
      setLivePostUrl("");
      setLivePostNotes("");
      setLiveLinks([""]);
      if (typeof loadMessages === 'function') await loadMessages();
      if (typeof refreshThread === 'function') await refreshThread();
    } catch (e) {
      toast.error("Failed to submit live link: " + (e?.response?.data?.error || e?.message));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCreatorSubmitContent = async () => {
    if (uploadLoading) return;
    if (!selectedUploadFile && !contentUrl.trim()) {
      toast.error("Please select a video file or enter a valid link for your draft content.");
      return;
    }
    setUploadLoading(true);
    setUploadProgress(0);
    try {
      const targetUgcOrderId = currentThread?.ugc_order_id || 
        currentThread?.ugc_order?.id || 
        (currentThread?.id?.startsWith('ugcord_') ? currentThread.id : null) ||
        (currentThread?.deal_id?.startsWith('ugcord_') ? currentThread.deal_id : null) ||
        (currentThread?.id?.startsWith('thread_ugc_') ? currentThread.id.replace('thread_ugc_', '') : (isUgcOrder ? currentThread?.deal_id : null));

      let finalVideoUrl = contentUrl.trim();

      if (selectedUploadFile) {
        toast.loading("Requesting secure upload link...", { id: "ugc-chat-submit" });
        const fileExt = selectedUploadFile.name.split('.').pop();
        const fileName = `${currentThread?.id}-${Date.now()}.${fileExt}`;
        const filePath = `ugc-videos/${fileName}`;

        const { data: signedData } = await api.post("/upload/signed-url", {
          bucket: "content-submissions",
          path: filePath,
          contentType: selectedUploadFile.type
        });

        toast.loading("Uploading UGC video...", { id: "ugc-chat-submit" });

        const { error: uploadError } = await supabase.storage
          .from("content-submissions")
          .uploadToSignedUrl(signedData.path, signedData.token, selectedUploadFile);

        if (uploadError) {
          throw uploadError;
        }

        finalVideoUrl = filePath; // Save relative path so backend can sign it later
      }
      
      toast.loading("Saving submission...", { id: "ugc-chat-submit" });

      const submitPayload = {
        videoUrl: finalVideoUrl,
        video_url: finalVideoUrl,
        content_url: finalVideoUrl,
        notes: contentNotes.trim(),
        creator_notes: contentNotes.trim()
      };

      if (isUgcOrder || targetUgcOrderId) {
        // Connect to the exact same submission pipeline as Manage Orders
        const orderIdToCall = targetUgcOrderId || currentThread?.id;
        await api.post(`/ugc/orders/${orderIdToCall}/submit`, submitPayload);
      } else {
        await api.post(`/campaign/threads/${currentThread?.id}/submit-content`, submitPayload);
      }
      toast.success("Content deliverable successfully submitted! Brand panel has been notified.", { id: "ugc-chat-submit" });
      setInputMode("chat");
      setContentUrl("");
      setContentNotes("");
      setSelectedUploadFile(null);
      setIsManualRevisionOpen(false);
      await loadMessages();
      await refreshThread();
    } catch (e) {
      toast.error("Failed to submit content draft: " + (e?.response?.data?.error || e?.message), { id: "ugc-chat-submit" });
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  const effectiveInputMode = showTabs ? inputMode : "chat";

  // Sponsorship and Contract Negotiation states
  const [isNegotiatingFee, setIsNegotiatingFee] = useState(false);
  const [counterAmountInput, setCounterAmountInput] = useState("");
  const [flowLoading, setFlowLoading] = useState(false);

  // OTP Signature and Inline Negotiation States
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isNegotiatingInline, setIsNegotiatingInline] = useState(false);
  const [counterAmountInline, setCounterAmountInline] = useState("");



  useEffect(() => {
    setLocalThread(thread);
    if (!thread) return;

    // Check safety acceptance from safeStorage for this specific user + thread
    const acceptedKey = `safety_accepted_${user?.user_id || user?.id || 'anon'}_${thread.id}`;
    const accepted = safeStorage.getItem(acceptedKey) === 'true';
    setSafetyAccepted(accepted);
    if (!accepted) {
      setShowSafetyModal(true);
    }

    loadMessages();

    // Setup active WebSocket connection
    const socket = io(window.location.origin, {
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      socket.emit("register_user", user?.user_id || user?.id);
      socket.emit("join_room", thread.id);
    });

    socket.on("new_message", (newMessage) => {
      if (newMessage && (newMessage.thread_id === thread.id || newMessage.conversation_id === thread.id)) {
        setMessages((prev) => {
          const newId = newMessage.id || newMessage.message_id;
          // If message already exists by real id, ignore but purge any matching pending temp message
          if (prev.some((m) => m.id === newId || (newMessage.message_id && m.id === newMessage.message_id))) {
            return prev.filter(m => !(String(m.id).startsWith("temp_") && m.content === newMessage.content));
          }

          // Check if this incoming message matches a pending optimistic temp message
          const tempIdx = prev.findIndex(
            (m) => String(m.id).startsWith("temp_") && m.content === newMessage.content
          );
          if (tempIdx !== -1) {
            const copy = [...prev];
            copy[tempIdx] = newMessage;
            return copy;
          }

          // Filter out any matching temp message and append the new incoming message
          const filtered = prev.filter(m => !(String(m.id).startsWith("temp_") && m.content === newMessage.content));
          return [...filtered, newMessage];
        });
      }
    });

    socket.on("thread_updated", (updatedThread) => {
      const tId = updatedThread.id || updatedThread.threadId || updatedThread.thread_id || updatedThread.deal_id;
      if (updatedThread && (tId === thread.id || tId === thread.deal_id)) {
        setLocalThread(prev => {
          const merged = { ...prev, ...updatedThread };
          if (prev?.ugc_order && updatedThread.ugc_order) {
            merged.ugc_order = { ...prev.ugc_order, ...updatedThread.ugc_order };
          }
          if (updatedThread.revision_notes === null) {
            delete merged.revision_notes;
            delete merged.revision_feedback;
            if (merged.ugc_order) {
              delete merged.ugc_order.revision_notes;
              delete merged.ugc_order.revision_feedback;
            }
          }
          return merged;
        });
        loadMessages();
        refreshThread();
      }
    });

    socket.on("agreement_signed", (payload) => {
      const tId = payload?.id || payload?.threadId || payload?.thread_id || payload?.deal_id;
      if (payload && (tId === thread.id || tId === thread.deal_id)) {
        setLocalThread(prev => ({
          ...prev,
          ...payload,
          status: payload.both_signed ? 'ACTIVE' : (prev?.status || payload.status),
          flow_state: payload.both_signed ? 'ACTIVE' : (payload.flow_state || 'AGREEMENT_SIGNED'),
          agreement_signed_creator: payload.agreement_signed_creator ?? prev?.agreement_signed_creator,
          agreement_signed_brand: payload.agreement_signed_brand ?? prev?.agreement_signed_brand,
        }));
        loadMessages();
        refreshThread();
      }
    });

    socket.on("payment_funded", (payload) => {
      if (payload && (payload.threadId === thread.id || payload.thread_id === thread.id || payload.deal_id === thread.deal_id || payload.dealId === thread.deal_id)) {
        setLocalThread(prev => ({
          ...prev,
          payment_funded: true,
          status: 'ACTIVE',
          production_started_at: new Date().toISOString()
        }));
        setPaymentSuccess(true);
        loadMessages();
        refreshThread();
        toast.success("Payment received & confirmed in Ybex Escrow!");
      }
    });

    socket.on("order_updated", (orderPayload) => {
      if (orderPayload && (orderPayload.id === thread.deal_id || orderPayload.id === thread.id)) {
        refreshThread();
        loadMessages();
      }
    });

    socket.on("deal_updated", (dealPayload) => {
      if (dealPayload && (dealPayload.id === thread.deal_id || dealPayload.id === thread.id)) {
        refreshThread();
        loadMessages();
      }
    });

    const interval = setInterval(() => {
      loadMessages();
      refreshThread();
    }, 6000);

    return () => {
      socket.emit("leave_room", thread.id);
      socket.disconnect();
      clearInterval(interval);
    };
  }, [thread?.id, user?.user_id]);

  // Handle marking messages as read reactively and dispatching event purely
  useEffect(() => {
    if (thread && user && messages.length > 0) {
      safeStorage.setItem(`last_read_count_${user.user_id || user.id}_${thread.id}`, String(messages.length));
      window.dispatchEvent(new Event("chat_read_update"));
    }
  }, [messages.length, thread?.id, user?.user_id || user?.id]);

  useEffect(() => {
    if (isDealFixed && !isAgreementSigned) {
      setInputMode("offer");
    }
  }, [isDealFixed, isAgreementSigned]);

  useEffect(() => {
    if (isAgreementSigned) {
      setInputMode("chat");
    }
  }, [isAgreementSigned]);

  const handleAcceptSafety = () => {
    if (!thread) return;
    const acceptedKey = `safety_accepted_${user?.user_id || user?.id || 'anon'}_${thread.id}`;
    safeStorage.setItem(acceptedKey, 'true');
    setSafetyAccepted(true);
    setShowSafetyModal(false);
    toast.success("Platform Safety Guidelines signed off successfully!");
  };

  const handleReviewSubmit = async () => {
    if (overallRating < 1 || overallRating > 5) {
      toast.error("Please provide an overall rating between 1 and 5 stars.");
      return;
    }
    setSubmittingReview(true);
    try {
      const reviewEndpoint = (currentThread?.is_ugc || currentThread?.deal_type === 'UGC')
        ? `/ugc/threads/${currentThread?.id}/submit-review`
        : `/campaign/threads/${currentThread?.id}/submit-review`;
      await api.post(reviewEndpoint, {
        rating: overallRating,
        communication_rating: commRating,
        timeliness_rating: timeRating,
        quality_rating: qualRating,
        comment: reviewComment
      });
      toast.success("Feedback submitted successfully! Thank you for rating the experience.");
      setShowReviewModal(false);
      refreshThread();
    } catch (e) {
      toast.error("Failed to submit feedback: " + (e?.response?.data?.error || e?.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    // Just auto-scroll to bottom to ensure new messages are visible
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, [messages.length, currentThread?.id]);

  const refreshThread = async () => {
    if (!thread) return;
    try {
      const { data } = await api.get(`/chat/v2/threads/${thread.id}`, { bypassCache: true });
      if (data) {
        setLocalThread(data);
        setThreadRefreshError(null);
      }
    } catch (err) {
      console.error("Failed to refresh thread:", err);
      setThreadRefreshError(err?.response?.data?.detail || err?.message || "Thread refresh failed");
    }
  };

  const loadMessages = async () => {
    if (!thread) return;
    try {
      const { data } = await api.get(`/chat/v2/threads/${thread.id}/messages`, { bypassCache: true });
      if (data && Array.isArray(data)) {
        const filteredData = data.filter(m => m.content !== "⏳ Waiting for the other party to sign.");
        
        setMessages((prev) => {
          const seen = new Set();
          const merged = [];
          for (const m of filteredData) {
            const key = m.id || m.message_id;
            const contentKey = (
              m.message_type === "system" || 
              m.message_type === "creator_signed" || 
              m.message_type === "brand_signed" || 
              m.message_type === "agreement_executed" || 
              m.message_type === "payment_secured" || 
              !m.sender_user_id || 
              m.sender_role === "system"
            ) && m.content
              ? `sys_${m.content.trim()}`
              : null;
            if (key && !seen.has(key) && (!contentKey || !seen.has(contentKey))) {
              seen.add(key);
              if (contentKey) seen.add(contentKey);
              merged.push(m);
            }
          }
          const pending = prev.filter(m => String(m.id).startsWith("temp_") && m.status === "sending");
          for (const p of pending) {
            const matched = filteredData.some(f => f.content === p.content);
            if (!matched && !seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          }
          return merged;
        });
        setMessagesLoadError(null);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessagesLoadError(err?.response?.data?.detail || err?.message || "Failed to load messages");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error("Please upload the file using a drive link or compress it to under 50 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (uploadingAttachment) return;
    if (!file || !thread) return;
    setUploadingAttachment(true);
    try {
      toast.loading("Requesting secure upload link...", { id: "chat-attach" });
      const fileExt = file.name.split('.').pop();
      const fileName = `${thread.id}-${Date.now()}.${fileExt}`;
      const filePath = `chat-attachments/${fileName}`;

      const { data: signedData } = await api.post("/upload/signed-url", {
        bucket: "content-submissions", // Reusing the same bucket
        path: filePath,
        contentType: file.type || "application/octet-stream"
      });

      toast.loading("Uploading attachment...", { id: "chat-attach" });

      const { error: uploadError } = await supabase.storage
        .from("content-submissions")
        .uploadToSignedUrl(signedData.path, signedData.token, file);

      if (uploadError) {
        throw uploadError;
      }

      const fileUrl = filePath; // Save relative path so backend can sign it later
      
      toast.loading("Sending message...", { id: "chat-attach" });

      if (fileUrl) {
        const isVideo = file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|webm)$/i);
        const isRevisionMode = currentThread?.flow_state === 'REVISION_REQUESTED' || currentThread?.status === 'REVISION_REQUESTED' || currentThread?.flow_state === 'REVISION_REQ' || currentThread?.status === 'REVISION_REQ' || currentThread?.ugc_order?.status === 'REVISION_REQ';
        
        let msgData;
        if (isVideo && isRevisionMode && !isBrand) {
          // If Creator uploads a video while brand is waiting for a revision, treat it as a revised deliverable
          const localTargetUgcOrderId = currentThread?.ugc_order_id || 
            currentThread?.ugc_order?.id || 
            (currentThread?.id?.startsWith('ugcord_') ? currentThread.id : null) ||
            (currentThread?.deal_id?.startsWith('ugcord_') ? currentThread.deal_id : null) ||
            (currentThread?.id?.startsWith('thread_ugc_') ? currentThread.id.replace('thread_ugc_', '') : (isUgcOrder ? currentThread?.deal_id : null));
          const orderIdToCall = localTargetUgcOrderId || thread.id;
          const submitEndpoint = (isUgcOrder || localTargetUgcOrderId) ? `/ugc/orders/${orderIdToCall}/submit` : `/campaign/threads/${thread.id}/submit-content`;
          const { data } = await api.post(submitEndpoint, {
            videoUrl: fileUrl,
            notes: "Revised video uploaded via chat"
          });
          msgData = data?.message || data; // handleUgcDeliverableSubmit returns { message } 
          if (data && !data.error) {
            refreshThread(); // Immediately refresh thread to update flow_state
          }
        } else {
          // Normal attachment
          const { data } = await api.post(`/chat/v2/threads/${thread.id}/messages`, {
            content: `📎 Attached file: ${file.name}`,
            message_type: 'attachment',
            attachment_url: fileUrl
          });
          msgData = data;
        }

        if (msgData) {
          setMessages(prev => [...prev.filter(m => m.id !== msgData.id), msgData]);
        }
        toast.success(isVideo && isRevisionMode && !isBrand ? "Revised draft submitted successfully!" : "File attached successfully!", { id: "chat-attach" });
        loadMessages();
      } else {
        toast.error("File upload returned no URL.", { id: "chat-attach" });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to upload file attachment.", { id: "chat-attach" });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !thread || sendingRef.current || loading) return;
    if (isDealFixed && !isAgreementSigned) {
      toast.error("Please sign the SLA Contract first to unlock messaging.");
      return;
    }
    const msg = text.trim();

    // Instant feedback only. The server runs the same check independently, so this is not
    // the enforcement point — it just saves a round-trip and keeps the typed text in the
    // box so the user can edit rather than retype.
    const leak = checkComprehensiveDisallowedContent(msg, {
      threadId: thread.id,
      senderId: user?.user_id || user?.id
    });
    if (leak.blocked) {
      toast.error(leak.message || "Contact details can't be shared in chat.");
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    setText("");

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const effectiveMyId = user?.user_id || user?.id || (isBrand ? (currentThread?.brand_id || thread?.brand_id) : (currentThread?.creator_id || thread?.creator_id));
    const optimisticMsg = {
      id: tempId,
      thread_id: thread.id,
      sender_id: effectiveMyId,
      sender_user_id: effectiveMyId,
      sender_role: isBrand ? 'brand' : 'creator',
      content: msg,
      message_type: 'text',
      created_at: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data } = await api.post(`/chat/v2/threads/${thread.id}/messages`, {
        content: msg,
        message_type: 'text'
      });
      if (data) {
        setMessages((prev) => {
          const withoutTemp = prev.filter(m => m.id !== tempId && !(String(m.id).startsWith("temp_") && m.content === msg));
          const alreadyExists = withoutTemp.some((m) => m.id === data.id || (data.message_id && m.id === data.message_id));
          if (alreadyExists) {
            return withoutTemp;
          }
          return [...withoutTemp, data];
        });
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed', error: 'Failed to send' } : m
        )
      );
      if (err.response?.data?.blocked) {
        showSecurityWarning(err.response?.data?.error || "Contact details cannot be shared in chat. Please keep all communications on-platform.");
      } else {
        toast.error("Failed to send message: " + (err.response?.data?.error || err.response?.data?.detail || err.message));
      }
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const uniqueMessages = React.useMemo(() => {
    const confirmed = messages.filter(m => m && !String(m.id).startsWith("temp_"));
    const seen = new Set();
    const result = [];
    for (const msg of messages) {
      if (!msg) continue;
      const key = msg.id || (msg.created_at ? `${msg.created_at}_${msg.content}` : null);
      if (String(msg.id).startsWith("temp_")) {
        const alreadyConfirmed = confirmed.some(c => c.content === msg.content);
        if (alreadyConfirmed) continue;
      }
      if (key) {
        if (!seen.has(key)) {
          seen.add(key);
          result.push(msg);
        }
      } else {
        result.push(msg);
      }
    }
    return result;
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-base)] dark:bg-black relative overflow-hidden h-full">
        {/* Smooth, subtle grid background that softly fades out towards the edges */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[120%] absolute bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwIDBMMCAwaDB2MzBoMzBWMHptLTEgMXYyOEgxVjFoMjh6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDcpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] [mask-image:radial-gradient(circle_at_center,black_0%,transparent_50%)] opacity-70"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center mt-[-40px]">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-[var(--bg-elevated)] rounded-3xl flex items-center justify-center rotate-[-6deg] shadow-xl border border-[var(--border-default)]">
               <Mail size={40} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="w-24 h-24 bg-[var(--bg-surface)] rounded-3xl flex items-center justify-center absolute top-0 left-0 rotate-[6deg] shadow-lg border border-[var(--border-default)] backdrop-blur-sm shadow-[0_0_40px_rgba(255,255,255,0.1)]">
               <Mail size={40} className="text-[var(--text-primary)]/80" />
            </div>
          </div>
          
          <h3 className="text-2xl font-sans font-bold text-[var(--text-primary)] mb-2">No activity yet</h3>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mb-8">
            You'll receive notifications for important updates and whenever you're mentioned on Ybex.
          </p>

          {isBrand ? (
            <Link to="/creators" className="px-6 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg">
               <Search size={18} /> Explore Creators
            </Link>
          ) : (
            <Link to="/campaigns" className="px-6 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg">
               <Search size={18} /> Explore Campaigns
            </Link>
          )}
        </div>
      </div>
    );
  }

  const partnerName = isBrand 
    ? (thread.creator?.profile?.full_name || thread.creator?.profile?.name || thread.creator?.full_name || thread.creator?.name || 'Creator') 
    : (thread.brand?.profile?.company_name || thread.brand?.company_name || thread.brand?.name || 'Brand');
  const getPartnerPic = (partner, partnerIsBrand) => {
    if (!partner) return "";
    if (partnerIsBrand) {
      const url = partner.profile?.logo || 
                  partner.logo || 
                  partner.logo_url || 
                  partner.profile?.logo_url ||
                  partner.photo || 
                  partner.picture || 
                  partner.avatar || 
                  partner.avatar_url || 
                  partner.profile_picture_url || 
                  partner.profile?.photo || 
                  partner.profile?.picture || 
                  partner.profile?.avatar;
      return url || "";
    } else {
      const url = partner.photo || 
                  partner.picture || 
                  partner.avatar || 
                  partner.avatar_url || 
                  partner.profile_picture_url || 
                  partner.profile?.photo || 
                  partner.profile?.picture || 
                  partner.profile?.avatar ||
                  partner.logo || 
                  partner.logo_url || 
                  partner.profile?.logo || 
                  partner.profile?.logo_url;
      return url || "";
    }
  };
  const partnerPic = getPartnerPic(isBrand ? thread.creator : thread.brand, !isBrand);
  
  const partnerId = isBrand ? thread?.creator_id : thread?.brand_id;
  const isPartnerOnline = partnerId && onlineUsers.includes(partnerId);

  const handleOfferComplete = async () => {
    await loadMessages();
    await refreshThread();
    setInputMode("chat");
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[var(--bg-base)] dark:bg-black overflow-hidden">
      {/* Header */}
      <div className="h-13 md:h-20 px-3 md:px-6 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--bg-card)]/90 shrink-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onBack) {
                onBack();
              } else {
                navigate(isBrand ? '/brand/inbox' : '/chat');
              }
            }}
            className="md:hidden -ml-1 mr-0.5 p-1.5 text-gray-700 dark:text-gray-200 hover:text-gray-900 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            aria-label="Back to inbox"
          >
            <ChevronLeft size={22} className="stroke-[2.5]" />
          </button>

          <div 
            onClick={() => {
              if (!isBrand) {
                setShowBrandProfileModal(true);
              } else if (partnerId) {
                navigate(`/creator/${partnerId}`);
              }
            }}
            className="flex items-center gap-2 md:gap-4 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
            title="Click to view public profile"
          >
            <div className="relative w-8 h-8 md:w-11 md:h-11 rounded-full overflow-hidden shrink-0 border border-[var(--border-default)] group-hover:border-[var(--violet)] transition-all p-0.5 bg-slate-100 shadow-xs">
              <img src={partnerPic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName || 'Unknown')}`} alt="" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                <h2 className="font-extrabold text-[var(--text-primary)] leading-tight group-hover:text-[var(--violet)] transition-colors text-xs md:text-base truncate">{partnerName}</h2>
                <CheckCircle size={13} className="text-emerald-500 shrink-0 md:w-3.5 md:h-3.5" />
                {!isBrand && (thread?.brand?.profile?.is_agency || currentThread?.brand?.profile?.is_agency || currentThread?.is_agency || thread?.is_agency) && (
                  <AgencyBadge size="xs" />
                )}
              </div>
              <div className="text-[10px] md:text-xs text-[var(--text-secondary)] mt-0.5 font-semibold flex items-center gap-1 md:gap-1.5 truncate">
                {(currentThread?.is_ugc || currentThread?.ugc_order_id || currentThread?.ugc_title || currentThread?.ugc_order || currentThread?.ugc_brief) && (
                  <span className="px-1 py-0.2 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                    UGC
                  </span>
                )}
                <span className="truncate max-w-[140px] sm:max-w-[280px] font-medium">{currentThread?.ugc_title || currentThread?.ugc_brief?.title || currentThread?.ugc_order?.title || currentThread?.campaigns?.title || currentThread?.campaign_title || 'Direct Deal'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <button 
            onClick={() => { setShowInfoPanel(!showInfoPanel); setShowNegotiationTable(false); }}
            className="p-1.5 md:p-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-strong)] rounded-full text-amber-500 hover:text-amber-400 transition-all flex items-center justify-center border border-[var(--border-default)] cursor-pointer"
            title="Sponsorship Request Card"
          >
            <Award size={16} className="md:w-5 md:h-5" />
          </button>
          <BurgerMenuSupport thread={currentThread} user={user} />
        </div>
      </div>

      {/* Pinned Deal-Status Strip below header */}
      {(isAgreementSigned || rawStatus === 'ACTIVE' || flowState === 'ACTIVE' || isDealFixed) && (
        <div className={`w-full shrink-0 z-10 px-3.5 py-2 md:px-6 md:py-2.5 border-b flex items-center justify-between text-xs backdrop-blur-xs transition-colors ${
          isDealCompleted || isEscrowFunded
            ? "bg-emerald-50/95 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/50"
            : "bg-amber-50/95 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-800/50"
        }`}>
          <div className={`flex items-center gap-2 font-semibold min-w-0 ${
            isDealCompleted || isEscrowFunded
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-amber-800 dark:text-amber-300"
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              isDealCompleted || isEscrowFunded
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)] animate-pulse"
            }`} />
            <span className="truncate text-xs md:text-sm">
              {isDealCompleted
                ? `Deal completed · ₹${(getDealAmount(currentThread) || 3000).toLocaleString('en-IN')} payment released`
                : isEscrowFunded
                  ? `Deal active · ₹${(getDealAmount(currentThread) || 3000).toLocaleString('en-IN')} secured in escrow`
                  : "Deal active · Payment pending"
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isDealCompleted ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-300/50 dark:border-emerald-700/50">
                Completed
              </span>
            ) : isEscrowFunded ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-300/50 dark:border-emerald-700/50">
                Escrow Protected
              </span>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Panel Content Router */}
        <div className={`flex-1 overflow-y-auto bg-slate-100/60 dark:bg-transparent no-scrollbar relative flex flex-col`}>
        
        {/* Messages Feed */}
        <div className="flex-1 p-1.5 sm:p-6 flex flex-col justify-end" ref={scrollRef}>
          <AnimatePresence>
            {uniqueMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-tertiary)]">
                <MessageSquare size={32} className="opacity-40 mb-3" />
                <p className="text-sm">No messages yet. Send a message to start conversing!</p>
              </div>
            ) : (
              uniqueMessages.map((msg, msgIdx) => {
                const effectiveMyId = user?.user_id || user?.id || (isBrand ? (currentThread?.brand_id || thread?.brand_id) : (currentThread?.creator_id || thread?.creator_id));
                const isTempMine = String(msg.id).startsWith("temp_");
                
                // Decouple visual system card styling from sender attribution
                const isPaymentOutflowForBrand = Boolean(
                  msg.message_type === 'payment_trigger' ||
                  msg.message_type === 'payment_released' ||
                  msg.message_type === 'payout_released' ||
                  msg.message_type === 'content_approved' ||
                  msg.metadata?.action === 'PAYOUT_RELEASED' ||
                  msg.metadata?.action === 'payment_released' ||
                  msg.metadata?.action === 'approved'
                );

                const msgSenderId = msg.sender_id || msg.sender_user_id || msg.metadata?.sender_id || msg.metadata?.creator_id;
                const msgSenderRole = msg.sender_role || msg.metadata?.sender_role || (
                  msg.message_type === 'live_links_submitted' || msg.message_type === 'live_links_resubmit_declined' || msg.message_type === 'content_proof_submitted' || msg.message_type === 'creator_signed'
                    ? 'creator'
                    : (msg.message_type === 'live_links_approved' || msg.message_type === 'live_links_resubmit_request' || msg.message_type === 'revision_requested' || msg.message_type === 'brand_signed' || isPaymentOutflowForBrand
                      ? 'brand'
                      : undefined)
                );

                const isMine = isTempMine || Boolean(
                  (msgSenderId && effectiveMyId && String(msgSenderId) === String(effectiveMyId)) ||
                  (isPaymentOutflowForBrand && isBrand) ||
                  (msgSenderRole && msgSenderRole !== 'system' && (
                    (isBrand && msgSenderRole === 'brand') ||
                    (!isBrand && msgSenderRole === 'creator')
                  ))
                );
                return (
                  <MessageBubble 
                    key={msg.id || (msg.created_at ? `${msg.created_at}_${msg.content}` : `msg-fallback-${msgIdx}`)} 
                    onViewContract={(offer) => { setShowContractModal(true); setCurrentOffer(offer); }}
                    onNegotiate={() => { 
                      setInputMode("offer"); 
                      if (!offerAmount) {
                        setOfferAmount(currentThread?.amount_fixed || currentThread?.agreed_amount || 15000); 
                      }
                    }} 
                    onSelectUploadTab={() => {
                      setInputMode("upload");
                    }}
                    message={msg} 
                    isMine={isMine} 
                    isUserBrand={isBrand}
                    threadId={thread?.id} 
                    thread={currentThread}
                    campaignTitle={currentThread?.campaign_title || thread?.campaign_title || "Campaign"}
                    onActionComplete={handleOfferComplete}
                    onViewInvoice={handleViewInvoice}
                    onTriggerReview={() => setShowReviewModal(true)}
                    onDownloadInvoice={handleDownloadInvoice}
                    partnerPic={partnerPic}
                    partnerName={partnerName}
                  />
                );
              })
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} style={{ height: 1 }} />
        </div>
        </div> {/* Close Main Panel Content Router div */}
        
        {/* Desktop Persistent Input & Mode Controller Area */}
        <div className="hidden md:block bg-[var(--bg-card)] border-t border-[var(--border-default)] rounded-t-3xl p-3 shrink-0 z-10 w-full relative shadow-md">
            {/* Mode Controls tabs: Chat & Offer Removed */}
            
            {/* Safety & Compliance Indicators or Finalized Banner */}
            {!isAgreementSigned && !safetyAccepted && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2.5 md:p-3 mb-2 md:mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl md:rounded-2xl max-w-4xl mx-auto backdrop-blur-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 md:w-9 md:h-9 bg-amber-500/10 rounded-lg md:rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                    <Lock size={14} className="md:w-4 md:h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[10px] md:text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Campaign Dashboard Protected</h4>
                    <p className="text-[10px] md:text-[11px] text-[var(--text-secondary)] leading-tight">Please read and accept the official Ybex Safety Guidelines to release transactions.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSafetyModal(true)}
                  className="px-2.5 py-1 md:px-3.5 md:py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] md:text-xs transition-colors shrink-0 whitespace-nowrap shadow-xs"
                >
                  Review & Unlock
                </button>
              </div>
            )}

            {/* Tabs & Input Area */}
            <div className="max-w-4xl mx-auto w-full">
              {/* Tabs */}
              {showTabs && (
                <div className="flex bg-[var(--bg-elevated)] border border-[var(--border-default)] p-0.5 md:p-1 rounded-lg md:rounded-xl mb-1.5 md:mb-2 gap-1 md:gap-1.5">
                  <button 
                    onClick={() => setInputMode("chat")}
                    className={`flex-1 py-1 md:py-1.5 px-2 md:px-3 font-bold text-[10px] md:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1 md:gap-2 transition-all rounded-md md:rounded-lg cursor-pointer
                      ${activeTabMode === "chat" ? "bg-[var(--bg-card)] text-[var(--violet)] shadow-xs border border-[var(--border-default)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                  >
                    <MessageCircle size={13} className="md:w-3.5 md:h-3.5" /> CHAT
                  </button>
                  
                  {!isAgreementSigned ? (
                    <button 
                      onClick={() => { 
                        if (isDealFixed && !isMySignatureSigned) {
                          setCurrentOffer({
                            id: currentThread?.id,
                            amount: getDealAmount(currentThread),
                            revision_count: currentThread?.revision_count || 1,
                            deadline: currentThread?.deadline,
                          });
                          setShowContractModal(true);
                        } else {
                          setInputMode("offer"); 
                          if (!offerAmount) setOfferAmount(currentThread?.amount_fixed || 15000); 
                        }
                      }}
                      className={`flex-1 py-1 md:py-1.5 px-2 md:px-3 font-bold text-[10px] md:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1 md:gap-2 transition-all rounded-md md:rounded-lg cursor-pointer
                        ${activeTabMode === "offer" ? "bg-[var(--bg-card)] text-blue-500 shadow-xs border border-[var(--border-default)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                    >
                      {isDealFixed ? (
                        isMySignatureSigned ? (
                          <>
                            <CheckCircle size={13} className="text-emerald-500 md:w-3.5 md:h-3.5" /> 
                            <span>{isOtherPartySigned ? 'AGREEMENT SIGNED' : 'WAITING SIGNATURE'}</span>
                            {isOtherPartySigned ? (
                              <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            ) : (
                              <span className="relative flex h-2 w-2 ml-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <FileSignature size={13} className="text-rose-500 md:w-3.5 md:h-3.5" /> 
                            <span className="text-rose-500">SIGN AGREEMENT</span>
                            <span className="relative flex h-2 w-2 ml-0.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          <Handshake size={13} className="md:w-3.5 md:h-3.5" /> NEGOTIATE OFFER
                        </>
                      )}
                    </button>
                  ) : isBrand ? (
                    <button 
                      onClick={() => setInputMode("payment")}
                      className={`flex-1 py-1 md:py-1.5 px-2 md:px-3 font-bold text-[10px] md:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1 md:gap-2 transition-all rounded-md md:rounded-lg cursor-pointer
                        ${activeTabMode === "payment" ? "bg-[var(--bg-card)] text-emerald-500 shadow-xs border border-[var(--border-default)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                    >
                      {isPaymentFunded ? (
                        <>
                          <ShieldCheck size={13} className="text-emerald-400 md:w-3.5 md:h-3.5" /> ESCROW SECURED
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={13} className="text-rose-500 md:w-3.5 md:h-3.5" /> 
                          <span className="text-rose-500">MAKE PAYMENT</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setInputMode("upload")}
                      className={`flex-1 py-1 md:py-1.5 px-2 md:px-3 font-bold text-[10px] md:text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1 md:gap-2 transition-all rounded-md md:rounded-lg cursor-pointer
                        ${activeTabMode === "upload" 
                          ? (isContentSubmitted
                              ? "bg-amber-500/20 text-amber-950 dark:text-amber-200 shadow-sm border-2 border-amber-500/50 font-black"
                              : (isContentApproved || isDealCompleted
                                  ? "bg-[var(--bg-card)] shadow-xs border border-[var(--border-default)] text-emerald-500" 
                                  : (isRevisionRequested || isManualRevisionOpen)
                                    ? "bg-[var(--bg-card)] shadow-xs border border-[var(--border-default)] text-amber-600 dark:text-amber-400"
                                    : isRevisionDeclined
                                      ? "bg-[var(--bg-card)] shadow-xs border border-[var(--border-default)] text-rose-500"
                                      : "bg-[var(--bg-card)] shadow-xs border border-[var(--border-default)] text-indigo-500"))
                          : (isContentSubmitted
                              ? "text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-500/10"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}`}
                    >
                      {isDealCompleted ? (
                        <>
                          <CheckCircle className="text-emerald-400 font-bold shrink-0" size={13} />
                          <span>COMPLETED</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </>
                      ) : isContentApproved ? (
                        <>
                          <ExternalLink className="text-emerald-400 font-bold shrink-0" size={13} />
                          <span>SUBMIT LINK</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                        </>
                      ) : (isRevisionRequested || isManualRevisionOpen) ? (
                        <>
                          <AlertCircle className="text-rose-400 font-bold shrink-0" size={13} />
                          <span className="text-rose-500">{isManualRevisionOpen ? "SUBMIT REVISION" : "REVISIONS REQUIRED"}</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        </>
                      ) : isRevisionDeclined ? (
                        <>
                          <AlertCircle className="text-rose-400 font-bold shrink-0" size={13} />
                          <span>REVISIONS DECLINED</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        </>
                      ) : isContentSubmitted ? (
                        <>
                          <Clock className="text-amber-700 dark:text-amber-400 font-bold shrink-0 animate-pulse" size={13} />
                          <span className="text-amber-950 dark:text-amber-200 font-black tracking-wider">AWAITING APPROVAL</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 dark:bg-amber-400"></span>
                          </span>
                        </>
                      ) : !isPaymentFunded ? (
                        <>
                          <Loader2 className="animate-spin text-amber-400 font-bold shrink-0" size={13} />
                          <span>WAITING FOR ESCROW</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} className="text-rose-500" />
                          <span className="text-rose-500">UPLOAD CONTENT</span>
                          <span className="relative flex h-2 w-2 ml-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Content Area */}
              <div className="w-full">
                {activeTabMode === "chat" ? (
                  <div>
                    {isDealCompleted ? (
                      <div className="p-3 md:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl md:rounded-2xl flex items-center justify-between gap-2 md:gap-3 text-xs font-bold text-emerald-400">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <CheckCircle size={14} className="text-emerald-400 shrink-0 md:w-4 md:h-4" />
                          <span className="text-[11px] md:text-xs">Deal Completed — Chat is closed for this order.</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[9px] md:text-[10px]">
                          COMPLETED
                        </span>
                      </div>
                    ) : (
                      <>
                        {messagesLoadError && (
                          <div className="mb-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-[11px] md:text-xs text-rose-400">
                            <span>Connection issue loading messages: {messagesLoadError}</span>
                            <button onClick={loadMessages} className="px-2 py-0.5 bg-rose-500 text-white font-bold rounded hover:bg-rose-600 transition-colors cursor-pointer">Retry</button>
                          </div>
                        )}
                        
                        <div className={`flex items-center sm:items-end gap-1 md:gap-3 rounded-2xl md:rounded-3xl bg-[var(--bg-base)] border border-[var(--border-default)] p-1 px-1.5 md:p-2 md:px-4 shadow-xs ${
                          isDealFixed && !isAgreementSigned && !isMySignatureSigned ? "opacity-60 pointer-events-none" : ""
                        }`}>
                          <button 
                            type="button"
                            onClick={handleAiAssist}
                            disabled={aiLoading || (isDealFixed && !isAgreementSigned && !isMySignatureSigned)}
                            title="AI Negotiation Assistant"
                            className="p-1.5 md:p-2.5 text-[var(--violet)] hover:text-white hover:bg-[var(--violet)] transition-colors rounded-full shrink-0 cursor-pointer"
                          >
                            {aiLoading ? <Loader2 size={16} className="animate-spin md:w-5 md:h-5" /> : <GeminiIcon className="w-4 h-4 md:w-5 md:h-5" />}
                          </button>
                          <textarea
                            value={text}
                            disabled={isDealFixed && !isAgreementSigned && !isMySignatureSigned}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!e.nativeEvent.isComposing && !sendingRef.current && !loading && text.trim()) {
                                  handleSend();
                                }
                              }
                            }}
                            placeholder={isDealFixed && !isAgreementSigned ? (!isMySignatureSigned ? "Please sign contract above to send messages..." : `Waiting for ${isBrand ? 'creator' : 'brand'} signature...`) : "Type a message..."}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none max-h-32 min-h-[34px] md:min-h-[40px] py-1.5 md:py-2.5 text-xs md:text-sm focus:outline-none"
                            rows={1}
                          />
                          <button 
                            type="button"
                            disabled={!text.trim() || loading || (isDealFixed && !isAgreementSigned && !isMySignatureSigned)}
                            onClick={() => {
                              if (!sendingRef.current && !loading && text.trim()) {
                                handleSend();
                              }
                            }}
                            className={`p-1.5 md:p-2.5 shrink-0 rounded-full transition-all flex items-center justify-center cursor-pointer
                              ${(!text.trim() || loading || (isDealFixed && !isAgreementSigned && !isMySignatureSigned)) ? 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] opacity-60' : 'bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)] shadow-xs'}`}
                          >
                            {loading ? (
                              <Loader2 size={14} className="animate-spin md:w-4 md:h-4 text-white" />
                            ) : (
                              <Send size={14} className={`md:w-4 md:h-4 ${text.trim() ? "ml-0.5" : ""}`} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : activeTabMode === "payment" ? (
                  <div className="p-5 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-default)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">Ybex Secure Payment</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your funds are kept 100% safe until content is approved.</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-4 border border-[var(--border-default)] text-left">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--border-default)]/60">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Deal Agreed Amount</span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">₹ {getDealAmount(currentThread).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Platform Security Fee</span>
                        <span className="text-xs text-[#027A48] font-bold">FREE (₹ 0)</span>
                      </div>
                    </div>

                    {isPaymentFunded ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-left">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Check size={16} />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-emerald-400">Secure Payment Completed</h5>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">The sum of ₹{getDealAmount(currentThread).toLocaleString('en-IN')} is locked in secure holding. Creator can now begin creation.</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleEscrowPayment}
                        disabled={paymentLoading}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                      >
                        {paymentLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>{paymentStep}</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={16} />
                            <span>Pay ₹{getDealAmount(currentThread).toLocaleString('en-IN')} via Razorpay (100% Escrow Protected)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : activeTabMode === "upload" ? (
                  <div className="p-5 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isContentSubmitted && !isDealCompleted && !isContentApproved
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-2 border-amber-500/40"
                            : isDealCompleted
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        }`}>
                          {isContentSubmitted && !isDealCompleted && !isContentApproved ? (
                            <Clock size={20} className="text-amber-700 dark:text-amber-400 animate-pulse" />
                          ) : (
                            <Video size={20} />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {isDealCompleted ? "Collaboration Completed" : isContentApproved ? "Submit Live Links" : (isRevisionRequested || isManualRevisionOpen) ? "Submit Revised Deliverable" : isContentSubmitted ? "Draft Under Review" : "Upload Content Deliverable"}
                            </h4>
                            {isContentSubmitted && !isDealCompleted && !isContentApproved && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-black uppercase tracking-wider">
                                Under Review
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {isDealCompleted ? "Deliverables approved and payment has been released." : isContentApproved ? "Submit the final live URLs where you published the content." : (isRevisionRequested || isManualRevisionOpen) ? "Upload your updated video draft deliverable below." : isContentSubmitted ? "Draft has been submitted to the brand for review." : "Upload your video file or share a link for brand review."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInputMode("chat");
                          setIsManualRevisionOpen(false);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl transition-all cursor-pointer"
                      >
                        Back to Chat
                      </button>
                    </div>

                    {isDealCompleted ? (
                      <div className="space-y-4 text-left">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                          <div>
                            <h5 className="text-xs font-bold text-emerald-400">Deliverables Approved & Payment Released!</h5>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">The collaboration is complete. No further uploads are needed.</p>
                          </div>
                        </div>
                      </div>
                    ) : !isPaymentFunded ? (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-left">
                        <Lock size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <h5 className="text-xs font-bold text-amber-400">Please do not upload content until the brand funds are escrowed</h5>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">As long as the brand has not made the payment, please do not upload your content. The chat is open. Please ask the brand to complete the payment before uploading content.</p>
                        </div>
                      </div>
                    ) : isContentApproved ? (
                      <div className="space-y-4 text-left">
                        {((currentThread?.flow_state || currentThread?.status) === 'REVISION_REQUESTED_LINKS' || (currentThread?.flow_state || currentThread?.status) === 'REVISION_DECLINED_LINKS') ? (
                          <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                            (currentThread?.flow_state || currentThread?.status) === 'REVISION_DECLINED_LINKS' 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold font-sans">
                                {(currentThread?.flow_state || currentThread?.status) === 'REVISION_DECLINED_LINKS' ? "Resubmission Request Declined" : "Correction/Resubmission Requested! ⚠️"}
                              </h5>
                              <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-sans leading-relaxed">
                                <strong className="text-[var(--text-primary)]">Feedback from Brand:</strong> "{currentThread?.revision_notes_links || "Please review and submit correct live links again."}"
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                            <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                            <div>
                              <h5 className="text-xs font-bold text-emerald-400">Draft Approved by Brand! 🎉</h5>
                              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Please submit your live published post link to complete the deal and release payout.</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                            Paste your live post link (Instagram/YouTube/etc.)
                          </label>
                          <input 
                            id="live-post-link-input"
                            type="url" 
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                            value={livePostUrl}
                            onChange={e => setLivePostUrl(e.target.value)}
                            placeholder="https://www.instagram.com/p/... or https://youtu.be/..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                            Additional notes for the brand (optional)
                          </label>
                          <textarea 
                            id="live-post-notes-input"
                            rows={3}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none"
                            value={livePostNotes}
                            onChange={e => setLivePostNotes(e.target.value)}
                            placeholder="Additional notes for the brand (optional)..."
                          />
                        </div>

                        <button
                          id="submit-live-link-button"
                          type="button"
                          onClick={handleSendLiveLinks}
                          disabled={uploadLoading || !livePostUrl.trim()}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                        >
                          {uploadLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Submitting live link...</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink size={16} />
                              <span>Submit Live Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (isContentSubmitted && !isRevisionRequested && !isManualRevisionOpen) ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-500/40 dark:border-amber-500/50 rounded-xl flex items-start sm:items-center gap-3.5 text-left shadow-xs">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                            <Clock size={18} className="animate-pulse text-amber-700 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h5 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                                Draft Submitted Successfully!
                              </h5>
                              <span className="text-[10px] font-extrabold text-amber-950 dark:text-amber-200 bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-500/40">
                                48-Hour Review Active
                              </span>
                            </div>
                            <p className="text-xs text-amber-950/85 dark:text-amber-200/90 font-medium mt-1 leading-relaxed">
                              The brand has 48 hours to review the draft and approve payout or request revisions.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 text-left bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border-default)] text-xs shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)] font-bold text-[11px] uppercase tracking-wider">Submission on record:</span>
                            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Active Submission
                            </span>
                          </div>
                          <a
                            href={currentThread?.content_url || currentThread?.ugc_order?.video_url || currentThread?.ugc_order?.submission_link || currentThread?.video_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 font-semibold select-all break-all block font-mono text-xs tracking-tight hover:underline flex items-center gap-1.5 py-1.5 px-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg transition-colors"
                          >
                            <ExternalLink size={12} className="shrink-0 text-amber-700 dark:text-amber-400" />
                            <span className="truncate">
                              {currentThread?.content_url || currentThread?.ugc_order?.video_url || currentThread?.ugc_order?.submission_link || currentThread?.video_url || "Video draft uploaded"}
                            </span>
                          </a>
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setIsManualRevisionOpen(true);
                          }}
                          className="w-full py-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Upload size={14} className="text-amber-700 dark:text-amber-400" />
                          <span>Submit a Revision</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        {isRevisionRequested && (
                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-400">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Revision Requested by Brand</span>
                              <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">
                                {currentThread?.revision_notes || currentThread?.ugc_order?.revision_notes || currentThread?.ugc_order?.revision_feedback || currentThread?.ugc_order?.creator_notes || latestActionMsg?.metadata?.feedback || latestActionMsg?.metadata?.notes || "Please incorporate requested edits and resubmit your draft below."}
                              </span>
                            </div>
                          </div>
                        )}

                        {isManualRevisionOpen && (
                          <div className="flex items-center justify-between p-3 bg-amber-500/15 border-2 border-amber-500/40 rounded-xl text-xs text-amber-950 dark:text-amber-200 font-semibold shadow-xs">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>Upload an updated version of your video draft deliverable.</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsManualRevisionOpen(false);
                                setSelectedUploadFile(null);
                                setContentUrl("");
                                setContentNotes("");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-amber-500/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* File Upload Box */}
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                            Upload Video Deliverable (MP4, MOV, WEBM)
                          </label>
                          <input
                            type="file"
                            ref={videoUploadInputRef}
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 50 * 1024 * 1024) {
                                  toast.error("Please upload the file using a drive link or compress it to under 50 MB.", { id: "ugc-chat-submit" });
                                  return;
                                }
                                setSelectedUploadFile(file);
                              }
                            }}
                            className="hidden"
                          />
                          
                          {selectedUploadFile ? (
                            <div className="p-4 bg-[var(--bg-card)] border border-indigo-500/30 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                  <Video size={20} />
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{selectedUploadFile.name}</p>
                                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{(selectedUploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedUploadFile(null)}
                                className="p-1.5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                                title="Remove file"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => videoUploadInputRef.current?.click()}
                              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                              onDragLeave={() => setIsDraggingFile(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingFile(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  setSelectedUploadFile(e.dataTransfer.files[0]);
                                }
                              }}
                              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                                isDraggingFile ? "border-indigo-500 bg-indigo-500/5" : "border-[var(--border-default)] hover:border-indigo-500/50 bg-[var(--bg-card)]"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                <Upload size={18} />
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-bold text-[var(--text-primary)]">Click or drag video file here to upload</p>
                                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Max file size: 50MB (Use Drive link for larger files)</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* OR Drive Link */}
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                            OR Paste Google Drive / Frame.io / Dropbox Share Link
                          </label>
                          <input 
                            type="url" 
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                            value={contentUrl}
                            onChange={e => setContentUrl(e.target.value)}
                            placeholder="https://drive.google.com/file/d/..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                            Notes for Brand (Optional)
                          </label>
                          <textarea 
                            rows={2}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none"
                            value={contentNotes}
                            onChange={e => setContentNotes(e.target.value)}
                            placeholder="Add any notes regarding music licensing, variations, or captions..."
                          />
                        </div>

                        {uploadLoading && (
                          <div className="space-y-1.5 bg-[var(--bg-elevated)] p-3 rounded-xl border border-indigo-500/20">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-indigo-400 flex items-center gap-1.5">
                                <Loader2 className="animate-spin" size={13} />
                                Uploading video deliverable...
                              </span>
                              <span className="font-mono text-indigo-400 font-bold">{uploadProgress > 0 ? `${uploadProgress}%` : "Processing..."}</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-default)]">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 rounded-full"
                                style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-[var(--text-tertiary)]">Please keep this tab open until the upload finishes.</p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleCreatorSubmitContent}
                          disabled={uploadLoading || (!selectedUploadFile && !contentUrl.trim())}
                          className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                        >
                          {uploadLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>{uploadProgress > 0 ? `Uploading (${uploadProgress}%)...` : "Submitting deliverable..."}</span>
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              <span>{(isRevisionRequested || isManualRevisionOpen) ? "Submit Revised Deliverable" : "Submit Deliverable to Brand"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-default)]">
                    {isDealFixed && !isAgreementSigned ? (
                      <div className="p-5 text-center max-w-md mx-auto">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0 mx-auto mb-4">
                          <Lock size={22} className="animate-pulse" />
                        </div>
                        <h4 className="text-base font-bold text-[var(--text-primary)]">Sponsorship Deal Accepted! 🎉</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                          The offer of <strong className="text-[var(--text-primary)]">₹ {getDealAmount(currentThread).toLocaleString('en-IN')}</strong> has been accepted by both parties. Please sign the official partnership contract to lock the deal and activate the campaign.
                        </p>

                        <div className="mt-5 space-y-3">
                          {/* Check who has signed */}
                          <div className="flex flex-col gap-2 p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] text-xs text-left">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Creator Signature:</span>
                              <span className={`font-bold ${currentThread?.agreement_signed_creator ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {currentThread?.agreement_signed_creator ? 'Signed ✓' : 'Pending ⏳'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Brand Signature:</span>
                              <span className={`font-bold ${currentThread?.agreement_signed_brand ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {currentThread?.agreement_signed_brand ? 'Signed ✓' : 'Pending ⏳'}
                              </span>
                            </div>
                          </div>

                          {((isBrand && !currentThread?.agreement_signed_brand) || (!isBrand && !currentThread?.agreement_signed_creator)) ? (
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  setCurrentOffer({
                                    id: currentThread?.id,
                                    amount: getDealAmount(currentThread),
                                    revision_count: currentThread?.revision_count || 1,
                                    deadline: currentThread?.deadline,
                                  });
                                  setShowContractModal(true);
                                }}
                                className="w-full py-3 px-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-[var(--violet)]/10 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <CheckCircle size={16} />
                                <span>Sign Partnership Contract</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNegotiationTable(true);
                                }}
                                className="w-full py-2 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-bold text-xs rounded-xl border border-[var(--border-default)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>View Offer</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                                You have signed! Waiting for the other party's signature.
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNegotiationTable(true);
                                }}
                                className="w-full py-2 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-bold text-xs rounded-xl border border-[var(--border-default)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>View Offer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Preset Chips */}
                        <div className="flex flex-wrap gap-2 mb-6">
                      {(() => {
                        const basePrice = getDealAmount(currentThread) || 5000;
                        if (!isBrand) {
                          // Creator side: Suggest higher offers
                          if (basePrice <= 1000) {
                            return [basePrice, basePrice + 100, basePrice + 200, basePrice + 300, basePrice + 500];
                          } else if (basePrice <= 5000) {
                            const step = basePrice >= 15000 ? 1000 : 500;
                            return [basePrice, basePrice + step, basePrice + step * 2, basePrice + step * 3, basePrice + step * 4];
                          } else {
                            const step = Math.round((basePrice * 0.2) / 1000) * 1000 || 1000;
                            return [basePrice, basePrice + step, basePrice + step * 2, basePrice + step * 3, basePrice + step * 4];
                          }
                        } else {
                          // Brand side: Suggest lower offers
                          if (basePrice <= 1000) {
                            return [basePrice, Math.max(100, basePrice - 100), Math.max(100, basePrice - 200), Math.max(100, basePrice - 300), Math.max(100, basePrice - 400)];
                          } else if (basePrice <= 5000) {
                            const step = basePrice >= 15000 ? 1000 : 500;
                            return [basePrice, Math.max(100, basePrice - step), Math.max(100, basePrice - step * 2), Math.max(100, basePrice - step * 3), Math.max(100, basePrice - step * 4)];
                          } else {
                            const step = Math.round((basePrice * 0.2) / 1000) * 1000 || 1000;
                            return [basePrice, Math.max(100, basePrice - step), Math.max(100, basePrice - step * 2), Math.max(100, basePrice - step * 3), Math.max(100, basePrice - step * 4)];
                          }
                        }
                      })().map(amt => (
                        <button 
                          key={amt} 
                          onClick={() => setOfferAmount(amt)}
                          className="px-4 py-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] text-sm font-bold text-[var(--text-secondary)] hover:border-blue-500 hover:text-blue-500 transition-colors shadow-sm"
                        >
                          ₹ {amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                    
                    {/* Amount Input */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center text-4xl font-bold text-[var(--text-primary)] tracking-tight">
                        <span className="mr-2 text-[var(--text-secondary)]">₹</span>
                        <input 
                          type="number" 
                          className="bg-transparent border-none focus:ring-0 w-48 p-0 text-4xl font-bold text-[var(--text-primary)] tracking-tight placeholder-[var(--text-tertiary)]"
                          value={offerAmount}
                          onChange={e => setOfferAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          const amt = Number(offerAmount);
                          if (!amt || amt <= 0 || sendingOffer || sendingOfferRef.current) return;
                          sendingOfferRef.current = true;
                          setSendingOffer(true);
                          try {
                            await api.post(`/campaign/threads/${thread.id}/creator-negotiate`, {
                              counter_amount: amt
                            });
                            setOfferAmount("");
                            setInputMode("chat");
                            await loadMessages();
                            refreshThread();
                          } catch (err) {
                            toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to send offer");
                          } finally {
                            setSendingOffer(false);
                            sendingOfferRef.current = false;
                          }
                        }}
                        disabled={!offerAmount || sendingOffer || loading}
                        className="w-full sm:w-auto px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {sendingOffer ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          "Send Offer"
                        )}
                      </button>
                    </div>

                    {/* Feedback Box */}
                    {(() => {
                      const base = currentThread?.amount_fixed || 15000;
                      const val = Number(offerAmount);
                      let color = 'text-[var(--text-secondary)]';
                      let bg = 'bg-[var(--bg-surface)]';
                      let border = 'border-[var(--border-default)]';
                      let msg = 'Enter an amount';
                      let sub = '';

                      if (val > 0) {
                        if (!isBrand) {
                          // Creator side (negotiating up)
                          if (val <= base * 1.2) {
                            color = 'text-emerald-500'; bg = 'bg-emerald-500/10'; border = 'border-emerald-500/20';
                            msg = 'Reasonable Counter Offer!'; sub = "High chance of brand approval.";
                          } else if (val <= base * 1.5) {
                            color = 'text-amber-500'; bg = 'bg-amber-500/10'; border = 'border-amber-500/20';
                            msg = 'Premium Counter Offer'; sub = "A bit high, requires solid justification.";
                          } else {
                            color = 'text-rose-500'; bg = 'bg-rose-500/10'; border = 'border-rose-500/20';
                            msg = 'Significantly Higher Offer'; sub = "May face brand hesitation.";
                          }
                        } else {
                          // Brand side (negotiating down)
                          if (val >= base * 0.9) {
                            color = 'text-emerald-500'; bg = 'bg-emerald-500/10'; border = 'border-emerald-500/20';
                            msg = 'Very fair brand offer!'; sub = "High chance of creator's reply.";
                          } else if (val >= base * 0.7) {
                            color = 'text-amber-500'; bg = 'bg-amber-500/10'; border = 'border-amber-500/20';
                            msg = 'Discounted Offer'; sub = "Creator might negotiate up.";
                          } else {
                            color = 'text-rose-500'; bg = 'bg-rose-500/10'; border = 'border-rose-500/20';
                            msg = 'Considerably low offer'; sub = "Low chance of acceptance.";
                          }
                        }
                      }

                      return (
                        <div className={`mt-6 p-4 rounded-xl border ${bg} ${border} ${color} relative`}>
                          <div className={`absolute -top-2 left-8 w-4 h-4 rotate-45 border-t border-l ${bg} ${border.replace('border-', 'border-t-').replace('border-', 'border-l-')}`}></div>
                          <div className="font-bold text-sm relative z-10">{msg}</div>
                          {sub && <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1 relative z-10">{sub}</div>}
                        </div>
                      );
                    })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

        {/* MOBILE Single Bottom Dock (84px thumb zone) */}
        <div className="block md:hidden bg-[var(--bg-card)] border-t border-[var(--border-default)] px-3.5 pt-2 pb-2.5 shrink-0 z-20 w-full shadow-lg">
          {/* Row 1: Mode Chips */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                setShowPaymentSheet(false);
                setShowUploadSheet(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                !showPaymentSheet && !showUploadSheet
                  ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 shadow-xs"
                  : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <MessageCircle size={13} />
              <span>Chat</span>
            </button>

            {isBrand ? (
              <button
                type="button"
                onClick={() => {
                  setShowPaymentSheet(true);
                  setShowUploadSheet(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showPaymentSheet
                    ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 shadow-xs"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <CreditCard size={13} />
                <span>{!isPaymentFunded ? "Make payment" : isDealCompleted ? "Deal Completed" : isLiveLinksSubmitted ? "Review Live Links" : isContentApproved ? "Waiting for Live Link" : isRevisionDeclined ? "Changes Declined" : isRevisionRequested ? "Waiting for changes" : isContentSubmitted ? "Review Content" : "Waiting for Content"}</span>
                {!isPaymentFunded ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowUploadSheet(true);
                  setShowPaymentSheet(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showUploadSheet
                    ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 shadow-xs"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Video size={13} />
                <span>{isContentApproved ? "Submit Links" : isContentSubmitted ? "Draft Under Review" : "Upload Content"}</span>
                {!isContentSubmitted && !isDealCompleted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                )}
              </button>
            )}
          </div>

          {/* Row 2: Composer */}
          <div className="flex items-center gap-2">
            {/* EXISTING AI-suggestion button (GeminiIcon / aiLoading spinner) */}
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={aiLoading || (isDealFixed && !isAgreementSigned && !isMySignatureSigned)}
              title="AI Negotiation Assistant"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/40 text-[var(--violet)] hover:bg-[var(--violet)] hover:text-white transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <GeminiIcon className="w-4 h-4" />
              )}
            </button>

            {/* Input field */}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!sendingRef.current && !loading && text.trim()) {
                    handleSend();
                  }
                }
              }}
              disabled={isDealFixed && !isAgreementSigned && !isMySignatureSigned}
              placeholder={
                isDealFixed && !isAgreementSigned
                  ? (!isMySignatureSigned ? "Please sign SLA Contract first..." : "Waiting for other signature...")
                  : "Type a message..."
              }
              className="flex-1 min-w-0 h-9 bg-gray-100 dark:bg-neutral-800/90 rounded-full px-4 text-xs text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--violet)]/40 border-0"
            />

            {/* Send button */}
            <button
              type="button"
              disabled={!text.trim() || loading || (isDealFixed && !isAgreementSigned && !isMySignatureSigned)}
              onClick={() => {
                if (!sendingRef.current && !loading && text.trim()) {
                  handleSend();
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                text.trim() && !loading && !(isDealFixed && !isAgreementSigned && !isMySignatureSigned)
                  ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950 hover:opacity-90 shadow-xs"
                  : "bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={14} className={text.trim() ? "ml-0.5" : ""} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Payment Bottom Sheet */}
        <AnimatePresence>
          {showPaymentSheet && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaymentSheet(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative z-10 bg-[var(--bg-card)] rounded-t-3xl border-t border-[var(--border-default)] shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
              >
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-700 rounded-full mx-auto mb-4" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-primary)]">Ybex Secure Escrow</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Funds are protected in 100% escrow until delivery.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPaymentSheet(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-default)] text-left">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--border-default)]/60">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Deal Agreed Amount</span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">₹ {(getDealAmount(currentThread) || 3000).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Platform Security Fee</span>
                    <span className="text-xs text-[#027A48] font-bold">FREE (₹ 0)</span>
                  </div>
                </div>

                {isPaymentFunded ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Check size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-500">Secure Payment Completed</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        The sum of ₹{(getDealAmount(currentThread) || 3000).toLocaleString('en-IN')} is secured in escrow holding. Creator can now begin creation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      await handleEscrowPayment();
                      setShowPaymentSheet(false);
                    }}
                    disabled={paymentLoading}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-slate-950 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>{paymentStep || "Processing..."}</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        <span>Pay ₹{(getDealAmount(currentThread) || 3000).toLocaleString('en-IN')} via Razorpay (100% Escrow)</span>
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Upload Deliverables Bottom Sheet */}
        <AnimatePresence>
          {showUploadSheet && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUploadSheet(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="relative z-10 bg-[var(--bg-card)] rounded-t-3xl border-t border-[var(--border-default)] shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
              >
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-700 rounded-full mx-auto mb-4" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shrink-0">
                      <Video size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[var(--text-primary)]">
                        {isContentApproved ? "Submit Live Links" : isContentSubmitted ? "Draft Under Review" : "Upload Content"}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">Deliverable for brand review and approval.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadSheet(false)}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {isContentApproved ? (
                  <div className="space-y-3 text-left">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400 font-medium">Draft Approved! Please submit your live link:</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                        Paste your live post link (Instagram/YouTube/etc.)
                      </label>
                      <input
                        id="sheet-live-post-link-input"
                        type="url"
                        value={livePostUrl}
                        onChange={(e) => setLivePostUrl(e.target.value)}
                        placeholder="https://instagram.com/p/... or https://youtu.be/..."
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                        Additional notes for the brand (optional)
                      </label>
                      <textarea
                        id="sheet-live-post-notes-input"
                        rows={2}
                        value={livePostNotes}
                        onChange={(e) => setLivePostNotes(e.target.value)}
                        placeholder="Additional notes for the brand (optional)"
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
                      />
                    </div>
                    <button
                      id="sheet-submit-live-link-button"
                      type="button"
                      onClick={async () => {
                        await handleSendLiveLinks();
                        setShowUploadSheet(false);
                      }}
                      disabled={uploadLoading || !livePostUrl.trim()}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {uploadLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                      <span>Submit Live Link</span>
                    </button>
                  </div>
                ) : isContentSubmitted && !isRevisionRequested ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
                    <h5 className="text-xs font-bold text-amber-500">Draft Currently Under Review</h5>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Your deliverable draft has been submitted. The brand will review it shortly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="Google Drive, Dropbox, or Loom link..."
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      value={contentNotes}
                      onChange={(e) => setContentNotes(e.target.value)}
                      placeholder="Notes for brand review..."
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await handleCreatorSubmitContent();
                        setShowUploadSheet(false);
                      }}
                      disabled={uploadLoading || (!selectedUploadFile && !contentUrl.trim())}
                      className="w-full py-3 bg-[var(--violet)] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {uploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>Submit Deliverable</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSafetyModal && <SafetyModal isOpen={showSafetyModal} onClose={() => setShowSafetyModal(false)} onAccept={handleAcceptSafety} user={user} />}
        {showBriefModal && <SendBrief threadId={currentThread.id} onClose={() => setShowBriefModal(false)} onSent={() => { loadMessages(); refreshThread(); }} />}
        {showBrandAgreeModal && <BrandAgreement thread={currentThread} onClose={() => setShowBrandAgreeModal(false)} onSigned={() => { loadMessages(); refreshThread(); }} />}
        {showCreatorAgreeModal && <AgreementSign thread={currentThread} onClose={() => setShowCreatorAgreeModal(false)} onSigned={() => { loadMessages(); refreshThread(); }} />}
        {showInfoPanel && <DealInfoPanel thread={currentThread} role={isBrand ? 'brand' : 'creator'} onClose={() => setShowInfoPanel(false)} />}
        {showNegotiationTable && <NegotiationTable thread={currentThread} role={isBrand ? 'brand' : 'creator'} locked={isNegotiationLocked} onClose={() => setShowNegotiationTable(false)} onActionComplete={() => { loadMessages(); refreshThread(); }} />}
        {showContractModal && (
          <ContractModal 
            thread={currentThread} 
            offer={currentOffer} 
            user={user} 
            onClose={() => setShowContractModal(false)} 
            onSigned={() => { 
              setShowContractModal(false); 
              loadMessages(); 
              refreshThread(); 
            }} 
          />
        )}

        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-card)] border border-[var(--border-strong)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl text-left"
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-card)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Rate Collaboration</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">Mutual Feedback</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Congratulations on completing the campaign! Please share your honest rating of <strong className="text-[var(--text-primary)]">{partnerName}</strong>. Your feedback is fully confidential and helps keep the Ybex marketplace safe and trusted.
                </p>

                {/* Star Selectors */}
                <div className="space-y-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3">
                  <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-[var(--border-default)]">
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">Overall Rating</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setOverallRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            size={22}
                            className={star <= overallRating ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-slate-600 hover:text-amber-300"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[var(--text-secondary)]">Communication</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setCommRating(star)} className="p-0.5 cursor-pointer">
                          <Star size={15} className={star <= commRating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[var(--text-secondary)]">Punctuality & Timeliness</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setTimeRating(star)} className="p-0.5 cursor-pointer">
                          <Star size={15} className={star <= timeRating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[var(--text-secondary)]">Quality of Work</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setQualRating(star)} className="p-0.5 cursor-pointer">
                          <Star size={15} className={star <= qualRating ? "fill-amber-400 text-amber-400" : "text-slate-600"} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Write a Review (Optional)</label>
                  <textarea
                    rows={3}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={`Tell other creators/brands about your experience working with ${partnerName}...`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]/40 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={submittingReview}
                  className="flex-1 py-3 bg-gradient-to-r from-[var(--violet)] to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {selectedInvoiceTxn && (
        <InvoiceModal 
          transaction={selectedInvoiceTxn} 
          isBrand={isBrand}
          creatorName={currentThread?.creator?.profile?.full_name || currentThread?.creator?.profile?.name || currentThread?.creator?.full_name || currentThread?.creator?.name || "UGC Creator"}
          brandName={currentThread?.brand?.profile?.company_name || currentThread?.brand?.company_name || currentThread?.brand?.name || "Brand Partner"}
          onClose={() => setSelectedInvoiceTxn(null)} 
        />
      )}

      <UniversalPreviewModal
        isOpen={showUniversalModal}
        onClose={() => setShowUniversalModal(false)}
        url={universalPreviewUrl}
        title="Deliverable Media Review"
        creatorName={currentThread?.creator?.name || currentThread?.creator?.full_name || "Creator"}
        isBrand={isBrand}
        onApprove={async () => {
          setShowUniversalModal(false);
          try {
            const endpoint = (isUgcOrder || isUgcThread)
              ? `/ugc/threads/${currentThread.id}/mark-complete`
              : `/campaign/threads/${currentThread.id}/mark-complete`;
            await api.post(endpoint, { notes: "Approved via Universal Preview" });
            toast.success("Content approved! Escrow payment released to creator.");
            loadMessages();
            refreshThread();
          } catch (e) {
            toast.error(e?.response?.data?.error || "Failed to approve content");
          }
        }}
        onRequestChanges={() => {
          setShowUniversalModal(false);
          setInputMode("offer");
        }}
      />

      <BrandPublicProfileModal 
        isOpen={showBrandProfileModal} 
        onClose={() => setShowBrandProfileModal(false)} 
        brandUserId={currentThread?.brand_id || currentThread?.brand?.user_id} 
        brandName={currentThread?.brand?.profile?.company_name || currentThread?.brand?.company_name || currentThread?.brand?.name || currentThread?.brand_name || partnerName} 
        brandLogo={partnerPic} 
      />
    </div>
  );
}
