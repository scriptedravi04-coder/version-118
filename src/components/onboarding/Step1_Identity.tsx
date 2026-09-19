import React, { useState, useRef } from "react";
import { safeLower } from "../../utils/safeFormat";
import { t } from "@/lib/typography";
import { Camera, Loader2, AlertCircle, X, ArrowLeft, Plus, Check } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { uploadProfilePhoto } from "../../api/onboarding";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import UniversalTagSearch from "../shared/UniversalTagSearch";

import { VALID_NICHES as CATEGORIES } from "../../lib/constants";

export default function Step1_Identity({ user }: { user: any }) {
  const {
    fullName,
    instagramHandle,
    dobDay,
    dobMonth,
    dobYear,
    photoUrl,
    bio,
    primaryNiche,
    gender,
    step1SubStep: subStep,
    setStep1SubStep: setSubStep,
    updateField,
    nextStep,
  } = useOnboardingStore();

  const [nicheSearch, setNicheSearch] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showNicheDropdown, setShowNicheDropdown] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDobGenderPanel, setShowDobGenderPanel] = useState(false);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const mobileDayRef = useRef<HTMLInputElement>(null);
  const mobileMonthRef = useRef<HTMLInputElement>(null);
  const mobileYearRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Step A: Immediately generate a local object URL for instant preview
    const localUrl = URL.createObjectURL(file);
    updateField("photoUrl", localUrl);
    setFieldErrors((p) => ({ ...p, photoUrl: "" }));

    setUploadingImage(true);
    const userId = user?.user_id || user?.id || "anonymous";

    try {
      // Step B: Upload file to Supabase 'avatars' storage bucket
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `creator-avatars/${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error("Photo upload failed. Preview saved locally.");
        return;
      }

      // Step C: Get public URL and update creator_profiles row
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("creator_profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
      updateField("photoUrl", publicUrl);
      toast.success("Profile photo saved!");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Photo upload failed. Preview saved locally.");
    } finally {
      setUploadingImage(false);
    }
  };

  const calculateAge = () => {
    if (!dobDay || !dobMonth || !dobYear || dobYear.length < 4) return null;
    const dob = new Date(`${dobYear}-${dobMonth}-${dobDay}`);
    if (isNaN(dob.getTime())) return null;
    const ageDiffMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge();
  const isUnderage = age !== null && age < 18;
  const isCompletePart1 = fullName && instagramHandle && !isUnderage && dobDay && dobMonth && dobYear && gender && photoUrl;
  const isCompletePart2 = primaryNiche && primaryNiche.length > 0;

  const currentNiches = Array.isArray(primaryNiche)
    ? primaryNiche
    : primaryNiche
      ? [primaryNiche]
      : [];
  const filteredNiches = CATEGORIES.filter(
    (c) =>
      c.toLowerCase().includes(nicheSearch.toLowerCase()) &&
      !currentNiches.includes(c),
  );

  const handleDobChange = (
    field: "dobDay" | "dobMonth" | "dobYear",
    val: string,
    isMobile = false
  ) => {
    const numVal = val.replace(/\D/g, "");
    updateField(field, numVal);
    setFieldErrors((p) => ({ ...p, dob: "" }));

    if (isMobile) {
      if (field === "dobDay" && numVal.length === 2) {
        mobileMonthRef.current?.focus();
      }
      if (field === "dobMonth" && numVal.length === 2) {
        mobileYearRef.current?.focus();
      }
    } else {
      if (field === "dobDay" && numVal.length === 2) {
        dayRef.current?.blur();
        monthRef.current?.focus();
      }
      if (field === "dobMonth" && numVal.length === 2) {
        monthRef.current?.blur();
        yearRef.current?.focus();
      }
    }
  };

  const hasDobAndGender = dobDay && dobMonth && dobYear && gender;

  const validateAndProceedPart1 = () => {
    const errs: Record<string, string> = {};
    if (!fullName || !fullName.trim()) errs.fullName = "Display name is required";
    if (!instagramHandle || !instagramHandle.trim()) errs.instagramHandle = "Instagram handle is required";
    if (!photoUrl) errs.photoUrl = "Profile photo is required";
    if (!dobDay || !dobMonth || !dobYear) {
      errs.dob = "Date of birth is required";
      setShowDobGenderPanel(true);
    } else if (isUnderage) {
      errs.dob = "You must be 18+ to join YBEX";
      setShowDobGenderPanel(true);
    }
    if (!gender) {
      errs.gender = "Gender identity is required";
      setShowDobGenderPanel(true);
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setTimeout(() => {
        const el = document.querySelector('.form-error-inline');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    setSubStep(2);
  };

  const validateAndProceedPart2 = () => {
    if (!primaryNiche || primaryNiche.length === 0) {
      setFieldErrors({ niche: "Please select at least 1 category" });
      setTimeout(() => {
        const el = document.querySelector('.form-error-inline');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    nextStep();
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* MOBILE-ONLY VIEW (md:hidden) — Exactly matches Screenshot 2               */}
      {/* ========================================================================= */}
      <div className="md:hidden pb-28 animate-in fade-in duration-300">
        <AnimatePresence mode="wait">
          {subStep === 1 ? (
            <motion.div
              key="mobile-part1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Header Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  What should<br />brands call you?
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-normal leading-relaxed">
                  This is the name and face on every pitch you send.
                </p>
              </div>

              {/* Profile Photo Upload */}
              <div className="pt-2 text-center">
                <div className="relative inline-block">
                  <div
                    className={`w-28 h-28 rounded-full border-2 border-dashed ${
                      fieldErrors.photoUrl
                        ? "border-red-500 bg-red-50/50"
                        : "border-[#C084FC] bg-[#FAF5FF] dark:bg-[#7C3AED]/10"
                    } flex items-center justify-center overflow-hidden relative cursor-pointer shadow-sm transition-all hover:bg-[#F3E8FF]`}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera
                        size={32}
                        className={fieldErrors.photoUrl ? "text-red-400" : "text-[#7C3AED]"}
                      />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Plus Badge */}
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center absolute bottom-0.5 right-0.5 shadow-md ring-2 ring-white dark:ring-slate-900 pointer-events-none">
                    <Plus size={16} strokeWidth={2.5} />
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-full"
                    aria-label="Upload profile photo"
                  />
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center mt-2.5">
                  Photos lift brand click-through 140%
                </p>
                {fieldErrors.photoUrl && (
                  <p className="text-red-500 text-xs font-semibold mt-1 form-error-inline text-center">
                    {fieldErrors.photoUrl}
                  </p>
                )}
              </div>

              {/* Full Name Input */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    updateField("fullName", e.target.value);
                    setFieldErrors((p) => ({ ...p, fullName: "" }));
                  }}
                  maxLength={50}
                  placeholder="Rahul Sharma"
                  className="w-full h-14 px-4 rounded-2xl border-2 border-[#7C3AED] bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base font-semibold focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/15 shadow-sm transition"
                />
                {fieldErrors.fullName && (
                  <p className="form-error-inline text-red-500 text-xs mt-1 font-semibold pl-1">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* Instagram Handle Input */}
              <div className="space-y-1.5">
                <div className="w-full h-14 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 flex items-center justify-between shadow-sm focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/15 transition">
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-slate-400 font-medium text-base mr-0.5">@</span>
                    <input
                      type="text"
                      value={instagramHandle.startsWith('@') ? instagramHandle.slice(1) : instagramHandle}
                      onChange={(e) => {
                        updateField("instagramHandle", safeLower(e.target.value).replace(/[^a-z0-9_.]/g, ""));
                        setFieldErrors((p) => ({ ...p, instagramHandle: "" }));
                      }}
                      placeholder="your_handle"
                      className="text-base text-slate-900 dark:text-white placeholder:text-slate-400 bg-transparent outline-none flex-1 font-medium w-full"
                    />
                  </div>
                  <span className="text-xs font-extrabold text-[#7C3AED] tracking-wider uppercase shrink-0 pl-2">
                    INSTAGRAM
                  </span>
                </div>
                {fieldErrors.instagramHandle && (
                  <p className="form-error-inline text-red-500 text-xs mt-1 font-semibold pl-1">
                    {fieldErrors.instagramHandle}
                  </p>
                )}
              </div>

              {/* Birthday & Gender Row & Expandable Section */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Birthday & gender
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Needed for brand-safety checks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDobGenderPanel(!showDobGenderPanel)}
                    className="px-4 py-1.5 rounded-full bg-[#FAF5FF] dark:bg-[#7C3AED]/15 text-[#7C3AED] font-bold text-xs hover:bg-[#7C3AED]/20 active:scale-95 transition"
                  >
                    {hasDobAndGender ? (showDobGenderPanel ? "Close" : "Edit") : (showDobGenderPanel ? "Close" : "Add")}
                  </button>
                </div>

                {/* Summary badge when collapsed and data present */}
                {!showDobGenderPanel && hasDobAndGender && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF5FF] dark:bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold border border-[#7C3AED]/20">
                    <Check size={13} strokeWidth={2.5} />
                    <span>{dobDay}/{dobMonth}/{dobYear} · {gender}</span>
                  </div>
                )}

                {/* Expandable DOB & Gender Form */}
                {showDobGenderPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 uppercase tracking-wider">
                        Date of Birth *
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={mobileDayRef}
                          type="text"
                          placeholder="DD"
                          value={dobDay}
                          onChange={(e) => handleDobChange("dobDay", e.target.value, true)}
                          maxLength={2}
                          className="w-[28%] h-12 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 text-base text-slate-900 dark:text-white focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-center font-semibold"
                        />
                        <input
                          ref={mobileMonthRef}
                          type="text"
                          placeholder="MM"
                          value={dobMonth}
                          onChange={(e) => handleDobChange("dobMonth", e.target.value, true)}
                          maxLength={2}
                          className="w-[28%] h-12 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 text-base text-slate-900 dark:text-white focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-center font-semibold"
                        />
                        <input
                          ref={mobileYearRef}
                          type="text"
                          placeholder="YYYY"
                          value={dobYear}
                          onChange={(e) => handleDobChange("dobYear", e.target.value, true)}
                          maxLength={4}
                          className="w-[44%] h-12 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2 text-base text-slate-900 dark:text-white focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-center font-semibold"
                        />
                      </div>
                      {isUnderage && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1 font-semibold">
                          <AlertCircle size={13} /> You must be 18+ to join YBEX
                        </p>
                      )}
                      {fieldErrors.dob && (
                        <p className="form-error-inline text-red-500 text-xs mt-1.5 font-semibold">
                          {fieldErrors.dob}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 uppercase tracking-wider">
                        Gender Identity *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Female", "Male", "Other"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              updateField("gender", g);
                              setFieldErrors((p) => ({ ...p, gender: "" }));
                            }}
                            className={`h-12 px-2 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                              gender === g
                                ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-[#7C3AED]/50"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      {fieldErrors.gender && (
                        <p className="form-error-inline text-red-500 text-xs mt-1.5 font-semibold">
                          {fieldErrors.gender}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDobGenderPanel(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mobile-part2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  What is your content niche?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Select categories so the right brands can find you.
                </p>
              </div>

              <div className="relative z-10">
                <UniversalTagSearch
                  label="Primary Category *"
                  selectedTags={currentNiches}
                  onChange={(newTags) => {
                    updateField("primaryNiche", newTags);
                    setFieldErrors((p) => ({ ...p, niche: "" }));
                  }}
                  type="niche"
                  placeholder="Search categories... (e.g. Entertainment)"
                />
                {fieldErrors.niche && (
                  <p className="form-error-inline text-red-500 text-xs mt-1 font-semibold">
                    {fieldErrors.niche}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Biography / Elevator Pitch
                  </label>
                  <span className="text-xs text-slate-400">{bio.length}/300</span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) =>
                    updateField("bio", e.target.value.substring(0, 300))
                  }
                  placeholder="Tell brands about your content style and audience in 2-3 sentences..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base text-slate-900 dark:text-white focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none min-h-[110px] resize-none shadow-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setSubStep(1)}
                className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center gap-1.5 py-1"
              >
                <ArrowLeft size={16} /> Back to profile details
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned Bottom Primary Action on Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent z-40">
          <div className="max-w-md mx-auto">
            {subStep === 1 ? (
              <button
                type="button"
                onClick={validateAndProceedPart1}
                className="w-full h-13 py-3.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={validateAndProceedPart2}
                className="w-full h-13 py-3.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition"
              >
                Next: Demographics →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (hidden md:block) — Exact existing approved layout (Zero diff) */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div>
          <h2 className={'text-2xl font-black tracking-tight'}>
            Create your Creator Profile
          </h2>
          <p className="text-[var(--text-secondary)]">
            Set up your identity on YBEX so brands can discover you.
          </p>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {subStep === 1 && (
              <motion.div
                key="part1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-6 pb-6 border-b border-[var(--border-default)]">
                  <div className="relative group cursor-pointer shrink-0">
                    {fieldErrors.photoUrl && <p className="text-red-500 text-[10px] font-bold absolute -top-4 left-0 right-0 text-center form-error-inline whitespace-nowrap">{fieldErrors.photoUrl}</p>}
                  <div className={`w-20 h-20 rounded-full border-2 border-dashed ${fieldErrors.photoUrl ? "border-red-500 bg-red-50" : "border-[#3B82F6] bg-blue-50"} flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:bg-blue-100 group-hover:border-solid`}>
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera
                          size={24}
                          className={fieldErrors.photoUrl ? "text-red-400" : "text-[#3B82F6]"}
                        />
                      )}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={20} />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div>
                    <h4 className={'font-bold text-sm'}>Profile Photo <span className="text-red-500">*</span></h4>
                    <p className={'text-[11px] font-medium'}>
                      📸 Profile photo increases CTR by 140%
                    </p>
                    <p className={'text-[11px] font-medium'}>
                      Recommended size: 500x500px, under 2MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { updateField("fullName", e.target.value); setFieldErrors(p => ({...p, fullName: ""})); }}
                      maxLength={50}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition"
                    /></div>
              {fieldErrors.fullName && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.fullName}</p>}
                  <div>
                    <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                      Instagram Handle *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">
                        @
                      </span>
                      <input
                        type="text"
                        value={instagramHandle}
                        onChange={(e) => { updateField("instagramHandle", safeLower(e.target.value).replace(/[^a-z0-9_.]/g, "")); setFieldErrors(p => ({...p, instagramHandle: ""})); }}
                        placeholder="your_handle"
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3.5 pl-8 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none transition"
                      /></div>
              {fieldErrors.instagramHandle && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.instagramHandle}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                      Date of Birth *
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={dayRef}
                        type="text"
                        placeholder="DD"
                        value={dobDay}
                        onChange={(e) => handleDobChange("dobDay", e.target.value, false)}
                        maxLength={2}
                        className="w-[28%] bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-2 py-3.5 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none text-center"
                      />
                      <input
                        ref={monthRef}
                        type="text"
                        placeholder="MM"
                        value={dobMonth}
                        onChange={(e) => handleDobChange("dobMonth", e.target.value, false)}
                        maxLength={2}
                        className="w-[28%] bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-2 py-3.5 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none text-center"
                      />
                      <input
                        ref={yearRef}
                        type="text"
                        placeholder="YYYY"
                        value={dobYear}
                        onChange={(e) => handleDobChange("dobYear", e.target.value, false)}
                        maxLength={4}
                        className="w-[44%] bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-2 py-3.5 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none text-center "
                      />
                    </div>
                    {isUnderage && (
                      <p className="text-xs text-[#f7768e] mt-2 flex items-center gap-1">
                        <AlertCircle size={12} /> You must be 18+ to join YBEX
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                      Gender Identity *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Female", "Male", "Other"].map((g) => (
                        <button
                          key={g}
                          onClick={() => updateField("gender", g)}
                          className={`py-3.5 px-2 rounded-xl border text-sm font-bold transition-all ${gender === g ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[#3B82F6]/50"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {subStep === 2 && (
              <motion.div
                key="part2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="relative z-10">
                  <UniversalTagSearch
                    label="Primary Category *"
                    selectedTags={currentNiches}
                    onChange={(newTags) => {
                      updateField("primaryNiche", newTags);
                      setFieldErrors(p => ({...p, niche: ""}));
                    }}
                    type="niche"
                    placeholder="Search categories... (e.g. Entertainment)"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                      Biography / Elevator Pitch
                    </label>
                    <span className={'text-[11px] font-medium'}>{bio.length}/300</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) =>
                      updateField("bio", e.target.value.substring(0, 300))
                    }
                    placeholder="Tell brands about your content style and audience in 2-3 sentences..."
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none min-h-[100px] resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between pt-6 border-t border-[var(--border-default)]">
          {subStep === 1 ? (
            <div /> // placeholder for spacing
          ) : (
            <button
              onClick={() => setSubStep(1)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-4 py-3 transition"
            >
              ← Back
            </button>
          )}
          
          {subStep === 1 ? (
            <button
              onClick={validateAndProceedPart1}
              className="bg-[#3B82F6] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6b91e5] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={validateAndProceedPart2}
              className="bg-[#3B82F6] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6b91e5] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Demographics →
            </button>
          )}
        </div>
      </div>
    </>
  );
}
