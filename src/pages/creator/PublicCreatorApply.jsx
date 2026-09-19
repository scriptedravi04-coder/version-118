import React, { useState, useRef, useEffect } from "react";
import { formatAmount } from "../../utils/safeFormat";
import { Link, useNavigate } from "react-router-dom";
import { 
  Instagram, User, Mail, Phone, MapPin, 
  CheckCircle2, Plus, Trash2, ArrowRight, ShieldCheck, Upload, Image as ImageIcon,
  Star, Award, Link2, AlertCircle, Check, IndianRupee, ArrowUpRight, Sparkles, Loader2, RefreshCw,
  ArrowLeft, ChevronDown, ChevronRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { validateCreatorForm, checkChargesWarning, formatNumberDisplay, formatRupeesInput } from "../../utils/creatorFormValidation";
import { COUNTRY_CODES, SUPPORT_WHATSAPP_NUMBER } from "../../lib/constants";
import { searchLocations } from "../../lib/locations";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import YbexLogo from "../../components/layout/YbexLogo";

const USER_CREATOR_AVATARS = [
  "https://i.ibb.co/bjZ6s6hZ/Screenshot-2026-09-04-at-6-38-59-PM.png",
  "https://i.ibb.co/ywj9gcs/Screenshot-2026-09-04-at-6-38-18-PM.png",
  "https://i.ibb.co/Lhd1cWwx/Screenshot-2026-09-04-at-6-37-58-PM.png",
  "https://i.ibb.co/XZ3T9SHF/Screenshot-2026-09-04-at-6-37-50-PM.png",
  "https://i.ibb.co/0yrqwFQ1/Screenshot-2026-09-04-at-6-37-03-PM.png"
];

const DEFAULT_HIRING_BRANDS = [
  { name: "ONO Creators", logo_url: "" },
  { name: "Eat Better Co", logo_url: "" },
  { name: "Foxtale", logo_url: "" },
  { name: "The Man Company", logo_url: "" },
  { name: "Vastrado", logo_url: "" },
  { name: "Fevicol", logo_url: "" },
  { name: "Beardo", logo_url: "" },
  { name: "Prorewards", logo_url: "" }
];

const NICHES = [
  "Entertainment",
  "Cinematic",
  "Comedy",
  "Lifestyle",
  "Regional Content",
  "Fashion",
  "Beauty",
  "Food",
  "Travel",
  "Fitness / Health",
  "Technology / Gadgets",
  "Gaming",
  "Finance / Business",
  "Education / DIY",
  "Drama / Web Series",
  "Other"
];

const COLLAB_TYPES = [
  "Collaboration Reel",
  "Barter Basis",
  "In-feed Post / Carousel",
  "Paid Collab",
  "Content Acquisition",
  "Brand Ambassador (Long-term)",
  "Open to All"
];

export default function PublicCreatorApply() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDropdownRef = useRef(null);
  const [gender, setGender] = useState("");
  const [socialHandle, setSocialHandle] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [followersInput, setFollowersInput] = useState("");
  const [avgReach, setAvgReach] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile] = useState("");

  const [email, setEmail] = useState("");
  const [charges, setCharges] = useState("");
  const [niche, setNiche] = useState("");
  const [collabTypes, setCollabTypes] = useState([]);
  const [ugcRating, setUgcRating] = useState(7);
  const [sampleLinks, setSampleLinks] = useState([]);
  const [currentSampleInput, setCurrentSampleInput] = useState("");
  const [notes, setNotes] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const photoInputRef = useRef(null);

  // Mobile-specific State (defaults to dedicated "entry" screen per Section 3a spec)
  const [mobileStep, setMobileStep] = useState("entry");
  const [showGenderSheet, setShowGenderSheet] = useState(false);
  const [showMobileCityDropdown, setShowMobileCityDropdown] = useState(false);
  const mobileCityDropdownRef = useRef(null);
  const mobilePhotoInputRef = useRef(null);

  // Social proof: genuine creator avatars & auto-rotating landing brands
  const [creatorAvatars] = useState(USER_CREATOR_AVATARS);
  const [landingBrands, setLandingBrands] = useState([]);

  useEffect(() => {
    api.get("/landing-brands")
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setLandingBrands(res.data);
        }
      })
      .catch((err) => console.error("Error loading landing brands:", err));
  }, []);

  const displayBrands = landingBrands.length > 0 ? landingBrands : DEFAULT_HIRING_BRANDS;
  const marqueeBrands = [...displayBrands, ...displayBrands, ...displayBrands];

  // Live fairness check for charges based on avg reach
  const chargesFairness = checkChargesWarning(avgReach, charges);

  // Close city dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
      if (mobileCityDropdownRef.current && !mobileCityDropdownRef.current.contains(event.target)) {
        setShowMobileCityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locationMatches = city ? searchLocations(city, 12) : [];
  const mobileLocationMatches = city ? searchLocations(city, 8) : [];

  // Advance mobile from Step 1 to Step 2 with validation
  const handleMobileNextStep = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const fields = {
      name: fullName,
      social_handle: socialHandle,
      instagram_link: instagramLink,
      followers: followersInput,
      avg_reach: avgReach,
      mobile,
      email,
      charges,
      niche: niche ? [niche] : [],
      collab_types: collabTypes
    };

    const { isValid, errors } = validateCreatorForm(fields);
    if (!gender) {
      errors.gender = "Gender is required";
    }

    setFieldErrors(errors);

    if (!isValid || !gender) {
      toast.error("Please fill in all required fields marked with *");
      setTimeout(() => {
        const errorElement = document.querySelector('.mobile-form-error, .form-error-inline');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setMobileStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper formatting for followers / reach
  const parseFollowerCount = (str) => {
    if (!str) return 0;
    const clean = String(str).trim().toUpperCase();
    if (clean.endsWith('K')) return Math.round(parseFloat(clean) * 1000);
    if (clean.endsWith('M')) return Math.round(parseFloat(clean) * 1000000);
    const parsed = parseInt(clean.replace(/[^0-9]/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleMobileChange = (e) => {
    const maxLen = countryCode === "+91" ? 10 : 15;
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, maxLen);
    setMobile(val); setFieldErrors(p => ({...p, mobile: null}));
  };

  const handleHandleChange = (e) => {
    let val = e.target.value.trim();
    if (val && !val.startsWith("@")) {
      val = "@" + val;
    }
    setSocialHandle(val);
    setFieldErrors(p => ({...p, social_handle: null}));

    // Conveniently auto-suggest Instagram profile URL if user hasn't typed a custom one
    const cleanHandle = val.replace(/^@+/, "");
    if (cleanHandle && (!instagramLink || instagramLink.includes("instagram.com/"))) {
      setInstagramLink(`https://instagram.com/${cleanHandle}`);
      setFieldErrors(p => ({...p, instagram_link: null}));
    }
  };

  const toggleCollabType = (type) => {
    if (type === "Open to All") {
      if (collabTypes.includes("Open to All")) {
        setCollabTypes([]); setFieldErrors(p => ({...p, collab_types: null}));
      } else {
        setCollabTypes([...COLLAB_TYPES]); setFieldErrors(p => ({...p, collab_types: null}));
      }
      return;
    }

    if (collabTypes.includes(type)) {
      setCollabTypes(collabTypes.filter(t => t !== type && t !== "Open to All")); setFieldErrors(p => ({...p, collab_types: null}));
    } else {
      const updated = [...collabTypes, type];
      if (updated.length === COLLAB_TYPES.length - 1) {
        setCollabTypes([...COLLAB_TYPES]); setFieldErrors(p => ({...p, collab_types: null}));
      } else {
        setCollabTypes(updated); setFieldErrors(p => ({...p, collab_types: null}));
      }
    }
  };

  const addSampleLink = () => {
    const link = currentSampleInput.trim();
    if (!link) return;
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      toast.error("Please enter a valid link starting with http:// or https://");
      return;
    }
    if (sampleLinks.includes(link)) {
      toast.error("Link already added");
      return;
    }
    setSampleLinks([...sampleLinks, link]);
    setCurrentSampleInput("");
  };

  const removeSampleLink = (index) => {
    setSampleLinks(sampleLinks.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setPhotoUploading(true);
    try {
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `public_apply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (!error && data) {
          const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (publicData?.publicUrl) {
            setProfilePhotoUrl(publicData.publicUrl);
            toast.success("Profile photo uploaded!");
            setPhotoUploading(false);
            return;
          }
        }
      }

      // Fallback preview URL if Supabase storage isn't ready
      const localUrl = URL.createObjectURL(file);
      setProfilePhotoUrl(localUrl);
      toast.success("Photo attached successfully");
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const fields = {
      name: fullName,
      social_handle: socialHandle,
      instagram_link: instagramLink,
      followers: followersInput,
      avg_reach: avgReach,
      mobile,
      email,
      charges,
      niche: niche ? [niche] : [],
      collab_types: collabTypes
    };

    const { isValid, errors } = validateCreatorForm(fields);
    setFieldErrors(errors);

    if (!isValid) {
      // scroll to first error
      setTimeout(() => {
        const errorElement = document.querySelector('.form-error-inline');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setLoading(true);

    const parsedFollowers = parseFollowerCount(followersInput);

    const payload = {
      name: fullName.trim(),
      city: city.trim(),
      gender,
      social_handle: socialHandle.trim(),
      instagram_link: instagramLink.trim(),
      followers: parsedFollowers,
      avg_reach: avgReach.trim(),
      mobile: `${countryCode}${mobile.trim()}`,
      email: email.trim().toLowerCase(),
      charges: charges.trim(),
      niche,
      collab_types: collabTypes,
      ugc_rating: Number(ugcRating) || 7,
      sample_links: sampleLinks,
      notes: notes.trim(),
      profile_photo_url: profilePhotoUrl,
      role: "creator",
      status: "Pending",
      source: "creator_apply_form",
      is_registered_user: false
    };

    try {
      // Primary submit via Backend API
      await api.post("/public/creator-apply", payload);
      setSubmittedData(payload);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err) {
      console.warn("Backend API endpoint failed, trying direct Supabase insert fallback:", err);
      
      // Fallback direct Supabase insert if backend endpoint isn't reached
      try {
        if (supabase) {
          const { error: dbErr } = await supabase.from("waitlist").insert([{
            name: payload.name,
            email: payload.email,
            mobile: payload.mobile,
            city: payload.city,
            gender: payload.gender,
            social_handle: payload.social_handle,
            instagram_link: payload.instagram_link,
            followers: payload.followers,
            avg_reach: payload.avg_reach,
            charges: payload.charges,
            niche: payload.niche,
            collab_types: payload.collab_types,
            ugc_rating: payload.ugc_rating,
            sample_links: payload.sample_links,
            notes: payload.notes,
            profile_photo_url: payload.profile_photo_url,
            role: "creator",
            status: "Pending",
            source: "creator_apply_form",
            is_registered_user: false
          }]);

          if (!dbErr) {
            setSubmittedData(payload);
            setSubmitted(true);
            toast.success("Application submitted successfully!");
            setLoading(false);
            return;
          }
        }
      } catch (fallbackErr) {
        console.error("Supabase fallback failed:", fallbackErr);
      }

      // If both fail, gracefully notify user
      toast.error(err?.response?.data?.error || err?.message || "Failed to submit application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const data = submittedData || {};
    const waName = data.name || fullName || "";
    const waHandleRaw = data.social_handle || socialHandle || "";
    const waHandle = waHandleRaw ? waHandleRaw.replace(/^@+/, "") : "";
    const waProfileLink = data.instagram_link || instagramLink || (waHandle ? `https://instagram.com/${waHandle}` : "");
    const waFollowers = data.followers 
      ? (typeof data.followers === "number" ? formatAmount(data.followers) : data.followers) 
      : (followersInput || "");
    const waNiche = data.niche || niche || "";
    const waCollab = Array.isArray(data.collab_types) && data.collab_types.length > 0 
      ? data.collab_types.join(", ") 
      : (Array.isArray(collabTypes) && collabTypes.length > 0 ? collabTypes.join(", ") : "");
    const waCharges = data.charges || charges || "";

    // Build details lines dynamically (skip missing/empty fields)
    const detailsLines = [];
    if (waHandle) detailsLines.push(`• Instagram: @${waHandle}`);
    if (waProfileLink) detailsLines.push(`• Profile Link: ${waProfileLink}`);
    if (waFollowers) detailsLines.push(`• Followers: ${waFollowers}`);
    if (waNiche) detailsLines.push(`• Content Niche: ${waNiche}`);
    if (waCollab) detailsLines.push(`• Collab Type: ${waCollab}`);
    if (waCharges) detailsLines.push(`• Charges: ${waCharges}`);

    const detailsBlock = detailsLines.length > 0 
      ? `📋 *My Details:*\n${detailsLines.join("\n")}\n\n` 
      : "";

    const waMsgText = 
      `Hi! I'm ${waName} and I just applied for YBEX Creator Partnership 🙌\n\n` +
      detailsBlock +
      `Looking forward to collaborating! 🚀`;

    const waMsg = encodeURIComponent(waMsgText);
    const waLink = `https://wa.me/919950832099?text=${waMsg}`;

    return (
      <div className="min-h-[calc(100vh-80px)] bg-[var(--bg-base)] flex items-center justify-center p-3 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-center shadow-lg relative overflow-hidden"
        >
          {/* Checkmark icon */}
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 size={26} />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display tracking-tight mb-1">
            Application Received!
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-3.5 font-medium">
            Thank you, <span className="font-bold text-slate-900">{fullName}</span>! Your profile has been sent to our curation team.
          </p>

          {/* Submitted Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-left mb-3.5 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Submitted Handle</span>
              <span className="font-mono font-bold text-[var(--violet)] text-xs">{socialHandle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Email</span>
              <span className="font-semibold text-slate-800 text-xs truncate max-w-[190px]">{email}</span>
            </div>
            {niche && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Category / Niche</span>
                <span className="font-semibold text-slate-800 text-xs">{niche}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mb-4 leading-normal">
            Once approved, your profile goes live on <strong className="text-slate-700">Explore Creators</strong> for top brands to discover & hire you!
          </p>

          {/* Primary Action Buttons */}
          <div className="space-y-2.5">
            {/* WhatsApp Direct Contact Button */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Message us on WhatsApp</span>
            </a>

            <Link
              to="/creators"
              className="w-full py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Explore Public Creators</span>
              <ArrowUpRight size={14} />
            </Link>

            <Link
              to="/"
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 font-medium">
            Want a faster response? Reach out directly via WhatsApp anytime.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP VIEW (CLEAN DISTRACTION-FREE FORM FLOW FOR SCREENS >= md)         */}
      {/* ========================================================================= */}
      <div className="hidden md:block min-h-screen bg-[var(--bg-base)]">
        {/* Desktop Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
              title="Back to Home"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <Link to="/" title="Ybex Home" className="flex items-center active:scale-95 transition-transform">
              <YbexLogo className="h-7 text-slate-900 w-auto max-w-[100px]" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/creators"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <span>Explore Creators</span>
              <ArrowUpRight size={14} />
            </Link>
            <Link
              to="/login"
              className="text-xs font-bold text-slate-800 hover:text-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="max-w-3xl mx-auto py-6 sm:py-8 md:py-10 px-3 sm:px-6 space-y-4 sm:space-y-6">
        
        {/* Header Hero Card */}
        <div className="bg-white border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-8 shadow-xs text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--violet-soft)] border border-[var(--violet-border)] text-[var(--violet)] font-bold text-[11px] sm:text-xs mb-2.5 sm:mb-3">
            <Sparkles size={13} className="animate-pulse" />
            <span>Open Public Creator Application</span>
          </div>
          
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 font-display tracking-tight leading-snug">
            Get Featured on{" "}
            <Link 
              to="/creators"
              title="View Public Explore Creators Directory"
              className="relative inline-flex items-center gap-1.5 text-[var(--violet)] underline underline-offset-4 decoration-[var(--violet)]/40 hover:decoration-[var(--violet)] hover:text-[var(--violet-hover)] transition-all group font-black"
            >
              <span className="relative inline-block overflow-hidden rounded-md px-1 py-0.5">
                <span className="font-black text-[var(--violet)]">Explore Creators</span>
                {/* Subtle, soft light gleam without over-exposure or blinding washout */}
                <motion.span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.25) 42%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.25) 58%, transparent 80%)',
                  }}
                  animate={{
                    x: ['-130%', '130%'],
                  }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                />
              </span>
              <motion.span
                animate={{
                  x: [0, 2.5, 0],
                  y: [0, -2.5, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "easeInOut",
                }}
                className="inline-flex shrink-0"
              >
                <ArrowUpRight 
                  size={22} 
                  strokeWidth={2.6}
                  className="text-[var(--violet)] sm:w-7 sm:h-7 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 inline-block" 
                />
              </motion.span>
            </Link>
          </h1>
          
          {/* Subtitle hidden on mobile, visible on desktop per request */}
          <p className="hidden md:block text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium leading-relaxed mt-2.5">
            Fill out your creator details below to join Ybex's talent roster. No login required. Approved creators get directly listed for top D2C brand collaborations.
          </p>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          
          {/* SECTION A: Creator Profile */}
          <div className="bg-white border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
            <div className="border-b border-slate-100 pb-3 sm:pb-4 flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                1
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Your Creator Profile
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Basic information &amp; social metrics</p>
              </div>
            </div>

            {/* Clickable Profile Photo Upload Box */}
            <div 
              onClick={() => {
                if (!photoUploading) {
                  photoInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  photoInputRef.current?.click();
                }
              }}
              className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 hover:border-[var(--violet)]/50 rounded-xl sm:rounded-2xl transition-all cursor-pointer group shadow-2xs hover:shadow-xs select-none"
            >
              {/* Hidden file input */}
              <input 
                ref={photoInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                disabled={photoUploading}
                className="hidden" 
              />

              <div className="flex items-center gap-3 min-w-0">
                {/* Animated Avatar Box */}
                <div className="relative shrink-0">
                  <AnimatePresence mode="wait">
                    {profilePhotoUrl ? (
                      <motion.div
                        key="uploaded-photo"
                        initial={{ scale: 0.7, opacity: 0, rotate: -6 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative"
                      >
                        <img 
                          src={profilePhotoUrl} 
                          alt="Profile Preview" 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-[var(--violet)] shadow-sm ring-2 ring-[var(--violet)]/20"
                        />
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 500, damping: 20 }}
                          className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white"
                        >
                          <Check size={11} strokeWidth={3.5} />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="placeholder-photo"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-200/80 group-hover:bg-[var(--violet-soft)] flex items-center justify-center text-slate-400 group-hover:text-[var(--violet)] border border-slate-300/80 group-hover:border-[var(--violet-border)] transition-colors"
                      >
                        <User size={22} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Compact Label */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[var(--violet)] transition-colors truncate">
                      Profile Picture
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate hidden xs:block sm:block">
                    {profilePhotoUrl ? "Tap anywhere to change photo" : "Tap anywhere on box to upload photo"}
                  </p>
                </div>
              </div>

              {/* Upload/Change & Delete Actions */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfilePhotoUrl("");
                    }}
                    title="Remove photo"
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!photoUploading) photoInputRef.current?.click();
                  }}
                  disabled={photoUploading}
                  className={`px-3 sm:px-3.5 py-2 bg-white hover:bg-slate-100 group-hover:border-[var(--violet)]/40 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 active:scale-95 ${photoUploading ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  {photoUploading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-[var(--violet)]" />
                      <span className="text-[11px] sm:text-xs">Uploading...</span>
                    </>
                  ) : profilePhotoUrl ? (
                    <>
                      <RefreshCw size={12} className="text-slate-500" />
                      <span className="text-[11px] sm:text-xs">Change</span>
                    </>
                  ) : (
                    <>
                      <Upload size={13} className="text-[var(--violet)]" />
                      <span className="text-[11px] sm:text-xs">Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setFieldErrors(p => ({...p, name: null})); }}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                </div>
                {fieldErrors.name && <p className="form-error-inline text-rose-500 text-[10px] font-semibold">{fieldErrors.name}</p>}
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Instagram Handle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Instagram Handle <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Must be public</span>
                </label>
                <div className="relative">
                  <Instagram size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                  <input 
                    type="text"
                    required
                    value={socialHandle}
                    onChange={handleHandleChange}
                    placeholder="@yourusername"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                </div>
                {fieldErrors.social_handle && <p className="form-error-inline text-red-500 text-[10px] font-semibold">{fieldErrors.social_handle}</p>}
              </div>

              {/* Instagram Profile Link */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Instagram Profile URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="url"
                    required
                    value={instagramLink}
                    onChange={(e) => { setInstagramLink(e.target.value); setFieldErrors(p => ({...p, instagram_link: null})); }}
                    placeholder="https://instagram.com/yourusername"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                </div>
                {fieldErrors.instagram_link && <p className="form-error-inline text-rose-500 text-[10px] font-semibold">{fieldErrors.instagram_link}</p>}
              </div>

              {/* Followers Count */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Followers Count <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. 25K or 1.5M</span>
                </label>
                <input 
                  type="text"
                  required
                  value={followersInput}
                  onChange={(e) => { setFollowersInput(formatNumberDisplay(e.target.value)); setFieldErrors(p => ({...p, followers: null})); }}
                  placeholder="e.g. 25K or 1.5M"
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
                {fieldErrors.followers && <p className="form-error-inline text-rose-500 text-[10px] font-semibold">{fieldErrors.followers}</p>}
              </div>

              {/* Avg Reach */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Avg. Reel / Post Reach <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={avgReach}
                  onChange={(e) => { setAvgReach(formatNumberDisplay(e.target.value)); setFieldErrors(p => ({...p, avg_reach: null})); }}
                  placeholder="e.g. 15K views per reel"
                  className={`w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border ${fieldErrors.avg_reach ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[var(--violet)]'} rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white transition-all`}
                />
                {fieldErrors.avg_reach && <p className="form-error-inline text-[10px] text-rose-500 font-semibold">{fieldErrors.avg_reach}</p>}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5 sm:gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-2 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-[var(--violet)] cursor-pointer shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1 min-w-0">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => { handleMobileChange(e); setFieldErrors(p => ({...p, mobile: null})); }}
                      placeholder={countryCode === "+91" ? "10-digit number" : "Mobile number"}
                      className="w-full pl-8 sm:pl-9 pr-3 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>
                {fieldErrors.mobile && <p className="form-error-inline text-red-500 text-[10px] font-semibold">{fieldErrors.mobile}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({...p, email: null})); }}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                </div>
                {fieldErrors.email && <p className="form-error-inline text-rose-500 text-[10px] font-semibold">{fieldErrors.email}</p>}
              </div>

              {/* City / Location Autocomplete */}
              <div className="space-y-1 relative" ref={cityDropdownRef}>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    placeholder="Search city or location (e.g. Mumbai)"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                  {showCityDropdown && locationMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl max-h-60 overflow-y-auto z-50 shadow-xl p-1.5 divide-y divide-slate-100">
                      {locationMatches.map((loc) => (
                        <button
                          key={`${loc.name}-${loc.state || ''}-${loc.type}`}
                          type="button"
                          onClick={() => {
                            setCity(loc.display || `${loc.name}${loc.state ? `, ${loc.state}` : ''}`);
                            setShowCityDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--violet)]/10 rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-slate-400 group-hover:text-[var(--violet)]" />
                            <span className="text-xs font-medium text-slate-800 group-hover:text-[var(--violet)]">
                              {loc.display || loc.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-[var(--violet)] group-hover:text-white transition-colors">
                            {loc.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Charges for One UGC Video */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Charges for One UGC Video <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input 
                    type="text"
                    required
                    value={charges}
                    onChange={(e) => { setCharges(formatRupeesInput(e.target.value)); setFieldErrors(p => ({...p, charges: null})); }}
                    placeholder="e.g. ₹2,500"
                    className="w-full pl-9 pr-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                  />
                </div>
                {fieldErrors.charges && <p className="form-error-inline text-rose-500 text-[10px] font-semibold">{fieldErrors.charges}</p>}
                
                {/* Live Fair Price Suggestion */}
                {chargesFairness && (
                  <div
                    className={`mt-2 p-2.5 sm:p-3 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2.5 ${
                      chargesFairness.type === "warning"
                        ? "bg-amber-50/90 border-amber-200 text-amber-900"
                        : "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {chargesFairness.type === "warning" ? (
                        <AlertCircle size={15} className="text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="font-medium text-[11px] sm:text-xs">
                      {chargesFairness.message}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Content Niche (Single Select) */}
            <div className="space-y-1.5 pt-1 relative z-10">
              <UniversalTagSearch
                label="Primary Content Niche / Category *"
                selectedTags={niche ? [niche] : []}
                onChange={newTags => {
                  setNiche(newTags[newTags.length - 1] || "");
                  setFieldErrors(p => ({...p, niche: null}));
                }}
                type="category"
                placeholder="Search or type a category (e.g. Fashion, Tech, Comedy)..."
              />
              {fieldErrors.niche && <p className="form-error-inline text-red-500 text-[10px] font-semibold">{fieldErrors.niche}</p>}
            </div>

            {/* Preferred Collaboration Type(s) (Multi Select) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Preferred Collaboration Type(s) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Select all that apply</span>
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {COLLAB_TYPES.map((type) => {
                  const isSelected = collabTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleCollabType(type)}
                      className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected 
                          ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-2xs" 
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={13} />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.collab_types && <p className="form-error-inline text-red-500 text-[10px] font-semibold">{fieldErrors.collab_types}</p>}
            </div>

          </div>

          {/* SECTION B: Work Samples & Details */}
          <div className="bg-white border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4 sm:space-y-5">
            <div className="border-b border-slate-100 pb-3 sm:pb-4 flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                2
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                  Sample Work &amp; Experience <span className="text-xs font-semibold text-slate-400 font-sans">(Optional)</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Showcase your best UGC reels and content quality</p>
              </div>
            </div>

            {/* UGC Experience Level (1-10) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  UGC Experience Level (1 to 10)
                </label>
                <span className="px-2.5 py-0.5 bg-[var(--violet-soft)] text-[var(--violet)] font-bold text-xs rounded-lg">
                  Level {ugcRating} / 10
                </span>
              </div>
              
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setUgcRating(num)}
                    className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      ugcRating === num 
                        ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-xs scale-[1.02]" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample Work Links */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Sample Content Links</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional (Drive, Reel, YouTube)</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="url"
                  value={currentSampleInput}
                  onChange={(e) => setCurrentSampleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSampleLink();
                    }
                  }}
                  placeholder="Paste Instagram Reel, YouTube or Drive URL"
                  className="flex-1 px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={addSampleLink}
                  className="px-4 py-2.5 sm:py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus size={15} /> Add Link
                </button>
              </div>

              {/* Links list */}
              {sampleLinks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {sampleLinks.map((link, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate text-slate-700 font-mono">
                        <Link2 size={13} className="text-[var(--violet)] shrink-0" />
                        <span className="truncate">{link}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSampleLink(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Additional Notes / Short Bio</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mention past brand collaborations, equipment, languages spoken..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all resize-none"
              />
            </div>

          </div>

          {/* Submit CTA Card */}
          <div className="bg-white border border-[var(--border-default)] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-center sm:text-left space-y-0.5">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-900">
                <ShieldCheck size={15} className="text-emerald-500" /> Fast Curation &amp; Direct Listing
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Your data is reviewed exclusively by Ybex curation team.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-7 py-3 sm:py-3.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all shadow-md hover:shadow-violet-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 active:scale-95"
            >
              {loading ? "Submitting Application..." : "Submit Application"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>

        </form>

      </div>
    </div>

    {/* ========================================================================= */}
    {/* MOBILE-ONLY VIEW (DEDICATED FLOW FOR SCREENS < md)                        */}
    {/* ========================================================================= */}
    <div className={`block md:hidden ${mobileStep === "entry" ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen pb-28"} bg-white text-slate-900 selection:bg-[var(--violet-soft)]`}>
      
      {/* ------------------------------------------------------------------------- */}
      {/* 1. ENTRY SCREEN (Spec Section 3a — Light entry, one screen, no scroll)    */}
      {/* ------------------------------------------------------------------------- */}
      {mobileStep === "entry" && (
        <div className="h-full flex flex-col justify-between bg-white">
          {/* Top Bar */}
          <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                aria-label="Back to home"
                title="Back to home"
              >
                <ArrowLeft size={20} />
              </button>
              <Link 
                to="/" 
                aria-label="Ybex Home" 
                title="Ybex Home"
                className="flex items-center active:scale-95 transition-transform"
              >
                <YbexLogo className="h-7 text-slate-900 w-auto max-w-[95px]" />
              </Link>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign in
            </Link>
          </header>

          {/* Screen Body: Vertically Centered in the middle */}
          <div className="flex-1 flex flex-col justify-center px-6 py-2 max-w-md mx-auto w-full min-h-0">
            <div className="my-auto flex flex-col">
              
              {/* Genuine Creator Avatar Stack + Proof */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                  {creatorAvatars.slice(0, 5).map((imgUrl, i) => (
                    <img
                      key={i}
                      src={imgUrl}
                      alt={`Verified Creator ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full border-[1.5px] border-white object-cover shadow-2xs shrink-0"
                    />
                  ))}
                </div>
                <span className="text-[13px] sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                  643+ Creators Already Applied
                </span>
              </div>

              {/* Headline - Bolder emphasis & tighter spacing */}
              <h1 className="text-[31px] sm:text-[35px] font-black text-slate-900 tracking-[-0.03em] leading-[1.08] mb-2 font-display">
                Apply once, get discovered by paying brands.
              </h1>

              {/* Supporting Line - Tight spacing */}
              <p className="text-[13.5px] sm:text-[14px] font-medium text-slate-600 leading-snug mb-3">
                Set your price. Brands pay the rate you list no bidding, no cut.
              </p>

              {/* 3 Checkmarked Trust Facts */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2.5 text-[13px] sm:text-[13.5px] font-semibold text-slate-800">
                  <Check size={16} className="text-[var(--violet)] shrink-0" strokeWidth={2.5} />
                  <span>No login, no password needed</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] sm:text-[13.5px] font-semibold text-slate-800">
                  <Check size={16} className="text-[var(--violet)] shrink-0" strokeWidth={2.5} />
                  <span>No platform fees, ever</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] sm:text-[13.5px] font-semibold text-slate-800">
                  <Check size={16} className="text-[var(--violet)] shrink-0" strokeWidth={2.5} />
                  <span>Reviewed in 24–48 hrs</span>
                </div>
              </div>

              {/* Subtle Divider */}
              <div className="border-t border-slate-100 mb-2.5" />

              {/* Hiring on Ybex Proof Row with Auto-Rotating Horizontal Marquee */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  HIRING ON YBEX
                </span>
                
                {/* Horizontal Auto-Rotating Brands Marquee */}
                <div className="relative w-full overflow-hidden py-0.5">
                  {/* Left & Right gradient edge fades */}
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10" />
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10" />

                  <div className="flex w-max marquee-track hover:[animation-play-state:paused] items-center gap-2.5">
                    {marqueeBrands.map((brand, idx) => (
                      <div
                        key={`${brand.id || brand.name}-${idx}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs shrink-0"
                      >
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            referrerPolicy="no-referrer"
                            className="w-4 h-4 object-contain rounded-xs shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-xs bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center text-[9px] font-black shrink-0">
                            {brand.name ? brand.name[0] : "B"}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {brand.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Pinned Bottom CTA with Live Creators Card */}
            <div className="shrink-0 pt-3 pb-3 space-y-2">
              {/* See Live Creators Card */}
              <Link
                to="/creators"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between hover:border-slate-300 hover:bg-slate-50/50 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex -space-x-2 overflow-hidden shrink-0">
                    {creatorAvatars.slice(0, 3).map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt={`Live Creator ${i + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-2xs shrink-0"
                      />
                    ))}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[13px] sm:text-[13.5px] font-bold text-slate-900 tracking-tight">
                        643+ creators live now
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-[11.5px] font-medium text-slate-500 leading-tight mt-1 truncate">
                      See who's already listed — no signup
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[var(--violet)] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" strokeWidth={2.5} />
              </Link>

              {/* Apply as a creator button */}
              <button
                type="button"
                onClick={() => {
                  setMobileStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full py-3.5 sm:py-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-2xl text-[15.5px] shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>Apply as a creator</span>
                <ArrowRight size={17} strokeWidth={2.5} />
              </button>
              <p className="text-center text-xs font-medium text-slate-400">
                Takes about 2 minutes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. STEP 1 & STEP 2: STICKY FORM HEADERS (Drops old marketing hero header)  */}
      {/* ------------------------------------------------------------------------- */}
      {mobileStep !== "entry" && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (mobileStep === 2) {
                  setMobileStep(1);
                } else {
                  setMobileStep("entry");
                }
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label={mobileStep === 2 ? "Back to Step 1" : "Back to entry screen"}
              title={mobileStep === 2 ? "Back to Step 1" : "Back to entry screen"}
            >
              <ArrowLeft size={19} />
            </button>
            <Link 
              to="/" 
              title="Ybex Home" 
              className="flex items-center active:scale-95 transition-transform mr-1"
            >
              <YbexLogo className="h-6 text-slate-900 w-auto max-w-[80px]" />
            </Link>
            <div className="border-l border-slate-200 pl-2">
              <h2 className="font-black text-sm text-slate-900 font-display tracking-tight block leading-tight">
                {mobileStep === 1 ? "Creator profile" : "Work & experience"}
              </h2>
              <span className="block text-[10px] font-semibold text-[var(--violet)] leading-none mt-0.5">
                {mobileStep === 1 ? "No Login Required" : "Fully optional"}
              </span>
            </div>
          </div>

          {mobileStep === 1 ? (
            <span className="text-xs font-bold text-slate-500 px-2.5 py-1 rounded-full bg-slate-100">
              Step 1 of 2
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="text-xs font-bold text-[var(--violet)] px-2.5 py-1 rounded-lg hover:bg-[var(--violet-soft)] transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}
        </header>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* STEP 1: Creator Profile (Opens directly on first field, no marketing hero) */}
      {/* ------------------------------------------------------------------------- */}
      {mobileStep === 1 && (
        <div className="px-4 space-y-4 pt-3">
          
          {/* Profile Photo Upload Box */}
          <div
            onClick={() => {
              if (!photoUploading) mobilePhotoInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl transition-all cursor-pointer shadow-2xs select-none active:bg-slate-50"
          >
            <input
              ref={mobilePhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={photoUploading}
              className="hidden"
            />
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                {profilePhotoUrl ? (
                  <div className="relative">
                    <img
                      src={profilePhotoUrl}
                      alt="Profile Preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-[var(--violet)] shadow-xs"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                    <User size={22} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Profile Picture
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {profilePhotoUrl ? "Tap to change photo" : "Tap to upload (JPG/PNG)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {profilePhotoUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfilePhotoUrl("");
                  }}
                  title="Remove photo"
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!photoUploading) mobilePhotoInputRef.current?.click();
                }}
                disabled={photoUploading}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {photoUploading ? (
                  <>
                    <Loader2 size={12} className="animate-spin text-[var(--violet)]" />
                    <span>Uploading...</span>
                  </>
                ) : profilePhotoUrl ? (
                  <>
                    <RefreshCw size={11} className="text-slate-500" />
                    <span>Change</span>
                  </>
                ) : (
                  <>
                    <Upload size={12} className="text-[var(--violet)]" />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Basic Information Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFieldErrors((p) => ({ ...p, name: null }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
              </div>
              {fieldErrors.name && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.name}</p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGenderSheet(true)}
                  className="text-[11px] font-bold text-[var(--violet)] flex items-center gap-0.5 cursor-pointer"
                >
                  <span>More</span>
                  <ChevronDown size={13} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Female", "Male", "Other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGender(g);
                      setFieldErrors((p) => ({ ...p, gender: null }));
                    }}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all border cursor-pointer ${
                      gender === g
                        ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-2xs scale-[1.01]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {fieldErrors.gender && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.gender}</p>
              )}
            </div>

            {/* Instagram Handle */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Instagram Handle <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Must be public</span>
              </label>
              <div className="relative">
                <Instagram size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                <input
                  type="text"
                  value={socialHandle}
                  onChange={handleHandleChange}
                  placeholder="@yourusername"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
              </div>
              {fieldErrors.social_handle && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.social_handle}</p>
              )}
            </div>

            {/* Instagram Profile URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Instagram Profile URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={instagramLink}
                  onChange={(e) => {
                    setInstagramLink(e.target.value);
                    setFieldErrors((p) => ({ ...p, instagram_link: null }));
                  }}
                  placeholder="https://instagram.com/yourusername"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
              </div>
              {fieldErrors.instagram_link && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.instagram_link}</p>
              )}
            </div>

            {/* Followers & Avg Reach (2 Columns) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Followers <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={followersInput}
                  onChange={(e) => {
                    setFollowersInput(formatNumberDisplay(e.target.value));
                    setFieldErrors((p) => ({ ...p, followers: null }));
                  }}
                  placeholder="e.g. 25K"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
                {fieldErrors.followers && (
                  <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.followers}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Avg. Reach <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={avgReach}
                  onChange={(e) => {
                    setAvgReach(formatNumberDisplay(e.target.value));
                    setFieldErrors((p) => ({ ...p, avg_reach: null }));
                  }}
                  placeholder="e.g. 15K"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
                {fieldErrors.avg_reach && (
                  <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.avg_reach}</p>
                )}
              </div>
            </div>

            {/* Mobile Number (WhatsApp) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[var(--violet)] cursor-pointer shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.country} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-0">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      handleMobileChange(e);
                      setFieldErrors((p) => ({ ...p, mobile: null }));
                    }}
                    placeholder={countryCode === "+91" ? "10-digit number" : "Mobile number"}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
              {fieldErrors.mobile && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.mobile}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((p) => ({ ...p, email: null }));
                  }}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
              </div>
              {fieldErrors.email && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.email}</p>
              )}
            </div>

            {/* City / Location Autocomplete */}
            <div className="space-y-1 relative" ref={mobileCityDropdownRef}>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                City / Location
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setShowMobileCityDropdown(true);
                  }}
                  onFocus={() => setShowMobileCityDropdown(true)}
                  placeholder="Search city (e.g. Mumbai, Delhi, Bengaluru)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
                {showMobileCityDropdown && mobileLocationMatches.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl max-h-52 overflow-y-auto z-50 shadow-xl p-1 divide-y divide-slate-100">
                    {mobileLocationMatches.map((loc) => (
                      <button
                        key={`${loc.name}-${loc.state || ""}-${loc.type}`}
                        type="button"
                        onClick={() => {
                          setCity(loc.display || `${loc.name}${loc.state ? `, ${loc.state}` : ""}`);
                          setShowMobileCityDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--violet-soft)] rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-slate-400 group-hover:text-[var(--violet)]" />
                          <span className="text-xs font-medium text-slate-800 group-hover:text-[var(--violet)]">
                            {loc.display || loc.name}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {loc.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Charges for One UGC Video */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                Charges for One UGC Video <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  type="text"
                  value={charges}
                  onChange={(e) => {
                    setCharges(formatRupeesInput(e.target.value));
                    setFieldErrors((p) => ({ ...p, charges: null }));
                  }}
                  placeholder="e.g. ₹2,500"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
                />
              </div>
              {fieldErrors.charges && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.charges}</p>
              )}
              {chargesFairness && (
                <div
                  className={`mt-2 p-2.5 rounded-xl border text-xs leading-relaxed transition-all flex items-start gap-2 ${
                    chargesFairness.type === "warning"
                      ? "bg-amber-50/90 border-amber-200 text-amber-900"
                      : "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {chargesFairness.type === "warning" ? (
                      <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="font-medium text-[11px]">{chargesFairness.message}</p>
                </div>
              )}
            </div>

            {/* Primary Content Niche */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Primary Content Niche <span className="text-rose-500">*</span></span>
                {niche && (
                  <span className="text-[11px] font-bold text-[var(--violet)] bg-[var(--violet-soft)] px-2 py-0.5 rounded-md">
                    {niche}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {NICHES.slice(0, 8).map((cat) => {
                  const isSelected = niche === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setNiche(cat);
                        setFieldErrors((p) => ({ ...p, niche: null }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <UniversalTagSearch
                label=""
                selectedTags={niche ? [niche] : []}
                onChange={(newTags) => {
                  setNiche(newTags[newTags.length - 1] || "");
                  setFieldErrors((p) => ({ ...p, niche: null }));
                }}
                type="category"
                placeholder="Or search other categories..."
              />
              {fieldErrors.niche && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.niche}</p>
              )}
            </div>

            {/* Collaboration Types */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Collaboration Type(s) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Select all that apply</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLLAB_TYPES.map((type) => {
                  const isSelected = collabTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleCollabType(type)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-100"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={13} className="shrink-0" />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.collab_types && (
                <p className="mobile-form-error text-rose-500 text-[10px] font-semibold">{fieldErrors.collab_types}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* STEP 2: Samples & Experience */}
      {mobileStep === 2 && (
        <div className="px-4 space-y-4 pt-2">
          
          {/* Header Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-sm font-bold text-slate-900">Sample Work &amp; Experience</h2>
            </div>
            <p className="text-[11px] text-slate-500 font-medium pl-8">
              Showcase your past UGC reels and content quality to get approved faster (Optional).
            </p>
          </div>

          {/* UGC Experience Level */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                UGC Experience Level (1 to 10)
              </label>
              <span className="px-2 py-0.5 bg-[var(--violet-soft)] text-[var(--violet)] font-bold text-xs rounded-lg">
                Level {ugcRating} / 10
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setUgcRating(num)}
                  className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                    ugcRating === num
                      ? "bg-[var(--violet)] text-white border-[var(--violet)] shadow-xs scale-[1.02]"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Sample Links */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Sample Content Links</span>
              <span className="text-[10px] text-slate-400 font-normal">Reel, Drive or YouTube</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={currentSampleInput}
                onChange={(e) => setCurrentSampleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSampleLink();
                  }
                }}
                placeholder="Paste video URL..."
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={addSampleLink}
                className="px-3.5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shrink-0 active:scale-95 cursor-pointer"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {sampleLinks.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {sampleLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate text-slate-700 font-mono text-[11px] min-w-0">
                      <Link2 size={12} className="text-[var(--violet)] shrink-0" />
                      <span className="truncate">{link}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSampleLink(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 shrink-0 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Additional Notes / Short Bio</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mention past brand collabs, equipment, languages spoken..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[var(--violet)] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Curation Reassurance Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck size={19} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Fast Curation &amp; Direct Listing</div>
              <div className="text-[10px] text-slate-500 font-medium">Your profile is reviewed directly by the Ybex team. No public contact leaks.</div>
            </div>
          </div>

        </div>
      )}

      {/* Sticky Mobile Action Bar at Bottom (Only shown for Form Steps 1 & 2) */}
      {mobileStep !== "entry" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
          <div className="max-w-md mx-auto space-y-2">
            {mobileStep === 1 ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-0.5">
                  <span>Step 1 of 2</span>
                  <span className="text-[var(--violet)]">Profile details</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-[var(--violet)] rounded-full" />
                </div>
                <button
                  type="button"
                  onClick={handleMobileNextStep}
                  className="w-full py-3.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Continue to sample work</span>
                  <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-0.5">
                  <span>Step 2 of 2</span>
                  <span className="text-emerald-600">Final step · Optional</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-[var(--violet)] rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-3.5 py-3 border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full text-center text-[11px] font-semibold text-slate-500 hover:text-slate-800 pt-0.5 cursor-pointer"
                >
                  Skip and submit without this
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gender Bottom Sheet Modal */}
      <AnimatePresence>
        {showGenderSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGenderSheet(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-100"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Select Gender</h3>
                <button
                  type="button"
                  onClick={() => setShowGenderSheet(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {["Female", "Male", "Other"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setGender(opt);
                      setFieldErrors((p) => ({ ...p, gender: null }));
                      setShowGenderSheet(false);
                    }}
                    className={`w-full p-3.5 rounded-xl text-left font-bold text-xs flex items-center justify-between border transition-all cursor-pointer ${
                      gender === opt
                        ? "bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet-border)]"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <span>{opt}</span>
                    {gender === opt && <Check size={16} className="text-[var(--violet)]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  </>
);
}
