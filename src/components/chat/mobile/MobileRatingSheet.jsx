import React, { useState } from "react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

const LABELS = ["", "Not great", "Could be better", "Good to work with", "Really good", "Great to work with"];

function Star({ filled, onClick }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill={filled ? "#7C3AED" : "#E5E5EA"} onClick={onClick} style={{ cursor: "pointer" }}>
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z" />
    </svg>
  );
}

export default function MobileRatingSheet({ onClose, onSubmit, partnerName }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    const ok = await onSubmit({ rating, comment });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <MobileSheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: "linear-gradient(135deg,#F3D9C7,#C89B7B)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <SheetHeader title={`Rate ${partnerName}`} subtitle="Private — never shown on their profile" onClose={onClose} />
        </div>
      </div>

      <div style={{ marginTop: 18, display: "flex", justifyContent: "center", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= rating} onClick={() => setRating(n)} />
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: "center", font: "500 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>
        {LABELS[rating]}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a note (optional)"
        style={{
          marginTop: 16, width: "100%", height: 70, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA",
          padding: "12px 14px", font: "400 14px/1.5 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box",
        }}
      />

      <div style={{ marginTop: 14, display: "flex", gap: 9 }}>
        <button onClick={onClose} style={{ height: 50, padding: "0 18px", borderRadius: 14, background: "#F2F2F7", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
          Later
        </button>
        <button
          disabled={busy}
          onClick={handleSubmit}
          style={{ flex: 1, height: 50, borderRadius: 14, background: "#7C3AED", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#fff", opacity: busy ? 0.6 : 1, cursor: "pointer" }}
        >
          Submit review
        </button>
      </div>
    </MobileSheet>
  );
}
