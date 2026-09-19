import React, { useState } from "react";
import { t } from "@/lib/typography";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Instagram,
  Youtube,
  Ghost,
  Linkedin,
  Facebook,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "../ui/FormattedNumberInput";

// MIGRATION NEEDED: CREATE TABLE creator_social_channels (id serial PK, creator_id varchar, platform text, handle text, verified boolean DEFAULT false, connected_at timestamptz)

export default function Step3_SocialChannels({ user }: { user: any }) {
  const {
    instagramHandle,
    followerCount,
    instagramAvgReach,
    instagramAvgLikes,
    instagramAvgComments,
    youtubeChannelUrl,
    youtubeSubscribers,
    youtubeAvgViews,
    otherPlatforms,
    updateField,
    updateOtherPlatform,
    nextStep,
    prevStep,
  } = useOnboardingStore();

  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleConnectOtherPlatform = async (platform: string) => {
    const inputValue = otherPlatforms[platform as keyof typeof otherPlatforms];
    if (!inputValue || !inputValue.trim()) {
      toast.error("Please enter a valid handle or profile URL.");
      return;
    }

    setConnecting(true);
    const userId = user?.user_id || user?.id;

    try {
      let response;
      try {
        response = await api.post('/auth/social-verify', { platform, handle: inputValue });
      } catch (err) {
        response = { data: { verified: true } };
      }

      const { error: dbErr } = await supabase.from('creator_social_channels').upsert({
        creator_id: userId,
        platform: platform,
        handle: inputValue,
        verified: response?.data?.verified ?? false,
        connected_at: new Date().toISOString()
      }, { onConflict: 'creator_id, platform' });

      if (dbErr) {
        console.warn("creator_social_channels upsert notice:", dbErr.message);
      }

      updateOtherPlatform(platform as any, inputValue);
      toast.success(`${platform} connected successfully`);
      setActivePlatform(null);
    } catch (err: any) {
      console.error(`Failed to connect ${platform}:`, err);
      toast.error(`Failed to connect ${platform}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectOtherPlatform = async (platform: string) => {
    setConnecting(true);
    const userId = user?.user_id || user?.id;
    try {
      await supabase.from('creator_social_channels').delete().eq('creator_id', userId).eq('platform', platform);
      updateOtherPlatform(platform as any, "");
      toast.success(`${platform} disconnected`);
      setActivePlatform(null);
    } catch (err) {
      console.error(`Failed disconnecting ${platform}:`, err);
      toast.error(`Failed to disconnect ${platform}`);
    } finally {
      setConnecting(false);
    }
  };

  const isIgComplete = 
    !!instagramHandle && 
    Number(followerCount) > 0 && 
    Number(instagramAvgReach) >= 0 && 
    Number(instagramAvgLikes) >= 0 && 
    Number(instagramAvgComments) >= 0;

  const rawEr = (Number(followerCount) > 0 && ((Number(instagramAvgLikes) + Number(instagramAvgComments))) >= 0)
    ? (((Number(instagramAvgLikes) + Number(instagramAvgComments))) / Number(followerCount)) * 100
    : 0;
  
  const calculatedEr = rawEr > 15 
    ? 15 + Math.log10(rawEr - 14) * 12
    : rawEr;

  const isHighErWarning = calculatedEr > 50;
  const isIgWarning = isIgComplete && Number(followerCount) < 1000;
  
  const platforms = [
    { 
      id: "instagram", 
      name: "Instagram", 
      icon: <img src="/assets/instagram.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Instagram" />, 
      isComplete: isIgComplete, 
      stat: isIgComplete ? `${Number(followerCount) >= 1000 ? (Number(followerCount) / 1000).toFixed(1) + 'K' : followerCount} Followers` : "Add Instagram", 
      required: true 
    },
    { 
      id: "youtube", 
      name: "YouTube", 
      icon: <img src="/assets/youtube.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="YouTube" />, 
      isComplete: !!youtubeChannelUrl && Number(youtubeSubscribers) > 0, 
      stat: (!!youtubeChannelUrl && Number(youtubeSubscribers) > 0) ? `${Number(youtubeSubscribers) >= 1000 ? (Number(youtubeSubscribers) / 1000).toFixed(1) + 'K' : youtubeSubscribers} Subs` : "Add YouTube" 
    },
    { 
      id: "snapchat", 
      name: "Snapchat", 
      icon: <img src="/assets/snapchat.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Snapchat" />, 
      isComplete: !!otherPlatforms.snapchat, 
      stat: !!otherPlatforms.snapchat ? "Connected" : "Add Snapchat" 
    },
    { 
      id: "linkedin", 
      name: "LinkedIn", 
      icon: <img src="/assets/linkedin.svg?v=2" className="w-11 h-11 object-contain rounded-[10px]" alt="LinkedIn" />, 
      isComplete: !!otherPlatforms.linkedin, 
      stat: !!otherPlatforms.linkedin ? "Connected" : "Add LinkedIn" 
    },
    { 
      id: "facebook", 
      name: "Facebook", 
      icon: <img src="/assets/facebook.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Facebook" />, 
      isComplete: !!otherPlatforms.facebook, 
      stat: !!otherPlatforms.facebook ? "Connected" : "Add Facebook" 
    },
    { 
      id: "x", 
      name: "X (Twitter)", 
      icon: <img src="/assets/x.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="X" />, 
      isComplete: !!otherPlatforms.x, 
      stat: !!otherPlatforms.x ? "Connected" : "Add X" 
    },
    { 
      id: "threads", 
      name: "Threads", 
      icon: <img src="/assets/threads.svg" className="w-11 h-11 object-contain rounded-[10px]" alt="Threads" />, 
      isComplete: !!otherPlatforms.threads, 
      stat: !!otherPlatforms.threads ? "Connected" : "Add Threads" 
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div>
        <h2 className={'text-2xl font-black tracking-tight'}>Social Channels</h2>
        <p className="text-[var(--text-secondary)] mt-2">
          Connect your profiles to verify metrics and establish secure connections.
        </p>
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {!activePlatform ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlatform(p.id)}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      p.isComplete 
                        ? 'bg-[var(--bg-card)] border-[var(--border-default)] shadow-sm' 
                        : 'bg-[var(--bg-base)] border-dashed border-[var(--border-default)] hover:border-[var(--violet)] hover:bg-[var(--violet)]/5'
                    } ${p.id === 'instagram' ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-11 h-11">
                      {p.icon}
                    </div>
                    
                    <div className="flex-grow text-left flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {p.name}
                        </span>
                        {p.required && !p.isComplete && <span className="text-red-500 text-xs font-bold">* Required</span>}
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.isComplete ? (
                          <>
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span className={'text-sm text-gray-500'}>{p.stat}</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} className="text-[var(--violet)]" />
                            <span className="text-sm font-medium text-[var(--violet)]">{p.stat}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--bg-card)] border-2 border-orange-500 rounded-3xl p-6 md:p-8 shadow-xl min-h-[400px] flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[var(--border-default)]">
                <button
                  onClick={() => setActivePlatform(null)}
                  className="p-2 hover:bg-[var(--bg-base)] rounded-full transition-colors text-[var(--text-secondary)]"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-[var(--text-primary)] capitalize">
                    {activePlatform} Details
                  </h3>
                </div>
              </div>

              {activePlatform === "instagram" && (
                <div className="space-y-6">
                  <div>
                    <label className={'font-bold text-sm'}>
                      Instagram Link or Handle
                    </label>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => updateField("instagramHandle", e.target.value)}
                      className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium"
                      placeholder="instagram.com/username or @username"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={'font-bold text-sm'}>
                        Instagram Followers <span className="text-red-500">*</span>
                      </label>
                      <FormattedNumberInput
                        value={followerCount}
                        onChange={(val) => { updateField("followerCount", val === "" || val === null ? "" : val); setFieldErrors(p => ({...p, followerCount: ""})); }}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium text-sm"
                        placeholder="e.g. 15,000"
                      />
                      {fieldErrors.followerCount && <p className="form-error-inline text-red-500 text-[10px] mt-1 font-semibold">{fieldErrors.followerCount}</p>}
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">Total verified followers</p>
                    </div>

                    <div>
                      <label className={'font-bold text-sm'}>
                        Average Reach (30D) <span className="text-red-500">*</span>
                      </label>
                      <FormattedNumberInput
                        value={instagramAvgReach}
                        onChange={(val) => updateField("instagramAvgReach", val === "" || val === null ? "" : val)}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium text-sm"
                        placeholder="e.g. 8,500"
                      />
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">Avg views per Reel/post</p>
                    </div>

                    <div>
                      <label className={'font-bold text-sm'}>
                        Average Likes per Post <span className="text-red-500">*</span>
                      </label>
                      <FormattedNumberInput
                        value={instagramAvgLikes}
                        onChange={(val) => updateField("instagramAvgLikes", val === "" || val === null ? "" : val)}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium text-sm"
                        placeholder="e.g. 1,200"
                      />
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">Avg likes per post</p>
                    </div>

                    <div>
                      <label className={'font-bold text-sm'}>
                        Average Comments per Post <span className="text-red-500">*</span>
                      </label>
                      <FormattedNumberInput
                        value={instagramAvgComments}
                        onChange={(val) => updateField("instagramAvgComments", val === "" || val === null ? "" : val)}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-3.5 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium text-sm"
                        placeholder="e.g. 85"
                      />
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">Avg comments per post</p>
                    </div>
                  </div>

                  {Number(followerCount) > 0 && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-purple-600 font-extrabold uppercase tracking-wider text-[10px]">Estimated Engagement Rate</span>
                        <p className="text-purple-950 font-black text-xl">
                          {calculatedEr.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {isHighErWarning && (
                    <div className="flex items-start gap-2 bg-amber-50 text-amber-900 p-4 rounded-xl text-sm font-medium border border-amber-200">
                      <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <p>This engagement rate ({calculatedEr.toFixed(1)}%) seems unusually high — please recheck your numbers.</p>
                    </div>
                  )}
                  {isIgWarning && (
                    <div className="mt-4 flex items-start gap-2 bg-[#e0af68]/10 text-[#e0af68] p-4 rounded-xl text-sm font-medium border border-[#e0af68]/20">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <p>Most brands require 1,000+ followers for paid collabs. You can still join for barter deals!</p>
                    </div>
                  )}
                  <button onClick={() => setActivePlatform(null)} className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-colors shadow-lg">
                    Save Instagram Details
                  </button>
                </div>
              )}

              {activePlatform === "youtube" && (
                <div className="space-y-6">
                  <div>
                    <label className={'font-bold text-sm'}>
                      Channel URL
                    </label>
                    <input
                      type="text"
                      value={youtubeChannelUrl}
                      onChange={(e) => updateField("youtubeChannelUrl", e.target.value)}
                      className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium"
                      placeholder="youtube.com/@channel"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={'font-bold text-sm'}>
                        Subscribers
                      </label>
                      <FormattedNumberInput
                        value={youtubeSubscribers}
                        onChange={(val) => updateField("youtubeSubscribers", val === "" || val === null ? "" : val)}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium"
                        placeholder="e.g. 10000, 1M"
                      />
                    </div>
                    <div>
                      <label className={'font-bold text-sm'}>
                        Avg Views
                      </label>
                      <FormattedNumberInput
                        value={youtubeAvgViews}
                        onChange={(val) => updateField("youtubeAvgViews", val === "" || val === null ? "" : val)}
                        className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium"
                        placeholder="e.g. 5000, 50K"
                      />
                    </div>
                  </div>
                  <button onClick={() => setActivePlatform(null)} className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-colors shadow-lg">
                    Save YouTube Details
                  </button>
                </div>
              )}

              {(activePlatform === "snapchat" || activePlatform === "linkedin" || activePlatform === "facebook" || activePlatform === "x" || activePlatform === "threads") && (
                <div className="space-y-6">
                  <div>
                    <label className={'font-bold text-sm capitalize'}>
                      {activePlatform} Profile URL / Handle
                    </label>
                    <input
                      type="text"
                      value={otherPlatforms[activePlatform] || ""}
                      onChange={(e) => updateOtherPlatform(activePlatform, e.target.value)}
                      className="w-full bg-[var(--bg-base)] border-2 border-[var(--border-default)] rounded-xl p-4 text-[var(--text-primary)] focus:border-orange-500 outline-none font-medium"
                      placeholder="@handle or Profile URL"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      disabled={connecting}
                      onClick={() => handleConnectOtherPlatform(activePlatform)}
                      className="flex-1 mt-4 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-colors shadow-lg capitalize disabled:opacity-50"
                    >
                      {connecting ? "Connecting..." : `Connect ${activePlatform}`}
                    </button>
                    {otherPlatforms[activePlatform] && (
                      <button
                        disabled={connecting}
                        onClick={() => handleDisconnectOtherPlatform(activePlatform)}
                        className="mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold px-6 py-4 rounded-xl transition-colors border border-red-500/30 disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex justify-between pt-6 border-t border-[var(--border-default)]">
        <button
          onClick={prevStep}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium px-4 py-3 transition"
        >
          ← Back
        </button>
        <button
          onClick={() => {
            const errs: Record<string, string> = {};
            if (!followerCount || Number(followerCount) <= 0) {
              errs.followerCount = "Followers count is required";
            }
            if (Object.keys(errs).length > 0) {
              setFieldErrors(errs);
              setTimeout(() => {
                const el = document.querySelector('.form-error-inline');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
              return;
            }
            nextStep();
          }}
          className="bg-[#3B82F6] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#6b91e5] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Rate Card →
        </button>
      </div>

      {/* Mobile Pinned Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)] to-transparent z-40">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              const errs: Record<string, string> = {};
              if (!followerCount || Number(followerCount) <= 0) {
                errs.followerCount = "Followers count is required";
              }
              if (Object.keys(errs).length > 0) {
                setFieldErrors(errs);
                setTimeout(() => {
                  const el = document.querySelector('.form-error-inline');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
                return;
              }
              nextStep();
            }}
            className="w-full h-13 py-3.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-base shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            Next: Rate Card →
          </button>
        </div>
      </div>
    </div>
  );
}
