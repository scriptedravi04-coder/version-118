import React, { useState } from "react";
import { Check, Lock, Download, Play } from "lucide-react";
import { resolveMediaUrl } from "../../shared/VideoEmbedPreview";

export default function MobileDeliverableCard({ message, thread, isBrand, isUgcOrder, onApprove, onOpenRequestChanges, onOpenReupload }) {
  const metadata = message.metadata || {};
  const rawUrl = metadata.content_url || metadata.video_url || metadata.media_url || metadata.videoUrl || message.content_url || message.video_url || "";
  const contentUrl = resolveMediaUrl(rawUrl);
  const notes = metadata.notes || "";
  const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  // Same rule as desktop ContentProofNotice.jsx — approved (mid-flow) is NOT the same as
  // fully completed. Do not unlock download for the brand just because it's approved.
  const statusUpper = (thread?.status || "").toUpperCase();
  const flowUpper = (thread?.flow_state || "").toUpperCase();
  const isFullyCompleted = statusUpper === "COMPLETED" || flowUpper === "COMPLETED" || thread?.ugc_order?.status === "COMPLETED";
  const canDownload = !isBrand || isFullyCompleted;

  const msgType = message.message_type || "";
  const isRevisionMsg = ["CHANGES_REQUESTED", "revision_requested", "revision_declined"].includes(msgType);

  const isApproved = ["CONTENT_APPROVED", "APPROVED", "COMPLETED"].includes(statusUpper) || ["CONTENT_APPROVED", "APPROVED", "COMPLETED"].includes(flowUpper);
  const isLocked = isApproved && !isFullyCompleted; // campaign: approved but live-link step still pending
  const isUnlocked = isApproved && isFullyCompleted; // UGC: approval = completion

  const [busy, setBusy] = useState(false);
  const handleApprove = async () => {
    setBusy(true);
    await onApprove();
    setBusy(false);
  };

  // --- Revision-request card (feedback from the approver) ---
  if (isRevisionMsg) {
    return (
      <div style={{ alignSelf: "stretch", width: "100%", boxSizing: "border-box" }}>
        <div style={{ padding: "11px 14px", borderRadius: 14, background: "#fff", border: "1px solid #F5E4BE", marginBottom: 10 }}>
          <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#D97706" }}>Feedback</div>
          <div style={{ marginTop: 7, font: "400 13.5px/1.5 'DM Sans',sans-serif", color: "#0A0A0A" }}>"{notes || message.content}"</div>
        </div>
        {!isBrand && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "13px 15px", boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
            <button
              onClick={onOpenReupload}
              style={{ width: "100%", height: 44, borderRadius: 12, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
            >
              <span style={{ font: "600 13.5px 'DM Sans',sans-serif", color: "#fff" }}>Re-upload video</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Deliverable card (submitted / locked / unlocked) ---
  const label = isUnlocked ? "Approved" : isLocked ? "Approved · not complete yet" : isBrand ? "Awaiting your review" : "Under review";
  const labelColor = isUnlocked ? "#059669" : isLocked ? "#D97706" : isBrand ? "#D97706" : "#D97706";

  return (
    <div style={{ alignSelf: "stretch", width: "100%", boxSizing: "border-box", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ padding: "14px 15px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: labelColor }}>{label}</div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>
      <div style={{ padding: "7px 15px 12px", font: "600 16px 'DM Sans',sans-serif", letterSpacing: "-.3px", color: "#0A0A0A" }}>
        {isUgcOrder ? "Raw video" : "Reel draft"}
      </div>
      <div
        onClick={() => contentUrl && canDownload && window.open(contentUrl, "_blank")}
        style={{ position: "relative", height: 176, background: "#0A0A0A", cursor: contentUrl && canDownload ? "pointer" : "default" }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
          </div>
        </div>
        {!canDownload && (
          <div style={{ position: "absolute", left: 12, top: 12, height: 26, padding: "0 10px", borderRadius: 13, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={11} color="#fff" />
            <span style={{ font: "500 10.5px 'DM Sans',sans-serif", color: "#fff" }}>
              {isLocked ? "Locked until live links approved" : "Watermarked preview"}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: "13px 15px 15px" }}>
        {isUnlocked ? (
          <>
            <button
              onClick={() => contentUrl && window.open(contentUrl, "_blank")}
              style={{ width: "100%", height: 44, borderRadius: 12, background: "#0A0A0A", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
            >
              <Download size={15} color="#fff" />
              <span style={{ font: "600 13.5px 'DM Sans',sans-serif", color: "#fff" }}>Download video</span>
            </button>
            <div style={{ marginTop: 9, textAlign: "center", font: "400 11.5px 'DM Sans',sans-serif", color: "#6B7280" }}>
              Watermark removed · full usage rights
            </div>
          </>
        ) : isLocked ? (
          <>
            <div style={{ font: "400 13px/1.55 'DM Sans',sans-serif", color: "#6B7280" }}>
              {isBrand
                ? "The creator is cleared to post this. The file unlocks and the payout releases only after you approve their live links."
                : "You're cleared to post this live. Submit your live link once it's up to unlock the file and release payout."}
            </div>
            <div style={{ marginTop: 12, height: 40, borderRadius: 11, background: "#F2F2F7", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Lock size={13} color="#6B7280" />
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Download locked</span>
            </div>
          </>
        ) : isBrand ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled={busy}
              onClick={handleApprove}
              style={{ flex: 1, height: 44, borderRadius: 12, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: busy ? 0.6 : 1, cursor: "pointer" }}
            >
              <Check size={15} color="#fff" strokeWidth={2.4} />
              <span style={{ font: "600 13.5px 'DM Sans',sans-serif", color: "#fff" }}>
                {isUgcOrder ? "Approve & pay" : "Approve"}
              </span>
            </button>
            <button
              onClick={onOpenRequestChanges}
              style={{ flex: 1, height: 44, borderRadius: 12, background: "#F2F2F7", border: "none", font: "600 13.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}
            >
              {isUgcOrder ? "Revision" : "Request changes"}
            </button>
          </div>
        ) : (
          <div style={{ height: 40, borderRadius: 11, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "#D97706" }} />
            <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#92400E" }}>
              {isUgcOrder ? "Brand has 48 hours to review" : "Waiting for review"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
