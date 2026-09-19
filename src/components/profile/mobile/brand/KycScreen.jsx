import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, ExternalLink } from "lucide-react";
import {
  MobileScreen, Section, Card, InfoRow, Loader, Pill, EmptyState, PrimaryButton, kycBadgeFor,
} from "./brandMobileUi";

// Screen 1f — the submitted KYC credentials, read from GET verifications/me,
// the same source BrandKyc.jsx uses. Read-only by design: the mockup specs this
// screen as a record of what was submitted, with re-submission routed to the
// existing KYC form.

export default function KycScreen({ onBack, kyc, loading }) {
  const navigate = useNavigate();
  const status = String(kyc?.status || "").toLowerCase();
  const badge = kycBadgeFor(status);
  const docs = kyc?.documents || {};
  const submitted = Boolean(kyc) && status !== "not_submitted";

  if (loading) {
    return (
      <MobileScreen title="KYC & compliance" onBack={onBack}>
        <Loader label="Checking your verification…" />
      </MobileScreen>
    );
  }

  if (!submitted) {
    return (
      <MobileScreen title="KYC & compliance" onBack={onBack}>
        <EmptyState
          icon={Shield}
          title="Not verified yet"
          body="Creators don't see a verified badge on your briefs, and you can't publish a campaign, until this clears."
          action={
            <button
              onClick={() => navigate("/brand/kyc")}
              className="h-11 px-5 rounded-xl bg-violet-600 text-white font-bold text-sm"
            >
              Start verification
            </button>
          }
        />
      </MobileScreen>
    );
  }

  const proofUrl = docs.business_proof_document_url || docs.gst_cert_url || docs.pan_card_url || "";

  return (
    <MobileScreen
      title="KYC & compliance"
      onBack={onBack}
      footer={
        <PrimaryButton onClick={() => navigate("/brand/kyc?edit=true")}>
          Edit & resubmit
        </PrimaryButton>
      }
    >
      <Section>
        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-gray-900" />
            <Pill tone={badge.tone}>{badge.label}</Pill>
            <span className="text-xs text-gray-500 ml-auto">
              {[docs.gstin || docs.gst_cert ? "GST" : null, docs.brand_pan ? "PAN" : null]
                .filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
          {status === "rejected" && kyc?.rejection_reason && (
            <p className="text-xs text-red-700 mt-3 leading-relaxed">{kyc.rejection_reason}</p>
          )}
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Changing verified details starts the review again. Contact support if you only need a correction.
          </p>
        </div>
      </Section>

      <Section title="Submitted credentials" className="pt-0">
        <Card>
          <InfoRow label="Company name" value={docs.company_name} />
          <InfoRow label="GSTIN" value={docs.gstin || docs.gst_cert} />
          <InfoRow label="Corporate PAN" value={docs.brand_pan} />
          <InfoRow label="Authorised officer" value={[docs.poc_name, docs.poc_designation].filter(Boolean).join(" · ")} />
          <InfoRow label="Liaison phone" value={docs.poc_phone} />
          <InfoRow label="Authorised email" value={docs.poc_email} />
          <InfoRow label="Website" value={docs.website || docs.website_url} last={!proofUrl} />
          {proofUrl && (
            <a
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50"
            >
              <FileText size={15} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-xs text-gray-500">Incorporation certificate</div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">View document</div>
              </div>
              <ExternalLink size={13} className="text-gray-300 flex-shrink-0" />
            </a>
          )}
        </Card>
      </Section>
    </MobileScreen>
  );
}
