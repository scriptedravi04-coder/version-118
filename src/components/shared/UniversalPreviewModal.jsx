import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Video, Play, Download, CheckCircle, AlertCircle, Copy, Check, Lock, ShieldCheck } from "lucide-react";
import VideoEmbedPreview, { parseVideoLink, resolveMediaUrl, YbexWatermarkOverlay } from "./VideoEmbedPreview";
import { toast } from "sonner";

export default function UniversalPreviewModal({
  isOpen,
  onClose,
  url,
  title = "Deliverable Media Preview",
  notes = "",
  creatorName = "",
  submittedAt = "",
  onApprove,
  onRequestChanges,
  isBrand = false,
  isApproved = false,
  approveLoading = false,
  isUgc = false,
  isRawVideoUgc = false
}) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isFinalPayoutDeliverable = isRawVideoUgc;

  if (!isOpen) return null;

  const rawUrl = (url || "").trim();
  const cleanUrl = resolveMediaUrl(rawUrl);
  const videoInfo = parseVideoLink(cleanUrl);
  const isImage = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith("data:image/");

  // Only allow direct downloading if the content has been formally approved by the brand
  const canDownload = Boolean(isApproved);

  const handleCopy = () => {
    if (!cleanUrl) return;
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    toast.success("Media link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[var(--violet-soft)] border border-[var(--violet-border)] text-[var(--violet)] flex items-center justify-center shrink-0">
                <Video size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{title}</h3>
                <p className="text-xs text-[var(--text-tertiary)] truncate">
                  {creatorName ? `Submitted by @${creatorName}` : "Universal Live Content Preview"}
                  {submittedAt ? ` • ${new Date(submittedAt).toLocaleString()}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cleanUrl && canDownload ? (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-default)] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Copy Link"
                  >
                    {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
                  </button>
                  <a
                    href={cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
                    title="Download Master Video"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                  <Lock size={13} />
                  <span>Protected Preview</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-rose-500/10 hover:text-rose-500 text-[var(--text-secondary)] rounded-xl transition-all cursor-pointer ml-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Media Player Area */}
          <div 
            onContextMenu={(e) => e.preventDefault()}
            className="flex-1 bg-[var(--bg-elevated)] p-3 sm:p-6 flex flex-col items-center justify-center overflow-hidden min-h-[320px] max-h-[62vh] relative select-none border-y border-[var(--border-default)]"
          >
            {isImage ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] select-none shadow-sm">
                <img
                  src={cleanUrl}
                  alt="Draft Content Preview"
                  className="max-h-[55vh] w-auto object-contain rounded-2xl pointer-events-none"
                />
                {!isApproved && <YbexWatermarkOverlay />}
              </div>
            ) : cleanUrl ? (
              <div className="w-full h-full flex items-center justify-center">
                <VideoEmbedPreview 
                  url={cleanUrl} 
                  title={title} 
                  className="max-h-[56vh]"
                  isApproved={isApproved}
                  watermark={!isApproved}
                />
              </div>
            ) : (
              <div className="text-center text-[var(--text-tertiary)] py-12">
                <Video size={48} className="mx-auto mb-3 opacity-40 text-[var(--violet)]" />
                <p className="text-sm font-semibold">No media preview link provided</p>
              </div>
            )}
          </div>

          {/* Notes & Actions Footer */}
          <div className="p-5 border-t border-[var(--border-default)] bg-[var(--bg-card)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 min-w-0 text-left">
              {notes ? (
                <div className="bg-[var(--bg-elevated)]/60 border border-[var(--border-default)] rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-0.5">Creator Notes:</span>
                  <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed line-clamp-2">{notes}</p>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {!isApproved 
                      ? "Subtle Ybex watermark applied to protect creator's draft. Master unwatermarked video downloads unlock upon approval." 
                      : "Approved asset. Clean master video available for high-resolution download."}
                  </span>
                </p>
              )}
            </div>

            {isBrand && (onApprove || onRequestChanges) && (
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                {onRequestChanges && (
                  <button
                    onClick={() => {
                      onClose();
                      onRequestChanges();
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold rounded-2xl text-xs border border-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle size={15} /> Request Changes
                  </button>
                )}
                {onApprove && (
                  isFinalPayoutDeliverable ? (
                    showConfirm ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-1.5 rounded-2xl">
                        <span className="text-xs font-bold text-emerald-400 px-2">Release payout?</span>
                        <button
                          type="button"
                          onClick={() => setShowConfirm(false)}
                          className="px-3 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onApprove();
                            setShowConfirm(false);
                            onClose();
                          }}
                          disabled={approveLoading}
                          className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {approveLoading ? "Releasing..." : "Confirm & Release"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={approveLoading}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle size={15} /> {approveLoading ? "Approving..." : "Approve Deliverable & Release Payment"}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={async () => {
                        await onApprove();
                        onClose();
                      }}
                      disabled={approveLoading}
                      className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle size={15} /> {approveLoading ? "Approving..." : "Approve Draft"}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
