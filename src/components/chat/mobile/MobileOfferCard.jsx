import React, { useState } from "react";
import { Check } from "lucide-react";

export default function MobileOfferCard({ message, isMine, isBrand, onAccept, onCounter }) {
  const offer = message.metadata || {};
  const amount = offer.amount || offer.proposed_amount || 0;
  const isCounter = message.message_type === "negotiation_offer" || offer.is_counter;
  const status = (offer.status || "").toUpperCase();
  const isResolved = ["ACCEPTED", "SIGNED", "REJECTED", "COUNTERED"].includes(status);
  const timeText = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterVal, setCounterVal] = useState("");
  const [busy, setBusy] = useState(false);

  const canRespond = !isMine && !isResolved && onAccept && onCounter;

  const handleAccept = async () => {
    setBusy(true);
    await onAccept();
    setBusy(false);
  };
  const handleSendCounter = async () => {
    setBusy(true);
    await onCounter(counterVal);
    setBusy(false);
    setShowCounterInput(false);
    setCounterVal("");
  };

  return (
    <div
      style={{
        alignSelf: isMine ? "flex-end" : "flex-start",
        width: 294,
        maxWidth: "80%",
        background: "#fff",
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            font: "600 10px 'DM Sans',sans-serif",
            letterSpacing: ".8px",
            textTransform: "uppercase",
            color: isCounter ? "#7C3AED" : "#6B7280",
          }}
        >
          {isCounter ? `Counter from ${isBrand ? "creator" : "brand"}` : isMine ? "Your offer" : "Offer"}
        </div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>

      <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 9 }}>
        <div style={{ font: "700 26px/1 'DM Sans',sans-serif", letterSpacing: "-1px", color: "#0A0A0A" }}>
          ₹{Number(amount).toLocaleString("en-IN")}
        </div>
      </div>

      {(offer.deliverable || offer.revisions) && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          {offer.deliverable && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Deliverable</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{offer.deliverable}</span>
            </div>
          )}
          {offer.revisions != null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Revisions</span>
              <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{offer.revisions} included</span>
            </div>
          )}
        </div>
      )}

      {offer.note && (
        <div style={{ marginTop: 10, font: "400 13px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>
          "{offer.note}"
        </div>
      )}

      {isResolved ? (
        <div
          style={{
            marginTop: 12,
            height: 30,
            borderRadius: 9,
            background: "#F2F2F7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}
        >
          <Check size={12} strokeWidth={3} color="#6B7280" />
          <span style={{ font: "500 11.5px 'DM Sans',sans-serif", color: "#6B7280" }}>
            {isMine ? "Signed by you" : `Signed by ${isBrand ? "creator" : "brand"}`}
          </span>
        </div>
      ) : canRespond ? (
        showCounterInput ? (
          <div style={{ marginTop: 13, display: "flex", gap: 8 }}>
            <input
              inputMode="numeric"
              autoFocus
              value={counterVal}
              onChange={(e) => setCounterVal(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Amount"
              style={{
                flex: 1,
                height: 40,
                borderRadius: 11,
                background: "#F2F2F7",
                border: "1px solid #E0E0E6",
                padding: "0 12px",
                font: "500 13.5px 'DM Sans',sans-serif",
                color: "#0A0A0A",
              }}
            />
            <button
              disabled={busy}
              onClick={handleSendCounter}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 11,
                background: "#7C3AED",
                color: "#fff",
                font: "600 13.5px 'DM Sans',sans-serif",
                border: "none",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 13, display: "flex", gap: 8 }}>
            <button
              disabled={busy}
              onClick={handleAccept}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 11,
                background: "#7C3AED",
                color: "#fff",
                font: "600 13.5px 'DM Sans',sans-serif",
                border: "none",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Accept ₹{Number(amount).toLocaleString("en-IN")}
            </button>
            <button
              disabled={busy}
              onClick={() => setShowCounterInput(true)}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 11,
                background: "#F2F2F7",
                color: "#0A0A0A",
                font: "600 13.5px 'DM Sans',sans-serif",
                border: "none",
              }}
            >
              Counter
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
