import React, { useState, useEffect, useMemo, useRef } from "react";
import { safeLower, safeUpper } from "../../utils/safeFormat";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Users, Briefcase, ChevronRight, Share2, ArrowLeft, Camera, 
  Edit2, Edit3, CheckCircle, AlertCircle, Globe, Grid, MapPin, Package, Calendar, 
  LogOut, Instagram, Youtube, Twitter, Linkedin, X, Smartphone, Mail, 
  MonitorSmartphone, Link as LinkIcon, Download, Loader2, Plus, Trash2, ShieldAlert, FileText, Ghost, Facebook, CheckCircle2,
  FolderKanban, Video, HeartHandshake, Play, ExternalLink, QrCode, Search, HelpCircle, CreditCard, ChevronDown, Check, Copy,
  CheckCheck, Lock, UploadCloud, MessageSquare, AlertTriangle, RefreshCw, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { VALID_NICHES, INDIAN_LANGUAGES, POPULAR_PROFESSIONS } from "../../lib/constants";
import { LocationAutocomplete } from "../../components/ui/autocomplete";
import { FormattedNumberInput } from "../../components/ui/FormattedNumberInput";
import VideoEmbedPreview from "../../components/shared/VideoEmbedPreview";
import TicketForm from "../../components/help/TicketForm";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import { api } from "../../lib/api";

const ALL_PROFESSIONS = [
  "Content Creator",
  "Video Creator",
  "Influencer",
  "Model",
  "Artist",
  "Photographer",
  "Streamer",
  "Blogger",
  "Writer",
  "Podcaster",
  "Educator",
  "Musician",
  "Fashion Stylist",
  "Fitness Coach",
  "Chef / Foodie",
  "Tech Reviewer",
  "Gamer",
  "Actor / Performer"
];

const SUGGESTED_SUB_CATEGORIES = [
  "Unboxing",
  "Tech Reviews",
  "Street Style",
  "Tutorials",
  "Vlogs",
  "Budget Travel",
  "Skincare",
  "Home Workouts",
  "Quick Recipes",
  "Daily Routines",
  "Gaming Highlights",
  "Hauls"
];

const ALL_LANGUAGES = [
  "English",
  "Hindi",
  "Hinglish",
  "Punjabi",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Odia",
  "Assamese"
];

const PLATFORM_CONFIG = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    bg: "bg-pink-50",
    text: "text-pink-600",
    pitch: "Add Reel views, followers & reach",
    hasMetrics: true
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    color: "#FF0000",
    bg: "bg-red-50",
    text: "text-red-600",
    pitch: "Add channel link for video collabs",
    hasMetrics: false
  },
  snapchat: {
    id: "snapchat",
    name: "Snapchat",
    icon: Ghost,
    color: "#EAB308",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    pitch: "Add Public Story & Spotlight profile",
    hasMetrics: false
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0A66C2",
    bg: "bg-blue-50",
    text: "text-blue-600",
    pitch: "Add professional thought leadership profile",
    hasMetrics: false
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    pitch: "Add Facebook Creator page URL",
    hasMetrics: false
  }
};

export default function CreatorMobileProfile({
  user,
  logout,
  refreshUser,
  profile,
  setProfile,
  rateCard,
  setRateCard,
  creatorMetrics,
  kycObj,
  kycLoading,
  fetchKycStatus,
  sessionsList = [],
  loadingSessions = false,
  handleLogoutSession,
  handleLogoutAllOtherSessions,
  activePlatform,
  setActivePlatform,
  otpSent,
  setOtpSent,
  otpTargetType,
  otpTargetValue,
  otpValue,
  setOtpValue,
  verifyingOtp,
  handleRequestOtp,
  handleVerifyOtp,
  isPortfolioModalOpen,
  setIsPortfolioModalOpen,
  portfolioForm,
  setPortfolioForm,
  editingPortfolioIndex,
  handleOpenAddPortfolioModal,
  handleOpenEditPortfolioModal,
  handleDeletePortfolioItem,
  handleSavePortfolioItem,
  handleAddPastBrand,
  handleRemovePastBrand,
  pastBrandInput,
  setPastBrandInput,
  handleImageUpload,
  uploadingImage,
  saveProfileChanges,
  mobileScreen = null,
  setMobileScreen
}) {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const panInputRef = useRef(null);
  const qrInputRef = useRef(null);

  // Local state for creator info form
  const [editForm, setEditForm] = useState({
    name: profile?.name || "",
    profession: profile?.profession || "Content Creator",
    bio: profile?.bio || "",
    niche: profile?.niche || "",
    subCategories: profile?.subCategories || [],
    languages: Array.isArray(profile?.languages) ? profile.languages : (profile?.language ? [profile.language] : ["English"]),
    location: profile?.location || "",
    phone: profile?.phone || "",
    businessEmail: profile?.businessEmail || "",
    coverImage: profile?.coverImage || "",
    photo: profile?.photo || ""
  });

  // Keep editForm synced with incoming profile
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || "",
        profession: profile.profession || "Content Creator",
        bio: profile.bio || "",
        niche: profile.niche || "",
        subCategories: profile.subCategories || [],
        languages: Array.isArray(profile.languages) ? profile.languages : (profile.language ? [profile.language] : ["English"]),
        location: profile.location || "",
        phone: profile.phone || "",
        businessEmail: profile.businessEmail || "",
        coverImage: profile.coverImage || "",
        photo: profile.photo || ""
      });
    }
  }, [profile]);

  // Dirty check for Creator Info form
  const isCreatorInfoDirty = useMemo(() => {
    if (!profile) return false;
    const initialLanguages = Array.isArray(profile.languages) ? profile.languages : (profile.language ? [profile.language] : ["English"]);
    const initialSubCats = profile.subCategories || [];

    const isNameDiff = (editForm.name || "") !== (profile.name || "");
    const isProfDiff = (editForm.profession || "") !== (profile.profession || "Content Creator");
    const isBioDiff = (editForm.bio || "") !== (profile.bio || "");
    const isNicheDiff = (editForm.niche || "") !== (profile.niche || "");
    const isLocDiff = (editForm.location || "") !== (profile.location || "");
    const isPhoneDiff = (editForm.phone || "") !== (profile.phone || "");
    const isEmailDiff = (editForm.businessEmail || "") !== (profile.businessEmail || "");
    const isCoverDiff = (editForm.coverImage || "") !== (profile.coverImage || "");
    const isPhotoDiff = (editForm.photo || "") !== (profile.photo || "");

    const isSubCatsDiff = JSON.stringify(editForm.subCategories.slice().sort()) !== JSON.stringify(initialSubCats.slice().sort());
    const isLangDiff = JSON.stringify(editForm.languages.slice().sort()) !== JSON.stringify(initialLanguages.slice().sort());

    return isNameDiff || isProfDiff || isBioDiff || isNicheDiff || isLocDiff || isPhoneDiff || isEmailDiff || isCoverDiff || isPhotoDiff || isSubCatsDiff || isLangDiff;
  }, [editForm, profile]);

  const [savingCreatorInfo, setSavingCreatorInfo] = useState(false);
  const [showProfessionSheet, setShowProfessionSheet] = useState(false);
  const [showNicheModal, setShowNicheModal] = useState(false);

  // Type-ahead category search
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const categorySuggestions = useMemo(() => {
    const list = VALID_NICHES || [
      "Technology & Gadgets", "Fashion & Lifestyle", "Beauty & Skincare", "Fitness & Wellness",
      "Food & Cooking", "Travel & Adventure", "Gaming & Esports", "Finance & Crypto",
      "Education & Career", "Entertainment & Comedy", "Music & Dance", "Parenting & Family",
      "Automobile & Bikes", "Business & Startups"
    ];
    if (!categorySearch.trim()) return list;
    return list.filter(item => item.toLowerCase().includes(categorySearch.toLowerCase().trim()));
  }, [categorySearch]);

  // Social Platform edit form state
  const [editingPlatformId, setEditingPlatformId] = useState(null);
  const [platformForm, setPlatformForm] = useState({
    url: "",
    followers: "",
    reach: "",
    likes: "",
    comments: ""
  });
  const [savingPlatform, setSavingPlatform] = useState(false);

  // Referral stats
  const [referralStats, setReferralStats] = useState({ total_referred: 0, rewards_earned: 0, reward_amount: 500 });
  const [copiedLink, setCopiedLink] = useState(false);

  // Legal Accordion state
  const [expandedLegal, setExpandedLegal] = useState({ privacy: true, escrow: false, dispute: false });

  // Help search & FAQ accordion
  const [helpSearchQuery, setHelpSearchQuery] = useState("");
  const [isHelpTicketOpen, setIsHelpTicketOpen] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  // Local KYC Form state (Frames 5 & 6)
  const [kycForm, setKycForm] = useState({
    legalName: "",
    panNumber: "",
    panPhotoUrl: "",
    payoutMethod: "upi", // 'upi' | 'bank'
    upiId: "",
    upiQrUrl: "",
    bankName: "",
    holderName: "",
    accountNumber: "",
    ifscCode: ""
  });
  const [isSection1Collapsed, setIsSection1Collapsed] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [isEditingKyc, setIsEditingKyc] = useState(false);

  // Sync KYC form with kycObj
  useEffect(() => {
    if (kycObj && kycObj.documents) {
      const docs = kycObj.documents;
      setKycForm({
        legalName: docs.creator_name || docs.legal_name || profile?.name || "",
        panNumber: (docs.creator_pan || docs.identity_num || "").toUpperCase(),
        panPhotoUrl: docs.uploaded_files?.[0] || docs.pan_photo_url || "",
        payoutMethod: docs.bank_account && !docs.upi_id ? "bank" : "upi",
        upiId: docs.upi_id || "",
        upiQrUrl: docs.upi_qr_code_url || docs.uploaded_files?.[3] || "",
        bankName: docs.bank_name || "",
        holderName: docs.bank_holder_name || docs.creator_name || profile?.name || "",
        accountNumber: docs.bank_account || "",
        ifscCode: (docs.bank_ifsc || "").toUpperCase()
      });
      if (docs.creator_pan && docs.uploaded_files?.[0]) {
        setIsSection1Collapsed(true);
      }
    } else if (profile) {
      setKycForm(prev => ({
        ...prev,
        legalName: prev.legalName || profile.name || "",
        holderName: prev.holderName || profile.name || ""
      }));
    }
  }, [kycObj, profile]);

  // Handle Share
  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/creator/${user?.user_id || user?.id || ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.name || "Creator"} Profile on Ybex`,
          text: `Check out my verified creator media kit and collaborate with zero middlemen fees!`,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          navigator.clipboard.writeText(shareUrl);
          toast.success("Profile link copied to clipboard! 📋");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied to clipboard! 📋");
    }
  };

  // Back button helper
  const renderBackHeader = (title) => (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EDEDF2] px-4 py-3 flex items-center justify-between w-full shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (editingPlatformId) {
              setEditingPlatformId(null);
              setMobileScreen("platforms");
            } else {
              setMobileScreen(null);
            }
          }}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
          {title}
        </h1>
      </div>
    </header>
  );

  // -------------------------------------------------------------
  // HANDLERS: CREATOR INFO SAVE
  // -------------------------------------------------------------
  const handleSaveCreatorInfo = async () => {
    if (!editForm.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!editForm.niche.trim()) {
      toast.error("Primary category is required");
      return;
    }

    try {
      setSavingCreatorInfo(true);
      const updated = {
        name: editForm.name.trim(),
        profession: editForm.profession,
        bio: editForm.bio.trim(),
        niche: editForm.niche.trim(),
        subCategories: editForm.subCategories,
        languages: editForm.languages,
        language: editForm.languages[0] || "English",
        location: editForm.location.trim(),
        phone: editForm.phone.trim(),
        businessEmail: editForm.businessEmail.trim(),
        coverImage: editForm.coverImage,
        photo: editForm.photo
      };

      if (saveProfileChanges) {
        await saveProfileChanges(updated);
      } else {
        await api.patch("creators/me", updated);
        setProfile(prev => ({ ...prev, ...updated }));
        toast.success("Creator info saved successfully!");
      }
      setMobileScreen(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSavingCreatorInfo(false);
    }
  };

  // Avatar and Cover upload
  const onUploadPhoto = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading(`Uploading ${type === 'avatar' ? 'profile photo' : 'cover image'}...`, { id: "upload" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        if (type === 'avatar') {
          setEditForm(prev => ({ ...prev, photo: url }));
          setProfile(prev => ({ ...prev, photo: url }));
        } else {
          setEditForm(prev => ({ ...prev, coverImage: url }));
          setProfile(prev => ({ ...prev, coverImage: url }));
        }
        toast.success(`${type === 'avatar' ? 'Profile photo' : 'Cover image'} updated!`, { id: "upload" });
      }
    } catch (err) {
      toast.error("Image upload failed", { id: "upload" });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: PLATFORMS
  // -------------------------------------------------------------
  const handleOpenPlatformEdit = (platformId) => {
    setEditingPlatformId(platformId);
    const existing = profile?.socialLinks?.[platformId] || {};
    const metrics = creatorMetrics?.[platformId] || {};
    setPlatformForm({
      url: existing.url || existing.handle || profile?.handles?.[platformId] || "",
      followers: existing.followers || metrics.followers || "",
      reach: existing.reach || metrics.reach || "",
      likes: existing.likes || metrics.likes || "",
      comments: existing.comments || metrics.comments || ""
    });
    setMobileScreen(`platform_${platformId}`);
  };

  const handleSavePlatform = async (platformId) => {
    if (!platformForm.url.trim()) {
      toast.error("Please enter a handle or profile URL");
      return;
    }

    try {
      setSavingPlatform(true);
      const updatedSocialLinks = {
        ...(profile?.socialLinks || {}),
        [platformId]: {
          url: platformForm.url.trim(),
          handle: platformForm.url.trim().replace(/^https?:\/\/(www\.)?(instagram|youtube|linkedin|facebook|snapchat)\.com\//i, '').replace(/^@/, ''),
          followers: Number(platformForm.followers) || 0,
          reach: Number(platformForm.reach) || 0,
          likes: Number(platformForm.likes) || 0,
          comments: Number(platformForm.comments) || 0,
          verified: false
        }
      };

      const payload = {
        socialLinks: updatedSocialLinks,
        handles: {
          ...(profile?.handles || {}),
          [platformId]: platformForm.url.trim()
        }
      };

      if (saveProfileChanges) {
        await saveProfileChanges(payload);
      } else {
        await api.patch("creators/me", payload);
        setProfile(prev => ({ ...prev, ...payload }));
      }

      toast.success(`${PLATFORM_CONFIG[platformId]?.name || "Platform"} updated!`);
      setEditingPlatformId(null);
      setMobileScreen("platforms");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save platform details");
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleRemovePlatform = async (platformId) => {
    if (!window.confirm(`Are you sure you want to remove ${PLATFORM_CONFIG[platformId]?.name || "this platform"}?`)) {
      return;
    }
    try {
      const updatedSocialLinks = { ...(profile?.socialLinks || {}) };
      delete updatedSocialLinks[platformId];
      const updatedHandles = { ...(profile?.handles || {}) };
      delete updatedHandles[platformId];

      const payload = { socialLinks: updatedSocialLinks, handles: updatedHandles };
      if (saveProfileChanges) {
        await saveProfileChanges(payload);
      } else {
        await api.patch("creators/me", payload);
        setProfile(prev => ({ ...prev, ...payload }));
      }
      toast.success("Platform removed");
    } catch (err) {
      toast.error("Failed to remove platform");
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: KYC VERIFICATION (Frames 5 & 6)
  // -------------------------------------------------------------
  const handleUploadPanPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPan(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setKycForm(prev => ({ ...prev, panPhotoUrl: url }));
        toast.success("PAN document uploaded!");
      }
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setUploadingPan(false);
    }
  };

  const handleUploadQrCode = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingQr(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setKycForm(prev => ({ ...prev, upiQrUrl: url }));
        toast.success("UPI QR Code uploaded!");
      }
    } catch (err) {
      toast.error("Failed to upload QR Code");
    } finally {
      setUploadingQr(false);
    }
  };

  const isKycFormValid = useMemo(() => {
    if (!kycForm.legalName.trim()) return false;
    if (!kycForm.panNumber.trim() || kycForm.panNumber.trim().length !== 10) return false;
    if (!kycForm.panPhotoUrl) return false;

    if (kycForm.payoutMethod === "upi") {
      if (!kycForm.upiId.trim() || !kycForm.upiId.includes("@")) return false;
    } else {
      if (!kycForm.bankName.trim()) return false;
      if (!kycForm.holderName.trim()) return false;
      if (!kycForm.accountNumber.trim()) return false;
      if (!kycForm.ifscCode.trim() || kycForm.ifscCode.trim().length !== 11) return false;
    }
    return true;
  }, [kycForm]);

  const handleSubmitKyc = async () => {
    if (!isKycFormValid) {
      toast.error("Please complete all required fields with valid details.");
      return;
    }

    try {
      setSubmittingKyc(true);
      const payload = {
        creator_name: kycForm.legalName.trim(),
        creator_pan: kycForm.panNumber.trim().toUpperCase(),
        identity_num: kycForm.panNumber.trim().toUpperCase(),
        payout_method: kycForm.payoutMethod,
        upi_id: kycForm.payoutMethod === "upi" ? kycForm.upiId.trim() : null,
        upi_qr_code_url: kycForm.payoutMethod === "upi" ? kycForm.upiQrUrl : null,
        bank_name: kycForm.payoutMethod === "bank" ? kycForm.bankName.trim() : null,
        bank_holder_name: kycForm.payoutMethod === "bank" ? kycForm.holderName.trim() : null,
        bank_account: kycForm.payoutMethod === "bank" ? kycForm.accountNumber.trim() : null,
        bank_ifsc: kycForm.payoutMethod === "bank" ? kycForm.ifscCode.trim().toUpperCase() : null,
        uploaded_files: [kycForm.panPhotoUrl, null, null, kycForm.upiQrUrl].filter(Boolean)
      };

      await api.post("verifications/creator", payload);
      toast.success("KYC submitted for review! Verification completes within 2 hours.");
      if (refreshUser) await refreshUser();
      if (typeof fetchKycStatus === 'function') await fetchKycStatus();
      setMobileScreen(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit KYC. Please verify your details.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Connected Socials Count
  const connectedSocials = useMemo(() => {
    const list = [];
    const links = profile?.socialLinks || {};
    const handles = profile?.handles || {};
    Object.keys(PLATFORM_CONFIG).forEach(key => {
      if ((links[key] && (links[key].url || links[key].handle)) || handles[key]) {
        list.push({
          ...PLATFORM_CONFIG[key],
          data: links[key] || { handle: handles[key], url: handles[key] }
        });
      }
    });
    return list;
  }, [profile]);

  const notConnectedSocials = useMemo(() => {
    const connectedKeys = new Set(connectedSocials.map(s => s.id));
    return Object.values(PLATFORM_CONFIG).filter(p => !connectedKeys.has(p.id));
  }, [connectedSocials]);

  const kycIsApproved = kycObj?.status === 'APPROVED' || kycObj?.status === 'approved';

  // Profile strength computation
  const profileStrength = useMemo(() => {
    let score = 0;
    if (profile?.photo || user?.picture || user?.photo) score += 15;
    if (profile?.name && (profile?.niche || profile?.bio)) score += 20;
    if (connectedSocials.length > 0) score += 20;
    if (rateCard?.reels || rateCard?.stories || rateCard?.youtube_integration) score += 20;
    if (kycIsApproved || kycObj?.status === 'UNDER_REVIEW' || kycObj?.status === 'pending') score += 15;
    if (profile?.portfolio && profile.portfolio.length > 0) score += 10;
    return Math.min(score, 100);
  }, [profile, user, connectedSocials, rateCard, kycIsApproved, kycObj]);

  const profileStrengthTip = useMemo(() => {
    if (!profile?.photo && !user?.picture) return "Upload a high-quality profile avatar";
    if (connectedSocials.length === 0) return "Connect Instagram or YouTube to verify reach";
    if (!rateCard?.reels && !rateCard?.stories) return "Add your pricing rate cards to receive deal offers";
    if (!kycIsApproved) return "Complete KYC identity verification for instant payouts";
    if (!profile?.portfolio || profile.portfolio.length === 0) return "Add your best past campaign work to portfolio";
    return "Great job! Your profile is ready for brand collaborations.";
  }, [profile, user, connectedSocials, rateCard, kycIsApproved]);

  // -------------------------------------------------------------
  // SCREEN 1: CREATOR INFO (FRAME 1)
  // -------------------------------------------------------------
  if (mobileScreen === "profile") {
    const selectedLanguages = editForm.languages || ["English"];
    const availableLanguages = ALL_LANGUAGES.filter(l => !selectedLanguages.includes(l));

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderBackHeader("Creator info")}

        {/* Form Body with 20px gutters */}
        <div className="flex-1 px-5 py-5 space-y-6">
          {/* Photos Header: Cover & Avatar */}
          <div className="space-y-3">
            <div className="relative pb-10">
              {/* Cover Photo Box */}
              <div className="relative w-full h-[130px] rounded-2xl bg-gradient-to-r from-purple-100 via-indigo-50 to-pink-50 border border-slate-200/80 overflow-hidden group">
                {editForm.coverImage ? (
                  <img src={editForm.coverImage} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    Cover Photo
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-xs text-slate-800 text-[11px] font-bold rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all z-10"
                >
                  <Camera size={13} />
                  <span>{editForm.coverImage ? "Change Cover" : "Add Cover"}</span>
                </button>
              </div>

              {/* Avatar pinned bottom left - outside overflow for full visibility */}
              <div className="absolute bottom-0 left-4 z-20">
                <div className="relative w-[76px] h-[76px] rounded-full border-4 border-white bg-slate-100 shadow-md overflow-hidden group">
                  <img
                    src={editForm.photo || profile?.photo || user?.picture || user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(editForm.name || "Creator")}&background=7C3AED&color=fff`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                    aria-label="Change avatar"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-[#7C3AED] text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm active:scale-95"
                  aria-label="Upload photo"
                >
                  <Camera size={11} />
                </button>
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUploadPhoto(e, 'cover')}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUploadPhoto(e, 'avatar')}
            />

            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Both show on your public profile. Square crop, object-fit:cover.
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Devansh Sharma"
              className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Profession (Reusable Select with Bottom Sheet) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Profession <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowProfessionSheet(true)}
              className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 flex items-center justify-between text-left text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] active:scale-[0.99] transition-all shadow-2xs"
            >
              <span>{editForm.profession || "Select Profession"}</span>
              <ChevronDown size={18} className="text-slate-400" />
            </button>
            <span className="text-[10px] text-slate-400 font-medium block">
              Opens bottom sheet listing options with a tick on current one.
            </span>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Bio / Creator Summary
            </label>
            <textarea
              rows={3}
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell brands what you create, your niche highlights, and recent achievements..."
              className="w-full bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all resize-none shadow-2xs leading-relaxed"
            />
          </div>

          {/* Primary Category (Interactive Search Field with UniversalTagSearch modal) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Primary Category <span className="text-rose-500">*</span>
              </label>
              {editForm.niche && (
                <button
                  type="button"
                  onClick={() => setShowNicheModal(true)}
                  className="text-[11px] font-extrabold text-[#7C3AED] hover:underline"
                >
                  Change Category
                </button>
              )}
            </div>
            <div
              onClick={() => setShowNicheModal(true)}
              className="w-full min-h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 py-2.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-2xs group hover:border-[#7C3AED]/40"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <Search size={18} className="text-slate-400 shrink-0 group-hover:text-[#7C3AED] transition-colors" />
                {editForm.niche ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#F3EBFF] border border-[#7C3AED]/30 text-[#7C3AED] truncate">
                    {editForm.niche}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-slate-400 truncate">
                    Search or pick primary niche...
                  </span>
                )}
              </div>
              <ChevronDown size={18} className="text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="e.g. Mumbai, Maharashtra, India"
                className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl pl-11 pr-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
              />
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Languages Spoken (Selected First, Followed by Options) */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Languages Spoken
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Selected Solid Purple Chips */}
              {selectedLanguages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#7C3AED] text-white shadow-xs"
                >
                  {lang}
                  {selectedLanguages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm({
                          ...editForm,
                          languages: selectedLanguages.filter(l => l !== lang)
                        });
                      }}
                      className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}

              {/* Available Unselected Options */}
              {availableLanguages.slice(0, 6).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setEditForm({
                      ...editForm,
                      languages: [...selectedLanguages, lang]
                    });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#F9F9FB] border border-[#EDEDF2] text-slate-600 hover:border-slate-300 active:scale-95 transition-all"
                >
                  <Plus size={12} /> {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Verification Section */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Contact & Notifications
            </span>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="flex-1 h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (saveProfileChanges) {
                      await saveProfileChanges({ phone: editForm.phone });
                    } else {
                      await api.patch("creators/me", { phone: editForm.phone });
                      setProfile(p => ({ ...p, phone: editForm.phone }));
                    }
                    toast.success("Phone updated!");
                  }}
                  className="px-5 h-[52px] bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition-all shrink-0 active:scale-95 flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Business Inquiries Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Business Inquiries Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={editForm.businessEmail}
                  onChange={(e) => setEditForm({ ...editForm, businessEmail: e.target.value })}
                  placeholder="e.g. dev@ybex.io"
                  className="flex-1 h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!editForm.businessEmail.trim()) {
                      toast.error("Please enter a valid email address");
                      return;
                    }
                    try {
                      if (saveProfileChanges) {
                        await saveProfileChanges({ businessEmail: editForm.businessEmail.trim() });
                      } else {
                        await api.patch("creators/me", { 
                          email: editForm.businessEmail.trim(), 
                          business_email: editForm.businessEmail.trim(),
                          businessEmail: editForm.businessEmail.trim() 
                        });
                        setProfile(p => ({ ...p, businessEmail: editForm.businessEmail.trim() }));
                      }
                      toast.success("Business email updated successfully!");
                    } catch (e) {
                      toast.error("Failed to update email");
                    }
                  }}
                  className="px-5 h-[52px] bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition-all shrink-0 active:scale-95 flex items-center justify-center"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Bottom Save Bar */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDEDF2] p-4 space-y-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            disabled={!isCreatorInfoDirty || savingCreatorInfo}
            onClick={handleSaveCreatorInfo}
            className={`w-full h-[52px] rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
              isCreatorInfoDirty && !savingCreatorInfo
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg active:scale-[0.99] cursor-pointer"
                : "bg-[#EDEDF2] text-[#A0A0AA] cursor-not-allowed"
            }`}
          >
            {savingCreatorInfo ? (
              <Loader2 size={18} className="animate-spin text-white" />
            ) : (
              <span>Save changes</span>
            )}
          </button>
          <p className="text-[10px] text-center text-slate-400 font-medium">
            Disabled until something changes · no bottom nav on this screen
          </p>
        </div>

        {/* Modal: Update NICHE with UniversalTagSearch (Desktop-parity category search) */}
        <AnimatePresence>
          {showNicheModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNicheModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="fixed inset-x-4 top-[15%] max-w-md mx-auto z-50 bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                    <h3 className="text-base font-extrabold text-slate-900 font-display">
                      Update NICHE
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNicheModal(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="py-4 overflow-visible flex-1">
                  <UniversalTagSearch
                    selectedTags={editForm.niche ? [editForm.niche] : []}
                    onChange={(newTags) => {
                      const chosen = newTags[newTags.length - 1] || "";
                      setEditForm({ ...editForm, niche: chosen });
                      if (chosen) {
                        toast.success(`Selected category: ${chosen}`);
                        setTimeout(() => setShowNicheModal(false), 250);
                      }
                    }}
                    type="category"
                    placeholder="Search or create primary niche..."
                  />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowNicheModal(false)}
                    className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Reusable Select Bottom Sheet: Profession */}
        <AnimatePresence>
          {showProfessionSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowProfessionSheet(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 max-h-[75vh] flex flex-col shadow-2xl border-t border-slate-100"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Select Profession
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProfessionSheet(false)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto py-2 divide-y divide-slate-50">
                  {ALL_PROFESSIONS.map((prof) => {
                    const isSelected = editForm.profession === prof;
                    return (
                      <button
                        key={prof}
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, profession: prof });
                          setShowProfessionSheet(false);
                        }}
                        className="w-full py-3.5 px-3 flex items-center justify-between hover:bg-purple-50 rounded-xl transition-colors text-left"
                      >
                        <span className={`text-sm ${isSelected ? "font-black text-[#7C3AED]" : "font-semibold text-slate-800"}`}>
                          {prof}
                        </span>
                        {isSelected && <Check size={18} className="text-[#7C3AED]" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: SOCIAL PLATFORMS LIST (FRAME 2)
  // -------------------------------------------------------------
  if (mobileScreen === "platforms") {
    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Social platforms")}

        <div className="p-5 space-y-6">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Add the platforms you post on. You enter the numbers yourself, so keep them accurate — brands compare them against delivered results.
          </p>

          {/* Section: Added Platforms */}
          {connectedSocials.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Added · {connectedSocials.length}
              </span>

              <div className="space-y-3">
                {connectedSocials.map((platform) => {
                  const Icon = platform.icon;
                  const data = platform.data || {};
                  const followersFormatted = data.followers ? Number(data.followers).toLocaleString('en-IN') : "—";
                  const reachFormatted = data.reach ? Number(data.reach).toLocaleString('en-IN') : "—";
                  const engRate = data.followers && (data.likes || data.comments)
                    ? (((Number(data.likes || 0) + Number(data.comments || 0)) / Number(data.followers)) * 100).toFixed(2) + "%"
                    : "0.00%";

                  return (
                    <div
                      key={platform.id}
                      className="bg-[#FBF8FF] border border-[#7C3AED] rounded-2xl p-4 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${platform.bg} ${platform.text}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{platform.name}</h4>
                            <span className="text-[11px] font-bold text-slate-500">
                              @{data.handle || data.url || "handle"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3-Column Stats Box (Instagram / Metrics) */}
                      {platform.hasMetrics && (
                        <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-2.5 border border-purple-100 text-center">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Followers</span>
                            <span className="text-xs font-black text-slate-900">{followersFormatted}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Avg Reach</span>
                            <span className="text-xs font-black text-slate-900">{reachFormatted}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Engagement</span>
                            <span className="text-xs font-black text-[#7C3AED]">{engRate}</span>
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 font-medium block">
                        Creator-entered values — no sync, no verified badge.
                      </span>

                      {/* Action buttons: Update / Remove */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenPlatformEdit(platform.id)}
                          className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-2xs transition-all"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePlatform(platform.id)}
                          className="px-3 py-1.5 bg-white border border-rose-200 text-[#E8552F] text-xs font-bold rounded-xl hover:bg-rose-50 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Not Added Yet */}
          {notConnectedSocials.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Not Added Yet
              </span>

              <div className="space-y-2.5">
                {notConnectedSocials.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.id}
                      className="h-[66px] bg-white border border-[#EDEDF2] rounded-2xl px-4 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${platform.bg} ${platform.text}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">{platform.name}</h4>
                          <span className="text-[10px] text-slate-400 font-medium block">{platform.pitch}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenPlatformEdit(platform.id)}
                        className="px-3.5 py-1.5 bg-white border-1.5 border-[#7C3AED] text-[#7C3AED] hover:bg-[#F3EBFF] text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No account access assurance */}
          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <Shield size={18} className="text-[#7C3AED] shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-slate-900">No account access</h5>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                Ybex never logs into your accounts — you enter and update these details yourself.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 3: INSTAGRAM DETAILS (FRAME 3)
  // -------------------------------------------------------------
  if (mobileScreen === "platform_instagram") {
    const followersNum = Number(platformForm.followers) || 0;
    const likesNum = Number(platformForm.likes) || 0;
    const commentsNum = Number(platformForm.comments) || 0;
    const liveEngRate = followersNum > 0
      ? (((likesNum + commentsNum) / followersNum) * 100).toFixed(2)
      : "0.00";

    const isInstagramValid = !!platformForm.url.trim() && followersNum > 0;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderBackHeader("Instagram")}

        <div className="flex-1 p-5 space-y-5">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            These numbers appear on your public profile and in brand search. Enter them from your Instagram insights.
          </p>

          {/* Handle or Profile URL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Handle or Profile URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={platformForm.url}
              onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
              placeholder="@username or instagram.com/username"
              className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* 2x2 Grid of Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Followers <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={platformForm.followers}
                onChange={(e) => setPlatformForm({ ...platformForm, followers: e.target.value })}
                placeholder="e.g. 145000"
                className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 font-medium">Total follower count</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Avg Reach · 30d <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={platformForm.reach}
                onChange={(e) => setPlatformForm({ ...platformForm, reach: e.target.value })}
                placeholder="e.g. 12000"
                className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 font-medium">Views per Reel</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Avg Likes <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={platformForm.likes}
                onChange={(e) => setPlatformForm({ ...platformForm, likes: e.target.value })}
                placeholder="e.g. 3500"
                className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 font-medium">Per post</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Avg Comments <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={platformForm.comments}
                onChange={(e) => setPlatformForm({ ...platformForm, comments: e.target.value })}
                placeholder="e.g. 120"
                className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 font-medium">Per post</span>
            </div>
          </div>

          {/* Live Calculated Engagement Card */}
          <div className="bg-[#F9F5FF] border border-[#EDE4FB] rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-[#7C3AED] uppercase tracking-wider">
                Calculated Engagement Rate
              </span>
              <span className="text-lg font-black text-[#7C3AED]">
                {liveEngRate}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between">
              <span>Likes + comments: {likesNum + commentsNum}</span>
              <span>Followers: {followersNum.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed pt-1 border-t border-purple-100">
              Read-only. Recalculates as the fields above change — never editable, never stored as user input.
            </p>
          </div>
        </div>

        {/* Pinned Save Bar */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDEDF2] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            disabled={!isInstagramValid || savingPlatform}
            onClick={() => handleSavePlatform("instagram")}
            className={`w-full h-[52px] rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
              isInstagramValid && !savingPlatform
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg cursor-pointer"
                : "bg-[#EDEDF2] text-[#A0A0AA] cursor-not-allowed"
            }`}
          >
            {savingPlatform ? <Loader2 size={18} className="animate-spin" /> : "Save Instagram details"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 4: OTHER PLATFORMS (FRAME 4 - YouTube, LinkedIn, Snapchat, Facebook)
  // -------------------------------------------------------------
  if (mobileScreen && mobileScreen.startsWith("platform_")) {
    const platformId = mobileScreen.replace("platform_", "");
    const config = PLATFORM_CONFIG[platformId] || { name: "Platform" };

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderBackHeader(config.name)}

        <div className="flex-1 p-5 space-y-6">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Add the link brands should open. No metrics needed for this platform.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Profile URL or Handle <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={platformForm.url}
              onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
              placeholder={`e.g. ${safeLower(config.name)}.com/yourhandle`}
              className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Single field, clean validation, driven by platform configuration. Only Instagram requires specific engagement metrics.
            </p>
          </div>
        </div>

        {/* Pinned Save Bar */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDEDF2] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            disabled={!platformForm.url.trim() || savingPlatform}
            onClick={() => handleSavePlatform(platformId)}
            className={`w-full h-[52px] rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
              platformForm.url.trim() && !savingPlatform
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg cursor-pointer"
                : "bg-[#EDEDF2] text-[#A0A0AA] cursor-not-allowed"
            }`}
          >
            {savingPlatform ? <Loader2 size={18} className="animate-spin" /> : `Save ${config.name} details`}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 5 & 6: KYC VERIFICATION (FRAMES 5 & 6)
  // -------------------------------------------------------------
  if (mobileScreen === "kyc") {
    const isApproved = kycObj?.status === 'APPROVED' || kycObj?.status === 'approved';
    const isPending = kycObj?.status === 'PENDING' || kycObj?.status === 'pending';

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderBackHeader("Creator verification")}

        <div className="flex-1 p-5 space-y-6">
          {/* Status Banner */}
          <div className={`rounded-2xl p-4 border space-y-2 shadow-2xs ${
            isApproved 
              ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
              : isPending 
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-[#FEF2EE] border-[#F7D9CE] text-slate-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className={isApproved ? "text-emerald-600" : isPending ? "text-amber-600" : "text-[#E8552F]"} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {isApproved ? "KYC Approved ✓" : isPending ? "KYC Under Review" : "KYC verification missing"}
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[9px] font-extrabold bg-white/80 px-2 py-0.5 rounded-full uppercase">
                  2-MIN FAST
                </span>
                <span className="text-[9px] font-extrabold bg-white/80 px-2 py-0.5 rounded-full uppercase">
                  256-BIT ENCRYPTED
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              {isApproved 
                ? "Your identity is verified. Payouts are released directly to your account upon deal completion."
                : isPending
                  ? "Your credentials are being reviewed by compliance. Usually completes within 2 hours."
                  : "Escrow requires verified identity before releasing payouts to your bank account."}
            </p>
          </div>
          {/* Read Only View if Pending or Approved */}
          {((isApproved || isPending) && !isEditingKyc) ? (
            <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDEDF2] pb-3">
                 <h3 className="text-sm font-bold text-slate-900">Submitted Details</h3>
                 {isPending && (
                   <button 
                     type="button" 
                     onClick={() => setIsEditingKyc(true)}
                     className="text-[11px] font-bold text-[#7C3AED] bg-white border border-[#EDEDF2] px-3 py-1.5 rounded-lg shadow-sm"
                   >
                     Edit
                   </button>
                 )}
              </div>
              <div className="space-y-3">
                 <div>
                   <span className="text-[10px] text-slate-500 uppercase font-black block">Applicant</span>
                   <span className="text-sm font-bold text-slate-900 block">{kycForm.legalName || "—"}</span>
                   <span className="text-xs font-mono text-slate-500">PAN: {kycForm.panNumber || "—"}</span>
                 </div>
                 <div>
                   <span className="text-[10px] text-slate-500 uppercase font-black block">Payout Method</span>
                   {kycForm.payoutMethod === 'upi' ? (
                     <span className="text-sm font-mono font-bold text-emerald-600 block">{kycForm.upiId || "—"}</span>
                   ) : (
                     <div>
                       <span className="text-sm font-bold text-slate-900 block">Bank Account</span>
                       <span className="text-xs font-mono text-slate-500">A/C: {kycForm.accountNumber ? "••••" + kycForm.accountNumber.slice(-4) : "—"}</span>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          ) : (
            <>

              {/* Section 1: Identity & Tax Information */}
          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white text-[10px] font-black flex items-center justify-center">1</span>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Identity & Tax Information
                </h4>
              </div>
              {kycForm.panPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setIsSection1Collapsed(!isSection1Collapsed)}
                  className="text-xs font-bold text-[#7C3AED]"
                >
                  {isSection1Collapsed ? "Expand" : "Collapse"}
                </button>
              )}
            </div>

            {!isSection1Collapsed ? (
              <div className="space-y-4 pt-1">
                {/* Legal Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kycForm.legalName}
                    onChange={(e) => setKycForm({ ...kycForm, legalName: e.target.value })}
                    placeholder="Must match your PAN card name"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                {/* PAN Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    PAN Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={kycForm.panNumber}
                    onChange={(e) => setKycForm({ ...kycForm, panNumber: safeUpper(e.target.value) })}
                    placeholder="ABCDE1234F"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-black text-slate-900 uppercase tracking-widest focus:outline-none focus:border-[#7C3AED]"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">10 characters, auto-uppercase</span>
                </div>

                {/* PAN Card Photo Upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    PAN Card Photo <span className="text-rose-500">*</span>
                  </label>

                  {kycForm.panPhotoUrl ? (
                    <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">PAN Document Uploaded</span>
                          <span className="text-[10px] text-emerald-700 font-medium">Ready for review</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setKycForm({ ...kycForm, panPhotoUrl: "" })}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => panInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-[#7C3AED] rounded-2xl p-4 text-center cursor-pointer bg-white transition-all space-y-1"
                    >
                      {uploadingPan ? (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
                          <span className="text-xs font-bold text-slate-600">Uploading document...</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={22} className="mx-auto text-slate-400" />
                          <span className="text-xs font-bold text-[#7C3AED] block">Take a photo or choose a file</span>
                          <span className="text-[10px] text-slate-400 font-medium block">Text must be clearly readable</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={panInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleUploadPanPhoto}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Section 1 complete · PAN uploaded
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Payout Method */}
          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white text-[10px] font-black flex items-center justify-center">2</span>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Payout Method
                </h4>
                <span className="text-[10px] text-slate-400 font-medium block">
                  Where campaign earnings and brand payments land.
                </span>
              </div>
            </div>

            {/* Segmented Switch: UPI ID vs Bank Transfer */}
            <div className="grid grid-cols-2 p-1 bg-slate-200/60 rounded-xl">
              <button
                type="button"
                onClick={() => setKycForm({ ...kycForm, payoutMethod: "upi" })}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                  kycForm.payoutMethod === "upi"
                    ? "bg-white text-[#7C3AED] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                UPI ID
              </button>
              <button
                type="button"
                onClick={() => setKycForm({ ...kycForm, payoutMethod: "bank" })}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                  kycForm.payoutMethod === "bank"
                    ? "bg-white text-[#7C3AED] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bank Transfer
              </button>
            </div>

            {/* UPI Form Fields */}
            {kycForm.payoutMethod === "upi" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    UPI VPA / ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kycForm.upiId}
                    onChange={(e) => setKycForm({ ...kycForm, upiId: safeLower(e.target.value).trim() })}
                    placeholder="yourname@okhdfcbank"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">Google Pay, PhonePe, Paytm, BHIM or any UPI ID</span>
                </div>

                {/* Optional QR Code Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    UPI QR Code (Optional)
                  </label>
                  {kycForm.upiQrUrl ? (
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3">
                      <span className="text-xs font-bold text-slate-800">QR Code uploaded</span>
                      <button
                        type="button"
                        onClick={() => setKycForm({ ...kycForm, upiQrUrl: "" })}
                        className="text-xs text-rose-500 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300"
                    >
                      {uploadingQr ? "Uploading..." : "+ Upload QR screenshot"}
                    </button>
                  )}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadQrCode}
                  />
                </div>
              </div>
            ) : (
              /* Bank Transfer Form Fields */
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kycForm.bankName}
                    onChange={(e) => setKycForm({ ...kycForm, bankName: e.target.value })}
                    placeholder="HDFC Bank, SBI, ICICI..."
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kycForm.holderName}
                    onChange={(e) => setKycForm({ ...kycForm, holderName: e.target.value })}
                    placeholder="Must match the PAN name above"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kycForm.accountNumber}
                    onChange={(e) => setKycForm({ ...kycForm, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={kycForm.ifscCode}
                    onChange={(e) => setKycForm({ ...kycForm, ifscCode: safeUpper(e.target.value) })}
                    placeholder="HDFC0001234"
                    className="w-full h-[48px] bg-white border border-[#EDEDF2] rounded-xl px-3.5 text-xs font-black text-slate-900 uppercase tracking-widest focus:outline-none focus:border-[#7C3AED]"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">Auto-uppercase for IFSC code</span>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Pinned Bottom Submit Bar */}
        { !((isApproved || isPending) && !isEditingKyc) && (
          <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDEDF2] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            disabled={!isKycFormValid || submittingKyc}
            onClick={handleSubmitKyc}
            className={`w-full h-[52px] rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
              isKycFormValid && !submittingKyc
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg cursor-pointer"
                : "bg-[#EDEDF2] text-[#A0A0AA] cursor-not-allowed"
            }`}
          >
            {submittingKyc ? <Loader2 size={18} className="animate-spin text-white" /> : "Submit KYC for verification"}
          </button>
        </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 7: HELP & SUPPORT (FRAME 7)
  // -------------------------------------------------------------
  if (mobileScreen === "help") {
    const helpFaqs = [
      {
        id: "payment",
        q: "When will I receive my payment?",
        a: "Brands deposit 100% of the campaign budget upfront into escrow. Once your deliverable is submitted and verified, funds are released automatically to your registered bank account or UPI ID within 48 to 72 hours."
      },
      {
        id: "escrow",
        q: "How does escrow work on Ybex?",
        a: "Escrow protects both sides. Brands deposit funds before you start working, ensuring payment is guaranteed. Funds remain locked securely and are released once proof-of-work is verified, with zero commission taken from creators."
      },
      {
        id: "kyc_reject",
        q: "Why was my KYC rejected?",
        a: "Common reasons include a name mismatch between your PAN and bank account, blurred or unreadable ID photos, or incorrect IFSC codes. Check your details in KYC settings and resubmit."
      },
      {
        id: "suspension",
        q: "How do I avoid account suspension?",
        a: "Ensure you deliver agreed collaboration briefs on time, keep communication on the platform, and avoid submitting artificial engagement or fake insights."
      }
    ];

    const helpCategories = [
      { id: "payments", name: "Payments & Earnings", icon: CreditCard, color: "text-purple-600 bg-purple-50" },
      { id: "campaigns", name: "Campaigns & Deals", icon: FileText, color: "text-blue-600 bg-blue-50" },
      { id: "kyc", name: "Profile & KYC", icon: HelpCircle, color: "text-green-600 bg-green-50" },
      { id: "trust_safety", name: "Trust & Safety", icon: Shield, color: "text-amber-600 bg-amber-50" }
    ];

    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Help & support")}

        <div className="p-5 space-y-6">
          {/* Search Pill */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search help articles..."
              value={helpSearchQuery}
              onChange={(e) => setHelpSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && helpSearchQuery) {
                  navigate(`/help/category/search?q=${encodeURIComponent(helpSearchQuery)}`);
                }
              }}
              className="w-full h-[50px] pl-11 pr-4 bg-[#F9F9FB] rounded-full border border-[#EDEDF2] text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#7C3AED] shadow-2xs"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>

          {/* Dark Live Chat Card */}
          <div className="bg-[#0B0B0F] text-white rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-[#A78BFA] flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <h4 className="text-sm font-black font-display">Chat with support</h4>
              </div>
              <p className="text-xs text-slate-400 font-medium">Reach our creator success team</p>
            </div>
            <button
              type="button"
              onClick={() => setIsHelpTicketOpen(true)}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
            >
              Chat
            </button>
          </div>

          {/* Browse by Category (2x2 Grid) */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Browse by Category
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {helpCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.id}
                    to={`/help/category/${cat.id}`}
                    className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-purple-200 transition-colors"
                  >
                    <div className={`p-2.5 rounded-xl w-fit ${cat.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-black text-slate-900 leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Most Asked (FAQ Accordion) */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Most Asked
            </h4>
            <div className="space-y-2">
              {helpFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs space-y-2 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h5 className="text-xs font-extrabold text-slate-900 pr-2">{faq.q}</h5>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#7C3AED]" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed pt-2 border-t border-slate-200/60">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isHelpTicketOpen && (
          <TicketForm onClose={() => setIsHelpTicketOpen(false)} />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1d: RATE CARDS
  // -------------------------------------------------------------
  if (mobileScreen === "rates") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderBackHeader("Rate cards")}

        <div className="flex-1 p-5 space-y-6">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Set default collaboration pricing. Brands can book these deliverables directly or make custom offers.
          </p>

          <div className="space-y-4">
            {[
              { id: "reels", label: "Instagram Reel", hint: "Standard 30-60s vertical video" },
              { id: "dedicated_video", label: "YouTube Dedicated Video", hint: "Complete video integration" },
              { id: "story", label: "Instagram Story (with link)", hint: "24-hour story with swipe-up / sticker" },
              { id: "ugc_video", label: "UGC Raw Video", hint: "Brand-usable ad creative" }
            ].map((deliv) => (
              <div key={deliv.id} className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  {deliv.label}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={rateCard?.[deliv.id] || ""}
                    onChange={(e) => setRateCard({ ...rateCard, [deliv.id]: Number(e.target.value) || 0 })}
                    placeholder="Enter rate"
                    className="w-full h-[52px] bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl pl-8 pr-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{deliv.hint}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pinned Save Bar */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EDEDF2] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={async () => {
              if (saveProfileChanges) await saveProfileChanges({ rateCard });
              toast.success("Rate card saved successfully!");
              setMobileScreen(null);
            }}
            className="w-full h-[52px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-extrabold rounded-2xl shadow-lg cursor-pointer"
          >
            Save rate cards
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1e: PORTFOLIO
  // -------------------------------------------------------------
  if (mobileScreen === "portfolio") {
    const portfolioList = profile?.portfolio || [];

    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Portfolio")}

        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600 font-medium">
              Highlight your best collaboration deliverables.
            </p>
            <button
              type="button"
              onClick={handleOpenAddPortfolioModal}
              className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1 shrink-0"
            >
              <Plus size={14} /> Add Work
            </button>
          </div>

          {portfolioList.length > 0 ? (
            <div className="space-y-3">
              {portfolioList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
                      <Play size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900">{item.title || "Collaboration Deliverable"}</h4>
                      <span className="text-[10px] text-slate-400 font-medium block">{item.brand_name || "Brand Project"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPortfolioModal(idx)}
                      className="p-2 text-slate-500 hover:text-[#7C3AED]"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolioItem(idx)}
                      className="p-2 text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#F9F9FB] border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <FolderKanban size={28} className="mx-auto text-slate-400" />
              <h5 className="text-xs font-bold text-slate-700">No portfolio items yet</h5>
              <p className="text-[11px] text-slate-400">Add past videos, reels, and brand campaigns.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1h: DEVICE SESSIONS
  // -------------------------------------------------------------
  if (mobileScreen === "sessions") {
    const currentSession = sessionsList.find(s => s.isCurrent) || {
      device: "Mobile Browser",
      location: "India",
      isCurrent: true
    };
    const otherSessions = sessionsList.filter(s => !s.isCurrent);

    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Device sessions")}

        <div className="p-5 space-y-6">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Everywhere your Ybex account is currently signed in.
          </p>

          {/* Current Device */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <Smartphone size={18} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  {currentSession.device || currentSession.device_name || "This device"}
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Active now
                  </span>
                </h4>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                  {currentSession.location || "Current session location"}
                </span>
              </div>
            </div>
          </div>

          {/* Other Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                OTHER DEVICES · {otherSessions.length}
              </h4>
              {otherSessions.length > 0 && (
                <button
                  onClick={handleLogoutAllOtherSessions}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600"
                >
                  Log out all
                </button>
              )}
            </div>

            {otherSessions.length > 0 ? (
              <div className="space-y-2">
                {otherSessions.map((sess) => (
                  <div
                    key={sess.session_token}
                    className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-3.5 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <MonitorSmartphone size={18} className="text-slate-400" />
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-800">
                          {sess.device || sess.device_name || "Web Browser"}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {sess.location || "Location unknown"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLogoutSession(sess.session_token)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      End
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-400 font-medium">No other active device logins.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1i: PRIVACY & TERMS
  // -------------------------------------------------------------
  if (mobileScreen === "legal") {
    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Privacy & terms")}

        <div className="p-5 space-y-4">
          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs space-y-3">
            <button
              onClick={() => setExpandedLegal({ ...expandedLegal, privacy: !expandedLegal.privacy })}
              className="w-full flex items-center justify-between text-left"
            >
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Shield size={16} className="text-[#7C3AED]" /> Privacy Policy
              </h4>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedLegal.privacy ? 'rotate-180' : ''}`} />
            </button>
            {expandedLegal.privacy && (
              <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                At Ybex Media (Datrux Systems Pvt. Limited), we protect your personal data. We never sell your personal information or credentials to third parties.
              </p>
            )}
          </div>

          <div className="bg-[#F9F9FB] border border-[#EDEDF2] rounded-2xl p-4 shadow-2xs space-y-3">
            <button
              onClick={() => setExpandedLegal({ ...expandedLegal, escrow: !expandedLegal.escrow })}
              className="w-full flex items-center justify-between text-left"
            >
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase size={16} className="text-[#7C3AED]" /> Escrow & Payment Terms
              </h4>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedLegal.escrow ? 'rotate-180' : ''}`} />
            </button>
            {expandedLegal.escrow && (
              <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                100% upfront deposit into neutral escrow. Funds are released within 48–72 hours of work verification with zero agency commissions.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1j: REFER & EARN
  // -------------------------------------------------------------
  if (mobileScreen === "refer") {
    const rewardFormatted = `₹${(referralStats.reward_amount || 500).toLocaleString('en-IN')}`;
    const userNameClean = (user?.name || "User").replace(/\s+/g, "").toUpperCase().slice(0, 6);
    const userUniquePart = (user?.user_id || user?.id || "YBEX").slice(0, 4).toUpperCase();
    const referralCode = `${userNameClean}${userUniquePart}`;
    const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

    return (
      <div className="min-h-screen bg-white flex flex-col pb-28">
        {renderBackHeader("Refer & earn")}

        <div className="p-5 space-y-6">
          <div className="bg-gradient-to-br from-indigo-950 via-[#7C3AED] to-purple-900 text-white rounded-3xl p-6 shadow-xl space-y-3">
            <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Exclusive Reward
            </span>
            <h3 className="text-2xl font-black font-display tracking-tight">
              Refer & get {rewardFormatted} cash
            </h3>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed">
              Paid straight to your bank once your referred creator or brand completes their first deal.
            </p>
          </div>

          <div className="bg-[#F9F9FB] rounded-2xl border border-[#EDEDF2] p-4 shadow-2xs space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Your Referral Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 truncate select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setCopiedLink(true);
                  toast.success("Referral link copied! 📋");
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3.5 py-2 bg-[#7C3AED] text-white text-xs font-bold rounded-xl flex items-center gap-1"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 1a: MAIN MOBILE PROFILE HUB (ROOT)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-display tracking-tight">My Profile</h1>
          <p className="text-[11px] font-bold text-slate-400">Settings & Creator Hub</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareProfile}
            className="w-9 h-9 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
            aria-label="Share Profile"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileScreen("profile")}
            className="w-9 h-9 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors active:scale-95"
            aria-label="Edit Profile"
          >
            <Edit2 size={16} />
          </button>
        </div>
      </header>

      <div className="px-5 py-4 space-y-6">
        {/* Open Identity Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-18 h-18 rounded-full border-2 border-purple-200 bg-slate-100 overflow-hidden shrink-0 shadow-xs">
              <img
                src={profile?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || user?.name || "Creator")}&background=7C3AED&color=fff`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black text-slate-900 truncate font-display">
                  {profile?.name || user?.name || "Creator"}
                </h2>
                {profile?.tier && (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase ${
                      profile.tier === "PLATINUM"
                        ? "bg-slate-800 text-slate-100"
                        : profile.tier === "GOLD"
                        ? "bg-amber-100 text-amber-700"
                        : profile.tier === "SILVER"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {profile.tier}
                  </span>
                )}
                {kycIsApproved && (
                  <CheckCircle size={16} className="text-[#7C3AED] shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 font-bold truncate mt-0.5">
                {profile?.profession || "Content Creator"} · {profile?.niche || "All Niches"}
              </p>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                <MapPin size={12} className="shrink-0 text-slate-400" />
                {profile?.location || "India"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMobileScreen("profile")}
              className="py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Edit2 size={13} /> Edit Profile
            </button>
            <Link
              to={`/creator/${user?.user_id || user?.id || ''}`}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              Public Profile <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* KYC Action Banner (Only when KYC is not approved) */}
        {!kycIsApproved && (
          <div className="bg-amber-50/60 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#E8552F] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Finish KYC to get paid
                </h4>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                  Escrow holds campaign earnings securely but requires verified identity to release bank transfers.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileScreen("kyc")}
              className="w-full py-2.5 bg-[#E8552F] hover:bg-[#D44723] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
            >
              <Shield size={13} /> Start Verification
            </button>
          </div>
        )}

        {/* Profile Strength */}
        <div className="bg-slate-50/70 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#7C3AED]" />
              <span className="text-xs font-black text-slate-900">Profile strength</span>
            </div>
            <span className="text-xs font-black text-[#7C3AED] bg-purple-50 px-2 py-0.5 rounded-full">{profileStrength}%</span>
          </div>
          <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#7C3AED] to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${profileStrength}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {profileStrength >= 100
              ? "Your profile is fully completed and ready for top brand deals!"
              : profileStrengthTip}
          </p>
        </div>

        {/* GROUP 1: PROFILE */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Profile Details
          </span>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => setMobileScreen("profile")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Creator info</span>
                  <span className="text-[11px] text-slate-400 font-medium">Bio, categories, location & email</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("platforms")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Share2 size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Social platforms</span>
                  <span className="text-[11px] text-slate-400 font-medium">Instagram, YouTube & others</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">{connectedSocials.length} connected</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("rates")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Briefcase size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Rate cards</span>
                  <span className="text-[11px] text-slate-400 font-medium">Commercial pricing & packages</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  {rateCard?.reels ? `₹${Number(rateCard.reels).toLocaleString('en-IN')}` : 'Not set'}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("portfolio")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FolderKanban size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Portfolio</span>
                  <span className="text-[11px] text-slate-400 font-medium">Showcase top campaign work</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">{(profile?.portfolio || []).length} items</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>
          </div>
        </div>

        {/* GROUP 2: MONEY & VERIFICATION */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Money & Verification
          </span>
          <div className="divide-y divide-slate-100">
            <Link
              to="/earnings"
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Earnings & payouts</span>
                  <span className="text-[11px] text-slate-400 font-medium">Escrow deposits & transaction history</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileScreen("kyc")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">KYC compliance</span>
                  <span className="text-[11px] text-slate-400 font-medium">PAN card & bank identity verification</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  kycIsApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {kycIsApproved ? 'Approved' : 'Action Required'}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("refer")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <HeartHandshake size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Refer & earn</span>
                  <span className="text-[11px] text-slate-400 font-medium">Earn cash rewards on invited creators</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* GROUP 3: ACCOUNT & SUPPORT */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            Account & Support
          </span>
          <div className="divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => setMobileScreen("sessions")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <MonitorSmartphone size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Device sessions</span>
                  <span className="text-[11px] text-slate-400 font-medium">Manage logged-in devices</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">{sessionsList?.length || 1} active</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("legal")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Privacy & terms</span>
                  <span className="text-[11px] text-slate-400 font-medium">Escrow terms and data policies</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setMobileScreen("help")}
              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Help center</span>
                  <span className="text-[11px] text-slate-400 font-medium">FAQs and 24/7 dedicated support</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Log Out Button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={logout}
            className="w-full py-3.5 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-600 font-black text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99]"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 pb-6">
          <p className="text-[11px] font-bold text-slate-400">Ybex · Datrux Systems Pvt. Ltd.</p>
        </div>
      </div>
    </div>
  );
}
