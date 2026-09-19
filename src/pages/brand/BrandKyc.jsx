import React, { useState, useEffect, useRef } from "react";
import { safeUpper } from "../../utils/safeFormat";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import KYCStatusBanner from "../../components/kyc/KYCStatusBanner";
import { 
  ShieldCheck, Building, Globe, Mail, Phone, User, Landmark, 
  UploadCloud, Edit3, Loader2, ArrowLeft, CheckCircle2, Trash2, ExternalLink, Lock, FileText, Check, AlertTriangle
} from "lucide-react";

export default function BrandKyc() {
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

  // Business Type: "registered" or "solo"
  const [businessType, setBusinessType] = useState("registered");

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  
  // Tax / ID
  const [gstCert, setGstCert] = useState("");
  const [brandPan, setBrandPan] = useState("");
  const [businessProofUrl, setBusinessProofUrl] = useState("");

  // Contact Person
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocDesignation, setPocDesignation] = useState("");

  // Upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileInputRef = useRef(null);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("verifications/me").catch(() => ({ data: null }));
      if (data && data.status !== "NOT_SUBMITTED") {
        setKycStatus(data);
        const docs = data.documents || {};
        setCompanyName(docs.company_name || user?.name || "");
        setGstCert(docs.gstin || docs.gst_cert || "");
        setBrandPan(docs.brand_pan || "");
        setPocName(docs.poc_name || user?.name || "");
        setPocDesignation(docs.poc_designation || "Brand Manager");
        setPocEmail(docs.poc_email || user?.email || "");
        setPocPhone(docs.poc_phone || user?.phone || "");
        setSiteUrl(docs.website || docs.website_url || "");
        setBusinessProofUrl(docs.business_proof_document_url || docs.gst_cert_url || docs.pan_card_url || "");
        
        if (!docs.gstin && !docs.gst_cert && docs.brand_pan) {
          setBusinessType("solo");
        }
      } else {
        setCompanyName(user?.name || "");
        setPocName(user?.name || "");
        setPocEmail(user?.email || "");
        setPocPhone(user?.phone || "");
        setPocDesignation("Founder / Marketing Lead");
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

  const handleFileUpload = async (file) => {
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
      setUploadingDoc(true);
      const res = await api.post("upload?bucket=kyc-documents", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data && res.data.url) {
        setBusinessProofUrl(res.data.url);
        toast.success("Business document uploaded successfully!");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Document upload failed.");
      console.error(err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const isPanValid = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((pan || "").trim().toUpperCase());

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!companyName.trim()) {
      toast.error("Please enter your Brand or Company Name.");
      return;
    }

    const cleanGst = (gstCert || "").trim().toUpperCase();
    const cleanPan = (brandPan || "").trim().toUpperCase();

    if (businessType === "registered") {
      if (!cleanGst && !cleanPan) {
        toast.error("Please provide either your GSTIN or Business PAN.");
        return;
      }
      if (cleanGst && cleanGst.length !== 15) {
        toast.error("GSTIN must be 15 characters (e.g. 07AAAAA0000A1Z5).");
        return;
      }
      if (cleanPan && !isPanValid(cleanPan)) {
        toast.error("PAN must follow valid 10-character format (e.g. ABCDE1234F).");
        return;
      }
    } else {
      if (cleanPan && !isPanValid(cleanPan)) {
        toast.error("PAN must follow valid 10-character format (e.g. ABCDE1234F).");
        return;
      }
    }

    if (!pocName.trim()) {
      toast.error("Contact person name is required.");
      return;
    }

    if (!pocEmail.trim()) {
      toast.error("Work email address is required.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("brand/kyc/submit", {
        companyName: companyName.trim(),
        gstNumber: cleanGst,
        panNumber: cleanPan,
        incorporationType: businessType === "registered" ? "registered_business" : "solo_brand",
        businessProofDocumentUrl: businessProofUrl || "",
        personName: pocName.trim(),
        designation: pocDesignation.trim() || "Brand Representative",
        workEmail: pocEmail.trim(),
        phone: pocPhone.trim(),
        websiteUrl: siteUrl.trim()
      });

      toast.success("Brand verification submitted successfully!");
      setIsEditing(false);
      if (refreshUser) await refreshUser();
      await loadKyc();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to submit brand verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-[var(--bg-base)] min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--violet)] animate-spin" />
          <div className="text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider">Loading Brand Verification...</div>
        </div>
      </div>
    );
  }

  const isApproved = kycStatus?.status === "approved" || kycStatus?.status === "APPROVED";
  const isPending = kycStatus?.status === "pending" || kycStatus?.status === "PENDING" || kycStatus?.status === "UNDER_REVIEW";
  const showForm = (!isApproved && !isPending) || isEditing;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 text-left min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
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
                Brand Verification
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> Verified Brand Badge
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
              Verify your brand to launch public campaigns, hire creators securely, and activate escrow protections.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] border border-[var(--border-default)] px-3 py-1.5 rounded-full">
            <Lock size={12} className="text-emerald-500" />
            <span>Fast Automated Review</span>
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
                <span className="text-[10px] font-mono tracking-widest text-emerald-500 font-bold uppercase block">Verification Status</span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Verified Brand Profile</h2>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-[var(--border-default)] hover:border-[var(--violet)] text-xs font-semibold rounded-xl text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-[var(--violet)]" /> Edit Brand Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-[var(--bg-elevated)]/40 p-4 rounded-xl border border-[var(--border-default)]">
              <h3 className="text-xs font-bold text-[var(--violet)] uppercase tracking-wider flex items-center gap-1.5">
                <Building size={14} /> Brand Details
              </h3>
              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Brand Name</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{companyName || user?.name}</span>
                </div>
                {siteUrl && (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">Website / Social</span>
                    <a href={siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--violet)] hover:underline block truncate">
                      {siteUrl}
                    </a>
                  </div>
                )}
                {gstCert && (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">GSTIN</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{gstCert}</span>
                  </div>
                )}
                {brandPan && (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">Business PAN</span>
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase">{brandPan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-[var(--bg-elevated)]/40 p-4 rounded-xl border border-[var(--border-default)]">
              <h3 className="text-xs font-bold text-[var(--violet)] uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} /> Contact Person
              </h3>
              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Contact Name</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{pocName || user?.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Work Email</span>
                  <span className="text-xs text-[var(--text-primary)]">{pocEmail || user?.email}</span>
                </div>
                {pocPhone && (
                  <div>
                    <span className="text-[11px] text-[var(--text-secondary)] block">Phone</span>
                    <span className="text-xs text-[var(--text-primary)]">{pocPhone}</span>
                  </div>
                )}
                {businessProofUrl && (
                  <a href={businessProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[var(--violet)] hover:underline pt-1">
                    <ExternalLink size={12} /> View Uploaded Business Proof
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
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Submitted for Brand Verification</h2>
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
              <p className="font-semibold text-[var(--text-primary)] mb-0.5">Verification usually takes under 24 hours.</p>
              <p>You can draft campaigns and browse top creators while our system validates your business details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-default)]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Brand / Company</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{companyName || user?.name}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)] block mt-0.5">{gstCert ? `GSTIN: ${gstCert}` : brandPan ? `PAN: ${brandPan}` : "Solo Brand"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-default)]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Authorized Contact</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{pocName || user?.name}</span>
              <span className="text-xs text-[var(--text-secondary)] block mt-0.5">{pocEmail || user?.email}</span>
            </div>
          </div>
        </div>
      ) : (
        // SIMPLE 1-PAGE BRAND KYC FORM
        <form onSubmit={handleSubmit} className="space-y-6">
          {isApproved && isEditing && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Updating Approved Verification Details</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  You are editing an already verified brand profile. Submitting new details will place your profile back into <strong className="text-amber-500">Under Review</strong> status for compliance approval.
                </p>
              </div>
            </div>
          )}

          {/* Card 1: Business Profile (Auto-filled) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Business Profile</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-5 ml-9">
              Your public brand details that creators see when you post campaigns.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Brand / Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Studio or My Brand"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              </div>

              {/* Website / Instagram Link */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Website or Instagram Link
                </label>
                <input
                  type="text"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="e.g. www.yourbrand.com or instagram.com/brand"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Tax / Business ID */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Tax & Business ID</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-5 ml-9">
              Provide GSTIN or Business PAN for invoicing, escrow payments, and tax receipts.
            </p>

            {/* Business type selector */}
            <div className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl mb-5 border border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setBusinessType("registered")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  businessType === "registered"
                    ? "bg-[var(--violet)] text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Building size={14} className="shrink-0" />
                <span className="whitespace-normal leading-tight">GST Registered Business</span>
              </button>
              <button
                type="button"
                onClick={() => setBusinessType("solo")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  businessType === "solo"
                    ? "bg-[var(--violet)] text-white shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <User size={14} className="shrink-0" />
                <span className="whitespace-normal leading-tight">Solo / Unregistered Brand</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {businessType === "registered" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                    <span>GSTIN Number</span>
                    {gstCert && (
                      <span className={`text-[10px] font-mono font-bold ${gstCert.length === 15 ? "text-emerald-500" : "text-amber-500"}`}>
                        {gstCert.length === 15 ? "✓ 15-digit GSTIN" : "15 digits required"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstCert}
                    onChange={(e) => setGstCert(safeUpper(e.target.value).trim())}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">15-digit Goods & Services Tax Number</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                  <span>{businessType === "registered" ? "Company / Director PAN" : "Owner PAN (Optional)"}</span>
                  {brandPan && (
                    <span className={`text-[10px] font-mono font-bold ${isPanValid(brandPan) ? "text-emerald-500" : "text-amber-500"}`}>
                      {isPanValid(brandPan) ? "✓ Valid Format" : "10-character format"}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={brandPan}
                  onChange={(e) => setBrandPan(safeUpper(e.target.value).trim())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Standard 10-character Permanent Account Number</p>
              </div>
            </div>

            {/* Optional Document Upload */}
            <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center justify-between">
                <span>Upload Business Document (Optional)</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">GST Certificate, PAN, or Registration</span>
              </label>

              <input
                type="file"
                ref={docFileInputRef}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />

              {businessProofUrl ? (
                <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Document Uploaded</span>
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                      </div>
                      <a href={businessProofUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--violet)] hover:underline block truncate">
                        Click to view uploaded document
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current?.click()}
                      className="text-xs px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--violet)] rounded-lg text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setBusinessProofUrl("")}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="border border-dashed border-[var(--border-default)] hover:border-[var(--violet)] bg-[var(--bg-elevated)]/20 hover:bg-[var(--bg-elevated)]/40 rounded-xl p-3.5 text-center cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  {uploadingDoc ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[var(--violet)] animate-spin" />
                      <span className="text-xs text-[var(--text-secondary)]">Uploading document...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={16} className="text-[var(--violet)]" />
                      <span className="text-xs text-[var(--text-secondary)]">Click to attach GST/PAN certificate (Optional)</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Contact Person (Auto-filled from auth) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Contact Representative</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-5 ml-9">
              Authorized person managing brand campaigns and creator negotiations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Contact Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pocName}
                  onChange={(e) => setPocName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              {/* Work Email */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Work Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={pocEmail}
                  onChange={(e) => setPocEmail(e.target.value)}
                  placeholder="name@brand.com"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={pocPhone}
                  onChange={(e) => setPocPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:border-[var(--violet)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>
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
                  <span>Submit Brand Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
