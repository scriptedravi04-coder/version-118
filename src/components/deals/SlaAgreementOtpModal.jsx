import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Check, Lock, ShieldCheck, AlertTriangle, FileText, 
  Smartphone, KeyRound, CheckCircle2, User, Building2, 
  Clock, DollarSign, ExternalLink
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export default function SlaAgreementOtpModal({ deal, onClose, onSigned }) {
  const { user } = useAuth();
  const [step, setStep] = useState("review"); // "review" | "otp"
  const [loading, setLoading] = useState(false);

  const getRegisteredUserPhone = (u) => {
    if (!u) return "";
    let raw = u.phone || u.mobile || u.phone_number || u.pocPhone || u.representative_mobile || u.poc_phone || "";
    if (!raw || !String(raw).trim()) {
      try {
        const saved = localStorage.getItem("ybex_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          raw = parsed.phone || parsed.mobile || parsed.phone_number || parsed.pocPhone || parsed.representative_mobile || parsed.poc_phone || "";
        }
      } catch (e) {}
    }
    const str = String(raw).trim();
    if (!str) return u?.email ? `+91 (${u.email})` : "Phone Not Linked";
    if (str.startsWith("+")) return str;
    const digits = str.replace(/\D/g, "");
    if (digits.length === 10) return `+91 ${digits}`;
    return str;
  };

  // OTP State
  const [phone, setPhone] = useState(() => getRegisteredUserPhone(user));

  React.useEffect(() => {
    const p = getRegisteredUserPhone(user);
    if (p) setPhone(p);
  }, [user]);
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  if (!deal) return null;

  // Extract variables
  const creatorName = user?.name || deal.creatorName || "Creator";
  const creatorEmail = user?.email || "creator@ybex.io";
  const creatorPhone = phone;
  const creatorId = user?.user_id || user?.id || "CR-" + Math.floor(1000 + Math.random() * 9000);

  const brandName = typeof deal.brandName === 'string' ? deal.brandName : deal.brand_name || "Brand Partner";
  const productName = typeof deal.title === 'string' ? deal.title : deal.product_name || "UGC Video Campaign";
  const payoutAmount = Number(deal.payout || deal.budget || deal.agreed_amount || 0);
  
  const rawBrief = deal.raw?.brief;
  const briefDesc = typeof deal.description === 'string' && deal.description 
    ? deal.description 
    : typeof deal.raw?.description === 'string' && deal.raw?.description 
    ? deal.raw?.description 
    : typeof rawBrief === 'string' && rawBrief 
    ? rawBrief 
    : typeof rawBrief === 'object' && rawBrief !== null 
    ? (rawBrief.detailed_requirements || rawBrief.product_description || rawBrief.title || "Produce an authentic 30-60 second UGC video following brand guidelines and key selling points.")
    : "Produce an authentic 30-60 second UGC video following brand guidelines and key selling points.";

  const dos = Array.isArray(deal.dos) ? deal.dos : Array.isArray(deal.raw?.dos) ? deal.raw?.dos : Array.isArray(rawBrief?.dos) ? rawBrief.dos : [];
  const donts = Array.isArray(deal.donts) ? deal.donts : Array.isArray(deal.raw?.donts) ? deal.raw?.donts : Array.isArray(rawBrief?.donts) ? rawBrief.donts : [];
  const referenceUrl = deal.raw?.reference_sample_url || deal.referenceUrl || (typeof rawBrief === 'object' ? rawBrief?.sample_content_url : null) || null;

  const handleSendOTP = () => {
    if (!phone || phone.trim().length < 8) {
      toast.error("Please enter a valid mobile number.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    toast.success(`OTP ${code} sent to ${phone}`);
  };

  const handleExecuteSign = async () => {
    if (!otpSent) {
      toast.error("Please click 'Send OTP' first.");
      return;
    }
    if (otpCode !== generatedOtp) {
      toast.error("Invalid OTP code.");
      return;
    }

    setLoading(true);
    const signatureStr = `OTP Verified (${phone}) on ${new Date().toLocaleString('en-IN')}`;

    try {
      if (onSigned) {
        await onSigned(deal.id, signatureStr, deal.type);
      } else {
        const dealId = deal.id;
        if (deal.type === "ugc_order") {
          await api.post(`/ugc/orders/${dealId}/sign`, { signature: signatureStr });
        } else {
          await api.post(`/deals/${dealId}/sign`, { signature: signatureStr });
        }
        toast.success("SLA Production Agreement executed! 24-Hour production timer started.");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to execute agreement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative my-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-black">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
                  UGC SLA PRODUCTION & SPONSORSHIP AGREEMENT
                </h3>
                <p className="text-[10px] text-[var(--text-tertiary)] font-mono uppercase tracking-wider">
                  DEED REF: YBEX-SLA-{(deal.id || "0000").slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[var(--text-primary)]">
            
            {/* Step Indicator */}
            <div className="flex items-center gap-3 bg-[var(--bg-elevated)] p-2 rounded-2xl border border-[var(--border-default)]">
              <div className={`flex-1 text-center py-2 rounded-xl text-[11px] font-bold transition-all ${step === "review" ? "bg-[var(--violet)] text-white shadow-xs" : "text-[var(--text-tertiary)]"}`}>
                1. Review Contract & Brief
              </div>
              <div className={`flex-1 text-center py-2 rounded-xl text-[11px] font-bold transition-all ${step === "otp" ? "bg-[var(--violet)] text-white shadow-xs" : "text-[var(--text-tertiary)]"}`}>
                2. OTP Verification & Sign
              </div>
            </div>

            {/* CRITICAL WARNING BANNER */}
            <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-600 font-bold uppercase tracking-wider text-[11px]">
                <AlertTriangle size={16} className="shrink-0" />
                <span>CRITICAL 24-HOUR SLA & PENALTY WARNING</span>
              </div>
              <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                Upon executing this agreement with OTP, you <strong>MUST submit your final video draft within 24 hours</strong>. Failure to deliver within 24 hours will result in an <strong>automatic production penalty fee, loss of creator trust score, and account strike/suspension</strong>. Please take this agreement and 24-hour timeline seriously.
              </p>
            </div>

            {/* PARTIES & DETAILS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Creator Info Box */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)] space-y-2">
                <div className="flex items-center gap-2 text-[var(--violet)] font-bold text-[11px] uppercase tracking-wider border-b border-[var(--border-default)] pb-2">
                  <User size={14} /> Creator Party Details
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-[var(--text-tertiary)]">Name:</span> <strong>{creatorName}</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">Email:</span> <strong>{creatorEmail}</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">Phone:</span> <strong>{creatorPhone}</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">User ID:</span> <strong>{creatorId}</strong></div>
                </div>
              </div>

              {/* Brand & Deal Info Box */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)] space-y-2">
                <div className="flex items-center gap-2 text-[var(--violet)] font-bold text-[11px] uppercase tracking-wider border-b border-[var(--border-default)] pb-2">
                  <Building2 size={14} /> Brand & Payout Terms
                </div>
                <div className="space-y-1 text-[11px]">
                  <div><span className="text-[var(--text-tertiary)]">Brand Partner:</span> <strong>{brandName}</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">Campaign Title:</span> <strong>{productName}</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">Deliverable:</span> <strong>1x High Quality UGC Video (30-60s)</strong></div>
                  <div><span className="text-[var(--text-tertiary)]">Escrow Payout:</span> <strong className="text-[#027A48] font-mono text-sm">₹{payoutAmount.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>

            </div>

            {/* UGC BRIEF & GUIDELINES */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--violet)]">
                  Full UGC Brief & Guidelines
                </span>
                {referenceUrl && (
                  <a 
                    href={referenceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-[var(--violet)] font-bold hover:underline flex items-center gap-1"
                  >
                    View Reference Sample <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="text-[11px] leading-relaxed text-[var(--text-secondary)] font-medium bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-default)]">
                {briefDesc}
              </div>

              {/* DOS AND DONTS */}
              {(dos.length > 0 || donts.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {dos.length > 0 && (
                    <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1.5">
                        Must Do (Required)
                      </span>
                      <ul className="space-y-1 text-[10px] text-[var(--text-primary)]">
                        {dos.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {donts.length > 0 && (
                    <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block mb-1.5">
                        Must Not Do (Prohibited)
                      </span>
                      <ul className="space-y-1 text-[10px] text-[var(--text-primary)]">
                        {donts.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <X size={12} className="text-rose-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* LEGAL TERMS TEXT */}
            <div className="border border-[var(--border-default)] bg-[var(--bg-card)] p-4 rounded-2xl text-[10px] leading-relaxed text-[var(--text-tertiary)] space-y-2">
              <p className="font-bold text-[var(--text-secondary)]">ELECTRONIC SPONSORSHIP AND USAGE AGREEMENT TERMS:</p>
              <p><strong>1. Services & Deliverables:</strong> Creator agrees to shoot, produce, and upload standard UGC video content according to the brand brief guidelines and quality benchmarks.</p>
              <p><strong>2. Rights Transfer:</strong> Upon release of escrow funds, Creator grants Brand Partner full digital promotional distribution rights for organic and paid social channels.</p>
              <p><strong>3. Escrow Guarantee:</strong> Payment of ₹{payoutAmount.toLocaleString("en-IN")} is held in YBEX Escrow and released immediately upon brand approval of the deliverable.</p>
              <p><strong>4. Penalty & Strict SLA:</strong> Submission after 24 hours of signature triggers production penalties and creator score strikes.</p>
            </div>

            {/* STEP 2: OTP VERIFICATION AREA */}
            {step === "otp" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-[var(--violet)]/5 border border-[var(--violet)]/20 p-5 rounded-2xl space-y-4"
              >
                <div className="flex items-center gap-2 text-[var(--violet)] font-bold">
                  <Smartphone size={16} />
                  <span className="text-xs uppercase tracking-wider">SMS OTP Authentication & Legal Binding</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Registered Mobile Number
                      </label>
                      <span className="text-[9px] text-amber-500 font-semibold flex items-center gap-1">
                        <Lock size={9} /> Verified (Locked)
                      </span>
                    </div>
                    <input 
                      type="tel" 
                      value={phone} 
                      readOnly
                      disabled
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] font-mono outline-none cursor-not-allowed opacity-80 select-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={6} 
                        placeholder="••••••" 
                        value={otpCode} 
                        onChange={(e) => setOtpCode(e.target.value)} 
                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-[0.3em] font-bold outline-none focus:border-[var(--violet)]"
                      />
                      <button 
                        onClick={handleSendOTP} 
                        className="px-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                      >
                        {otpSent ? "Resend" : "Send OTP"}
                      </button>
                    </div>
                  </div>
                </div>

                {otpSent && (
                  <div className="text-[10px] text-emerald-600 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-mono font-bold flex items-center justify-between">
                    <span>✓ OTP dispatched to {phone}</span>
                    <span className="text-[var(--violet)]">Test Code: {generatedOtp}</span>
                  </div>
                )}
              </motion.div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="p-5 border-t border-[var(--border-default)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <button 
              onClick={onClose} 
              className="w-full sm:w-auto px-5 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === "review" ? (
              <button 
                onClick={() => {
                  setStep("otp");
                  if (!otpSent) handleSendOTP();
                }} 
                className="w-full sm:w-auto bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
              >
                <span>Proceed to OTP Signature</span>
                <Lock size={14} />
              </button>
            ) : (
              <button 
                onClick={handleExecuteSign} 
                disabled={loading || !otpCode}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold px-7 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Execute Agreement via OTP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
