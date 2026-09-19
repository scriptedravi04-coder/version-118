import React, { useState, useRef, useEffect } from "react";
import { safeLower } from "../../../../utils/safeFormat";
import { Building, ChevronDown, Camera, Check, MapPin, Plus, Sparkles } from "lucide-react";
import {
  MobileScreen, Section, Field, TextInput, TextArea, Chip, PrimaryButton, Pill,
} from "./brandMobileUi";
import { INDUSTRY_OPTIONS, TEAM_SIZES } from "./useBrandProfileData";
import { searchLocations } from "@/lib/locations";

const AGENCY_TYPES = [
  "Influencer marketing agency",
  "Full-service creative agency",
  "Media buying agency",
  "In-house brand team managing multiple brands",
];

// Screen 1c — editable company fields. Writes through the same POST brands/profile
// payload BrandSettings.jsx uses, so desktop and mobile edit the same row.

export default function CompanyDetailsScreen({ onBack, profile, saving, onSave, uploadImage }) {
  const [form, setForm] = useState(profile);
  const [agencyOpen, setAgencyOpen] = useState(false);
  const [agencyType, setAgencyType] = useState(profile?.agency_type || "");
  const [uploading, setUploading] = useState(null);
  const logoInput = useRef(null);
  const coverInput = useRef(null);

  // Location search state
  const [locQuery, setLocQuery] = useState(profile?.location || "");
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const locContainerRef = useRef(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Keep locQuery in sync if form.location changes externally
  useEffect(() => {
    if (form.location && form.location !== locQuery && !locDropdownOpen) {
      setLocQuery(form.location);
    }
  }, [form.location]);

  // City / Location search: searchLocations local + /api/locations/search debounced
  useEffect(() => {
    const q = (locQuery || "").trim();
    if (!q) {
      setLocSuggestions(searchLocations("", 8));
      return;
    }
    const localMatches = searchLocations(q, 10);
    setLocSuggestions(localMatches);

    const timer = setTimeout(async () => {
      try {
        setLocLoading(true);
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
            setLocSuggestions(combined.slice(0, 15));
          }
        }
      } catch (e) {
        // Fallback gracefully to local matches
      } finally {
        setLocLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [locQuery]);

  // Click outside listener for location dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locContainerRef.current && !locContainerRef.current.contains(e.target)) {
        setLocDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelectLocation = (loc) => {
    const formatted = loc.display?.includes(",")
      ? loc.display
      : loc.state && loc.state !== loc.name
      ? `${loc.name}, ${loc.state}`
      : loc.name;
    set("location", formatted);
    setLocQuery(formatted);
    setLocDropdownOpen(false);
  };

  const handleUpload = async (kind, file) => {
    setUploading(kind);
    const url = await uploadImage(file);
    setUploading(null);
    if (url) set(kind === "logo" ? "logo" : "cover", url);
  };

  const handleClaimAgency = async () => {
    if (!agencyType) return;
    const ok = await onSave({ is_agency: true, agency_type: agencyType });
    if (ok) {
      set("is_agency", true);
      set("agency_type", agencyType);
      setAgencyOpen(false);
    }
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(profile);

  const brandInitial = form.company_name?.trim()
    ? form.company_name.trim().charAt(0).toUpperCase()
    : "B";

  return (
    <MobileScreen
      title="Company details"
      onBack={onBack}
      footer={
        <PrimaryButton disabled={saving || !dirty} onClick={() => onSave(form)}>
          {saving ? "Saving…" : "Save changes"}
        </PrimaryButton>
      }
    >
      <Section hint="Keep this current — creators check it before accepting a brief.">
        {/* Integrated Profile Banner & Logo Studio */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all">
          {/* Cover Banner with camera pill button */}
          <div className="relative h-32 w-full bg-gradient-to-r from-[#2E1A68] via-[#3B1E7E] to-[#582A9C] overflow-hidden group">
            {form.cover && (
              <img
                src={form.cover}
                alt="Brand Cover Banner"
                className="w-full h-full object-cover"
              />
            )}

            {/* Subtle gradient vignette for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none" />

            {/* Change cover pill button (matching Screenshot 2 top-right style) */}
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={uploading === "cover"}
              className="absolute top-3 right-3 h-8 px-3.5 rounded-full bg-white/95 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer z-10 disabled:opacity-75"
            >
              <Camera size={13} className="text-slate-700" />
              <span>{uploading === "cover" ? "Uploading…" : "Cover"}</span>
            </button>

            {uploading === "cover" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs z-20">
                <div className="flex items-center gap-2 bg-white/95 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-900 shadow-lg">
                  <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#7C3AED] rounded-full animate-spin" />
                  Updating cover…
                </div>
              </div>
            )}
          </div>

          {/* Overlapping Brand Logo Avatar & Info Row */}
          <div className="px-4 pb-4">
            <div className="flex items-end justify-between -mt-10 mb-2.5">
              {/* Avatar Squircle */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  disabled={uploading === "logo"}
                  className="w-20 h-20 rounded-[20px] border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-lg overflow-hidden flex items-center justify-center text-2xl font-black text-slate-900 dark:text-white relative cursor-pointer active:scale-95 transition-all group"
                  title="Tap to change logo"
                >
                  {form.logo ? (
                    <img src={form.logo} alt="Brand Logo" className="w-full h-full object-cover" />
                  ) : form.company_name?.trim() ? (
                    brandInitial
                  ) : (
                    <Building size={26} className="text-slate-300" />
                  )}

                  {/* Dark hover overlay */}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={20} className="text-white drop-shadow-sm" />
                  </div>

                  {uploading === "logo" && (
                    <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 flex items-center justify-center z-10">
                      <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-[#7C3AED] animate-spin" />
                    </div>
                  )}
                </button>

                {/* Floating camera badge on corner */}
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  disabled={uploading === "logo"}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 cursor-pointer active:scale-90 transition-transform"
                  title="Change logo"
                >
                  <Camera size={11} strokeWidth={2.5} />
                </button>
              </div>

              {/* Logo guidance label */}
              <div className="text-right pb-1">
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] cursor-pointer"
                >
                  {uploading === "logo" ? "Uploading…" : form.logo ? "Change logo" : "Upload logo"}
                </button>
                <div className="text-[10.5px] text-slate-400 mt-0.5 font-medium">1:1 square recommended</div>
              </div>
            </div>

            {/* Hint footer */}
            <div className="text-[11.5px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Tap banner or logo to update public appearance
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Preview</span>
            </div>
          </div>

          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload("logo", e.target.files[0])}
          />
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload("cover", e.target.files[0])}
          />
        </div>

        {/* Agency accordion — collapsed by default, per the mockup's dev note */}
        <div className="mt-4 rounded-2xl bg-purple-50/60 overflow-hidden">
          <button
            onClick={() => setAgencyOpen((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center gap-2 text-left cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Are you an agency?</span>
                {form.is_agency ? <Pill tone="violet"><Check size={10} strokeWidth={3} /> Claimed</Pill> : <Pill tone="red">New</Pill>}
              </div>
              <p className="text-xs text-purple-900/80 mt-1">
                {form.is_agency
                  ? `Showing as ${form.agency_type || "an agency"} on your briefs and chats.`
                  : "Show a public Agency badge to creators across campaigns, chats and profile views."}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-[#7C3AED] flex-shrink-0 transition-transform ${agencyOpen ? "rotate-180" : ""}`}
            />
          </button>

          {agencyOpen && !form.is_agency && (
            <div className="px-4 pb-4 space-y-2">
              {AGENCY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAgencyType(t)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    agencyType === t
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-gray-700 border-violet-200"
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={handleClaimAgency}
                disabled={!agencyType || saving}
                className="w-full h-11 mt-1 rounded-xl bg-violet-600 text-white font-bold text-sm disabled:opacity-50"
              >
                {saving ? "Claiming…" : "Claim agency status"}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section className="pt-0">
        <Field label="Company name">
          <TextInput
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Your registered brand name"
          />
        </Field>

        <Field label="Industry category">
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.map((opt) => (
              <Chip key={opt} selected={form.industry === opt} onClick={() => set("industry", opt)}>
                {opt}
              </Chip>
            ))}
          </div>
          {form.industry && !INDUSTRY_OPTIONS.includes(form.industry) && (
            <div className="mt-2">
              <TextInput value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
          )}
        </Field>

        {/* Headquarters with Location Search & Autocomplete API */}
        <Field label="Headquarters" hint="City, state — shown on your public profile.">
          <div ref={locContainerRef} className="relative">
            <div className="relative">
              <input
                type="text"
                value={locQuery}
                onChange={(e) => {
                  setLocQuery(e.target.value);
                  set("location", e.target.value);
                  setLocDropdownOpen(true);
                }}
                onFocus={() => setLocDropdownOpen(true)}
                placeholder="Search city, e.g. New Delhi, Mumbai, Bengaluru"
                className="w-full h-11 px-3.5 pl-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all"
              />
              <MapPin
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED] pointer-events-none"
              />
              {locLoading && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#7C3AED] rounded-full animate-spin inline-block" />
                </div>
              )}
            </div>

            {/* Location Autocomplete Suggestions Dropdown */}
            {locDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.15)] max-h-60 overflow-y-auto z-50 p-1.5">
                {locSuggestions.map((loc, idx) => (
                  <button
                    key={`${loc.name}-${idx}`}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <MapPin size={13} strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {loc.name}
                        </div>
                        {loc.state && loc.state !== loc.name && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {loc.state}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                      {loc.type || "City"}
                    </span>
                  </button>
                ))}

                {locQuery.trim() && !locSuggestions.some((c) => safeLower(c.name) === locQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      set("location", locQuery.trim());
                      setLocDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-purple-50/50 hover:bg-purple-50 text-[#7C3AED] transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-1 cursor-pointer font-semibold text-xs"
                  >
                    <Plus size={14} />
                    <span>Use &ldquo;{locQuery.trim()}&rdquo; as Headquarters</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Point of Contact Email" hint="Your email address (visible only to platform and active creators).">
          <TextInput
            value={form.pocEmail}
            onChange={(e) => set("pocEmail", e.target.value)}
            placeholder="poc@yourbrand.com"
            inputMode="email"
          />
        </Field>
        <Field label="Website">
          <TextInput
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://yourbrand.com"
            inputMode="url"
          />
        </Field>

        <Field label="Team size">
          <div className="flex flex-wrap gap-2">
            {TEAM_SIZES.map((opt) => (
              <Chip key={opt} selected={form.teamSize === opt} onClick={() => set("teamSize", opt)}>
                {opt}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Company description" hint="Creators read this before accepting a brief.">
          <TextArea
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What you sell, who you sell to, and how you like to work with creators."
          />
        </Field>
      </Section>
    </MobileScreen>
  );
}
