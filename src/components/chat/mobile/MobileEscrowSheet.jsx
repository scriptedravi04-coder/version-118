import React from "react";
import { Shield, Check } from "lucide-react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

export default function MobileEscrowSheet({ onClose, amount }) {
  return (
    <MobileSheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Shield size={19} color="#059669" strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <SheetHeader title="Secure escrow" subtitle="Funds stay protected until delivery is approved." onClose={onClose} />
        </div>
      </div>

      <div style={{ marginTop: 16, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA", padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ font: "400 13px 'DM Sans',sans-serif", color: "#6B7280" }}>Deal amount</span>
          <span style={{ font: "600 13px 'DM Sans',sans-serif", color: "#0A0A0A" }}>₹{Number(amount).toLocaleString("en-IN")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ font: "400 13px 'DM Sans',sans-serif", color: "#6B7280" }}>Platform fee</span>
          <span style={{ font: "600 13px 'DM Sans',sans-serif", color: "#059669" }}>Free</span>
        </div>
        <div style={{ paddingTop: 11, borderTop: "1px solid #ECECF0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ font: "500 13px 'DM Sans',sans-serif", color: "#0A0A0A" }}>Total</span>
          <span style={{ font: "700 18px 'DM Sans',sans-serif", letterSpacing: "-.4px", color: "#0A0A0A" }}>₹{Number(amount).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 11, padding: "13px 14px", borderRadius: 14, background: "#ECFDF5" }}>
        <Check size={17} color="#059669" strokeWidth={2.3} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ font: "600 13px 'DM Sans',sans-serif", color: "#059669" }}>Payment secured</div>
          <div style={{ marginTop: 4, font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#047857" }}>
            ₹{Number(amount).toLocaleString("en-IN")} is held in escrow.
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{ marginTop: 16, width: "100%", height: 52, borderRadius: 14, background: "#7C3AED", border: "none", font: "600 15px 'DM Sans',sans-serif", color: "#fff", cursor: "pointer" }}
      >
        Back to chat
      </button>
    </MobileSheet>
  );
}
