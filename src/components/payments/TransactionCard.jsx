import React, { useState } from "react";
import { ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import InvoiceModal from "./InvoiceModal";
import { useAuth } from "../../contexts/AuthContext";
import { t } from "@/lib/typography";

export default function TransactionCard({ tx, onRelease }) {
  const [showInvoice, setShowInvoice] = useState(false);
  const { user } = useAuth();
  
  if (!tx) return null;
  
  const isBrand = user?.role === "brand";
  const currentUserCompany = user?.company_name || user?.name || "Brand Partner";

  const statusUpper = (tx.status || "").toUpperCase();
  const payoutStatusUpper = (tx.payout_status || "").toUpperCase();
  const dealStatusUpper = (tx.deal_status || "").toUpperCase();
  const utrNum = tx.payout_reference || tx.utr_number || tx.utrNumber;

  // Determine if payment is released / disbursed
  const isReleased = Boolean(
    payoutStatusUpper === "RELEASED" ||
    payoutStatusUpper === "PAID" ||
    statusUpper === "RELEASED" ||
    (statusUpper === "COMPLETED" && (payoutStatusUpper === "PAID" || payoutStatusUpper === "RELEASED" || Boolean(utrNum))) ||
    Boolean(utrNum)
  );

  // Video Submitted / Content milestone reached
  const isVideoSubmitted = Boolean(
    isReleased ||
    tx.is_content_submitted === true ||
    ["VIDEO_SUBMITTED", "SUBMITTED", "IN_REVIEW", "APPROVED", "CONTENT_APPROVED", "PAYOUT_REQUESTED", "COMPLETED", "LIVE_LINKS_SUBMITTED"].includes(statusUpper) ||
    ["VIDEO_SUBMITTED", "SUBMITTED", "IN_REVIEW", "APPROVED", "CONTENT_APPROVED", "PAYOUT_REQUESTED", "COMPLETED", "LIVE_LINKS_SUBMITTED"].includes(dealStatusUpper) ||
    Boolean(tx.video_url || tx.submission_link)
  );

  // In Escrow
  const isInEscrow = Boolean(
    isVideoSubmitted ||
    tx.escrow_hold === true ||
    ["HELD", "IN_ESCROW", "ESCROW_HELD", "ACTIVE", "IN_PROGRESS"].includes(statusUpper) ||
    ["HELD", "IN_ESCROW", "ESCROW_HELD", "ACTIVE", "IN_PROGRESS"].includes(dealStatusUpper) ||
    statusUpper === "SUCCESS"
  );

  // Determine active step index (1: Deposited, 2: In escrow, 3: Video submitted, 4: Released)
  let activeStep = 1;
  if (isReleased) {
    activeStep = 4;
  } else if (isVideoSubmitted) {
    activeStep = 3;
  } else if (isInEscrow) {
    activeStep = 2;
  } else {
    activeStep = 1;
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return String(dateString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return String(dateString);
    }
  };

  const steps = [
    { id: 1, label: "Deposited", key: "deposited" },
    { id: 2, label: "In escrow", key: "in_escrow" },
    { id: 3, label: "Video submitted", key: "video_submitted" },
    { id: 4, label: "Released", key: "released" },
  ];

  const contractId =
    tx.contract_id ||
    (tx.contracts && tx.contracts.contract_number) ||
    `CTR-${(tx.id || tx.transaction_id || "0000").slice(0, 8).toUpperCase()}`;

  const creatorName =
    tx.creator_name ||
    (tx.creator && typeof tx.creator === "object" ? tx.creator.name : tx.creator) ||
    (tx.creator_profiles && tx.creator_profiles.name) ||
    "Creator Pro";

  const amountVal = Number(tx.amount || tx.gross_amount || 0);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[12px] p-5 mb-4 font-sans text-left transition-all hover:border-[var(--violet-border)]">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-default)]">
        <div>
          <div className="font-sans font-semibold text-xs text-[var(--text-secondary)] tracking-tight">
            {contractId}
          </div>
          <h4 className="text-base font-bold mt-0.5">
            {creatorName}
          </h4>
        </div>
        <div className="text-left sm:text-right">
          <div
            className={`font-sans font-extrabold tracking-tight text-lg ${
              isReleased ? "text-emerald-600" : "text-[var(--violet)]"
            }`}
          >
            ₹{amountVal.toLocaleString("en-IN")}
          </div>
          <div className={`text-[11px] font-medium mt-0.5 capitalize ${isReleased ? "text-emerald-600 font-semibold" : "text-[var(--text-tertiary)] opacity-80"}`}>
            {isReleased ? "Released To Creator" : "Held In Escrow"}
          </div>
        </div>
      </div>

      {/* 3. Horizontal 4-step status stepper */}
      <div className="py-3 mt-4 mb-2 px-2 sm:px-4">
        <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto">
          {steps.map((step, idx) => {
            const isCompleted = activeStep >= step.id;
            const hasNextLine = idx < steps.length - 1;
            const isLineCompleted = activeStep >= step.id + 1;

            return (
              <React.Fragment key={`step-${step.id}-${idx}`}>
                {/* Step Circle & Label */}
                <div className="relative z-10 flex flex-col items-center group">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? isReleased
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-[var(--violet)] text-white shadow-sm"
                        : "bg-[var(--bg-card)] border-2 border-[var(--border-default)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <span className="text-[10px] font-sans font-semibold">{step.id}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-[11px] mt-1.5 text-center whitespace-nowrap font-sans ${
                      isCompleted ? "font-bold text-[var(--text-primary)]" : "font-normal text-[var(--text-secondary)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {hasNextLine && (
                  <div className="flex-1 h-[2px] mx-1 sm:mx-2 -mt-4">
                    <div
                      className={`h-full transition-all ${
                        isLineCompleted
                          ? isReleased
                            ? "bg-emerald-500"
                            : "bg-[var(--violet)]"
                          : "bg-[var(--border-default)]"
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 4. Footer Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t border-[var(--border-default)]">
        <div className="font-sans font-semibold text-xs text-[var(--text-tertiary)] opacity-60 tracking-tight">
          Deposited on {formatDate(tx.created_at || tx.date)}
        </div>
        <div className="flex items-center gap-4">
          {tx.payout_status === 'PAYOUT_PENDING_ADMIN' && !isReleased ? (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Processing — funds will reach creator in 1-2 working days
            </span>
          ) : isReleased ? (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[2.5]" /> Completed {utrNum ? `(UTR: ${utrNum})` : ''}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-full border border-[var(--border-default)]">
              Pending
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowInvoice(true)}
            className={`text-xs font-bold text-[var(--violet)] hover:text-[var(--violet-hover)] transition-colors cursor-pointer bg-transparent border-none p-0`}
          >
            View receipt
          </button>
        </div>
      </div>

      {showInvoice && (
        <InvoiceModal
          transaction={tx}
          isBrand={isBrand}
          creatorName={creatorName}
          brandName={isBrand ? currentUserCompany : (tx.brand_name || tx.brand?.name || "Brand")}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
}
