import React from "react";
import { Shield } from "lucide-react";

export default function MobileEscrowFundedCard({ message, amount, campaignTitle }) {
  const timeText = message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, padding: 15, boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={15} color="#059669" strokeWidth={1.9} />
          <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#059669" }}>Escrow funded</div>
        </div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>
      <div style={{ marginTop: 10, font: "700 28px/1 'DM Sans',sans-serif", letterSpacing: "-1.1px", color: "#0A0A0A" }}>
        ₹{Number(amount).toLocaleString("en-IN")}
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #ECECF0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Campaign</span>
          <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{campaignTitle}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Platform fee</span>
          <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#059669" }}>Free</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>Released when</span>
          <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>You approve delivery</span>
        </div>
      </div>
    </div>
  );
}
