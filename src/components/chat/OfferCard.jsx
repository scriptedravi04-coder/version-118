import React, { useState } from "react";
import { safeArray } from "../../utils/safeFormat";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, Send, X, IndianRupee } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function OfferCard({ 
  message, 
  threadId, 
  thread,
  campaignTitle, 
  onActionComplete, 
  isMine, 
  isUserBrand, 
  onViewContract 
}) {
  const offer = message.metadata || {};
  const displayAmount = offer.amount || offer.proposed_amount || (thread && (thread.counter_amount || thread.amount_fixed)) || 0;

  const threadStatusUpper = String(thread?.status || '').toUpperCase();
  const threadFlowUpper = String(thread?.flow_state || '').toUpperCase();

  const isAgreementExecuted = Boolean(
    (thread?.agreement_signed_creator && thread?.agreement_signed_brand) ||
    thread?.agreement_signed_at ||
    threadStatusUpper === 'ACTIVE' ||
    threadFlowUpper === 'ACTIVE' ||
    ['ESCROW_PAID', 'ESCROW_FUNDED', 'COMPLETED', 'PAID', 'CONTENT_SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CLOSED'].includes(threadStatusUpper) ||
    ['ESCROW_PAID', 'ESCROW_FUNDED', 'COMPLETED', 'CONTENT_SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CLOSED'].includes(threadFlowUpper)
  );

  const isAgreementReady = Boolean(
    threadFlowUpper === 'AI_AGREEMENT_READY' ||
    threadFlowUpper === 'AGREEMENT_SIGNED' ||
    threadStatusUpper === 'AI_AGREEMENT_READY' ||
    threadStatusUpper === 'AGREEMENT_SIGNED'
  );

  const threadCounterAmount = Number(thread?.counter_amount || thread?.agreed_amount || thread?.amount_fixed || 0);
  const offerProposedAmount = Number(offer?.proposed_amount || offer?.amount || 0);

  // If this offer was superseded by a newer counter offer on the thread
  const isSuperseded = Boolean(
    threadCounterAmount > 0 && 
    offerProposedAmount > 0 && 
    offerProposedAmount !== threadCounterAmount
  );

  const isResolved = Boolean(
    offer.status === 'ACCEPTED' || 
    offer.status === 'SIGNED' || 
    offer.status === 'REJECTED' ||
    offer.status === 'COUNTERED' ||
    isAgreementExecuted ||
    isAgreementReady ||
    isSuperseded
  );

  const isPending = !isResolved && (
    offer.status === 'PENDING' || 
    message.message_type === 'negotiation_offer' || 
    threadFlowUpper === 'NEGOTIATING_COUNTER' ||
    threadStatusUpper === 'NEGOTIATING'
  );
  const [loading, setLoading] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

  const timeText = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const deadlineText = offer.deadline 
    ? new Date(offer.deadline).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'N/A';
  
  const handleAcceptOffer = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/campaign/threads/${threadId}/brand-accept-counter`);
      toast.success("Counter offer accepted! Agreement updated successfully. 🤝");
      if (onActionComplete) onActionComplete(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to accept offer");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCounter = async () => {
    const amountNum = Number(counterPrice);
    if (!counterPrice || amountNum <= 0) {
      toast.error("Please enter a valid price.");
      return;
    }
    if (amountNum < 3000) {
      toast.error("Minimum offer amount on the platform is ₹3,000.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post(`/campaign/threads/${threadId}/creator-negotiate`, {
        counter_amount: amountNum
      });
      toast.success("Counter offer proposed! 🚀", {
        description: `Counter offer of ₹${amountNum.toLocaleString('en-IN')} sent to the brand.`
      });
      setIsNegotiating(false);
      setCounterPrice("");
      if (onActionComplete) onActionComplete(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to send counter offer");
    } finally {
      setLoading(false);
    }
  };

  // Styled according to mine vs yours design (Screenshot 3 & Screenshot 2)
  const cardBgClass = isMine 
    ? "bg-[#6366F1] text-white border-none" 
    : "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-default)]";

  const labelColor = isMine ? "text-indigo-200" : "text-[var(--text-secondary)]";
  const valueColor = isMine ? "text-white" : "text-[var(--text-primary)]";
  const dividerClass = isMine ? "border-indigo-400/30" : "border-[var(--border-default)]";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`my-2 md:my-3 flex ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div className={`w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] p-3.5 md:p-5 shadow-md md:shadow-xl rounded-xl md:rounded-2xl transition-all ${cardBgClass}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-2.5 md:mb-4">
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${isMine ? "text-indigo-100/90" : "text-[var(--text-tertiary)]"}`}>
            {isMine ? "Offer from You" : (isUserBrand ? "Offer from Creator" : "Offer from Brand")}
          </span>
          <span className={`text-[9px] md:text-[10px] ${isMine ? "text-indigo-200/80" : "text-[var(--text-tertiary)]"}`}>{timeText}</span>
        </div>

        {/* Amount */}
        <div className="text-xl md:text-3xl font-mono font-black tracking-tight mb-2.5 md:mb-4 flex items-baseline">
          <span className="text-sm md:text-lg mr-1 opacity-90">₹</span>
          <span>{displayAmount.toLocaleString('en-IN')}</span>
        </div>

        {/* Detailed Breakdown Box */}
        <div className={`space-y-1.5 md:space-y-3 pt-2 md:pt-3 border-t ${dividerClass}`}>
          <div className="flex justify-between text-[11px] md:text-xs">
            <span className={labelColor}>Campaign</span>
            <span className={`font-semibold ${valueColor} truncate max-w-[130px] md:max-w-[160px]`}>{campaignTitle}</span>
          </div>
          
          <div className="flex justify-between text-[11px] md:text-xs">
            <span className={labelColor}>Deadline</span>
            <span className={`font-semibold ${valueColor}`}>{deadlineText}</span>
          </div>

          <div className="flex justify-between text-[11px] md:text-xs">
            <span className={labelColor}>Revisions</span>
            <span className={`font-semibold ${valueColor}`}>{offer.revision_count || 1} included</span>
          </div>

          {offer.deliverables && offer.deliverables.length > 0 ? (
            <div className={`pt-2 border-t ${dividerClass} text-[11px] md:text-xs`}>
              <span className={`block font-bold mb-1 uppercase tracking-wider text-[9px] md:text-[10px] ${isMine ? "text-indigo-100" : "text-[var(--text-secondary)]"}`}>
                Deliverables:
              </span>
              <ul className={`list-disc list-inside space-y-0.5 md:space-y-1 ${isMine ? "text-indigo-100" : "text-[var(--text-secondary)]"} pl-1`}>
                { safeArray(offer.deliverables).map((del, i) => (
                  <li key={i} className="truncate">{del}</li>
                ))}
              </ul>
            </div>
          ) : (message.content || message.text) ? (
            <div className={`pt-2 border-t ${dividerClass} text-[11px] md:text-xs`}>
              <p className={`${isMine ? "text-indigo-100" : "text-[var(--text-secondary)]"} italic`}>
                {message.content || message.text}
              </p>
            </div>
          ) : null}
        </div>

        {/* Action Button Section */}
        <div className="mt-3 md:mt-5">
          {isPending ? (
            isMine ? (
              <div className="py-2 md:py-3 w-full text-center bg-white/10 text-indigo-100 text-[11px] md:text-xs font-bold rounded-lg md:rounded-xl border border-white/20 select-none">
                Waiting...
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {!isNegotiating ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex gap-2"
                  >
                    <button 
                      onClick={handleAcceptOffer}
                      disabled={loading}
                      className="flex-1 py-2 md:py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[11px] md:text-xs font-extrabold rounded-lg md:rounded-xl transition-colors shadow-md shadow-emerald-500/10"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => setIsNegotiating(true)}
                      disabled={loading}
                      className="flex-1 py-2 md:py-3 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] border border-[var(--border-default)] text-[var(--text-primary)] text-[11px] md:text-xs font-bold rounded-lg md:rounded-xl transition-colors"
                    >
                      Negotiate
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-2.5 md:p-3.5 rounded-lg md:rounded-xl border flex flex-col gap-2 md:gap-3 ${
                      isMine ? "bg-indigo-700/50 border-indigo-500/30" : "bg-[var(--bg-elevated)] border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Propose Price:</span>
                      <button 
                        onClick={() => setIsNegotiating(false)}
                        className="p-1 hover:bg-black/10 rounded-full transition-colors"
                      >
                        <X size={12} className="md:w-3.5 md:h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg md:rounded-xl">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">₹</span>
                      <input 
                        type="number"
                        value={counterPrice}
                        onChange={e => setCounterPrice(e.target.value)}
                        placeholder={offer.amount ? String(offer.amount) : "Amount"}
                        className="w-full bg-transparent border-none text-xs font-mono font-bold text-[var(--text-primary)] focus:ring-0 focus:outline-none p-0"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleSendCounter}
                        disabled={loading || !counterPrice || Number(counterPrice) <= 0}
                        className="flex-1 py-1.5 md:py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-[11px] md:text-xs font-bold rounded-md md:rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Send size={11} className="md:w-3 md:h-3" /> Send Propose
                      </button>
                      <button 
                        onClick={() => setIsNegotiating(false)}
                        className="px-2.5 py-1.5 md:px-3 md:py-2 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[11px] md:text-xs font-bold rounded-md md:rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )
          ) : (
            <div className="space-y-2 md:space-y-3">
              <div className={`py-2 md:py-2.5 w-full text-center text-[11px] md:text-xs font-bold rounded-lg md:rounded-xl border flex items-center justify-center gap-1.5 md:gap-2
                ${(offer.status === 'ACCEPTED' || isAgreementExecuted || (isResolved && !isSuperseded)) ? 'bg-[#F0FDF4] border-[#A7F3D0] text-[var(--green)]' : 
                  (offer.status === 'COUNTERED' || isSuperseded) ? 'bg-[var(--violet-soft)] border-[var(--violet-border)] text-[var(--violet)]' : 
                  offer.status === 'SIGNED' ? 'bg-[#F0FDF4] border-[#A7F3D0] text-[var(--green)]' :
                  'bg-[#FEF2F2] border-[#FECACA] text-[var(--red)]'}`
              }>
                {(offer.status === 'ACCEPTED' || isAgreementExecuted || (isResolved && !isSuperseded) || offer.status === 'SIGNED') && <CheckCircle size={13} className="md:w-3.5 md:h-3.5" />}
                {isAgreementExecuted ? 'Signed ✓' :
                 isSuperseded ? 'Countered' :
                 (offer.status === 'ACCEPTED' || isResolved) ? 'Accepted ✓' : 
                 offer.status === 'SIGNED' ? 'Signed ✓' :
                 offer.status === 'COUNTERED' ? 'Countered' : 'Rejected'}
              </div>

              {/* Show Contract only after acceptance */}
              {(offer.status === 'ACCEPTED' || isResolved || offer.status === 'SIGNED' || isAgreementExecuted) && !isSuperseded && (
                <button 
                  onClick={() => onViewContract && onViewContract(offer)}
                  className="w-full py-2 md:py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-[11px] md:text-xs font-extrabold rounded-lg md:rounded-xl transition-colors shadow-md shadow-[var(--violet)]/10"
                >
                  {isAgreementExecuted ? "View Partnership Contract" : "Sign Partnership Contract"}
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
