import React, { useState, useEffect, useRef } from "react";
import { formatAmount, safeLower } from "../../utils/safeFormat";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Camera, Search, Check, Shield, Loader2, X, Plus, AlertCircle, CheckCircle2, MapPin, Clock } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { saveCreatorProfileStep, fetchPinCodeDetails, uploadProfilePhoto } from "../../api/onboarding";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { VALID_NICHES, INDIAN_LANGUAGES } from "../../lib/constants";
import { searchLocations } from "../../lib/locations";
import PreStep_EmailVerify from "../../components/onboarding/PreStep_EmailVerify";
import MobileOnboardingHeader, { MobilePrimaryButton, MobileChip, MobileFieldLabel, MobileTextInput } from "../../components/onboarding/mobile/MobileOnboardingShell";
import UniversalTagSearch from "../../components/shared/UniversalTagSearch";

const NICHE_ICONS_ROW = ["Health", "Beauty", "Fashion", "Food", "Tech", "Travel"];

const ADDITIONAL_LANGUAGES = [
  "Bhojpuri", "Marwari", "Haryanvi", "Rajasthani", "Maithili", "Konkani",
  "Kashmiri", "Sindhi", "Santali", "Nepali", "Dogri", "Manipuri",
  "Bodo", "Tulu", "Chhattisgarhi", "Sanskrit", "French", "Spanish",
  "German", "Arabic", "Russian", "Japanese", "Korean", "Portuguese"
];

function fmtK(n) {
  const num = Number(n) || 0;
  return num >= 1000 ? (num / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(num);
}

export default function CreatorOnboardingMobile({ user, onComplete }) {
  const navigate = useNavigate();
  const store = useOnboardingStore();
  const [screen, setScreen] = useState(1);
  const [saving, setSaving] = useState(false);
  const [creatorTier, setCreatorTier] = useState("Bronze");
  const [cityQuery, setCityQuery] = useState(store.city || "");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDropdownRef = useRef(null);
  const [showOtherLangSearch, setShowOtherLangSearch] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [addChannelSheet, setAddChannelSheet] = useState(null); // platform key or null
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioBrand, setPortfolioBrand] = useState("");
  const [portfolioYear, setPortfolioYear] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.user_id) store.loadSavedState(user.user_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  useEffect(() => {
    async function fetchTier() {
      const userId = user?.user_id || user?.id;
      if (!userId) return;
      try {
        const { data } = await supabase.from("creator_profiles").select("tier").eq("user_id", userId).single();
        if (data?.tier) setCreatorTier(data.tier);
      } catch (e) {}
    }
    fetchTier();
  }, [user]);

  // Sync cityQuery when store.city updates
  useEffect(() => {
    if (store.city && (!cityQuery || cityQuery !== store.city)) {
      setCityQuery(store.city);
    }
  }, [store.city]);

  // Click outside to dismiss city dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Universal City Search: searchLocations local + /api/locations/search debounced
  useEffect(() => {
    const q = (cityQuery || "").trim();
    if (!q) {
      setCitySuggestions(searchLocations("", 8));
      return;
    }
    const localMatches = searchLocations(q, 10);
    setCitySuggestions(localMatches);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const combined = [...localMatches];
            data.forEach((item) => {
              if (item && item.name && !combined.some((c) => safeLower(c.name) === safeLower(item.name))) {
                combined.push(item);
              }
            });
            setCitySuggestions(combined.slice(0, 15));
          }
        }
      } catch (e) {}
    }, 80);

    return () => clearTimeout(timer);
  }, [cityQuery]);

  if (!(user?.verified || user?.email_verified)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <PreStep_EmailVerify user={user} />
        </div>
      </div>
    );
  }

  const autosave = async () => {
    const s = store;
    const payload = {
      full_name: s.fullName,
      date_of_birth: s.dobDay && s.dobMonth && s.dobYear ? `${s.dobYear}-${s.dobMonth}-${s.dobDay}` : undefined,
      bio: s.bio,
      primary_niche: s.primaryNiche,
      gender: s.gender,
      city: s.city,
      state: s.state,
      pincode: s.pinCode,
      languages: s.languages,
      instagram_handle: s.instagramHandle,
      follower_count: s.followerCount,
      ig_followers: s.followerCount,
      average_reach: s.instagramAvgReach,
      avg_likes_30d: s.instagramAvgLikes,
      avg_comments_30d: s.instagramAvgComments,
      instagram_verified: s.instagramVerified,
      instagram_connected_via: s.instagramConnectedVia,
      youtube_channel_url: s.youtubeChannelUrl,
      youtube_subscribers: s.youtubeSubscribers,
      youtube_avg_views: s.youtubeAvgViews,
      youtube_connected: s.youtubeConnected,
      other_platforms: s.otherPlatforms,
      reel_rate: s.reelRate,
      story_rate: s.storyRate,
      youtube_video_rate: s.youtubeVideoRate,
      barter_mode: s.barterMode,
    };
    try {
      await saveCreatorProfileStep(user.user_id, payload);
    } catch (e) {
      console.warn("[mobile onboarding] autosave failed:", e);
    }
  };

  const goNext = async (next) => {
    setSaving(true);
    await autosave();
    setSaving(false);
    setScreen(next);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadProfilePhoto(user.user_id, file);
    if (url) {
      store.updateField("photoUrl", url);
      toast.success("Photo uploaded!");
    } else {
      toast.error("Failed to upload photo.");
    }
  };

  const handlePinCode = async (val) => {
    store.updateField("pinCode", val);
    if (val.length === 6) {
      const details = await fetchPinCodeDetails(val);
      if (details) {
        if (!store.city || store.city.trim() === "") store.updateField("city", details.city);
        if (!store.state || store.state.trim() === "") store.updateField("state", details.state);
      }
    }
  };

  const toggleLanguage = (lang) => {
    const has = store.languages.includes(lang);
    store.updateField("languages", has ? store.languages.filter((l) => l !== lang) : [...store.languages, lang]);
  };

  const addCustomLanguage = (lang) => {
    const trimmed = lang.trim();
    if (!trimmed) return;
    if (!store.languages.includes(trimmed)) {
      store.updateField("languages", [...store.languages, trimmed]);
    }
    setLangSearch("");
    setShowOtherLangSearch(false);
  };

  const saveInstagramDetails = async () => {
    if (!store.instagramHandle.trim()) {
      toast.error("Please enter your Instagram handle.");
      return;
    }
    if (!store.followerCount) {
      toast.error("Please enter your follower count.");
      return;
    }
    store.updateField("instagramConnectedVia", "manual");
    store.updateField("instagramVerified", false);
    await goNext(7);
  };

  const finishAndSubmit = async (skipPortfolio) => {
    setSaving(true);
    try {
      if (!skipPortfolio && portfolioUrl.trim()) {
        try {
          new URL(portfolioUrl);
          const { error: insertError } = await supabase.from("creator_portfolio_items").insert({
            creator_id: user.user_id,
            content_url: portfolioUrl,
            description: portfolioDesc || portfolioBrand || "Portfolio Item",
            views: null,
            engagement_rate: null,
            created_at: new Date().toISOString(),
          });
          if (insertError) console.warn("[mobile onboarding] portfolio insert failed:", insertError);
        } catch (e) {
          toast.error("Please enter a valid URL, or skip this step.");
          setSaving(false);
          return;
        }
      }

      await autosave();

      const { count } = await supabase
        .from("creator_profiles")
        .select("*", { count: "exact", head: true })
        .eq("profile_status", "under_review");
      const estimatedHours = Math.max(24, (count ?? 0) * 2);

      try {
        await api.post("creators/profile", {
          onboarding_complete: true,
          profile_status: "under_review",
          review_eta_hours: estimatedHours,
        });
      } catch (e) {
        console.warn("[mobile onboarding] completion API notice:", e);
      }

      await supabase
        .from("creator_profiles")
        .update({ profile_status: "under_review", onboarding_complete: true, submitted_at: new Date().toISOString() })
        .eq("user_id", user.user_id);

      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "system",
        title: "Profile Submitted!",
        message: `Your creator profile is under review. Estimated review time: ${estimatedHours}–${estimatedHours + 12} hours.`,
        created_at: new Date().toISOString(),
      });

      store.clearState(user.user_id);

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 }, colors: ["#7C3AED", "#059669", "#F5C08A"] });
      setScreen(11);
    } catch (err) {
      console.error("[mobile onboarding] finish failed:", err);
      toast.error("Something went wrong. Please try again.");
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

  const filteredAdditionalLangs = ADDITIONAL_LANGUAGES.filter(
    (l) => !store.languages.includes(l) && (!langSearch || l.toLowerCase().includes(langSearch.toLowerCase()))
  );

  return (
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden", background: "#F2F2F7", fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      {screen === 1 && (
        <>
          <MobileOnboardingHeader
            showStepLabel={false}
            showTimeline={false}
            stepLabel="Profile · step 1 of 4"
            saveLabel="Save & exit"
            onSave={() => navigate("/dashboard")}
            onBack={() => navigate(-1)}
            filledSteps={1}
            preview={{ title: store.fullName || "Your name", subtitle: store.instagramHandle ? `@${store.instagramHandle}` : "" }}
          />
          <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>
              Create your creator profile
            </h2>
            <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>
              Set up your identity so brands can discover you.
            </p>

            {/* Centered Profile Picture Circle */}
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  background: "#F5F0FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px -4px rgba(124, 58, 237, 0.2)",
                  border: store.photoUrl ? "2.5px solid #7C3AED" : "2px dashed #C4B5FD",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: 44, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {store.photoUrl ? (
                    <img src={store.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Camera size={30} color="#7C3AED" />
                  )}
                </div>
                <div style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: "#7C3AED",
                  border: "2.5px solid #F2F2F7",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                }}>
                  <Plus size={15} color="#fff" strokeWidth={3} />
                </div>
              </div>
              <div style={{ marginTop: 10, font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>Add a profile photo</div>
              <div style={{ marginTop: 3, font: "400 12px/1.4 'DM Sans',sans-serif", color: "#6B7280" }}>
                A photo lifts brand click-through by 140%
              </div>
            </div>

            <MobileFieldLabel>Display name</MobileFieldLabel>
            <MobileTextInput value={store.fullName} onChange={(v) => store.updateField("fullName", v)} placeholder="Your name" />

            <MobileFieldLabel>Instagram handle</MobileFieldLabel>
            <MobileTextInput value={store.instagramHandle} onChange={(v) => store.updateField("instagramHandle", v)} placeholder="your_handle" prefix="@" />

            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={!store.fullName.trim() || saving} onClick={() => goNext(2)}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Next"}
              </MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 2 && (
        <>
          <MobileOnboardingHeader
            stepLabel="Profile · step 1 of 4"
            saveLabel="Save & exit"
            onSave={() => navigate("/dashboard")}
            filledSteps={1}
            onBack={() => setScreen(1)}
            preview={{ title: store.fullName, subtitle: store.primaryNiche[0] }}
          />
          <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>A little about you</h2>
            <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>
              Age decides which campaigns you can be matched to — never shown publicly.
            </p>

            <MobileFieldLabel>Date of birth</MobileFieldLabel>
            {/* DOB Inputs: clean 3-col grid, compact, fits 100% of mobile screen */}
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 8, width: "100%", boxSizing: "border-box" }}>
              <div style={{ minWidth: 0 }}>
                <input
                  value={store.dobDay}
                  onChange={(e) => store.updateField("dobDay", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="DD"
                  inputMode="numeric"
                  maxLength={2}
                  style={inputBoxStyle}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <input
                  value={store.dobMonth}
                  onChange={(e) => store.updateField("dobMonth", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="MM"
                  inputMode="numeric"
                  maxLength={2}
                  style={inputBoxStyle}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <input
                  value={store.dobYear}
                  onChange={(e) => store.updateField("dobYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="YYYY"
                  inputMode="numeric"
                  maxLength={4}
                  style={inputBoxStyle}
                />
              </div>
            </div>

            <MobileFieldLabel>Gender identity</MobileFieldLabel>
            <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Female", "Male", "Other"].map((g) => (
                <MobileChip key={g} label={g} selected={store.gender === g} onClick={() => store.updateField("gender", g)} />
              ))}
            </div>

            <div className="relative z-20 mt-4">
              <UniversalTagSearch
                label="Your content category *"
                selectedTags={Array.isArray(store.primaryNiche) ? store.primaryNiche : store.primaryNiche ? [store.primaryNiche] : []}
                onChange={(newTags) => {
                  store.updateField("primaryNiche", newTags);
                }}
                type="niche"
                placeholder="Search categories... (e.g. Fashion, Self-care)"
              />
            </div>

            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton 
                disabled={saving || (!store.primaryNiche || store.primaryNiche.length === 0)} 
                onClick={() => goNext(3)}
              >
                Next
              </MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 3 && (
        <>
          <MobileOnboardingHeader
            stepLabel="Demographics · step 2 of 4"
            onSave={() => goNext(3)}
            filledSteps={2}
            onBack={() => setScreen(2)}
            preview={{ title: store.fullName, subtitle: store.primaryNiche[0] }}
          />
          <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Where do you create from?</h2>
            <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Brands search city-first for local campaigns.</p>

            {/* City & State FIRST (on top) with Universal Search Dropdown */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", boxSizing: "border-box", position: "relative" }}>
              <div style={{ minWidth: 0, position: "relative" }} ref={cityDropdownRef}>
                <MobileFieldLabel>City</MobileFieldLabel>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      store.updateField("city", e.target.value);
                      setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    placeholder="e.g. Mumbai"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      height: 48,
                      borderRadius: 12,
                      background: "#fff",
                      border: "1px solid #E5E5EA",
                      padding: "0 12px",
                      font: "500 14px 'DM Sans',sans-serif",
                      color: "#0A0A0A",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  {showCityDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      width: "210%",
                      maxWidth: 290,
                      maxHeight: 220,
                      overflowY: "auto",
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #E5E5EA",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
                      zIndex: 50,
                      padding: 4
                    }}>
                      {citySuggestions.map((loc, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            store.updateField("city", loc.name);
                            if (loc.state) store.updateField("state", loc.state);
                            else if (loc.type === "State") store.updateField("state", loc.name);
                            setCityQuery(loc.name);
                            setShowCityDropdown(false);
                          }}
                          style={{
                            padding: "9px 11px",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F4F5")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                            <MapPin size={13} color="#7C3AED" style={{ flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ font: "600 13px 'DM Sans',sans-serif", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {loc.name}
                              </div>
                              {loc.state && loc.state !== loc.name && (
                                <div style={{ font: "400 11px 'DM Sans',sans-serif", color: "#6B7280" }}>
                                  {loc.state}
                                </div>
                              )}
                            </div>
                          </div>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 5,
                            background: "#F3E8FF",
                            color: "#7C3AED",
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            flexShrink: 0
                          }}>
                            {loc.type || "City"}
                          </span>
                        </div>
                      ))}

                      {cityQuery.trim() && !citySuggestions.some((c) => safeLower(c.name) === cityQuery.trim().toLowerCase()) && (
                        <div
                          onClick={() => {
                            store.updateField("city", cityQuery.trim());
                            setShowCityDropdown(false);
                          }}
                          style={{
                            padding: "9px 11px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: "#FAF5FF",
                            borderTop: "1px solid #F3E8FF",
                            display: "flex",
                            alignItems: "center",
                            gap: 7
                          }}
                        >
                          <Plus size={13} color="#7C3AED" />
                          <span style={{ font: "600 12.5px 'DM Sans',sans-serif", color: "#7C3AED" }}>
                            Use "{cityQuery.trim()}" as City
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <MobileFieldLabel>State</MobileFieldLabel>
                <MobileTextInput value={store.state} onChange={(v) => store.updateField("state", v)} placeholder="e.g. Maharashtra" />
              </div>
            </div>

            {/* PIN code SECOND (below) */}
            <div style={{ marginTop: 6, width: "100%", boxSizing: "border-box" }}>
              <MobileFieldLabel right={store.pinCode.length === 6 ? "Auto-detects location" : undefined}>PIN code</MobileFieldLabel>
              <MobileTextInput value={store.pinCode} onChange={handlePinCode} placeholder="400001" inputMode="numeric" maxLength={6} />
            </div>

            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={saving} onClick={() => goNext(4)}>Next: languages</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {screen === 4 && (
        <>
          <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Demographics · step 2 of 4" onSave={() => goNext(4)} filledSteps={2} onBack={() => setScreen(3)} preview={{ title: store.fullName, subtitle: `${store.primaryNiche[0] || ""} · ${store.city}` }} />
          <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Which languages do you create in?</h2>
            <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Pick every language you create or speak content in.</p>

            <MobileFieldLabel right={`${store.languages.length} selected`}>Languages</MobileFieldLabel>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INDIAN_LANGUAGES.map((lang) => (
                <MobileChip key={lang} label={lang} selected={store.languages.includes(lang)} onClick={() => toggleLanguage(lang)} />
              ))}

              {/* Any custom selected languages */}
              {store.languages.filter((l) => !INDIAN_LANGUAGES.includes(l)).map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  style={{
                    height: 36, padding: "0 10px 0 13px", borderRadius: 10, cursor: "pointer",
                    background: "#F5F0FF", border: "1.5px solid #7C3AED",
                    display: "flex", alignItems: "center", gap: 6,
                    font: "600 13px 'DM Sans',sans-serif", color: "#7C3AED"
                  }}
                >
                  <span>{lang}</span>
                  <X size={13} color="#7C3AED" strokeWidth={2.6} />
                </button>
              ))}

              {/* "Other" trigger chip */}
              <button
                onClick={() => setShowOtherLangSearch(!showOtherLangSearch)}
                style={{
                  height: 36, padding: "0 13px", borderRadius: 10, cursor: "pointer",
                  background: showOtherLangSearch ? "#7C3AED" : "#fff",
                  border: showOtherLangSearch ? "1px solid #7C3AED" : "1.5px dashed #A78BFA",
                  font: "600 13px 'DM Sans',sans-serif",
                  color: showOtherLangSearch ? "#fff" : "#7C3AED",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s ease"
                }}
              >
                <Plus size={14} color={showOtherLangSearch ? "#fff" : "#7C3AED"} strokeWidth={2.6} />
                <span>Other</span>
              </button>
            </div>

            {/* Other language search panel */}
            {showOtherLangSearch && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: "#fff", border: "1px solid #E5E5EA", boxShadow: "0 4px 14px rgba(124,58,237,0.06)", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Search size={16} color="#7C3AED" />
                  <input
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && langSearch.trim()) {
                        addCustomLanguage(langSearch.trim());
                      }
                    }}
                    placeholder="Search or type language (e.g. Bhojpuri, French)..."
                    style={{ flex: 1, border: "none", outline: "none", font: "400 13.5px 'DM Sans',sans-serif", color: "#0A0A0A", minWidth: 0 }}
                    autoFocus
                  />
                  {langSearch.trim() ? (
                    <button
                      onClick={() => addCustomLanguage(langSearch.trim())}
                      style={{ padding: "6px 12px", borderRadius: 8, background: "#7C3AED", border: "none", color: "#fff", font: "600 12px 'DM Sans',sans-serif", cursor: "pointer" }}
                    >
                      Add
                    </button>
                  ) : (
                    <button onClick={() => setShowOtherLangSearch(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <X size={16} color="#8E8E93" />
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 96, overflowY: "auto" }}>
                  {filteredAdditionalLangs.slice(0, 10).map((l) => (
                    <button
                      key={l}
                      onClick={() => addCustomLanguage(l)}
                      style={{
                        padding: "4px 10px", borderRadius: 8, background: "#F5F0FF", border: "1px solid #E2D6FF",
                        font: "500 12px 'DM Sans',sans-serif", color: "#6D28D9", cursor: "pointer"
                      }}
                    >
                      + {l}
                    </button>
                  ))}
                  {langSearch.trim() && !filteredAdditionalLangs.some((l) => l.toLowerCase() === langSearch.trim().toLowerCase()) && (
                    <button
                      onClick={() => addCustomLanguage(langSearch.trim())}
                      style={{
                        padding: "4px 10px", borderRadius: 8, background: "#ECFDF5", border: "1px solid #A7F3D0",
                        font: "500 12px 'DM Sans',sans-serif", color: "#047857", cursor: "pointer"
                      }}
                    >
                      + Add "{langSearch.trim()}"
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12, background: "#F5F0FF", borderLeft: "3px solid #7C3AED" }}>
              <div style={{ font: "500 12.5px/1.55 'DM Sans',sans-serif", color: "#5B21B6" }}>Regional-language creators get 40% more briefs — pick every language you actually post in.</div>
            </div>
            <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
              <MobilePrimaryButton disabled={store.languages.length === 0 || saving} onClick={() => goNext(5)}>Next: channels</MobilePrimaryButton>
            </div>
          </div>
        </>
      )}

      {(screen === 5 || screen === 6) && (
        <>
          <ChannelsHub store={store} onOpenInstagram={() => setScreen(6)} onOpenAddChannel={setAddChannelSheet} onNext={() => goNext(store.instagramConnectedVia ? 8 : 6)} onBack={() => setScreen(4)} saving={saving} />
          {screen === 6 && (
            <InstagramDetailsScreen store={store} onClose={() => setScreen(5)} onSave={saveInstagramDetails} saving={saving} />
          )}
        </>
      )}

      {screen === 7 && (
        <ChannelsLinkedScreen store={store} onOpenAddChannel={setAddChannelSheet} onNext={() => goNext(8)} saving={saving} />
      )}

      {screen === 8 && (
        <RateCardScreen store={store} creatorTier={creatorTier} onBack={() => setScreen(store.instagramConnectedVia ? 7 : 5)} onNext={() => goNext(9)} saving={saving} />
      )}

      {screen === 9 && (
        <BarterScreen store={store} onBack={() => setScreen(8)} onNext={() => goNext(10)} saving={saving} />
      )}

      {screen === 10 && (
        <PastWorkScreen
          portfolioUrl={portfolioUrl} setPortfolioUrl={setPortfolioUrl}
          portfolioBrand={portfolioBrand} setPortfolioBrand={setPortfolioBrand}
          portfolioYear={portfolioYear} setPortfolioYear={setPortfolioYear}
          portfolioDesc={portfolioDesc} setPortfolioDesc={setPortfolioDesc}
          onSubmit={() => finishAndSubmit(false)}
          onSkip={() => finishAndSubmit(true)}
          saving={saving}
        />
      )}

      {screen === 11 && <ProfileLiveScreen store={store} onFinish={handleFinalCTA} />}

      {addChannelSheet && (
        <AddChannelSheet
          platform={addChannelSheet}
          store={store}
          onClose={() => setAddChannelSheet(null)}
        />
      )}
    </div>
  );
}

const inputBoxStyle = {
  width: "100%", minWidth: 0, height: 44, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", textAlign: "center",
  font: "500 14px 'DM Sans',sans-serif", color: "#0A0A0A", outline: "none", boxSizing: "border-box"
};

function PlatformIcon({ platform }) {
  if (platform === "instagram") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5.5" ry="5.5" />
          <circle cx="12" cy="12" r="3.7" />
          <circle cx="17.5" cy="6.5" r="1.3" fill="#ffffff" stroke="none" />
        </svg>
      </div>
    );
  }
  if (platform === "youtube") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </div>
    );
  }
  if (platform === "snapchat") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "#FFFC00", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M12.016 2.016c-3.79 0-6.016 2.68-6.016 5.378 0 1.34.464 2.697 1.056 3.737.234.412.35.817.18 1.252-.164.418-.553.734-.954.99-.444.283-.93.54-1.282.975-.417.516-.277 1.233.284 1.487.892.404 1.836.567 2.766.744.303.058.46.257.38.56-.105.398-.678.855-1.168 1.08-.475.218-.94.492-.94 1.042 0 .584.58.91 1.09 1.025 1.58.356 3.23.238 4.79-.115.57-.13 1.15-.13 1.72 0 1.56.353 3.21.47 4.79.115.51-.115 1.09-.44 1.09-1.025 0-.55-.465-.824-.94-1.042-.49-.225-1.063-.682-1.168-1.08-.08-.303.077-.502.38-.56.93-.177 1.874-.34 2.766-.744.56-.254.7-.97.284-1.487-.352-.435-.838-.692-1.282-.975-.4-.256-.79-.572-.954-.99-.17-.435-.054-.84.18-1.252.592-1.04 1.056-2.397 1.056-3.737 0-2.698-2.226-5.378-6.016-5.378z" />
        </svg>
      </div>
    );
  }
  if (platform === "x") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
    );
  }
  if (platform === "facebook") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "#0866FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </div>
    );
  }
  if (platform === "threads") {
    return (
      <div style={{ width: "100%", height: "100%", borderRadius: 9, background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12.186 24C5.467 24 0 18.533 0 11.814 0 5.094 5.467 0 12.186 0c6.602 0 11.96 5.215 12.003 11.814 0 .393-.318.711-.711.711h-2.124a.711.711 0 0 1-.71-.678C20.407 6.903 16.71 3.556 12.186 3.556c-4.557 0-8.259 3.702-8.259 8.258s3.702 8.259 8.259 8.259c3.155 0 5.952-1.748 7.288-4.553.167-.35.584-.492.934-.325l1.898.903c.35.167.492.584.325.934C20.893 21.01 16.828 24 12.186 24zm2.842-14.757c-.287 0-.573.055-.841.164-1.282.524-2.164 1.769-2.164 3.197 0 1.848 1.488 3.336 3.336 3.336 1.428 0 2.673-.882 3.197-2.164.109-.268.164-.554.164-.841v-3.692h-3.692zm-.356 1.422h2.27v1.944a1.893 1.893 0 0 1-.581 1.362 1.895 1.895 0 0 1-1.363.582 1.916 1.916 0 0 1-1.914-1.914 1.916 1.916 0 0 1 1.588-1.974z" />
        </svg>
      </div>
    );
  }
  return null;
}

function ChannelsHub({ store, onOpenInstagram, onOpenAddChannel, onNext, onBack, saving }) {
  const platforms = [
    { key: "instagram", label: "Instagram", connected: !!store.instagramConnectedVia, required: true, onClick: onOpenInstagram },
    { key: "youtube", label: "YouTube", connected: store.youtubeConnected, onClick: () => onOpenAddChannel("youtube") },
    { key: "snapchat", label: "Snapchat", connected: !!store.otherPlatforms.snapchat, onClick: () => onOpenAddChannel("snapchat") },
    { key: "x", label: "X (Twitter)", connected: !!store.otherPlatforms.x, onClick: () => onOpenAddChannel("x") },
    { key: "facebook", label: "Facebook", connected: !!store.otherPlatforms.facebook, onClick: () => onOpenAddChannel("facebook") },
    { key: "threads", label: "Threads", connected: !!store.otherPlatforms.threads, onClick: () => onOpenAddChannel("threads") },
  ];
  return (
    <>
      <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Channels · step 3 of 4" onSave={onNext} filledSteps={3} onBack={onBack} preview={{ title: store.fullName, subtitle: `${store.primaryNiche[0] || ""} · ${store.city} · ${store.languages.join(", ")}` }} />
      <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Connect your channels</h2>
        <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Verified metrics get you into 3x more brand shortlists.</p>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
          {platforms.map((p) => (
            <div key={p.key} onClick={p.onClick} style={{ height: p.required ? 60 : 56, borderRadius: 12, background: "#fff", border: p.required ? "1.5px solid #7C3AED" : "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 12, padding: "0 15px", cursor: "pointer", boxSizing: "border-box" }}>
              <div style={{ width: p.required ? 34 : 32, height: p.required ? 34 : 32, flexShrink: 0 }}><PlatformIcon platform={p.key} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "600 14.5px/1.1 'DM Sans',sans-serif", color: "#0A0A0A" }}>{p.label}</div>
                {p.required && <div style={{ marginTop: 4, font: "600 11px/1.1 'DM Sans',sans-serif", color: p.connected ? "#059669" : "#7C3AED" }}>{p.connected ? "Connected" : "Required"}</div>}
              </div>
              <div style={{ height: p.required ? 32 : 30, padding: "0 13px", borderRadius: p.required ? 9 : 8, background: p.connected ? "#ECFDF5" : (p.required ? "#7C3AED" : "#F5F0FF"), display: "flex", alignItems: "center", font: "600 12px 'DM Sans',sans-serif", color: p.connected ? "#059669" : (p.required ? "#fff" : "#7C3AED"), flexShrink: 0 }}>
                {p.connected ? "Edit" : p.required ? "Open" : "Add"}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
          <MobilePrimaryButton disabled={saving} onClick={store.instagramConnectedVia ? onNext : onOpenInstagram}>
            {store.instagramConnectedVia ? "Next: rate card" : "Add Instagram"}
          </MobilePrimaryButton>
        </div>
      </div>
    </>
  );
}

function InstagramDetailsScreen({ store, onClose, onSave, saving }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(18,18,26,0.45)", backdropFilter: "blur(2px)" }}>
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: "100%", boxSizing: "border-box", background: "#fff", borderRadius: "24px 24px 0 0", boxShadow: "0 -18px 44px -26px rgba(18,18,26,.35)", padding: "12px 20px 28px", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ height: 5, width: 44, borderRadius: 3, background: "#E5E5EA", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, flexShrink: 0 }}><PlatformIcon platform="instagram" /></div>
          <div style={{ flex: 1, font: "600 17px 'DM Sans',sans-serif", letterSpacing: "-.3px", color: "#0A0A0A" }}>Instagram details</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 15, background: "#F2F2F7", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color="#0A0A0A" strokeWidth={2.4} />
          </button>
        </div>

        <MobileFieldLabel>Handle or profile link</MobileFieldLabel>
        <MobileTextInput value={store.instagramHandle} onChange={(v) => store.updateField("instagramHandle", v)} placeholder="@yourhandle" />

        {/* 2-Column Responsive Grid with minWidth: 0 */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", boxSizing: "border-box" }}>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Followers</MobileFieldLabel>
            <MobileTextInput value={String(store.followerCount || "")} onChange={(v) => store.updateField("followerCount", v.replace(/\D/g, ""))} placeholder="83,900" inputMode="numeric" />
          </div>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Avg reach (30d)</MobileFieldLabel>
            <MobileTextInput value={String(store.instagramAvgReach || "")} onChange={(v) => store.updateField("instagramAvgReach", v.replace(/\D/g, ""))} placeholder="8,500" inputMode="numeric" />
          </div>
        </div>

        {/* 2-Column Responsive Grid with minWidth: 0 */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", boxSizing: "border-box" }}>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Avg likes</MobileFieldLabel>
            <MobileTextInput value={String(store.instagramAvgLikes || "")} onChange={(v) => store.updateField("instagramAvgLikes", v.replace(/\D/g, ""))} placeholder="1,200" inputMode="numeric" />
          </div>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Avg comments</MobileFieldLabel>
            <MobileTextInput value={String(store.instagramAvgComments || "")} onChange={(v) => store.updateField("instagramAvgComments", v.replace(/\D/g, ""))} placeholder="85" inputMode="numeric" />
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8, padding: "11px 13px", borderRadius: 12, background: "#FFFBEB", border: "1px solid #FEF3C7" }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "#D97706", flexShrink: 0, marginTop: 5 }} />
          <div style={{ font: "400 12px/1.5 'DM Sans',sans-serif", color: "#92400E" }}>
            Shown as <strong>pending verification</strong> until we match these numbers with your profile.
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <MobilePrimaryButton disabled={saving} onClick={onSave}>Save Instagram details</MobilePrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ChannelsLinkedScreen({ store, onOpenAddChannel, onNext, saving }) {
  const others = [
    { key: "youtube", label: "YouTube", connected: store.youtubeConnected },
    { key: "snapchat", label: "Snapchat", connected: !!store.otherPlatforms.snapchat },
    { key: "x", label: "X (Twitter)", connected: !!store.otherPlatforms.x },
    { key: "facebook", label: "Facebook", connected: !!store.otherPlatforms.facebook },
  ];
  return (
    <>
      <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Channels · step 3 of 4" onSave={onNext} filledSteps={3} preview={{ title: store.fullName, subtitle: `${fmtK(store.followerCount)} followers · ${fmtK(store.instagramAvgReach)} reach` }} />
      <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Instagram verified</h2>
        <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Add more channels to widen the briefs you receive.</p>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ height: 60, borderRadius: 12, background: "#ECFDF5", border: "1px solid #C7EFDD", display: "flex", alignItems: "center", gap: 12, padding: "0 15px", boxSizing: "border-box" }}>
            <div style={{ width: 34, height: 34, flexShrink: 0 }}><PlatformIcon platform="instagram" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "600 14.5px/1.1 'DM Sans',sans-serif", color: "#0A0A0A" }}>Instagram</div>
              <div style={{ marginTop: 4, font: "500 11.5px/1.1 'DM Sans',sans-serif", color: "#059669" }}>@{store.instagramHandle} · {fmtK(store.followerCount)} followers</div>
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Check size={13} color="#fff" strokeWidth={3.2} />
            </div>
          </div>
          {others.map((p) => (
            <div key={p.key} onClick={() => onOpenAddChannel(p.key)} style={{ height: 56, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", display: "flex", alignItems: "center", gap: 12, padding: "0 15px", cursor: "pointer", boxSizing: "border-box" }}>
              <div style={{ width: 32, height: 32, flexShrink: 0 }}><PlatformIcon platform={p.key} /></div>
              <div style={{ flex: 1, font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{p.label}</div>
              <div style={{ height: 30, padding: "0 13px", borderRadius: 8, background: "#F5F0FF", display: "flex", alignItems: "center", font: "600 12px 'DM Sans',sans-serif", color: "#7C3AED", flexShrink: 0 }}>{p.connected ? "Edit" : "Add"}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", paddingBottom: 12, paddingTop: 20 }}>
          <MobilePrimaryButton disabled={saving} onClick={onNext}>Next: rate card</MobilePrimaryButton>
        </div>
        <div style={{ marginBottom: 20, textAlign: "center", font: "500 13px 'DM Sans',sans-serif", color: "#6B7280" }}>Add the rest later</div>
      </div>
    </>
  );
}

const BENCHMARKS = { Bronze: 500, Silver: 1500, Gold: 5000, Platinum: 15000 };

function getRateFeedback({ rate, reach, tier, type = "reel" }) {
  const numRate = parseInt(String(rate || "").replace(/[^0-9]/g, ""), 10);
  if (!numRate) return null;

  let parsedReach = 0;
  const s = String(reach || "").trim().toLowerCase();
  if (/^[\d.]+k$/.test(s) || /([\d.]+)\s*k/.test(s)) {
    const match = s.match(/([\d.]+)\s*k/);
    parsedReach = Math.round(parseFloat(match ? match[1] : s) * 1000);
  } else if (/^[\d.]+m$/.test(s) || /([\d.]+)\s*m/.test(s)) {
    const match = s.match(/([\d.]+)\s*m/);
    parsedReach = Math.round(parseFloat(match ? match[1] : s) * 1000000);
  } else {
    parsedReach = parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
  }

  const tierBase = BENCHMARKS[tier] || 500;
  let benchmark = 0;

  if (type === "reel") {
    const reachBased = parsedReach > 0 ? parsedReach * 0.30 : 0;
    benchmark = Math.max(tierBase, reachBased);
  } else if (type === "story") {
    const reachBased = parsedReach > 0 ? parsedReach * 0.12 : 0;
    benchmark = Math.max(Math.round(tierBase * 0.4), reachBased);
  } else if (type === "youtube") {
    const reachBased = parsedReach > 0 ? parsedReach * 0.60 : 0;
    benchmark = Math.max(tierBase * 2, reachBased);
  }

  const fairRate = Math.round(benchmark);
  const ratio = numRate / fairRate;

  if (ratio > 1.6) {
    return {
      type: "warning",
      fairRate,
      message: `Heads up! ₹${numRate.toLocaleString("en-IN")} is significantly higher than the standard market rate (approx. ₹${fairRate.toLocaleString("en-IN")}) for ${parsedReach > 0 ? `${fmtK(parsedReach)} reach` : `${tier} tier`}. Brands may decline or ask to negotiate.`
    };
  } else if (ratio > 1.25) {
    return {
      type: "caution",
      fairRate,
      message: `A bit high: ₹${numRate.toLocaleString("en-IN")} is above the average market rate of ₹${fairRate.toLocaleString("en-IN")}. Brands may negotiate.`
    };
  } else if (ratio < 0.35 && numRate < fairRate) {
    return {
      type: "info",
      fairRate,
      message: `Pricing tip: Market rate for your reach is around ₹${fairRate.toLocaleString("en-IN")}. You have room to quote higher!`
    };
  } else {
    return {
      type: "success",
      fairRate,
      message: `Competitive rate: ₹${numRate.toLocaleString("en-IN")} matches market benchmarks for your reach.`
    };
  }
}

function RateCardScreen({ store, creatorTier, onBack, onNext, saving }) {
  const suggested = BENCHMARKS[creatorTier] ?? 500;
  const suggestedStory = Math.round(suggested * 0.4);
  const suggestedYt = suggested * 2;
  const canProceed = store.reelRate !== "" && store.storyRate !== "" && (!store.youtubeConnected || store.youtubeVideoRate !== "");

  const effectiveReach = store.instagramAvgReach || (store.followerCount ? Math.round(store.followerCount * 0.1) : 0);
  const reelFeedback = getRateFeedback({ rate: store.reelRate, reach: effectiveReach, tier: creatorTier, type: "reel" });
  const storyFeedback = getRateFeedback({ rate: store.storyRate, reach: effectiveReach, tier: creatorTier, type: "story" });
  const ytFeedback = store.youtubeConnected ? getRateFeedback({ rate: store.youtubeVideoRate, reach: store.youtubeAvgViews, tier: creatorTier, type: "youtube" }) : null;

  return (
    <>
      <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Rate card · step 4 of 4" onSave={onNext} filledSteps={4} onBack={onBack} preview={{ title: store.fullName, subtitle: `${store.primaryNiche[0] || ""} · ${store.city} · ${fmtK(store.followerCount)}` }} />
      <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Set your rates</h2>
        <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Brands pay exactly what you list — no hidden cuts.</p>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA" }}>
          <div style={{ height: 22, padding: "0 9px", borderRadius: 7, background: "#FFF7E8", display: "flex", alignItems: "center", font: "600 10px 'DM Sans',sans-serif", letterSpacing: ".5px", textTransform: "uppercase", color: "#92400E", flexShrink: 0 }}>{creatorTier}</div>
          <div style={{ flex: 1, font: "400 12px/1.45 'DM Sans',sans-serif", color: "#6B7280" }}>Suggestions are based on your {fmtK(store.followerCount)} followers and {fmtK(store.instagramAvgReach)} avg reach.</div>
        </div>

        {/* Reel Rate */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <MobileFieldLabel>Instagram reel</MobileFieldLabel>
            <button
              type="button"
              onClick={() => store.updateField("reelRate", String(reelFeedback?.fairRate || suggested))}
              style={{ background: "none", border: "none", color: "#7C3AED", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
            >
              Suggested ₹{(reelFeedback?.fairRate || suggested).toLocaleString("en-IN")}
            </button>
          </div>
          <MobileTextInput value={String(store.reelRate)} onChange={(v) => store.updateField("reelRate", v.replace(/\D/g, ""))} placeholder={String(suggested)} prefix="₹" inputMode="numeric" />
          
          {reelFeedback && (
            <div style={{
              marginTop: 6,
              padding: "9px 12px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.45,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              background: reelFeedback.type === "warning" ? "#FFFBEB" : reelFeedback.type === "caution" ? "#FFF7ED" : reelFeedback.type === "success" ? "#F0FDF4" : "#F5F3FF",
              border: `1px solid ${reelFeedback.type === "warning" ? "#FDE68A" : reelFeedback.type === "caution" ? "#FED7AA" : reelFeedback.type === "success" ? "#BBF7D0" : "#DDD6FE"}`,
              color: reelFeedback.type === "warning" ? "#92400E" : reelFeedback.type === "caution" ? "#9A3412" : reelFeedback.type === "success" ? "#166534" : "#5B21B6"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                {reelFeedback.type === "warning" || reelFeedback.type === "caution" ? (
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <span style={{ fontWeight: 500 }}>{reelFeedback.message}</span>
              </div>
              {(reelFeedback.type === "warning" || reelFeedback.type === "caution") && (
                <button
                  type="button"
                  onClick={() => store.updateField("reelRate", String(reelFeedback.fairRate))}
                  style={{
                    alignSelf: "flex-start",
                    background: "#fff",
                    border: "1px solid #F59E0B",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#B45309",
                    cursor: "pointer",
                    marginTop: 2
                  }}
                >
                  Apply suggested: ₹{formatAmount(reelFeedback.fairRate)}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Story Rate */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <MobileFieldLabel>Instagram story</MobileFieldLabel>
            <button
              type="button"
              onClick={() => store.updateField("storyRate", String(storyFeedback?.fairRate || suggestedStory))}
              style={{ background: "none", border: "none", color: "#7C3AED", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
            >
              Suggested ₹{(storyFeedback?.fairRate || suggestedStory).toLocaleString("en-IN")}
            </button>
          </div>
          <MobileTextInput value={String(store.storyRate)} onChange={(v) => store.updateField("storyRate", v.replace(/\D/g, ""))} placeholder={String(suggestedStory)} prefix="₹" inputMode="numeric" />

          {storyFeedback && (
            <div style={{
              marginTop: 6,
              padding: "9px 12px",
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.45,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              background: storyFeedback.type === "warning" ? "#FFFBEB" : storyFeedback.type === "caution" ? "#FFF7ED" : storyFeedback.type === "success" ? "#F0FDF4" : "#F5F3FF",
              border: `1px solid ${storyFeedback.type === "warning" ? "#FDE68A" : storyFeedback.type === "caution" ? "#FED7AA" : storyFeedback.type === "success" ? "#BBF7D0" : "#DDD6FE"}`,
              color: storyFeedback.type === "warning" ? "#92400E" : storyFeedback.type === "caution" ? "#9A3412" : storyFeedback.type === "success" ? "#166534" : "#5B21B6"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                {storyFeedback.type === "warning" || storyFeedback.type === "caution" ? (
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <span style={{ fontWeight: 500 }}>{storyFeedback.message}</span>
              </div>
              {(storyFeedback.type === "warning" || storyFeedback.type === "caution") && (
                <button
                  type="button"
                  onClick={() => store.updateField("storyRate", String(storyFeedback.fairRate))}
                  style={{
                    alignSelf: "flex-start",
                    background: "#fff",
                    border: "1px solid #F59E0B",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#B45309",
                    cursor: "pointer",
                    marginTop: 2
                  }}
                >
                  Apply suggested: ₹{formatAmount(storyFeedback.fairRate)}
                </button>
              )}
            </div>
          )}
        </div>

        {/* YouTube Video Rate */}
        {store.youtubeConnected && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <MobileFieldLabel>YouTube video</MobileFieldLabel>
              <button
                type="button"
                onClick={() => store.updateField("youtubeVideoRate", String(ytFeedback?.fairRate || suggestedYt))}
                style={{ background: "none", border: "none", color: "#7C3AED", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
              >
                Suggested ₹{(ytFeedback?.fairRate || suggestedYt).toLocaleString("en-IN")}
              </button>
            </div>
            <MobileTextInput value={String(store.youtubeVideoRate)} onChange={(v) => store.updateField("youtubeVideoRate", v.replace(/\D/g, ""))} placeholder={String(suggestedYt)} prefix="₹" inputMode="numeric" />

            {ytFeedback && (
              <div style={{
                marginTop: 6,
                padding: "9px 12px",
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.45,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                background: ytFeedback.type === "warning" ? "#FFFBEB" : ytFeedback.type === "caution" ? "#FFF7ED" : ytFeedback.type === "success" ? "#F0FDF4" : "#F5F3FF",
                border: `1px solid ${ytFeedback.type === "warning" ? "#FDE68A" : ytFeedback.type === "caution" ? "#FED7AA" : ytFeedback.type === "success" ? "#BBF7D0" : "#DDD6FE"}`,
                color: ytFeedback.type === "warning" ? "#92400E" : ytFeedback.type === "caution" ? "#9A3412" : ytFeedback.type === "success" ? "#166534" : "#5B21B6"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  {ytFeedback.type === "warning" || ytFeedback.type === "caution" ? (
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <span style={{ fontWeight: 500 }}>{ytFeedback.message}</span>
                </div>
                {(ytFeedback.type === "warning" || ytFeedback.type === "caution") && (
                  <button
                    type="button"
                    onClick={() => store.updateField("youtubeVideoRate", String(ytFeedback.fairRate))}
                    style={{
                      alignSelf: "flex-start",
                      background: "#fff",
                      border: "1px solid #F59E0B",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#B45309",
                      cursor: "pointer",
                      marginTop: 2
                    }}
                  >
                    Apply suggested: ₹{formatAmount(ytFeedback.fairRate)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingBottom: 14, paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Shield size={14} color="#6B7280" />
          <div style={{ font: "500 12px 'DM Sans',sans-serif", color: "#6B7280" }}>Only brands you accept can see your rates</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <MobilePrimaryButton disabled={!canProceed || saving} onClick={onNext}>Next</MobilePrimaryButton>
        </div>
      </div>
    </>
  );
}

const BARTER_OPTIONS = [
  { key: "cash_only", title: "Cash only", desc: "I only accept monetary payment for my content." },
  { key: "partial_barter", title: "Partial barter", desc: "A mix of cash and product works for me." },
  { key: "barter_friendly", title: "Barter friendly", desc: "Open to product or value exchange instead of cash." },
];

function BarterScreen({ store, onBack, onNext, saving }) {
  return (
    <>
      <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Rate card · step 4 of 4" onSave={onNext} filledSteps={4} onBack={onBack} />
      <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>How do you like to be paid?</h2>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
          {BARTER_OPTIONS.map((opt) => {
            const selected = store.barterMode === opt.key;
            return (
              <div key={opt.key} onClick={() => store.updateField("barterMode", opt.key)} style={{ padding: "13px 15px", borderRadius: 12, background: selected ? "#F5F0FF" : "#fff", border: selected ? "1.5px solid #7C3AED" : "1px solid #E5E5EA", display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer", boxSizing: "border-box" }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: selected ? "#7C3AED" : "transparent", border: selected ? "none" : "1.5px solid #D6D6DC", boxSizing: "border-box", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selected && <Check size={11} color="#fff" strokeWidth={3.4} />}
                </div>
                <div>
                  <div style={{ font: "600 14px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{opt.title}</div>
                  <div style={{ marginTop: 4, font: "400 12.5px/1.5 'DM Sans',sans-serif", color: "#6B7280" }}>{opt.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#ECFDF5", border: "1px solid #C7EFDD", display: "flex", gap: 12, boxSizing: "border-box" }}>
          <Shield size={19} color="#059669" strokeWidth={1.9} />
          <div>
            <div style={{ font: "600 12.5px 'DM Sans',sans-serif", color: "#059669" }}>Escrow-protected payouts</div>
            <div style={{ marginTop: 5, font: "500 12.5px/1.55 'DM Sans',sans-serif", color: "#047857" }}>Brand money sits in neutral escrow before you start — released when you deliver.</div>
          </div>
        </div>
        <div style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 20 }}>
          <MobilePrimaryButton disabled={saving} onClick={onNext}>Next</MobilePrimaryButton>
        </div>
      </div>
    </>
  );
}

function PastWorkScreen({ portfolioUrl, setPortfolioUrl, portfolioBrand, setPortfolioBrand, portfolioYear, setPortfolioYear, portfolioDesc, setPortfolioDesc, onSubmit, onSkip, saving }) {
  return (
    <>
      <MobileOnboardingHeader showStepLabel={false} showTimeline={false} stepLabel="Last step" saveLabel="Skip" onSave={onSkip} filledSteps={4} />
      <div style={{ flex: 1, padding: "20px 18px 0", display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: 0, font: "600 23px/1.28 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A" }}>Show one piece of past work</h2>
        <p style={{ margin: "8px 0 0", font: "400 13.5px/1.6 'DM Sans',sans-serif", color: "#6B7280" }}>Optional, but profiles with a sample get shortlisted twice as often.</p>
        <MobileFieldLabel>Content link</MobileFieldLabel>
        <MobileTextInput value={portfolioUrl} onChange={setPortfolioUrl} placeholder="Paste a reel or video link" />
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", boxSizing: "border-box" }}>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Brand</MobileFieldLabel>
            <MobileTextInput value={portfolioBrand} onChange={setPortfolioBrand} placeholder="e.g. boAt" />
          </div>
          <div style={{ minWidth: 0 }}>
            <MobileFieldLabel>Year</MobileFieldLabel>
            <MobileTextInput value={portfolioYear} onChange={setPortfolioYear} placeholder="2026" inputMode="numeric" maxLength={4} />
          </div>
        </div>
        <MobileFieldLabel>What was the brief?</MobileFieldLabel>
        <textarea
          value={portfolioDesc}
          onChange={(e) => setPortfolioDesc(e.target.value)}
          placeholder="One line about the campaign…"
          style={{ marginTop: 8, height: 86, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", padding: "12px 14px", font: "400 14px/1.55 'DM Sans',sans-serif", color: "#0A0A0A", resize: "none", boxSizing: "border-box", width: "100%" }}
        />
        <div style={{ marginTop: "auto", paddingBottom: 10, paddingTop: 20 }}>
          <MobilePrimaryButton disabled={saving} onClick={onSubmit} style={{ boxShadow: "0 14px 26px -20px rgba(124,58,237,.8)" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Submit profile"}
          </MobilePrimaryButton>
        </div>
        <button onClick={onSkip} disabled={saving} style={{ marginBottom: 24, height: 48, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", boxSizing: "border-box", font: "600 14.5px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer", width: "100%" }}>
          Skip — I'll add this later
        </button>
      </div>
    </>
  );
}

function ProfileLiveScreen({ store, onFinish }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 230, height: 310, borderRadius: 22, overflow: "hidden", position: "relative", background: "linear-gradient(160deg,#E8C9AE,#4A3326)", boxShadow: "0 24px 50px -28px rgba(18,18,26,.6)" }}>
          {store.photoUrl && <img src={store.photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,.78) 100%)" }} />
          <div style={{ position: "absolute", top: 12, right: 12, height: 26, padding: "0 11px", borderRadius: 13, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", gap: 5, font: "600 9.5px 'DM Sans',sans-serif", letterSpacing: ".7px", textTransform: "uppercase", color: "#FDE68A" }}>
            <Clock size={11} color="#FDE68A" /> In review
          </div>
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
            <div style={{ font: "700 19px/1.1 'DM Sans',sans-serif", letterSpacing: "-.5px", color: "#fff" }}>{store.fullName}</div>
            <div style={{ marginTop: 5, font: "500 12.5px 'DM Sans',sans-serif", color: "rgba(255,255,255,.82)" }}>
              <span style={{ fontWeight: 700, color: "#fff" }}>{fmtK(store.followerCount)}</span> followers
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ height: 24, padding: "0 10px", borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", font: "600 11px 'DM Sans',sans-serif", color: "#0A0A0A" }}>{store.primaryNiche[0] || "Creator"}</div>
                <div style={{ font: "500 11.5px 'DM Sans',sans-serif", color: "rgba(255,255,255,.82)" }}>{store.city}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ font: "700 17px/1 'DM Sans',sans-serif", letterSpacing: "-.4px", color: "#fff" }}>{fmtK(store.instagramAvgReach)}</div>
                <div style={{ marginTop: 3, font: "600 8.5px 'DM Sans',sans-serif", letterSpacing: ".8px", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>Average reach</div>
              </div>
            </div>
          </div>
        </div>

        <h2 style={{ margin: "20px 0 0", font: "600 22px/1.25 'DM Sans',sans-serif", letterSpacing: "-.7px", color: "#0A0A0A", textAlign: "center" }}>
          You'll be discoverable once verified
        </h2>
        <p style={{ margin: "8px 0 0", maxWidth: 310, font: "400 13px/1.55 'DM Sans',sans-serif", color: "#6B7280", textAlign: "center" }}>
          You are discoverable after we verify your Instagram handle and metrics (usually within 12–24 hrs). Brands in <strong style={{ color: "#111827", fontWeight: 600 }}>{store.primaryNiche[0] || "your niche"}</strong> will then be able to discover and book you directly at your listed rates.
        </p>

        <div style={{ marginTop: 14, width: "100%", maxWidth: 320, padding: "10px 14px", borderRadius: 12, background: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", alignItems: "center", gap: 10, boxSizing: "border-box" }}>
          <Clock size={16} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ font: "500 12px/1.4 'DM Sans',sans-serif", color: "#92400E" }}>
            Estimated review: <strong>12 to 24 hours</strong>. Complete KYC now so your escrow payouts won't be delayed.
          </div>
        </div>
      </div>
      <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
        <MobilePrimaryButton onClick={() => onFinish("/creator/kyc")}>
          <Shield size={16} color="#fff" /> Complete your KYC
        </MobilePrimaryButton>
        <div style={{ textAlign: "center", font: "400 12px 'DM Sans',sans-serif", color: "#6B7280" }}>Needed before your first payout — takes 2 minutes</div>
        <button onClick={() => onFinish("/explore")} style={{ height: 50, borderRadius: 12, background: "#fff", border: "1px solid #E5E5EA", boxSizing: "border-box", font: "600 15px 'DM Sans',sans-serif", color: "#0A0A0A", cursor: "pointer", width: "100%" }}>
          Browse open briefs
        </button>
      </div>
    </div>
  );
}

const PLATFORM_LABELS = { youtube: "YouTube", snapchat: "Snapchat", x: "X (Twitter)", facebook: "Facebook", threads: "Threads" };

function AddChannelSheet({ platform, store, onClose }) {
  const isYoutube = platform === "youtube";
  const [handle, setHandle] = useState(isYoutube ? store.youtubeChannelUrl : store.otherPlatforms[platform] || "");
  const [subs, setSubs] = useState(String(store.youtubeSubscribers || ""));

  const handleSave = () => {
    if (isYoutube) {
      store.updateField("youtubeChannelUrl", handle);
      store.updateField("youtubeSubscribers", subs.replace(/\D/g, ""));
      store.updateField("youtubeConnected", Boolean(handle.trim()));
      store.updateField("youtubeConnectedVia", "manual");
    } else {
      store.updateOtherPlatform(platform, handle);
    }
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "rgba(18,18,26,0.45)", backdropFilter: "blur(2px)" }}>
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "24px 24px 0 0", padding: "12px 20px 28px", boxShadow: "0 -18px 44px -26px rgba(18,18,26,.4)", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div style={{ height: 5, width: 44, borderRadius: 3, background: "#E5E5EA", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, flexShrink: 0 }}><PlatformIcon platform={platform} /></div>
            <div style={{ font: "600 17px 'DM Sans',sans-serif", letterSpacing: "-.3px", color: "#0A0A0A" }}>{PLATFORM_LABELS[platform]}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 14, background: "#F2F2F7", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#0A0A0A" strokeWidth={2.4} />
          </button>
        </div>
        <MobileFieldLabel>{isYoutube ? "Channel URL" : "Handle or profile link"}</MobileFieldLabel>
        <MobileTextInput value={handle} onChange={setHandle} placeholder={isYoutube ? "youtube.com/@yourchannel" : "@yourhandle"} />
        {isYoutube && (
          <div style={{ marginTop: 6, width: "100%", boxSizing: "border-box" }}>
            <MobileFieldLabel>Subscribers</MobileFieldLabel>
            <MobileTextInput value={subs} onChange={(v) => setSubs(v.replace(/\D/g, ""))} placeholder="10,000" inputMode="numeric" />
          </div>
        )}
        <div style={{ marginTop: 18 }}>
          <MobilePrimaryButton onClick={handleSave}>Save</MobilePrimaryButton>
        </div>
      </div>
    </div>
  );
}
