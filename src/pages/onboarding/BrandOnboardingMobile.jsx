import React, { useState, useEffect, useRef } from "react";
import { safeJsonParse, safeUpper } from "../../utils/safeFormat";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Check, X as XIcon, Shield, Loader2, Instagram, Youtube, Twitter, Linkedin, Facebook } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { fetchPinCodeDetails } from "../../api/onboarding";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import { VALID_NICHES } from "../../lib/constants";
import MobileOnboardingHeader, { MobilePrimaryButton, MobileChip, MobileFieldLabel, MobileTextInput } from "../../components/onboarding/mobile/MobileOnboardingShell";

const INDUSTRY_OPTIONS = ["Marketing", "Beauty", "Fashion", "Food", "Tech", "Fitness", "Travel", "Gaming"];
const ALL_NICHES = VALID_NICHES;
const CAMPAIGN_TYPES = [
  { id: "paid", label: "Paid collaborations" },
  { id: "barter", label: "Barter / product" },
  { id: "onetime", label: "One-time content" },
  { id: "ambassador", label: "Long-term ambassador" },
];
const BUDGET_RANGES = ["Under \u20b910K", "\u20b910K\u2013\u20b950K", "\u20b950K\u2013\u20b92L", "\u20b92L+"];
const CREATOR_SIZES = ["Nano 1K\u201310K", "Micro 10K\u2013100K", "Macro 100K\u20131M", "Mega 1M+"];
const POSITIONS = ["Founder", "Marketing head", "Brand manager", "Agency lead", "Other"];

function initials(name) {
  return (name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export default function BrandOnboardingMobile({ user, onComplete }) {
  const navigate = useNavigate();
  const userId = user?.user_id || user?.id;
  const [screen, setScreen] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");
  const [linkChannel, setLinkChannel] = useState(null);
  const [isOtherDesignation, setIsOtherDesignation] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    companyName: "", isAgency: false, agencyType: "", logoUrl: "", industry: "", description: "", genderFocus: "All genders",
    representativeName: user?.name || "", representativeDesignation: "", representativeMobile: user?.phone ? user.phone.replace(/\D/g, "").slice(-10) : "", representativeMobileCountryCode: "+91",
    city: "", state: "", pinCode: "",
    campaignTypes: [], budgetRange: "", creatorSize: "", niches: "",
    instagramHandle: "", instagramConnected: false,
    youtubeChannelUrl: "", youtubeConnected: false,
    linkedinUrl: "", linkedinConnected: false,
    twitterHandle: "", twitterConnected: false,
    facebookUrl: "", facebookConnected: false,
  });

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`ybex_brand_onboarding_${userId}`);
      if (saved) {
        const parsed = safeJsonParse(saved, null);
        if (parsed?.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
      }
    } catch (e) {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(`ybex_brand_onboarding_${userId}`, JSON.stringify({ formData }));
    } catch (e) {}
  }, [formData, userId]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    set("logoUrl", previewUrl);
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("upload?bucket=profile-assets", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.url) {
        set("logoUrl", res.data.url);
        toast.success("Logo uploaded!");
      }
    } catch (err) {
      toast.error("Failed to upload logo. Local preview retained.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePinCode = async (val) => {
    set("pinCode", val);
    if (val.length === 6) {
      const details = await fetchPinCodeDetails(val);
      if (details) {
        set("city", details.city);
        set("state", details.state);
      }
    }
  };

  const toggleCampaignType = (id) => {
    setFormData((prev) => ({
      ...prev,
      campaignTypes: prev.campaignTypes.includes(id) ? prev.campaignTypes.filter((t) => t !== id) : [...prev.campaignTypes, id],
    }));
  };


  const goNext = (next) => setScreen(next);

  const publish = async () => {
    setSaving(true);
    try {
      const primaryPlatform = formData.instagramConnected ? "instagram" : formData.youtubeConnected ? "youtube" : "instagram";
      const primaryHandle = formData.instagramConnected ? formData.instagramHandle : formData.youtubeConnected ? formData.youtubeChannelUrl : "";

      const payload = {
        company_name: formData.companyName,
        is_agency: Boolean(formData.isAgency),
        industry: formData.industry,
        description: formData.description,
        gender_focus: formData.genderFocus,
        social_handle: primaryHandle,
        social_platform: primaryPlatform,
        instagram_handle: formData.instagramHandle,
        instagram_connected: formData.instagramConnected,
        youtube_channel_url: formData.youtubeChannelUrl,
        youtube_connected: formData.youtubeConnected,
        linkedin_url: formData.linkedinUrl,
        linkedin_connected: formData.linkedinConnected,
        twitter_handle: formData.twitterHandle,
        twitter_connected: formData.twitterConnected,
        facebook_url: formData.facebookUrl,
        facebook_connected: formData.facebookConnected,
        city: formData.city,
        state: formData.state,
        pin_code: formData.pinCode,
        campaign_types: formData.campaignTypes,
        budget_range: formData.budgetRange,
        creator_size: formData.creatorSize,
        preferred_niches: formData.niches,
        representative_name: formData.representativeName,
        representative_designation: formData.representativeDesignation,
        representative_mobile: (formData.representativeMobileCountryCode || "+91") + " " + formData.representativeMobile,
        onboarded_at: new Date().toISOString(),
        onboarding_completed: true,
      };

      await api.post("auth/onboard", { role: "brand", data: payload });

      await supabase.from("brand_profiles").upsert({
        user_id: userId,
        company_name: formData.companyName,
        is_agency: Boolean(formData.isAgency),
        industry: formData.industry,
        description: formData.description,
        logo: formData.logoUrl,
        city: formData.city,
        state: formData.state,
        representative_name: formData.representativeName,
        representative_designation: formData.representativeDesignation,
        representative_mobile: (formData.representativeMobileCountryCode || "+91") + " " + formData.representativeMobile,
        updated_at: new Date().toISOString(),
      });

      await supabase.from("users").update({ is_agency: Boolean(formData.isAgency), agency_type: formData.agencyType || null }).eq("user_id", userId);

      try {
        localStorage.removeItem(`ybex_brand_onboarding_${userId}`);
      } catch (e) {}

      setScreen(8);
    } catch (e) {
      console.error("BRAND ONBOARD ERROR (mobile):", e);
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalCTA = async (dest) => {
    try {
      await onComplete();
    } catch (e) {}
    navigate(dest);
  };

  const industries = INDUSTRY_OPTIONS.concat(ALL_NICHES.filter((n) => !INDUSTRY_OPTIONS.includes(n))).filter((n) =>
    n.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const previewSubtitle = () => {
    const parts = [];
    if (formData.industry) parts.push(formData.industry);
    if (screen >= 4 && formData.genderFocus) parts.push(formData.genderFocus);
    if (screen >= 5 && formData.representativeName) parts.push(formData.representativeName);
    if (screen >= 6 && formData.instagramConnected) parts.push("Instagram linked");
    return parts.join(" \u00b7 ");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column" }}>
      {screen === 1 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 1 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={1} onBack={() => navigate(-1)} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Your brand, as creators will see it.</h2>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              <motion.div
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                style={{ width: 68, height: 68, borderRadius: 20, background: "#F2F2F7", border: "1px dashed #D6D6DC", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", overflow: "hidden" }}
              >
                {uploadingLogo ? (
                  <Loader2 size={20} className="animate-spin" color="#ABABAB" />
                ) : formData.logoUrl ? (
                  <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} src={formData.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Plus size={24} color="#ABABAB" />
                )}
              </motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ font: "600 14px 'DM Sans',sans-serif", color: "#0A0A0A" }}>Add brand logo</div>
                <div style={{ marginTop: 5, font: "400 12.5px/1.45 'DM Sans',sans-serif", color: "#6B7280" }}>Brands with a logo get 3x more applications</div>
              </div>
            </div>
            <MobileFieldLabel>Brand / company name</MobileFieldLabel>
            <MobileTextInput value={formData.companyName} onChange={(v) => set("companyName", v)} placeholder="Your company name" />
            <div onClick={() => set("isAgency", !formData.isAgency)} style={{ marginTop: 10, height: 52, borderRadius: 14, background: "#fff", border: "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 12, padding: "0 15px", cursor: "pointer" }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: formData.isAgency ? "none" : "1.5px solid #D6D6DC", background: formData.isAgency ? "#7C3AED" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {formData.isAgency && <Check size={13} color="#fff" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, font: "500 14px 'DM Sans',sans-serif", color: "#0A0A0A" }}>Registering as an agency</div>
              <div style={{ font: "500 11.5px 'DM Sans',sans-serif", color: "#6B7280" }}>optional</div>
            </div>
            {formData.isAgency && (
              <div style={{ marginTop: 10, animation: "slideIn 0.2s ease-out" }}>
                <select
                  value={formData.agencyType || ""}
                  onChange={(e) => set("agencyType", e.target.value)}
                  style={{
                    width: "100%", height: 52, borderRadius: 14, border: "1px solid #E5E5EA", background: "#fff",
                    padding: "0 15px", font: "500 15px 'DM Sans',sans-serif", color: "#0A0A0A", outline: "none"
                  }}
                >
                  <option value="" disabled>Select Agency Type...</option>
                  <option value="Marketing Agency">Marketing Agency</option>
                  <option value="Branding Agency">Branding Agency</option>
                  <option value="PR Agency">PR Agency</option>
                  <option value="Influencer Agency">Influencer Agency</option>
                  <option value="Talent Management">Talent Management</option>
                  <option value="Creative Agency">Creative Agency</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={!formData.companyName.trim()} onClick={() => goNext(2)}>Next</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 2 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 1 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={1} onBack={() => setScreen(1)} preview={{ avatarNode: <BrandAvatar formData={formData} />, title: formData.companyName, subtitle: previewSubtitle() }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Which industry do you sell in?</h2>
            <p style={{ margin: "9px 0 0 mb-4", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Creators filter by this. Pick one.</p>
            <div style={{ marginTop: 10, animation: "slideIn 0.3s ease-out" }}>
              <UniversalTagSearch
                selectedTags={formData.industry ? [formData.industry] : []}
                onChange={newTags => set("industry", newTags[newTags.length - 1] || "")}
                type="category"
                placeholder="Search or create custom category..."
              />
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={!formData.industry} onClick={() => goNext(3)}>Next</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 3 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 2 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={2} onBack={() => setScreen(2)} preview={{ avatarNode: <BrandAvatar formData={formData} />, title: formData.companyName, subtitle: formData.industry }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Tell creators about your brand</h2>
            <p style={{ margin: "9px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>A line about what you sell, and who you sell it to.</p>
            <MobileFieldLabel right={`${formData.description.length} / 200`}>Brand description</MobileFieldLabel>
            <textarea
              value={formData.description}
              onChange={(e) => set("description", e.target.value.slice(0, 200))}
              placeholder="Tell creators what your brand does\u2026"
              style={{ marginTop: 9, height: 100, borderRadius: 14, background: "#fff", border: "1px solid #E5E5EA", padding: "13px 15px", font: "400 14px/1.6 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box" }}
            />
            <MobileFieldLabel>Gender focus</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["All genders", "Men", "Women", "Non-binary / others"].map((g) => (
                <MobileChip key={g} label={g} selected={formData.genderFocus === g} onClick={() => set("genderFocus", g)} />
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: 12, background: "#FFFBEB", borderLeft: "3px solid #D97706", display: "flex", gap: 11 }}>
              <div style={{ font: "500 12.5px/1.55 'DM Sans',sans-serif", color: "#92400E" }}>Fill this from your audience research \u2014 matching runs on it.</div>
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton onClick={() => goNext(4)}>Next</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 4 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 3 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={3} onBack={() => setScreen(3)} preview={{ avatarNode: <BrandAvatar formData={formData} />, title: formData.companyName, subtitle: `${formData.industry} \u00b7 ${formData.genderFocus}` }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Who's running this account?</h2>
            <p style={{ margin: "9px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Keep it private from creators.</p>
            <MobileFieldLabel>Representative name</MobileFieldLabel>
            <MobileTextInput value={formData.representativeName} onChange={(v) => set("representativeName", v)} placeholder="Your name" />
            <MobileFieldLabel>Position</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {POSITIONS.map((p) => {
                const isSelected = p === "Other" ? isOtherDesignation : (!isOtherDesignation && formData.representativeDesignation === p);
                return (
                  <MobileChip key={p} label={p} selected={isSelected} onClick={() => {
                    if (p === "Other") {
                      setIsOtherDesignation(true);
                      set("representativeDesignation", "");
                    } else {
                      setIsOtherDesignation(false);
                      set("representativeDesignation", p);
                    }
                  }} />
                );
              })}
            </div>
            {isOtherDesignation && (
              <div style={{ marginTop: 10, animation: "slideIn 0.3s ease-out" }}>
                <MobileTextInput value={formData.representativeDesignation} onChange={(v) => set("representativeDesignation", v)} placeholder="E.g. Content Head, Team Lead" />
              </div>
            )}
            <MobileFieldLabel>Mobile number</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", gap: 8 }}>
              <div style={{ width: 75 }}>
                <MobileTextInput value={formData.representativeMobileCountryCode} onChange={(v) => set("representativeMobileCountryCode", v)} placeholder="+91" />
              </div>
              <div style={{ flex: 1 }}>
                <MobileTextInput value={formData.representativeMobile} onChange={(v) => set("representativeMobile", v.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" inputMode="numeric" />
              </div>
            </div>
            <div style={{ marginTop: 10, font: "400 12px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>Used only for campaign calls. Never shown to creators.</div>
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={!formData.representativeName || !formData.representativeDesignation || formData.representativeMobile.length !== 10} onClick={() => goNext(5)}>Next</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 5 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 3 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={3} onBack={() => setScreen(4)} preview={{ avatarNode: <BrandAvatar formData={formData} />, title: formData.companyName, subtitle: `${formData.industry} \u00b7 ${formData.representativeName}` }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Link your brand's channels.</h2>
            <p style={{ margin: "9px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Link even one \u2014 brands with a linked channel get 2x more applications.</p>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
              <BrandChannelRow platform="instagram" label="Instagram" connected={formData.instagramConnected} onClick={() => setLinkChannel("instagram")} />
              <BrandChannelRow platform="youtube" label="YouTube" connected={formData.youtubeConnected} onClick={() => setLinkChannel("youtube")} />
              <BrandChannelRow platform="x" label="X (Twitter)" connected={formData.twitterConnected} onClick={() => setLinkChannel("x")} />
              <BrandChannelRow platform="linkedin" label="LinkedIn" connected={formData.linkedinConnected} onClick={() => setLinkChannel("linkedin")} />
              <BrandChannelRow platform="facebook" label="Facebook" connected={formData.facebookConnected} onClick={() => setLinkChannel("facebook")} />
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 12, paddingTop: 20 }}>
              <MobilePrimaryButton onClick={() => goNext(6)}>Next</MobilePrimaryButton>
            </div>
            <button onClick={() => goNext(6)} style={{ marginBottom: 20, background: "none", border: "none", textAlign: "center", font: "500 13px 'DM Sans',sans-serif", color: "#6B7280", cursor: "pointer" }}>
              Skip for now
            </button>
          </div>
        </>
      )}

      {screen === 6 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Brand setup \u00b7 4 of 4" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={4} onBack={() => setScreen(5)} preview={{ avatarNode: <BrandAvatar formData={formData} />, title: formData.companyName, subtitle: `${formData.industry} \u00b7 ${formData.instagramConnected ? "Instagram linked" : "No channels yet"}` }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>How will you work with creators?</h2>
            <p style={{ margin: "9px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Pick every type you run \u2014 creators see this before applying.</p>
            <MobileFieldLabel>Campaign types</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CAMPAIGN_TYPES.map((t) => (
                <MobileChip key={t.id} label={t.label} selected={formData.campaignTypes.includes(t.id)} onClick={() => toggleCampaignType(t.id)} />
              ))}
            </div>
            <MobileFieldLabel>Typical budget per campaign</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BUDGET_RANGES.map((b) => (
                <MobileChip key={b} label={b} selected={formData.budgetRange === b} onClick={() => set("budgetRange", b)} />
              ))}
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={formData.campaignTypes.length === 0 || !formData.budgetRange} onClick={() => goNext(7)}>Next</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 7 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} previewLabel="Creators\nsee this" stepLabel="Last step" saveLabel="Save & exit" onSave={() => navigate("/dashboard")} filledSteps={4} onBack={() => setScreen(6)} preview={{ avatarNode: <BrandAvatar formData={formData} size={44} />, title: formData.companyName, subtitle: `${formData.industry} \u00b7 ${formData.budgetRange} \u00b7 ${formData.creatorSize || ""}` }} />
          <div style={{ flex: 1, padding: "24px 20px 0", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Who should we match you with?</h2>
            <MobileFieldLabel>Preferred creator size</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CREATOR_SIZES.map((s) => (
                <MobileChip key={s} label={s} selected={formData.creatorSize === s} onClick={() => set("creatorSize", s)} />
              ))}
            </div>
            <MobileFieldLabel right="optional">Target niches</MobileFieldLabel>
            <div style={{ marginTop: 9 }}>
              <UniversalTagSearch
                selectedTags={formData.niches ? formData.niches.split(",").map((s) => s.trim()).filter(Boolean) : []}
                onChange={newTags => set("niches", newTags.join(", "))}
                type="niche"
                placeholder="Search or create a niche..."
              />
            </div>
            <div style={{ marginTop: 18, padding: 15, borderRadius: 14, background: "#ECFDF5", border: "1px solid #C7EFDD", display: "flex", gap: 12 }}>
              <Shield size={20} color="#059669" strokeWidth={1.9} />
              <div>
                <div style={{ font: "600 12.5px 'DM Sans',sans-serif", color: "#059669" }}>Escrow-protected settlements</div>
                <div style={{ marginTop: 5, font: "500 12.5px/1.55 'DM Sans',sans-serif", color: "#047857" }}>Every payment stays in neutral escrow until the contract is complete.</div>
              </div>
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 10, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={saving || !formData.creatorSize} onClick={publish} style={{ boxShadow: "0 14px 26px -20px rgba(124,58,237,.8)" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Publish brand profile"}
              </MobilePrimaryButton>
            </div>
            <button onClick={publish} disabled={saving || !formData.creatorSize} style={{ marginBottom: 20, background: "none", border: "none", textAlign: "center", font: "500 13px 'DM Sans',sans-serif", color: "#6B7280", cursor: "pointer" }}>
              Skip niches & publish
            </button>
          </div>
        </>
      )}

      {screen === 8 && <BrandProfileLiveScreen formData={formData} onFinish={handleFinalCTA} />}

      <AnimatePresence>
        {linkChannel && (
          <BrandLinkChannelSheet
            platform={linkChannel}
            formData={formData}
            set={set}
            onClose={() => setLinkChannel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BrandAvatar({ formData, size = 38 }) {
  if (formData.logoUrl) {
    return <img src={formData.logoUrl} alt="" style={{ width: size, height: size, borderRadius: size * 0.32, objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, background: "linear-gradient(135deg,#7C3AED,#9F62FF)", display: "flex", alignItems: "center", justifyContent: "center", font: `700 ${Math.round(size * 0.32)}px 'DM Sans',sans-serif`, color: "#fff", flexShrink: 0 }}>
      {initials(formData.companyName)}
    </div>
  );
}

const PLATFORM_COLORS = {
  instagram: "linear-gradient(135deg,#F9CE34,#EE2A7B,#6228D7)",
  youtube: "#FF0000",
  x: "#0A0A0A",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
};

const PLATFORM_GLYPH = { 
  instagram: <Instagram size={18} />, 
  youtube: <Youtube size={18} />, 
  x: <Twitter size={18} fill="currentColor" />, 
  linkedin: <Linkedin size={18} fill="currentColor" />, 
  facebook: <Facebook size={18} fill="currentColor" /> 
};

function BrandChannelRow({ platform, label, connected, onClick }) {
  const bg = platform === 'instagram' ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' : PLATFORM_COLORS[platform];
  return (
    <div onClick={onClick} style={{ height: 56, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 12, padding: "0 15px", cursor: "pointer", transition: "all 0.2s" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        {PLATFORM_GLYPH[platform] || ""}
      </div>
      <div style={{ flex: 1, font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{label}</div>
      <div style={{ height: 30, padding: "0 13px", borderRadius: 8, background: connected ? "#ECFDF5" : "#F5F0FF", display: "flex", alignItems: "center", font: "600 12px 'DM Sans',sans-serif", color: connected ? "#059669" : "#7C3AED", flexShrink: 0 }}>
        {connected ? "Linked" : "Link"}
      </div>
    </div>
  );
}

const CHANNEL_FIELD_MAP = {
  instagram: { handleField: "instagramHandle", connectedField: "instagramConnected", label: "Instagram handle", placeholder: "@yourbrand" },
  youtube: { handleField: "youtubeChannelUrl", connectedField: "youtubeConnected", label: "Channel URL", placeholder: "youtube.com/@yourbrand" },
  x: { handleField: "twitterHandle", connectedField: "twitterConnected", label: "Handle", placeholder: "@yourbrand" },
  linkedin: { handleField: "linkedinUrl", connectedField: "linkedinConnected", label: "Profile URL", placeholder: "linkedin.com/company/yourbrand" },
  facebook: { handleField: "facebookUrl", connectedField: "facebookConnected", label: "Page URL", placeholder: "facebook.com/yourbrand" },
};

function BrandLinkChannelSheet({ platform, formData, set, onClose }) {
  const cfg = CHANNEL_FIELD_MAP[platform];
  const [value, setValue] = useState(formData[cfg.handleField] || "");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await api.post("auth/social-verify", { platform, handle: value });
    } catch (e) {
      console.warn("[mobile brand onboarding] social-verify soft fallback:", e);
    }
    set(cfg.handleField, value);
    set(cfg.connectedField, Boolean(value.trim()));
    setBusy(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, background: "rgba(18,18,26,.4)" }} onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} style={{ position: "relative", background: "#fff", borderRadius: "22px 22px 0 0", padding: "10px 20px 24px", boxShadow: "0 -18px 44px -26px rgba(18,18,26,.4)" }}>
        <div style={{ height: 5, width: 44, borderRadius: 3, background: "#E5E5EA", margin: "0 auto 16px" }} />
        <div style={{ font: "600 17px 'DM Sans',sans-serif", letterSpacing: "-.3px", color: "#0A0A0A" }}>Link {platform === "x" ? "X (Twitter)" : platform[0].toUpperCase() + platform.slice(1)}</div>
        <MobileFieldLabel>{cfg.label}</MobileFieldLabel>
        <MobileTextInput value={value} onChange={setValue} placeholder={cfg.placeholder} />
        <div style={{ marginTop: 16 }}>
          <MobilePrimaryButton disabled={busy || !value.trim()} onClick={handleSave}>{busy ? "Verifying\u2026" : "Save"}</MobilePrimaryButton>
        </div>
      </motion.div>
    </div>
  );
}

function BrandProfileLiveScreen({ formData, onFinish }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", borderRadius: 22, overflow: "hidden", background: "#fff", border: "1px solid #ECECF0", boxShadow: "0 18px 40px -30px rgba(18,18,26,.3)" }}>
          <div style={{ height: 78, background: "linear-gradient(160deg,#16173A,#241F52)", display: "flex", alignItems: "center", justifyContent: "center", font: "600 15px 'DM Sans',sans-serif", letterSpacing: "2.4px", color: "rgba(255,255,255,.62)" }}>
            {safeUpper(formData.companyName)}
          </div>
          <div style={{ padding: "0 16px 18px" }}>
            <div style={{ marginTop: -31 }}>
              <div style={{ border: "4px solid #fff", borderRadius: 35, display: "inline-block" }}>
                <BrandAvatar formData={formData} size={62} />
              </div>
            </div>
            <div style={{ marginTop: 11, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ font: "700 18px/1.1 'DM Sans',sans-serif", letterSpacing: "-.5px", color: "#0A0A0A" }}>{formData.companyName}</div>
                <div style={{ marginTop: 4, font: "500 12.5px/1.1 'DM Sans',sans-serif", color: "#6B7280" }}>{formData.industry} \u00b7 India</div>
              </div>
              <div style={{ height: 34, padding: "0 15px", borderRadius: 9, background: "#7C3AED", display: "flex", alignItems: "center", font: "600 12.5px 'DM Sans',sans-serif", color: "#fff", flexShrink: 0 }}>Connect</div>
            </div>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 7 }}>
              {formData.budgetRange && <div style={{ height: 28, padding: "0 11px", borderRadius: 8, background: "#F5F0FF", display: "flex", alignItems: "center", font: "600 11px 'DM Sans',sans-serif", color: "#7C3AED" }}>{formData.budgetRange}</div>}
              {formData.creatorSize && <div style={{ height: 28, padding: "0 11px", borderRadius: 8, background: "#F2F2F7", display: "flex", alignItems: "center", font: "500 11px 'DM Sans',sans-serif", color: "#6B7280" }}>{formData.creatorSize.split(" ")[0]} creators</div>}
              {formData.campaignTypes.length > 0 && <div style={{ height: 28, padding: "0 11px", borderRadius: 8, background: "#F2F2F7", display: "flex", alignItems: "center", font: "500 11px 'DM Sans',sans-serif", color: "#6B7280" }}>{formData.campaignTypes.includes("paid") ? "Paid + UGC" : "Barter"}</div>}
            </div>
          </div>
        </div>
        <h2 style={{ margin: "30px 0 0", font: "600 24px/1.25 'DM Sans',sans-serif", letterSpacing: "-.8px", color: "#0A0A0A", textAlign: "center" }}>Your profile is live</h2>
        <p style={{ margin: "11px 0 0", maxWidth: 274, font: "400 14px/1.65 'DM Sans',sans-serif", color: "#6B7280", textAlign: "center" }}>
          Verified creators can now discover you. One step left \u2014 complete KYC to create your first campaign.
        </p>
      </div>
      <div style={{ padding: "0 20px 26px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <MobilePrimaryButton onClick={() => onFinish("/brand/kyc")}>
          <Shield size={16} color="#fff" /> Complete your KYC
        </MobilePrimaryButton>
        <button onClick={() => onFinish("/explore")} style={{ height: 52, borderRadius: 14, background: "#fff", border: "1px solid #E5E5EA", boxSizing: "border-box", font: "600 15px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer" }}>
          Explore creators
        </button>
      </div>
    </div>
  );
}
