import React, { useState } from "react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

export default function MobileLiveLinkSheet({ onClose, onSubmit }) {
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    setBusy(true);
    const ok = await onSubmit(link, notes);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <MobileSheet onClose={onClose}>
      <SheetHeader title="Add your live link" subtitle="Paste the link to your posted content." onClose={onClose} />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://instagram.com/reel/..."
        style={{
          marginTop: 14, width: "100%", height: 48, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA",
          padding: "0 14px", font: "400 14px 'DM Sans',sans-serif", color: "#0A0A0A", boxSizing: "border-box",
        }}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        style={{
          marginTop: 10, width: "100%", height: 70, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA",
          padding: "12px 14px", font: "400 14px/1.5 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 14, display: "flex", gap: 9 }}>
        <button onClick={onClose} style={{ height: 50, padding: "0 20px", borderRadius: 14, background: "#F2F2F7", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
          Cancel
        </button>
        <button
          disabled={busy || !link.trim()}
          onClick={handleSend}
          style={{ flex: 1, height: 50, borderRadius: 14, background: "#7C3AED", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#fff", opacity: busy || !link.trim() ? 0.6 : 1, cursor: "pointer" }}
        >
          Submit link
        </button>
      </div>
    </MobileSheet>
  );
}
