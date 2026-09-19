import React, { useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  CornerDownRight, 
  X, 
  Send, 
  Upload, 
  Lock, 
  Eye, 
  Play, 
  LifeBuoy, 
  RefreshCw, 
  ShieldAlert,
  Maximize2,
  FileVideo,
  Download,
  Clock
} from "lucide-react";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { isUgcThread, getUgcOrderId } from "../../utils/dealFlow";
import VideoEmbedPreview, { parseVideoLink, resolveMediaUrl } from "../shared/VideoEmbedPreview";
import UniversalPreviewModal from "../shared/UniversalPreviewModal";
import OrderSupportModal from "./OrderSupportModal";

export default function ContentProofNotice({ message, isUserBrand, threadId, thread, onActionComplete }) {
  const metadata = message.metadata || {};
  const rawContentUrl = 
    metadata.content_url || metadata.video_url || metadata.media_url || 
    metadata.videoUrl || message.content_url || message.media_url || 
    message.video_url || "";
  const contentUrl = resolveMediaUrl(rawContentUrl);
  const notes = metadata.notes || "";
  
  const [loading, setLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  
  const threadForDetection = thread || { id: threadId, deal_id: thread?.deal_id };
  const isUgc = isUgcThread(threadForDetection);
  const targetUgcOrderId = getUgcOrderId(threadForDetection);

  const deliverableType = (
    thread?.ugc_brief?.deliverable_type ||
    thread?.ugc_order?.deliverable_type ||
    thread?.deliverable_type ||
    thread?.format ||
    message?.metadata?.deliverable_type ||
    ''
  ).toLowerCase();

  const isCollab = thread?.requires_live_link !== undefined
    ? Boolean(thread.requires_live_link)
    : (thread?.is_collaboration !== undefined
      ? Boolean(thread.is_collaboration)
      : (!deliverableType.startsWith('ugc_video') && !deliverableType.includes('raw') && !deliverableType.includes('edited') && (deliverableType.includes('collab') || deliverableType.includes('reel') || !isUgc)));

  const isRawVideoUgc = Boolean(isUgc && !isCollab);

  const requiresLiveLink = Boolean(
    thread?.requires_live_link ?? isCollab
  );

  // Logic to determine if Brand can download.
  const dealStatusUpper = (thread?.status || '').toUpperCase();
  const dealFlowUpper = (thread?.flow_state || '').toUpperCase();
  const ugcOrderStatus = (thread?.ugc_order?.status || '').toUpperCase();
  const isFullyCompleted =
    dealStatusUpper === 'COMPLETED' ||
    dealFlowUpper === 'COMPLETED' ||
    dealStatusUpper === 'PAID' ||
    dealStatusUpper === 'RELEASED' ||
    ugcOrderStatus === 'COMPLETED' ||
    thread?.payment_status === 'RELEASED' ||
    thread?.ugc_order?.payment_status === 'RELEASED';

  const canDownload = !isUserBrand || isFullyCompleted;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Revisions & Decline states
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newContentUrl, setNewContentUrl] = useState("");
  const [newContentNotes, setNewContentNotes] = useState("");
  const [revisedFile, setRevisedFile] = useState(null);
  const revisedFileInputRef = useRef(null);

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (isRawVideoUgc) {
        const orderIdToCall = targetUgcOrderId || (threadId?.startsWith('ugcord_') ? threadId : null) || (threadId?.startsWith('thread_ugc_') ? threadId.replace('thread_ugc_', '') : threadId);
        if (targetUgcOrderId) {
          await api.post(`/ugc/orders/${orderIdToCall}/approve`);
        } else {
          await api.post(`/ugc/threads/${orderIdToCall}/approve`);
        }
        toast.success("Deliverable approved & escrow payout released! 🎉");
      } else {
        await api.post(`/campaign/threads/${threadId}/approve-content`);
        toast.success("Content draft approved! Creator notified to submit live links.");
      }
      if (onActionComplete) onActionComplete();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Failed to approve content");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      toast.error("Please provide changes feedback.");
      return;
    }
    setLoading(true);
    try {
      if (isUgc) {
        const orderIdToCall = targetUgcOrderId || threadId;
        await api.post(`/ugc/threads/${orderIdToCall}/reject-content`, { feedback });
      } else {
        await api.post(`/campaign/threads/${threadId}/reject-content`, { feedback });
      }
      toast.success("Changes requested successfully!");
      setShowFeedbackForm(false);
      setFeedback("");
      if (onActionComplete) onActionComplete();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Failed to request changes");
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRevisions = async () => {
    if (!declineReason.trim()) {
      toast.error("Please specify a reason for declining.");
      return;
    }
    setLoading(true);
    try {
      if (isUgc && targetUgcOrderId) {
        await api.post(`/ugc/orders/${targetUgcOrderId}/decline-revisions`, { feedback: declineReason });
      } else if (isUgc) {
        await api.post(`/ugc/threads/${threadId}/decline-revisions`, { feedback: declineReason });
      } else {
        await api.post(`/campaign/threads/${threadId}/decline-revisions`, { feedback: declineReason });
      }
      toast.success("Revisions declined successfully! Brand notified.");
      setShowDeclineForm(false);
      setDeclineReason("");
      if (onActionComplete) onActionComplete();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Failed to decline changes");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadRevised = async () => {
    if (loading) return;
    if (!newContentUrl.trim() && !revisedFile) {
      toast.error("Please select a video file or provide a video link.");
      return;
    }
    setLoading(true);
    try {
      const orderUgcId = targetUgcOrderId || (isUgc ? thread?.deal_id : null);

      let finalVideoUrl = newContentUrl.trim();

      if (revisedFile) {
        toast.loading("Requesting secure upload link...", { id: "ugc-revise-submit" });
        const fileExt = revisedFile.name.split('.').pop();
        const fileName = `${threadId || targetUgcOrderId}-${Date.now()}.${fileExt}`;
        const filePath = `ugc-videos/${fileName}`;

        const { data: signedData } = await api.post("/upload/signed-url", {
          bucket: "content-submissions",
          path: filePath,
          contentType: revisedFile.type
        });

        toast.loading("Uploading revised video...", { id: "ugc-revise-submit" });

        const { error: uploadError } = await supabase.storage
          .from("content-submissions")
          .uploadToSignedUrl(signedData.path, signedData.token, revisedFile);

        if (uploadError) {
          throw uploadError;
        }

        finalVideoUrl = filePath; // Save relative path so backend can sign it later
      }
      
      toast.loading("Saving submission...", { id: "ugc-revise-submit" });

      const submitPayload = {
        videoUrl: finalVideoUrl,
        video_url: finalVideoUrl,
        content_url: finalVideoUrl,
        notes: newContentNotes.trim(),
        creator_notes: newContentNotes.trim()
      };

      if (isUgc || targetUgcOrderId) {
        const orderIdToCall = targetUgcOrderId || threadId;
        await api.post(`/ugc/orders/${orderIdToCall}/submit`, submitPayload);
      } else {
        await api.post(`/campaign/threads/${threadId}/submit-content`, submitPayload);
      }
      
      toast.success("Revised content draft submitted successfully!", { id: "ugc-revise-submit" });
      setShowUploadForm(false);
      setNewContentUrl("");
      setNewContentNotes("");
      setRevisedFile(null);
      if (onActionComplete) onActionComplete();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || "Failed to submit revised content", { id: "ugc-revise-submit" });
    } finally {
      setLoading(false);
    }
  };

  const isRevisionRequestedMsg = message.message_type === 'CHANGES_REQUESTED' || message.message_type === 'revision_requested';
  const isRevisionDeclinedMsg = message.message_type === 'revision_declined';
  const isContentSubmittedMsg = message.message_type === 'content_proof_submitted';

  // Case 1: Revision Request
  if (isRevisionRequestedMsg || ((thread?.flow_state === 'REVISION_REQUESTED' || thread?.status === 'REVISION_REQUESTED' || thread?.flow_state === 'REVISION_REQ' || thread?.status === 'REVISION_REQ' || thread?.ugc_order?.status === 'REVISION_REQ') && !isRevisionDeclinedMsg && !isContentSubmittedMsg)) {
    const threadStatusUpper = (thread?.status || '').toUpperCase();
    const threadFlowUpper = (thread?.flow_state || '').toUpperCase();
    const ugcOrderUpper = (thread?.ugc_order?.status || '').toUpperCase();
    const isPermanentlyDone = ['COMPLETED', 'PAID', 'RELEASED'].includes(threadStatusUpper) || ['COMPLETED', 'PAID', 'RELEASED'].includes(threadFlowUpper);
    const isCurrentlyInRevision = !isPermanentlyDone && (
      ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes(threadFlowUpper) ||
      ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes(threadStatusUpper) ||
      ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes(ugcOrderUpper)
    );
    const isStateActive = isCurrentlyInRevision;
    const rawMsgText = message.content || message.text || "";
    let extractedNotes = null;
    if (typeof rawMsgText === "string") {
      if (rawMsgText.includes("revision: ")) {
        extractedNotes = rawMsgText.split("revision: ")[1];
      } else if (rawMsgText.includes("Notes: ")) {
        extractedNotes = rawMsgText.split("Notes: ")[1];
      }
    }
    const feedbackText = message.metadata?.feedback || message.metadata?.notes || extractedNotes || thread?.revision_notes || thread?.ugc_order?.revision_feedback || "Please review draft and submit again.";

    return (
      <div className="w-full max-w-[340px] sm:max-w-md md:max-w-lg p-3 md:p-5 rounded-2xl bg-[var(--bg-card)] border border-amber-500/30 shadow-md md:shadow-xl relative overflow-hidden flex flex-col gap-3 md:gap-4 text-left animate-in fade-in zoom-in-95 duration-200 my-2 md:my-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />

        <div className="flex justify-between items-start gap-2.5 md:gap-3">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertCircle size={16} className="md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-[var(--text-primary)]">Brand Needs Some Changes</h4>
              <span className="text-[9px] md:text-[10px] text-amber-500 uppercase tracking-wider font-extrabold">Revision Request</span>
            </div>
          </div>
          <span className="text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-medium">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>

        <div className="p-2.5 md:p-4 bg-[var(--bg-base)] border border-amber-500/20 rounded-lg md:rounded-xl">
          <span className="block text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5 md:mb-1">Requested Changes:</span>
          <p className="text-[11px] md:text-xs text-[var(--text-primary)] font-semibold leading-relaxed">
            {feedbackText}
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--border-default)]">
          {!isStateActive ? (
            <div className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
              <CheckCircle size={14} />
              <span>Resolved (New draft uploaded or approved)</span>
            </div>
          ) : isUserBrand ? (
            <div className="py-2.5 px-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={14} />
              <span>Waiting for Creator to upload revised content...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {!showDeclineForm && !showUploadForm && (
                <motion.div 
                  key="creator-options"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex gap-2.5 w-full"
                >
                  <button
                    type="button"
                    onClick={() => setShowDeclineForm(true)}
                    className="flex-1 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-strong)] border border-[var(--border-default)] text-rose-500 hover:text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Decline Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(true)}
                    className="flex-1 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    Upload Revised Draft
                  </button>
                </motion.div>
              )}

              {showDeclineForm && (
                <motion.div 
                  key="decline-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-3 p-3 bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Reason for Declining:</span>
                    <button 
                      type="button"
                      onClick={() => setShowDeclineForm(false)}
                      className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={14} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>

                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    placeholder="Provide a message explaining why you are declining..."
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none h-20"
                  />

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleDeclineRevisions}
                      disabled={loading || !declineReason.trim()}
                      className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Propose Decline
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDeclineForm(false)}
                      className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {showUploadForm && (
                <motion.div 
                  key="upload-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-3 p-3 bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Upload Revised Draft:</span>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowUploadForm(false);
                        setRevisedFile(null);
                      }}
                      className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={14} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>

                  {/* Direct Video File Upload Area */}
                  <div>
                    <label className="block text-[9px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Video File (MP4, MOV, WebM)</label>
                    <div
                      onClick={() => revisedFileInputRef.current?.click()}
                      className="border border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-base)] rounded-xl p-3 text-center cursor-pointer transition-all"
                    >
                      <input
                        ref={revisedFileInputRef}
                        type="file"
                        accept="video/mp4,video/mov,video/webm,video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 50 * 1024 * 1024) {
                            toast.error("Please upload the file using a drive link or compress it to under 50 MB.");
                            return;
                          }
                          setRevisedFile(file || null);
                        }}
                        className="hidden"
                      />
                      {revisedFile ? (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileVideo size={16} className="text-[var(--violet)] shrink-0" />
                            <span className="font-bold text-[var(--text-primary)] truncate">{revisedFile.name}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">({(revisedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRevisedFile(null); }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--violet)] py-1">
                          <Upload size={14} />
                          <span className="text-xs font-semibold">Click or drag revised video file here</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">OR Video / Drive Link</label>
                    <input 
                      type="text" 
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--violet)]"
                      value={newContentUrl}
                      onChange={e => setNewContentUrl(e.target.value)}
                      placeholder="e.g. Google Drive, YouTube Link"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Creator Notes (Optional)</label>
                    <textarea
                      value={newContentNotes}
                      onChange={e => setNewContentNotes(e.target.value)}
                      placeholder="Add notes explaining your updates..."
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-1 focus:ring-[var(--violet)] focus:outline-none resize-none h-14"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleUploadRevised}
                      disabled={loading || (!newContentUrl.trim() && !revisedFile)}
                      className="flex-1 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Submit Revised Draft
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowUploadForm(false);
                        setRevisedFile(null);
                      }}
                      className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Revisions Declined Request
  if (isRevisionDeclinedMsg || ((thread?.flow_state === 'REVISION_DECLINED' || thread?.status === 'REVISION_DECLINED') && !isRevisionRequestedMsg && !isContentSubmittedMsg)) {
    const threadStatusUpper = (thread?.status || '').toUpperCase();
    const threadFlowUpper = (thread?.flow_state || '').toUpperCase();
    const isPermanentlyDone = ['COMPLETED', 'PAID', 'RELEASED'].includes(threadStatusUpper) || ['COMPLETED', 'PAID', 'RELEASED'].includes(threadFlowUpper);
    const isCurrentlyDeclined = !isPermanentlyDone && (
      ['REVISION_DECLINED', 'DECLINED'].includes(threadFlowUpper) ||
      ['REVISION_DECLINED', 'DECLINED'].includes(threadStatusUpper)
    );
    const isStateActive = isCurrentlyDeclined;
    const declineRaw = message.content || message.text || "";
    let extractedDeclineReason = null;
    if (typeof declineRaw === "string" && declineRaw.includes("Reason: ")) {
      extractedDeclineReason = declineRaw.split("Reason: ")[1];
    }
    const declineText = message.metadata?.feedback || message.metadata?.notes || extractedDeclineReason || thread?.revision_notes || "Creator declined the changes requested.";
    const amountVal = thread?.amount_fixed || thread?.agreed_amount || thread?.deal_amount || 0;

    return (
      <div className="w-full max-w-[340px] sm:max-w-md md:max-w-lg p-3 md:p-5 rounded-2xl bg-[var(--bg-card)] border border-rose-500/30 shadow-md md:shadow-xl relative overflow-hidden flex flex-col gap-3 md:gap-4 text-left animate-in fade-in zoom-in-95 duration-200 my-2 md:my-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />

        <div className="flex justify-between items-start gap-2.5 md:gap-3">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <AlertCircle size={16} className="md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-[var(--text-primary)]">Revisions Declined</h4>
              <span className="text-[9px] md:text-[10px] text-rose-500 uppercase tracking-wider font-extrabold">Creator Declined Changes</span>
            </div>
          </div>
          <span className="text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-medium">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>

        <div className="p-2.5 md:p-4 bg-[var(--bg-base)] border border-rose-500/20 rounded-lg md:rounded-xl">
          <span className="block text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-0.5 md:mb-1">Decline Reason:</span>
          <p className="text-[11px] md:text-xs text-[var(--text-primary)] font-semibold leading-relaxed">
            {declineText}
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--border-default)]">
          {!isStateActive ? (
            <div className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
              <CheckCircle size={14} />
              <span>Resolved (Agreement reached or approved)</span>
            </div>
          ) : isUserBrand ? (
            <AnimatePresence mode="wait">
              {!showFeedbackForm && (
                <motion.div 
                  key="brand-options"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex flex-col gap-2.5 w-full"
                >
                  {/* Top Row: 2 Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    {/* Option 1: Contact Support (White background) */}
                    <button
                      type="button"
                      onClick={() => setIsSupportModalOpen(true)}
                      disabled={loading}
                      className="w-full py-2.5 px-3 bg-white dark:bg-[var(--bg-elevated)] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                      title="Connect with Ybex admin mediation to resolve order dispute"
                    >
                      <ShieldAlert size={14} className="text-slate-600 dark:text-slate-300 shrink-0" />
                      <span className="truncate">Contact Support</span>
                    </button>

                    {/* Option 2: Re-request Changes (Yellow background) */}
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(true)}
                      disabled={loading}
                      className="w-full py-2.5 px-3 bg-amber-100/90 hover:bg-amber-200/90 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                      title="Clarify instructions and send revision request again"
                    >
                      <RefreshCw size={14} className="text-amber-700 dark:text-amber-300 shrink-0" />
                      <span className="truncate">Re-request Changes</span>
                    </button>
                  </div>

                  {/* Option 3: Approve Deliverable (UGC) vs Approve Draft (Campaign) */}
                  {isUgc && showApproveConfirm ? (
                    <div className="space-y-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-xl text-left">
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold leading-normal">
                        ⚠️ Are you sure? Approving this deliverable releases the escrow payout of ₹{(amountVal || 5000).toLocaleString('en-IN')} to the creator. This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowApproveConfirm(false)}
                          className="py-2 px-3.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleApprove();
                            setShowApproveConfirm(false);
                          }}
                          disabled={loading}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          <span>Confirm & Release Payment</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isUgc) {
                          setShowApproveConfirm(true);
                        } else {
                          handleApprove();
                        }
                      }}
                      disabled={loading}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      title={isUgc ? "Accept deliverable & release payout" : "Accept deliverable draft"}
                    >
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={16} />}
                      <span className="truncate">
                        {isUgc ? `Approve Deliverable ${amountVal ? `(₹${Number(amountVal).toLocaleString('en-IN')})` : ''}` : "Approve Draft"}
                      </span>
                    </button>
                  )}
                </motion.div>
              )}

              {showFeedbackForm && (
                <motion.div 
                  key="feedback-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-3 p-3 bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Specify Changes Needed:</span>
                    <button 
                      onClick={() => setShowFeedbackForm(false)}
                      className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={14} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>

                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Provide details on why changes are needed..."
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-1 focus:ring-[var(--violet)] focus:outline-none resize-none h-20"
                  />

                  <div className="flex gap-2">
                    <button 
                      onClick={handleRequestChanges}
                      disabled={loading || !feedback.trim()}
                      className="flex-1 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Re-send Changes Request
                    </button>
                    <button 
                      onClick={() => setShowFeedbackForm(false)}
                      className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="py-2.5 px-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
              <span>Waiting for brand review or dispute resolution...</span>
            </div>
          )}
        </div>

        {/* Order-specific Support Modal */}
        <OrderSupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
          thread={thread}
          threadId={threadId}
          isUserBrand={isUserBrand}
          onTicketCreated={() => {
            if (onActionComplete) onActionComplete();
          }}
        />
      </div>
    );
  }

  // Case 3: Default Draft Review View
  const statusUpper = (thread?.status || '').toUpperCase();
  const flowUpper = (thread?.flow_state || '').toUpperCase();
  const ugcOrderState = (thread?.ugc_order?.status || '').toUpperCase();
  const ugcPaymentStatus = (thread?.ugc_order?.payment_status || thread?.payment_status || '').toUpperCase();
  const isApproved = [
    'APPROVED', 'COMPLETED', 'DELIVERED_APPROVED', 'CONTENT_APPROVED'
  ].includes(statusUpper) || 
  [
    'APPROVED', 'COMPLETED', 'CONTENT_APPROVED'
  ].includes(flowUpper) || 
  [
    'COMPLETED', 'APPROVED'
  ].includes(ugcOrderState) ||
  [
    'RELEASED', 'PAID'
  ].includes(ugcPaymentStatus) ||
  Boolean(thread?.content_approved) ||
  message?.metadata?.action === 'approved' ||
  message?.metadata?.status === 'COMPLETED' ||
  message?.message_type === 'content_approved';

  const isRevision = !isApproved && (
    ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes(flowUpper) ||
    ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes(statusUpper) ||
    ['REVISION_REQUESTED', 'REVISION_REQ', 'CHANGES_REQUESTED', 'NEEDS_REVISION', 'REVISION', 'UGC_ORDER_REVISION'].includes((thread?.ugc_order?.status || '').toUpperCase())
  );
  const isDeclined = !isApproved && (
    ['REVISION_DECLINED', 'DECLINED'].includes(flowUpper) ||
    ['REVISION_DECLINED', 'DECLINED'].includes(statusUpper)
  );
  const isPendingReview = !isApproved && !isRevision && !isDeclined;

  return (
    <div className={`w-full max-w-[340px] sm:max-w-md md:max-w-lg p-3 md:p-5 rounded-2xl bg-[var(--bg-card)] ${isPendingReview ? 'border-2 border-amber-500/30' : 'border border-[var(--border-default)]'} shadow-md md:shadow-xl relative overflow-hidden flex flex-col gap-3 md:gap-4 text-left my-2 md:my-4`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${isPendingReview ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600' : 'bg-gradient-to-r from-fuchsia-500 to-indigo-500'}`} />

      {/* Header Bar */}
      <div className="flex justify-between items-start gap-2.5 md:gap-3">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${
            isPendingReview 
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300' 
              : 'bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-500'
          }`}>
            {isPendingReview ? <Clock size={16} className="md:w-5 md:h-5 text-amber-700 dark:text-amber-400 animate-pulse" /> : <Video size={16} className="md:w-5 md:h-5" />}
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-bold text-[var(--text-primary)]">Content Video Proof Submitted</h4>
            <span className={`text-[9px] md:text-[10px] uppercase tracking-wider font-bold ${isPendingReview ? 'text-amber-800 dark:text-amber-300' : 'text-[var(--text-tertiary)] font-semibold'}`}>
              {isPendingReview ? 'Under Review' : 'Creator Deliverable'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {contentUrl && canDownload ? (
            <a
              href={contentUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold shadow-xs cursor-pointer"
              title="Download Master Deliverable"
            >
              <ExternalLink size={12} />
              <span>Download Video</span>
            </a>
          ) : (
            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-950 dark:text-amber-200 rounded-md text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-xs">
              <span>🔒 Protected Draft</span>
            </span>
          )}
          <span className="text-[9px] md:text-[10px] text-[var(--text-tertiary)] font-medium">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      </div>

      {/* Direct In-Chat Live Video Player */}
      <div className="w-full bg-[var(--bg-elevated)] rounded-xl md:rounded-2xl overflow-hidden border border-[var(--border-default)] shadow-xs relative flex flex-col items-center justify-center">
        {contentUrl ? (
          <div className="w-full relative group">
            <VideoEmbedPreview 
              url={contentUrl} 
              title="Deliverable Video Proof" 
              aspectRatio="aspect-video"
              className="w-full"
              isApproved={canDownload}
              watermark={!canDownload}
            />
            {/* Quick full-screen preview button overlay */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-xs opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-medium z-30 cursor-pointer"
              title="Expand Full Preview"
            >
              <Maximize2 size={12} />
              <span>Full View</span>
            </button>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <Video size={32} className="mb-2 opacity-40 text-indigo-400" />
            <p className="text-xs font-semibold">No video proof link available</p>
          </div>
        )}
      </div>

      {/* Creator Notes if provided */}
      {notes && (
        <div className="text-xs bg-[var(--bg-elevated)]/40 border border-[var(--border-default)]/70 rounded-xl p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Creator Notes:</span>
          <p className="text-[var(--text-secondary)] italic leading-relaxed">{notes}</p>
        </div>
      )}

      {/* Full Modal fallback if needed */}
      <UniversalPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        url={contentUrl}
        title={isRawVideoUgc ? "UGC Deliverable Live Preview" : "Deliverable Draft Live Preview"}
        notes={notes}
        creatorName={thread?.creator?.name || "Creator"}
        submittedAt={message.created_at}
        isBrand={isUserBrand}
        isApproved={canDownload}
        isRawVideoUgc={isRawVideoUgc}
        onApprove={handleApprove}
        onRequestChanges={() => {
          setIsPreviewOpen(false);
          setShowFeedbackForm(true);
        }}
      />

      {/* Action Footer Bar */}
      <div className="pt-2 border-t border-[var(--border-default)]">
        {isApproved ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 py-2.5 px-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span>Approved by Brand ✓</span>
              {canDownload ? (
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-300 ml-1 hidden sm:inline">(Clean Master Unlocked)</span>
              ) : isUserBrand ? (
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-300 ml-1">(Download unlocks after {requiresLiveLink ? "live link" : "deliverable"} is approved)</span>
              ) : null}
            </div>
            {contentUrl && canDownload && (
              <a
                href={contentUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Download size={13} />
                <span>Download Final Video</span>
              </a>
            )}
          </div>
        ) : isRevision ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between py-2 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={15} className="text-amber-500" /> Changes Requested by Brand
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-300">Revisions Active</span>
            </div>
          </div>
        ) : isDeclined ? (
          <div className="flex items-center justify-between py-2 px-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={15} className="text-rose-500" /> Revisions Declined
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-rose-700 dark:text-rose-300">Under Review</span>
          </div>
        ) : isUserBrand ? (
          /* Brand Review Options directly in the box */
          <AnimatePresence mode="wait">
            {isRawVideoUgc && showApproveConfirm ? (
              <motion.div
                key="confirm-approve-box"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-xl w-full text-left"
              >
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold leading-normal">
                  ⚠️ Are you sure? Approving this deliverable releases the escrow payout of ₹{(thread?.amount_fixed || thread?.agreed_amount || thread?.ugc_order?.creator_payout || 5000).toLocaleString('en-IN')} to the creator. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApproveConfirm(false)}
                    className="py-2 px-3.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleApprove();
                      setShowApproveConfirm(false);
                    }}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    <span>Confirm & Release Payment</span>
                  </button>
                </div>
              </motion.div>
            ) : !showFeedbackForm ? (
              <motion.div 
                key="buttons"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex gap-2.5 w-full"
              >
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-strong)] border border-[var(--border-default)] text-[var(--text-primary)] hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw size={13} className="text-amber-500" />
                  <span>Request Changes</span>
                </button>
                <button
                  onClick={() => {
                    if (isRawVideoUgc) {
                      setShowApproveConfirm(true);
                    } else {
                      handleApprove();
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>{isRawVideoUgc ? "Approve Deliverable" : "Approve Draft"}</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-2.5 p-3 bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <RefreshCw size={11} /> Specify Changes Needed:
                  </span>
                  <button 
                    onClick={() => setShowFeedbackForm(false)}
                    className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={14} className="text-[var(--text-secondary)]" />
                  </button>
                </div>

                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="e.g. Please adjust lighting in the opening scene and ensure brand logo is clear..."
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:ring-1 focus:ring-[var(--violet)] focus:outline-none resize-none h-20"
                />

                <div className="flex gap-2">
                  <button 
                    onClick={handleRequestChanges}
                    disabled={loading || !feedback.trim()}
                    className="flex-1 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send Changes Request
                  </button>
                  <button 
                    onClick={() => setShowFeedbackForm(false)}
                    className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-secondary)] text-xs font-bold rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Creator Waiting State */
          <div className="py-2.5 px-4 bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs font-bold rounded-xl flex items-center justify-between gap-2 w-full shadow-xs">
            <span className="flex items-center gap-2 font-black">
              <Clock className="animate-pulse text-amber-700 dark:text-amber-400 shrink-0" size={15} />
              <span>Waiting for Brand's Approval... ⌛</span>
            </span>
            <span className="text-[10px] text-amber-950 dark:text-amber-200 font-mono font-bold bg-amber-500/25 px-2 py-0.5 rounded-md border border-amber-500/40">Brand has 48 hours</span>
          </div>
        )}
      </div>
    </div>
  );
}
