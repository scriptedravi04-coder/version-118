import React, { useState } from "react";
import { ExternalLink, RefreshCw, Check } from "lucide-react";

function platformDot(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("youtube") || u.includes("youtu.be")) return "#FF0000";
  if (u.includes("instagram")) return "linear-gradient(135deg,#F9CE34,#EE2A7B,#6228D7)";
  return "#7C3AED";
}

export default function MobileLiveLinksCard({ message, isBrand, onApprove, onOpenReject }) {
  const metadata = message.metadata || {};
  const links = metadata.links || (metadata.link ? [metadata.link] : []);
  const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const isResubmitRequest = message.message_type === "live_links_resubmit_request";
  const isSuperseded = Boolean(metadata.superseded);

  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleApprove = async () => {
    setBusy(true);
    await onApprove();
    setBusy(false);
  };

  if (isResubmitRequest) {
    return (
      <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, padding: 15, boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#DC2626" }}>Resubmission requested</div>
          <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
        </div>
        <div style={{ marginTop: 10, padding: "11px 13px", borderRadius: 12, background: "#FEF2F2", font: "400 13px/1.5 'DM Sans',sans-serif", color: "#991B1B" }}>
          "{metadata.feedback || message.content}"
        </div>
        <div style={{ marginTop: 12, height: 40, borderRadius: 11, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "#D97706" }} />
          <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#92400E" }}>Waiting for new links · payout on hold</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, padding: 15, boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#7C3AED" }}>Live links submitted</div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>
      <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((link, i) => (
          <div key={i} style={{ height: 44, borderRadius: 12, background: "#F9F9FB", border: "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 10, padding: "0 13px" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: platformDot(link), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, font: "500 13px 'DM Sans',sans-serif", color: "#0A0A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {link.replace(/^https?:\/\//, "")}
            </div>
            <a href={link} target="_blank" rel="noreferrer" style={{ flexShrink: 0, display: "flex" }}>
              <ExternalLink size={15} color="#7C3AED" />
            </a>
          </div>
        ))}
      </div>
      {isSuperseded ? (
        <div style={{ marginTop: 12, height: 40, borderRadius: 11, background: "#F2F2F7", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <RefreshCw size={13} color="#6B7280" />
          <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Superseded · resubmission was requested</span>
        </div>
      ) : isBrand ? (
        showConfirm ? (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "#ECFDF5", border: "1px solid #A7F3D0", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, font: "600 11px/1.4 'DM Sans',sans-serif", color: "#065F46" }}>
              ⚠️ Are you sure? Approving live links releases the escrow payout to the creator and cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: "0 12px", height: 34, borderRadius: 9, background: "#fff", border: "1px solid #D1D5DB", font: "600 12px 'DM Sans',sans-serif", color: "#4B5563", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  await handleApprove();
                  setShowConfirm(false);
                }}
                style={{ flex: 1, height: 34, borderRadius: 9, background: "#059669", border: "none", font: "600 12px 'DM Sans',sans-serif", color: "#fff", cursor: "pointer", opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Check size={13} color="#fff" strokeWidth={3} />
                <span>Confirm & Release</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              disabled={busy}
              onClick={() => setShowConfirm(true)}
              style={{ flex: 1, height: 40, borderRadius: 11, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: busy ? 0.6 : 1, cursor: "pointer" }}
            >
              <Check size={13} color="#fff" strokeWidth={3} />
              <span style={{ font: "600 12.5px 'DM Sans',sans-serif", color: "#fff" }}>Approve & release</span>
            </button>
            <button
              onClick={onOpenReject}
              style={{ height: 40, padding: "0 14px", borderRadius: 11, background: "#F2F2F7", border: "none", font: "600 12.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}
            >
              Reject
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
