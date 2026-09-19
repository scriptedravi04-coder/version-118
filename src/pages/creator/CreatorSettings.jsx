import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { VALID_NICHES, INDIAN_LANGUAGES, POPULAR_PROFESSIONS } from "../../lib/constants";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Users, Briefcase, ChevronRight, Share2, ArrowLeft, Camera, 
  Edit2, Edit3, CheckCircle, AlertCircle, Globe, Grid, MapPin, Package, Calendar, 
  LogOut, Instagram, Youtube, Twitter, Linkedin, X, Smartphone, Mail, 
  MonitorSmartphone, Link as LinkIcon, Download, Loader2, Plus, Trash2, ShieldAlert, FileText, Ghost, Facebook, CheckCircle2,
  FolderKanban, Video, HeartHandshake, Play, ExternalLink, QrCode
} from "lucide-react";
import VideoEmbedPreview from "../../components/shared/VideoEmbedPreview";
import { useLoading } from "../../contexts/LoadingContext";
import { LocationAutocomplete } from "../../components/ui/autocomplete";
import { FormattedNumberInput } from "../../components/ui/FormattedNumberInput";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import { parseDeviceName } from "../../utils/deviceParser";
import CreatorMobileProfile from "./CreatorMobileProfile";

const safeParseItem = (p) => {
  if (typeof p === 'object' && p !== null) return p;
  if (typeof p === 'string') {
    try {
      const parsed = JSON.parse(p);
      if (typeof parsed === 'string') {
         try { return JSON.parse(parsed); } catch(e) {}
      }
      return parsed;
    } catch(e) {
      return p;
    }
  }
  return p;
};

const validateRate = (rate, reach, minRate) => {
  if (rate === "" || rate === 0) return null;
  if (rate < minRate) return { status: "error", message: `Minimum rate is ₹${minRate}` };
  if (reach > 0) {
    const suggested_rate = Math.round(reach * 0.30);
    if (rate <= suggested_rate * 1.10) {
      return { status: "success", message: "✅ Your charges look justified for your reach. Brands will find this competitive." };
    } else {
      return { status: "warning", message: `⚠️ Heads up! Based on your avg reach of ${reach.toLocaleString('en-IN')}, a competitive rate would be around ₹${suggested_rate.toLocaleString('en-IN')} (₹0.30/view). Your quoted charges are higher — you can still submit, brands may negotiate.` };
    }
  }
  return null;
};

export default function CreatorSettings() {
  const { user, logout, refreshUser } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const section = searchParams.get("section") || searchParams.get("tab");
    if (section === "kyc") return "kyc";
    return "profile";
  });
  const [mobileScreen, setMobileScreen] = useState(() => {
    const section = searchParams.get("section") || searchParams.get("subscreen");
    if (section && ["profile", "platforms", "rates", "portfolio", "kyc", "sessions", "legal", "refer", "help"].includes(section)) {
      return section;
    }
    return null;
  });
  const [activePlatform, setActivePlatform] = useState(null);

  // Sync mobileScreen when searchParams change (handles hardware back, browser back, links)
  useEffect(() => {
    const section = searchParams.get("section") || searchParams.get("subscreen");
    if (section && ["profile", "platforms", "rates", "portfolio", "kyc", "sessions", "legal", "refer", "help"].includes(section)) {
      setMobileScreen(section);
    } else {
      setMobileScreen(null);
    }
    if (section === "kyc") {
      setActiveTab("kyc");
    }
  }, [searchParams]);

  // Listen for reset events from BottomNav re-tap
  useEffect(() => {
    const handleReset = () => {
      setMobileScreen(null);
      setSearchParams({}, { replace: true });
    };
    window.addEventListener("reset-mobile-profile-hub", handleReset);
    return () => window.removeEventListener("reset-mobile-profile-hub", handleReset);
  }, [setSearchParams]);

  const handleSetMobileScreen = (screen) => {
    if (screen) {
      setSearchParams({ section: screen });
    } else {
      setSearchParams({});
    }
    setMobileScreen(screen);
  };

  // Profile fields state
  const [profile, setProfile] = useState({
    name: user?.name || "",
    profession: "Content Creator",
    niche: "",
    subCategories: ["Reels", "Stories"],
    language: "English",
    location: "",
    socials: [
      { id: 1, platform: 'Instagram', url: '' },
      { id: 2, platform: 'YouTube', url: '' }
    ],
    barterPrefs: ["Products Only"],
    paymentTimeline: "Within 30 Days",
    phone: "",
    businessEmail: user?.email || "",
    photo: user?.picture || user?.photo || "",
    cover: ""
  });

  const [rateCard, setRateCard] = useState({
    reels: 0,
    stories: 0,
    youtube_integration: 0
  });

  const [creatorMetrics, setCreatorMetrics] = useState({
    instagramAvgReach: 0,
    youtubeAvgViews: 0
  });

  // Portfolio management states
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState(null);
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    brand_name: "",
    platform: "instagram",
    content_url: "",
    description: ""
  });
  const [newBrandInput, setNewBrandInput] = useState("");

  const handleOpenAddPortfolioModal = () => {
    setEditingPortfolioIndex(null);
    setPortfolioForm({
      title: "",
      brand_name: "",
      platform: "instagram",
      content_url: "",
      description: ""
    });
    setIsPortfolioModalOpen(true);
  };

  const handleOpenEditPortfolioModal = (index) => {
    const item = (profile.portfolio || [])[index] || {};
    setEditingPortfolioIndex(index);
    setPortfolioForm({
      title: item.title || "",
      brand_name: item.brand_name || item.brand || "",
      platform: item.platform || "instagram",
      content_url: item.content_url || item.url || item.link || "",
      description: item.description || ""
    });
    setIsPortfolioModalOpen(true);
  };

  const handleSavePortfolioItem = async () => {
    if (!portfolioForm.content_url) {
      toast.error("Please provide a video or content URL.");
      return;
    }

    const newItem = {
      id: editingPortfolioIndex !== null ? (profile.portfolio[editingPortfolioIndex]?.id || Date.now().toString()) : Date.now().toString(),
      title: portfolioForm.title || portfolioForm.brand_name || "Campaign Deliverable",
      brand_name: portfolioForm.brand_name || "Brand Partner",
      platform: portfolioForm.platform || "instagram",
      content_url: portfolioForm.content_url.trim(),
      description: portfolioForm.description || ""
    };

    let updatedList = [...(profile.portfolio || [])];
    if (editingPortfolioIndex !== null) {
      updatedList[editingPortfolioIndex] = newItem;
    } else {
      updatedList.unshift(newItem);
    }

    await saveProfileChanges({ portfolio: updatedList });
    setIsPortfolioModalOpen(false);
  };

  const handleDeletePortfolioItem = async (index) => {
    const updatedList = (profile.portfolio || []).filter((_, i) => i !== index);
    await saveProfileChanges({ portfolio: updatedList });
  };

  const handleAddPastBrand = async () => {
    if (!newBrandInput.trim()) return;
    const brandName = newBrandInput.trim();
    if ((profile.pastBrands || []).includes(brandName)) {
      toast.info(`Brand "${brandName}" is already in your past brands.`);
      setNewBrandInput("");
      return;
    }
    const updatedBrands = [...(profile.pastBrands || []), brandName];
    setNewBrandInput("");
    await saveProfileChanges({ pastBrands: updatedBrands });
  };

  const handleRemovePastBrand = async (brandToRemove) => {
    const updatedBrands = (profile.pastBrands || []).filter(b => b !== brandToRemove);
    await saveProfileChanges({ pastBrands: updatedBrands });
  };

  // KYC States
  const [kycObj, setKycObj] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);

  // Active Sessions
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // OTP modal state
  const [otpModalField, setOtpModalField] = useState(null); // 'phone' or 'businessEmail'
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpTargetValue, setOtpTargetValue] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Edit profile field modal
  const [editModalField, setEditModalField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [subCategoriesInput, setSubCategoriesInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const toastId = toast.loading("Uploading image to storage...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const targetBucket = editModalField === "cover" ? "cover-images" : "profile-assets";
      const res = await api.post(`/upload?bucket=${targetBucket}`, formData, {
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

  // Load Creator Settings Data
  const loadCreatorData = async () => {
    if (!user) return;
    startLoading();
    try {
      let data = null;
      if (supabase) {
        const res = await supabase.from('creator_profiles').select('*').eq('user_id', user.user_id).maybeSingle();
        if (res?.data) data = res.data;
      }
      if (!data) {
        const res = await api.get(`/creators/${user.user_id}`).catch(() => null);
        if (res?.data) data = res.data;
      }

      if (data) {
        let rateCardObj = data.rate_card;
        if (typeof rateCardObj === 'string') {
          try {
            rateCardObj = JSON.parse(rateCardObj);
          } catch (e) {
            rateCardObj = {};
          }
        }
        if (!rateCardObj) rateCardObj = {};

        const extras = rateCardObj.extras || {};
        const otherPlats = rateCardObj.other_platforms || {};
        const parsedSocials = [];
        if (data.instagram_handle || data.instagram) {
          parsedSocials.push({ id: 1, platform: 'Instagram', url: data.instagram_handle || data.instagram });
        }
        if (data.youtube) {
          parsedSocials.push({ id: 2, platform: 'YouTube', url: data.youtube });
        }
        // Load Snapchat, LinkedIn, Facebook
        const snapchatUrl = otherPlats.snapchat || "";
        if (snapchatUrl) {
          parsedSocials.push({ id: 3, platform: 'Snapchat', url: snapchatUrl });
        }
        const linkedinUrl = data.linkedin || otherPlats.linkedin || "";
        if (linkedinUrl) {
          parsedSocials.push({ id: 4, platform: 'LinkedIn', url: linkedinUrl });
        }
        const facebookUrl = otherPlats.facebook || "";
        if (facebookUrl) {
          parsedSocials.push({ id: 5, platform: 'Facebook', url: facebookUrl });
        }

        if (parsedSocials.length === 0) {
          parsedSocials.push({ id: 1, platform: 'Instagram', url: '' });
        }

        setProfile({
          name: user.name || data.name || "",
          tier: data.aggregate_tier || data.performance_tier || null,
          profession: extras.profession || "Content Creator",
          niche: data.category || data.primary_niche || "",
          subCategories: data.sub_categories || ["Reels", "Stories"],
          language: data.languages ? (Array.isArray(data.languages) ? data.languages.join(", ") : data.languages) : "English, Hindi",
          location: (data.city || data.state) ? `${data.city || ""}, ${data.state || ""}`.replace(/^, |, $/g, "") : "",
          socials: parsedSocials,
          barterPrefs: data.barter_mode ? [data.barter_mode] : ["Products Only"],
          paymentTimeline: data.payment_terms || "Within 30 Days",
          phone: extras.phone || user.phone || "",
          businessEmail: data.email || user.email || "",
          photo: data.photo || data.picture || user.picture || user.photo || "",
          cover: data.cover_image || rateCardObj?.cover_image || "",
          portfolio: (data.portfolio || []).map(safeParseItem),
          pastBrands: data.past_brands || [],
          instagramFollowers: Number(data.ig_followers ?? data.instagram_followers ?? data.followers_instagram ?? data.follower_count ?? 0),
          instagramAvgReach: Number(data.avg_views_30d ?? data.instagram_avg_reach ?? data.average_reach ?? 0),
          instagramAvgLikes: Number(data.avg_likes_30d ?? data.instagram_avg_likes ?? 0),
          instagramAvgComments: Number(data.avg_comments_30d ?? data.instagram_avg_comments ?? 0)
        });

        if (!rateCardObj || typeof rateCardObj !== 'object') {
          rateCardObj = {};
        }
        
        setRateCard({
          reels: Number(rateCardObj.reel || rateCardObj.reels || data.rate_reel || data.reel_rate) || 0,
          stories: Number(rateCardObj.story || rateCardObj.stories || data.rate_story || data.story_rate) || 0,
          youtube_integration: Number(rateCardObj.yt_video || rateCardObj.youtube_integration || data.rate_yt_video || data.youtube_video_rate) || 0
        });
        
        setCreatorMetrics({
          instagramAvgReach: Number(data.average_reach) || 0,
          youtubeAvgViews: Number(data.youtube_avg_views) || Number(data.avg_views_30d) || 0
        });
      }
    } catch (e) {
      console.error("Error loading creator profile settings:", e);
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
          { session_token: "curr_token", device: currentDev, device_name: currentDev, location: "India", isCurrent: true, created_at: new Date().toISOString() }
        ]);
      }
    } catch (e) {
      console.warn("Error fetching sessions", e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user && !hasLoaded) {
      loadCreatorData();
      fetchKycStatus();
      fetchSessions();
      setHasLoaded(true);
    }
  }, [user, hasLoaded]);

  // Profile Save Action
  const saveProfileChanges = async (updatedFields) => {
    startLoading();
    try {
      const mergedProfile = { ...profile, ...updatedFields };
      const locParts = (mergedProfile.location || "").split(",");
      const city = locParts[0]?.trim() || "";
      const state = locParts[1]?.trim() || "";
      const languages = (mergedProfile.language || "").split(",").map(s => s.trim()).filter(Boolean);

      const insta = mergedProfile.socials?.find(s => s.platform === 'Instagram')?.url || "";
      const yt = mergedProfile.socials?.find(s => s.platform === 'YouTube')?.url || "";
      const snap = mergedProfile.socials?.find(s => s.platform === 'Snapchat')?.url || "";
      const link = mergedProfile.socials?.find(s => s.platform === 'LinkedIn')?.url || "";
      const fb = mergedProfile.socials?.find(s => s.platform === 'Facebook')?.url || "";

      const payload = {
        name: mergedProfile.name,
        category: mergedProfile.niche,
        niche: mergedProfile.niche,
        bio: mergedProfile.bio,
        profession: mergedProfile.profession,
        sub_categories: mergedProfile.subCategories,
        languages: languages,
        city: city,
        state: state,
        email: mergedProfile.businessEmail,
        business_email: mergedProfile.businessEmail,
        businessEmail: mergedProfile.businessEmail,
        phone: mergedProfile.phone,
        instagram: insta,
        instagram_handle: insta,
        follower_count: Number(mergedProfile.instagramFollowers) || 0,
        ig_followers: Number(mergedProfile.instagramFollowers) || 0,
        followers_instagram: Number(mergedProfile.instagramFollowers) || 0,
        instagram_followers: Number(mergedProfile.instagramFollowers) || 0,
        average_reach: Number(mergedProfile.instagramAvgReach) || 0,
        avg_views_30d: Number(mergedProfile.instagramAvgReach) || 0,
        instagram_avg_reach: Number(mergedProfile.instagramAvgReach) || 0,
        avg_likes_30d: Number(mergedProfile.instagramAvgLikes) || 0,
        instagram_avg_likes: Number(mergedProfile.instagramAvgLikes) || 0,
        avg_comments_30d: Number(mergedProfile.instagramAvgComments) || 0,
        instagram_avg_comments: Number(mergedProfile.instagramAvgComments) || 0,
        stats_last_updated_at: new Date().toISOString(),
        youtube: yt,
        linkedin: link,
        barter: mergedProfile.barterPrefs?.[0] || 'Products Only',
        payment_terms: mergedProfile.paymentTimeline,
        photo: mergedProfile.photo,
        cover_image: mergedProfile.cover,
        portfolio: mergedProfile.portfolio || [],
        past_brands: mergedProfile.pastBrands || [],
        rate_card: {
          reel: rateCard.reels,
          story: rateCard.stories,
          yt_video: rateCard.youtube_integration,
          other_platforms: {
            snapchat: snap,
            facebook: fb,
            linkedin: link
          },
          extras: {
            profession: mergedProfile.profession,
            phone: mergedProfile.phone
          }
        }
      };

      await api.post('creators/profile', payload);
      await refreshUser();
      setProfile(mergedProfile);
      toast.success("Profile settings updated!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update profile settings.");
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
      const res = await api.post("/otp/send", { target: field === "phone" ? "phone" : "email", value });
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
      const target = otpModalField === "phone" ? "phone" : "email";
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

  // Invalidate Session
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
    if (field === 'subCategories') {
      setSubCategoriesInput(profile.subCategories.join(", "));
    } else if (field === 'pastBrands') {
      setEditValue((profile.pastBrands || []).join(", "));
    } else if (field === 'portfolio') {
      setEditValue((profile.portfolio || []).join(", "));
    } else {
      setEditValue(profile[field] || "");
    }
  };

  const saveEditValue = async () => {
    let updatedVal;
    if (editModalField === 'subCategories') {
      updatedVal = subCategoriesInput.split(",").map(s => s.trim()).filter(Boolean);
    } else if (editModalField === 'pastBrands' || editModalField === 'portfolio') {
      updatedVal = editValue.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      updatedVal = editValue;
    }
    await saveProfileChanges({ [editModalField]: updatedVal });
    setEditModalField(null);
  };

  return (
    <div className="w-full max-w-none relative" data-testid="settings-page">
      {/* Mobile Push-Route Profile Hub & Subpages (Canvas-2 Screens 1a-1j) */}
      <div className="md:hidden">
        <CreatorMobileProfile
          user={user}
          logout={logout}
          refreshUser={refreshUser}
          profile={profile}
          setProfile={setProfile}
          rateCard={rateCard}
          setRateCard={setRateCard}
          creatorMetrics={creatorMetrics}
          kycObj={kycObj}
          kycLoading={kycLoading}
          fetchKycStatus={fetchKycStatus}
          sessionsList={sessionsList}
          loadingSessions={loadingSessions}
          handleLogoutSession={handleLogoutSession}
          handleLogoutAllOtherSessions={handleLogoutAllOtherSessions}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform}
          otpSent={otpSent}
          setOtpSent={setOtpSent}
          otpTargetType={otpModalField}
          otpTargetValue={otpTargetValue}
          otpValue={otpValue}
          setOtpValue={setOtpValue}
          verifyingOtp={verifyingOtp}
          handleRequestOtp={handleRequestOtp}
          handleVerifyOtp={handleVerifyOtp}
          isPortfolioModalOpen={isPortfolioModalOpen}
          setIsPortfolioModalOpen={setIsPortfolioModalOpen}
          portfolioForm={portfolioForm}
          setPortfolioForm={setPortfolioForm}
          editingPortfolioIndex={editingPortfolioIndex}
          handleOpenAddPortfolioModal={handleOpenAddPortfolioModal}
          handleOpenEditPortfolioModal={handleOpenEditPortfolioModal}
          handleDeletePortfolioItem={handleDeletePortfolioItem}
          handleSavePortfolioItem={handleSavePortfolioItem}
          handleAddPastBrand={handleAddPastBrand}
          handleRemovePastBrand={handleRemovePastBrand}
          pastBrandInput={newBrandInput}
          setPastBrandInput={setNewBrandInput}
          handleImageUpload={handleImageUpload}
          uploadingImage={uploadingImage}
          saveProfileChanges={saveProfileChanges}
          mobileScreen={mobileScreen}
          setMobileScreen={handleSetMobileScreen}
        />
      </div>

      {/* Desktop Layout - ZERO CHANGES */}
      <div className="hidden md:flex flex-col md:flex-row gap-8 px-4 md:px-8 py-10 pb-20">
        
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900 px-4 mb-4 font-display">Settings Hub</h2>
          {[
            { id: "profile", label: "Creator Profile", icon: <User size={16} /> },
            { id: "platforms", label: "Add Platforms", icon: <Share2 size={16} /> },
            { id: "rates", label: "Rate Cards", icon: <Briefcase size={16} /> },
            { id: "portfolio", label: "Portfolio", icon: <FolderKanban size={16} /> },
            { id: "kyc", label: "KYC Compliance", icon: <Shield size={16} /> },
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
                    layoutId="creatorSettingsTabPill"
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
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Creator Info</h3>
                  <p className="text-xs text-slate-500 font-medium">Keep your public profile up-to-date to attract brands.</p>
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
                  
                  {/* Avatar - positioned outside the banner container so it is NEVER clipped */}
                  <div className="absolute -bottom-10 left-6 z-20 flex items-end gap-3">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white bg-slate-50 overflow-hidden relative group shadow-lg">
                      <img 
                        src={profile.photo || "" + encodeURIComponent(profile.name || "Ravi Kumar") + "&background=7C3AED&color=fff"} 
                        className="w-full h-full object-cover" 
                        alt="Profile Avatar"
                      />
                      <button 
                        onClick={() => openEditModal('photo')} 
                        className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                      >
                        <Camera className="text-white" size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { field: 'name', label: 'Full Name' },
                    { field: 'profession', label: 'Profession' },
                    { field: 'niche', label: 'Primary Category' },
                    { field: 'language', label: 'Languages Spoken' },
                    { field: 'location', label: 'Location' },
                    { field: 'subCategories', label: 'Sub-Categories' }
                  ].map(p => (
                    <div key={p.field} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50/50">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{p.label}</span>
                        <span className="text-xs font-extrabold text-slate-800 break-all">
                          {p.field === 'subCategories' 
                            ? (profile.subCategories || []).join(", ") 
                            : p.field === 'pastBrands'
                              ? (profile.pastBrands || []).join(", ")
                              : p.field === 'portfolio'
                                ? (profile.portfolio || []).join(", ")
                                : (p.field === 'niche' && !profile[p.field])
                                  ? "Go to Settings & select category first"
                                  : profile[p.field]}
                        </span>
                      </div>
                      <button onClick={() => openEditModal(p.field)} className="text-[var(--violet)] hover:bg-[var(--violet)]/5 p-2 rounded-lg transition-colors shrink-0">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Contact Information with Secure OTP */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Secure Verification Contacts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1 w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mobile Phone</span>
                        <input 
                          type="tel"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                          placeholder="Enter mobile number"
                        />
                      </div>
                      <button 
                        onClick={() => saveProfileChanges({ phone: profile.phone })}
                        className="px-4 py-2 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-[10px] font-bold rounded-lg transition-all flex-shrink-0"
                      >
                        Update
                      </button>
                    </div>

                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Business Email</span>
                        <span className="text-xs font-extrabold text-slate-800">{profile.businessEmail || "Not linked"}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const val = prompt("Enter new business email to verify:", profile.businessEmail);
                          if (val) handleRequestOtp("businessEmail", val);
                        }} 
                        className="px-3 py-1.5 bg-[var(--violet)]/10 hover:bg-[var(--violet)]/15 text-[var(--violet)] text-[10px] font-bold rounded-lg transition-all"
                      >
                        Verify & Link
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "platforms" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Social Platforms</h3>
                  <p className="text-xs text-slate-500 font-medium">Connect your profiles to verify metrics and establish secure connections.</p>
                </div>

                <div className="relative min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {!activePlatform ? (
                      <motion.div
                        key="grid"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        {[
                          { 
                            id: "Instagram", 
                            name: "Instagram", 
                            icon: <img src="/assets/instagram.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Instagram" />, 
                            isComplete: !!profile.socials?.find(s => s.platform === 'Instagram')?.url, 
                            stat: profile.socials?.find(s => s.platform === 'Instagram')?.url ? "Connected" : "Add Instagram" 
                          },
                          { 
                            id: "YouTube", 
                            name: "YouTube", 
                            icon: <img src="/assets/youtube.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="YouTube" />, 
                            isComplete: !!profile.socials?.find(s => s.platform === 'YouTube')?.url, 
                            stat: profile.socials?.find(s => s.platform === 'YouTube')?.url ? "Connected" : "Add YouTube" 
                          },
                          { 
                            id: "Snapchat", 
                            name: "Snapchat", 
                            icon: <img src="/assets/snapchat.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Snapchat" />, 
                            isComplete: !!profile.socials?.find(s => s.platform === 'Snapchat')?.url, 
                            stat: profile.socials?.find(s => s.platform === 'Snapchat')?.url ? "Connected" : "Add Snapchat" 
                          },
                          { 
                            id: "LinkedIn", 
                            name: "LinkedIn", 
                            icon: <img src="/assets/linkedin.svg?v=2" className="w-11 h-11 object-contain rounded-[10px]" alt="LinkedIn" />, 
                            isComplete: !!profile.socials?.find(s => s.platform === 'LinkedIn')?.url, 
                            stat: profile.socials?.find(s => s.platform === 'LinkedIn')?.url ? "Connected" : "Add LinkedIn" 
                          },
                          { 
                            id: "Facebook", 
                            name: "Facebook", 
                            icon: <img src="/assets/facebook.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Facebook" />, 
                            isComplete: !!profile.socials?.find(s => s.platform === 'Facebook')?.url, 
                            stat: profile.socials?.find(s => s.platform === 'Facebook')?.url ? "Connected" : "Add Facebook" 
                          }
                        ].map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setActivePlatform(p.id)}
                            className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                              p.isComplete 
                                ? 'bg-white border-slate-200 shadow-sm' 
                                : 'bg-slate-50 border-dashed border-slate-200 hover:border-[var(--violet)] hover:bg-[var(--violet)]/5'
                            } ${p.id === 'Instagram' ? 'sm:col-span-2' : ''}`}
                          >
                            <div className="flex-shrink-0 flex items-center justify-center w-11 h-11">
                              {p.icon}
                            </div>
                            <div className="flex-grow text-left flex flex-col justify-center">
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                                {p.isComplete ? <CheckCircle2 size={12} className="text-green-500" /> : <Plus size={12} className="text-slate-400" />}
                                {p.stat}
                              </div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center"
                      >
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                          <button
                            onClick={() => setActivePlatform(null)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <h3 className="text-lg font-bold text-slate-800 capitalize">
                            {activePlatform} Details
                          </h3>
                        </div>

                        <div className="space-y-6">
                          {activePlatform === "Instagram" ? (
                            <>
                              <div>
                                <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                  Instagram Handle / Profile URL <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={profile.socials?.find(s => s.platform === "Instagram")?.url || ""}
                                  onChange={(e) => {
                                    const newSocials = profile.socials ? [...profile.socials] : [];
                                    const existingIndex = newSocials.findIndex(s => s.platform === "Instagram");
                                    if (existingIndex >= 0) {
                                      newSocials[existingIndex].url = e.target.value;
                                    } else {
                                      newSocials.push({ id: Date.now(), platform: "Instagram", url: e.target.value });
                                    }
                                    setProfile({ ...profile, socials: newSocials });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                  placeholder="@username or instagram.com/username"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                    Instagram Followers <span className="text-red-500">*</span>
                                  </label>
                                  <FormattedNumberInput
                                    value={profile.instagramFollowers || 0}
                                    onChange={(val) => setProfile(p => ({ ...p, instagramFollowers: val || 0 }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                    placeholder="e.g. 15,000"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">Total follower count</p>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                    Average Reach (30 Days) <span className="text-red-500">*</span>
                                  </label>
                                  <FormattedNumberInput
                                    value={profile.instagramAvgReach || 0}
                                    onChange={(val) => setProfile(p => ({ ...p, instagramAvgReach: val || 0 }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                    placeholder="e.g. 8,500"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">Average views/reach per Reel</p>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                    Average Likes (per Post) <span className="text-red-500">*</span>
                                  </label>
                                  <FormattedNumberInput
                                    value={profile.instagramAvgLikes || 0}
                                    onChange={(val) => setProfile(p => ({ ...p, instagramAvgLikes: val || 0 }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                    placeholder="e.g. 1,200"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">Avg likes per post</p>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                    Average Comments (per Post) <span className="text-red-500">*</span>
                                  </label>
                                  <FormattedNumberInput
                                    value={profile.instagramAvgComments || 0}
                                    onChange={(val) => setProfile(p => ({ ...p, instagramAvgComments: val || 0 }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                    placeholder="e.g. 85"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1">Avg comments per post</p>
                                </div>
                              </div>

                              {profile.instagramFollowers > 0 && (() => {
                                const likes = Number(profile.instagramAvgLikes || 0);
                                const comments = Number(profile.instagramAvgComments || 0);
                                const followers = Number(profile.instagramFollowers || 0);
                                const er = ((likes + comments) / followers) * 100;
                                const isUnusuallyHigh = er > 50;

                                return (
                                  <div className="space-y-3">
                                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-purple-600 font-extrabold uppercase tracking-wider text-[10px]">Live Calculated Engagement</span>
                                        <p className="text-purple-950 font-black text-lg">
                                          {er.toFixed(2)}%
                                        </p>
                                      </div>
                                      <div className="text-right text-slate-500 font-medium text-[11px]">
                                        <p>Likes + Comments: <strong className="text-slate-800">{(likes + comments).toLocaleString()}</strong></p>
                                        <p>Followers: <strong className="text-slate-800">{followers.toLocaleString()}</strong></p>
                                      </div>
                                    </div>

                                    {isUnusuallyHigh && (
                                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-medium">
                                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p>This seems unusually high — please recheck your numbers.</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div>
                              <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">
                                {activePlatform} Profile URL / Handle
                              </label>
                              <input
                                type="text"
                                value={profile.socials?.find(s => s.platform === activePlatform)?.url || ""}
                                onChange={(e) => {
                                  const newSocials = profile.socials ? [...profile.socials] : [];
                                  const existingIndex = newSocials.findIndex(s => s.platform === activePlatform);
                                  if (existingIndex >= 0) {
                                    newSocials[existingIndex].url = e.target.value;
                                  } else {
                                    newSocials.push({ id: Date.now(), platform: activePlatform, url: e.target.value });
                                  }
                                  setProfile({ ...profile, socials: newSocials });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[var(--violet)] outline-none font-medium text-sm"
                                placeholder="@handle or Profile URL"
                              />
                            </div>
                          )}
                          
                          <button 
                            onClick={() => {
                              const handle = profile.socials?.find(s => s.platform === activePlatform)?.url;
                              if (activePlatform === "Instagram") {
                                if (!handle) {
                                  toast.error("Please enter your Instagram handle or profile link.");
                                  return;
                                }
                                if (!profile.instagramFollowers || profile.instagramFollowers <= 0) {
                                  toast.error("Please enter a valid Instagram follower count greater than 0.");
                                  return;
                                }
                                if (!profile.instagramAvgReach || profile.instagramAvgReach <= 0) {
                                  toast.error("Please enter a valid Average Reach greater than 0.");
                                  return;
                                }
                              }
                              saveProfileChanges({});
                              setActivePlatform(null);
                            }} 
                            className="w-full bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm text-sm"
                          >
                            Save {activePlatform} Details
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === "rates" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">Rate Cards</h3>
                  <p className="text-xs text-slate-500 font-medium">Define your standard delivery rates so brands can initiate direct handshake deals.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'reels', label: 'Instagram Reel Rate (INR)', reach: creatorMetrics.instagramAvgReach, min: 1000 },
                    { key: 'stories', label: 'Instagram Story Rate (INR)', reach: creatorMetrics.instagramAvgReach, min: 200 },
                    { key: 'youtube_integration', label: 'YouTube Video Rate (INR)', reach: creatorMetrics.youtubeAvgViews, min: 1000 }
                  ].map(rc => {
                    const validation = validateRate(rateCard[rc.key], rc.reach, rc.min);
                    return (
                      <div key={rc.key} className="flex flex-col gap-2">
                        <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-center">
                          <span className="text-xs font-extrabold text-slate-800">{rc.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">₹</span>
                            <FormattedNumberInput 
                              value={rateCard[rc.key] || ""}
                              onChange={val => setRateCard(prev => ({ ...prev, [rc.key]: Number(val) || 0 }))}
                              onBlur={() => saveProfileChanges({})}
                              className="w-32 bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:border-[var(--violet)] text-right"
                            />
                          </div>
                        </div>
                        {validation && (
                          <div className={`text-xs p-3 rounded-xl border ${validation.status === "success" ? "bg-[#9ece6a]/10 border-[#9ece6a]/20 text-[#9ece6a]" : validation.status === "warning" ? "bg-[#e0af68]/10 border-[#e0af68]/20 text-[#e0af68]" : "bg-[#f7768e]/10 border-[#f7768e]/20 text-[#f7768e]"}`}>
                            {validation.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Barter and Payment Preferences */}
                <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Barter Mode Preference</label>
                    <select 
                      value={profile.barterPrefs[0] || "Products Only"}
                      onChange={e => saveProfileChanges({ barterPrefs: [e.target.value] })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                    >
                      <option value="Products Only">Products Only (Barter Ok)</option>
                      <option value="Paid Campaigns Only">Paid Campaigns Only</option>
                      <option value="Hybrid (Paid + Barter)">Hybrid (Paid + Barter)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Settlement Timeline</label>
                    <select 
                      value={profile.paymentTimeline}
                      onChange={e => saveProfileChanges({ paymentTimeline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                    >
                      <option value="Within 30 Days">Within 30 Days (Standard)</option>
                      <option value="Within 15 Days">Within 15 Days (Express)</option>
                      <option value="Advance Payment">Advance Payment Required</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button onClick={() => saveProfileChanges({})} className="bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                    <CheckCircle size={14} /> Save Rate Cards
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === "portfolio" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
                    <FolderKanban className="text-[var(--violet)]" size={20} /> Creator Portfolio & Past Work
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Showcase past brand work, delivered reels, YouTube videos, and Google Drive links. These appear live on your Public Profile.
                  </p>
                </div>

                {/* Past Brand Collaborations Card */}
                <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <HeartHandshake size={16} className="text-[var(--violet)]" /> Trusted Past Brand Collaborations
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      {(profile.pastBrands || []).length} Brands Listed
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(profile.pastBrands || []).map((brand, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-extrabold shadow-2xs group hover:border-red-200 transition-all"
                      >
                        {brand}
                        <button 
                          onClick={() => handleRemovePastBrand(brand)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded-md transition-colors"
                          title="Remove brand"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {(profile.pastBrands || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No past brand tags added yet.</p>
                    )}
                  </div>

                  {/* Add brand input */}
                  <div className="flex items-center gap-2 max-w-md pt-1">
                    <input
                      type="text"
                      placeholder="Enter brand name (e.g. Nykaa, Mamaearth, Puma)"
                      value={newBrandInput}
                      onChange={(e) => setNewBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPastBrand();
                        }
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[var(--violet)] shadow-2xs"
                    />
                    <button
                      onClick={handleAddPastBrand}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Portfolio Deliverables List & Player Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Delivered Videos & Deliverables ({(profile.portfolio || []).length})
                    </h4>
                    {(profile.portfolio || []).length > 0 && (
                      <button
                        onClick={handleOpenAddPortfolioModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                      >
                        <Plus size={14} /> Add Video / Link
                      </button>
                    )}
                  </div>

                  {(profile.portfolio || []).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(profile.portfolio || []).map((item, idx) => {
                        const itemUrl = item.content_url || item.url || item.link || "";
                        const itemTitle = item.title || item.brand_name || "Deliverable";
                        return (
                          <div 
                            key={item.id || idx}
                            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-violet-200 transition-all flex flex-col justify-between group"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase bg-violet-50 text-[var(--violet)] px-2.5 py-1 rounded-md">
                                  {item.brand_name || item.brand || "Brand Deal"}
                                </span>
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEditPortfolioModal(idx)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                    title="Edit item"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePortfolioItem(idx)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {item.title && (
                                <h5 className="font-extrabold text-xs text-slate-900 line-clamp-2">{item.title}</h5>
                              )}

                              {/* Embedded Video Player Preview */}
                              <VideoEmbedPreview url={itemUrl} title={itemTitle} watermark={false} isApproved={true} />

                              {item.description && (
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {itemUrl && (
                              <div className="pt-3 border-t border-slate-100 mt-3">
                                <a
                                  href={itemUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-violet-50 text-slate-700 hover:text-[var(--violet)] text-xs font-bold rounded-xl border border-slate-200/60 transition-colors"
                                >
                                  <ExternalLink size={12} /> Open Original Link
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
                      <Video size={36} className="text-slate-300 mx-auto" />
                      <h4 className="font-extrabold text-sm text-slate-700">No Portfolio Videos Added Yet</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Add your YouTube links, Instagram Reels, Google Drive videos, or campaign work to stand out to brands!
                      </p>
                      <button
                        onClick={handleOpenAddPortfolioModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        <Plus size={16} /> Add First Portfolio Link
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "kyc" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-display">KYC Compliance</h3>
                  <p className="text-xs text-slate-500 font-medium">Verification documents are processed securely to ensure prompt compliance clearance.</p>
                </div>

                {kycLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : (!kycObj || kycObj.status === "NOT_SUBMITTED") ? (
                  <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                    <ShieldAlert className="mx-auto text-slate-400 mb-3" size={32} />
                    <h4 className="font-extrabold text-slate-700 text-sm">Identity Verification Required</h4>
                    <p className="text-[11px] text-slate-500 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
                      You have not completed identity verification. Please link compliance documents to begin receiving campaign contract payouts.
                    </p>
                    <a 
                      href="/creator/kyc" 
                      className="inline-block mt-4 px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                    >
                      Begin Compliance Registration
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
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Identity Compliance Status</span>
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
                      </div>

                      {/* Status Messages */}
                      {(kycObj.status === 'PENDING' || kycObj.status === 'pending' || kycObj.status === 'UNDER_REVIEW' || kycObj.status === 'under_review') && (
                        <p className="text-xs text-amber-700 font-medium mt-4 bg-amber-50 border border-amber-100/50 rounded-xl p-3 leading-relaxed">
                          We are currently validating your identity credentials. Campaign contract payouts will be cleared as soon as review finishes (usually takes less than 2 hours).
                        </p>
                      )}

                      {(kycObj.status === 'APPROVED' || kycObj.status === 'approved') && (
                        <p className="text-xs text-emerald-700 font-medium mt-4 bg-emerald-50 border border-emerald-100/50 rounded-xl p-3 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span>✓ Your identity compliance verification is approved. You can edit or update your Bank account details and UPI ID anytime.</span>
                          <a href="/creator/kyc" className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all shadow-sm">
                            <Edit3 size={13} /> Edit Details
                          </a>
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
                      <div className="border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Submitted Credentials Overview</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Holder Name</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.creator_name || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">PAN Identity Reference</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.creator_pan || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Aadhaar Reference</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.creator_aadhaar || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Bank Transfer Account</span>
                          <span className="text-slate-800 font-extrabold">
                            {kycObj.documents?.bank_name} {kycObj.documents?.bank_account ? `- XXXX${kycObj.documents.bank_account.slice(-4)}` : "N/A"}
                          </span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Bank IFSC</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.bank_ifsc || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">UPI Virtual Address</span>
                          <span className="text-slate-800 font-extrabold flex items-center gap-2 flex-wrap">
                            {kycObj.documents?.upi_id || "N/A"}
                            {(kycObj.documents?.upi_qr_code_url || kycObj.documents?.uploaded_files?.[3]) && (
                              <a
                                href={kycObj.documents?.upi_qr_code_url || kycObj.documents?.uploaded_files?.[3]}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 transition-colors"
                              >
                                <QrCode size={12} /> View QR Code
                              </a>
                            )}
                          </span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Instagram Handle</span>
                          <span className="text-slate-800 font-extrabold">{kycObj.documents?.social_handle || "N/A"}</span>
                        </div>
                        <div className="py-1 flex flex-col gap-0.5">
                          <span className="text-slate-400 font-bold">Verified Followers</span>
                          <span className="text-slate-800 font-extrabold">
                            {kycObj.documents?.followers ? Number(kycObj.documents.followers).toLocaleString() : "N/A"}
                          </span>
                        </div>

                        {/* Document Download Links */}
                        <div className="py-2 flex flex-col gap-2 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Submitted Document Files</span>
                          <div className="flex flex-wrap gap-3">
                            {kycObj.documents?.uploaded_files?.[0] && (
                              <a 
                                href={kycObj.documents.uploaded_files[0]} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold border border-slate-200 transition-colors text-xs"
                              >
                                <FileText size={14} /> PAN Card Document
                              </a>
                            )}
                            {kycObj.documents?.uploaded_files?.[1] && (
                              <a 
                                href={kycObj.documents.uploaded_files[1]} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold border border-slate-200 transition-colors text-xs"
                              >
                                <FileText size={14} /> Aadhaar Front
                              </a>
                            )}
                            {kycObj.documents?.uploaded_files?.[2] && (
                              <a 
                                href={kycObj.documents.uploaded_files[2]} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold border border-slate-200 transition-colors text-xs"
                              >
                                <FileText size={14} /> Aadhaar Back
                              </a>
                            )}
                            {(kycObj.documents?.upi_qr_code_url || kycObj.documents?.uploaded_files?.[3]) && (
                              <a 
                                href={kycObj.documents?.upi_qr_code_url || kycObj.documents?.uploaded_files?.[3]} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg font-bold border border-violet-200 transition-colors text-xs"
                              >
                                <QrCode size={14} /> UPI Payment QR Image
                              </a>
                            )}
                          </div>
                        </div>
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
                    <p className="text-xs text-slate-500 font-medium">Keep track of other active logins across your registered devices.</p>
                  </div>
                  <button 
                    onClick={handleLogoutAllOtherSessions}
                    className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Logout All Other Devices
                  </button>
                </div>

                {loadingSessions ? (
                  <div className="flex justify-center items-center py-10">
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
            <h3 className="text-base font-extrabold text-slate-800 mb-4 font-display">Update {editModalField.toUpperCase()}</h3>
            
            {editModalField === 'location' ? (
              <LocationAutocomplete 
                value={editValue} 
                onChange={val => setEditValue(val)} 
                className="mb-4"
              />
            ) : editModalField === 'subCategories' ? (
              <div className="mb-4">
                {!profile.niche ? (
                  <div className="p-4 bg-amber-50 text-amber-700 text-sm rounded-xl border border-amber-100 font-medium">
                    Please select a Primary Category first before adding Sub-Categories.
                  </div>
                ) : (
                  <UniversalTagSearch
                    selectedTags={subCategoriesInput ? subCategoriesInput.split(",").map(s => s.trim()).filter(Boolean) : []}
                    onChange={newTags => setSubCategoriesInput(newTags.join(", "))}
                    type="skill"
                    context={profile.niche}
                    placeholder={`Search skills for ${profile.niche}...`}
                  />
                )}
              </div>
            ) : editModalField === 'niche' ? (
              <div className="mb-4">
                <UniversalTagSearch
                  selectedTags={editValue ? [editValue] : []}
                  onChange={newTags => setEditValue(newTags[newTags.length - 1] || "")}
                  type="category"
                  placeholder="Search or create primary niche..."
                />
              </div>
            ) : editModalField === 'profession' ? (
              <div className="space-y-4 mb-4">
                <input 
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder="e.g. Content Creator, Fitness Coach, YouTuber..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                />
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested Professions:</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_PROFESSIONS.map((prof) => (
                      <button
                        key={prof}
                        type="button"
                        onClick={() => setEditValue(prof)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          editValue === prof
                            ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        {prof}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : editModalField === 'language' ? (
              <div className="space-y-4 mb-4">
                {/* Current Selected Languages */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Selected Languages ({editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean).length : 0})
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {editValue && editValue.split(",").map(s => s.trim()).filter(Boolean).length > 0 ? (
                      editValue.split(",").map(s => s.trim()).filter(Boolean).map((lang) => (
                        <span 
                          key={lang} 
                          className="inline-flex items-center gap-1.5 bg-[var(--violet)] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() => {
                              const curr = editValue.split(",").map(s => s.trim()).filter(Boolean);
                              const updated = curr.filter(l => l.toLowerCase() !== lang.toLowerCase());
                              setEditValue(updated.join(", "));
                            }}
                            className="hover:opacity-75 focus:outline-none"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic py-1">No languages selected yet.</span>
                    )}
                  </div>
                </div>

                {/* Popular Indian & Global Languages */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Languages:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {INDIAN_LANGUAGES.map((lang) => {
                      const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                      const isSelected = currentArr.some(l => l.toLowerCase() === lang.toLowerCase());
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            let updated;
                            if (isSelected) {
                              updated = currentArr.filter(l => l.toLowerCase() !== lang.toLowerCase());
                            } else {
                              updated = [...currentArr, lang];
                            }
                            setEditValue(updated.join(", "));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add Custom Language */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Add Custom Language:</p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      id="custom-lang-input"
                      placeholder="e.g. French, Spanish, German..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                            if (!currentArr.some(l => l.toLowerCase() === val.toLowerCase())) {
                              setEditValue([...currentArr, val].join(", "));
                            }
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("custom-lang-input");
                        if (input && input.value.trim()) {
                          const val = input.value.trim();
                          const currentArr = editValue ? editValue.split(",").map(s => s.trim()).filter(Boolean) : [];
                          if (!currentArr.some(l => l.toLowerCase() === val.toLowerCase())) {
                            setEditValue([...currentArr, val].join(", "));
                          }
                          input.value = "";
                        }
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (editModalField === 'photo' || editModalField === 'cover') ? (
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
                      className={`object-cover border border-slate-100 bg-white ${editModalField === 'photo' ? 'w-20 h-20 rounded-full' : 'w-full h-24 rounded-lg'}`}
                      onError={(e) => {
                        e.target.src = "https://placehold.co/400x150?text=Invalid+Image+URL";
                      }}
                    />
                  </div>
                )}
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
              <button onClick={saveEditValue} className="px-8 py-3 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-sm font-bold rounded-xl shadow-md w-full sm:w-auto">
                Save
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
      {/* Portfolio Add/Edit Modal */}
      <AnimatePresence>
        {isPortfolioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <Video size={18} className="text-[var(--violet)]" />
                  {editingPortfolioIndex !== null ? "Edit Portfolio Work" : "Add Portfolio Video / Link"}
                </h3>
                <button
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Campaign / Deliverable Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Collection Unboxing Reel"
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nykaa, Mamaearth"
                      value={portfolioForm.brand_name}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, brand_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Platform / Type
                    </label>
                    <select
                      value={portfolioForm.platform}
                      onChange={(e) => setPortfolioForm({ ...portfolioForm, platform: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                    >
                      <option value="instagram">Instagram Reel / Post</option>
                      <option value="youtube">YouTube Video / Shorts</option>
                      <option value="gdrive">Google Drive Video</option>
                      <option value="direct_video">Direct Video / MP4</option>
                      <option value="other">Other Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Video / Content URL (YouTube, Instagram Reel, Drive, MP4)
                  </label>
                  <input
                    type="text"
                    placeholder="Paste link: https://www.youtube.com/watch?v=... or Reel / Drive link"
                    value={portfolioForm.content_url}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, content_url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-[var(--violet)]"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Supports YouTube, Shorts, Instagram Reels, Google Drive videos, and MP4 direct links.
                  </p>
                </div>

                {/* Real-time embedded player preview inside the modal */}
                {portfolioForm.content_url && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Live Video Preview:
                    </label>
                    <VideoEmbedPreview 
                      url={portfolioForm.content_url} 
                      title={portfolioForm.title || "Video Preview"} 
                      watermark={false}
                      isApproved={true}
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Description / Deliverable Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Delivered 1x Reel + 2x Instagram Stories with 180k+ organic views."
                    value={portfolioForm.description}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[var(--violet)] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPortfolioModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePortfolioItem}
                  className="px-5 py-2 bg-[var(--violet)] hover:bg-[var(--violet-dark)] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Save Portfolio Work
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
