import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Plus, 
  Search, 
  Eye, 
  DollarSign, 
  Users, 
  MapPin, 
  Tv, 
  TrendingUp, 
  Layers, 
  HelpCircle, 
  UserPlus, 
  Globe, 
  ArrowRight,
  Shield,
  Loader2,
  Calendar,
  Instagram,
  Youtube,
  FileText,
  Clock,
  Briefcase,
  Sliders,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Megaphone,
  Package,
  CheckCircle,
  Zap,
  PlayCircle,
  Twitter,
  Facebook,
  Linkedin,
  Star,
  Monitor
} from "lucide-react";
import { CustomDatePicker } from "../../components/ui/custom-date-picker";
import { VALID_NICHES, INDIAN_CITIES } from "../../lib/constants";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";
import { useAuth } from "../../contexts/AuthContext";
import KycPromptModal from "../../components/common/KycPromptModal";

export default function BrandCampaignCreate() {
  const navigate = useNavigate();
  const { user, isKycApproved } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [brandProfile, setBrandProfile] = useState(null);
  const brandName = brandProfile?.company_name || user?.company_name || user?.name || 'Brand Partner';
  const brandLogoUrl = brandProfile?.logo || brandProfile?.avatar_url || user?.logo || user?.picture || user?.photo || user?.avatar_url || user?.company_logo || user?.profile_image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName)}&backgroundColor=6366f1`;

  // Authentication & compliance status
  const [kyc, setKyc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showKycPrompt, setShowKycPrompt] = useState(false);

  // Restore from Local Storage
  const getInitialState = (key, defaultVal) => {
    try {
      const search = new URLSearchParams(window.location.search);
      if (search.get("edit")) return defaultVal;
      
      const draftStr = localStorage.getItem('campaign_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft[key] !== undefined) return draft[key];
      }
    } catch(e) {}
    return defaultVal;
  };

  // Active Wizard Step (1 to 4)
  const [currentStep, setCurrentStep] = useState(() => getInitialState('currentStep', 1));

  // --- Campaign State Variables ---
  const [campaignTitle, setCampaignTitle] = useState(() => getInitialState('campaignTitle', ""));
  const [requirementsText, setRequirementsText] = useState(() => getInitialState('requirementsText', ""));
  const [selectedCategories, setSelectedCategories] = useState(() => getInitialState('selectedCategories', []));
  
  // Platform & Creator Preferences
  const [selectedPlatforms, setSelectedPlatforms] = useState(() => getInitialState('selectedPlatforms', ["Instagram"])); // Instagram, YouTube
  const [selectedFollowerRanges, setSelectedFollowerRanges] = useState(() => getInitialState('selectedFollowerRanges', ["Micro"])); // Nano, Micro, Macro, Mega, Celeb
  const [gender, setGender] = useState(() => getInitialState('gender', "Both")); // Both, Female, Male
  const [selectedLanguages, setSelectedLanguages] = useState(() => getInitialState('selectedLanguages', ["Hindi", "English"]));

  // Payout, Scope & Logistics
  const [collabMode, setCollabMode] = useState(() => getInitialState('collabMode', "Paid")); // Paid, Barter
  const [barterDescription, setBarterDescription] = useState(() => getInitialState('barterDescription', ""));
  const [budgetType, setBudgetType] = useState(() => getInitialState('budgetType', "Per Influencer")); // Total Campaign, Per Influencer
  const [isBudgetRange, setIsBudgetRange] = useState(() => getInitialState('isBudgetRange', false));
  const [budget, setBudget] = useState(() => getInitialState('budget', "5000"));
  const [budgetMin, setBudgetMin] = useState(() => getInitialState('budgetMin', "5000"));
  const [budgetMax, setBudgetMax] = useState(() => getInitialState('budgetMax', "15000"));
  const [deliverablesText, setDeliverablesText] = useState(() => getInitialState('deliverablesText', "1 Instagram Reel with link in bio"));
  
  // Logistics & Locations
  const [creatorsNeeded, setCreatorsNeeded] = useState(() => getInitialState('creatorsNeeded', "5-15")); // Less than 5, 5-15, 15-25, 25-50, Enter Manually
  const [customCreatorsNeeded, setCustomCreatorsNeeded] = useState(() => getInitialState('customCreatorsNeeded', "10"));
  const [selectedLocations, setSelectedLocations] = useState(() => getInitialState('selectedLocations', [])); // Array of cities
  const [deadline, setDeadline] = useState(() => getInitialState('deadline', ""));
  const [previewTab, setPreviewTab] = useState("card");

  useEffect(() => {
    if (!editId && (campaignTitle || currentStep > 1)) {
      const stateObj = {
        currentStep, campaignTitle, requirementsText, selectedCategories,
        selectedPlatforms, selectedFollowerRanges, gender, selectedLanguages,
        collabMode, barterDescription, budgetType, isBudgetRange, budget,
        budgetMin, budgetMax, deliverablesText, creatorsNeeded, customCreatorsNeeded,
        selectedLocations, deadline
      };
      localStorage.setItem('campaign_draft', JSON.stringify(stateObj));
    }
  }, [editId, currentStep, campaignTitle, requirementsText, selectedCategories,
      selectedPlatforms, selectedFollowerRanges, gender, selectedLanguages,
      collabMode, barterDescription, budgetType, isBudgetRange, budget,
      budgetMin, budgetMax, deliverablesText, creatorsNeeded, customCreatorsNeeded,
      selectedLocations, deadline]);

  // Search helpers
  const [categorySearch, setCategorySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  // Custom static lists
  const INDIAN_LANGUAGES = [
    "English", "Hindi", "Marathi", "Telugu", "Tamil", "Gujarati", "Urdu", "Bhojpuri", "Kannada", "Odia", "Malayalam", "Punjabi", "Assamese", "Bengali"
  ];

  const followerRangesMap = {
    "Nano": { range: "4k - 10k", label: "Nano Creators" },
    "Micro": { range: "10k - 50k", label: "Micro Creators" },
    "Macro": { range: "50k - 500k", label: "Macro Creators" },
    "Mega": { range: "500k - 1M", label: "Mega Stars" },
    "Celeb": { range: "1M+", label: "Celebrities" }
  };

  const getLivePreviewRequirementsString = () => {
    const niches = selectedCategories.length > 0 ? selectedCategories.join(", ") : "Any Niche";
    const platforms = selectedPlatforms.length > 0 ? selectedPlatforms.join(" & ") : "Instagram";
    
    let reach = "";
    if (selectedFollowerRanges.length > 0) {
      reach = selectedFollowerRanges?.map(t => followerRangesMap[t]?.range || t).join(" / ") + " followers";
    } else {
      reach = "10k+ followers";
    }

    const genderText = gender && gender !== "Both" ? `${gender} creators` : "Creators (Any Gender)";
    const langText = selectedLanguages.length > 0 ? `fluent in ${selectedLanguages.join(", ")}` : "";
    const locText = selectedLocations.length > 0 ? `based in ${selectedLocations.join(", ")}` : "Pan India";

    return `${niches} ${genderText} on ${platforms} with ${reach}, ${langText} ${locText}.`.replace(/ ,/g, ',').replace(/\s+/g, ' ').trim();
  };

  const getPreviewPayoutDisplay = () => {
    if (collabMode === "Barter") return "Barter Collab";
    if (isBudgetRange) {
      const minVal = Number(budgetMin) ? Number(budgetMin).toLocaleString() : "0";
      const maxVal = Number(budgetMax) ? Number(budgetMax).toLocaleString() : "0";
      return `₹${minVal} - ₹${maxVal}`;
    }
    const singleVal = Number(budget) ? Number(budget).toLocaleString() : "0";
    return `₹${singleVal}`;
  };

  useEffect(() => {
    // Get brand profile for logo and company name
    api.get("brand-profile")
      .then(({ data }) => setBrandProfile(data))
      .catch(err => {
        console.error(err);
        toast.error("Failed to load brand profile. Please refresh.");
      });

    // Get verification details
    api.get("verifications/me")
      .then(({ data }) => setKyc(data))
      .catch(err => {
        console.error(err);
        toast.error("Failed to load compliance data. Please refresh.");
      });

    // Set default deadline to 14 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    const yyyy = defaultDate.getFullYear();
    const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const dd = String(defaultDate.getDate()).padStart(2, '0');
    setDeadline(`${yyyy}-${mm}-${dd}`);

    if (editId) {
      api.get(`/campaigns?mine=true`).then(({ data }) => {
        const found = data.find(c => String(c.campaign_id || c.id) === String(editId));
        if (found) {
          setCampaignTitle(found.title || "");
          setRequirementsText(found.description || "");
          setSelectedCategories(found.categories || []);
          setSelectedPlatforms(found.platforms || ["Instagram"]);
          setCollabMode(found.collab_mode || "Paid");
          setBarterDescription(found.barter_description || "");
          setGender(found.gender || "Both");
          
          if (found.budget_min) {
            setBudget(String(found.budget_min));
            setBudgetMin(String(found.budget_min));
            if (found.budget_max) {
              setIsBudgetRange(true);
              setBudgetMax(String(found.budget_max));
            }
          }
          if (found.deliverables && found.deliverables.length > 0) {
            setDeliverablesText(found.deliverables[0]);
          }
          setCreatorsNeeded(found.max_creators ? String(found.max_creators) : "5-15");
          setSelectedLocations(found.specific_locations || []);
          setDeadline(found.deadline || "");
          if (found.languages) {
            setSelectedLanguages(found.languages);
          }
        }
      }).catch(err => {
        console.error(err);
        toast.error("Failed to load campaign for editing. Please refresh.");
        navigate("/brand/campaigns");
      });
    }
  }, [editId]);

  const handleCategoryToggle = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(prev => prev?.filter(c => c !== category));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories(prev => [...prev, category]);
      } else {
        toast.warning("You can select up to 3 core categories for precise matchmaking.");
      }
    }
  };

  const handlePlatformToggle = (plat) => {
    if (selectedPlatforms.includes(plat)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(prev => prev?.filter(p => p !== plat));
      } else {
        toast.warning("At least one social platform must be selected.");
      }
    } else {
      setSelectedPlatforms(prev => [...prev, plat]);
    }
  };

  const handleFollowerToggle = (tier) => {
    if (selectedFollowerRanges.includes(tier)) {
      if (selectedFollowerRanges.length > 1) {
        setSelectedFollowerRanges(prev => prev?.filter(t => t !== tier));
      }
    } else {
      setSelectedFollowerRanges(prev => [...prev, tier]);
    }
  };

  const handleLocationToggle = (city) => {
    if (selectedLocations.includes(city)) {
      setSelectedLocations(prev => prev?.filter(c => c !== city));
    } else {
      if (selectedLocations.length < 5) {
        setSelectedLocations(prev => [...prev, city]);
      } else {
        toast.warning("Up to 5 focused target cities allowed.");
      }
    }
  };

  const handleLanguageToggle = (lang) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(prev => prev?.filter(l => l !== lang));
    } else {
      setSelectedLanguages(prev => [...prev, lang]);
    }
  };

  const handleSaveCampaign = async (isDraftMode = false) => {
    if (!campaignTitle.trim()) {
      toast.error("Please enter a campaign display title.");
      return;
    }

    // If attempting to launch live without KYC approval, prompt the user clearly
    if (!isDraftMode && !isKycApproved) {
      setShowKycPrompt(true);
      return;
    }

    try {
      setSubmitting(true);

      const parsedMaxCreators = creatorsNeeded === "Enter Manually" 
        ? (parseInt(customCreatorsNeeded) || 10) 
        : creatorsNeeded === "Less than 5" ? 4 
        : creatorsNeeded === "5-15" ? 15 
        : creatorsNeeded === "15-25" ? 25 
        : 50;

      const payload = {
        title: campaignTitle.trim(),
        description: requirementsText || "No description provided",
        collab_mode: collabMode,
        budget_min: collabMode === "Paid" ? (isBudgetRange ? (Number(budgetMin) || 1000) : (Number(budget) || 1000)) : 0,
        budget_max: collabMode === "Paid" && isBudgetRange ? (Number(budgetMax) || null) : null,
        deliverables: [deliverablesText || "1 Promo Reel"],
        deliverables_detailed: [{ duration: "30-60 seconds", collab_type: "Collaborative", type: "Reel", content_type: "Promotional", script_type: "SLA" }],
        categories: selectedCategories.length > 0 ? selectedCategories : ["Fashion & Style"],
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : ["Instagram"],
        deadline: deadline || "2026-08-31",
        status: isDraftMode ? "draft" : "live",
        location_type: selectedLocations.length > 0 ? "Specific location" : "Pan India",
        specific_locations: selectedLocations,
        language_type: selectedLanguages.length > 0 ? "Select languages" : "Any language",
        languages: selectedLanguages,
        max_creators: parsedMaxCreators,
        brand_type: "Verified",
        follower_min: selectedFollowerRanges.includes("Nano") ? 4000 : 10000,
        follower_max: selectedFollowerRanges.includes("Celeb") ? 1000000 : 500000,
        gender: gender,
        dos: "Include clear product close-up, maintain brand tone.",
        donts: "Do not post low lighting clips, avoid competitor mentions.",
        hashtags: `#CreatorCollab #${campaignTitle.split(" ")[0] || "Campaign"}`
      };

      if (editId) {
        await api.post(`/campaigns/${editId}/update`, payload).catch(async () => {
          await api.post(`/campaigns`, payload);
        });
        toast.success(isDraftMode ? "Draft updated successfully!" : "Campaign updated and launched safely!");
      } else {
        await api.post("campaigns", payload);
        toast.success(isDraftMode ? "Draft saved successfully!" : "Campaign brief successfully published to matchmaking pool!");
      }
      
      if (!editId && !isDraftMode) {
        localStorage.removeItem('campaign_draft');
      }

      navigate("/brand/campaigns");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to submit campaign. Please check inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!campaignTitle.trim()) {
        toast.error("Display Title is required to start.");
        return false;
      }
      if (selectedCategories.length === 0) {
        toast.error("Please pick at least 1 core niche/category.");
        return false;
      }
      if (requirementsText.length < 15) {
        toast.error("Please describe your campaign requirements briefly (minimum 15 characters).");
        return false;
      }
    }
    if (step === 2) {
      if (selectedPlatforms.length === 0) {
        toast.error("Please select at least one social media platform.");
        return false;
      }
      if (selectedFollowerRanges.length === 0) {
        toast.error("Please pick at least one tier of creator reach.");
        return false;
      }
    }
    if (step === 3) {
      if (collabMode === "Paid") {
        if (isBudgetRange) {
          if (!budgetMin || !budgetMax || Number(budgetMin) >= Number(budgetMax)) {
            toast.error("Please provide a valid budget range where minimum is less than maximum.");
            return false;
          }
        } else {
          if (!budget || Number(budget) <= 0) {
            toast.error("Please enter a valid payout budget.");
            return false;
          }
        }
      } else {
        if (!barterDescription.trim()) {
          toast.error("Please outline the products or services you are offering for barter.");
          return false;
        }
      }
      if (!deliverablesText.trim()) {
        toast.error("Please state the creator deliverables.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const stepsList = [
    { num: 1, title: "Narrative & Niche", subtitle: "What & Who" },
    { num: 2, title: "Platforms & Audience", subtitle: "Creator Specs" },
    { num: 3, title: "Payout & Scope", subtitle: "Compensation Structure" },
    { num: 4, title: "Logistics & Launch", subtitle: "Finalization" }
  ];

  return (
    <div className="w-full max-w-none px-4 sm:px-6 md:px-10 pt-6 pb-10 text-left min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans">
      
      {/* KYC Warning Banner if Not Approved */}
      {!isKycApproved && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Business KYC Verification Required to Launch</p>
              <p className="text-[11px] text-[var(--text-secondary)]">You can author and save drafts freely. Complete KYC to publish briefings to creators.</p>
            </div>
          </div>
          <button
            onClick={() => setShowKycPrompt(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            Verify Business KYC
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-[var(--border-default)]">
        <div>
          <button 
            onClick={async () => {
              if (campaignTitle.trim()) {
                toast.info("Saving draft before leaving...");
                await handleSaveCampaign(true);
              } else {
                navigate("/brand/campaigns");
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} /> Back to Briefs List
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-black num-black tracking-tight text-[var(--text-primary)]">
            {editId ? "Modify Campaign Briefing" : "Compose Creative Briefing"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Author an attractive, highly converting matchmaking proposal to lock down elite creators.
          </p>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveCampaign(true)}
            className="px-5 py-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
          >
            Save as Draft
          </button>
          {currentStep === 4 ? (
            <button
              onClick={() => handleSaveCampaign(false)}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[var(--violet)] hover:bg-[#6B4AFF] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={3} /> Launch Live Briefing
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              Continue Wizard <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* HORIZONTAL WIZARD TIMELINE PROGRESS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stepsList?.map((st) => {
          const isActive = currentStep === st.num;
          const isCompleted = currentStep > st.num;
          return (
            <div 
              key={st.num}
              onClick={() => {
                // Allow clicking backwards, or forwards only if validated
                if (st.num < currentStep) {
                  setCurrentStep(st.num);
                } else if (st.num > currentStep) {
                  // Validate sequentially
                  let canGo = true;
                  for (let i = currentStep; i < st.num; i++) {
                    if (!validateStep(i)) {
                      canGo = false;
                      break;
                    }
                  }
                  if (canGo) setCurrentStep(st.num);
                }
              }}
              className={`p-4 rounded-2xl border transition-all text-left cursor-pointer select-none relative overflow-hidden ${
                isActive 
                  ? "bg-indigo-600/10 border-indigo-500 shadow-md" 
                  : isCompleted 
                    ? "bg-[var(--bg-card)] border-emerald-500/40 text-[var(--text-secondary)]" 
                    : "bg-[var(--bg-card)] border-[var(--border-default)] opacity-60 hover:opacity-100"
              }`}
            >
              {isCompleted && (
                <div className="absolute top-2 right-2 p-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive 
                    ? "bg-indigo-500 text-white" 
                    : isCompleted 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-foreground/10 text-[var(--text-tertiary)]"
                }`}>
                  {st.num}
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{st.title}</span>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 font-medium">{st.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* CORE SPLIT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ACTIVE STEP FORM WRAPPER (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-xl min-h-[480px] flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* STEP 1: CAMPAIGN DISPLAY & CORE NARRATIVE */}
              {currentStep === 1 && (
                <div className="space-y-6 text-left">
                  <div className="pb-3 border-b border-[var(--border-default)]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400">Step 1: Campaign Display & Core Narrative</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Let's set up the public description and search category for creators.</p>
                  </div>

                  {/* Campaign Title */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Campaign Title *</label>
                    <input
                      type="text"
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="e.g. Summer Launch Video Promo, Wearable Tech Reel Campaign"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] px-4 py-3 rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Requirements Textbox */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Detailed Creative Guidelines & Brief *</label>
                      <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{requirementsText.length} chars</span>
                    </div>
                    <textarea
                      value={requirementsText}
                      onChange={(e) => setRequirementsText(e.target.value)}
                      placeholder="Write a clear, inspiring description of your product and what you are looking for in terms of creator content. e.g. We are launching a new skincare serum. Need creators to post a morning routine reel demonstrating usage and texture."
                      rows={6}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed resize-none outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Categories List Tag Multi-Select */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-primary)]">Select Campaign Niche / Categories (Max 3) *</label>
                      <p className="text-[11px] text-[var(--text-secondary)] mb-1">Choose categories that describe your product sector.</p>
                    </div>

                    <UniversalTagSearch
                      selectedTags={selectedCategories}
                      onChange={newTags => {
                        if (newTags.length <= 3) {
                          setSelectedCategories(newTags);
                        } else {
                          toast.warning("You can select up to 3 core categories for precise matchmaking.");
                        }
                      }}
                      type="category"
                      placeholder="Search or create custom campaign niches..."
                    />
                  </div>

                </div>
              )}

              {/* STEP 2: PLATFORMS, FOLLOWER REACH & CREATOR SPECS */}
              {currentStep === 2 && (
                <div className="space-y-6 text-left">
                  <div className="pb-3 border-b border-[var(--border-default)]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400">Step 2: Platform & Creator Target Reach</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Define your ideal audience demographics and target social networks.</p>
                  </div>

                  {/* Targeted Platforms Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Target Platforms</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "Instagram", label: "Instagram", icon: () => <img src="/assets/instagram.svg" className="w-6 h-6 mr-2" alt="Instagram" />, desc: "Reels, Posts & Stories" },
                        { id: "YouTube", label: "YouTube", icon: () => <img src="/assets/youtube.svg" className="w-6 h-6 mr-2" alt="YouTube" />, desc: "Shorts & Dedicated Video Reviews" }
                      ].map(p => {
                        const isSelected = selectedPlatforms.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handlePlatformToggle(p.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-purple-600/10 border-purple-500 shadow-md" 
                                : "bg-[var(--bg-elevated)] border-[var(--border-default)] opacity-70 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className={`flex items-center justify-center w-5 h-5 ${!isSelected ? 'grayscale opacity-50' : ''}`}><p.icon /></div>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-purple-500 bg-purple-500 text-white" : "border-[var(--border-default)]"
                              }`}>
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                            </div>
                            <h4 className="text-xs font-black text-[var(--text-primary)] mt-3">{p.label}</h4>
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{p.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Follower Reach Tiers */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Preferred Creator Reach Tiers (Select Multiple)</label>
                    <p className="text-[11px] text-[var(--text-secondary)]">Mix and match different creator scales to optimize engagement budgets.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      {Object.keys(followerRangesMap).map(tier => {
                        const isSelected = selectedFollowerRanges.includes(tier);
                        return (
                          <label 
                            key={tier}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-indigo-600/10 border-indigo-500" 
                                : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:bg-foreground/5"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleFollowerToggle(tier)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 bg-transparent border-[var(--border-default)]"
                              />
                              <div>
                                <h5 className="text-xs font-bold text-[var(--text-primary)]">{followerRangesMap[tier].label}</h5>
                                <p className="text-[10px] text-[var(--text-tertiary)]">{followerRangesMap[tier].range} followers</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Creator Gender Preference */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Creator Gender Preference</label>
                    <div className="flex gap-2">
                      {["Both", "Female", "Male"].map(g => {
                        const isSelected = gender === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-black" 
                                : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {g === "Both" ? "Any Gender" : g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content Language select pills */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Target Content Languages</label>
                    <div className="flex flex-wrap gap-1.5">
                      {INDIAN_LANGUAGES?.map(lang => {
                        const isSelected = selectedLanguages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleLanguageToggle(lang)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                              isSelected 
                                ? "bg-purple-600/15 border-purple-500 text-purple-400 font-extrabold" 
                                : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 3: COMPENSATION STRUCTURE & DELIVERABLES */}
              {currentStep === 3 && (
                <div className="space-y-6 text-left">
                  <div className="pb-3 border-b border-[var(--border-default)]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400">Step 3: Compensation Structure & Deliverables</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Let's set up budgets, payout options, and exactly what content the creator needs to deliver.</p>
                  </div>

                  {/* Collaboration Mode Switcher */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Collaboration Mode</label>
                    <div className="flex bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setCollabMode("Paid")}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          collabMode === "Paid" 
                            ? "bg-[var(--violet)] text-white shadow-md" 
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        Paid Campaign (Monetary Payouts)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollabMode("Barter")}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          collabMode === "Barter" 
                            ? "bg-[var(--violet)] text-white shadow-md" 
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        Barter Collab (Product Exchange)
                      </button>
                    </div>
                  </div>

                  {/* Conditionally render Paid Budget vs Barter Description */}
                  {collabMode === "Paid" ? (
                    <div className="space-y-4 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">Configure Escrow Payouts</h4>
                        
                        {/* Budget Range Switch */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isBudgetRange}
                            onChange={(e) => setIsBudgetRange(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-600 bg-transparent border-[var(--border-default)]"
                          />
                          <span className="text-xs font-bold text-[var(--text-secondary)]">Set Budget Range</span>
                        </label>
                      </div>

                      {/* Budget distribution mode */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)]">Payout Budget Target Type</label>
                        <div className="flex gap-2">
                          {["Per Influencer", "Total Campaign"].map(type => {
                            const isSelected = budgetType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setBudgetType(type)}
                                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" 
                                    : "bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)]"
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Budget input value */}
                      {!isBudgetRange ? (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[var(--text-primary)]">Payout Payout Amount (INR ₹)</label>
                          <div className="flex items-center px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
                            <span className="text-sm font-bold text-[var(--text-tertiary)] mr-2">₹</span>
                            <input
                              type="number"
                              value={budget}
                              onChange={(e) => setBudget(e.target.value)}
                              placeholder="e.g. 5000"
                              className="w-full bg-transparent border-none outline-none text-sm font-bold text-[var(--text-primary)]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--text-primary)]">Min Budget (INR ₹)</label>
                            <div className="flex items-center px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
                              <span className="text-sm font-bold text-[var(--text-tertiary)] mr-2">₹</span>
                              <input
                                type="number"
                                value={budgetMin}
                                onChange={(e) => setBudgetMin(e.target.value)}
                                placeholder="5000"
                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-[var(--text-primary)]"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--text-primary)]">Max Budget (INR ₹)</label>
                            <div className="flex items-center px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
                              <span className="text-sm font-bold text-[var(--text-tertiary)] mr-2">₹</span>
                              <input
                                type="number"
                                value={budgetMax}
                                onChange={(e) => setBudgetMax(e.target.value)}
                                placeholder="15000"
                                className="w-full bg-transparent border-none outline-none text-sm font-bold text-[var(--text-primary)]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <label className="text-xs font-bold text-[var(--text-primary)]">Provide Barter Compensation Details</label>
                      <textarea
                        value={barterDescription}
                        onChange={(e) => setBarterDescription(e.target.value)}
                        placeholder="e.g. We will send 1 full skincare product hamper containing Serum, Hydrating Cream & Sunscreen worth ₹4,500. Free of cost plus exclusive discount code for your followers."
                        rows={4}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] p-3 rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed resize-none outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Creator Deliverables expectations */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">SLA Content Deliverables Required</label>
                    <input
                      type="text"
                      value={deliverablesText}
                      onChange={(e) => setDeliverablesText(e.target.value)}
                      placeholder="e.g. 1 Instagram Reel (minimum 30 secs) + 1 Instagram Story with Link"
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] px-4 py-3 rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-indigo-500"
                    />
                  </div>

                </div>
              )}

              {/* STEP 4: GEOGRAPHICS, DATES, LOGISTICS & SAFETY REVIEW */}
              {currentStep === 4 && (
                <div className="space-y-6 text-left">
                  <div className="pb-3 border-b border-[var(--border-default)]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400">Step 4: Logistics, Cities & Launch</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Finalize dates, physical localization targets, and total scale of the campaign.</p>
                  </div>

                  {/* Location Selector (Pan India vs Specific) */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-primary)]">Physical Location Targets (Up to 5 Cities / States)</label>
                      <p className="text-[11px] text-[var(--text-secondary)] mb-2.5">Leave empty to accept creators anywhere in Pan India.</p>
                      <UniversalTagSearch
                        selectedTags={selectedLocations}
                        onChange={newTags => {
                          if (newTags.length <= 5) {
                            setSelectedLocations(newTags);
                          } else {
                            toast.warning("Up to 5 focused target locations allowed.");
                          }
                        }}
                        type="location"
                        placeholder="Search or type to add any city or state..."
                      />
                    </div>
                  </div>

                  {/* Deadline Custom Date Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Application Submission Deadline</label>
                    <CustomDatePicker
                      date={deadline}
                      setDate={setDeadline}
                      placeholder="Select application deadline"
                      className="w-full"
                    />
                  </div>

                  {/* Total Creators needed */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Desired Number of Creator Matchings</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["Less than 5", "5-15", "15-25", "Enter Manually"].map(countOption => {
                        const isSelected = creatorsNeeded === countOption;
                        return (
                          <button
                            key={countOption}
                            type="button"
                            onClick={() => setCreatorsNeeded(countOption)}
                            className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-black" 
                                : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {countOption === "Enter Manually" ? "Custom" : countOption}
                          </button>
                        );
                      })}
                    </div>

                    {creatorsNeeded === "Enter Manually" && (
                      <div className="space-y-1 pt-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Custom Creator Count Target</label>
                        <input
                          type="number"
                          value={customCreatorsNeeded}
                          onChange={(e) => setCustomCreatorsNeeded(e.target.value)}
                          className="w-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1.5 rounded-lg text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Campaign Brief Budget & Escrow Summary (Free to post brief) */}
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-5 text-left space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-[var(--border-default)]">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Campaign Budget Allocation</span>
                        <span className="text-xs text-[var(--text-tertiary)]">Creator payout displayed on brief</span>
                      </div>
                      <span className="font-display font-extrabold text-lg text-[var(--violet)]">
                        {collabMode === "Barter" ? "Barter Collaboration" : getPreviewPayoutDisplay()}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-[var(--text-secondary)]">
                        <span>Campaign Brief Publishing</span>
                        <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          Free (₹0 Upfront)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[var(--text-secondary)]">
                        <span>Target Matchings</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {creatorsNeeded === "Enter Manually" ? `${customCreatorsNeeded} Creators` : `${creatorsNeeded} Creators`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[var(--text-secondary)]">
                        <span>Escrow Deposit Timing</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          Only when hiring a creator
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Escrow Shield Information Notice */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 text-left">
                    <Shield className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="font-extrabold text-emerald-400 text-xs uppercase tracking-wider">Ybex 100% Escrow Protection</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        Posting this campaign brief is completely free. Creators in your selected niche will view and apply. You only fund the Escrow deposit once you review applications and finalize a deal with a creator.
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* BACK / NEXT IN-CARD FLOW CONTROLS */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--border-default)] mt-8">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="px-5 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-foreground/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Back
            </button>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono font-bold text-[var(--text-tertiary)] flex items-center bg-foreground/5 px-2.5 py-1 rounded-lg">
                Step {currentStep} of 4
              </span>
            </div>
            {currentStep === 4 ? (
              <button
                type="button"
                onClick={() => handleSaveCampaign(false)}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md hover:scale-[1.01] cursor-pointer"
              >
                {submitting ? "Launching..." : "Publish Campaign"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Next Step <ChevronRight size={14} />
              </button>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: HIGH-END DYNAMIC CREATOR PREVIEW PANEL (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)]">Live Creator Preview</h3>
              <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-extrabold shrink-0">
                <Eye size={10} /> Live
              </span>
            </div>

            {/* Compact Toggle buttons between Card and Detailed view */}
            <div className="flex bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-1 shadow-sm shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab("card")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  previewTab === "card"
                    ? "bg-[var(--violet)] text-white shadow-md font-black"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Card View
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("detail")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  previewTab === "detail"
                    ? "bg-[var(--violet)] text-white shadow-md font-black"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Detail View
              </button>
            </div>
          </div>

          {/* Display Container with matching style */}
          <div className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] p-6 shadow-xl relative text-left">
            <div className="relative z-10">
              
              {previewTab === "card" ? (
                /* FEED CARD PREVIEW (Exactly like Campaigns.jsx) */
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-center">
                      <img 
                        src={brandLogoUrl} 
                        alt={brandName} 
                        className="w-12 h-12 rounded-full object-cover border border-[var(--border-default)] shrink-0" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName)}&backgroundColor=6366f1`;
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)] text-base line-clamp-1">
                          {campaignTitle.trim() || "Campaign Display Title"}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1 font-semibold">
                          by {brandName} <CheckCircle size={12} className="text-emerald-500" />
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Just now</p>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border text-amber-600 bg-amber-500/10 border-amber-500/20">
                      Live Draft
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <CheckCircle size={14} /> Actively reviewing
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Looking for</p>
                    <div className="text-[var(--text-primary)] font-medium text-xs leading-relaxed">
                      {getLivePreviewRequirementsString()}
                    </div>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)] shrink-0"><IndianRupee size={14}/></div>
                      <div className="min-w-0">
                        <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Payout</p>
                        <p className="font-extrabold text-[var(--text-primary)] text-[11px] truncate">
                          {getPreviewPayoutDisplay()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)] shrink-0"><Megaphone size={14}/></div>
                      <div className="min-w-0">
                        <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Platforms</p>
                        <p className="font-extrabold text-[var(--text-primary)] text-[11px] truncate">
                          {selectedPlatforms.join(", ") || "Instagram"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)] shrink-0"><MapPin size={14}/></div>
                      <div className="min-w-0">
                        <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Location</p>
                        <p className="font-extrabold text-[var(--text-primary)] text-[11px] truncate">
                          {selectedLocations.length > 0 ? selectedLocations.join(", ") : "Pan India"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-primary)] shrink-0"><Package size={14}/></div>
                      <div className="min-w-0">
                        <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Deliverables</p>
                        <p className="font-extrabold text-[var(--text-primary)] text-[11px] truncate" title={deliverablesText}>
                          {deliverablesText || "1x Post"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description Body */}
                  <div className="text-xs text-[var(--text-primary)] leading-relaxed space-y-1 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)]">
                    <p><strong>Creators, it's a match!</strong></p>
                    <p className="line-clamp-2 text-[var(--text-secondary)]">
                      {requirementsText.trim() || "Brief creative description will display here when authored."}
                    </p>
                  </div>

                  {/* Footer Stats */}
                  <div className="border-t border-[var(--border-default)] pt-3.5 flex items-center justify-between text-[10px] font-semibold text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Eye size={12} className="animate-eye-blink"/> 0 Views</span>
                    <span className="flex items-center gap-1 text-[var(--violet)]">
                      <div className="flex -space-x-1.5 mr-1">
                        <div className="w-4 h-4 rounded-full border border-[var(--bg-card)] bg-gray-200"></div>
                        <div className="w-4 h-4 rounded-full border border-[var(--bg-card)] bg-gray-300"></div>
                        <div className="w-4 h-4 rounded-full border border-[var(--bg-card)] bg-gray-400"></div>
                      </div>
                      0 Active Proposals
                    </span>
                  </div>
                </div>
              ) : (
                /* DETAIL PAGE PREVIEW (Exactly like CampaignDetail.jsx) */
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="flex gap-3 items-center">
                    <img 
                      src={brandLogoUrl} 
                      alt={brandName} 
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-default)] shrink-0" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brandName)}&backgroundColor=6366f1`;
                      }}
                    />
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1">
                        Marketing Manager <CheckCircle size={14} className="text-emerald-500" />
                      </h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        Influencer Specialist @ {brandName}
                      </p>
                      <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Just now</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1 rounded-xl border border-emerald-500/20">
                    <CheckCircle size={14} /> Actively reviewing
                  </div>

                  <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight leading-tight text-[var(--text-primary)]">
                    {campaignTitle.trim() || "Campaign Display Title"}
                  </h1>

                  {/* Looking For with pills */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Looking for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCategories.length > 0 ? (
                        selectedCategories?.map((cat, i) => (
                          <span key={i} className="px-2.5 py-1 bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--violet)]/20 rounded-lg text-[10px] font-bold">
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 bg-[var(--border-default)] text-[var(--text-tertiary)] rounded-lg text-[10px] font-semibold">
                          No niches selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-primary)] leading-relaxed mt-1 font-medium">
                      {getLivePreviewRequirementsString()}
                    </p>
                  </div>

                  {/* Grid details (Violet accent box style) */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                        <IndianRupee size={15}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Payout</p>
                        <p className="font-bold text-[var(--text-primary)] text-xs truncate">
                          {getPreviewPayoutDisplay()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                        <Megaphone size={15}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Brand Type</p>
                        <p className="font-bold text-[var(--text-primary)] text-xs truncate">Various</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                        <MapPin size={15}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Location</p>
                        <p className="font-bold text-[var(--text-primary)] text-xs truncate">
                          {selectedLocations.length > 0 ? selectedLocations.join(", ") : "Pan India"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-center text-[var(--violet)] shrink-0">
                        <Package size={15}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Deliverables</p>
                        <p className="font-bold text-[var(--text-primary)] text-xs truncate" title={deliverablesText}>
                          {deliverablesText || "1x Post"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Brief Details Description Section */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Brief Details</p>
                    <div className="text-xs text-[var(--text-primary)] leading-relaxed space-y-2 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-default)]">
                      <p><strong>Creators, it's a match!</strong></p>
                      <p className="whitespace-pre-wrap text-[var(--text-secondary)]">
                        {requirementsText.trim() || "Brief creative description will display here when authored."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Quick Creator Reach Match Score Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center gap-4 text-left shadow-sm">
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl shrink-0">
              <Sliders size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black text-[var(--text-primary)]">Intelligent Creator Matching</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Based on your categories (<span className="text-indigo-400 font-bold">{selectedCategories.length > 0 ? selectedCategories[0] : "None chosen"}</span>), platforms, and language tags, we have identified <strong className="text-[var(--text-primary)] font-bold">140+ premium verified creators</strong> ready for matches.
              </p>
            </div>
          </div>

        </div>

      </div>

      <KycPromptModal
        isOpen={showKycPrompt}
        onClose={() => setShowKycPrompt(false)}
        role="brand"
        actionType="create_campaign"
        allowDraft={true}
        onContinueDraft={async () => {
          setShowKycPrompt(false);
          await handleSaveCampaign(true);
        }}
      />

    </div>
  );
}
