import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Lock, MessageCircle, Mail } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

export default function UGCContractModal({ brief, orderId, threadId, onClose, onSigned, onStartChat }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
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

  useEffect(() => {
    const e = getRegisteredUserEmail(user);
    if (e) setOtpEmail(e);
  }, [user]);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

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
        recipientName: user?.name || user?.full_name || 'Creator Partner',
        brandName: brief?.brand_name || 'Brand Partner',
        creatorName: user?.name || 'Creator Partner',
        campaignTitle: brief?.title || brief?.campaign_title || 'UGC Video Deliverable Agreement',
        dealAmount: brief?.budget || brief?.payout || ''
      });
      setOtpSent(true);
      toast.success(`Verification code dispatched to ${otpEmail}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Failed to send OTP.");
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
      // 1. Verify OTP code
      await api.post('/otp/verify', { value: otpEmail, code: otpCode.trim() });

      let targetOrderId = orderId;

      if (!targetOrderId) {
        // Fresh claim from Explore UGC: atomically claim & sign with OTP signature
        const briefId = brief?.id || brief?.brief_id;
        if (!briefId) {
          throw new Error("Invalid brief identifier.");
        }
        const { data } = await api.post("ugc/orders/claim", {
          brief_id: briefId,
          signature: `OTP Verified: ${otpEmail}`
        });
        targetOrderId = data?.order_id || data?.order?.id;
      } else {
        // Resigning an existing pending order in Manage Orders
        await api.post(`/ugc/orders/${targetOrderId}/sign`, { 
          signature: `OTP Verified: ${otpEmail}`,
          thread_id: threadId 
        });
      }

      toast.success("UGC Production Agreement executed! 22-Hour timer started.");
      if (onSigned) {
        onSigned(targetOrderId);
      } else {
        onClose();
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Failed to verify OTP or execute agreement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        >
          <div className="flex justify-between items-center p-5 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--violet)] text-white flex items-center justify-center font-black">
                §
              </div>
              <div>
                <h2 className="font-bold text-[var(--text-primary)] tracking-tight">Instant UGC Production Agreement</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-[var(--violet-soft)] border border-[var(--violet-border)] text-[var(--violet)] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    OTP Verification Required
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--border-default)] rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 text-sm text-[var(--text-primary)] space-y-6">
            <div className="bg-[var(--bg-base)] p-5 rounded-xl border border-[var(--border-default)]">
              <h3 className="font-bold mb-3 border-b border-[var(--border-default)] pb-2">Deal Details (Fixed Term)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Product</span>
                  <span className="font-medium">{brief?.product_name || "Product"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Category</span>
                  <span className="font-medium">{brief?.category || brief?.deliverable_type || "UGC_VIDEO"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Fixed Fee</span>
                  <span className="font-mono font-bold text-lg">₹{(brief?.budget || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Delivery SLA</span>
                  <span className="font-medium text-emerald-600 font-bold">22 Hours from OTP Signature</span>
                </div>
              </div>
            </div>
            
            <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
              By legally executing this agreement with OTP verification, you commit to producing and submitting the requested vertical UGC content according to the brief requirements within 22 hours. The fixed fee is strictly guaranteed in Escrow.
            </p>

            <div className="pt-6 border-t border-[var(--border-strong)]">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-[var(--violet)]" />
                <h4 className="font-bold tracking-tight">Authorized Digital Signature (OTP)</h4>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1 sm:w-1/2">
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Registered Email</label>
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <Mail size={10} /> Verified Account
                    </span>
                  </div>
                  <input 
                    type="email"
                    value={otpEmail}
                    readOnly
                    disabled
                    className="w-full sm:w-1/2 px-4 py-2.5 bg-[var(--bg-base)]/80 border border-[var(--border-strong)] rounded-lg text-sm font-semibold text-[var(--text-primary)] cursor-not-allowed opacity-90 select-none outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">6-Digit Verification OTP</label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      maxLength={6}
                      placeholder="••••••"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="flex-1 max-w-[200px] px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] font-mono text-center tracking-[0.3em] rounded-lg text-lg font-bold focus:ring-2 focus:ring-[var(--violet)] outline-none transition-all"
                    />
                    <button 
                      onClick={handleSendOTP}
                      disabled={sendingOtp}
                      className="px-4 bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-bold rounded-lg hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                    >
                      {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-[var(--border-strong)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row justify-between gap-3 items-center">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Lock size={13} className="shrink-0" />
              <span>OTP verification is required to sign agreement and start timer.</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 text-[var(--text-secondary)] font-bold text-sm hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSign}
                disabled={loading || !otpSent || !otpCode || otpCode.trim().length < 4}
                className="px-6 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(124,58,237,0.3)] cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle size={16} /> Verify OTP & Sign Agreement
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
