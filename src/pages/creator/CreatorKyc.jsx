import React, { useState, useEffect, useRef } from "react";
import { safeUpper } from "../../utils/safeFormat";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import KYCStatusBanner from "../../components/kyc/KYCStatusBanner";
import { 
  ShieldCheck, CreditCard, User, Landmark, UploadCloud, Edit3, 
  Loader2, ArrowLeft, QrCode, CheckCircle2, AlertCircle, Trash2, ExternalLink, Zap, Lock
} from "lucide-react";

export default function CreatorKyc() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "true");

  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Form Fields
  const [creatorName, setCreatorName] = useState("");
  const [creatorPan, setCreatorPan] = useState("");
  const [panCardUrl, setPanCardUrl] = useState("");
  
  // Payout Method: "upi" or "bank"
  const [payoutMethod, setPayoutMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState("");
  
  // Bank Details (if bank selected)
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [holderName, setHolderName] = useState("");

  // Uploading state
  const [uploadingPan, setUploadingPan] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const panFileInputRef = useRef(null);
  const qrFileInputRef = useRef(null);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("verifications/me").catch(() => ({ data: null }));
      if (data && data.status !== "NOT_SUBMITTED") {
        setKycStatus(data);
        const docs = data.documents || {};
        setCreatorName(docs.creator_name || user?.name || "");
        setCreatorPan(docs.creator_pan || docs.identity_num || "");
        setUpiId(docs.upi_id || "");
        setUpiQrCodeUrl(docs.upi_qr_code_url || docs.uploaded_files?.[3] || "");
        setBankAccount(docs.bank_account || "");
        setBankIfsc(docs.bank_ifsc || "");
        setBankName(docs.bank_name || "");
        setHolderName(docs.bank_holder_name || docs.creator_name || user?.name || "");
        
        if (docs.uploaded_files && docs.uploaded_files.length > 0) {
          setPanCardUrl(docs.uploaded_files[0] || "");
        }

        // If user already has bank details and no UPI, default to bank tab
        if (docs.bank_account && !docs.upi_id) {
          setPayoutMethod("bank");
        }
      } else {
        setCreatorName(user?.name || "");
        setHolderName(user?.name || "");
      }
    } catch (e) {
      console.warn("KYC Status empty", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get("verifications/me").catch(() => ({ data: null }));
        if (data && data.status !== "NOT_SUBMITTED") {
          setKycStatus(prev => {
            if (prev?.status !== data.status) {
              if (data.status === 'APPROVED' || data.status === 'approved') {
                if (refreshUser) refreshUser();
              }
              return data;
            }
            return prev;
          });
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF file.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      if (type === "pan") setUploadingPan(true);
      if (type === "qr") setUploadingQr(true);

      const res = await api.post("upload?bucket=kyc-documents", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.url) {
        if (type === "pan") {
          setPanCardUrl(res.data.url);
          toast.success("PAN Card photo uploaded!");
        }
        if (type === "qr") {
          setUpiQrCodeUrl(res.data.url);
          toast.success("UPI QR code uploaded!");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "File upload failed.");
      console.error(err);
    } finally {
      if (type === "pan") setUploadingPan(false);
      if (type === "qr") setUploadingQr(false);
    }
  };

  const isPanValid = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((pan || "").trim().toUpperCase());
  const isIfscValid = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test((ifsc || "").trim().toUpperCase());

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!creatorName.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }

    const cleanPan = (creatorPan || "").trim().toUpperCase();
    if (!cleanPan || !isPanValid(cleanPan)) {
      toast.error("Please enter a valid 10-digit PAN (e.g. ABCDE1234F).");
      return;
    }

    if (!panCardUrl) {
      toast.error("Please upload a photo of your PAN Card.");
      return;
    }

    if (payoutMethod === "upi") {
      if (!upiId.trim() && !upiQrCodeUrl) {
        toast.error("Please enter your UPI ID or upload your UPI QR code.");
        return;
      }
    } else {
      if (!bankAccount.trim()) {
        toast.error("Please enter your Bank Account Number.");
        return;
      }
      if (!bankIfsc.trim() || !isIfscValid(bankIfsc)) {
        toast.error("Please enter a valid IFSC code (e.g. HDFC0001234).");
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.post("creator/kyc/submit", {
        fullName: creatorName.trim(),
        panNumber: cleanPan,
        panCardUrl: panCardUrl,
        bankAccount: payoutMethod === "bank" ? bankAccount.trim() : "",
        ifsc: payoutMethod === "bank" ? bankIfsc.trim().toUpperCase() : "",
        bankName: payoutMethod === "bank" ? bankName.trim() : "",
        holderName: payoutMethod === "bank" ? (holderName.trim() || creatorName.trim()) : creatorName.trim(),
        upiId: payoutMethod === "upi" ? upiId.trim() : "",
        upiQrCodeUrl: payoutMethod === "upi" ? upiQrCodeUrl : "",
        instagramHandle: user?.instagram || "",
        followerCount: 0,
        nicheArray: []
      });

      toast.success("KYC submitted successfully! Fast verification in progress.");
      setIsEditing(false);
      if (refreshUser) await refreshUser();
      await loadKyc();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "KYC submission failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-[var(--bg-base)] min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--violet)] animate-spin" />
          <div className="text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider">Loading Verification...</div>
        </div>
      </div>
    );
  }

  const isApproved = kycStatus?.status === "approved" || kycStatus?.status === "APPROVED";
  const isPending = kycStatus?.status === "pending" || kycStatus?.status === "PENDING" || kycStatus?.status === "UNDER_REVIEW";
  const showForm = (!isApproved && !isPending) || isEditing;

  return (
    <div className="w-full max-w-none px-4 sm:px-6 md:px-8 py-8 text-left min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3 group cursor-pointer"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Creator Verification (KYC)
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> 2-Min Fast
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
              Verify your identity and payout info once to unlock direct brand collaborations and payouts.
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-1.5 rounded-full">
            <Lock size={12} className="text-emerald-500" />
            <span>Bank-grade 256-bit encrypted</span>
          </div>
        </div>
      </div>

      <KYCStatusBanner 
        status={kycStatus?.status} 
        rejectReason={kycStatus?.rejection_reason || kycStatus?.admin_note} 
      />

      {isApproved && !isEditing ? (
        // APPROVED STATE - Clean Summary Card
        <div className="bg-[var(--bg-card)] border border-emerald-500/20 p-6 sm:p-8 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap justify-between items-center pb-4 mb-6 border-b border-[var(--border-default)] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-500 font-bold uppercase block">KYC Status</span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Identity Verified & Payout Active</h2>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-[var(--border-default)] hover:border-[var(--violet)] text-xs font-semibold rounded-xl text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-[var(--violet)]" /> Edit Payout Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-[var(--bg-elevated)]/40 p-4 rounded-xl border border-[var(--border-default)]">
              <h3 className="text-xs font-bold text-[var(--violet)] uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} /> Identity Details
              </h3>
              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Legal Name</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{creatorName || user?.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">PAN Number</span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase">{creatorPan || "—"}</span>
                </div>
                {panCardUrl && (
                  <a href={panCardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[var(--violet)] hover:underline pt-1">
                    <ExternalLink size={12} /> View Uploaded PAN
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-[var(--bg-elevated)]/40 p-4 rounded-xl border border-[var(--border-default)]">
              <h3 className="text-xs font-bold text-[var(--violet)] uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={14} /> Payout Destination
              </h3>
              <div className="space-y-2 pt-1">
                {upiId ? (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">UPI ID</span>
                    <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{upiId}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">Bank Account</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{bankName} (•••• {bankAccount?.slice(-4)})</span>
                    <span className="text-xs font-mono text-[var(--text-secondary)] block">IFSC: {bankIfsc}</span>
                  </div>
                )}
                {upiQrCodeUrl && (
                  <a href={upiQrCodeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[var(--violet)] hover:underline pt-1">
                    <QrCode size={12} /> View UPI QR Code
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : isPending && !isEditing ? (
        // PENDING STATE - Fast Review View
        <div className="bg-[var(--bg-card)] border border-amber-500/20 p-6 sm:p-8 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap justify-between items-center pb-4 mb-6 border-b border-[var(--border-default)] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase block">Verification In Progress</span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Submitted for Fast Approval</h2>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-[var(--border-default)] hover:border-[var(--violet)] text-xs font-semibold rounded-xl text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-[var(--violet)]" /> Edit Details
            </button>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6 text-xs text-[var(--text-secondary)] flex items-start gap-3">
            
            <div>
              <p className="font-semibold text-[var(--text-primary)] mb-0.5">Verification usually takes less than 24 hours.</p>
              <p>You can still explore campaigns and receive collaboration invitations while our system reviews your submitted PAN and payout method.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-default)]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Applicant</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{creatorName || user?.name}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)] block mt-0.5">PAN: {creatorPan || "—"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-default)]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Payout Method</span>
              {upiId ? (
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{upiId} (UPI)</span>
              ) : bankAccount ? (
                <span className="text-sm font-semibold text-[var(--text-primary)]">{bankName || "Bank"} (•••• {bankAccount.slice(-4)})</span>
              ) : (
                <span className="text-sm text-[var(--text-secondary)]">Submitted</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        // SIMPLE 1-PAGE FORM (Fast, Direct, No boring multi-steps)
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Identity & PAN (Government requirement for TDS/Payouts) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Identity & Tax Information</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-5 ml-9">
              Required for government TDS compliance and legal proof of creator identity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Legal Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="Name matching your PAN card"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Must match your official PAN card name</p>
              </div>

              {/* PAN Number */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                  <span>PAN Number <span className="text-red-500">*</span></span>
                  {creatorPan && (
                    <span className={`text-[10px] font-mono font-bold ${isPanValid(creatorPan) ? "text-emerald-500" : "text-amber-500"}`}>
                      {isPanValid(creatorPan) ? "✓ Valid Format" : "10-digit format"}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={creatorPan}
                  onChange={(e) => setCreatorPan(safeUpper(e.target.value))}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Standard 10-character PAN</p>
              </div>
            </div>

            {/* PAN Card Photo Upload */}
            <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                <span>Upload PAN Card Photo <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-[var(--text-tertiary)]">JPG, PNG, PDF up to 10MB</span>
              </label>

              <input
                type="file"
                ref={panFileInputRef}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0], "pan");
                }}
              />

              {panCardUrl ? (
                <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)]">PAN Card Uploaded</span>
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      </div>
                      <a href={panCardUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--violet)] hover:underline block truncate">
                        Click to preview uploaded image
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => panFileInputRef.current?.click()}
                      className="text-xs px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--violet)] rounded-lg text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanCardUrl("")}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => panFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-elevated)]/30 hover:bg-[var(--bg-elevated)]/60 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  {uploadingPan ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-6 h-6 text-[var(--violet)] animate-spin" />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Uploading PAN photo...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)]">Click or Drag to Upload PAN Card</span>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Ensure text and photo on the card are clearly readable</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Payout Destination (UPI or Bank) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Payout Method</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-5 ml-9">
              Where you will receive your campaign earnings and brand payments directly.
            </p>

            {/* Smart Method Segmented Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl mb-5 border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setPayoutMethod("upi")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  payoutMethod === "upi"
                    ? "bg-[var(--violet)] text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Zap size={14} />
                <span>⚡ UPI ID (Fastest & Easy)</span>
              </button>
              <button
                type="button"
                onClick={() => setPayoutMethod("bank")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  payoutMethod === "bank"
                    ? "bg-[var(--violet)] text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Landmark size={14} />
                <span>🏦 Direct Bank Transfer</span>
              </button>
            </div>

            {payoutMethod === "upi" ? (
              <div className="space-y-4">
                {/* UPI ID Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    UPI VPA / ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!upiQrCodeUrl}
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.trim())}
                    placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Google Pay, PhonePe, Paytm, BHIM, or any UPI ID</p>
                </div>

                {/* Optional/Recommended UPI QR Code upload */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                    <span>UPI QR Code (Recommended)</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Optional for instant scan & pay</span>
                  </label>

                  <input
                    type="file"
                    ref={qrFileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], "qr");
                    }}
                  />

                  {upiQrCodeUrl ? (
                    <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center">
                          <QrCode size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">UPI QR Code Added</span>
                          <a href={upiQrCodeUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--violet)] hover:underline block">
                            Preview QR Code
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => qrFileInputRef.current?.click()}
                          className="text-xs px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg text-[var(--text-secondary)]"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpiQrCodeUrl("")}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => qrFileInputRef.current?.click()}
                      className="border border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-elevated)]/20 hover:bg-[var(--bg-elevated)]/40 rounded-xl p-3.5 text-center cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      {uploadingQr ? (
                        <Loader2 className="w-4 h-4 text-[var(--violet)] animate-spin" />
                      ) : (
                        <>
                          <QrCode size={16} className="text-[var(--violet)]" />
                          <span className="text-xs text-[var(--text-secondary)]">Click to upload screenshot of your UPI QR Code</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={payoutMethod === "bank"}
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>

                  {/* Account Holder Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                      Account Holder Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={payoutMethod === "bank"}
                      value={holderName || creatorName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="Name on bank account"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>

                  {/* Bank Account Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={payoutMethod === "bank"}
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value.trim())}
                      placeholder="Enter bank account number"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>

                  {/* IFSC Code */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                      <span>IFSC Code <span className="text-red-500">*</span></span>
                      {bankIfsc && (
                        <span className={`text-[10px] font-mono font-bold ${isIfscValid(bankIfsc) ? "text-emerald-500" : "text-amber-500"}`}>
                          {isIfscValid(bankIfsc) ? "✓ Valid IFSC" : "11-character format"}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required={payoutMethod === "bank"}
                      maxLength={11}
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(safeUpper(e.target.value).trim())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={submitting}
              className="ml-auto w-full sm:w-auto px-8 py-3 bg-[var(--violet)] hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Verification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Submit KYC for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
