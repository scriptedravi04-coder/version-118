import React, { useState } from "react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

const QUICK_TAGS = ["Add product close-up", "Fix caption", "Change hook"];

export default function MobileRequestChangesSheet({ onClose, onSubmit, title = "What should change?", subtitle = "Be specific — this counts as the revision included in your deal.", placeholder = "Please show the bottle label in the first 3 seconds.", submitLabel = "Send request" }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const addTag = (tag) => setText((prev) => (prev ? `${prev} ${tag}.` : `${tag}.`));

  const handleSend = async () => {
    setBusy(true);
    const ok = await onSubmit(text);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <MobileSheet onClose={onClose}>
      <SheetHeader title={title} onClose={onClose} />
      <div style={{ marginTop: 6, font: "400 13px/1.55 'DM Sans',sans-serif", color: "#6B7280" }}>
        {subtitle}
      </div>
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            style={{ height: 34, padding: "0 12px", borderRadius: 10, background: "#F9F9FB", border: "1px solid #E5E5EA", font: "500 12.5px 'DM Sans',sans-serif", color: "#6B7280", cursor: "pointer" }}
          >
            {tag}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{
          marginTop: 12, width: "100%", height: 96, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA",
          padding: "12px 14px", font: "400 14px/1.55 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 14, display: "flex", gap: 9 }}>
        <button onClick={onClose} style={{ height: 50, padding: "0 20px", borderRadius: 14, background: "#F2F2F7", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
          Cancel
        </button>
        <button
          disabled={busy || !text.trim()}
          onClick={handleSend}
          style={{ flex: 1, height: 50, borderRadius: 14, background: "#7C3AED", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#fff", opacity: busy || !text.trim() ? 0.6 : 1, cursor: "pointer" }}
        >
          {submitLabel}
        </button>
      </div>
    </MobileSheet>
  );
}
