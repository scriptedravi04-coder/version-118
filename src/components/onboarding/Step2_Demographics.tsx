import React, { useState, useEffect } from "react";
import { t } from "@/lib/typography";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { fetchPinCodeDetails } from "../../api/onboarding";
import { supabase } from "../../lib/supabase";
import { searchLocations } from "../../lib/locations";
import { Loader2 } from "lucide-react";

const LANGUAGES = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Urdu",
  "Bhojpuri",
];

export default function Step2_Demographics({ user }: { user: any }) {
  const { city, state, pinCode, languages, updateField, nextStep, prevStep } =
    useOnboardingStore();

  const [cities, setCities] = useState<{ city: string; state: string }[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [fetchingPin, setFetchingPin] = useState(false);
  const [customLanguage, setCustomLanguage] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCities() {
      try {
        const { data } = await supabase.from('indian_cities').select('city, state').order('city');
        setCities(data || []);
      } catch (err) {
        console.error("Failed loading cities:", err);
      }
    }
    loadCities();
  }, []);

  const handlePincodeChange = async (val: string) => {
    updateField("pinCode", val);
    setFieldErrors((p) => ({ ...p, pinCode: "" }));
    if (val.length === 6) {
      setFetchingPin(true);
      const details = await fetchPinCodeDetails(val);
      if (details) {
        updateField("city", details.city);
        updateField("state", details.state);
        setCitySearch(details.city);
        setFieldErrors((p) => ({ ...p, city: "", state: "" }));
      }
      setFetchingPin(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setFieldErrors((p) => ({ ...p, languages: "" }));
    if (languages.includes(lang)) {
      updateField(
        "languages",
        languages.filter((l) => l !== lang),
      );
    } else {
      updateField("languages", [...languages, lang]);
    }
  };

  const handleAddCustomLanguage = () => {
    const trimmed = customLanguage.trim();
    if (trimmed) {
      const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      if (!languages.includes(formatted)) {
        updateField("languages", [...languages, formatted]);
        setFieldErrors((p) => ({ ...p, languages: "" }));
      }
      setCustomLanguage("");
    }
  };

  const validateAndProceed = () => {
    const errs: Record<string, string> = {};
    if (!pinCode || pinCode.length !== 6) errs.pinCode = "Please enter a valid 6-digit pin code";
    if (!city || !city.trim()) errs.city = "City is required";
    if (!state || !state.trim()) errs.state = "State is required";
    if (!languages || languages.length === 0) errs.languages = "Please select at least 1 language";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setTimeout(() => {
        const el = document.querySelector('.form-error-inline');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    nextStep();
  };

  const isComplete =
    city && state && pinCode.length === 6 && languages.length > 0;
  const locationMatches = searchLocations(citySearch, 15);

  const customSelectedLanguages = languages.filter((lang) => !LANGUAGES.includes(lang));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className={'text-2xl font-black tracking-tight'}>
          Local Reach & Languages
        </h2>
        <p className="text-[var(--text-secondary)] mt-2">
          Brands search geographically and prioritize native local content
          delivery.
        </p>
      </div>

      <div className="space-y-6 pb-20 md:pb-0">
        <div>
          <label className={'text-[10px] md:text-[10px] font-bold uppercase tracking-wider block mb-1.5'}>
            Pin Code *
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              value={pinCode}
              onChange={(e) =>
                handlePincodeChange(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="e.g. 400001"
              className={`w-full bg-[var(--bg-base)] border ${fieldErrors.pinCode ? 'border-red-500' : 'border-[var(--border-default)]'} rounded-xl p-3.5 text-base md:text-sm text-[var(--text-primary)] focus:border-[#3B82F6] outline-none font-bold`}
            />
            {fetchingPin && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="animate-spin text-[#3B82F6]" size={18} />
              </div>
            )}
          </div>
          {fieldErrors.pinCode && <p className="text-red-500 text-xs font-semibold mt-1.5 form-error-inline">{fieldErrors.pinCode}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className={'text-[10px] font-bold uppercase tracking-wider block mb-1.5'}>
              City *
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                updateField("city", e.target.value);
                setCitySearch(e.target.value);
                setShowCityDropdown(true);
                setFieldErrors((p) => ({ ...p, city: "" }));
              }}
              onFocus={() => setShowCityDropdown(true)}
              placeholder="e.g. Mumbai"
              className={`w-full bg-[var(--bg-base)] border ${fieldErrors.city ? 'border-red-500' : 'border-[var(--border-default)]'} rounded-xl p-3.5 text-base md:text-sm text-[var(--text-primary)] focus:border-[#3B82F6] outline-none`}
            />
            {fieldErrors.city && <p className="text-red-500 text-xs font-semibold mt-1.5 form-error-inline">{fieldErrors.city}</p>}
            {showCityDropdown && citySearch !== "" && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl max-h-60 overflow-y-auto z-50 shadow-xl p-2 custom-scrollbar">
                {locationMatches.map((loc) => (
                  <button
                    key={`${loc.name}-${loc.state || ''}`}
                    type="button"
                    onClick={() => {
                      updateField("city", loc.name);
                      updateField("state", loc.state || (loc.type === 'State' || loc.type === 'Union Territory' ? loc.name : state || "India"));
                      setCitySearch(loc.name);
                      setShowCityDropdown(false);
                      setFieldErrors((p) => ({ ...p, city: "", state: "" }));
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[#3B82F6]/20 rounded-lg transition flex items-center justify-between"
                  >
                    <span>{loc.display}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--violet)]/10 text-[var(--violet)] font-semibold">{loc.type}</span>
                  </button>
                ))}
                {locationMatches.length === 0 && citySearch.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      updateField("city", citySearch);
                      updateField("state", state || "India");
                      setCitySearch(citySearch);
                      setShowCityDropdown(false);
                      setFieldErrors((p) => ({ ...p, city: "", state: "" }));
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-indigo-500 hover:bg-[#3B82F6]/20 rounded-lg transition"
                  >
                    Use "{citySearch}"
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={'text-[10px] font-bold uppercase tracking-wider block mb-1.5'}>
              State *
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => {
                updateField("state", e.target.value);
                setFieldErrors((p) => ({ ...p, state: "" }));
              }}
              placeholder="e.g. Maharashtra"
              className={`w-full bg-[var(--bg-base)] border ${fieldErrors.state ? 'border-red-500' : 'border-[var(--border-default)]'} rounded-xl p-3.5 text-base md:text-sm text-[var(--text-primary)] focus:border-[#3B82F6] outline-none`}
            />
            {fieldErrors.state && <p className="text-red-500 text-xs font-semibold mt-1.5 form-error-inline">{fieldErrors.state}</p>}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className={'text-[10px] font-bold uppercase tracking-wider'}>
              Languages *
            </label>
            <span className="text-xs text-[#3B82F6] font-medium">
              {languages.length} Selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${languages.includes(lang) ? "bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]" : "bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[#3B82F6]/50"}`}
              >
                {lang}
              </button>
            ))}

            {/* Custom selected languages */}
            {customSelectedLanguages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className="px-4 py-2 rounded-xl text-sm font-medium border transition-all bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6] flex items-center gap-1"
              >
                {lang} <span className="text-[10px] opacity-60">✕</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border border-dashed transition-all ${showCustomInput ? "bg-[#3B82F6]/10 border-[#3B82F6]/50 text-[#3B82F6]" : "bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[#3B82F6]/50"}`}
            >
              + Other
            </button>
          </div>
          {fieldErrors.languages && <p className="text-red-500 text-xs font-semibold mt-2 form-error-inline">{fieldErrors.languages}</p>}

          {showCustomInput && (
            <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="text"
                placeholder="Enter custom language..."
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomLanguage();
                  }
                }}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-base md:text-sm text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomLanguage}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition cursor-pointer"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop footer */}
      <div className="hidden md:flex justify-between pt-6 border-t border-[var(--border-default)]">
        <button
          onClick={prevStep}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-4 py-3 transition cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={validateAndProceed}
          className="bg-[#3B82F6] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6b91e5] transition cursor-pointer"
        >
          Next: Social →
        </button>
      </div>

      {/* Mobile Pinned footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent z-40">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={validateAndProceed}
            className="w-full h-13 py-3.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition cursor-pointer"
          >
            Next: Social →
          </button>
        </div>
      </div>
    </div>
  );
}
