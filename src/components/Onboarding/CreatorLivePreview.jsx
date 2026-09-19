import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "framer-motion";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const formatNumber = (n) => {
  if (n === null || n === undefined || n === "") return null;
  const num = typeof n === "string" ? parseInt(n.replace(/,/g, "")) : n;
  if (isNaN(num) || num <= 0) return null;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return num.toString();
};

const DoodleArrowTooltip = ({ step, role }) => {
  return (
    <div className="absolute -left-36 md:-left-48 top-16 z-20 pointer-events-none opacity-0 md:opacity-100 hidden md:block">
      <svg className="w-16 h-16 md:w-24 md:h-24 text-[var(--violet)] translate-x-32 translate-y-12 drop-shadow-md" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 90 Q 30 20 90 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="5,5" fill="none" />
        <path d="M75 10 L 95 20 L 80 35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div className="bg-[var(--bg-card)] border border-[var(--violet-border)] p-3 rounded-xl max-w-[200px] shadow-2xl relative translate-y-12">
        <p className="text-[var(--violet)] font-semibold text-sm mb-1 uppercase tracking-tight">Pro Tip</p>
        <p className="text-[var(--text-primary)]/80 text-xs">
          {role === 'brand' ? (
            step === 1 ? "A clear logo gets 3x more creator applications." :
            step === 2 ? "GST Verification tags boost your trust significantly." :
            "Clear budgets help align the best creators instantly."
          ) : (
            step === 1 ? "A complete identity helps brands find you instantly." :
            step === 2 ? "📍 Local Brands will target you via smart filters." :
            step === 3 ? "Authentic Metrics 📊 — Verified stats build immense trust with brands." :
            "💰 Setting clear rates secures your income in escrow."
          )}
        </p>
      </div>
    </div>
  );
};

const StepContextText = ({ step }) => {
  const texts = {
    1: { title: "Start Building Your Profile", sub: "Add your core identity details." },
    2: { title: "Attract Local Opportunities", sub: "Define your region and limits." },
    3: { title: "Stand Out with Verified Stats", sub: "Link your accounts securely." },
    4: { title: "Set Your Worth", sub: "Define your rates and payment modes." }
  };
  const current = texts[step] || texts[1];
  return (
    <div className="mt-6 text-center transform hover:scale-105 transition-transform">
      <p className="text-[var(--text-primary)] font-semibold text-sm">{current.title}</p>
      <p className="text-[var(--text-secondary)] text-xs mt-1">{current.sub}</p>
    </div>
  );
};

export default function CreatorLivePreview({ formData = {}, currentStep = 1, user }) {
  const store = useOnboardingStore();

  const fullName = formData.name || formData.fullName || store.fullName || user?.name || user?.full_name;
  const handle = formData.handle || formData.username || store.username || store.instagramHandle;
  const photoUrl = formData.photoUrl || store.photoUrl;
  const niche = Array.isArray(formData.category || formData.primaryNiche || store.primaryNiche)
    ? (formData.category || formData.primaryNiche || store.primaryNiche)[0]
    : (formData.category || formData.primaryNiche || store.primaryNiche);
  const city = formData.city || store.city;
  const state = formData.state || store.state;
  const bio = formData.bio || store.bio;
  
  // From user instructions: channelStats (followers, avgReach, engagementRate), rateCard (baseRate, ugcRate).
  // Will map to what's in the store.
  const followersFormatted = formatNumber(store.followerCount || store.youtubeSubscribers);
  const avgReachFormatted = formatNumber(store.instagramAvgReach || store.youtubeAvgViews);
  const engagementRate = store.instagramAvgLikes ? ((store.instagramAvgLikes + store.instagramAvgComments) / (store.followerCount || 1) * 100).toFixed(1) + "%" : null;
  const baseRate = store.reelRate || store.storyRate;
  const ugcRate = store.youtubeVideoRate;
  
  const languages = formData.languages || store.languages || [];

  return (
    <div className="sticky top-8 md:top-24 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      
      <div className="relative w-full max-w-[340px] sm:w-[320px]">
        <DoodleArrowTooltip step={currentStep} role="creator" />

        <div className="bg-[var(--bg-elevated)] rounded-[1.5rem] overflow-hidden border border-[var(--border-default)] w-full shadow-2xl transition-all duration-300 transform group hover:border-[var(--violet)]/30">
          {/* Cover */}
          <div className="h-28 bg-gradient-to-br from-purple-900/80 to-slate-800 relative z-0">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          </div>

          {/* Avatar & Details */}
          <div className="px-5 pb-5 relative z-10 bg-gradient-to-b from-transparent to-[#1a1a2e]">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Avatar"
                className="-mt-12 w-20 h-20 rounded-full border-[3px] border-[var(--bg-card)] object-cover bg-[var(--bg-elevated)] shadow-lg mb-3"
              />
            ) : (
              <div className="-mt-12 w-20 h-20 rounded-full border-[3px] border-gray-200 bg-gray-200 animate-pulse shadow-lg mb-3 flex items-center justify-center" />
            )}
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  {fullName ? (
                    <h3 className="text-[var(--text-primary)] font-display font-bold text-lg leading-tight truncate">
                      {fullName}
                    </h3>
                  ) : (
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
                  )}

                  {languages[0] && (
                    <span className="text-[10px] uppercase font-bold bg-[var(--violet-soft)] text-[var(--violet)] px-2 py-[2px] rounded-full shrink-0 flex items-center gap-1 border border-[var(--violet-border)]">
                      {languages[0]}
                    </span>
                  )}
                </div>

                {handle ? (
                  <p className="text-[#a8b2d1] text-xs font-semibold mt-0.5">
                    @{handle.replace(/^@/, '')}
                  </p>
                ) : (
                  <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mt-1.5" />
                )}

                {niche ? (
                  <p className="text-[#a8b2d1] text-xs font-semibold mt-0.5">
                    {niche}
                  </p>
                ) : (
                  <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mt-1.5" />
                )}
              </div>

              {city ? (
                <p className="text-[var(--text-tertiary)] text-xs flex items-center gap-1.5 bg-[var(--bg-elevated)] py-1 px-2.5 rounded-lg w-max border border-[var(--border-default)]">
                  <span className="text-[var(--violet)]">📍</span> {city}{state ? `, ${state}` : ''}
                </p>
              ) : (
                <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
              )}

              {bio ? (
                <p className="text-[#8892b0] text-[13px] leading-relaxed line-clamp-2 italic border-l-2 border-[var(--violet)]/40 pl-3">
                  "{bio}"
                </p>
              ) : (
                <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)] mt-2">
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-wider flex items-center gap-1 mb-0.5">
                    <img src="/assets/instagram.png" className="w-3 h-3 object-contain" alt="Instagram" /> Followers
                  </p>
                  {followersFormatted ? (
                    <p className="text-[#c1aeff] font-display font-bold text-lg">
                      {followersFormatted}
                    </p>
                  ) : (
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mt-0.5" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-wider flex items-center gap-1 mb-0.5">
                    📊 Avg Reach
                  </p>
                  {avgReachFormatted ? (
                    <p className="text-[var(--text-primary)] font-display font-bold text-lg">
                      {avgReachFormatted}
                    </p>
                  ) : (
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mt-0.5" />
                  )}
                </div>
                <div>
                  {baseRate ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      ₹{Number(baseRate).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StepContextText step={currentStep} />
    </div>
  );
}
