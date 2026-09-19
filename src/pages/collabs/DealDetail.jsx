import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useLoading } from "../../contexts/LoadingContext";
import { toast } from "sonner";
import PayNow from "../../components/payments/PayNow";
import FeeBreakup from "../../components/payments/FeeBreakup";
import PromoCodeInput from "../../components/payments/PromoCodeInput";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle, 
  Send, ShieldAlert, Check, HelpCircle, ArrowRight, MessageSquare, 
  Bookmark, Video, Clipboard
} from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();

  const [deal, setDeal] = useState(null);
  const [signatureText, setSignatureText] = useState("");
  const [signing, setSigning] = useState(false);

  // Draft Submission state
  const [draftVideo, setDraftVideo] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [submittingDraft, setSubmittingDraft] = useState(false);

  // Revision state
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const loadDeal = () => {
    startLoading();
    api.get(`/deals/${id}`)
      .then(({ data }) => {
        setDeal(data);
        stopLoading();
      })
      .catch((err) => {
        console.error(err);
        toast.error("Collab details not found or unauthorized");
        stopLoading();
      });
  };

  useEffect(() => {
    loadDeal();
  }, [id]);

  const handleSign = async () => {
    if (!signatureText.trim()) {
      toast.error("Please type your authorized full name as electronic signature");
      return;
    }
    setSigning(true);
    try {
      await api.post(`/deals/${id}/sign`);
      toast.success("Electronic signature securely stamped!");
      setSignatureText("");
      loadDeal();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to apply signature contract");
    } finally {
      setSigning(false);
    }
  };

  const handleSubmitDraft = async (e) => {
    e.preventDefault();
    if (!draftVideo.trim()) {
      toast.error("Please include a draft video URL or drive content link");
      return;
    }
    setSubmittingDraft(true);
    try {
      await api.post(`/deals/${id}/submit-draft`, {
        video_url: draftVideo,
        caption: draftCaption,
        notes: draftNotes
      });
      toast.success("Draft submitted to Brand Review Panel!");
      setDraftVideo("");
      setDraftCaption("");
      setDraftNotes("");
      loadDeal();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to submit content draft");
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleApproveDraft = async () => {
    setApproving(true);
    try {
      await api.post(`/content-submissions/${id}/approve`);
      toast.success("Draft content approved! Notification sent to creator to go live.");
      loadDeal();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Critical: Review system error");
    } finally {
      setApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!revisionFeedback.trim()) {
      toast.error("Please type the feedback details for creator revision");
      return;
    }
    setRejecting(true);
    try {
      await api.post(`/content-submissions/${id}/request-changes`, { feedback: revisionFeedback });
      toast.success("Revision task dispatched to creator panel.");
      setRevisionFeedback("");
      loadDeal();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to request changes");
    } finally {
      setRejecting(false);
    }
  };

  if (!deal) {
    return (
      <div className="w-full max-w-none px-6 py-16 text-center text-[var(--text-secondary)] bg-[var(--bg-base)]">
        Negotiation / Contract details loading...
      </div>
    );
  }

  const isCreator = user?.role === "creator";
  const isBrand = user?.role === "brand";

  // Stepper representation
  // Stages: SIGNING, ACTIVE, CONTENT_SUBMITTED, CONTENT_APPROVED, PROOF_SUBMITTED, COMPLETED
  const getStageIndex = (stage) => {
    const s = stage?.toUpperCase() || "SIGNING";
    if (s === "SIGNING" || !deal.agreement_signed_creator || !deal.agreement_signed_brand) return 0;
    if (s === "ACTIVE" || s === "NEGOTIATING") return 1;
    if (s === "CONTENT_SUBMITTED") return 2;
    if (s === "CONTENT_APPROVED") return 3;
    if (s === "PROOF_SUBMITTED") return 4;
    if (s === "COMPLETED") return 5;
    return 1;
  };

  const currentStageIdx = getStageIndex(deal.stage);
  const stagesList = ["Agreement Signing", "Active Workspace", "Draft Review", "Pre-Release Approval", "Proof Verification", "Payment Executed"];

  return (
    <div className="w-full max-w-none px-4 sm:px-6 md:px-12 py-8 bg-[var(--bg-base)] text-[var(--text-primary)] select-none">
      
      {/* Upper Navigation Row */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <Link to="/collabs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--violet)] flex items-center gap-1.5 font-medium transition-colors">
          <ArrowLeft size={14} /> Back to My Collabs
        </Link>
        <Link to="/chat" className="text-xs bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] px-4 py-2 rounded-xl text-[var(--text-primary)]/85 flex items-center gap-1.5 font-bold transition-all">
          <MessageSquare size={13} className="text-[var(--violet)]" /> Open Chat Workspace
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Workspace Title Card Header */}
        <div className="bg-[var(--bg-card)]/50 border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--violet)] bg-[var(--violet-soft)] border border-[var(--violet-border)] px-2.5 py-1 rounded inline-block mb-3">
              CONTRACT SECURED
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[var(--text-primary)] leading-tight">
              {deal.deliverable || "Campaign Deliverables"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              Creator ID: <span className="text-[var(--violet)] font-semibold">{deal.to_user_id}</span> | Contract: <span className="font-semibold text-[var(--text-primary)]/85">{deal.collab_id}</span>
            </p>
          </div>
          <div className="text-left md:text-right bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)] shrink-0">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Escrow Protected Payout</span>
            <span className="text-2xl font-black font-display text-[var(--text-primary)] mt-1 block">
              ₹{(deal.proposed_amount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Promo Code & Fee Calculation Breakdown */}
        <div className="bg-[var(--bg-card)]/30 border border-[var(--border-default)] rounded-3xl p-6 space-y-4">
          <PromoCodeInput
            amount={deal.proposed_amount || 0}
            role={user?.role || 'creator'}
            onCouponApplied={(coupon) => setAppliedCoupon(coupon)}
            onCouponRemoved={() => setAppliedCoupon(null)}
          />
          <FeeBreakup
            grossAmount={deal.proposed_amount || 0}
            appliedCoupon={appliedCoupon}
            role={user?.role || 'creator'}
          />
        </div>

        {/* linear Stepper progress tracker widget */}
        <div className="bg-[var(--bg-card)]/20 border border-[var(--border-default)] rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <span className="text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-wider">Campaign Deliverable Timeline Milestones</span>
            <span className="text-xs font-medium text-[var(--violet)]">{deal.stage || "SIGNING"}</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
            {stagesList?.map((stepName, idx) => {
              const done = idx < currentStageIdx;
              const active = idx === currentStageIdx;
              return (
                <div key={idx} className="relative group text-left">
                  <div className={`h-1 rounded-full ${done ? "bg-emerald-400" : active ? "bg-[var(--violet)]" : "bg-[var(--bg-elevated)]"}`} />
                  <span className={`block text-[10px] mt-2 font-bold leading-tight ${done ? "text-emerald-600" : active ? "text-[var(--violet)]" : "text-[var(--text-tertiary)]"}`}>
                    {idx + 1}. {stepName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- STEP 0: CONTRACT AGREEMENT ELECTRONIC SIGNING --- */}
        {(!deal.agreement_signed_creator || !deal.agreement_signed_brand) && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-3xl p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Pending Counterparty Contract Electronic Signature</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1 font-normal">
                  Both matching partners must electronic stamp compliance standards below. Funds are safely held in Ybex Escrow.
                </p>
              </div>
            </div>

            <div className="bg-[var(--bg-card)]/80 p-4 rounded-xl text-[11px] text-[var(--text-secondary)] max-h-40 overflow-y-auto scroll-thin leading-relaxed space-y-2 border border-[var(--border-default)]">
              <p><strong>1. Deliverable Verification:</strong> The Creator commits to supply {deal.deliverable || "agreed platform videos"} conforming to brand brief guidelines.</p>
              <p><strong>2. Payout Disbursals:</strong> Secured funds of ₹{(deal.proposed_amount || 0).toLocaleString("en-IN")} will transition directly into settlement account upon brand acceptance of proof stats.</p>
              <p><strong>3. Exclusivity Guidelines:</strong> Creator agrees to refrain from active rival business mentions for 7 clear delivery days following publication launch.</p>
            </div>

            <div className="pt-2 flex items-center gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)] font-bold">
                {deal.agreement_signed_brand ? <Check className="text-emerald-600" size={13} /> : <Clock className="text-amber-400" size={13} />}
                <span>Brand signature status: {deal.agreement_signed_brand ? "STAMPED" : "PENDING"}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)] font-bold">
                {deal.agreement_signed_creator ? <Check className="text-emerald-600" size={13} /> : <Clock className="text-amber-400" size={13} />}
                <span>Creator signature status: {deal.agreement_signed_creator ? "STAMPED" : "PENDING"}</span>
              </div>
            </div>

            {/* Electronic signature typing box */}
            {((isCreator && !deal.agreement_signed_creator) || (isBrand && !deal.agreement_signed_brand)) && (
              <div className="pt-2 flex gap-3 max-w-md">
                <input 
                  type="text" 
                  value={signatureText} 
                  onChange={(e) => setSignatureText(e.target.value)} 
                  className="flex-grow bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] text-xs font-bold leading-normal" 
                  placeholder="Type Full Legal Name"
                />
                <button 
                  onClick={handleSign} 
                  disabled={signing}
                  className="bg-[var(--violet)] hover:bg-[#6D3FFF] px-6 py-2.5 rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all shadow-md shrink-0 cursor-pointer"
                >
                  {signing ? "Processing..." : "Sign Agreement"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 0.5: ESCROW FUNDING (Brand Payment) --- */}
        {isBrand && deal.agreement_signed_creator && deal.agreement_signed_brand && deal.status !== 'FUNDED' && deal.status !== 'IN_PROGRESS' && deal.status !== 'COMPLETED' && (
          <div className="my-6">
            <PayNow dealId={deal.id} creatorId={deal.creator_id} grossAmount={deal.proposed_amount || 0} />
          </div>
        )}

        {/* --- STEP 1: ACTIVE STAGE SUBMIT DRAFT (Creator) or WAITING SUBMISSION (Brand) --- */}
        {deal.agreement_signed_creator && deal.agreement_signed_brand && (deal.stage?.toUpperCase() === "ACTIVE" || deal.stage?.toUpperCase() === "NEGOTIATING") && (
          <div className="bg-[var(--bg-card)]/30 border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 text-left space-y-4">
            <h3 className="text-lg font-display font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Video size={18} className="text-[var(--violet)]" /> Creative Assets draft submissions
            </h3>
            
            {isCreator ? (
              <form onSubmit={handleSubmitDraft} className="space-y-4 max-w-2xl">
                <p className="text-xs text-[var(--text-secondary)]">Upload video preview drafts (YouTube live previews, Loom links, Drive, or Dropbox file storage) to receive brand draft approval.</p>
                
                {deal.feedback && (
                  <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl text-xs text-rose-300">
                    <strong>Previous Brand Change Request Feedback:</strong>
                    <p className="mt-1 font-normal italic">&ldquo;{deal.feedback}&rdquo;</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Draft Link URL</label>
                    <input 
                      type="url" 
                      value={draftVideo} 
                      onChange={(e) => setDraftVideo(e.target.value)} 
                      name="draft_video_url"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[var(--violet)]" 
                      placeholder="e.g. https://drive.google.com/..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Draft Caption Copy Proposal</label>
                    <input 
                      type="text" 
                      value={draftCaption} 
                      onChange={(e) => setDraftCaption(e.target.value)} 
                      name="draft_caption"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-xs focus:outline-none" 
                      placeholder="Enter captions, hashtags copy, mentions description"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Notes to reviewers</label>
                  <textarea 
                    rows={3} 
                    value={draftNotes} 
                    onChange={(e) => setDraftNotes(e.target.value)} 
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-xs focus:outline-none filter-none"
                    placeholder="Provide notes or styling highlights..."
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submittingDraft}
                  className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-extrabold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} /> {submittingDraft ? "Uploading Submission..." : "Dispatch Draft Preview"}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-[var(--text-tertiary)]">
                <Clock size={28} className="mx-auto mb-2 text-[var(--text-tertiary)]" />
                <p className="text-xs font-semibold">Waiting for the creator to dispatch their proposed draft review asset link.</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-normal">Funds remain securely protected by Escrow limits. Direct notifications will trigger once drafts register.</p>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 2: CONTENT REVIEW AND FEEDBACK DISPATCH PANEL (Brand) --- */}
        {deal.stage?.toUpperCase() === "CONTENT_SUBMITTED" && (
          <div className="bg-[var(--bg-card)]/30 border border-[var(--border-default)] rounded-3xl p-6 sm:p-8 text-left space-y-4">
            <h3 className="text-lg font-display font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Clipboard size={18} className="text-[var(--violet)]" /> Proposed Creative Assets under review
            </h3>

            {deal.submission && (
              <div className="bg-[var(--bg-card)]/80 p-5 rounded-2xl border border-[var(--border-default)] space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-[var(--violet)] uppercase block tracking-wider">Proposed Video/Asset Link</span>
                  <a 
                    href={deal.submission.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-[var(--text-primary)] underline font-semibold flex items-center gap-1.5 mt-1 hover:text-[var(--violet)] transition-colors"
                  >
                    {deal.submission.video_url} &rarr; Open Asset link
                  </a>
                </div>
                {deal.submission.caption && (
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase block tracking-wider">Proposed Caption Copy</span>
                    <p className="text-xs text-[var(--text-primary)]/90 mt-1 font-normal select-text">&ldquo;{deal.submission.caption}&rdquo;</p>
                  </div>
                )}
                {deal.submission.notes && (
                  <div>
                    <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase block tracking-wider">Creator notes</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 italic font-normal">&ldquo;{deal.submission.notes}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {isBrand ? (
              <div className="pt-2 space-y-4">
                <div className="flex gap-3">
                  <button 
                    onClick={handleApproveDraft} 
                    disabled={approving} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle size={14} /> Approve & Dispatch Live Release
                  </button>
                </div>
                
                <div className="border-t border-[var(--border-default)] pt-4 max-w-md">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-1.5">Request modifications / Revisions</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={revisionFeedback} 
                      onChange={(e) => setRevisionFeedback(e.target.value)} 
                      className="flex-grow bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none" 
                      placeholder="e.g. Please trim first 5 seconds of footage..."
                    />
                    <button 
                      onClick={handleRequestChanges} 
                      disabled={rejecting} 
                      className="bg-[var(--violet)]/10 hover:bg-[var(--violet)]/20 text-[var(--text-primary)] border border-[var(--violet)]/20 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Request Revision
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/15 p-5 rounded-xl text-center">
                <p className="text-xs text-amber-400 font-bold">Draft Content review in progress!</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">The matching Brand brand reviewers have been notified. Revision suggestions or direct permissions will trigger shortly.</p>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 3: CONTENT APPROVED - REDIRECT TO LIVE LINK DISPATCH (ADD COLLAB) --- */}
        {deal.stage?.toUpperCase() === "CONTENT_APPROVED" && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <h3 className="text-lg font-display font-black text-emerald-600">Content Pre-Release Approved!</h3>
            <p className="text-xs text-[var(--text-primary)]/80 max-w-lg mx-auto leading-relaxed">
              Your video draft looks stunning. Please post the final approved content on Instagram and click below to sync your live link securely!
            </p>
            
            <div className="pt-2">
              {isCreator ? (
                <button 
                  onClick={() => navigate(`/deals/${id}/add-collab`)} 
                  className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-extrabold text-xs px-8 py-4 rounded-xl transition-all shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                   Paste Live Instagram Post Link <ArrowRight size={13} />
                </button>
              ) : (
                <div className="text-xs text-[var(--text-secondary)]">
                  Creator was notified to post the live content on Instagram and sync final performance verification tracking data here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- STEP 4: PROOF SUBMITTED / COMPLETED - MATCH METRICS REAL-TIME (UPLOADED COLLAB) --- */}
        {(deal.stage?.toUpperCase() === "PROOF_SUBMITTED" || deal.stage?.toUpperCase() === "COMPLETED") && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <h3 className="text-lg font-display font-black text-indigo-300">Live Post Integration Synced!</h3>
            <p className="text-xs text-[var(--text-primary)]/80 max-w-lg mx-auto leading-relaxed font-normal">
              Final content proofs, live metrics reports, and automated stats syncing can be reviewed inside the post performance workspace.
            </p>
            
            <div className="pt-2">
              <button 
                onClick={() => navigate(`/deals/${id}/uploaded-collab`)} 
                className="bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-extrabold text-xs px-8 py-4 rounded-xl transition-all shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                View Live Sync Performance Analytics Tracker <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
