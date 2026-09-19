import React, { useState, useEffect } from "react";
import { t } from "@/lib/typography";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { Shield } from "lucide-react";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";
import { checkChargesWarning } from "../../utils/creatorFormValidation";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export default function Step4_RateCard({
  user,
  onSubmit,
}: {
  user: any;
  onSubmit: () => void;
}) {
  const {
    reelRate,
    storyRate,
    youtubeVideoRate,
    barterMode,
    instagramAvgReach,
    youtubeAvgViews,
    youtubeConnected,
    updateField,
    prevStep,
  } = useOnboardingStore();

  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioBrand, setPortfolioBrand] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [portfolioDesc, setPortfolioDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [creatorTier, setCreatorTier] = useState<string>("Bronze");

  useEffect(() => {
    async function fetchTier() {
      const userId = user?.user_id || user?.id;
      if (!userId) return;
      const { data } = await supabase.from("creator_profiles").select("tier").eq("user_id", userId).single();
      if (data?.tier) {
        setCreatorTier(data.tier);
      }
    }
    fetchTier();
  }, [user]);

  const benchmarks: Record<string, number> = { Bronze: 500, Silver: 1500, Gold: 5000, Platinum: 15000 };
  const suggestedRate = benchmarks[creatorTier] ?? 500;
  const suggestedYtRate = suggestedRate * 2;

  
  const reelValidation = checkChargesWarning(instagramAvgReach, reelRate);
  const storyValidation = checkChargesWarning(instagramAvgReach, storyRate);
  const ytValidation = youtubeConnected ? checkChargesWarning(youtubeAvgViews, youtubeVideoRate) : null;


  
  const isComplete = 
    reelRate !== "" && 
    storyRate !== "" && 
    (!youtubeConnected || youtubeVideoRate !== "");


  const barterOptions = [
    {
      id: "no_barter",
      icon: "💰",
      title: "Cash Only",
      desc: "I only accept monetary payments for my content",
    },
    {
      id: "barter_ok",
      icon: "🎁",
      title: "Barter Friendly",
      desc: "I'm open to product/value exchanges in place of cash",
    },
    {
      id: "partial_barter",
      icon: "🤝",
      title: "Partial Barter",
      desc: "I prefer a mix of cash + product compensation",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div>
        <h2 className={'text-2xl font-black tracking-tight'}>
          Rate Card & Commercials
        </h2>
        <p className="text-[var(--text-secondary)] mt-2">
          Determine what campaigns you're open to & specify baseline pricing
          quotes.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[11px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">
            $ Standard Platform Quotes (INR ₹)
          </label>
          <div className="space-y-4 bg-[var(--bg-card)] p-5 border border-[var(--border-default)] rounded-2xl">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                  Instagram Reel *
                </label>
                <button
                  type="button"
                  onClick={() => updateField("reelRate", suggestedRate)}
                  className="text-xs text-[#3B82F6] hover:underline font-bold transition-all"
                >
                  Suggested for your tier ({creatorTier}): ₹{suggestedRate.toLocaleString('en-IN')}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold">
                  ₹
                </span>
                <FormattedNumberInput
                  value={reelRate}
                  onChange={(val) => { updateField("reelRate", val); setFieldErrors(p => ({...p, reelRate: ""})); }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-4 pl-8 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                  placeholder="e.g. 5000, 10K"
                />
              </div>
              {fieldErrors.reelRate && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.reelRate}</p>}
              {reelValidation && (
                <div
                  className={`mt-2 text-xs p-3 rounded-xl border ${reelValidation.type === "success" ? "bg-[#9ece6a]/10 border-[#9ece6a]/20 text-[#9ece6a]" : "bg-amber-50 text-amber-900 border-amber-200"}`}
                >
                  {reelValidation.message}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                  Instagram Story *
                </label>
                <button
                  type="button"
                  onClick={() => updateField("storyRate", Math.round(suggestedRate * 0.4))}
                  className="text-xs text-[#3B82F6] hover:underline font-bold transition-all"
                >
                  Suggested for your tier ({creatorTier}): ₹{Math.round(suggestedRate * 0.4).toLocaleString('en-IN')}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold">
                  ₹
                </span>
                <FormattedNumberInput
                  value={storyRate}
                  onChange={(val) => { updateField("storyRate", val); setFieldErrors(p => ({...p, storyRate: ""})); }}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-4 pl-8 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                  placeholder="e.g. 1500, 2K"
                />
              </div>
              {fieldErrors.storyRate && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.storyRate}</p>}
              {storyValidation && (
                <div
                  className={`mt-2 text-xs p-3 rounded-xl border ${storyValidation.type === "success" ? "bg-[#9ece6a]/10 border-[#9ece6a]/20 text-[#9ece6a]" : "bg-amber-50 text-amber-900 border-amber-200"}`}
                >
                  {storyValidation.message}
                </div>
              )}
            </div>

            {youtubeConnected && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                    YouTube Video *
                  </label>
                  {Number(youtubeAvgViews) > 0 && (
                    <button
                      type="button"
                      onClick={() => { updateField("youtubeVideoRate", suggestedYtRate); setFieldErrors(p => ({...p, youtubeVideoRate: ""})); }}
                      className="text-xs text-[#3B82F6] hover:underline font-bold transition-all"
                    >
                      Suggest: ₹{suggestedYtRate}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold">
                    ₹
                  </span>
                  <FormattedNumberInput
                    value={youtubeVideoRate}
                    onChange={(val) => { updateField("youtubeVideoRate", val); setFieldErrors(p => ({...p, youtubeVideoRate: ""})); }}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-4 pl-8 text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                    placeholder="e.g. 8000, 15K"
                  />
                </div>
                {fieldErrors.youtubeVideoRate && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.youtubeVideoRate}</p>}
                {ytValidation && (
                  <div
                    className={`mt-2 text-xs p-3 rounded-xl border ${ytValidation.type === "success" ? "bg-[#9ece6a]/10 border-[#9ece6a]/20 text-[#9ece6a]" : "bg-amber-50 text-amber-900 border-amber-200"}`}
                  >
                    {ytValidation.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">
            Barter Acceptability Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {barterOptions.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateField("barterMode", mode.id as any)}
                className={`p-4 rounded-xl text-left flex flex-col gap-1 border transition-all ${barterMode === mode.id ? "bg-[#3B82F6]/10 border-[#3B82F6] shadow-[0_0_15px_rgba(122,162,247,0.15)]" : "bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[#3B82F6]/50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{mode.icon}</span>
                  <span
                    className={`text-sm font-bold ${barterMode === mode.id ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {mode.title}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed">
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Past Work Section */}
        <div className="p-6 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              Add a sample of past work (optional)
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Add a campaign or promotion you worked on previously. Highly recommended to get noticed by brands!
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                Content URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                placeholder="e.g. https://instagram.com/reel/... or https://youtube.com/watch?v=..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                  Brand Name (Optional)
                </label>
                <input
                  type="text"
                  value={portfolioBrand}
                  onChange={(e) => setPortfolioBrand(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                  placeholder="e.g. Nike, boAt"
                />
              </div>

              <div>
                <label className={'text-[10px] font-bold uppercase tracking-wider'}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={portfolioDesc}
                  maxLength={200}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-[#3B82F6] outline-none"
                  placeholder="Max 200 chars description"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#9ece6a]/10 border border-[#9ece6a]/20 p-4 rounded-xl flex items-start gap-4 text-xs text-[var(--text-primary)] leading-relaxed">
          <div className="w-10 h-10 rounded-full bg-[#9ece6a]/20 flex items-center justify-center shrink-0">
            <Shield className="text-[#9ece6a]" size={18} />
          </div>
          <div>
            <p className="text-[#9ece6a] font-bold uppercase tracking-wider mb-1">
              SSL Escrow Protected
            </p>
            All payments made on negotiated contracts remain secure in YBEX
            neutral escrow accounts until you submit campaign deliverables
            safely.
          </div>
        </div>
      </div>

      {/* Desktop footer */}
      <div className="hidden md:flex justify-between pt-6 border-t border-[var(--border-default)]">
        <button
          onClick={prevStep}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-4 py-3 transition"
        >
          ← Back
        </button>
        <button
          onClick={async () => {
            if (portfolioUrl.trim()) {
              const isValidUrl = (url: string) => {
                try {
                  new URL(url);
                  return true;
                } catch {
                  return false;
                }
              };

              if (!isValidUrl(portfolioUrl)) {
                toast.error("Please enter a valid URL.");
                return;
              }

              setSubmitting(true);
              try {
                let platform = "other";
                if (portfolioUrl.toLowerCase().includes("instagram.com") || portfolioUrl.toLowerCase().includes("instagram.in")) {
                  platform = "instagram";
                } else if (portfolioUrl.toLowerCase().includes("youtube.com") || portfolioUrl.toLowerCase().includes("youtu.be")) {
                  platform = "youtube";
                }

                const userId = user?.user_id || user?.id;

                const { error: insertError } = await supabase.from("creator_portfolio_items").insert({
                  creator_id: userId,
                  content_url: portfolioUrl,
                  description: portfolioDesc || portfolioBrand || "Portfolio Item",
                  views: null,
                  engagement_rate: null,
                  created_at: new Date().toISOString()
                });

                if (insertError) {
                  console.error("Error inserting portfolio item during onboarding:", insertError);
                  toast.error("Failed to save portfolio item. Please try again.");
                  return; // Stop progression if insertion fails
                }
              } catch (err) {
                console.error("Error inserting portfolio item during onboarding:", err);
                toast.error("An unexpected error occurred. Please try again.");
                return; // Stop progression if insertion fails
              } finally {
                setSubmitting(false);
              }
            }
            const errs: Record<string, string> = {};
            if (!reelRate) errs.reelRate = "Instagram Reel rate is required";
            if (!storyRate) errs.storyRate = "Instagram Story rate is required";
            if (youtubeConnected && !youtubeVideoRate) errs.youtubeVideoRate = "YouTube Video rate is required";
            if (Object.keys(errs).length > 0) {
              setFieldErrors(errs);
              setTimeout(() => {
                const el = document.querySelector('.form-error-inline');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
              return;
            }
            onSubmit();
          }}
          disabled={submitting}
          className="bg-[#3B82F6] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6b91e5] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : "Submit Profile →"}
        </button>
      </div>

      {/* Mobile Pinned Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent z-40">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={async () => {
              if (portfolioUrl.trim()) {
                const isValidUrl = (url: string) => {
                  try {
                    new URL(url);
                    return true;
                  } catch {
                    return false;
                  }
                };

                if (!isValidUrl(portfolioUrl)) {
                  toast.error("Please enter a valid URL.");
                  return;
                }

                setSubmitting(true);
                try {
                  const userId = user?.user_id || user?.id;
                  const { error: insertError } = await supabase.from("creator_portfolio_items").insert({
                    creator_id: userId,
                    content_url: portfolioUrl,
                    description: portfolioDesc || portfolioBrand || "Portfolio Item",
                    views: null,
                    engagement_rate: null,
                    created_at: new Date().toISOString()
                  });

                  if (insertError) {
                    console.error("Error inserting portfolio item during onboarding:", insertError);
                    toast.error("Failed to save portfolio item. Please try again.");
                    return;
                  }
                } catch (err) {
                  console.error("Error inserting portfolio item during onboarding:", err);
                  toast.error("An unexpected error occurred. Please try again.");
                  return;
                } finally {
                  setSubmitting(false);
                }
              }
              const errs: Record<string, string> = {};
              if (!reelRate) errs.reelRate = "Instagram Reel rate is required";
              if (!storyRate) errs.storyRate = "Instagram Story rate is required";
              if (youtubeConnected && !youtubeVideoRate) errs.youtubeVideoRate = "YouTube Video rate is required";
              if (Object.keys(errs).length > 0) {
                setFieldErrors(errs);
                setTimeout(() => {
                  const el = document.querySelector('.form-error-inline');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
                return;
              }
              onSubmit();
            }}
            disabled={submitting}
            className="w-full h-13 py-3.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Submit Profile →"}
          </button>
        </div>
      </div>

    </div>
  );
}
