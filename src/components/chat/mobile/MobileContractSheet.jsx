import React, { useState, useEffect } from "react";
import { Lock, ShieldCheck, Check } from "lucide-react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

// Mobile equivalent of the desktop ContractModal.jsx — same terms, same two API calls
// (real OTP to the registered email, then POST /chat/v2/threads/:id/sign). Nothing about
// the desktop flow is changed; this just stops mobile users hitting a "use desktop" toast.

const label = { font: "600 11px 'DM Sans',sans-serif", letterSpacing: ".4px", color: "#6B7280", textTransform: "uppercase" };
const clause = { font: "400 12.5px/1.6 'DM Sans',sans-serif", color: "#4B5563", marginTop: 4 };
const clauseTitle = { font: "600 12px 'DM Sans',sans-serif", color: "#0A0A0A" };

export default function MobileContractSheet({
  thread,
  user,
  isBrand,
  amount = 0,
  campaignTitle = "Collaboration",
  onSendOtp,
  onSign,
  onClose,
}) {
  const registeredEmail = user?.email || "";
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [readTerms, setReadTerms] = useState(false);

  useEffect(() => {
    setCode("");
    setOtpSent(false);
  }, [thread?.id]);

  const partnerName = isBrand
    ? thread?.creator?.name || thread?.creator?.full_name || "the Creator"
    : thread?.brand?.company_name || thread?.brand?.name || "the Brand";

  const deliverables =
    (Array.isArray(thread?.deliverables) && thread.deliverables.length ? thread.deliverables : null) ||
    (Array.isArray(thread?.ugc_order?.deliverables) && thread.ugc_order.deliverables.length ? thread.ugc_order.deliverables : null);

  const revisions = thread?.revision_count || thread?.ugc_order?.revision_count || 1;
  const deadline = thread?.deadline || thread?.ugc_order?.internal_deadline;
  const deadlineText = deadline
    ? new Date(deadline).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })
    : "As agreed in chat";

  const handleSendOtp = async () => {
    setSending(true);
    const ok = await onSendOtp(registeredEmail);
    setSending(false);
    if (ok) setOtpSent(true);
  };

  const handleSign = async () => {
    setSigning(true);
    const ok = await onSign({ email: registeredEmail, code });
    setSigning(false);
    if (ok) onClose();
  };

  const canSign = otpSent && readTerms && code.trim().length === 6 && !signing;

  return (
    <MobileSheet onClose={onClose}>
      <SheetHeader
        title="Partnership contract"
        subtitle={`Between you and ${partnerName}.`}
        onClose={onClose}
      />

      {/* Deal summary */}
      <div style={{ marginTop: 14, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA", padding: 14 }}>
        <div style={label}>Agreed amount</div>
        <div style={{ font: "700 24px 'DM Sans',sans-serif", letterSpacing: "-.5px", color: "#0A0A0A", marginTop: 2 }}>
          ₹{Number(amount || 0).toLocaleString("en-IN")}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={label}>Campaign</div>
            <div style={{ font: "500 13px 'DM Sans',sans-serif", color: "#0A0A0A", marginTop: 2 }}>{campaignTitle}</div>
          </div>
          <div>
            <div style={label}>Delivery by</div>
            <div style={{ font: "500 13px 'DM Sans',sans-serif", color: "#0A0A0A", marginTop: 2 }}>{deadlineText}</div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={clauseTitle}>1. Scope of work</div>
          {deliverables ? (
            <ul style={{ ...clause, paddingLeft: 18, margin: "4px 0 0" }}>
              {deliverables.map((d, i) => (
                <li key={i}>{typeof d === "string" ? d : d?.title || d?.type || "Campaign deliverable"}</li>
              ))}
            </ul>
          ) : (
            <div style={clause}>
              The Creator will produce and publish the campaign deliverables agreed in this chat.
            </div>
          )}
        </div>

        <div>
          <div style={clauseTitle}>2. Payment & escrow</div>
          <div style={clause}>
            The full amount is held in Ybex Escrow and released to the Creator once the Brand approves the
            delivered content. Payments arranged outside Ybex are not protected.
          </div>
        </div>

        <div>
          <div style={clauseTitle}>3. Timeline & revisions</div>
          <div style={clause}>
            Drafts are due by {deadlineText}. The Brand may request up to {revisions} revision
            {revisions === 1 ? "" : "s"}.
          </div>
        </div>

        <div>
          <div style={clauseTitle}>4. Content licence</div>
          <div style={clause}>
            On payment release, the Brand receives a 12-month licence to repost and boost the campaign
            deliverables on its own channels.
          </div>
        </div>
      </div>

      <button
        onClick={() => setReadTerms((v) => !v)}
        style={{
          marginTop: 14, width: "100%", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
          background: "none", border: "none", padding: 0, cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
            border: readTerms ? "none" : "1.5px solid #D1D5DB",
            background: readTerms ? "#7C3AED" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {readTerms && <Check size={13} color="#fff" strokeWidth={3} />}
        </span>
        <span style={{ font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#4B5563" }}>
          I have read these terms and I am authorised to sign on behalf of my side.
        </span>
      </button>

      {/* OTP */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ECECF0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={13} color="#7C3AED" />
          <span style={{ font: "600 12px 'DM Sans',sans-serif", color: "#0A0A0A" }}>Verify to sign</span>
        </div>

        {registeredEmail ? (
          <div style={{ marginTop: 8, font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>
            We'll email a 6-digit code to <strong style={{ color: "#0A0A0A" }}>{registeredEmail}</strong>.
          </div>
        ) : (
          <div style={{ marginTop: 8, font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#B45309" }}>
            No email is linked to this account, so a verification code can't be sent. Add one in Settings first.
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 9 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="••••••"
            disabled={!otpSent}
            style={{
              flex: 1, height: 48, borderRadius: 14, background: otpSent ? "#F9F9FB" : "#F2F2F7",
              border: "1px solid #E5E5EA", padding: "0 14px", boxSizing: "border-box",
              font: "600 17px 'DM Sans',sans-serif", letterSpacing: ".3em", textAlign: "center",
              color: "#0A0A0A", opacity: otpSent ? 1 : 0.5,
            }}
          />
          <button
            onClick={handleSendOtp}
            disabled={sending || !registeredEmail}
            style={{
              height: 48, padding: "0 16px", borderRadius: 14, background: "#F2F2F7", border: "1px solid #E5E5EA",
              font: "600 13px 'DM Sans',sans-serif", color: "#0A0A0A", flexShrink: 0,
              opacity: sending || !registeredEmail ? 0.5 : 1, cursor: "pointer",
            }}
          >
            {sending ? "Sending…" : otpSent ? "Resend" : "Send code"}
          </button>
        </div>

        <div style={{ marginTop: 9, display: "flex", alignItems: "flex-start", gap: 6 }}>
          <ShieldCheck size={13} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ font: "400 11px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>
            Under the Information Technology Act, 2000, signing with a verified OTP is a binding e-signature.
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 9 }}>
        <button
          onClick={onClose}
          style={{
            height: 50, padding: "0 20px", borderRadius: 14, background: "#F2F2F7", border: "none",
            font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSign}
          disabled={!canSign}
          style={{
            flex: 1, height: 50, borderRadius: 14, background: "#7C3AED", border: "none",
            font: "600 14.5px 'DM Sans',sans-serif", color: "#fff",
            opacity: canSign ? 1 : 0.5, cursor: canSign ? "pointer" : "default",
          }}
        >
          {signing ? "Signing…" : "Sign contract"}
        </button>
      </div>
    </MobileSheet>
  );
}
