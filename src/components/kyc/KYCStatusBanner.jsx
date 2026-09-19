import React from "react";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export default function KYCStatusBanner({ status, rejectReason }) {
  if (status === "approved" || status === "APPROVED") {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4.5 flex items-start gap-3.5 mb-6">
        <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-lg">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">KYC Verification Approved</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Your business credentials have been hand-verified. All settlement routes, active campaign brief posts, and secure payout escrows are functional.
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending" || status === "PENDING" || status === "UNDER_REVIEW") {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4.5 flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-500/15 text-amber-400 rounded-lg animate-pulse shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">KYC Compliance Check Under Review ⏳</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              We have safely received your corporate billing and identity files. Our compliance officers are actively validating details. Resubmission is locked during this verification queue phase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected" || status === "REJECTED") {
    return (
      <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4.5 flex items-start gap-3.5 mb-6">
        <div className="p-2 bg-red-500/15 text-red-400 rounded-lg">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">KYC Compliance Submission Rejected ❌</h4>
          <p className="text-xs text-red-100 font-bold mt-1.5 bg-red-500/10 border border-red-500/15 p-3 rounded-lg">
            Rejection Reason: {rejectReason || "Identity or business credentials matching failed. Verification photo/PDF copies were blurred or unreadable."}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            The verification form has been re-enabled below. Please audit GSTIN, PAN numbers, and document images for high legibility issues and resubmit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4.5 flex items-start gap-3.5 mb-6">
      <div className="p-2 bg-blue-500/15 text-blue-400 rounded-lg">
        <AlertCircle size={20} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">KYC Verification Missing</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Complete your business verification to activate premium briefing listings, escrow transfers, and pay partners securely.
        </p>
      </div>
    </div>
  );
}
