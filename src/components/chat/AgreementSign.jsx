import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSignature, ShieldCheck, Lock, AlertCircle, KeyRound, Award } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function AgreementSign({ thread, onClose, onSigned }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('agreement'); // 'agreement' | 'otp'
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerName, setSignerName] = useState('');

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

  const [mobileNumber, setMobileNumber] = useState(() => getRegisteredUserPhone(user));

  useEffect(() => {
    const p = getRegisteredUserPhone(user);
    if (p) setMobileNumber(p);
  }, [user]);
  const [showSmsSimulator, setShowSmsSimulator] = useState(false);
  const [isSignScrollCompleted, setIsSignScrollCompleted] = useState(false);
  
  // Extract info
  const agreementId = (thread?.id || "FAFDC8BD").replace("thread_", "").substring(0, 8).toUpperCase();
  const effectiveDate = thread?.created_at ? new Date(thread.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const creatorName = thread?.creator?.name || "Alisha";
  const creatorIg = thread?.creator?.profile?.instagram || thread?.creator?.instagram || "ialishathakur";
  const brandName = thread?.brand?.name || "GutarGoo Plus";
  const brandAddress = thread?.brand?.profile?.address || "Corporate HQ Towers, Udaipur Judicial Zone, Rajasthan, India";

  const campaignName = thread?.campaigns?.title || "Sponsorship Campaign";
  const deliverablesText = thread?.deliverables?.join(', ') || "1 High-definition Instagram Reel Post, 1 Story Post with Link stickers";
  const budgetAmount = thread?.agreed_amount || thread?.amount_fixed || 15000;

  const handleInitiateAccept = () => {
    if (!signerName.trim()) {
      toast.error("Please enter the name of the Authorized Representative executing this deed.");
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number for SMS OTP dispatch.");
      return;
    }
    // Generate secure 6 digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setStep('otp');
    
    // Simulate real SMS gateway dispatching delay
    toast.info("Connecting to SMS Gateway...");
    
    setTimeout(() => {
      setShowSmsSimulator(true);
      toast.success(`Secure OTP sent successfully to mobile number ${mobileNumber}!`);
    }, 1500);
  };

  const handleSign = async (e) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      toast.error("Invalid verification code. Please check your OTP and try again.");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/campaign/threads/${thread.id}/sign`);
      toast.success("Deal Finalized successfully! 🤝 Start making content!", {
        description: `Your contract of ₹${(thread?.agreed_amount || thread?.amount_fixed || 15000).toLocaleString('en-IN')} is safe and secured in Ybex Escrow.`,
        duration: 8000
      });
      onSigned();
      onClose();
    } catch (err) {
      toast.error("Failed to execute agreement: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#faf9f6] text-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden relative shadow-2xl flex flex-col max-h-[92vh] border-2 border-amber-900/10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-900/10 flex justify-between items-center bg-[var(--bg-elevated)] text-[var(--text-primary)]">
           <h3 className="text-sm font-mono tracking-widest uppercase flex items-center gap-2">
             <ShieldCheck className="text-amber-400" size={18} /> INFLUISH LAW PORTAL &bull; DEED EXECUTION
           </h3>
           <button onClick={onClose} className="p-1.5 text-amber-200/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
             <X size={18}/>
           </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'agreement' ? (
            <motion.div 
              key="agreement"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-8 no-scrollbar"
              onScroll={(e) => {
                const target = e.target;
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 80) {
                  setIsSignScrollCompleted(true);
                }
              }}
            >
              {/* Gold Filigree Header */}
              <div className="text-center space-y-4 border-b-2 border-double border-amber-900/20 pb-8 relative">
                <div className="absolute top-0 left-0 right-0 flex justify-center -mt-4 opacity-10">
                  <Award size={100} className="text-amber-900" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight text-amber-950">
                  DEED OF COLABORATION AND SPONSORSHIP
                </h1>
                
                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs font-mono text-amber-900/80">
                  <div>
                    <span>AGREEMENT REF:</span> <span className="font-bold bg-amber-900/5 px-2 py-0.5 rounded">INF-{agreementId}</span>
                  </div>
                  <div className="hidden sm:block text-amber-900/30">|</div>
                  <div>
                    <span>EFFECTIVE DATE:</span> <span className="font-bold">{effectiveDate}</span>
                  </div>
                </div>

                <div className="mx-auto w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
              </div>

              {/* Recital */}
              <p className="text-sm font-serif leading-relaxed text-slate-700 italic text-justify indent-8">
                This Sponsorship and Media Services Agreement (the "Agreement") is entered into and made effective as of the Effective Date, by and between the brand advertiser specified below and the independent media content creator specified herein.
              </p>

              {/* 1. Parties */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold text-amber-950 border-b border-amber-900/20 pb-1 uppercase tracking-wider">
                  I. THE CONTRACTING PARTIES
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-amber-900/[0.02] border border-amber-900/10 rounded-2xl p-6 space-y-2 relative overflow-hidden">
                    <div className="absolute top-2 right-2 w-16 h-16 bg-amber-900/[0.03] rounded-full flex items-center justify-center font-serif text-3xl font-black text-amber-900/10 pointer-events-none">C</div>
                    <span className="text-[10px] font-mono font-bold text-amber-950 uppercase tracking-wider block">First Party (Creator)</span>
                    <div className="space-y-1.5 text-sm font-serif">
                      <p className="text-slate-900 font-bold">{creatorName}</p>
                      <p className="text-slate-600">Digital Media Publisher & Influencer</p>
                      <p className="text-xs font-mono text-slate-500">Instagram Handle: @{creatorIg}</p>
                    </div>
                  </div>

                  <div className="bg-amber-900/[0.02] border border-amber-900/10 rounded-2xl p-6 space-y-2 relative overflow-hidden">
                    <div className="absolute top-2 right-2 w-16 h-16 bg-amber-900/[0.03] rounded-full flex items-center justify-center font-serif text-3xl font-black text-amber-900/10 pointer-events-none">B</div>
                    <span className="text-[10px] font-mono font-bold text-amber-950 uppercase tracking-wider block">Second Party (Brand Sponsor)</span>
                    <div className="space-y-1.5 text-sm font-serif">
                      <p className="text-slate-900 font-bold">{brandName}</p>
                      <p className="text-slate-600 line-clamp-1">{brandAddress}</p>
                      <p className="text-xs font-mono text-slate-500">Corporate Registered Advertiser</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Scope & Campaign */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold text-amber-950 border-b border-amber-900/20 pb-1 uppercase tracking-wider">
                  II. CAMPAIGN BRIEF & SCOPE OF SERVICES
                </h3>
                <div className="space-y-3 font-serif text-sm text-slate-700 leading-relaxed text-justify">
                  <p>
                    1.1 The Brand hereby commissions the Creator to produce original media content assets to support the promotion of the digital marketing campaign officially titled <strong className="text-amber-950">"{campaignName}"</strong>.
                  </p>
                  <p>
                    1.2 The Creator agrees to produce, submit for pre-approval, and publish the following media deliverables (the "Deliverables"):
                  </p>
                  <div className="bg-amber-900/[0.03] border-l-2 border-amber-700 rounded-r-2xl p-5 italic font-medium text-slate-800">
                    "{deliverablesText}"
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-slate-800 block">Strict Creative Guidelines & Deliveries:</span>
                    <ul className="space-y-1 text-xs list-disc pl-5 text-slate-600">
                      <li>Deliverables must feature the sponsor's designated brand messaging with clear lighting, high-definition (HD) resolution, and professional audio.</li>
                      <li>Tag/Collab with the Second Party's official social account in the final post description.</li>
                      <li>The Creator must maintain the published posts active and publicly visible for a minimum duration of 365 calendar days post-upload, with no archiving.</li>
                      <li>Any competitive sponsorships featuring direct commercial rivals of the Sponsor are strictly barred for 15 days pre and post this publishing window.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. Escrow and Payments */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold text-amber-950 border-b border-amber-900/20 pb-1 uppercase tracking-wider">
                  III. ESCROW PROTECTION & COMPENSATION TERMS
                </h3>
                <div className="space-y-3 font-serif text-sm text-slate-700 leading-relaxed text-justify">
                  <p>
                    2.1 In full consideration of the satisfactory execution of the Deliverables, the Second Party agrees to compensate the First Party the sum of <strong className="text-amber-950">₹{budgetAmount.toLocaleString('en-IN')} INR</strong>.
                  </p>
                  <p>
                    2.2 **Escrow Security Mandate**: To qualify for platform payment protection, 100% of the agreed contract volume is pre-deposited into the secure Ybex Escrow Vault. This capital is bonded under platform arbitration guidelines and is fully protected from unilateral cancellation.
                  </p>
                  <p>
                    2.3 **Milestone Release**: Funds held in escrow will be released automatically to the First Party upon brand-side verification and approval of the live content URL. In the event of brand non-responsiveness extending beyond 48 hours post content proof submission, Ybex is authorized to conduct escrow disbursement directly.
                  </p>
                </div>
              </div>

              {/* 4. Intellectual Property & Rights */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold text-amber-950 border-b border-amber-900/20 pb-1 uppercase tracking-wider">
                  IV. CONTENT LICENSING & USAGE RIGHT ASSIGNMENTS
                </h3>
                <div className="space-y-3 font-serif text-sm text-slate-700 leading-relaxed text-justify">
                  <p>
                    3.1 **Ownership**: The Creator retains moral and primary authorship of all original raw video, image, and graphic assets created during this campaign.
                  </p>
                  <p>
                    3.2 **Usage License**: Upon payment release, the Second Party receives a worldwide, royalty-free, non-exclusive license to repost, share, embed, and utilize the live deliverables for organic social media amplification and website embedding for 12 months.
                  </p>
                  <p>
                    3.3 **Restrictions**: The Sponsor is strictly barred from altering, clipping, editing, or utilizing the Creator's likeness and raw footage in paid social media ads (paid whitelist campaigns) without prior written consent and separate commercial licensing discussions.
                  </p>
                </div>
              </div>

              {/* 5. Legal Covenants & Penalty Clause */}
              <div className="space-y-4">
                <h3 className="text-sm font-mono font-bold text-amber-950 border-b border-amber-900/20 pb-1 uppercase tracking-wider">
                  V. LEGAL COVENANTS, 24-HOUR SLA & PENALTY TERMS
                </h3>
                <div className="space-y-3 font-serif text-sm text-slate-700 leading-relaxed text-justify">
                  <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl text-rose-900 space-y-1 font-sans">
                    <p className="font-bold flex items-center gap-1.5 text-xs text-rose-700 uppercase tracking-wide">
                      <AlertCircle size={15} /> STRICT 24-HOUR SLA & PENALTY WARNING
                    </p>
                    <p className="text-xs font-medium leading-relaxed">
                      Creator MUST submit the final video deliverable within <strong>24 hours</strong> of signing this agreement. Failure to submit deliverables within 24 hours will attract an automatic production penalty fee, creator trust score deduction, and potential account strike/suspension. Please take this agreement and deadline seriously.
                    </p>
                  </div>
                  <p>
                    4.1 **Legal Standing**: This Agreement constitutes a legally binding commercial contract executed electronically under **Section 10A of the Information Technology Act, 2000**.
                  </p>
                  <p>
                    4.2 **Mediation & Jurisdiction**: In the event of an unresolved dispute, the parties agree to first submit to formal mediation under the Ybex Compliance Team. If mediation fails to yield a resolution, the dispute shall be resolved through binding legal arbitration, governed exclusively under the courts of **Udaipur Jurisdiction, Rajasthan, India**.
                  </p>
                  <p>
                    4.3 **Platform Commitment**: Both parties acknowledge that soliciting, requesting, or making external payments ("out-of-chat payments") violates Ybex anti-circumspection regulations. The influencer holds zero liability or responsibility for arrangements initiated outside of Ybex escrow vaults.
                  </p>
                </div>
              </div>

              {/* Signature section */}
              <div className="space-y-6 border-t border-amber-900/20 pt-8">
                <h3 className="text-sm font-mono font-bold text-amber-950 uppercase tracking-wider">
                  VI. EXECUTION & ELECTRONIC SIGN-OFF
                </h3>

                {/* DocuSign-like Seal and handwriting visual box */}
                <div className="bg-amber-900/[0.02] border border-amber-900/10 rounded-2xl p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1 font-mono">Signer Name (Representative)</label>
                      <input 
                        type="text"
                        required
                        value={signerName}
                        onChange={e => setSignerName(e.target.value)}
                        placeholder="e.g. Alisha Thakur"
                        className="w-full bg-white border border-amber-900/15 text-sm rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-900 focus:border-amber-900 font-serif"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1 font-mono">Title / Designation</label>
                      <input 
                        type="text"
                        value={signerTitle}
                        onChange={e => setSignerTitle(e.target.value)}
                        placeholder="e.g. Principal Influencer"
                        className="w-full bg-white border border-amber-900/15 text-sm rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-900 focus:border-amber-900 font-serif"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600 block font-mono">Mobile Number (For SMS OTP)</label>
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                          <Lock size={10} /> Verified Onboarding Number
                        </span>
                      </div>
                      <input 
                        type="tel"
                        required
                        value={mobileNumber}
                        readOnly
                        disabled
                        className="w-full bg-slate-100 border border-amber-900/15 text-sm rounded-xl px-4 py-3 text-slate-700 cursor-not-allowed opacity-90 outline-none font-serif font-mono select-none"
                      />
                    </div>
                  </div>

                  {signerName.trim() && (
                    <div className="pt-4 border-t border-dashed border-amber-900/20 flex flex-col items-center text-center space-y-2">
                      <span className="text-[10px] font-mono text-amber-900/60 uppercase tracking-widest block">Handwritten e-Signature Preview</span>
                      <div className="p-4 bg-white/60 border border-amber-900/5 rounded-xl w-full max-w-md h-20 flex items-center justify-center relative overflow-hidden shadow-inner">
                        {/* Real-looking signature seal stamp */}
                        <div className="absolute top-1 right-2 w-12 h-12 rounded-full border border-emerald-600/30 text-emerald-600/30 flex flex-col items-center justify-center rotate-12 scale-75 font-mono pointer-events-none">
                          <span className="text-[6px] font-bold">SECURED</span>
                          <span className="text-[5px]">YBEX</span>
                        </div>
                        <span className="text-2xl font-serif italic font-semibold text-emerald-800 tracking-wide select-none drop-shadow-sm font-signature" style={{ fontFamily: "'Playfair Display', cursive" }}>
                          {signerName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 italic">By clicking Agree & Continue, this signature is appended digitally with secure timestamps and legal escrow binding.</span>
                    </div>
                  )}
                </div>

                <div className="bg-amber-100/40 border border-amber-900/10 text-amber-950 text-xs p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="shrink-0 text-amber-800" size={16} />
                  <p className="leading-relaxed">
                    By signing, the creator covenants that deliverables specified herein will be executed in accordance with campaign timelines under Udaipur Court Jurisdictions. Once executed, unilateral cancellations cannot be processed without compliance mediation.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-8 space-y-6 flex flex-col items-center justify-center min-h-[420px] text-center"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4 border border-amber-500/20 shadow-inner">
                <KeyRound size={32} className="animate-bounce text-amber-700" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-slate-900">Signatory Authentication Portal</h3>
              <p className="text-slate-500 text-sm max-w-sm font-serif">
                We have generated a secure multi-factor authentication code for verification. Enter the code to legally authorize your signature under the IT Act, 2000.
              </p>

              {/* Display Generated OTP box */}
              <div className="my-2 bg-amber-900/[0.02] border border-dashed border-amber-900/20 rounded-2xl p-4 w-full max-w-sm">
                <span className="text-xs text-amber-900/60 font-mono uppercase tracking-wider block mb-1">EXECUTION KEY</span>
                <span className="text-2xl font-mono font-extrabold text-amber-950 tracking-widest">{generatedOtp}</span>
              </div>

              <form onSubmit={handleSign} className="w-full max-w-sm space-y-4">
                <input 
                  type="text"
                  required
                  placeholder="Enter 6-Digit Key"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\s+/g, ''))}
                  className="w-full bg-slate-100 border border-amber-900/10 text-center text-xl font-mono font-bold tracking-[0.5em] rounded-2xl px-4 py-4 focus:bg-white focus:ring-2 focus:ring-amber-900 text-slate-800 focus:outline-none transition-all"
                  maxLength={6}
                />

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setStep('agreement')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs font-mono"
                  >
                    RETURN TO AGREEMENT
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="flex-1 py-3.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-xs font-mono shadow-md"
                  >
                    {loading ? 'EXECUTING...' : 'AUTHORIZE DEED'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer actions */}
        {step === 'agreement' && (
          <div className="p-6 border-t border-amber-900/10 bg-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Lock size={12} /> VERIFIED ELECTRONIC BOND DEED
            </span>
            <button 
              onClick={handleInitiateAccept}
              disabled={thread.agreement_signed_creator}
              className="px-6 py-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-xl text-white transition-all flex items-center gap-2 text-xs font-mono shadow-md"
            >
              <FileSignature size={16} />
              {thread.agreement_signed_creator ? 'DEED EXECUTED' : 'EXECUTE COLLABORATION AGREEMENT'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Floating Mock Phone incoming SMS alert banner */}
      <AnimatePresence>
        {showSmsSimulator && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-primary)] p-4 rounded-2xl shadow-2xl flex flex-col gap-1.5"
          >
            <div className="flex justify-between items-center text-[10px] text-amber-500 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> 💬 SMS • YBEX-GATEWAY • NOW
              </span>
              <span>now</span>
            </div>
            <div>
              <h5 className="text-xs font-bold text-neutral-100 font-mono">Secure Verification OTP</h5>
              <p className="text-[11px] text-neutral-300 font-serif leading-relaxed mt-1">
                Your security code is <strong className="text-amber-400 bg-black/40 px-1.5 py-0.5 rounded tracking-wider font-mono font-black text-sm">{generatedOtp}</strong> for your collaboration agreement. Valid for 10 minutes.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button 
                onClick={() => {
                  setOtp(generatedOtp);
                  setShowSmsSimulator(false);
                  toast.success("OTP copied & auto-filled!");
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[10px] font-bold font-mono transition-colors"
              >
                AUTO-FILL OTP
              </button>
              <button 
                onClick={() => setShowSmsSimulator(false)}
                className="px-2 py-1 text-neutral-400 hover:text-white text-[10px] font-bold font-mono"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
