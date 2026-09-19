import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Coins, 
  Video, 
  ExternalLink, 
  Info, 
  CheckCircle, 
  Shield, 
  AlertCircle, 
  CreditCard, 
  Loader2, 
  Download,
  ShieldAlert,
  RefreshCw,
  X,
  Send,
  BellRing,
  Bell
} from "lucide-react";
import { api } from "../../lib/api";
import { processRazorpayPayment } from "../../lib/razorpay";
import { toast } from "sonner";
import { isUgcThread } from "../../utils/dealFlow";
import { Badge } from "@/components/common/Badge";
import OrderSupportModal from "./OrderSupportModal";

export default function SystemMessage({ 
  message, 
  isUserBrand, 
  threadId, 
  campaignTitle, 
  onActionComplete, 
  thread,
  isMine,
  onViewContract,
  onNegotiate,
  onSelectUploadTab,
  onViewInvoice,
  onTriggerReview,
  onDownloadInvoice
}) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState("");
  const [showResubmitInput, setShowResubmitInput] = useState(false);
  const [resubmitFeedback, setResubmitFeedback] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [showBrandReRequestForm, setShowBrandReRequestForm] = useState(false);
  const [brandReRequestNotes, setBrandReRequestNotes] = useState("");
  const [alertingAdmin, setAlertingAdmin] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [alertCount, setAlertCount] = useState(message?.metadata?.brand_alert_count || thread?.brand_alert_count || message?.metadata?.payout_alert_count || 0);
  const [platformFeeConfig, setPlatformFeeConfig] = useState(null);
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    api.get('platform/fee-config')
      .then(res => {
        if (res.data) setPlatformFeeConfig(res.data);
      })
      .catch(() => {});
  }, []);

  const content = message.content || message.text || "";
  const type = message.message_type || message.type || message.metadata?.action || "system";
  const metadata = message.metadata || {};
  const isUgcDeal = isUgcThread(thread || { id: threadId, deal_id: thread?.deal_id }) || Boolean(metadata?.is_ugc || message?.metadata?.is_ugc);

  const handleBrandAlertAdminPayout = async () => {
    try {
      setAlertingAdmin(true);
      const dealId = thread?.deal_id || thread?.id || threadId;
      const targetThreadId = threadId || thread?.id;
      const res = await api.post(`/campaign/threads/${targetThreadId}/alert-admin-payout`, {
        deal_id: dealId,
        note: isUserBrand 
          ? "Brand requested priority fund release for creator" 
          : "Creator requested priority fund release"
      });
      setAlertSent(true);
      setAlertCount(prev => prev + 1);
      toast.success(res.data?.message || "Priority payout alert sent to Admin! Escrow finance desk has been notified.");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to send alert to admin.");
    } finally {
      setAlertingAdmin(false);
    }
  };

  const handleEscrowPayment = async () => {
    setPaymentLoading(true);
    setPaymentStep("Launching Razorpay Gateway...");
    const grossAmt = thread?.agreed_amount || thread?.amount_fixed || metadata.amount || 5000;
    try {
      await processRazorpayPayment({
        dealId: thread?.deal_id || threadId,
        threadId: thread?.id || threadId,
        campaignId: thread?.campaign_id || null,
        creatorId: thread?.creator_id || null,
        grossAmount: grossAmt,
        onSuccess: async () => {
          await api.post(`/campaign/threads/${threadId}/pay`);
          toast.success("Payment secured in Ybex Escrow! Creator has been notified.");
          if (onActionComplete) {
            onActionComplete();
          } else {
            window.location.reload();
          }
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

  // 1.5. Payment Triggered / Invoice Processed / Payout Released Notice
  if (
    type === "payment_trigger" || 
    type === "payout_released" || 
    type === "payment_released" || 
    type === "live_links_approved" || 
    metadata?.action === "live_links_approved" || 
    metadata?.action === "payout_released" || 
    metadata?.action === "PAYOUT_RELEASED" || 
    (content && (
      content.includes("Invoice generated and payment has been processed") || 
      content.includes("Deliverables Approved & Payment Released") ||
      content.includes("payout is being processed via Escrow") ||
      content.includes("Payout Released") ||
      content.includes("Payout Disbursed") ||
      content.includes("payout released")
    ))
  ) {
    const amount = Number(metadata.gross_amount || metadata.amount || metadata.agreed_amount || thread?.agreed_amount || thread?.amount_fixed || 5000);
    
    // Authoritative fee percent using single source of truth (platformFeeConfig or tiered fallback: 15% below threshold, 5% above)
    const authoritativeTieredRate = amount < (Number(platformFeeConfig?.threshold_amount) || 20000)
      ? (Number(platformFeeConfig?.below_threshold_rate) ?? 15)
      : (Number(platformFeeConfig?.above_threshold_rate) ?? 5);

    const feePercentage = metadata.platform_fee_percent !== undefined && metadata.platform_fee_percent !== null && Number(metadata.platform_fee_percent) > 0
      ? Number(metadata.platform_fee_percent)
      : (metadata.gross_amount && metadata.platform_fee_amount && Number(metadata.platform_fee_amount) > 0 
          ? Math.round((Number(metadata.platform_fee_amount) / Number(metadata.gross_amount)) * 100)
          : authoritativeTieredRate);

    // Platform fee amount with exact precision (no integer round-down to 0)
    const platformFee = metadata.platform_fee_amount !== undefined && metadata.platform_fee_amount !== null && Number(metadata.platform_fee_amount) > 0
      ? Number(metadata.platform_fee_amount)
      : (metadata.gross_amount && metadata.creator_net_amount && Number(metadata.gross_amount) > Number(metadata.creator_net_amount)
          ? Math.round((Number(metadata.gross_amount) - Number(metadata.creator_net_amount)) * 100) / 100
          : Math.round(((amount * feePercentage) / 100) * 100) / 100);

    // Creator net amount: strictly gross amount minus platform fee
    const netAmount = metadata.creator_net_amount !== undefined && metadata.creator_net_amount !== null && Number(metadata.creator_net_amount) > 0
      ? Number(metadata.creator_net_amount)
      : Math.max(0, Math.round((amount - platformFee) * 100) / 100);

    const formatCurrency = (val) => {
      const num = Number(val) || 0;
      return Number.isInteger(num)
        ? num.toLocaleString('en-IN')
        : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const campaignName = campaignTitle || "Campaign Partnership";
    
    const utrNumber = thread?.utr_number || metadata.utr_number || metadata.utrNumber || null;
    const payoutStatus = thread?.payout_status || metadata.payout_status || "READY_FOR_RELEASE";
    // Payout is only officially marked as disbursed to the bank once a bank UTR / reference number is generated
    const isPayoutReleased = Boolean(utrNumber);

    // Check if current user has already submitted review
    const hasReviewed = isUserBrand ? thread?.reviewed_by_brand : thread?.reviewed_by_creator;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.97 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-full flex ${isUserBrand ? 'justify-end' : 'justify-start'} my-1 md:my-5 px-0.5 md:px-3`}
      >
        <div className="w-full max-w-[260px] sm:max-w-[340px] md:max-w-[440px] rounded-lg md:rounded-[24px] bg-white border border-slate-100 shadow-sm md:shadow-xl shadow-slate-200/50 text-left relative overflow-hidden transition-all duration-300 hover:shadow-slate-200">
          {/* Header Colored Ribbon */}
          <div className={`h-1.5 md:h-2.5 w-full bg-gradient-to-r ${
            isPayoutReleased 
              ? "from-emerald-400 via-teal-500 to-emerald-600"
              : "from-emerald-500 via-teal-500 to-indigo-600"
          }`} />
          
          <div className="p-2.5 md:p-5">
            {/* Top Status Meta */}
            <div className="flex justify-between items-center mb-1.5 md:mb-4">
              <span className={`text-[7.5px] md:text-[10px] font-black uppercase tracking-wider px-2 md:px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                isPayoutReleased 
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                  : isUserBrand 
                    ? "text-emerald-800 bg-emerald-50 border-emerald-300"
                    : "text-emerald-800 bg-emerald-50 border-emerald-300"
              }`}>
                {isPayoutReleased ? (
                  <>
                    <CheckCircle size={10} className="text-emerald-600 shrink-0" />
                    <span>Payout Disbursed to Bank ✓</span>
                  </>
                ) : isUserBrand ? (
                  <>
                    <CheckCircle size={10} className="text-emerald-600 shrink-0" />
                    <span>Payment Released by Brand 🚀</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={10} className="text-emerald-600 shrink-0" />
                    <span>Payment Released & Approved • Payout in 1–2 Days 💸</span>
                  </>
                )}
              </span>
              <span className="text-[7.5px] md:text-[10px] text-slate-400 font-bold font-mono">{timeText}</span>
            </div>

            {/* Concentric Circle Animated Indicator */}
            <div className="flex flex-col items-center text-center my-1.5 md:my-3">
              <div className="relative w-8 h-8 md:w-16 md:h-16 flex items-center justify-center mb-1.5 md:mb-3">
                {isPayoutReleased ? (
                  <>
                    <span className="absolute inset-0 bg-emerald-100/50 rounded-full animate-ping duration-[3000ms]" />
                    <span className="absolute w-7 h-7 md:w-12 md:h-12 bg-emerald-100/80 rounded-full" />
                    <div className="relative w-5 h-5 md:w-9 md:h-9 bg-emerald-500 rounded-full flex items-center justify-center shadow-xs">
                      <CheckCircle size={12} className="text-white md:w-4 md:h-4" />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="absolute inset-0 bg-emerald-100/60 rounded-full animate-pulse duration-[2500ms]" />
                    <span className="absolute w-7 h-7 md:w-12 md:h-12 bg-emerald-100/90 rounded-full" />
                    <div className="relative w-5 h-5 md:w-9 md:h-9 bg-emerald-600 rounded-full flex items-center justify-center shadow-xs">
                      <CheckCircle size={12} className="text-white md:w-4 md:h-4" />
                    </div>
                  </>
                )}
              </div>
              
              <h3 className="text-xs md:text-lg font-black text-slate-900 tracking-tight leading-tight mb-1">
                {isPayoutReleased 
                  ? (isUserBrand ? "Creator Payout Processed" : "Payout Disbursed to Creator") 
                  : "Payment Released & Approved"}
              </h3>
              
              <p className="text-[9px] md:text-[12px] text-slate-600 font-medium leading-normal mt-0.5 max-w-[240px] md:max-w-[340px] mx-auto">
                {isPayoutReleased ? (
                  isUserBrand ? (
                    <><strong>YBEX Escrow</strong> successfully transferred funds of <strong className="text-[#027A48] font-mono font-bold">₹{formatCurrency(amount)}</strong> for this campaign.</>
                  ) : (
                    <><strong>YBEX Escrow</strong> successfully transferred payout of <strong className="text-[#027A48] font-mono font-bold">₹{formatCurrency(netAmount)}</strong> to your verified bank account.</>
                  )
                ) : isUserBrand ? (
                  <>You have approved deliverables and released payment of <strong className="text-slate-900 font-mono font-bold">₹{formatCurrency(amount)}</strong>. Creator payout is being processed via Escrow in <strong className="text-emerald-700 font-bold">1–2 working days</strong>.</>
                ) : (
                  <>Brand has approved your deliverables & released payment! YBEX Escrow will credit <strong className="text-emerald-700 font-mono font-bold">₹{formatCurrency(netAmount)}</strong> to your verified Bank/UPI in <strong className="text-slate-900 font-bold">1–2 working days</strong>.</>
                )}
              </p>
            </div>

            {/* Timeline for Pending Creator Payouts */}
            {!isUserBrand && !isPayoutReleased && (
              <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg p-2.5 my-2">
                <div className="text-[8.5px] md:text-[10px] font-black uppercase text-amber-900 tracking-wider mb-1.5 flex items-center gap-1">
                  <Shield size={11} className="text-amber-600" />
                  <span>Settlement Timeline</span>
                </div>
                <div className="space-y-1 text-[9px] md:text-[11.5px]">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle size={11} className="text-emerald-600 shrink-0" />
                    <span>1. Brand Approved & Funds Cleared ✓</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <div className="w-3 h-3 rounded-full bg-amber-500 text-white flex items-center justify-center text-[7.5px] shrink-0 font-mono">2</div>
                    <span>2. Admin Payout Disbursement (1–2 Days)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[7.5px] shrink-0 font-mono">3</div>
                    <span>3. Bank Credit & UTR Confirmation</span>
                  </div>
                </div>
              </div>
            )}

            {/* Itemized Deduction Breakdown for Creator ONLY (Hidden from Brand) */}
            {!isUserBrand && (
              <div className="bg-slate-50 rounded-lg p-2 md:p-3.5 my-1.5 md:my-3 border border-slate-100">
                <div className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                  Financial Breakdown
                </div>
                <div className="space-y-0.5 text-[8.5px] md:text-xs">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Deliverable Rate</span>
                    <span className="font-mono text-slate-900 font-bold">₹{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-rose-600">
                    <span>Platform Fee ({feePercentage}%)</span>
                    <span className="font-mono font-bold">-₹{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="border-t border-slate-200/80 pt-0.5 flex justify-between font-bold text-slate-900">
                    <span>Net Transfer</span>
                    <span className="font-mono text-[#027A48] text-[10px] md:text-sm">₹{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Amount & Summary Detail Box */}
            <div className="bg-slate-50 rounded-lg p-2.5 md:p-3.5 my-1.5 md:my-3 border border-slate-100">
              <div className="text-[8px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                {isPayoutReleased 
                  ? (isUserBrand ? "Total Campaign Value" : "Successfully Transferred")
                  : isUserBrand 
                    ? "Total Released by Brand" 
                    : "Net Payable Amount (In Clearance)"}
              </div>
              <div className="text-lg md:text-3xl font-mono font-black tracking-tight text-slate-900 flex items-baseline">
                <span className="text-xs md:text-lg mr-0.5 text-slate-400 font-bold">₹</span>
                <span>{formatCurrency(isUserBrand ? amount : netAmount)}</span>
              </div>
              
              <div className="border-t border-slate-200/50 mt-1.5 md:mt-3 pt-1.5 md:pt-3 space-y-1 md:space-y-1.5">
                <div className="flex justify-between text-[8.5px] md:text-xs font-semibold text-slate-500">
                  <span>Campaign</span>
                  <span className="text-slate-800 font-bold truncate max-w-[120px] md:max-w-[170px]">{campaignName}</span>
                </div>
                <div className="flex justify-between text-[8.5px] md:text-xs font-semibold text-slate-500">
                  <span>Route</span>
                  <span className="text-slate-800 font-bold truncate max-w-[120px] md:max-w-[180px]">
                    {isPayoutReleased ? "Ybex Bank Direct Transfer" : "Ybex Escrow → Bank Payout (1–2 Days)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Prominent UTR Confirmation — shown big and clear once admin has actually
                disbursed the payout with a bank reference. This is the proof-of-payment the
                creator/brand actually care about, so it should not be a small easy-to-miss row. */}
            {utrNumber && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg md:rounded-xl p-2.5 md:p-3.5 my-1.5 md:my-3 text-center">
                <div className="text-[8px] md:text-[10px] font-black uppercase text-emerald-700 tracking-wider mb-1 flex items-center justify-center gap-1">
                  <CheckCircle size={11} className="text-emerald-600" />
                  <span>Payment Completed · UTR / Bank Reference</span>
                </div>
                <div className="text-base md:text-xl font-mono font-black tracking-wide text-emerald-800 break-all">
                  {utrNumber}
                </div>
              </div>
            )}

            {/* Priority Alert Action Box (Shown when Payment released but Admin hasn't disbursed yet) */}
            {!isPayoutReleased && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/90 rounded-lg md:rounded-xl p-2.5 md:p-3 my-2 md:my-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-[8.5px] md:text-[10.5px] font-black uppercase text-amber-900 tracking-wider">
                    <ShieldAlert size={12} className="text-amber-600 shrink-0" />
                    <span>Creator Payout Settlement</span>
                  </div>
                  {alertCount > 0 && (
                    <span className="text-[7.5px] md:text-[9px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                      {alertCount} Alert{alertCount > 1 ? 's' : ''} Sent
                    </span>
                  )}
                </div>
                <p className="text-[8.5px] md:text-[11px] text-amber-900/80 font-medium leading-tight mb-2">
                  {isUserBrand 
                    ? "Funds are fully cleared from your side. If creator hasn't received payment in 1–2 days, you can alert the Ybex Escrow desk:"
                    : "Payment has been approved by the brand and is secured in Ybex Escrow. If funds are not credited within 1–2 days, you can alert the admin desk for priority disbursal:"}
                </p>
                <button
                  onClick={handleBrandAlertAdminPayout}
                  disabled={alertingAdmin || alertSent}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-[9px] md:text-xs rounded-md md:rounded-lg transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {alertingAdmin ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Sending Priority Alert...</span>
                    </>
                  ) : alertSent ? (
                    <>
                      <CheckCircle size={12} className="text-white" />
                      <span>Priority Alert Sent to Admin Desk ✓</span>
                    </>
                  ) : (
                    <>
                      <BellRing size={12} />
                      <span>{isUserBrand ? "Alert Admin to Release Creator Funds" : "Alert Admin for Priority Payout Disbursal"}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action buttons inside the large box */}
            <div className="flex flex-col gap-1.5 md:gap-2.5 mt-2 md:mt-3 pt-2 border-t border-slate-100">
              <div className="flex gap-1.5 md:gap-2.5">
                <button
                  onClick={onViewInvoice}
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 md:px-3.5 py-1.5 md:py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[8.5px] md:text-xs rounded-md md:rounded-xl transition-all cursor-pointer shadow-xs border border-slate-200 active:scale-98"
                >
                  <CreditCard size={11} className="text-slate-400 md:w-3.5 md:h-3.5" />
                  <span>View Receipt</span>
                </button>
                <button
                  onClick={onDownloadInvoice}
                  className="flex-1 flex items-center justify-center gap-1 px-1.5 md:px-3.5 py-1.5 md:py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[8.5px] md:text-xs rounded-md md:rounded-xl transition-all cursor-pointer shadow-xs border border-slate-200 active:scale-98"
                >
                  <Download size={11} className="text-slate-400 md:w-3.5 md:h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>

              {/* Submit / Submitted Review Button */}
              {hasReviewed ? (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-1 px-1.5 py-1.5 md:py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-[8.5px] md:text-xs rounded-md md:rounded-xl cursor-not-allowed opacity-50"
                >
                  <CheckCircle size={11} className="text-emerald-500 md:w-3.5 md:h-3.5" />
                  <span>Review Submitted! Thanks ❤️</span>
                </button>
              ) : (
                <button
                  onClick={onTriggerReview}
                  className="w-full flex items-center justify-center gap-1 px-2 py-2 md:py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-extrabold text-[10px] md:text-xs rounded-lg md:rounded-xl transition-all cursor-pointer shadow-xs active:scale-99"
                >
                  <CheckCircle size={12} className="md:w-3.5 md:h-3.5" />
                  <span>Submit Partner Review</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 1. Contract Signing Event Notice
  if (type === "contract_signing") {
    const brandSigned = metadata.brand_signed || false;
    const creatorSigned = metadata.creator_signed || false;
    const bothSigned = brandSigned && creatorSigned;
    const amount = metadata.amount || metadata.agreed_amount || thread?.agreed_amount || thread?.amount_fixed || 15000;
    const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const campaignName = campaignTitle || "Campaign Partnership";

    if (bothSigned) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 12, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-2 md:my-5 px-1 md:px-3`}
        >
          <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[380px] p-3 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl bg-white border border-emerald-200 text-left relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-l-xl md:rounded-l-2xl" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-emerald-600 font-mono bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                Contract Sealed 🤝
              </span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium font-mono">{timeText}</span>
            </div>

            {/* Amount */}
            <div className="text-xl md:text-3xl font-mono font-black tracking-tight mb-2 md:mb-4 flex items-baseline text-slate-900">
              <span className="text-sm md:text-lg mr-1 text-slate-400 font-bold">₹</span>
              <span>{amount.toLocaleString('en-IN')}</span>
            </div>

            {/* Details */}
            <div className="space-y-1.5 md:space-y-3 pt-2 md:pt-3 border-t border-slate-100">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Campaign</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px] md:max-w-[160px]">{campaignName}</span>
              </div>
              
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Creator Signature</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                  Signed ✓
                </span>
              </div>

              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Brand Signature</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                  Signed ✓
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2.5 md:my-4" />

            <div className="text-xs md:text-sm font-extrabold text-emerald-600 mb-0.5">
              Deal LOCKED successfully! 🎉
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-slate-700 leading-snug mb-1">
              Partnership agreement has been digitally signed and legally executed.
            </div>

            {isUserBrand && !thread?.payment_funded && (
              <button
                onClick={handleEscrowPayment}
                disabled={paymentLoading}
                className="w-full mt-2.5 md:mt-4 py-2 md:py-3 px-3 md:px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-slate-950 font-extrabold text-[10px] md:text-xs rounded-lg md:rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={13} />
                    <span>{paymentStep}</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={13} />
                    <span>Pay ₹{amount.toLocaleString('en-IN')} via Razorpay</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      );
    } else {
      // Pending other party's signature
      const waitingFor = brandSigned ? "Creator" : "Brand";
      const amIWaiting = isUserBrand ? brandSigned : creatorSigned; // true if current user has signed, waiting for the other

      return (
        <motion.div 
          initial={{ opacity: 0, y: 12, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-2 md:my-5 px-1 md:px-3`}
        >
          <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[380px] p-3 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl bg-white border border-amber-200 text-left relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-600 rounded-l-xl md:rounded-l-2xl" />
            
            {/* Header */}
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-amber-700 font-mono bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                Signature Pending ⏳
              </span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium font-mono">{timeText}</span>
            </div>

            {/* Amount */}
            <div className="text-xl md:text-3xl font-mono font-black tracking-tight mb-2 md:mb-4 flex items-baseline text-slate-900">
              <span className="text-sm md:text-lg mr-1 text-slate-400 font-bold">₹</span>
              <span>{amount.toLocaleString('en-IN')}</span>
            </div>

            {/* Details */}
            <div className="space-y-1.5 md:space-y-3 pt-2 md:pt-3 border-t border-slate-100">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Campaign</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px] md:max-w-[160px]">{campaignName}</span>
              </div>
              
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Creator Signature</span>
                {creatorSigned ? (
                  <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                    Signed ✓
                  </span>
                ) : (
                  <span className="font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                    Pending ⏳
                  </span>
                )}
              </div>

              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Brand Signature</span>
                {brandSigned ? (
                  <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                    Signed ✓
                  </span>
                ) : (
                  <span className="font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.2 rounded text-[9px] md:text-[10px]">
                    Pending ⏳
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 my-2.5 md:my-4" />

            <div className="text-xs md:text-sm font-extrabold text-amber-600 mb-0.5">
              {amIWaiting 
                ? "You signed the contract ✓" 
                : isUserBrand 
                  ? "Creator signed agreement ✓" 
                  : "Brand signed agreement ✓"
              }
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-slate-700 leading-snug">
              {amIWaiting 
                ? `Signed! Waiting for ${waitingFor}.` 
                : "Contract signed! Please review and sign below to execute."
              }
            </div>

            {!amIWaiting && (
              <div className="mt-2.5 md:mt-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (onViewContract) {
                      onViewContract({
                        id: threadId,
                        amount: amount,
                        revision_count: thread?.revision_count || 1,
                        deadline: thread?.deadline,
                      });
                    }
                  }}
                  className="w-full py-2 md:py-3 px-3 md:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] md:text-xs rounded-lg md:rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={13} />
                  <span>Sign Partnership Contract</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      );
    }
  }

  // 2. Payment Escrow Notice (legacy payment_funded breakdown card)
  const isPaymentSecuredStr = (content || "").toLowerCase().includes("payment secured") || (content || "").toLowerCase().includes("held safely in escrow");
  if (type === "payment_funded" || metadata?.action === "escrow_funded" || type === "payment_secured" || metadata?.action === "payment_secured" || isPaymentSecuredStr) {
    const amount = metadata?.amount || 15000;
    const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const campaignName = campaignTitle || "Campaign Partnership";

    if (isUserBrand) {
      // Brand Side: Payment Sent to Escrow
      return (
        <motion.div 
          initial={{ opacity: 0, y: 12, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full flex justify-end my-2 md:my-5 px-1 md:px-3"
        >
          <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[380px] p-3 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl bg-white border border-slate-200/80 text-left relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Escrow Status 🔒
              </span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium font-mono">{timeText}</span>
            </div>

            {/* Amount */}
            <div className="text-xl md:text-3xl font-mono font-black tracking-tight mb-2 md:mb-4 flex items-baseline justify-center text-slate-900 w-full">
              <span className="text-sm md:text-lg mr-1 text-slate-400 font-bold">₹</span>
              <span>{amount.toLocaleString('en-IN')}</span>
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 md:space-y-3 pt-2 md:pt-3 border-t border-slate-100">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Campaign</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px] md:max-w-[160px]">{campaignName}</span>
              </div>
              
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-600 px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-100 text-[9px] md:text-[11px]">
                  Payment Funded ✓
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2.5 md:my-4" />

            {/* Action/Explanation area */}
            <div className="text-xs md:text-sm font-extrabold text-indigo-600 mb-0.5">
              Payment Secured! 💸
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-slate-700 leading-snug">
              Your payment has been successfully secured in escrow.
            </div>
          </div>
        </motion.div>
      );
    } else {
      // Creator Side: Payment Received
      return (
        <motion.div 
          initial={{ opacity: 0, y: 12, scale: 0.98 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full flex justify-start my-2 md:my-5 px-1 md:px-3"
        >
          <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[380px] p-3 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl bg-white border border-slate-200/80 text-left relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Escrow Status 🔒
              </span>
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium font-mono">{timeText}</span>
            </div>

            {/* Amount */}
            <div className="text-xl md:text-3xl font-mono font-black tracking-tight mb-2 md:mb-4 flex items-baseline justify-center text-slate-900 w-full">
              <span className="text-sm md:text-lg mr-1 text-slate-400 font-bold">₹</span>
              <span>{amount.toLocaleString('en-IN')}</span>
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 md:space-y-3 pt-2 md:pt-3 border-t border-slate-100">
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Campaign</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px] md:max-w-[160px]">{campaignName}</span>
              </div>
              
              <div className="flex justify-between text-[10px] md:text-xs">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-600 px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-100 text-[9px] md:text-[11px]">
                  Payment Received ✓
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 my-2.5 md:my-4" />

            {/* Action/Explanation area */}
            <div className="text-xs md:text-sm font-extrabold text-emerald-600 mb-0.5">
              Your payment has been safely secured with us.
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-slate-700 leading-snug">
              You can now start our content.
            </div>

            {onSelectUploadTab && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onSelectUploadTab}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] md:text-xs rounded-lg md:rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video size={13} />
                  <span>Upload Deliverable to Brand</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      );
    }
  }

  // 3. Live Links Submitted Event Notice
  if (type === "live_links_submitted") {
    let rawLinks = metadata?.links || metadata?.link || "";
    if (!rawLinks && typeof content === "string") {
      rawLinks = content.replace("🔗 Live post links submitted by Creator: ", "");
    }
    const linksList = Array.isArray(rawLinks)
      ? rawLinks.map(l => String(l).trim()).filter(Boolean)
      : typeof rawLinks === "string"
      ? rawLinks.split(",").map(l => l.trim()).filter(Boolean)
      : rawLinks ? [String(rawLinks).trim()].filter(Boolean) : [];
    const isCompleted = thread?.status === "COMPLETED" || thread?.flow_state === "COMPLETED";

    const handleApprove = async () => {
      setLoadingAction(true);
      try {
        const endpoint = isUgcDeal
          ? `/ugc/threads/${threadId}/mark-complete`
          : `/campaign/threads/${threadId}/approve-live-links`;
        await api.post(endpoint);
        toast.success("Live links approved and payment released!");
        if (onActionComplete) {
          onActionComplete();
        } else {
          window.location.reload();
        }
      } catch (err) {
        toast.error("Failed to approve links: " + (err?.response?.data?.error || err.message));
      } finally {
        setLoadingAction(false);
      }
    };

    const handleConfirmResubmit = async () => {
      if (!resubmitFeedback.trim()) {
        toast.error("Please enter a valid reason.");
        return;
      }
      setLoadingAction(true);
      try {
        const endpoint = isUgcDeal
          ? `/ugc/threads/${threadId}/reject-content`
          : `/campaign/threads/${threadId}/reject-live-links`;
        await api.post(endpoint, { feedback: resubmitFeedback });
        toast.success("Resubmit request sent to creator.");
        setShowResubmitInput(false);
        setResubmitFeedback("");
        if (onActionComplete) {
          onActionComplete();
        } else {
          window.location.reload();
        }
      } catch (err) {
        toast.error("Failed to request resubmission: " + (err?.response?.data?.error || err.message));
      } finally {
        setLoadingAction(false);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-2 md:my-5 px-1 md:px-3`}
      >
        <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[440px] p-3 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl bg-white border border-indigo-200 text-left relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-l-xl md:rounded-l-2xl" />
          
          {/* Header */}
          <div className="flex justify-between items-center mb-2 md:mb-4">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              Live Links Review 🚀
            </span>
            <span className="text-[9px] md:text-[10px] text-slate-400 font-medium font-mono">
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-slate-900 mb-2">
            🔗 Submitted Live Campaign Links:
          </h4>

          {/* Links List */}
          <div className="space-y-2 mb-3">
            {linksList.map((url, i) => (
              <a 
                key={i} 
                href={url.startsWith("http") ? url : `https://${url}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all truncate"
              >
                <ExternalLink size={14} className="shrink-0 text-indigo-400" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>

          {metadata?.notes && (
            <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/60 rounded-xl text-xs text-slate-700 mb-3 text-left">
              <span className="font-bold text-indigo-950">Creator Notes:</span> {metadata.notes}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 mt-4">
            {isCompleted ? (
              <div className="flex items-center gap-2.5 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 shadow-sm">
                <CheckCircle size={16} className="shrink-0" />
                <span>Links approved and payment released successfully! 🎉</span>
              </div>
            ) : isUserBrand ? (
              showResubmitInput ? (
                <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Feedback / Correction Request:
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-white border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 font-medium font-sans"
                    value={resubmitFeedback}
                    onChange={(e) => setResubmitFeedback(e.target.value)}
                    placeholder="Tell the creator what needs correction before they resubmit..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResubmitInput(false);
                        setResubmitFeedback("");
                      }}
                      className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResubmit}
                      disabled={loadingAction}
                      className="py-2 px-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {loadingAction ? <Loader2 size={13} className="animate-spin" /> : null}
                      <span>Send Correction Request</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {showApproveConfirm ? (
                    <div className="space-y-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                      <p className="text-[11px] text-emerald-800 font-bold leading-normal">
                        ⚠️ Are you sure? This releases the secure payout of ₹{(thread?.amount_fixed || thread?.agreed_amount || 5000).toLocaleString('en-IN')} to the creator and is completely irreversible.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowApproveConfirm(false);
                          }}
                          className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={loadingAction}
                          className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {loadingAction ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          <span>Confirm & Release Payment</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500 font-semibold mb-3 leading-relaxed">
                        Review the live URLs above. If they are correct, click <strong className="text-slate-700">Approve & Pay</strong> to release the secure payout. Otherwise, click <strong className="text-slate-700">Ask to Resubmit</strong> to send feedback.
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setShowApproveConfirm(true)}
                          className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-emerald-500/10"
                        >
                          <CheckCircle size={14} />
                          <span>Approve & Pay</span>
                        </button>
                        <button
                          onClick={() => setShowResubmitInput(true)}
                          className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <AlertCircle size={14} />
                          <span>Ask to Resubmit</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center gap-2.5 text-amber-600 text-xs font-bold bg-amber-50 border border-amber-100 rounded-xl p-3.5 shadow-sm">
                <Loader2 size={16} className="animate-spin shrink-0 text-amber-500" />
                <span>Waiting for Brand's Approval... ⏳</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // 3b. Live Links Resubmission Request Notice
  if (type === "live_links_resubmit_request") {
    const feedback = metadata?.feedback || (typeof content === "string" ? content.replace("❌ Resubmission requested by Brand: ", "") : "") || "Please resubmit correct links.";
    const isCompleted = (thread?.status === "COMPLETED" || thread?.flow_state === "COMPLETED");
    const isRevisionDeclined = ((thread?.flow_state || thread?.status) === "REVISION_DECLINED_LINKS");

    const handleDeclineConfirm = async () => {
      if (!declineReason.trim()) {
        toast.error("Please enter a valid reason for declining.");
        return;
      }
      setLoadingAction(true);
      try {
        const endpoint = isUgcDeal
          ? `/ugc/threads/${threadId}/decline-revisions`
          : `/campaign/threads/${threadId}/decline-live-links-resubmission`;
        await api.post(endpoint, { feedback: declineReason });
        toast.success("Resubmission request declined successfully.");
        setShowDeclineInput(false);
        setDeclineReason("");
        if (onActionComplete) {
          onActionComplete();
        } else {
          window.location.reload();
        }
      } catch (err) {
        toast.error("Failed to decline request: " + (err?.response?.data?.error || err.message));
      } finally {
        setLoadingAction(false);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-6 px-4`}
      >
        <div className="w-full max-w-[440px] p-5 shadow-xl rounded-2xl bg-white border border-rose-200 text-left relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-rose-600 rounded-l-2xl" />
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 font-mono bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md">
              Revision Request: Live Links ⚠️
            </span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-slate-900 mb-2">
            ❌ Brand Requested Link Correction:
          </h4>

          {/* Feedback details */}
          <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl mb-4 text-xs font-semibold text-rose-700 leading-relaxed font-sans">
            "{feedback}"
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            {isCompleted ? (
              <div className="flex items-center gap-2.5 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 shadow-sm">
                <CheckCircle size={16} className="shrink-0" />
                <span>Links approved and payment released successfully! 🎉</span>
              </div>
            ) : isRevisionDeclined ? (
              <div className="flex items-center gap-2.5 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 rounded-xl p-3.5 shadow-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>Creator declined the resubmission request.</span>
              </div>
            ) : isUserBrand ? (
              // Brand Side: Waiting for Creator
              <div className="flex items-center gap-2.5 text-amber-600 text-xs font-bold bg-amber-50 border border-amber-100 rounded-xl p-3.5 shadow-sm">
                <Loader2 size={16} className="animate-spin shrink-0 text-amber-500" />
                <span>Waiting for Creator's Reply... ⏳</span>
              </div>
            ) : (
              // Creator Side: Actionable Choices
              showDeclineInput ? (
                <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Reason for declining:
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-white border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 font-medium font-sans"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Tell the brand why you are declining this request..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeclineInput(false);
                        setDeclineReason("");
                      }}
                      className="py-2 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineConfirm}
                      disabled={loadingAction}
                      className="py-2 px-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {loadingAction ? <Loader2 size={13} className="animate-spin" /> : null}
                      <span>Confirm Decline</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 font-semibold mb-3 leading-relaxed">
                    Please upload the correct live post URLs using the button below, or decline the resubmission request.
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        if (onSelectUploadTab) {
                          onSelectUploadTab();
                        }
                        toast.info("Please use the 'SUBMIT LINK' tab below to submit links!");
                      }}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-emerald-500/10"
                    >
                      <CheckCircle size={14} />
                      <span>Submit Links again</span>
                    </button>
                    <button
                      onClick={() => setShowDeclineInput(true)}
                      className="flex-1 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertCircle size={14} />
                      <span>Decline the changes</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // 3c. Live Links Resubmit Declined Notice
  if (type === "live_links_resubmit_declined") {
    const feedback = metadata?.feedback || (typeof content === "string" ? content.replace("⚠️ Creator declined live links resubmission: ", "") : "") || "Creator declined the resubmission request.";
    const isCompleted = thread?.status === "COMPLETED";

    const handleApproveLiveLinks = async () => {
      setLoadingAction(true);
      try {
        const endpoint = isUgcDeal
          ? `/ugc/threads/${threadId}/mark-complete`
          : `/campaign/threads/${threadId}/mark-complete`;
        await api.post(endpoint);
        toast.success("Live links approved and escrow released!");
        if (onActionComplete) {
          onActionComplete();
        } else {
          window.location.reload();
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.response?.data?.error || err.message || "Failed to approve links");
      } finally {
        setLoadingAction(false);
      }
    };

    const handleSendReRequestLinks = async () => {
      if (!brandReRequestNotes.trim()) {
        toast.error("Please enter a note explaining what needs revision.");
        return;
      }
      setLoadingAction(true);
      try {
        const endpoint = isUgcDeal
          ? `/ugc/threads/${threadId}/reject-content`
          : `/campaign/threads/${threadId}/reject-live-links`;
        await api.post(endpoint, { feedback: brandReRequestNotes.trim() });
        toast.success("Re-request sent to creator.");
        setShowBrandReRequestForm(false);
        setBrandReRequestNotes("");
        if (onActionComplete) onActionComplete();
      } catch (err) {
        toast.error(err?.response?.data?.detail || err?.response?.data?.error || err.message || "Failed to re-request links");
      } finally {
        setLoadingAction(false);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-6 px-4`}
      >
        <div className="w-full max-w-[480px] p-5 shadow-xl rounded-2xl bg-white border border-rose-300 text-left relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-rose-600 rounded-l-2xl" />
          
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 font-mono bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-md">
              Resubmission Declined ⚠️
            </span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-slate-900 mb-2">
            🚫 Creator Declined Resubmission Request:
          </h4>

          {/* Decline details */}
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl mb-4 text-xs font-semibold text-rose-700 leading-relaxed font-sans">
            "{feedback}"
          </div>

          {/* 3 Action Buttons for Brand */}
          {isUserBrand && !isCompleted && (
            <div className="pt-3 border-t border-slate-100">
              <AnimatePresence mode="wait">
                {!showBrandReRequestForm ? (
                  <motion.div 
                    key="action-buttons"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex flex-col gap-2.5 w-full"
                  >
                    {/* Top Row: 2 Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 w-full">
                      {/* 1: Contact Support (White background) */}
                      <button
                        type="button"
                        onClick={() => setIsSupportModalOpen(true)}
                        disabled={loadingAction}
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        title="Contact Ybex Dispute Admin with full order & contact details"
                      >
                        <ShieldAlert size={14} className="text-slate-600 shrink-0" />
                        <span className="truncate">Contact Support</span>
                      </button>

                      {/* 2: Re-request Changes (Yellow background) */}
                      <button
                        type="button"
                        onClick={() => setShowBrandReRequestForm(true)}
                        disabled={loadingAction}
                        className="w-full py-2.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        title="Ask creator again to submit correct live links"
                      >
                        <RefreshCw size={14} className="text-amber-700 shrink-0" />
                        <span className="truncate">Re-request Changes</span>
                      </button>
                    </div>

                    {/* 3: Approve Last Submission (Full-Width Green Button) */}
                    <button
                      type="button"
                      onClick={handleApproveLiveLinks}
                      disabled={loadingAction}
                      className="w-full mt-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      title="Accept the previously submitted links and complete the escrow release"
                    >
                      {loadingAction ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={16} />}
                      <span className="truncate">Approve Last Submission</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="re-request-form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Clarify Link Corrections Needed:</span>
                      <button 
                        onClick={() => setShowBrandReRequestForm(false)}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                      >
                        <X size={14} className="text-slate-500" />
                      </button>
                    </div>

                    <textarea
                      value={brandReRequestNotes}
                      onChange={e => setBrandReRequestNotes(e.target.value)}
                      placeholder="Explain why the live link needs resubmission (e.g. incorrect URL, private profile, missing tag)..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-600 focus:outline-none resize-none h-20"
                    />

                    <div className="flex gap-2">
                      <button 
                        onClick={handleSendReRequestLinks}
                        disabled={loadingAction || !brandReRequestNotes.trim()}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Re-send Resubmit Request
                      </button>
                      <button 
                        onClick={() => setShowBrandReRequestForm(false)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Modal */}
          <OrderSupportModal
            isOpen={isSupportModalOpen}
            onClose={() => setIsSupportModalOpen(false)}
            thread={thread}
            threadId={threadId}
            isUserBrand={isUserBrand}
            onTicketCreated={() => {
              if (onActionComplete) onActionComplete();
            }}
          />
        </div>
      </motion.div>
    );
  }

  // 4. Fallback System Message Notice (Official high-contrast light-theme slip)
  let actionLabel = "Ybex Official Notice 📢";
  let badgeColor = "text-amber-700 bg-amber-50 border-amber-200";
  let accentBorder = "from-amber-500 to-amber-600";
  let iconBg = "bg-amber-50 text-amber-600 border-amber-100";
  let cardBg = "bg-white border-amber-200/60 shadow-md shadow-amber-100/50";
  let parsedIcon = <Info size={16} className="text-amber-500" />;

  const lowerContent = content.toLowerCase();

  if (type === "creator_signed" || (!type?.includes?.('brand') && lowerContent.includes("creator has signed"))) {
    actionLabel = "Creator Signed 📝";
    badgeColor = "text-[var(--violet)] bg-violet-50 border-violet-100";
    accentBorder = "from-indigo-400 to-fuchsia-400";
    iconBg = "bg-violet-50 text-[var(--violet)] border-violet-100";
    cardBg = "bg-white border-violet-100/60 shadow-md shadow-violet-100/30";
    parsedIcon = <Lock size={16} className="text-[var(--violet)]" />;
  } else if (type === "brand_signed" || lowerContent.includes("brand has signed")) {
    actionLabel = "Brand Signed 📝";
    badgeColor = "text-blue-700 bg-blue-50 border-blue-200";
    accentBorder = "from-blue-400 to-indigo-500";
    iconBg = "bg-blue-50 text-blue-600 border-blue-100";
    cardBg = "bg-white border-blue-200/60 shadow-md shadow-blue-100/50";
    parsedIcon = <Lock size={16} className="text-blue-500" />;
  } else if (type === "agreement_executed" || lowerContent.includes("agreement executed")) {
    actionLabel = "Agreement Executed 🎉";
    badgeColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
    accentBorder = "from-emerald-400 via-teal-500 to-indigo-500";
    iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
    cardBg = "bg-white border-emerald-200/60 shadow-md shadow-emerald-100/50";
    parsedIcon = <CheckCircle size={16} className="text-emerald-600" />;
  } else if (type === "payment_secured" || metadata?.action === "payment_secured" || lowerContent.includes("payment secured") || lowerContent.includes("held safely in escrow")) {
    actionLabel = "PAYMENT SECURED 💰";
    badgeColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
    accentBorder = "from-emerald-500 via-teal-500 to-indigo-500";
    iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
    cardBg = "bg-white border-emerald-200/60 shadow-md shadow-emerald-100/50";
    parsedIcon = <Shield size={16} className="text-emerald-600" />;
  } else if (type === "chat_closed") {
    actionLabel = "Collaboration Completed 🔒";
    badgeColor = "text-amber-800 bg-amber-50 border-amber-200";
    accentBorder = "from-amber-400 to-amber-600";
    iconBg = "bg-amber-50 text-amber-600 border-amber-100";
    cardBg = "bg-white border-amber-200/60 shadow-md shadow-amber-100/50";
    parsedIcon = <Lock size={16} className="text-amber-500" />;
  } else if (lowerContent.includes("brand") || lowerContent.includes("payment") || lowerContent.includes("escrow") || lowerContent.includes("funded") || lowerContent.includes("released") || lowerContent.includes("approve")) {
    actionLabel = "Brand Action 🏢";
    badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    accentBorder = "from-emerald-400 to-teal-500";
    iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100";
    cardBg = "bg-white border-emerald-200/60 shadow-md shadow-emerald-100/50";
    parsedIcon = <Shield size={16} className="text-emerald-500" />;
  } else if (lowerContent.includes("creator") || lowerContent.includes("submit") || lowerContent.includes("video") || lowerContent.includes("draft") || lowerContent.includes("link") || lowerContent.includes("upload")) {
    actionLabel = "Creator Action 🎥";
    badgeColor = "text-[var(--violet)] bg-violet-50 border-violet-100";
    accentBorder = "from-indigo-400 to-fuchsia-400";
    iconBg = "bg-violet-50 text-[var(--violet)] border-violet-100";
    cardBg = "bg-white border-violet-100/60 shadow-md shadow-violet-100/30";
    parsedIcon = <Video size={16} className="text-[var(--violet)]" />;
  } else if (lowerContent.includes("violation") || lowerContent.includes("block") || lowerContent.includes("warning")) {
    actionLabel = "Security Alert ⚠️";
    badgeColor = "text-red-700 bg-red-50 border-red-200";
    accentBorder = "from-red-400 to-rose-500";
    iconBg = "bg-red-50 text-red-600 border-red-100";
    cardBg = "bg-white border-red-200/60 shadow-md shadow-red-100/50";
    parsedIcon = <AlertCircle size={16} className="text-red-500" />;
  } else if (lowerContent.includes("lock") || lowerContent.includes("agreement") || lowerContent.includes("signed")) {
    actionLabel = "Contract Agreement 🤝";
    badgeColor = "text-blue-700 bg-blue-50 border-blue-200";
    accentBorder = "from-blue-400 to-indigo-500";
    iconBg = "bg-blue-50 text-blue-600 border-blue-100";
    cardBg = "bg-white border-blue-200/60 shadow-md shadow-blue-100/50";
    parsedIcon = <Lock size={16} className="text-blue-500" />;
  }

  // Remove starting emoji if any
  let cleanText = content
    .replace(/^[🔒💸📋🛠️📢🔔✅✨⚠️]\s*/, "")
    .replace(/^Deal LOCKED\.\s*/i, "")
    .replace(/^Content submitted\.\s*/i, "")
    .trim();

  const isDraftApproved = (
    type === 'content_approved' ||
    metadata?.action === 'draft_approved' ||
    cleanText.toLowerCase().includes("content draft approved") ||
    cleanText.toLowerCase().includes("ugc deliverable approved") ||
    cleanText.toLowerCase().includes("content approved")
  ) && type !== 'live_links_approved' && metadata?.action !== 'live_links_approved';
  if (isDraftApproved) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.96 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-2 md:my-5 px-1 md:px-3`}
      >
        <div className="w-full max-w-[270px] sm:max-w-[340px] md:max-w-[480px] rounded-xl md:rounded-[24px] bg-white border border-emerald-200 shadow-md md:shadow-2xl shadow-emerald-100/30 text-left relative overflow-hidden transition-all duration-300">
          {/* Top Festive Gradient Bar */}
          <div className="h-1.5 md:h-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 w-full" />
          
          <div className="p-3 md:p-6">
            {/* Top Badge/Header */}
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 md:px-3 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                <span>🎉</span>
                <span>{isUgcDeal ? "UGC Deliverable Approved" : "Draft Approved"}</span>
              </span>
              <span className="text-[8px] md:text-[10px] text-slate-400 font-bold font-mono">
                {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </div>

            {/* Celebratory Icon & Heading */}
            <div className="flex items-center gap-2.5 md:gap-4 mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100 flex items-center justify-center text-xl md:text-3xl shadow-xs shrink-0">
                🎬
              </div>
              <div>
                <h3 className="text-xs md:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {isUgcDeal ? "UGC Draft Video Approved! 🎬" : "Woohoo! Draft Approved! 🥳"}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                  {isUgcDeal ? "The brand approved your video draft. Please publish and submit your live link." : "Your content draft was approved by the brand"}
                </p>
              </div>
            </div>

            {/* Message Body */}
            <div className="p-2.5 md:p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-xl md:rounded-2xl mb-3 md:mb-5">
              <p className="text-[11px] md:text-[13px] font-semibold text-slate-700 leading-snug">
                {cleanText}
              </p>
            </div>

            {/* Operational Action Button */}
            {!isUserBrand ? (
              <button
                onClick={() => {
                  if (onSelectUploadTab) {
                    onSelectUploadTab();
                  }
                  toast.success("Ready to submit live link! 🚀");
                }}
                className="w-full py-2.5 md:py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] transition-all text-slate-950 font-black text-[10px] md:text-xs rounded-lg md:rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink size={13} className="stroke-[3]" />
                <span>SUBMIT LIVE LINK NOW 🚀</span>
              </button>
            ) : (
              <div className="p-2 md:p-3 bg-slate-50 border border-slate-200/60 rounded-lg md:rounded-xl text-center">
                <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Waiting for creator's live link ⏳
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.98 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'} my-2 md:my-4 px-1 md:px-4 animate-fadeIn`}
    >
      <div className={`w-full max-w-[270px] sm:max-w-[340px] md:max-w-xl ${cardBg} border rounded-xl md:rounded-2xl p-3 md:p-5 flex gap-2.5 md:gap-4 text-left relative overflow-hidden`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentBorder} rounded-l-xl md:rounded-l-2xl`} />

        <div className="flex-shrink-0">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${iconBg} border flex items-center justify-center shadow-xs`}>
            {parsedIcon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1 md:mb-2">
            <Badge variant="info" className={badgeColor}>
              {actionLabel}
            </Badge>
            <span className="text-[8px] md:text-[10px] text-slate-400 font-semibold font-mono">
              {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
          <p className="text-[11px] md:text-sm leading-snug font-semibold text-slate-800 break-words">
            {cleanText}
          </p>
          {type === "payment_trigger" && (
            <div className="mt-2.5 md:mt-4 flex flex-wrap gap-1.5 md:gap-2.5 pt-2 md:pt-3 border-t border-slate-100 font-sans">
              <button
                onClick={onViewInvoice}
                className="flex items-center gap-1 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] md:text-[11px] rounded-lg md:rounded-xl transition-all cursor-pointer shadow-xs border border-slate-200/60"
              >
                <CreditCard size={11} className="text-slate-500 md:w-3 md:h-3" />
                <span>View Invoice</span>
              </button>
              <button
                onClick={onTriggerReview}
                className="flex items-center gap-1 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-extrabold text-[10px] md:text-[11px] rounded-lg md:rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle size={11} className="md:w-3 md:h-3" />
                <span>Submit Review</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
