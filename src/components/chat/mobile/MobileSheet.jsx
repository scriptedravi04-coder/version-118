import React from "react";
import { X } from "lucide-react";

export default function MobileSheet({ onClose, children }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(18,18,26,.4)" }} onClick={onClose} />
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: "22px 22px 0 0",
          padding: "10px 20px 22px",
          boxShadow: "0 -18px 44px -26px rgba(18,18,26,.4)",
          maxHeight: "88%",
          overflowY: "auto",
        }}
      >
        <div style={{ height: 5, width: 44, borderRadius: 3, background: "#E5E5EA", margin: "0 auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ title, subtitle, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ font: "600 17px 'DM Sans',sans-serif", letterSpacing: "-.3px", color: "#0A0A0A" }}>{title}</div>
        {subtitle && <div style={{ marginTop: 4, font: "400 13px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>{subtitle}</div>}
      </div>
      <button
        onClick={onClose}
        style={{ width: 28, height: 28, borderRadius: 14, background: "#F2F2F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
      >
        <X size={12} color="#6B7280" strokeWidth={2.6} />
      </button>
    </div>
  );
}
