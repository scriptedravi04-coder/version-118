import React from "react";
import { safeArray } from "../../utils/safeFormat";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ShieldCheck, 
  ArrowRight, 
  X, 
  Clock, 
  Building2,
  Wallet,
  Lock,
  BadgeCheck
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

/**
 * KycPromptModal
 * Professional modal prompted when a user tries to perform a KYC-gated action
 * (e.g. Brand creating a campaign or Creator applying to a campaign/UGC brief).
 */
export default function KycPromptModal({
  isOpen,
  onClose,
  role,
  title,
  subtitle,
  primaryText,
  secondaryText,
  actionType = "general",
  allowDraft = false,
  onContinueDraft
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = role || user?.role || "creator";
  const isBrand = userRole === "brand";

  if (!isOpen) return null;

  const handleStartKyc = () => {
    onClose?.();
    if (isBrand) {
      navigate("/brand/kyc");
    } else {
      navigate("/creator/kyc");
    }
  };

  const handleDraftClick = () => {
    if (onContinueDraft) {
      onContinueDraft();
    } else {
      onClose?.();
    }
  };

  // Content configurations based on role and action
  const getContent = () => {
    if (isBrand) {
      return {
        badge: "Business Verification Required",
        defaultTitle: actionType === "create_campaign" 
          ? "Complete Business Verification" 
          : "Verify Your Business Account",
        defaultSubtitle: "To create campaigns and collaborate with creators, please complete your corporate KYC verification (GSTIN / Business PAN). You can access verification anytime from Settings > Verification.",
        features: [
          {
            icon: <Clock size={16} className="text-slate-700" />,
            title: "Quick 2-Minute Verification",
            desc: "Fast onboarding with your GSTIN / PAN and basic company details."
          },
          {
            icon: <BadgeCheck size={16} className="text-slate-700" />,
            title: "Instant Campaign Publishing",
            desc: "Verified brand accounts receive automated review and live publishing."
          },
          {
            icon: <Building2 size={16} className="text-slate-700" />,
            title: "Access Verified Creators",
            desc: "Send direct briefs and secure collaboration deals with top creators."
          }
        ],
        primaryBtn: primaryText || "Start Verification",
        secondaryBtn: secondaryText || (allowDraft ? "Save as Draft" : "Remind Me Later")
      };
    }

    // Creator content
    return {
      badge: "Creator Verification Required",
      defaultTitle: actionType === "claim_ugc"
        ? "Verify Your Creator Profile"
        : "Complete Creator Verification",
      defaultSubtitle: "To apply for campaigns and receive secure bank payouts, please verify your identity and payout details in Settings > Verification.",
      features: [
        {
          icon: <Wallet size={16} className="text-slate-700" />,
          title: "Direct & Secure Bank Payouts",
          desc: "Link PAN and Bank account / UPI for zero-delay escrow payouts."
        },
        {
          icon: <BadgeCheck size={16} className="text-slate-700" />,
          title: "Higher Brand Deal Approvals",
          desc: "Verified creators stand out and receive priority consideration."
        },
        {
          icon: <Lock size={16} className="text-slate-700" />,
          title: "Bank-Grade Data Security",
          desc: "Your credentials and personal information are strictly encrypted."
        }
      ],
      primaryBtn: primaryText || "Start Verification",
      secondaryBtn: secondaryText || "Remind Me Later"
    };
  };

  const content = getContent();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-xl relative z-10 text-left overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          {/* Header Icon & Tag */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-800 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {content.badge}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Settings &gt; Verification</p>
            </div>
          </div>

          {/* Title and Subtitle */}
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {title || content.defaultTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
            {subtitle || content.defaultSubtitle}
          </p>

          {/* Feature highlights */}
          <div className="my-5 space-y-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
            { safeArray(content.features).map((feat, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200/60 mt-0.5 shrink-0">
                  {feat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">{feat.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <button
              onClick={handleStartKyc}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-black text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>{content.primaryBtn}</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={allowDraft ? handleDraftClick : onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer text-center"
            >
              {content.secondaryBtn}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
