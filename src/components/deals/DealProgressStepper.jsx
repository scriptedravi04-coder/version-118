import React, { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DealProgressStepper({ 
  stage = "IN_PROGRESS",
  orderNumber = "#5678",
  brandName = "Brand Partner",
  brandLogo = null,
  trackingCode = null,
  deadline = null,
  title = "UGC Video Brief",
  payout = null
}) {
  const [copied, setCopied] = useState(false);

  // Map backend status/stage to 4 creator panel stages
  const creatorStatus = String(stage || '').toUpperCase();

  let activeIdx = 0;
  let statusHeadline = "In Production";
  let subtitleText = deadline ? `Estimated delivery date: ${deadline}` : "Filming & editing in progress";

  if (creatorStatus === "COMPLETED" || creatorStatus === "PAID" || creatorStatus === "RELEASED") {
    activeIdx = 3;
    statusHeadline = "Completed";
    subtitleText = "Content approved & payment cleared to wallet";
  } else if (creatorStatus === "PROOF_SUBMITTED" || creatorStatus === "LIVE_LINK_SUBMITTED") {
    activeIdx = 2;
    statusHeadline = "Live Link Review";
    subtitleText = "Live post link submitted — under review for final escrow payout release";
  } else if (
    creatorStatus === "CONTENT_APPROVED" || 
    creatorStatus === "AWAITING_LIVE_LINK" || 
    creatorStatus === "COMPLETED_APPROVAL"
  ) {
    activeIdx = 2;
    statusHeadline = "Waiting for Live Link";
    subtitleText = "Video draft approved — waiting for creator to post & submit live link";
  } else if (creatorStatus === "APPROVED" || creatorStatus === "PAYMENT_CLEARED") {
    activeIdx = 2;
    statusHeadline = "Payment Cleared";
    subtitleText = "Work approved — payout released to escrow";
  } else if (
    creatorStatus === "IN_REVIEW" || 
    creatorStatus === "SUBMITTED" || 
    creatorStatus === "CONTENT_SUBMITTED" || 
    creatorStatus === "DELIVERED" || 
    creatorStatus === "PENDING_REVIEW" ||
    creatorStatus === "UNDER_REVIEW"
  ) {
    activeIdx = 1;
    statusHeadline = "Waiting for Approval";
    subtitleText = "Deliverable submitted — currently under brand review";
  } else if (
    creatorStatus === "REVISION_DECLINED" || 
    creatorStatus === "DECLINED_REVISION" || 
    creatorStatus === "RESUBMISSION_DECLINED" ||
    creatorStatus.includes("DECLINE")
  ) {
    activeIdx = 1;
    statusHeadline = "Revisions Declined";
    subtitleText = "Creator declined the revision request. Review actions below.";
  } else if (creatorStatus === "REVISION_REQUESTED" || creatorStatus === "REVISION_REQ" || creatorStatus === "REVISION_REQUESTED_LINKS") {
    activeIdx = 0;
    statusHeadline = "Revision Requested";
    subtitleText = "Brand requested minor tweaks to deliverable";
  } else {
    // IN_PROGRESS, PENDING, ACCEPTED
    activeIdx = 0;
    statusHeadline = "In Production";
    subtitleText = deadline ? `Estimated delivery date: ${deadline}` : "Filming & editing in progress";
  }

  // Exactly 4 Creator Panel Stages
  const steps = [
    { label: "In Production" },
    { label: "Waiting for Approval" },
    { label: "Payment Cleared" },
    { label: "Completed" }
  ];

  const codeToCopy = trackingCode || orderNumber;

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    toast.success("Order tracking code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayTitle = (title && String(title).trim() !== "" && String(title).trim() !== "null") ? title : "UGC Video Campaign";

  return (
    <div className="w-full space-y-3.5 font-sans pb-4 border-b border-[var(--border-default)]">
      
      {/* Top Header Row with Brand Logo, Campaign Title and Brand Name */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Brand Logo from Backend */}
          {brandLogo ? (
            <img 
              src={brandLogo} 
              alt={brandName || "Brand"} 
              className="w-10 h-10 rounded-xl object-cover border border-[var(--border-default)] shrink-0 shadow-xs" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className={`w-10 h-10 rounded-xl bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--violet)]/20 flex items-center justify-center shrink-0 shadow-xs font-bold text-base uppercase ${brandLogo ? 'hidden' : 'flex'}`}
          >
            <span>{brandName ? brandName.charAt(0).toUpperCase() : "B"}</span>
          </div>

          <div className="min-w-0">
            <h4 className="text-base md:text-lg font-bold text-[var(--text-primary)] leading-snug truncate">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] mt-0.5">
              <span className="font-bold text-[var(--text-primary)] opacity-100 truncate">
                by {brandName || "Brand Partner"}
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="font-mono text-[var(--violet)] font-bold">{codeToCopy}</span>
              <button 
                type="button"
                onClick={handleCopyCode}
                className="text-[var(--violet)] hover:text-[var(--violet-hover)] transition-colors p-0.5 cursor-pointer"
                title="Copy Tracking ID"
              >
                <Copy size={13} className="rotate-90" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider block">Payout</span>
          <span className="text-base font-black font-mono text-emerald-600 block">
            ₹{payout ? Number(payout).toLocaleString() : '—'}
          </span>
        </div>
      </div>

      {/* Big Status Headline & Subtitle */}
      <div className="space-y-0.5">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {statusHeadline}
        </h2>
        <p className="text-xs text-[var(--text-secondary)] font-medium">
          {subtitleText}
        </p>
      </div>

      {/* 4 Segmented Stepper Bars */}
      <div className="space-y-2.5 pt-1">
        {/* 4 Progress Bars */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {steps.map((_, idx) => {
            const isCompletedStage = creatorStatus === "COMPLETED" || creatorStatus === "PAID" || creatorStatus === "RELEASED";
            const isPassed = isCompletedStage ? true : idx < activeIdx;
            const isCurrent = !isCompletedStage && idx === activeIdx;

            return (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 relative overflow-hidden ${
                  isPassed || isCurrent 
                    ? "bg-[#059669]" 
                    : "bg-[var(--border-default)]"
                }`}
              />
            );
          })}
        </div>

        {/* 4 Step Icons & Labels Row */}
        <div className="grid grid-cols-4 gap-1 md:gap-2 text-center sm:text-left items-start sm:items-center">
          {steps.map((step, idx) => {
            const isCompletedStage = creatorStatus === "COMPLETED" || creatorStatus === "PAID" || creatorStatus === "RELEASED";
            const isPassed = isCompletedStage ? true : idx < activeIdx;
            const isCurrent = !isCompletedStage && idx === activeIdx;

            return (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-1.5 min-w-0">
                {isPassed ? (
                  <div className="w-4 h-4 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0">
                    <Check size={11} className="stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#059669] bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--border-strong)] bg-transparent shrink-0" />
                )}

                <span className={`text-[9px] sm:text-xs leading-tight sm:truncate max-sm:px-0.5 mt-1 sm:mt-0 ${
                  isPassed || isCurrent 
                    ? "font-bold text-[var(--text-primary)]" 
                    : "font-medium text-[var(--text-tertiary)]"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
