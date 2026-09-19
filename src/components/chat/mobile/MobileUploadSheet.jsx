import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import MobileSheet, { SheetHeader } from "./MobileSheet";

export default function MobileUploadSheet({ onClose, onSubmit, title = "Upload deliverable" }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f && f.size > 50 * 1024 * 1024) {
      return;
    }
    setFile(f || null);
  };

  const handleSend = async () => {
    if (!file) return;
    setBusy(true);
    const ok = await onSubmit(file, notes);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <MobileSheet onClose={onClose}>
      <SheetHeader title={title} subtitle="Video under 50 MB. Use a drive link for larger files via chat." onClose={onClose} />
      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: "none" }} />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginTop: 14, width: "100%", height: 96, borderRadius: 14, background: "#F9F9FB", border: "1.5px dashed #E5E5EA",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
        }}
      >
        <Upload size={20} color="#7C3AED" />
        <span style={{ font: "500 13px 'DM Sans',sans-serif", color: file ? "#0A0A0A" : "#6B7280" }}>
          {file ? file.name : "Tap to choose a video"}
        </span>
      </button>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        style={{
          marginTop: 10, width: "100%", height: 70, borderRadius: 14, background: "#F9F9FB", border: "1px solid #E5E5EA",
          padding: "12px 14px", font: "400 14px/1.5 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box",
        }}
      />
      <button
        disabled={busy || !file}
        onClick={handleSend}
        style={{ marginTop: 14, width: "100%", height: 50, borderRadius: 14, background: "#7C3AED", border: "none", font: "600 14.5px 'DM Sans',sans-serif", color: "#fff", opacity: busy || !file ? 0.6 : 1, cursor: "pointer" }}
      >
        {busy ? "Uploading…" : "Submit"}
      </button>
    </MobileSheet>
  );
}
