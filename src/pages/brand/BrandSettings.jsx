import React, { useState, useEffect } from "react";
import { safeLower } from "../../utils/safeFormat";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building, Shield, MonitorSmartphone, X, LogOut, Edit2, Mail, Loader2, ShieldAlert, FileText, Briefcase, ChevronRight, Camera, AlertCircle, Check
} from "lucide-react";
import AgencyBadge from "../../components/common/AgencyBadge";
import { useLoading } from "../../contexts/LoadingContext";
import { LocationAutocomplete } from "../../components/ui/autocomplete";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import { parseDeviceName } from "../../utils/deviceParser";
import useIsMobile from "../../hooks/useIsMobile";
import BrandProfileMobile from "../../components/profile/mobile/BrandProfileMobile";

export default function BrandSettings() {
  const { user, refreshUser } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const VALID_TABS = ["profile", "kyc", "sessions", "legal"];
  const [activeTab, setActiveTab] = useState(() => {
    const section = searchParams.get("section") || searchParams.get("tab");
    return VALID_TABS.includes(section) ? section : "profile";
  });

  useEffect(() => {
    const section = searchParams.get("section") || searchParams.get("tab");
    if (VALID_TABS.includes(section)) {
      setActiveTab(section);
    }
  }, [searchParams]);

  // Brand profile fields state
  const [profile, setProfile] = useState({
    company_name: user?.name || "",
    industry: "Fashion & Retail",
    website: "",
    description: "",
    location: "New Delhi, Delhi",
    pocName: "",
    pocDesignation: "",
    pocEmail: user?.email || "",
    pocPhone: "",
    logo: user?.picture || user?.photo || "",
    cover: "",
    is_agency: Boolean(user?.is_agency),
    agency_type: user?.agency_type || ""
  });

  // KYC compliance status
  const [kycObj, setKycObj] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);

  // Device sessions list
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // OTP states
  const [otpModalField, setOtpModalField] = useState(null); // 'pocPhone' or 'pocEmail'
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpTargetValue, setOtpTargetValue] = useState("");
  
  // Custom prompt state for phone/email
  const [contactPrompt, setContactPrompt] = useState({ isOpen: false, field: "", label: "", value: "" });
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Edit popups
  const [editModalField, setEditModalField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const toastId = toast.loading("Uploading image to storage...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload?bucket=profile-assets", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      if (res.data?.url) {
        setEditValue(res.data.url);
        toast.success("Image uploaded successfully!", { id: toastId });
      } else {
        throw new Error("Invalid upload response");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. Please try again.", { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  const loadBrandData = async () => {
    if (!user) return;
    startLoading();
    try {
      let data = null;
      if (supabase) {
        const res = await supabase.from('brand_profiles').select('*').eq('user_id', user.user_id).maybeSingle();
        if (res?.data) data = res.data;
      }
      if (!data) {
        const res = await api.get("brands/me").catch(() => null);
        if (res?.data) data = res.data;
      }

      if (data) {
        let extractedCover = data.cover_image || "";
        let originalDesc = data.description || "";

        setProfile({
          company_name: data.company_name || user.name || "",
          industry: data.industry || "Fashion & Retail",
          website: data.website || "",
          description: originalDesc,
          location: (data.city || data.state) ? `${data.city || ""}, ${data.state || ""}`.replace(/^, |, $/g, "") : "New Delhi, Delhi",
          pocName: data.representative_name || data.poc_name || "",
          pocDesignation: data.representative_designation || data.poc_designation || "",
          pocEmail: data.email || user.email || "",
          pocPhone: data.representative_mobile || data.phone || "",
          campaignTypes: data.campaign_types ? (Array.isArray(data.campaign_types) ? data.campaign_types.join(", ") : data.campaign_types) : "",
          budgetRange: data.budget_range || "",
          creatorSize: data.preferred_creator_size || "",
          niches: data.preferred_niches || "",
          genderFocus: data.gender_focus || "",
          teamSize: data.team_size || "",
          logo: data.logo || user.picture || user.photo || "",
          cover: extractedCover,
          youtubeUrl: data.youtube_url || "",
          linkedinUrl: data.linkedin_url || "",
          twitterUrl: data.twitter_url || "",
          is_agency: Boolean(data.is_agency || user?.is_agency)
        });
      }
    } catch (e) {
      console.error("Error loading brand profile settings:", e);
    } finally {
      stopLoading();
    }
  };

  const fetchKycStatus = async () => {
    try {
      const res = await api.get("verifications/me").catch(() => null);
      if (res?.data) {
        setKycObj(res.data);
      }
    } catch (e) {
      console.warn("Error fetching KYC", e);
    } finally {
      setKycLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get("sessions", { bypassCache: true }).catch(() => null);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setSessionsList(res.data);
      } else {
        const currentDev = parseDeviceName(navigator.userAgent);
        setSessionsList([
          { session_token: "curr_token_brand", device: currentDev, device_name: currentDev, location: "India", isCurrent: true, created_at: new Date().toISOString() }
        ]);
      }
    } catch (e) {
      console.warn("Error fetching sessions", e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    // On mobile this page renders BrandProfileMobile, which loads the same three
    // things itself — skip these so a mobile visit doesn't fire them twice.
    if (isMobile) return;
    if (user && !hasLoaded) {
      loadBrandData();
      fetchKycStatus();
      fetchSessions();
      setHasLoaded(true);
    }
  }, [user, hasLoaded]);

  const saveProfileChanges = async (updatedFields) => {
    startLoading();
    try {
      const mergedProfile = { ...profile, ...updatedFields };
      const locParts = (mergedProfile.location || "").split(",");
      const city = locParts[0]?.trim() || "";
      const state = locParts[1]?.trim() || "";

      const payload = {
        company_name: mergedProfile.company_name,
        industry: mergedProfile.industry,
        website: mergedProfile.website,
        description: mergedProfile.description,
        city: city,
        state: state,
        email: mergedProfile.pocEmail,
        phone: mergedProfile.pocPhone,
        representative_name: mergedProfile.pocName,
        representative_designation: mergedProfile.pocDesignation,
        representative_mobile: mergedProfile.pocPhone,
        youtube_url: mergedProfile.youtubeUrl || mergedProfile.youtube_url || null,
        linkedin_url: mergedProfile.linkedinUrl || mergedProfile.linkedin_url || null,
        twitter_url: mergedProfile.twitterUrl || mergedProfile.twitter_url || null,
        campaign_types: mergedProfile.campaignTypes ? mergedProfile.campaignTypes.split(",").map(s => s.trim()) : [],
        budget_range: mergedProfile.budgetRange,
        preferred_creator_size: mergedProfile.creatorSize,
        preferred_niches: mergedProfile.niches,
        gender_focus: mergedProfile.genderFocus,
        team_size: mergedProfile.teamSize,
        logo: mergedProfile.logo,
        cover_image: mergedProfile.cover,
        is_agency: Boolean(mergedProfile.is_agency),
        agency_type: mergedProfile.agency_type || null
      };

      if (supabase && (user?.user_id || user?.id)) {
        await supabase.from('brand_profiles').upsert({
          user_id: user?.user_id || user?.id,
          company_name: mergedProfile.company_name,
          industry: mergedProfile.industry,
          website: mergedProfile.website,
          description: mergedProfile.description,
          city: city,
          state: state,
          is_agency: Boolean(mergedProfile.is_agency),
        agency_type: mergedProfile.agency_type || null,
          youtube_url: mergedProfile.youtubeUrl || mergedProfile.youtube_url || null,
          linkedin_url: mergedProfile.linkedinUrl || mergedProfile.linkedin_url || null,
          twitter_url: mergedProfile.twitterUrl || mergedProfile.twitter_url || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }

      await api.post('brands/profile', payload);
      await refreshUser();
      setProfile(mergedProfile);
      toast.success("Company profile updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update company settings.");
    } finally {
      stopLoading();
    }
  };

  // OTP Handling
  const handleRequestOtp = async (field, value) => {
    if (!value || !value.trim()) {
      toast.error("Please provide a valid value.");
      return;
    }
    startLoading();
    try {
      const res = await api.post("/otp/send", { target: field === "pocPhone" ? "phone" : "email", value });
      if (res.data?.ok) {
        setOtpSent(true);
        setOtpModalField(field);
        setOtpTargetValue(value);
        toast.success("Verification OTP code sent! Please check your email/phone.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to send verification OTP.");
    } finally {
      stopLoading();
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const target = otpModalField === "pocPhone" ? "phone" : "email";
      const res = await api.post("/otp/verify", { target, value: otpTargetValue, code: otpValue });
      if (res.data?.ok) {
        toast.success("Verification successful!");
        const updatedFields = { [otpModalField]: otpTargetValue };
        await saveProfileChanges(updatedFields);
        setOtpSent(false);
        setOtpModalField(null);
        setOtpValue("");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Logout Specific Session
  const handleLogoutSession = async (token) => {
    startLoading();
    try {
      await api.post(`sessions/logout/${token}`);
      toast.success("Device session logged out successfully.");
      await fetchSessions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to invalidate session.");
    } finally {
      stopLoading();
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    startLoading();
    try {
      await api.post("sessions/logout-others");
      toast.success("Logged out of all other sessions.");
      await fetchSessions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to terminate other sessions.");
    } finally {
      stopLoading();
    }
  };

  const openEditModal = (field) => {
    setEditModalField(field);
    setEditValue(profile[field] || "");
  };

  const saveEditValue = async () => {
    await saveProfileChanges({ [editModalField]: editValue });
    setEditModalField(null);
  };

  // Mobile gets the native Brand Profile hub and its sub-screens (mockup 1a-1k).
  // The bottom nav's "Brand" tab points at /brand/account, which mounts this page,
  // so without this branch the mobile hub was only reachable via /brand/profile.
  // Desktop rendering below is untouched.
  if (isMobile) {
    return <BrandProfileMobile />;
  }

  return (
    <div className="w-full max-w-none px-4 md:px-8 pt-6 pb-20 relative" data-testid="settings-page">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 px-4 mb-4 font-display">Settings Hub</h2>
          {[
            { id: "profile", label: "Company Details", icon: <Building size={16} /> },
            { id: "kyc", label: "Verification Status", icon: <Shield size={16} /> },
            { id: "sessions", label: "Device Sessions", icon: <MonitorSmartphone size={16} /> },
            { id: "legal", label: "Privacy & Terms", icon: <FileText size={16} /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer z-10 ${
                  isActive 
                    ? "text-white" 
                    : "bg-white border border-slate-100 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="brandSettingsTabPill"
                    className="absolute inset-0 bg-[var(--violet)] rounded-xl shadow-md shadow-[var(--violet)]/20 z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  {tab.icon} {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Settings Area */}
        <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Company Profile</h3>
                  <p className="text-xs text-slate-500 font-medium">Keep your corporate credentials updated to onboard elite creators.</p>
                </div>

                {/* Profile Header Visual Editor */}
                <div className="relative mb-14">
                  {/* Banner Wrapper with rounded corners and overflow-hidden */}
                  <div className="rounded-2xl overflow-hidden bg-slate-100 h-36 md:h-44 border border-slate-150 shadow-sm relative">
                    <img 
                      src={profile.cover || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"} 
                      className="w-full h-full object-cover" 
                      alt="Cover Banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                    <button 
                      onClick={() => openEditModal('cover')} 
                      className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-slate-200 cursor-pointer"
                    >
                      <Camera size={12}/> Change Cover Banner
                    </button>
                  </div>
                  
                  {/* Logo - positioned outside the banner container so it is NEVER clipped */}
                  <div className="absolute -bottom-10 left-6 z-20 flex items-end gap-3">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-slate-50 overflow-hidden relative group shadow-lg">
                      <img 
                        src={profile.logo || "" + encodeURIComponent(profile.company_name || "Yankee") + "&background=7C3AED&color=fff"} 
                        className="w-full h-full object-cover" 
                        alt="Profile Logo"
                      />
                      <button 
                        onClick={() => openEditModal('logo')} 
                        className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                      >
                        <Camera className="text-white" size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { field: 'company_name', label: 'Company Name' },
                    { field: 'industry', label: 'Industry Category' },
                    { field: 'website', label: 'Corporate Website URL' },
                    { field: 'location', label: 'Headquarters Location' },
                    { field: 'teamSize', label: 'Team Size' },
                    { field: 'description', label: 'Company Description' }
                  ].map(p => (
                    <div key={p.field} className={`p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50/50 ${p.field === 'description' ? 'col-span-1 md:col-span-2' : ''}`}>
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{p.label}</span>
                        <span className="text-xs font-extrabold text-slate-800 block truncate leading-relaxed">
                          {profile[p.field] || "Not provided"}
                          {p.field === 'company_name' && (
                            <>
                              {kycObj?.status === 'APPROVED' && (
                                <span className="ml-2 inline-flex items-center justify-center bg-blue-100 text-blue-600 rounded-full w-4 h-4" title="Verified Brand">
                                   <Shield size={10} className="fill-current" />
                                </span>
                              )}
                              {profile.is_agency && (
                                <AgencyBadge size="xs" className="ml-2 align-middle" />
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      <button onClick={() => openEditModal(p.field)} className="text-[var(--violet)] hover:bg-[var(--violet)]/5 p-2 rounded-lg transition-colors flex-shrink-0">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                                                {/* Agency Status Designation */}
                <div className="p-4 border border-purple-100 bg-purple-50/40 rounded-2xl flex flex-col justify-between gap-4 relative">
                  {!profile.is_agency && <span className="absolute -top-2.5 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-sm z-10">NEW</span>}
                  <div className="flex items-start justify-between w-full">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">Are you an Agency? - Claim Your Verified badge now</span>
                          {profile.is_agency && <AgencyBadge size="xs" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                          Show public "Agency" badge to creators across campaigns, chats, and profile views.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <select
                      value={profile.agency_type || ""}
                      onChange={(e) => setProfile(prev => ({ ...prev, agency_type: e.target.value }))}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 flex-1"
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

                    <button
                      type="button"
                      disabled={!profile.agency_type && !profile.is_agency}
                      onClick={async () => {
                        if (!profile.agency_type) {
                          toast.error("Please select an agency type first.");
                          return;
                        }
                        const nextState = !profile.is_agency;
                        await saveProfileChanges({ is_agency: nextState, agency_type: profile.agency_type });
                        toast.success(nextState ? "Agency status activated!" : "Agency status deactivated.");
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                        profile.is_agency
                          ? "bg-purple-600 text-white shadow-xs hover:bg-purple-700"
                          : "bg-slate-900 text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      }`}
                    >
                      {profile.is_agency ? (
                        <>
                          <Check size={14} className="stroke-[3]" /> Cancel Claim
                        </>
                      ) : (
                        "Claim Agency Status"
                      )}
                    </button>
                  </div>
                </div>

                {/* Campaign Strategy Details */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Campaign Strategy & Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { field: 'campaignTypes', label: 'Campaign Types' },
                      { field: 'budgetRange', label: 'Typical Budget' },
                      { field: 'creatorSize', label: 'Preferred Creator Size' },
                      { field: 'niches', label: 'Target Niches' },
                      { field: 'genderFocus', label: 'Target Audience Gender' }
                    ].map(p => (
                      <div key={p.field} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{p.label}</span>
                          <span className="text-xs font-extrabold text-slate-800 block truncate leading-relaxed">
                            {profile[p.field] || "Not specified"}
                          </span>
                        </div>
                        <button onClick={() => openEditModal(p.field)} className="text-[var(--violet)] hover:bg-[var(--violet)]/5 p-2 rounded-lg transition-colors flex-shrink-0">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secure Contacts / POC details */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Point of Contact (POC) Credentials</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { field: 'pocName', label: 'POC Contact Name' },
                      { field: 'pocDesignation', label: 'POC Designation / Title' }
                    ].map(poc => (
                      <div key={poc.field} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{poc.label}</span>
                          <span className="text-xs font-extrabold text-slate-800">{profile[poc.field] || "Not provided"}</span>
                        </div>
                        <button onClick={() => openEditModal(poc.field)} className="text-[var(--violet)] hover:bg-[var(--violet)]/5 p-2 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                      <div className="flex-1 w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">POC Mobile Phone</span>
                        <input 
                          type="tel"
                          value={profile.pocPhone || ""}
                          onChange={(e) => setProfile({ ...profile, pocPhone: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                          placeholder="Enter mobile number"
                        />
                      </div>
                      <button 
                        onClick={() => saveProfileChanges({ pocPhone: profile.pocPhone })}
                        className="px-4 py-2 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-[10px] font-bold rounded-lg transition-all flex-shrink-0 self-stretch sm:self-end h-[36px] flex items-center justify-center cursor-pointer"
                      >
                        Update
                      </button>
                    </div>

                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-end gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">POC Business Email</span>
                        <span className="text-xs font-extrabold text-slate-800 block pt-1">{profile.pocEmail || "Not linked"}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setContactPrompt({ isOpen: true, field: 'pocEmail', label: 'Business Email', value: profile.pocEmail || '' });
                        }} 
                        className="px-3.5 py-2 bg-[var(--violet)]/10 hover:bg-[var(--violet)]/15 text-[var(--violet)] text-[10px] font-bold rounded-lg transition-all shrink-0 self-end h-[36px] flex items-center justify-center cursor-pointer"
                      >
                        Verify & Link
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "kyc" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Compliance Status</h3>
                  <p className="text-xs text-slate-500 font-medium">Verification reports are reviewed to clear GST, tax documents, and corporate registrations.</p>
                </div>

                {kycLoading ? (
                  <div className="flex justify-center items-center pt-6 pb-10">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : (!kycObj || kycObj.status === "NOT_SUBMITTED") ? (
                  <div className="text-center pt-6 pb-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                    <ShieldAlert className="mx-auto text-slate-400 mb-3" size={32} />
                    <h4 className="font-extrabold text-slate-700 text-sm">Corporate Compliance: Not Submitted</h4>
                    <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                      You have not completed tax compliance and identity verification. Please register company documents to begin active campaign allocations.
                    </p>
                    <a 
                      href="/brand/kyc" 
                      className="inline-block mt-4 px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                    >
                      Complete KYC Verification
                    </a>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Card Banner */}
                    <div className={`border rounded-2xl p-6 ${
                      kycObj.status === 'APPROVED' || kycObj.status === 'approved'
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review'
                        ? 'bg-amber-50/50 border-amber-100'
                        : 'bg-rose-50/50 border-rose-100'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl mt-0.5 ${
                            kycObj.status === 'APPROVED' || kycObj.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            <Shield size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Compliance Status</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-block mt-1 ${
                              kycObj.status === 'APPROVED' || kycObj.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review'
                                ? 'bg-amber-100 text-[#D97706]'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review' ? 'UNDER REVIEW' : kycObj.status}
                            </span>
                          </div>
                        </div>

                        {/* CTAs */}
                        {(kycObj.status === 'REJECTED' || kycObj.status === 'rejected' || kycObj.status === 'MORE_INFO_NEEDED') && (
                          <a 
                            href="/brand/kyc" 
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md text-center hover:scale-[1.02]"
                          >
                            Update & Resubmit
                          </a>
                        )}
                      </div>

                      {/* Status Messages */}
                      {(kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review') && (
                        <p className="text-xs text-amber-700 font-medium mt-4 bg-amber-50 border border-amber-100/50 rounded-xl p-3 leading-relaxed">
                          We are currently validating your corporate credentials. Active campaign creation will be enabled as soon as the review finishes (usually takes less than 2 hours).
                        </p>
                      )}

                      {(kycObj.status === 'APPROVED' || kycObj.status === 'approved') && (
                        <p className="text-xs text-emerald-700 font-medium mt-4 bg-emerald-50 border border-emerald-100/50 rounded-xl p-3 leading-relaxed">
                          ✓ Your corporate compliance verification is approved. If you need to edit your corporate information, please contact support. Editing verified details will require re-verification.
                        </p>
                      )}

                      {(kycObj.status === 'REJECTED' || kycObj.status === 'rejected' || kycObj.status === 'MORE_INFO_NEEDED') && (
                        <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-1">
                          <h5 className="text-xs font-extrabold text-rose-800">Rejection Reason / Admin Note:</h5>
                          <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                            {kycObj.rejection_reason || kycObj.admin_note || "Your documentation was incomplete or invalid. Please click the button to update your credentials and resubmit for verification."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submitted Details Review Grid */}
                    <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Submitted Credentials Overview</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Company Name</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.company_name || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">GSTIN/Tax Reference</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.gst_cert || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Corporate Identity (PAN)</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.brand_pan || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Authorized Officer Name</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.poc_name || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Representative Designation</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.poc_designation || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Authorized Email ID</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.poc_email || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Authorized Liaison Phone</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.poc_phone || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Company Website URL</span>
                          <span className="text-slate-800 font-extrabold">
                            {kycObj.documents?.website ? (
                              <a href={kycObj.documents.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-extrabold flex items-center gap-1">
                                {kycObj.documents.website}
                              </a>
                            ) : "N/A"}
                          </span>
                        </div>
                        {kycObj.documents?.incorporation_proof && (
                          <div className="py-1 flex flex-col gap-0.5 md:col-span-2">
                            <span className="text-slate-400 font-bold">Incorporation Certificate Proof</span>
                            <span className="text-slate-800 font-extrabold">
                              <a 
                                href={kycObj.documents.incorporation_proof} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold border border-slate-200 mt-1 transition-colors"
                              >
                                <FileText size={14} /> View Certificate Proof Document
                              </a>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "sessions" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 font-display">Device Sessions</h3>
                    <p className="text-xs text-slate-500 font-medium">List of device login tokens actively registered for your corporate profile.</p>
                  </div>
                  <button 
                    onClick={handleLogoutAllOtherSessions}
                    className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Logout All Other Devices
                  </button>
                </div>

                {loadingSessions ? (
                  <div className="flex justify-center items-center pt-6 pb-10">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessionsList?.map(sess => (
                      <div key={sess.session_token} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <MonitorSmartphone className="text-slate-400" size={20} />
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                              {sess.device || sess.device_name || "Unknown Web Device"} 
                              {sess.isCurrent && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">Current</span>}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{sess.location || "Location unknown"}</span>
                          </div>
                        </div>
                        {!sess.isCurrent && (
                          <button 
                            onClick={() => handleLogoutSession(sess.session_token)}
                            className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <LogOut size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "legal" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Policies & Terms</h3>
                  <p className="text-xs text-slate-500 font-medium">Read our platform rules, privacy commitments, and payment escrow terms.</p>
                </div>

                <div className="space-y-6">
                  {/* Privacy Policy */}
                  <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <Shield size={16} className="text-[var(--violet)]" /> Privacy Policy
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      At Ybex Media (Datrux Systems Pvt. Limited), we respect your personal data. We collect profile details, analytics numbers, and verification documents purely to verify creator credentials and link you with growth-oriented brands. We never sell your personal information or shared contact information to third parties.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">GDPR & DPDP Compliant</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase">Secure Storage</span>
                    </div>
                  </div>

                  {/* Payment & Escrow Terms */}
                  <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <Briefcase size={16} className="text-[var(--violet)]" /> Escrow & Payment Terms
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      To safeguard the interests of both parties, all campaigns on Ybex utilize our <strong className="text-slate-800">Neutral Escrow System</strong>. 
                      Brands deposit 100% of the campaign budget upfront. Funds are locked securely in escrow and only released to the creator's verified bank account once proof-of-work (content links, verified reach metrics) is uploaded and approved.
                    </p>
                    <div className="mt-3 text-slate-500 text-[11px] list-disc pl-4 space-y-1">
                      <li><strong>Zero Middlemen Markup:</strong> We do not take hidden agency cuts. What you quote is what you receive.</li>
                      <li><strong>Release Timeline:</strong> Standard payouts are processed to registered UPI/NEFT accounts within 48-72 hours of work verification.</li>
                    </div>
                  </div>

                  {/* Dispute Policy */}
                  <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                      <ShieldAlert size={16} className="text-amber-500" /> Dispute & Cancellation Guidelines
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      If a brand requests unexpected revisions outside the original UGC brief, or if a creator fails to deliver within the agreed timeframe, either party can raise a dispute. Our dedicated support team will review the campaign chat transcripts, brief requirements, and draft assets within 24 hours to execute a fair resolution or partial refund.
                    </p>
                  </div>

                  {/* Contact Compliance */}
                  <div className="p-4 border border-slate-100 rounded-2xl bg-purple-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Need legal support or policy clarification?</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Contact our Compliance & Legal relations cell directly.</p>
                    </div>
                    <a href="mailto:legal@ybex.io" className="text-xs font-bold text-[var(--violet)] hover:underline flex items-center gap-1">
                      legal@ybex.io <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit fields Modal */}
      {editModalField && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setEditModalField(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-extrabold text-slate-800 mb-4 font-display">
              Update {
                {
                  company_name: "Company Name",
                  industry: "Industry Category",
                  website: "Corporate Website URL",
                  location: "Headquarters Location",
                  teamSize: "Team Size",
                  description: "Company Description",
                  campaignTypes: "Campaign Types & Scope",
                  budgetRange: "Typical Budget",
                  creatorSize: "Preferred Creator Size",
                  niches: "Target Niches",
                  genderFocus: "Target Audience Gender",
                  logo: "Company Logo",
                  cover: "Cover Banner",
                }[editModalField] || editModalField
              }
            </h3>
            
            {editModalField === 'location' ? (
              <LocationAutocomplete 
                value={editValue} 
                onChange={val => setEditValue(val)} 
                className="mb-4"
              />
            ) : editModalField === 'description' ? (
              <textarea 
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none mb-4 resize-none leading-relaxed"
              />
            ) : editModalField === 'industry' ? (
              <div className="mb-4">
                <UniversalTagSearch
                  selectedTags={editValue ? [editValue] : []}
                  onChange={newTags => setEditValue(newTags[newTags.length - 1] || "")}
                  type="category"
                  placeholder="Search or create custom category..."
                />
              </div>
            ) : (editModalField === 'logo' || editModalField === 'cover') ? (
              <div className="space-y-4 mb-4">
                <div 
                  className={`border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-[var(--violet)] transition-all bg-slate-50/50 flex flex-col items-center justify-center relative min-h-36 ${uploadingImage ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (uploadingImage) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  onClick={() => !uploadingImage && document.getElementById('modal-file-upload').click()}
                >
                  <input 
                    id="modal-file-upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Loader2 className="animate-spin text-[var(--violet)] mb-3" size={28} />
                      <p className="text-xs font-bold text-slate-700 animate-pulse">Uploading image to cloud bucket...</p>
                      <p className="text-[10px] text-slate-400 mt-1">Please wait a moment</p>
                    </div>
                  ) : (
                    <>
                      <Camera className="text-slate-400 mb-2" size={24} />
                      <p className="text-xs font-bold text-slate-700">Drag & drop your file here, or click to browse</p>
                      <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, GIF (Max 5MB)</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or Paste Image URL</span>
                  <div className="h-[1px] bg-slate-100 flex-1"></div>
                </div>

                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g., https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none"
                />

                {editValue && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50 p-2 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase self-start pl-1">Live Preview:</span>
                    <img 
                      src={editValue} 
                      alt="Preview" 
                      className={`object-cover border border-slate-100 bg-white ${editModalField === 'logo' ? 'w-20 h-20 rounded-full' : 'w-full h-24 rounded-lg'}`}
                      onError={(e) => {
                        e.target.src = "https://placehold.co/400x150?text=Invalid+Image+URL";
                      }}
                    />
                  </div>
                )}
              </div>
            ) : editModalField === 'teamSize' ? (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-slate-500 font-medium">Select your company's team size or enter custom value:</p>
                <div className="flex flex-wrap gap-2">
                  {["1-10 Employees", "11-50 Employees", "51-200 Employees", "500+ Employees"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEditValue(opt)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                        editValue === opt
                          ? 'bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Or enter custom team size..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)] mt-2"
                />
              </div>
            ) : editModalField === 'campaignTypes' ? (
              <div className="space-y-4 mb-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                    <span>Campaign Strategy & Budget Frequency Note</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Please specify your campaign types and state whether your budget strategy is <strong>Monthly</strong>, <strong>Annual</strong>, or <strong>Per Campaign basis</strong>.
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Based on these details, our review team will evaluate and approve campaign allocations.
                  </p>
                </div>

                <p className="text-xs text-slate-500 font-medium">Select campaign type options:</p>
                <div className="flex flex-wrap gap-2">
                  {["UGC & Product Reviews", "Sponsored Posts", "Brand Ambassador", "Affiliate Marketing", "Event Coverage"].map(opt => {
                    const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentArr.includes(opt);
                    const toggleOpt = () => {
                      let updated = isSelected ? currentArr.filter(x => x !== opt) : [...currentArr, opt];
                      setEditValue(updated.join(", "));
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={toggleOpt}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? `✓ ${opt}` : `+ ${opt}`}
                      </button>
                    );
                  })}
                </div>

                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g. Sponsored Posts, UGC Reviews - $5,000/month"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
            ) : editModalField === 'budgetRange' ? (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-slate-500 font-medium">Enter your typical campaign budget amount or frequency:</p>
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g. ₹50,000 / month or $2,000 / campaign"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
            ) : editModalField === 'creatorSize' ? (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-slate-500 font-medium">Select preferred creator tier options:</p>
                <div className="flex flex-wrap gap-2">
                  {["Nano (1K - 10K)", "Micro (10K - 100K)", "Macro (100K - 1M)", "Mega (1M+)"].map(opt => {
                    const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentArr.includes(opt);
                    const toggleOpt = () => {
                      let updated = isSelected ? currentArr.filter(x => x !== opt) : [...currentArr, opt];
                      setEditValue(updated.join(", "));
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={toggleOpt}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? `✓ ${opt}` : `+ ${opt}`}
                      </button>
                    );
                  })}
                </div>
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Or enter custom creator criteria..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)] mt-2"
                />
              </div>
            ) : editModalField === 'niches' ? (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-slate-500 font-medium">Select target niches (allows multi-selection of 5+ options):</p>
                <UniversalTagSearch
                  selectedTags={editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : []}
                  onChange={newTags => setEditValue(newTags.join(", "))}
                  type="category"
                  placeholder="Search or create custom category..."
                />
              </div>
            ) : editModalField === 'genderFocus' ? (
              <div className="space-y-4 mb-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                    <span>Target Audience Demographics Guideline</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Please fill in the gender demographic of your target audience as decided by your target audience research and campaign strategy.
                  </p>
                  <p className="text-[10px] text-amber-700">
                    You can select multiple options (such as Men, Women, All Genders, or Others) based on your target audience profile.
                  </p>
                </div>

                <p className="text-xs text-slate-500 font-medium">Select target audience gender(s):</p>
                <div className="flex flex-wrap gap-2">
                  {["All Genders", "Men", "Women", "Non-Binary / Others"].map(opt => {
                    const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentArr.includes(opt);
                    const toggleOpt = () => {
                      let updated = isSelected ? currentArr.filter(x => x !== opt) : [...currentArr, opt];
                      setEditValue(updated.join(", "));
                    };
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={toggleOpt}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? `✓ ${opt}` : `+ ${opt}`}
                      </button>
                    );
                  })}
                </div>

                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="Or enter custom gender focus description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                />
              </div>
            ) : (
              <input 
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none mb-4"
              />
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditModalField(null)} className="px-4 py-2 border border-slate-100 text-xs font-bold rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={saveEditValue} className="px-5 py-2 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-xs font-bold rounded-xl shadow-md">
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom prompt popup for contacts */}
      {contactPrompt.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setContactPrompt({ ...contactPrompt, isOpen: false })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <h3 className="text-base font-extrabold text-slate-800 font-display mb-1">Verify {contactPrompt.label}</h3>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              Enter your {safeLower(contactPrompt.label)} to receive a verification code.
            </p>
            <input 
              type={contactPrompt.field === 'pocEmail' ? 'email' : 'tel'}
              value={contactPrompt.value}
              onChange={e => setContactPrompt({ ...contactPrompt, value: e.target.value })}
              placeholder={`Enter new ${safeLower(contactPrompt.label)}`}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setContactPrompt({ ...contactPrompt, isOpen: false })} className="flex-1 px-4 py-2.5 border border-slate-100 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setContactPrompt({ ...contactPrompt, isOpen: false });
                  handleRequestOtp(contactPrompt.field, contactPrompt.value);
                }} 
                disabled={!contactPrompt.value.trim()}
                className="flex-1 px-5 py-2.5 bg-[var(--violet)] hover:bg-[#6c48d4] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Send OTP
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* OTP verification popup */}
      {otpSent && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            <button onClick={() => setOtpSent(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
            <Mail className="mx-auto text-[var(--violet)] mb-3" size={32} />
            <h3 className="text-base font-extrabold text-slate-800 font-display">Verify contact credentials</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              We have sent a verification code to <strong>{otpTargetValue}</strong>. Enter code below:
            </p>

            <input 
              type="text"
              maxLength={6}
              value={otpValue}
              placeholder="Enter 6-digit OTP code"
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-center text-sm font-bold tracking-[0.5em] focus:outline-none focus:border-[var(--violet)] my-5"
            />

            <div className="flex gap-3 mt-4">
              <button onClick={() => setOtpSent(false)} className="flex-1 py-2.5 border border-slate-100 text-xs font-bold rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleVerifyOtp} disabled={verifyingOtp} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md">
                {verifyingOtp ? "Verifying..." : "Confirm & Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
