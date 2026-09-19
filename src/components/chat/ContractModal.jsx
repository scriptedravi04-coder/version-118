import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Lock, ShieldCheck, Phone, Check, Mail } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function ContractModal({ thread, offer, user, onClose, onSigned, onNegotiateInstead }) {
  const [loading, setLoading] = useState(false);
  
  const getRegisteredUserEmail = (u) => { return u?.email || ''; };
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

  const [otpEmail, setOtpEmail] = useState(() => getRegisteredUserEmail(user));

  React.useEffect(() => {
    const e = getRegisteredUserEmail(user);
    if (e) setOtpEmail(e);
  }, [user]);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  const isBrand = user?.role === 'brand' || user?.user_type === 'brand';

  const handleSendOTP = async () => {
    if (!otpEmail || !otpEmail.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSendingOtp(true);
    try {
      await api.post('/otp/send', { 
        value: otpEmail, 
        target: 'email', 
        purpose: 'contract_sign',
        recipientName: user?.name || user?.full_name || (isBrand ? 'Brand Partner' : 'Creator Partner'),
        brandName: thread?.brand?.name || offer?.brand_name || 'Brand Partner',
        creatorName: thread?.creator?.name || offer?.creator_name || 'Creator Partner',
        campaignTitle: offer?.title || offer?.campaign_title || thread?.campaign_title || 'Influencer Partnership Agreement',
        dealAmount: offer?.amount || thread?.amount_fixed || ''
      });
      setOtpSent(true);
      toast.success(`Verification code dispatched to ${otpEmail}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Failed to send OTP code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSign = async () => {
    if (!otpSent) {
      toast.error("Please send OTP first.");
      return;
    }
    if (!otpCode || otpCode.trim().length < 4) {
      toast.error("Please enter the verification code.");
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/otp/verify', { value: otpEmail, code: otpCode.trim() });
      await api.post(`/campaign/threads/${thread.id}/sign`, { offer_id: offer?.id });
      toast.success("Contract legally executed!");
      onSigned();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Failed to verify OTP or execute agreement.");
    } finally {
      setLoading(false);
    }
  };

  const amountText = (offer?.amount || thread?.amount_fixed || 0).toLocaleString('en-IN');
  const revisionsCount = offer?.revision_count || thread?.revision_count || 1;
  const deadlineText = offer?.deadline 
    ? new Date(offer.deadline).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) 
    : 'TBD';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 15 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        >
          {/* Header styled like reference UI */}
          <div className="flex justify-between items-center p-5 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)]/20">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Partnership Contract</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your Agreement</p>
            </div>
            <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--border-default)] rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable contract text content (similar structure to Porfoma terms in screenshot 4) */}
          <div className="flex-1 overflow-y-auto p-6 text-sm text-[var(--text-primary)] space-y-5 no-scrollbar">
            
            <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
              Welcome to the Ybex Partnership. By executing this contract via digital verification, both 
              <strong> {thread.brand?.name || 'the Brand'}</strong> and <strong>{thread.creator?.name || 'the Creator'}</strong> agree to be 
              mutually bound by the following detailed partnership contract terms and guidelines:
            </p>

            <div className="space-y-4 bg-[var(--bg-base)]/50 border border-[var(--border-default)] p-5 rounded-xl">
              
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">1. Scope of Work & Deliverables</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The Creator shall produce, upload, and publish authentic advertising campaign deliverables. The specific list of creative assets agreed upon includes:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-[var(--text-secondary)] font-medium">
                  {offer?.deliverables?.length > 0 
                    ? offer.deliverables.map((d, i) => <li key={i}>{d}</li>)
                    : thread?.deliverables?.map((d, i) => <li key={i}>{d}</li>) || <li>Standard Campaign Content Creation</li>
                  }
                </ul>
              </div>

              <div className="space-y-1 pt-2 border-t border-[var(--border-default)]/40">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">2. Budget & Financial Payout Escrow</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The total compensation locked for this partnership is <strong className="text-[var(--text-primary)]">₹{amountText}</strong>. 
                  These escrow funds are held securely on the Ybex network and will be disbursed directly to the Creator's bank card/UPI address once the Brand approves content delivery.
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-[var(--border-default)]/40">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">3. Timeline & Revisions</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  The Creator agrees to deliver all completed drafts within the specified timeline: <strong>{deadlineText}</strong>. 
                  The Brand is entitled to a maximum of <strong>{revisionsCount} revisions</strong>.
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-[var(--border-default)]/40">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">4. Intellectual Property & Indemnity</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Upon final payment release, the Brand is granted a 12-month exclusive license to repurpose and boost the campaign deliverables across all authorized digital platforms.
                </p>
              </div>

            </div>

            {/* OTP Authorized Signature Section */}
            <div className="pt-5 border-t border-[var(--border-strong)]">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={15} className="text-[var(--violet)]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Authorized Digital Verification</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-[var(--bg-elevated)]/20 p-4 rounded-xl border border-[var(--border-default)]">
                {/* Auth Email */}
                <div className="sm:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Auth Email</label>
                    <span className="text-[9px] text-amber-500 font-semibold flex items-center gap-0.5">
                      <Lock size={9} /> Verified Email
                    </span>
                  </div>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input 
                      type="email"
                      value={otpEmail}
                      readOnly
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg text-xs font-semibold text-[var(--text-primary)] cursor-not-allowed opacity-90 select-none outline-none"
                    />
                  </div>
                </div>

                {/* OTP input code */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">6-Digit OTP</label>
                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-default)] font-mono text-center tracking-[0.2em] rounded-lg text-sm font-bold focus:ring-1 focus:ring-[var(--violet)] focus:outline-none transition-all"
                  />
                </div>

                {/* Send OTP button */}
                <div className="sm:col-span-3">
                  <button 
                    type="button"
                    onClick={handleSendOTP}
                    className="w-full py-2.5 bg-[var(--bg-base)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] italic mt-2 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                Under the Information Technology Act, 2000, signing via OTP constitutes a binding e-signature.
              </p>
            </div>

          </div>

          {/* Footer - Close and Accept via OTP */}
          <div className="p-5 border-t border-[var(--border-strong)] bg-[var(--bg-elevated)]/20 flex justify-between items-center gap-3 shrink-0">
            
            <button 
              onClick={onClose}
              className="px-5 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs border border-[var(--border-default)] rounded-xl transition-colors hover:bg-[var(--bg-elevated)]"
            >
              Close
            </button>

            <button 
              onClick={handleSign}
              disabled={loading || !otpCode || otpCode.length !== 6}
              className="px-6 py-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--violet)]/10"
            >
              <CheckCircle size={14} /> 
              {loading ? "Signing..." : "Accept via OTP"}
            </button>
            
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
