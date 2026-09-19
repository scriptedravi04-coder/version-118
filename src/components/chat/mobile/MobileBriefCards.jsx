import React, { useState, useEffect } from "react";
import { Clock, Upload } from "lucide-react";

export function MobileBriefCard({ brief, timeText }) {
  const rows = [
    brief?.product_name && ["Product", brief.product_name],
    brief?.deadline_display && ["Deadline", brief.deadline_display],
    (brief?.dos || [])[0] && ["Do", brief.dos[0]],
    (brief?.donts || [])[0] && ["Don't", brief.donts[0]],
  ].filter(Boolean);

  return (
    <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ padding: "14px 15px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#7C3AED" }}>Brief</div>
        <div style={{ font: "400 10.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{timeText}</div>
      </div>
      <div style={{ padding: "8px 15px 15px" }}>
        <div style={{ font: "600 15px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{brief?.title || "UGC Deliverable"}</div>
        {rows.length > 0 && (
          <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 7 }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ font: "400 12.5px 'DM Sans',sans-serif", color: "#6B7280" }}>{label}</span>
                <span style={{ font: "500 12.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useCountdown(deadlineIso) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!deadlineIso) return;
    const tick = () => {
      const diff = new Date(deadlineIso).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Deadline passed");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      setLabel(days > 0 ? `${days} day${days === 1 ? "" : "s"} ${hrs} hrs left` : `${hrs} hrs left`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [deadlineIso]);
  return label;
}

export function MobileClaimedCard({ brief, deadlineIso, onOpenUpload }) {
  const countdown = useCountdown(deadlineIso);
  return (
    <div style={{ alignSelf: "stretch", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 24px -20px rgba(18,18,26,.4)" }}>
      <div style={{ padding: "14px 15px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "#D97706" }}>Your deadline</div>
      </div>
      <div style={{ padding: "9px 15px 15px" }}>
        <div style={{ font: "700 22px/1 'DM Sans',sans-serif", letterSpacing: "-.6px", color: "#0A0A0A", display: "flex", alignItems: "center", gap: 8 }}>
          {countdown ? (
            countdown
          ) : (
            <>
              <Clock size={17} color="#0A0A0A" /> No deadline set
            </>
          )}
        </div>
        <div style={{ marginTop: 8, font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>
          {brief?.title || "Upload your deliverable"}. Payment is already secured in escrow.
        </div>
        <button
          onClick={onOpenUpload}
          style={{ marginTop: 12, width: "100%", height: 44, borderRadius: 12, background: "#7C3AED", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
        >
          <Upload size={15} color="#fff" />
          <span style={{ font: "600 13.5px 'DM Sans',sans-serif", color: "#fff" }}>Upload deliverable</span>
        </button>
      </div>
    </div>
  );
}
