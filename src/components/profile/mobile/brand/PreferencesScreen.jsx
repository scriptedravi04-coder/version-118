import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { MobileScreen, Section, Field, Chip, PrimaryButton } from "./brandMobileUi";
import {
  CAMPAIGN_TYPES, BUDGET_RANGES, CREATOR_SIZES, GENDER_FOCUS, ALL_NICHES, toList,
} from "./useBrandProfileData";

// Screen 1d — campaign preferences. Same brand_profiles columns the desktop
// settings page writes (campaign_types, budget_range, preferred_creator_size,
// preferred_niches, gender_focus).

export default function PreferencesScreen({ onBack, profile, saving, onSave }) {
  const [types, setTypes] = useState(() => toList(profile.campaignTypes));
  const [budget, setBudget] = useState(profile.budgetRange || "");
  const [size, setSize] = useState(profile.creatorSize || "");
  const [niche, setNiche] = useState(profile.niches || "");
  const [gender, setGender] = useState(profile.genderFocus || "");
  const [nicheQuery, setNicheQuery] = useState("");

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const nicheMatches = useMemo(() => {
    const q = nicheQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_NICHES.filter((n) => n.toLowerCase().includes(q) && n !== niche).slice(0, 6);
  }, [nicheQuery, niche]);

  const dirty =
    types.join(", ") !== toList(profile.campaignTypes).join(", ") ||
    budget !== (profile.budgetRange || "") ||
    size !== (profile.creatorSize || "") ||
    niche !== (profile.niches || "") ||
    gender !== (profile.genderFocus || "");

  const handleSave = () =>
    onSave({
      campaignTypes: types.join(", "),
      budgetRange: budget,
      creatorSize: size,
      niches: niche,
      genderFocus: gender,
    });

  return (
    <MobileScreen
      title="Campaign preferences"
      onBack={onBack}
      footer={
        <PrimaryButton disabled={saving || !dirty} onClick={handleSave}>
          {saving ? "Saving…" : "Save preferences"}
        </PrimaryButton>
      }
    >
      <Section hint="We use these to decide which creators see your briefs first.">
        <Field
          label="Campaign types"
          hint={types.length ? `${types.length} selected` : "Pick everything you'd consider."}
        >
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_TYPES.map((t) => (
              <Chip key={t} selected={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Typical budget per campaign">
          <div className="flex flex-wrap gap-2">
            {BUDGET_RANGES.map((b) => (
              <Chip key={b} selected={budget === b} onClick={() => setBudget(budget === b ? "" : b)}>
                {b}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Preferred creator size">
          <div className="flex flex-wrap gap-2">
            {CREATOR_SIZES.map((s) => (
              <Chip key={s} selected={size === s} onClick={() => setSize(size === s ? "" : s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Target niches">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={nicheQuery}
              onChange={(e) => setNicheQuery(e.target.value)}
              placeholder="Search niches to add"
              className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:bg-white"
            />
          </div>

          {nicheMatches.length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden">
              {nicheMatches.map((n) => (
                <button
                  key={n}
                  onClick={() => { setNiche(n); setNicheQuery(""); }}
                  className="w-full px-3.5 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {niche && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-semibold">
                {niche}
                <button onClick={() => setNiche("")} aria-label={`Remove ${niche}`}>
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
        </Field>

        <Field label="Target audience gender">
          <div className="flex flex-wrap gap-2">
            {GENDER_FOCUS.map((g) => (
              <Chip key={g} selected={gender === g} onClick={() => setGender(gender === g ? "" : g)}>
                {g}
              </Chip>
            ))}
          </div>
        </Field>
      </Section>
    </MobileScreen>
  );
}
