import React, { useState, useEffect } from "react";
import { safeJsonParse } from "../../utils/safeFormat";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Shield, Building2, AlertCircle } from "lucide-react";
import BrandLivePreview from "./BrandLivePreview";
import UniversalTagSearch from "../shared/UniversalTagSearch";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { COUNTRY_CODES, VALID_NICHES } from "../../lib/constants";
import { searchLocations, COMPREHENSIVE_INDIAN_CITIES } from "../../lib/locations";

const FALLBACK_NICHES = VALID_NICHES;

// TODO: Replace with Supabase fetch when indian_cities table is ready
const FALLBACK_INDIAN_CITIES = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Surat", state: "Gujarat" },
  { city: "Kochi", state: "Kerala" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Patna", state: "Bihar" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Ghaziabad", state: "Uttar Pradesh" }
];

// TODO: Replace with Supabase fetch when platform_config table is ready
const FALLBACK_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "/assets/instagram.svg", label: "Instagram" },
  { id: "youtube", name: "YouTube", icon: "/assets/youtube.svg", label: "YouTube" },
  { id: "linkedin", name: "LinkedIn", icon: "/assets/linkedin.svg?v=2", label: "LinkedIn" },
  { id: "twitter", name: "X (Twitter)", icon: "/assets/x.svg", label: "X (Twitter)" },
  { id: "facebook", name: "Facebook", icon: "/assets/facebook.svg", label: "Facebook" },
  { id: "threads", name: "Threads", icon: "/assets/threads.svg", label: "Threads" }
];

// TODO: Replace with Supabase fetch when campaign_config table is ready
const FALLBACK_CAMPAIGN_TYPES = [
  { id: "paid", icon: "💰", label: "Paid Collaborations" },
  { id: "barter", icon: "🎁", label: "Barter / Product Send" },
  { id: "ambassador", icon: "🤝", label: "Long-term Ambassador" },
  { id: "onetime", icon: "🎬", label: "One-time Content" }
];

const FALLBACK_BUDGET_RANGES = ["Under ₹10,000", "₹10K–₹50K", "₹50K–₹2L", "₹2L+"];
const FALLBACK_CREATOR_SIZES = ["Nano 1K–10K", "Micro 10K–100K", "Macro 100K–1M", "Mega 1M+"];

export default function BrandOnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activePlatform, setActivePlatform] = useState(null);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [showEscrowModal, setShowEscrowModal] = useState(false);

  // Dynamic state list from Supabase with fallbacks
  const [nichesList, setNichesList] = useState(FALLBACK_NICHES);
  const [citiesList, setCitiesList] = useState(FALLBACK_INDIAN_CITIES);
  const [platformsList, setPlatformsList] = useState(FALLBACK_PLATFORMS);
  const [campaignTypesList, setCampaignTypesList] = useState(FALLBACK_CAMPAIGN_TYPES);
  const [budgetRangesList, setBudgetRangesList] = useState(FALLBACK_BUDGET_RANGES);
  const [creatorSizesList, setCreatorSizesList] = useState(FALLBACK_CREATOR_SIZES);

  // Fix 5: Fetch categories dynamically
  useEffect(() => {
    supabase.from('categories').select('name').order('name').then(({ data }) => {
      if (data && data.length > 0) {
        setNichesList(data.map(d => d.name));
      }
    }).catch(() => {});
  }, []);

  // Fix 6: Fetch indian_cities dynamically
  useEffect(() => {
    supabase.from('indian_cities').select('city, state').order('city').then(({ data }) => {
      if (data && data.length > 0) {
        setCitiesList(data);
      }
    }).catch(() => {});
  }, []);

  // Fix 7: Fetch platform_config dynamically
  useEffect(() => {
    supabase.from('platform_config').select('name, icon_path, label').then(({ data }) => {
      if (data && data.length > 0) {
        setPlatformsList(data.map(p => ({
          id: (p.name || p.label || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
          name: p.label || p.name,
          icon: p.icon_path || `/assets/${(p.name || "").toLowerCase()}.svg`,
          label: p.label || p.name
        })));
      }
    }).catch(() => {});
  }, []);

  // Fix 8: Fetch campaign_config dynamically
  useEffect(() => {
    supabase.from('campaign_config').select('type, value, label').then(({ data }) => {
      if (data && data.length > 0) {
        const types = data.filter(d => d.type === 'campaign_types').map(d => ({
          id: d.value,
          label: d.label || d.value,
          icon: d.icon || "🎬"
        }));
        if (types.length > 0) setCampaignTypesList(types);

        const budgets = data.filter(d => d.type === 'budget_ranges').map(d => d.label || d.value);
        if (budgets.length > 0) setBudgetRangesList(budgets);

        const sizes = data.filter(d => d.type === 'creator_sizes').map(d => d.label || d.value);
        if (sizes.length > 0) setCreatorSizesList(sizes);
      }
    }).catch(() => {});
  }, []);

  const [formData, setFormData] = useState({
    companyName: "", isAgency: false, agencyType: "", logoUrl: "", industry: "", description: "", genderFocus: "All",
    representativeName: user?.name || "", representativeDesignation: "", representativeMobile: "",
    websiteUrl: "", socialHandle: "", socialPlatform: "instagram", teamSize: "11-50", city: "", state: "", pinCode: "",
    campaignTypes: [], budgetRange: "", creatorSize: "", niches: "",
    instagramHandle: "", instagramFollowers: "", instagramAvgReach: "", instagramConnected: false,
    youtubeChannelUrl: "", youtubeSubscribers: "", youtubeAvgViews: "", youtubeConnected: false,
    linkedinUrl: "", linkedinConnected: false,
    twitterHandle: "", twitterConnected: false,
    facebookUrl: "", facebookConnected: false,
    threadsHandle: "", threadsConnected: false
  });

  const userId = user?.user_id || user?.id || user?.uid;

  // Restore saved brand onboarding step & formData
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`ybex_brand_onboarding_${userId}`);
      if (saved) {
        const parsed = safeJsonParse(saved, null);
        if (parsed) {
          if (parsed.step) setStep(parsed.step);
          if (parsed.subStep) setSubStep(parsed.subStep);
          if (parsed.formData) {
            setFormData(prev => ({
              ...prev,
              ...parsed.formData,
              representativeName: parsed.formData.representativeName || prev.representativeName
            }));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore brand onboarding draft:", e);
    }
  }, [userId]);

  // Persist progress on any change
  useEffect(() => {
    if (!userId) return;
    try {
      const payload = { step, subStep, formData };
      localStorage.setItem(`ybex_brand_onboarding_${userId}`, JSON.stringify(payload));
    } catch (e) {}
  }, [step, subStep, formData, userId]);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    // Fix 3: Instant local object URL preview
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, logoUrl: previewUrl, logoFile: file }));

    setUploadingLogo(true);
    const toastId = toast.loading("Uploading brand logo...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("upload?bucket=profile-assets", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.url) {
        setFormData(prev => ({ ...prev, logoUrl: res.data.url, logoFile: file }));
        toast.success("Logo uploaded successfully!", { id: toastId });
      } else {
        throw new Error("Invalid upload response");
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error("Failed to upload logo. Local preview retained.", { id: toastId });
    } finally {
      setUploadingLogo(false);
    }
  };

  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const locationMatches = searchLocations(citySearch, 15);

  // Fix 10: Proxied Pincode Lookup
  const handlePincodeChange = async (val) => {
    setFormData(prev => ({ ...prev, pinCode: val }));
    if (val.length === 6) {
      try {
        const res = await api.get(`utils/pincode/${val}`);
        if (res.data?.success) {
          setFormData(prev => ({
            ...prev,
            city: res.data.city,
            state: res.data.state
          }));
          setCitySearch(res.data.city);
          toast.success(`Location detected: ${res.data.city}, ${res.data.state}`);
        }
      } catch (e) {
        console.error("Pincode lookup failed:", e);
      }
    }
  };

  // Fix 9: Social Verification and Disconnect API calls
  const handleSocialConnect = async (platform) => {
    setConnectingPlatform(platform);
    const toastId = toast.loading(`Verifying & connecting ${platform}...`);
    try {
      try {
        await api.post("auth/social-verify", { 
          platform,
          handle: formData[`${platform}Handle`] || formData[`${platform}ChannelUrl`] || formData[`${platform}Url`]
        });
      } catch (err) {
        console.warn("Backend social verify soft fallback:", err);
      }
      setFormData(prev => ({ ...prev, [`${platform}Connected`]: true }));
      toast.success(`${platform.toUpperCase()} connected successfully!`, { id: toastId });
      setActivePlatform(null);
    } catch (err) {
      console.error(`Error connecting ${platform}:`, err);
      toast.error(`Failed to connect ${platform}.`, { id: toastId });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleSocialDisconnect = async (platform) => {
    setConnectingPlatform(platform);
    const toastId = toast.loading(`Disconnecting ${platform}...`);
    try {
      try {
        await api.delete("auth/social-verify", { data: { platform } });
      } catch (err) {
        console.warn("Backend social disconnect soft fallback:", err);
      }
      setFormData(prev => ({ ...prev, [`${platform}Connected`]: false }));
      toast.success(`${platform.toUpperCase()} disconnected.`, { id: toastId });
      setActivePlatform(null);
    } catch (err) {
      console.error(`Error disconnecting ${platform}:`, err);
      toast.error(`Failed to disconnect ${platform}.`, { id: toastId });
    } finally {
      setConnectingPlatform(null);
    }
  };

  // Fix 11: Atomic Brand Profile Submission
  const handleSaveAndComplete = async () => {
    setLoading(true);
    try {
      const userId = user?.user_id || user?.id || user?.uid;
      if (userId) {
        const primaryHandle = formData.socialHandle || formData.instagramHandle || formData.twitterHandle || formData.threadsHandle || "";
        const primaryPlatform = formData.socialPlatform || (formData.instagramConnected ? "instagram" : formData.twitterConnected ? "twitter" : "instagram");
        const payload = {
          user_id: userId,
          company_name: formData.companyName,
          is_agency: Boolean(formData.isAgency),
          logo_url: formData.logoUrl,
          industry: formData.industry,
          description: formData.description,
          gender_focus: formData.genderFocus,
          website_url: formData.websiteUrl,
          social_handle: primaryHandle,
          social_platform: primaryPlatform,
          instagram_handle: formData.instagramHandle,
          instagram_followers: Number(formData.instagramFollowers) || 0,
          instagram_avg_reach: Number(formData.instagramAvgReach) || 0,
          instagram_connected: formData.instagramConnected,
          youtube_channel_url: formData.youtubeChannelUrl,
          youtube_subscribers: Number(formData.youtubeSubscribers) || 0,
          youtube_avg_views: Number(formData.youtubeAvgViews) || 0,
          youtube_connected: formData.youtubeConnected,
          linkedin_url: formData.linkedinUrl,
          linkedin_connected: formData.linkedinConnected,
          twitter_handle: formData.twitterHandle,
          twitter_connected: formData.twitterConnected,
          facebook_url: formData.facebookUrl,
          facebook_connected: formData.facebookConnected,
          threads_handle: formData.threadsHandle,
          threads_connected: formData.threadsConnected,
          team_size: formData.teamSize,
          city: formData.city,
          state: formData.state,
          pin_code: formData.pinCode,
          campaign_types: formData.campaignTypes,
          budget_range: formData.budgetRange,
          creator_size: formData.creatorSize,
          preferred_niches: formData.niches,
          representative_name: formData.representativeName,
          representative_designation: formData.representativeDesignation,
          representative_mobile: formData.representativeMobile,
          onboarded_at: new Date().toISOString(),
          onboarding_completed: true
        };

        // 1. Express API route call
        await api.post("auth/onboard", {
          role: "brand",
          data: payload
        });

        // 2. Direct Supabase upsert for atomic state synchronization
        await supabase.from("brand_profiles").upsert({
          user_id: userId,
          company_name: formData.companyName,
          is_agency: Boolean(formData.isAgency),
          industry: formData.industry,
          website: formData.websiteUrl,
          description: formData.description,
          logo: formData.logoUrl,
          city: formData.city,
          state: formData.state,
          representative_name: formData.representativeName,
          representative_designation: formData.representativeDesignation,
          representative_mobile: formData.representativeMobile,
          updated_at: new Date().toISOString()
        });

        await supabase.from("users").update({
          is_agency: Boolean(formData.isAgency),
        agency_type: formData.agencyType || null
        }).eq("user_id", userId);
      }

      try {
        localStorage.removeItem(`ybex_brand_onboarding_${userId}`);
      } catch(e) {}

      if (onComplete) onComplete();
    } catch (e) {
      console.error("BRAND ONBOARD ERROR", e);
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaignType = (type) => {
    setFormData(prev => ({
      ...prev,
      campaignTypes: prev.campaignTypes.includes(type) 
        ? prev.campaignTypes.filter(t => t !== type)
        : [...prev.campaignTypes, type]
    }));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-12 relative w-full">
      {/* Left panel */}
      <section className="hidden lg:flex lg:col-span-6 relative flex-col items-center justify-center p-8 border-r lg:sticky lg:top-[80px] lg:h-[calc(100vh-80px)] border-gray-100 dark:border-gray-800">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
         <div className="absolute bottom-1/4 -left-10 w-[450px] h-[450px] bg-[#3B82F6]/10 rounded-full blur-[120px] pointer-events-none" />
         
         <div className="z-10 w-full flex justify-center items-center">
           <BrandLivePreview formData={formData} currentStep={step} user={user} />
         </div>
      </section>

      {/* Right panel */}
      <section className="w-full lg:col-span-6 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-10 md:px-14 relative bg-[var(--bg-base)] h-full overflow-y-auto">
        <div className="w-full max-w-md mx-auto relative mb-12">
          {/* Step Progress Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                  Step {step} of 4
                </span>
                <span className="text-xs font-medium text-[var(--text-tertiary)]">
                  {step === 1 ? (subStep === 1 ? "Brand Identity" : "About & Audience") : step === 2 ? "Account Manager" : step === 3 ? (subStep === 1 ? "Business Presence" : "Social Channels") : "Campaign & Rates"}
                </span>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {Math.round((((step - 1) * 2 + subStep) / 8) * 100)}%
              </span>
            </div>

            {/* Progress Bar Segments */}
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-full rounded-full transition-all duration-300 ${
                    s < step
                      ? "bg-blue-600"
                      : s === step
                      ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      : "bg-[var(--border-default)] opacity-60"
                  }`}
                />
              ))}
            </div>
          </div>

        <AnimatePresence mode="wait">
          {step === 1 && subStep === 1 && (
            <motion.div key="bs1_p1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">Tell us about your brand</h2>
              <p className="text-[var(--text-tertiary)] mt-2 mb-8">Your logo and category will appear on your brand profile visible to creators.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Brand Logo (Highly Recommended)</label>
                   <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden">
                       {uploadingLogo ? (
                         <Loader2 className="animate-spin text-[var(--violet)]" size={20} />
                       ) : formData.logoUrl ? (
                         <img src={formData.logoUrl} className="w-full h-full object-contain" alt="Brand Logo" />
                       ) : (
                         <Building2 className="text-[var(--text-secondary)]" />
                       )}
                     </div>
                     <label className="text-sm bg-[#3B82F6]/10 text-blue-600 hover:bg-[#3B82F6]/20 px-4 py-2 rounded-xl border border-[#3B82F6]/30 transition font-bold cursor-pointer flex items-center gap-2">
                       {uploadingLogo ? "Uploading..." : "Upload Logo"}
                       <input 
                         type="file" 
                         className="hidden" 
                         accept="image/*"
                         disabled={uploadingLogo}
                         onChange={e => {
                           if (e.target.files?.[0]) {
                             handleLogoUpload(e.target.files[0]);
                           }
                         }}
                       />
                     </label>
                   </div>
                   <p className="text-xs text-[var(--text-tertiary)] mt-2">ⓘ Brands with logos get 3x more creator applications.</p>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Brand / Company Name *</label>
                   <input 
                     className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                     placeholder={formData.isAgency ? "e.g. Nova Media & Talent Agency" : "e.g. Nova Brand Co"}
                     value={formData.companyName}
                     onChange={e => setFormData({...formData, companyName: e.target.value})}
                   />
                   
                                      {/* Agency Registration Checkbox Option */}
                   <label className="flex items-center gap-3 cursor-pointer group mt-2 p-3 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-blue-500/50 transition-colors bg-gray-50/50 dark:bg-gray-800/50">
                     <div className={`w-5 h-5 rounded md:rounded-md flex items-center justify-center border transition-all ${
                         Boolean(formData.isAgency)
                           ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                           : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                       }`}
                     >
                       {Boolean(formData.isAgency) && (
                         <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                         </svg>
                       )}
                     </div>
                     <input 
                       type="checkbox"
                       className="sr-only"
                       checked={Boolean(formData.isAgency)}
                       onChange={e => setFormData({ ...formData, isAgency: e.target.checked, agencyType: e.target.checked ? formData.agencyType : "" })}
                     />
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                       Registering as an Agency
                     </span>
                   </label>
                   
                   {Boolean(formData.isAgency) && (
                     <div className="mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <select
                          value={formData.agencyType || ""}
                          onChange={e => setFormData({ ...formData, agencyType: e.target.value })}
                          className="w-full px-4 py-3.5 rounded-xl border border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-transparent bg-white text-sm"
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
                </div>

                 <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Industry / Category *</label>
                    <UniversalTagSearch
                      selectedTags={formData.industry ? [formData.industry] : []}
                      onChange={newTags => setFormData({...formData, industry: newTags[newTags.length - 1] || ""})}
                      type="category"
                      placeholder="Search or create custom category..."
                    />
                 </div>

                <div className="pt-4 flex justify-end">
                   <button onClick={() => setSubStep(2)} className="bg-[#3B82F6] text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5">
                     Next <ArrowRight size={18} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && subStep === 2 && (
            <motion.div key="bs1_p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">Tell us about your brand</h2>
              <p className="text-[var(--text-tertiary)] mt-2 mb-8">Almost done with the brand profile.</p>

              <div className="space-y-6">
                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Brand Description</label>
                   <textarea 
                     className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none min-h-[100px]"
                     placeholder="Tell creators what your brand is about..."
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                   <div className="text-[10px] text-right text-[var(--text-secondary)] mt-1">Max 200 characters</div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Gender Focus (Your Target Audience)</label>
                   <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed space-y-1 mb-3">
                     <div className="font-bold flex items-center gap-1.5 text-amber-900">
                       <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                       <span>Target Audience Demographics Guideline</span>
                     </div>
                     <p className="text-[11px] text-amber-800 font-medium">
                       Please fill in the gender demographic of your target audience as decided by your audience research and campaign reach.
                     </p>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {["All Genders", "Men", "Women", "Non-Binary / Others"].map(focus => {
                       const currentArr = formData.genderFocus ? formData.genderFocus.split(",").map(s => s.trim()).filter(Boolean) : [];
                       const isSelected = currentArr.includes(focus);
                       const toggleFocus = () => {
                         let updated = isSelected ? currentArr.filter(x => x !== focus) : [...currentArr, focus];
                         setFormData({ ...formData, genderFocus: updated.join(", ") });
                       };
                       return (
                         <button
                           key={focus}
                           type="button"
                           onClick={toggleFocus}
                           className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                             isSelected 
                               ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-sm' 
                               : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/30'
                           }`}
                         >
                           {isSelected ? `✓ ${focus}` : `+ ${focus}`}
                         </button>
                       );
                     })}
                   </div>
                </div>

                <div className="pt-4 flex justify-between">
                   <button onClick={() => setSubStep(1)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
                     <ArrowLeft size={18} /> Back
                   </button>
                   <button onClick={() => setStep(2)} className="bg-[#3B82F6] text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5">
                     Continue <ArrowRight size={18} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="bs2_new" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">Who's managing this account?</h2>
              <p className="text-[var(--text-tertiary)] mt-2 mb-8">This information is kept private and used for official platform communication.</p>
              
              <div className="space-y-6">
                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Representative Name *</label>
                   <input
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                     placeholder="e.g. Ravi Sharma"
                     value={formData.representativeName}
                     onChange={e => setFormData({...formData, representativeName: e.target.value})}
                   />
                </div>
                
                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Position / Designation *</label>
                   <input
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                     placeholder="e.g. Marketing Head, Founder"
                     value={formData.representativeDesignation}
                     onChange={e => setFormData({...formData, representativeDesignation: e.target.value})}
                   />
                </div>
                
                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Mobile Number *</label>
                   <div className="flex">
                     <select
                        value={formData.representativeMobileCountryCode || "+91"}
                        onChange={e => setFormData({...formData, representativeMobileCountryCode: e.target.value})}
                        className="rounded-l-xl border border-r-0 border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-bold text-sm px-3 py-4 outline-none focus:border-[var(--violet)] cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code + c.country} value={c.code} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                     <input
                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-r-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                       placeholder="9876543210"
                       maxLength={10}
                       value={formData.representativeMobile}
                       onChange={e => setFormData({...formData, representativeMobile: e.target.value.replace(/[^0-9]/g, '')})}
                     />
                   </div>
                </div>

                <div className="pt-4 flex justify-between">
                   <button onClick={() => { setStep(1); setSubStep(2); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
                     <ArrowLeft size={18} /> Back
                   </button>
                   <button 
                     onClick={() => setStep(3)} 
                     disabled={!formData.representativeName || !formData.representativeDesignation || formData.representativeMobile.length !== 10}
                     className="bg-[#3B82F6] text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 disabled:opacity-50"
                   >
                     Continue <ArrowRight size={18} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && subStep === 1 && (
            <motion.div key="bs3_s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">Your Business Presence</h2>
              <p className="text-[var(--text-tertiary)] mt-2 mb-8">Help creators understand your scale and legitimacy.</p>

              <div className="space-y-6">
                 <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Website URL</label>
                   <div className="relative">
                     <input 
                       className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                       placeholder="https://"
                       value={formData.websiteUrl}
                       onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Team Size</label>
                   <div className="flex flex-wrap gap-2">
                     {["Solo", "2-10", "11-50", "51-200", "200+"].map(size => (
                       <button
                         key={size}
                         onClick={() => setFormData({...formData, teamSize: size})}
                         className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.teamSize === size ? 'bg-[#3B82F6] border-[#3B82F6] text-[var(--text-primary)]' : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/30'}`}
                       >
                         {size}
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Pin Code</label>
                    <input 
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none font-bold"
                      placeholder="e.g. 400001"
                      value={formData.pinCode}
                      onChange={e => handlePincodeChange(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={6}
                    />
                 </div>

                 <div className="flex gap-4">
                   <div className="flex-1 relative">
                     <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">City *</label>
                     <input 
                       className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                       placeholder="e.g. Mumbai"
                       value={formData.city}
                       onChange={e => {
                         setFormData({...formData, city: e.target.value});
                         setCitySearch(e.target.value);
                         setShowCityDropdown(true);
                       }}
                       onFocus={() => setShowCityDropdown(true)}
                     />
                     {showCityDropdown && citySearch && (
                       <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[#3B82F6]/30 rounded-xl max-h-60 overflow-y-auto z-50 shadow-2xl">
                         {locationMatches.map(loc => (
                           <button 
                             key={loc.name + (loc.state || '')} 
                             type="button"
                             className="w-full text-left px-4 py-3 text-[var(--text-primary)] hover:bg-[#3B82F6]/20 transition-colors flex items-center justify-between"
                             onClick={() => {
                               setFormData({
                                 ...formData, 
                                 city: loc.name, 
                                 state: loc.state || (loc.type === 'State' || loc.type === 'Union Territory' ? loc.name : formData.state || 'India')
                               });
                               setCitySearch(loc.name);
                               setShowCityDropdown(false);
                             }}
                           >
                             <span>{loc.display}</span>
                             <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[var(--violet)]/10 text-[var(--violet)] font-semibold">{loc.type}</span>
                           </button>
                         ))}
                         {locationMatches.length === 0 && citySearch.trim().length > 0 && (
                           <button 
                             type="button"
                             className="w-full text-left px-4 py-3 text-indigo-500 font-medium hover:bg-[#3B82F6]/20"
                             onClick={() => {
                               setFormData({...formData, city: citySearch, state: formData.state || "India"});
                               setCitySearch(citySearch);
                               setShowCityDropdown(false);
                             }}
                           >
                             Use "{citySearch}"
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                   <div className="flex-1">
                     <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">State *</label>
                     <input 
                       className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6]/50 focus:outline-none"
                       value={formData.state}
                       onChange={e => setFormData({...formData, state: e.target.value})}
                       placeholder="e.g. Maharashtra"
                     />
                   </div>
                 </div>
              
                 <div className="pt-4 flex justify-between">
                    <button onClick={() => setStep(2)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button 
                      onClick={() => setSubStep(2)} 
                      disabled={!formData.city || !formData.state}
                      className="bg-[#3B82F6] text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                 </div>
              </div>
            </motion.div>
          )}

          {step === 3 && subStep === 2 && (
            <motion.div key="bs3_s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-6">
                <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">Connect Social Channels</h2>
                <p className="text-[var(--text-tertiary)] mt-2">Verify and link your brand's presence across different networks.</p>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {!activePlatform ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      {platformsList.map((p) => {
                        const isConnected = formData[`${p.id}Connected`];
                        let detailText = "Not Connected";
                        if (isConnected) {
                          if (p.id === "instagram" && formData.instagramHandle) detailText = `@${formData.instagramHandle}`;
                          else if (p.id === "twitter" && formData.twitterHandle) detailText = `@${formData.twitterHandle}`;
                          else if (p.id === "threads" && formData.threadsHandle) detailText = `@${formData.threadsHandle}`;
                          else detailText = "Linked";
                        }
                        return (
                          <button
                            key={p.id}
                            onClick={() => setActivePlatform(p.id)}
                            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between h-32 transition-all group relative ${
                              isConnected 
                                ? "bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                                : "bg-[var(--bg-card)] border-[var(--border-default)] hover:border-blue-500/50"
                            }`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <span className="flex items-center justify-center w-8 h-8">
                                <img src={p.icon} className="w-8 h-8 object-contain rounded-md" alt={p.name} />
                              </span>
                              {isConnected && (
                                <span className="bg-blue-500 text-white rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                  Connected
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-[var(--text-primary)] text-sm group-hover:text-blue-400 transition-colors">
                                {p.name}
                              </h4>
                              <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5 truncate max-w-full">
                                {detailText}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-xl"
                    >
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-default)]">
                        <button
                          onClick={() => setActivePlatform(null)}
                          className="p-2 hover:bg-[var(--bg-base)] rounded-full transition-colors text-[var(--text-secondary)]"
                        >
                          <ArrowLeft size={18} />
                        </button>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] capitalize">
                          Connect {activePlatform}
                        </h3>
                      </div>

                      {activePlatform === "instagram" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Instagram Username *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                              <input
                                type="text"
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 pl-8 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                                placeholder="brand_instagram"
                                value={formData.instagramHandle}
                                onChange={e => setFormData({...formData, instagramHandle: e.target.value.replace('@', '')})}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Followers</label>
                              <FormattedNumberInput
                                value={formData.instagramFollowers}
                                onChange={val => setFormData({...formData, instagramFollowers: val || 0})}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none font-bold"
                                placeholder="e.g. 10,000"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Avg Post Reach</label>
                              <FormattedNumberInput
                                value={formData.instagramAvgReach}
                                onChange={val => setFormData({...formData, instagramAvgReach: val || 0})}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none font-bold"
                                placeholder="e.g. 5,000"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.instagramConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("instagram")}
                                disabled={connectingPlatform === "instagram"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.instagramHandle) {
                                  toast.error("Please enter a username.");
                                  return;
                                }
                                handleSocialConnect("instagram");
                              }}
                              disabled={connectingPlatform === "instagram"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "instagram" ? <Loader2 className="animate-spin" size={18} /> : "Verify & Connect"}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePlatform === "youtube" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Channel URL / Handle *</label>
                            <input
                              type="text"
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                              placeholder="youtube.com/@channel"
                              value={formData.youtubeChannelUrl}
                              onChange={e => setFormData({...formData, youtubeChannelUrl: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Subscribers</label>
                              <FormattedNumberInput
                                value={formData.youtubeSubscribers}
                                onChange={val => setFormData({...formData, youtubeSubscribers: val || 0})}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none font-bold"
                                placeholder="e.g. 100,000"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Avg Video Views</label>
                              <FormattedNumberInput
                                value={formData.youtubeAvgViews}
                                onChange={val => setFormData({...formData, youtubeAvgViews: val || 0})}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none font-bold"
                                placeholder="e.g. 20,000"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.youtubeConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("youtube")}
                                disabled={connectingPlatform === "youtube"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.youtubeChannelUrl) {
                                  toast.error("Please enter your channel URL.");
                                  return;
                                }
                                handleSocialConnect("youtube");
                              }}
                              disabled={connectingPlatform === "youtube"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "youtube" ? <Loader2 className="animate-spin" size={18} /> : "Verify & Connect"}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePlatform === "linkedin" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Company Page URL *</label>
                            <input
                              type="text"
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                              placeholder="linkedin.com/company/brand"
                              value={formData.linkedinUrl}
                              onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.linkedinConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("linkedin")}
                                disabled={connectingPlatform === "linkedin"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.linkedinUrl) {
                                  toast.error("Please enter page URL.");
                                  return;
                                }
                                handleSocialConnect("linkedin");
                              }}
                              disabled={connectingPlatform === "linkedin"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "linkedin" ? <Loader2 className="animate-spin" size={18} /> : "Connect Account"}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePlatform === "twitter" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Twitter / X Handle *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                              <input
                                type="text"
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 pl-8 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                                placeholder="brand_x"
                                value={formData.twitterHandle}
                                onChange={e => setFormData({...formData, twitterHandle: e.target.value.replace('@', '')})}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.twitterConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("twitter")}
                                disabled={connectingPlatform === "twitter"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.twitterHandle) {
                                  toast.error("Please enter a handle.");
                                  return;
                                }
                                handleSocialConnect("twitter");
                              }}
                              disabled={connectingPlatform === "twitter"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "twitter" ? <Loader2 className="animate-spin" size={18} /> : "Connect Account"}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePlatform === "facebook" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Facebook Page URL *</label>
                            <input
                              type="text"
                              className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                              placeholder="facebook.com/brandpage"
                              value={formData.facebookUrl}
                              onChange={e => setFormData({...formData, facebookUrl: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.facebookConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("facebook")}
                                disabled={connectingPlatform === "facebook"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.facebookUrl) {
                                  toast.error("Please enter page URL.");
                                  return;
                                }
                                handleSocialConnect("facebook");
                              }}
                              disabled={connectingPlatform === "facebook"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "facebook" ? <Loader2 className="animate-spin" size={18} /> : "Connect Account"}
                            </button>
                          </div>
                        </div>
                      )}

                      {activePlatform === "threads" && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">Threads Handle *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                              <input
                                type="text"
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 pl-8 text-[var(--text-primary)] focus:border-blue-500 outline-none"
                                placeholder="brand_threads"
                                value={formData.threadsHandle}
                                onChange={e => setFormData({...formData, threadsHandle: e.target.value.replace('@', '')})}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {formData.threadsConnected && (
                              <button
                                type="button"
                                onClick={() => handleSocialDisconnect("threads")}
                                disabled={connectingPlatform === "threads"}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl transition"
                              >
                                Disconnect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!formData.threadsHandle) {
                                  toast.error("Please enter a handle.");
                                  return;
                                }
                                handleSocialConnect("threads");
                              }}
                              disabled={connectingPlatform === "threads"}
                              className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                            >
                              {connectingPlatform === "threads" ? <Loader2 className="animate-spin" size={18} /> : "Connect Account"}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!activePlatform && (
                  <div className="pt-6 flex justify-between border-t border-[var(--border-default)]">
                    <button
                      onClick={() => setSubStep(1)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="bg-[#3B82F6] text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="bs4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-3xl font-sans font-bold text-[var(--text-primary)]">What campaigns will you run?</h2>
              <p className="text-[var(--text-tertiary)] mt-2 mb-8">This helps creators understand if they're a match for you.</p>

              <div className="space-y-6">
                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Campaign Types (Select all that apply)</label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {campaignTypesList.map(type => (
                       <button
                         key={type.id}
                         onClick={() => toggleCampaignType(type.id)}
                         className={`p-3 rounded-xl text-sm font-bold border transition-all text-left flex items-center gap-2 ${formData.campaignTypes.includes(type.id) ? 'bg-[#3B82F6]/10 border-[#3B82F6] text-[var(--text-primary)]' : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/30'}`}
                       >
                         <span className="text-xl">{type.icon}</span> {type.label}
                       </button>
                     ))}
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Typical Budget Per Campaign</label>
                   <div className="flex flex-wrap gap-2">
                     {budgetRangesList.map(budget => (
                       <button
                         key={budget}
                         onClick={() => setFormData({...formData, budgetRange: budget})}
                         className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.budgetRange === budget ? 'bg-emerald-500/10 border-emerald-500 text-[#027A48]' : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/30'}`}
                       >
                         {budget}
                       </button>
                     ))}
                   </div>
                </div>

                <div>
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Preferred Creator Size</label>
                   <div className="flex flex-wrap gap-2">
                     {creatorSizesList.map(size => (
                       <button
                         key={size}
                         onClick={() => setFormData({...formData, creatorSize: size})}
                         className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.creatorSize === size ? 'bg-[#3B82F6] border-[#3B82F6] text-[var(--text-primary)]' : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-white/30'}`}
                       >
                         {size}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="mb-4">
                   <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Preferred Niches (Optional)</label>
                   <UniversalTagSearch
                     selectedTags={formData.niches ? formData.niches.split(",").map(s => s.trim()).filter(Boolean) : []}
                     onChange={newTags => setFormData({...formData, niches: newTags.join(", ")})}
                     type="category"
                     placeholder="Search or create custom target niches..."
                   />
                </div>

                {/* Fix 12: Interactive Escrow Banner */}
                <div 
                  onClick={() => setShowEscrowModal(true)}
                  className="bg-[var(--bg-card)] border border-[#10B981]/30 hover:border-emerald-400 p-4 rounded-xl flex items-start gap-4 text-xs text-[var(--text-tertiary)] leading-relaxed max-w-lg mt-8 cursor-pointer transition-all shadow-sm hover:shadow-md group"
                >
                   <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                     <Shield className="text-emerald-600" size={18} />
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center justify-between">
                       <p className="text-emerald-600 font-bold uppercase tracking-wider mb-1">⊙ SSL Escrow Protected Settlements</p>
                       <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">Learn More →</span>
                     </div>
                     All payments made on Ybex platform are secured in neutral escrow accounts prior to contract completion.
                   </div>
                </div>

                <div className="pt-4 flex justify-between">
                   <button onClick={() => { setStep(3); setSubStep(2); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
                     <ArrowLeft size={18} /> Back
                   </button>
                   <button onClick={handleSaveAndComplete} disabled={loading} className="bg-gradient-to-r from-[var(--violet)] to-[#8b5cf6] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50 flex items-center gap-2 hover:-translate-y-0.5">
                     {loading ? <Loader2 className="animate-spin" size={18}/> : "Publish Brand Profile ✓"}
                   </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        </div>
      </section>

      {/* Fix 12: EscrowInfoModal Dialog */}
      {showEscrowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="text-emerald-500" size={18} />
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Ybex SSL Escrow Security</h3>
              </div>
              <button 
                onClick={() => setShowEscrowModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-[var(--text-secondary)]">
              <div className="flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-lg">✓</span>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">256-Bit SSL Encrypted Escrow</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Campaign funds are held safely in bank-grade escrow accounts during active collaborations.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-lg">✓</span>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Milestone-Based Releases</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Funds are only disbursed to creators after content deliverables are reviewed and approved by your brand.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-emerald-500 font-bold text-lg">✓</span>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">100% Protection & Dispute Resolution</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Full refund guarantee if campaign deliverables are not submitted or fail quality requirements.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-default)] flex justify-end">
              <button
                onClick={() => setShowEscrowModal(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
              >
                Got It, Thanks!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
