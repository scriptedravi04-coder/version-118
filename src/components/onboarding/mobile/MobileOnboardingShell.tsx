import React from "react";
import { ChevronLeft } from "lucide-react";

export default function MobileOnboardingHeader({
  onBack, saveLabel = "Save", onSave
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: 52, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {onBack ? (
          <button
            onClick={onBack}
            style={{ width: 34, height: 34, borderRadius: 11, background: "transparent", border: "1px solid #E5E5EA", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronLeft size={17} color="#0A0A0A" strokeWidth={2.2} />
          </button>
        ) : (
          <div style={{ width: 34 }} />
        )}
        <div style={{ flex: 1 }} />
        {onSave ? (
          <button onClick={onSave} style={{ background: "none", border: "none", font: "500 12.5px 'DM Sans',sans-serif", color: "#7C3AED", cursor: "pointer", padding: 0 }}>
            {saveLabel}
          </button>
        ) : (
          <div style={{ width: 34 }} />
        )}
      </div>
    </div>
  );
}

export function MobilePrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 52, borderRadius: 14, background: "#7C3AED", border: "none", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8, font: "600 15px 'DM Sans',sans-serif", color: "#fff", cursor: "pointer",
        opacity: disabled ? 0.5 : 1, width: "100%", ...style,
      }}
    >
      {children}
    </button>
  );
}

export function MobileChip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36, padding: "0 13px", borderRadius: 10, cursor: "pointer",
        background: selected ? "#F5F0FF" : "#fff",
        border: selected ? "1px solid #E2D6FF" : "1px solid #E5E5EA",
        font: selected ? "600 13px 'DM Sans',sans-serif" : "500 13px 'DM Sans',sans-serif",
        color: selected ? "#7C3AED" : "#6B7280",
      }}
    >
      {label}
    </button>
  );
}

export function MobileFieldLabel({ children, right }) {
  return (
    <div style={{ marginTop: 20, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ font: "600 10.5px 'DM Sans',sans-serif", letterSpacing: ".7px", textTransform: "uppercase", color: "#6B7280" }}>{children}</div>
      {right && <div style={{ font: "600 11.5px 'DM Sans',sans-serif", color: "#7C3AED" }}>{right}</div>}
    </div>
  );
}

export function MobileTextInput({ value, onChange, placeholder, prefix, type = "text", inputMode, maxLength, style }) {
  return (
    <div style={{ marginTop: 8, height: 48, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 8, padding: "0 14px", boxSizing: "border-box", width: "100%", maxWidth: "100%", minWidth: 0, ...style }}>
      {prefix && <span style={{ font: "500 14.5px 'DM Sans',sans-serif", color: "#6B7280", flexShrink: 0 }}>{prefix}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "500 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", minWidth: 0, width: "100%" }}
      />
    </div>
  );
}
