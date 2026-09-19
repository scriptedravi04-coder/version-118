import React, { useState, useEffect, useRef } from "react";
import { safeArray } from "../../utils/safeFormat";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { 
  X, Check, AlertTriangle, Clock, MessageSquare, Download, Upload, 
  Globe, FileText, ChevronRight, Lock, Play, Image, ShieldCheck
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SlaAgreementOtpModal from "./SlaAgreementOtpModal";
import VideoEmbedPreview from "../shared/VideoEmbedPreview";
import AgencyBadge from "../common/AgencyBadge";

export default function DealDetailDrawer({ deal, onClose, onSign, onSubmitDeliverable }) {
  const navigate = useNavigate();
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureText, setSignatureText] = useState("");
  
  // Deliverable Submission State
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timelineRef = useRef(null);

  useEffect(() => {
    if (!deal) return;
    
    // Reset inputs when switching deals
    setSignatureText("");
    setFile(null);
    setVideoUrl("");
    setNotes("");

    // GSAP Animation for Timeline Items
    const ctx = gsap.context(() => {
      gsap.from(".timeline-item", {
        opacity: 0,
        x: 15,
        stagger: 0.08,
        duration: 0.6,
        ease: "power2.out"
      });
    }, timelineRef);

    return () => ctx.revert();
  }, [deal]);

  if (!deal) return null;

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // Sign Action
  const handleExecuteSign = async () => {
    if (!signatureText.trim()) {
      toast.error("Please enter your full name to sign the agreement.");
      return;
    }
    setSigning(true);
    try {
      await onSign(deal.id, signatureText, deal.type);
      setSignatureText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSigning(false);
    }
  };

  // Submit Action
  const handleExecuteSubmit = async () => {
    const isCollab = deal.deliverableType === 'collaboration_reel' || 
                     deal.type === 'collaboration_reel' || 
                     deal.raw?.deliverable_type === 'collaboration_reel' ||
                     deal.raw?.brief?.deliverable_type === 'collaboration_reel';

    if (isCollab) {
      if (!videoUrl.trim()) {
        toast.error("Please paste your live Collaboration Reel URL.");
        return;
      }
      const lower = videoUrl.trim().toLowerCase();
      if (!lower.includes("instagram.com") && !lower.includes("youtube.com") && !lower.includes("youtu.be")) {
        toast.error("Please paste a valid Instagram or YouTube live video link.");
        return;
      }
    } else {
      // UGC Video Raw or Edited -> Google Drive Link Required
      if (!videoUrl.trim()) {
        toast.error("Please paste your Google Drive deliverable link.");
        return;
      }
      const lower = videoUrl.trim().toLowerCase();
      if (!lower.includes("drive.google.com")) {
        toast.error("Please paste a valid Google Drive link (e.g. https://drive.google.com/...)");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmitDeliverable(deal.id, file, videoUrl, notes, deal.type);
      setFile(null);
      setVideoUrl("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate timeline states
  const isAwaitingSig = false;
  const isInProd = deal.stage === "IN_PROGRESS" || deal.stage === "REVISION_REQUESTED";
  const isInRev = deal.stage === "IN_REVIEW";
  const isComp = deal.stage === "COMPLETED";

  const isRevision = deal.status === "REVISION_REQUESTED" || deal.status === "REVISION_REQ" || deal.raw?.creator_status === "REVISION_REQUESTED" || deal.raw?.creator_status === "REVISION_REQ" || deal.stage === "REVISION_REQUESTED";

  const steps = [
    { label: "Sponsorship Offer Accepted", desc: "You accepted the brand's campaign offer.", completed: true },
    { label: "SLA / Electronic Agreement Signature", desc: "Electronically sign terms to begin production.", completed: !isAwaitingSig, active: isAwaitingSig },
    { label: "Content Production & Shooting", desc: "Shoot and upload premium content according to brief.", completed: isInRev || isComp, active: isInProd },
    { label: "Brand Editorial Quality Review", desc: "Brand evaluates content for compliance & quality.", completed: isComp, active: isInRev },
    { label: "Milestone Funds Release", desc: "Approved payout transferred to your balance.", completed: isComp, active: isComp }
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 transition-all duration-300"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#F2F2F7] shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="bg-white border-b border-gray-100 p-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {deal.brandLogo ? (
              <img src={deal.brandLogo} alt={deal.brandName} className="w-10 h-10 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold font-sans text-sm">
                {deal.brandName?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-gray-800 tracking-tight leading-none">{deal.brandName}</h2>
                {(deal.is_agency || deal.raw?.is_agency || deal.raw?.brand_profiles?.is_agency) && (
                  <AgencyBadge size="xs" />
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  deal.type === "ugc_order" ? "bg-purple-50 text-purple-600" : "bg-indigo-50 text-indigo-600"
                }`}>
                  {deal.type === "ugc_order" ? "UGC" : "Campaign"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium tracking-tight mt-1">Deal ID: {deal.id}</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Card with Deal info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{deal.title}</h3>
            <p className="text-xs text-gray-400 font-medium tracking-tight mt-1">{deal.subtitle}</p>

            <div className="flex items-center justify-between border-t border-gray-100 mt-4 pt-4">
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Payout</span>
                <span className="text-xl font-bold font-mono text-[#027A48]">₹{deal.payout?.toLocaleString("en-IN")}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block">Status</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                  deal.stage === "AWAITING_SIGNATURE" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                  deal.stage === "IN_PROGRESS" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" :
                  deal.stage === "REVISION_REQUESTED" ? "bg-rose-50 text-rose-500 border border-rose-200" :
                  deal.stage === "IN_REVIEW" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                  "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}>
                  {deal.stage?.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Milestone Tracker</h4>
            
            <div ref={timelineRef} className="relative pl-6 border-l border-gray-100 space-y-6">
              {steps.map((step, idx) => (
                <div key={idx} className="timeline-item relative">
                  {/* Indicator Dot */}
                  <div className={`absolute -left-[31px] w-[11px] h-[11px] rounded-full border-2 -translate-y-1/2 top-3 transition-colors duration-300 ${
                    step.completed ? "bg-[var(--violet)] border-[var(--violet)]" : 
                    step.active ? "bg-white border-[var(--violet)] ring-4 ring-[var(--violet)]/15" : "bg-white border-gray-200"
                  }`} />

                  <div>
                    <h5 className={`text-xs font-bold leading-none ${step.completed || step.active ? "text-gray-800" : "text-gray-400"}`}>
                      {step.label}
                    </h5>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium tracking-tight leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables detail card */}
          {(deal.deliverables || deal.dos?.length > 0) && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Creative Requirements</h4>
              
              {deal.deliverables && (
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Detailed Requirements</span>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                    {deal.deliverables}
                  </p>
                </div>
              )}

              {deal.sampleUrl && (
                <div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Reference Sample URL</span>
                  <a 
                    href={deal.sampleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex text-xs text-[var(--violet)] hover:underline font-bold items-center gap-1.5"
                  >
                    <Globe size={13} /> View Reference Sample <ChevronRight size={12} />
                  </a>
                </div>
              )}

              {/* Must Do / Must Not Do */}
              {deal.dos && deal.dos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest block mb-2">Must Do</span>
                    <ul className="text-[11px] text-gray-600 font-medium space-y-1.5">
                      { safeArray(deal.dos).map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <Check size={12} className="text-emerald-500 shrink-0 mt-0.5 stroke-[3]" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {deal.donts && deal.donts.length > 0 && (
                    <div>
                      <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest block mb-2">Must Not Do</span>
                      <ul className="text-[11px] text-gray-600 font-medium space-y-1.5">
                        { safeArray(deal.donts).map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                            <X size={12} className="text-rose-400 shrink-0 mt-0.5 stroke-[3]" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interactive forms depending on state */}
          {isAwaitingSig && (
            <div id="sla-signature-box" className="bg-gradient-to-br from-purple-500/10 via-amber-500/5 to-purple-500/10 rounded-2xl p-6 border border-[var(--violet)]/20 shadow-sm space-y-4 relative overflow-hidden transition-all duration-300">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-3">
                <ShieldCheck size={18} className="text-[var(--violet)]" />
                <h4 className="text-xs font-black text-gray-900 tracking-wide uppercase">SLA Agreement Required</h4>
              </div>

              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                Review full brand brief guidelines, deliverables, creator payout terms, and the <strong>24-hour SLA penalty clause</strong> before executing the contract via OTP verification.
              </p>

              <button 
                onClick={() => setShowOtpModal(true)} 
                className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-[var(--violet)]/20 cursor-pointer active:scale-98"
              >
                <Lock size={14} /> Review & Sign Agreement via OTP
              </button>
            </div>
          )}

          {/* Submission portal for Progress or Revision Requested */}
          {isInProd && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">Submit Deliverables</h4>
                {isRevision && (
                  <span className="bg-rose-50 text-rose-500 font-bold text-[9px] px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <AlertTriangle size={11} /> Revision Active
                  </span>
                )}
              </div>

              {isRevision && deal.raw?.revision_note && (
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                  <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest block mb-1">Brand Feedback Note</span>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed italic">
                    &ldquo;{deal.raw.revision_note}&rdquo;
                  </p>
                </div>
              )}

              {/* Link Input tailored to format */}
              {(() => {
                const isCollab = deal.deliverableType === 'collaboration_reel' || 
                                 deal.type === 'collaboration_reel' || 
                                 deal.raw?.deliverable_type === 'collaboration_reel' ||
                                 deal.raw?.brief?.deliverable_type === 'collaboration_reel';

                if (isCollab) {
                  return (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Live Collaboration Reel URL <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        type="url" 
                        value={videoUrl} 
                        onChange={(e) => setVideoUrl(e.target.value)} 
                        placeholder="https://www.instagram.com/reel/... or https://youtube.com/shorts/..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-800 outline-none focus:border-[var(--violet)] focus:bg-white transition-all font-mono"
                      />
                      <p className="text-[10px] text-gray-400">
                        ⚡ Payment auto-releases instantly upon live link submission.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Google Drive Link <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="url" 
                      value={videoUrl} 
                      onChange={(e) => setVideoUrl(e.target.value)} 
                      placeholder="https://drive.google.com/drive/folders/..." 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-800 outline-none focus:border-[var(--violet)] focus:bg-white transition-all font-mono"
                    />
                    <p className="text-[10px] text-gray-400">
                      📁 Upload your raw/edited video clips to Google Drive and paste the link. Brand reviews before payment release.
                    </p>
                  </div>
                );
              })()}

              {/* Optional submission notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Production Notes (Optional)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Provide production notes, draft concepts, or captions for the brand..." 
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-800 outline-none focus:border-[var(--violet)] focus:bg-white transition-all font-medium leading-relaxed resize-none"
                />
              </div>

              <button 
                onClick={handleExecuteSubmit} 
                disabled={submitting || (!file && !videoUrl.trim())}
                className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-98 shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={14} /> Submit for Editorial Review
                  </>
                )}
              </button>
            </div>
          )}

          {/* Under Review visual card */}
          {isInRev && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-blue-500">
                <Clock size={16} />
                <h4 className="text-xs font-black uppercase tracking-wide">Pending Brand Review</h4>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Your deliverable is successfully in the review queue. The Brand Editorial Panel reviews content uploads within 24 hours. You'll receive a notification immediately upon status updates!
              </p>
              {deal.videoUrl && (
                <div className="pt-2">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Submitted Content</span>
                  <div className="my-2">
                    <VideoEmbedPreview url={deal.videoUrl} title="Submitted Deliverable" />
                  </div>
                  <a 
                    href={deal.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex text-xs text-blue-500 hover:underline font-bold items-center gap-1 mt-1"
                  >
                    <Play size={12} fill="currentColor" /> Open Original Link
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Completed / Paid Status card */}
          {isComp && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-emerald-500">
                <Check size={16} className="stroke-[3]" />
                <h4 className="text-xs font-black uppercase tracking-wide">Paid & Completed</h4>
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                This transaction is complete! Payout of <strong className="text-[#027A48]">₹{deal.payout?.toLocaleString("en-IN")}</strong> has been deposited to your YBEX Balance.
              </p>
              {deal.videoUrl && (
                <div className="mb-2">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Delivered Asset</span>
                  <a 
                    href={deal.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex text-xs text-emerald-500 hover:underline font-bold items-center gap-1"
                  >
                    <Play size={12} fill="currentColor" /> Play Completed Deliverable
                  </a>
                </div>
              )}

              {/* Dynamic Performance Rank & Metrics */}
              {(deal.performance_score || deal.raw?.performance_score) && (
                <div className="mt-4 pt-4 border-t border-gray-100 bg-purple-50/50 p-4 rounded-xl border border-[var(--violet)]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--violet)] font-black uppercase tracking-wider flex items-center gap-1">
                       Performance Score Card
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      (deal.performance_tier || deal.raw?.performance_tier) === "PLATINUM" ? "bg-purple-100 text-purple-700" :
                      (deal.performance_tier || deal.raw?.performance_tier) === "GOLD" ? "bg-amber-100 text-amber-700" :
                      (deal.performance_tier || deal.raw?.performance_tier) === "SILVER" ? "bg-slate-100 text-slate-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {(deal.performance_tier || deal.raw?.performance_tier)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Objective Score</p>
                      <p className="font-mono text-sm font-black text-[var(--violet)]">{deal.performance_score || deal.raw?.performance_score}/100</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Delivered Reach</p>
                      <p className="font-mono text-sm font-black text-gray-800">{(deal.delivered_reach || deal.raw?.delivered_reach)?.toLocaleString() || "N/A"}</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-gray-400 font-medium text-center italic">
                    Score is calculated based on delivered reach vs promised target, submission speed, and brand partner rating.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="bg-white border-t border-gray-100 p-5 flex gap-3 shadow-md">
          <button 
            onClick={() => {
              if (isAwaitingSig) {
                setShowOtpModal(true);
                return;
              }
              onClose();
              const targetId = deal.raw?.thread_id || deal.thread_id || deal.raw?.id || deal.id || deal.brandUserId || deal.raw?.brand_id || deal.raw?.brand_user_id || "brand";
              navigate(`/chat/${targetId}`);
            }}
            className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
              isAwaitingSig 
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100" 
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            {isAwaitingSig ? (
              <>
                <Lock size={14} className="text-amber-500" /> Sign SLA to Message
              </>
            ) : (
              <>
                <MessageSquare size={14} className="text-[var(--violet)]" /> View Campaign Chat
              </>
            )}
          </button>
          
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </motion.div>

      {/* SLA Agreement & OTP Modal */}
      {showOtpModal && (
        <SlaAgreementOtpModal
          deal={deal}
          onClose={() => setShowOtpModal(false)}
          onSigned={async (id, sig, type) => {
            if (onSign) {
              await onSign(id, sig, type);
            }
            setShowOtpModal(false);
          }}
        />
      )}
    </>
  );
}
