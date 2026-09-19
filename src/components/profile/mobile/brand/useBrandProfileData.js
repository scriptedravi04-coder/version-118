import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../contexts/AuthContext";
import { VALID_NICHES } from "../../../../lib/constants";

// Load + save for the brand profile row, mirroring BrandSettings.jsx exactly:
// same read order (Supabase brand_profiles → GET brands/me), the same POST
// brands/profile payload, and the same Supabase upsert alongside it. Lives in the
// mobile tree so BrandSettings.jsx itself stays untouched.

export const INDUSTRY_OPTIONS = [
  "Marketing", "Beauty", "Fashion", "D2C food", "Tech", "Fitness", "Travel", "Gaming",
];

export const TEAM_SIZES = [
  "1-10 Employees", "11-50 Employees", "51-200 Employees", "500+ Employees",
];

export const CAMPAIGN_TYPES = [
  "UGC & Product Reviews", "Sponsored Posts", "Brand Ambassador",
  "Affiliate Marketing", "Event Coverage",
];

export const BUDGET_RANGES = ["Under ₹10K", "₹10K–₹50K", "₹50K–₹2L", "₹2L+"];

export const CREATOR_SIZES = ["Nano 1K–10K", "Micro 10K–100K", "Macro 100K–1M", "Mega 1M+"];

export const GENDER_FOCUS = ["Female", "Male", "All"];

export const ALL_NICHES = VALID_NICHES;

const EMPTY = {
  company_name: "", industry: "", website: "", description: "", location: "",
  pocName: "", pocDesignation: "", pocEmail: "", pocPhone: "",
  campaignTypes: "", budgetRange: "", creatorSize: "", niches: "", genderFocus: "",
  teamSize: "", logo: "", cover: "", is_agency: false, agency_type: "",
  youtubeUrl: "", linkedinUrl: "", twitterUrl: "",
};

export function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value).split(",").map((v) => v.trim()).filter(Boolean);
}

export default function useBrandProfileData(seed = null) {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mapRow = useCallback((data) => ({
    company_name: data.company_name || user?.name || "",
    industry: data.industry || "",
    website: data.website || "",
    description: data.description || "",
    location: (data.city || data.state)
      ? `${data.city || ""}, ${data.state || ""}`.replace(/^, |, $/g, "")
      : "",
    pocName: data.representative_name || data.poc_name || "",
    pocDesignation: data.representative_designation || data.poc_designation || "",
    pocEmail: data.email || user?.email || "",
    pocPhone: data.representative_mobile || data.phone || "",
    campaignTypes: Array.isArray(data.campaign_types)
      ? data.campaign_types.join(", ")
      : (data.campaign_types || ""),
    budgetRange: data.budget_range || "",
    creatorSize: data.preferred_creator_size || "",
    niches: Array.isArray(data.preferred_niches)
      ? data.preferred_niches.join(", ")
      : (data.preferred_niches || ""),
    genderFocus: data.gender_focus || "",
    teamSize: data.team_size || "",
    logo: data.logo || user?.picture || user?.photo || "",
    cover: data.cover_image || "",
    is_agency: Boolean(data.is_agency || user?.is_agency),
    agency_type: data.agency_type || "",
    youtubeUrl: data.youtube_url || "",
    linkedinUrl: data.linkedin_url || "",
    twitterUrl: data.twitter_url || "",
  }), [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data = null;
      if (supabase) {
        const res = await supabase
          .from("brand_profiles").select("*").eq("user_id", user.user_id).maybeSingle();
        if (res?.data) data = res.data;
      }
      if (!data) {
        const res = await api.get("brands/me").catch(() => null);
        if (res?.data) data = res.data;
      }
      if (data) setProfile(mapRow(data));
    } catch (e) {
      console.error("Error loading brand profile (mobile):", e);
    } finally {
      setLoading(false);
    }
  }, [user, mapRow]);

  // Seed/load exactly once. saveProfileChanges calls refreshUser(), which changes the
  // `user` identity and would otherwise re-run this effect and stamp the stale seed row
  // back over the values the brand just saved.
  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    // BrandProfile.jsx has usually already fetched this row — use it and skip the
    // duplicate request, but still fall back to a real fetch when it hasn't.
    if (seed && Object.keys(seed).length > 0) {
      initialised.current = true;
      setProfile(mapRow(seed));
      setLoading(false);
      return;
    }
    if (user) {
      initialised.current = true;
      load();
    }
  }, [seed, user, load, mapRow]);

  const save = useCallback(async (updatedFields, { silent = false } = {}) => {
    setSaving(true);
    try {
      const merged = { ...profile, ...updatedFields };
      const locParts = (merged.location || "").split(",");
      const city = locParts[0]?.trim() || "";
      const state = locParts[1]?.trim() || "";

      const payload = {
        company_name: merged.company_name,
        industry: merged.industry,
        website: merged.website,
        description: merged.description,
        city,
        state,
        email: merged.pocEmail,
        phone: merged.pocPhone,
        representative_name: merged.pocName,
        representative_designation: merged.pocDesignation,
        representative_mobile: merged.pocPhone,
        youtube_url: merged.youtubeUrl || null,
        linkedin_url: merged.linkedinUrl || null,
        twitter_url: merged.twitterUrl || null,
        campaign_types: toList(merged.campaignTypes),
        budget_range: merged.budgetRange,
        preferred_creator_size: merged.creatorSize,
        preferred_niches: merged.niches,
        gender_focus: merged.genderFocus,
        team_size: merged.teamSize,
        logo: merged.logo,
        cover_image: merged.cover,
        is_agency: Boolean(merged.is_agency),
        agency_type: merged.agency_type || null,
      };

      if (supabase && (user?.user_id || user?.id)) {
        await supabase.from("brand_profiles").upsert({
          user_id: user?.user_id || user?.id,
          company_name: merged.company_name,
          industry: merged.industry,
          website: merged.website,
          description: merged.description,
          city,
          state,
          is_agency: Boolean(merged.is_agency),
          agency_type: merged.agency_type || null,
          youtube_url: merged.youtubeUrl || null,
          linkedin_url: merged.linkedinUrl || null,
          twitter_url: merged.twitterUrl || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }

      await api.post("brands/profile", payload);
      if (refreshUser) await refreshUser();
      setProfile(merged);
      if (!silent) toast.success("Changes saved.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Couldn't save your changes."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [profile, user, refreshUser]);

  // Same bucket and response shape BrandSettings.jsx uses for logo/cover uploads.
  const uploadImage = useCallback(async (file) => {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That image is over 5MB. Pick a smaller one.");
      return null;
    }
    const toastId = toast.loading("Uploading…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("upload?bucket=profile-assets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res.data?.url) throw new Error("Upload returned no URL");
      toast.success("Uploaded.", { id: toastId });
      return res.data.url;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Try again.", { id: toastId });
      return null;
    }
  }, []);

  return { profile, setProfile, loading, saving, save, reload: load, uploadImage };
}
