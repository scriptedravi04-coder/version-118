import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { ShieldCheck, Clock, CheckCircle, ArrowLeft, Building2, User2, RefreshCw, XCircle, Edit3, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import PageSkeleton from "../../components/layout/PageSkeleton";

export default function KYCStatus() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [kycObj, setKycObj] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("verifications/me");
      setKycObj(data);
    } catch (err) {
      console.warn("Could not load KYC details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get("verifications/me");
        if (data) {
          setKycObj(data);
          if ((data.status === 'APPROVED' || data.status === 'approved') && refreshUser) {
            refreshUser();
          }
        }
      } catch (err) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = async () => {
    if (refreshUser) {
      await refreshUser();
    }
    await fetchStatus();
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[var(--bg-base)] p-6 md:p-8">
        <PageSkeleton />
      </div>
    );
  }

  const rawStatus = (kycObj?.status || "").toUpperCase();
  const isRejected = rawStatus === "REJECTED";
  const isApproved = !isRejected && (rawStatus === "APPROVED" || (!rawStatus && user?.verified));
  const isPending = !isRejected && !isApproved && (rawStatus === "PENDING" || rawStatus === "UNDER_REVIEW");
  const status = isApproved ? "approved" : isPending ? "pending" : isRejected ? "rejected" : "not_submitted";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-12 text-left min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--border-default)] hover:bg-foreground/5 transition-colors bg-[var(--bg-card)]"
        >
          <RefreshCw size={12} className="animate-hover" />
          Refresh Status
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[var(--bg-card)] border border-[var(--border-default)] p-8 sm:p-12 rounded-3xl relative overflow-hidden shadow-2xl flex flex-col items-center text-center max-w-2xl mx-auto"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--violet)]/5 rounded-full filter blur-3xl pointer-events-none" />

        {isApproved ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_8px_20px_rgba(16,185,129,0.15)] animate-bounce">
              <CheckCircle size={32} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
              KYC Verification Approved
            </h1>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 max-w-md">
              Congratulations! Your identity and business credentials have been thoroughly reviewed and approved by our compliance team. All platform features, campaigns, and payout withdrawals are active.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-6 max-w-md text-left flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Need to update your corporate details, tax registration, or payout accounts? Click <strong className="text-[var(--text-primary)]">Update Details</strong> below. Modifying your information will reset your status to <span className="font-semibold text-amber-500">Under Review</span> until re-approved by our compliance team.
              </p>
            </div>
          </>
        ) : isPending ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-6 shadow-[0_8px_20px_rgba(245,158,11,0.15)] animate-pulse">
              <Clock size={32} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
              KYC Under Active Review
            </h1>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 max-w-md">
              Your verification document package has been securely submitted and added to our manual compliance queue. Verification is typically completed within 24 to 48 hours. We will notify you immediately once approved!
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mb-6 shadow-[0_8px_20px_rgba(239,68,68,0.15)]">
              <XCircle size={32} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
              {isRejected ? "KYC Application Rejected" : "Verification Required"}
            </h1>
            {isRejected && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left text-xs text-red-400 mb-6 w-full max-w-md">
                <strong className="block mb-1 font-bold uppercase tracking-wider text-red-500">Rejection Reason:</strong>
                <p className="text-red-300 font-medium leading-relaxed">
                  {kycObj?.rejection_reason || kycObj?.admin_note || "Identity or business credentials matching failed. Documents were unreadable or mismatched."}
                </p>
              </div>
            )}
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8 max-w-md">
              {isRejected
                ? "Your previous verification submission was reviewed and rejected. Please review the feedback above and resubmit with updated documents."
                : "You haven't submitted your KYC documentation yet. Please start your verification process to activate payouts and brand deals."}
            </p>
            <button
              onClick={() => {
                if (user?.role === "brand") {
                  navigate("/brand/kyc");
                } else {
                  navigate("/creator/kyc");
                }
              }}
              className="px-6 py-3 bg-[var(--violet)] hover:bg-[#6c48d4] text-white font-semibold rounded-xl transition-all shadow-lg text-sm cursor-pointer"
            >
              {isRejected ? "Resubmit Verification" : "Start KYC Verification"}
            </button>
          </>
        )}

        <div className="border-t border-[var(--border-default)] pt-6 w-full flex flex-col sm:flex-row justify-center items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1.5">
            {user?.role === "brand" ? <Building2 size={14} /> : <User2 size={14} />}
            <span>Account Type: <strong className="text-[var(--text-secondary)] capitalize">{user?.role}</strong></span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--violet)]" />
            <span>Encrypted & Secured via SSL</span>
          </div>
        </div>

        {(isApproved || isPending) && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            <button
              onClick={() => {
                if (user?.role === "brand") {
                  navigate("/brand/kyc?edit=true");
                } else {
                  navigate("/creator/kyc?edit=true");
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--violet)] text-sm font-semibold rounded-xl transition-all text-[var(--text-primary)] flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
            >
              <Edit3 size={15} className="text-[var(--violet)]" />
              Update Details
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
