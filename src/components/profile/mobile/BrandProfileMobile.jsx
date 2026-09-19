import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Settings,
  Package,
  Globe,
  Shield,
  ShieldAlert,
  CreditCard,
  FileText,
  MonitorSmartphone,
  HelpCircle,
  Check,
  CheckCircle,
  Building,
  User,
  Share2,
  Edit2,
  MapPin,
  Sparkles,
  Briefcase,
  Gift,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";

import useBrandProfileData, { toList } from "./brand/useBrandProfileData";
import PublicProfileScreen from "./brand/PublicProfileScreen";
import CompanyDetailsScreen from "./brand/CompanyDetailsScreen";
import PreferencesScreen from "./brand/PreferencesScreen";
import ContactScreen from "./brand/ContactScreen";
import KycScreen from "./brand/KycScreen";
import LegalScreen from "./brand/LegalScreen";
import PaymentsScreen from "./brand/PaymentsScreen";
import SessionsScreen from "./brand/SessionsScreen";
import ReferScreen from "./brand/ReferScreen";
import HelpScreen from "./brand/HelpScreen";

// Brand Profile on mobile — the hub (mockup screen 1a) plus the ten push-route
// sub-screens (1b–1k), driven off a single `section` query param the same way
// CreatorMobileProfile.jsx drives its own sub-views. No desktop component is
// modified; BrandProfile.jsx and BrandSettings.jsx just mount this behind
// useIsMobile().

const SECTIONS = [
  "public", "company", "preferences", "contact", "kyc",
  "legal", "payments", "sessions", "refer", "help",
];

const ESCROW_HELD_STATUSES = [
  "deposited", "held", "in_escrow", "video_submitted", "pending", "escrow_held", "active", "approved",
];

export default function BrandProfileMobile({ brandData = null, parentLoading = false, campaigns: campaignsProp = null }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSection = searchParams.get("section") || searchParams.get("subscreen");
  const section = SECTIONS.includes(rawSection) ? rawSection : null;

  const goTo = useCallback((next) => {
    if (next) setSearchParams({ section: next });
    else setSearchParams({});
  }, [setSearchParams]);

  const goHub = useCallback(() => goTo(null), [goTo]);

  // BottomNav fires this when the account tab is tapped, so re-tapping "Brand"
  // comes back to the hub instead of leaving a sub-screen open.
  useEffect(() => {
    const handleReset = () => goHub();
    window.addEventListener("reset-mobile-profile-hub", handleReset);
    return () => window.removeEventListener("reset-mobile-profile-hub", handleReset);
  }, [goHub]);

  // Shared brand profile row + save, mirroring BrandSettings.jsx.
  const { profile, loading: profileLoading, saving, save, uploadImage } =
    useBrandProfileData(parentLoading ? null : brandData);

  // Live KYC — GET verifications/me, the same source BrandKyc.jsx uses. There is no
  // kyc_status column on brand_profiles to read instead.
  const [kyc, setKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(null);
  const [escrowAmount, setEscrowAmount] = useState(null);
  const [campaigns, setCampaigns] = useState(campaignsProp || []);

  useEffect(() => {
    if (Array.isArray(campaignsProp)) setCampaigns(campaignsProp);
  }, [campaignsProp]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("verifications/me").catch(() => ({ data: null }));
        if (!cancelled) setKyc(data && data.status !== "NOT_SUBMITTED" ? data : null);
      } catch (e) {
        console.warn("Error fetching brand KYC status:", e);
      } finally {
        if (!cancelled) setKycLoading(false);
      }
    })();

    (async () => {
      try {
        const { data } = await api.get("sessions", { bypassCache: true }).catch(() => ({ data: null }));
        if (!cancelled && Array.isArray(data)) setSessionCount(data.length);
      } catch (e) {
        console.warn("Error fetching sessions:", e);
      }
    })();

    (async () => {
      try {
        const { data } = await api.get("escrow-transactions").catch(() => ({ data: null }));
        if (!cancelled && Array.isArray(data)) {
          const active = data
            .filter((t) => ESCROW_HELD_STATUSES.includes((t.status || "").toLowerCase()))
            .reduce((acc, t) => acc + (Number(t.amount || t.gross_amount) || 0), 0);
          setEscrowAmount(active);
        }
      } catch (e) {
        console.warn("Error fetching escrow totals:", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // When mounted from BrandSettings (/brand/account) there's no campaigns prop, so
  // fetch the same list BrandProfile.jsx fetches.
  useEffect(() => {
    if (Array.isArray(campaignsProp) || !user?.user_id) return;
    let cancelled = false;
    (async () => {
      try {
        if (supabase) {
          const { data } = await supabase.from("campaigns").select("*").eq("brand_user_id", user.user_id);
          if (!cancelled && data) { setCampaigns(data); return; }
        }
        const res = await api.get("/campaigns").catch(() => null);
        if (!cancelled && Array.isArray(res?.data)) {
          setCampaigns(res.data.filter((c) => c.brand_user_id === user.user_id));
        }
      } catch (e) {
        console.warn("Error fetching campaigns:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [campaignsProp, user?.user_id]);

  // ---- Sub-screens (1b–1k) ----
  // The editable screens hold their own draft state, so they're keyed on load
  // completion to pick up the fetched row instead of keeping an empty draft.
  const formKey = profileLoading ? "loading" : "ready";

  if (section === "public") {
    return <PublicProfileScreen onBack={goHub} profile={profile} loading={profileLoading} campaigns={campaigns} kyc={kyc} />;
  }
  if (section === "company") {
    return <CompanyDetailsScreen key={formKey} onBack={goHub} profile={profile} saving={saving} onSave={save} uploadImage={uploadImage} />;
  }
  if (section === "preferences") {
    return <PreferencesScreen key={formKey} onBack={goHub} profile={profile} saving={saving} onSave={save} />;
  }
  if (section === "contact") {
    return <ContactScreen key={formKey} onBack={goHub} profile={profile} saving={saving} onSave={save} />;
  }
  if (section === "kyc") return <KycScreen onBack={goHub} kyc={kyc} loading={kycLoading} />;
  if (section === "legal") return <LegalScreen onBack={goHub} />;
  if (section === "payments") return <PaymentsScreen onBack={goHub} />;
  if (section === "sessions") return <SessionsScreen onBack={goHub} />;
  if (section === "refer") return <ReferScreen onBack={goHub} />;
  if (section === "help") return <HelpScreen onBack={goHub} />;

  // ---- Hub (1a) ----
  const brand = {
    name: profile.company_name || "Your brand",
    initials: String(profile.company_name || "B").charAt(0).toUpperCase(),
    industry: profile.industry || "—",
    teamSize: profile.teamSize || "—",
    location: profile.location || "India",
    isAgency: Boolean(profile.is_agency),
    isProfileComplete: Boolean(profile.industry && profile.description),
    hasNiches: toList(profile.niches).length > 0,
    hasPoc: Boolean(profile.pocName || profile.pocPhone || profile.pocEmail),
  };

  const kycStatusColor = {
    approved: { bg: "#E9F7EE", text: "#1B7F45", label: "APPROVED" },
    pending: { bg: "#FEF3C7", text: "#92400E", label: "PENDING" },
    under_review: { bg: "#FEF3C7", text: "#92400E", label: "UNDER REVIEW" },
    submitted: { bg: "#FEF3C7", text: "#92400E", label: "PENDING" },
    rejected: { bg: "#FEE2E2", text: "#DC2626", label: "REJECTED" },
  };
  const normalizedKyc = (kyc?.status || "").toLowerCase();
  const kycBadge = kycStatusColor[normalizedKyc] || { bg: "#F1F5F9", text: "#475569", label: "NOT STARTED" };
  const kycVerified = normalizedKyc === "approved";

  const escrowDisplay = escrowAmount === null ? "…" : `₹${Number(escrowAmount).toLocaleString("en-IN")}`;

  const calculateBrandProfileStrength = () => {
    let score = 0;
    const tips = [];
    if (profile.company_name) score += 15;
    else tips.push("Add company name");
    if (profile.logo) score += 20;
    else tips.push("Upload company logo");
    if (profile.description) score += 15;
    else tips.push("Add company overview");
    if (profile.industry) score += 15;
    else tips.push("Select industry");
    if (brand.hasNiches) score += 15;
    else tips.push("Set campaign preferences");
    if (brand.hasPoc) score += 10;
    else tips.push("Add point of contact");
    if (kycVerified) score += 10;
    else tips.push("Complete KYC verification");

    const tip = tips.length > 0 ? `Next: ${tips[0]}` : "Your brand profile is fully completed and verified!";
    return { score: Math.min(100, score), tip };
  };

  const { score: profileStrength, tip: profileStrengthTip } = calculateBrandProfileStrength();

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/brand/${user?.user_id || user?.id || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: brand.name,
          text: `Check out ${brand.name} on Ybex`,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // user closed share dialog
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Profile link copied to clipboard!");
      } catch (e) {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-display tracking-tight">Company Profile</h1>
          <p className="text-[11px] font-bold text-slate-400">Settings &amp; Brand Hub</p>
        </div>
      </header>

      <div className="px-5 py-4 space-y-6">
        {/* Open Identity Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-18 h-18 rounded-2xl border-2 border-purple-200 bg-slate-100 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt={brand.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-2xl text-[#7C3AED] font-display">
                  {brand.initials}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 truncate font-display">
                  {brand.name}
                </h2>
                {!kycLoading && (
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase ${kycVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {kycVerified ? "KYC Approved" : "Pending KYC"}
                  </span>
                )}
                {brand.isAgency && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase bg-purple-100 text-purple-700">
                    AGENCY
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-bold truncate mt-0.5">
                {brand.industry} · {brand.teamSize}
              </p>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {brand.location}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => goTo("company")}
              className="py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <Edit2 size={13} /> Edit Company Info
            </button>
            <button
              type="button"
              onClick={() => goTo("public")}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              Public Profile <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* KYC Verification Banner (when KYC not approved) */}
        {!kycLoading && !kycVerified && (
          <div className="bg-amber-50/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#E8552F] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Finish KYC for Verified Brand Status
                </h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                  Verify business PAN and GST to unlock verified badge, escrow payouts, and higher creator applications.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => goTo("kyc")}
              className="w-full py-2.5 bg-[#E8552F] hover:bg-[#D44723] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
            >
              <Shield size={13} /> {normalizedKyc === "rejected" ? "Re-submit KYC" : normalizedKyc === "pending" || normalizedKyc === "under_review" || normalizedKyc === "submitted" ? "Check KYC Status" : "Start KYC Verification"}
            </button>
          </div>
        )}

        {/* Profile Strength */}
        {!kycLoading && !profileLoading && profileStrength < 100 && (
          <div className="bg-slate-50/70 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#7C3AED]" />
                <span className="text-xs font-black text-slate-900">Profile strength</span>
              </div>
              <span className="text-xs font-black text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full">
                {profileStrength}%
              </span>
            </div>
            <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#7C3AED] to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${profileStrength}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {profileStrengthTip}
            </p>
          </div>
        )}

        {/* Agency Banner (only when not yet an agency) */}
        {!brand.isAgency && (
          <div className="bg-purple-50/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5">
                <Package size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900">Are you an agency?</h4>
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded">
                    NEW
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  Claim an agency badge and manage multiple brand profiles from one login.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => goTo("company")}
              className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1 pt-1 cursor-pointer"
            >
              Claim your agency badge <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* GROUP 1: COMPANY DETAILS */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Company Details
          </span>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => goTo("company")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center shrink-0">
                  <Building size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Company info</span>
                  <span className="text-[11px] text-slate-400 font-medium">Logo, overview, industry &amp; team size</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!brand.isProfileComplete && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-100 text-rose-700 rounded uppercase">
                    New
                  </span>
                )}
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goTo("preferences")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Globe size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Campaign preferences</span>
                  <span className="text-[11px] text-slate-400 font-medium">Target niches, creator criteria &amp; budget</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${brand.hasNiches ? "text-emerald-600" : "text-slate-400"}`}>
                  {brand.hasNiches ? "Set" : "Not set"}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goTo("contact")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Point of contact</span>
                  <span className="text-[11px] text-slate-400 font-medium">Authorized representative, email &amp; phone</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${brand.hasPoc ? "text-emerald-600" : "text-slate-400"}`}>
                  {brand.hasPoc ? "Added" : "Not set"}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>
          </div>
        </div>

        {/* GROUP 2: CAMPAIGNS & ESCROW */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Campaigns &amp; Escrow
          </span>
          <div className="divide-y divide-slate-100">
            <Link
              to="/brand/campaigns"
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Briefcase size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Active campaigns</span>
                  <span className="text-[11px] text-slate-400 font-medium">Live briefs, applications &amp; creators</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {campaigns.length} active
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </Link>

            <button
              type="button"
              onClick={() => goTo("payments")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Payments &amp; escrow</span>
                  <span className="text-[11px] text-slate-400 font-medium">Escrow deposits, wallet &amp; transaction history</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {escrowDisplay}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>
          </div>
        </div>

        {/* GROUP 3: COMPLIANCE & SECURITY */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Compliance &amp; Security
          </span>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => goTo("kyc")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">KYC compliance</span>
                  <span className="text-[11px] text-slate-400 font-medium">Company PAN, GST &amp; identity verification</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    kycVerified
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : normalizedKyc === "rejected"
                      ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                      : normalizedKyc === "pending" || normalizedKyc === "under_review" || normalizedKyc === "submitted"
                      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {kycBadge.label}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goTo("sessions")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <MonitorSmartphone size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Device sessions</span>
                  <span className="text-[11px] text-slate-400 font-medium">Active logins &amp; account security</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {sessionCount === null ? "1 active" : `${sessionCount} active`}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => goTo("legal")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Privacy &amp; terms</span>
                  <span className="text-[11px] text-slate-400 font-medium">Service agreement &amp; platform policies</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* GROUP 4: ACCOUNT & SUPPORT */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Account &amp; Support
          </span>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => goTo("refer")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Refer &amp; earn</span>
                  <span className="text-[11px] text-slate-400 font-medium">Earn ₹1,000 for each invited brand</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => goTo("help")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Help centre</span>
                  <span className="text-[11px] text-slate-400 font-medium">Guides, FAQs &amp; dedicated support</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Refer Banner Promo */}
        <button
          type="button"
          onClick={() => goTo("refer")}
          className="w-full rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white p-4 flex items-center justify-between shadow-xs hover:opacity-95 transition-opacity text-left active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
              🎁
            </div>
            <div>
              <h4 className="font-black text-xs text-white">Refer &amp; earn — get ₹1,000</h4>
              <p className="text-[11px] text-white/80 font-medium">Credited when their first campaign completes.</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/70 shrink-0" />
        </button>
      </div>
    </div>
  );
}
