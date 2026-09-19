import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { saveCreatorProfileStep } from '../../api/onboarding';

import LivePreviewCard from '../../components/onboarding/LivePreviewCard';
import PreStep_EmailVerify from '../../components/onboarding/PreStep_EmailVerify';
import Step1_Identity from '../../components/onboarding/Step1_Identity';
import Step2_Demographics from '../../components/onboarding/Step2_Demographics';
import Step3_SocialChannels from '../../components/onboarding/Step3_SocialChannels';
import Step4_RateCard from '../../components/onboarding/Step4_RateCard';
import CompletionScreen from '../../components/onboarding/CompletionScreen';
import YbexLogo from '../../components/layout/YbexLogo';
import { Zap, ChevronLeft, LogOut, ArrowLeft } from 'lucide-react';

export default function CreatorOnboarding({ user, onComplete }: { user: any, onComplete: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { step, setStep, prevStep, loadSavedState, clearState, ...state } = useOnboardingStore();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    window.location.href = "/login";
  };

  const stepLabels: Record<number, string> = {
    1: 'Profile',
    2: 'Demographics',
    3: 'Channels',
    4: 'Rate Card',
  };

  useEffect(() => {
    if (user?.user_id) {
      loadSavedState(user.user_id);
    }
  }, [user?.user_id, loadSavedState]);

  useEffect(() => {
    if (user?.verified || user?.email_verified) {
      if (step === 0) setStep(1);
    }
  }, [user, step, setStep]);

  useEffect(() => {
    if (step > 1 && step < 5) {
      const dataToSave = {
        full_name: state.fullName,
        date_of_birth: `${state.dobYear}-${state.dobMonth}-${state.dobDay}`,
        profile_photo_url: state.photoUrl,
        bio: state.bio,
        primary_niche: state.primaryNiche,
        gender: state.gender,
        city: state.city,
        state: state.state,
        pincode: state.pinCode,
        languages: state.languages,
        instagram_handle: state.instagramHandle,
        follower_count: state.followerCount,
        ig_followers: state.followerCount,
        followers_instagram: state.followerCount,
        instagram_followers: state.followerCount,
        average_reach: state.instagramAvgReach,
        avg_views_30d: state.instagramAvgReach,
        instagram_avg_reach: state.instagramAvgReach,
        avg_likes_30d: state.instagramAvgLikes,
        avg_comments_30d: state.instagramAvgComments,
        instagram_verified: state.instagramVerified,
        instagram_connected_via: state.instagramConnectedVia,
        youtube_channel_url: state.youtubeChannelUrl,
        youtube_subscribers: state.youtubeSubscribers,
        youtube_avg_views: state.youtubeAvgViews,
        youtube_connected: state.youtubeConnected,
        youtube_connected_via: state.youtubeConnectedVia,
        other_platforms: state.otherPlatforms,
        reel_rate: state.reelRate,
        story_rate: state.storyRate,
        youtube_video_rate: state.youtubeVideoRate,
        barter_mode: state.barterMode,
      };
      saveCreatorProfileStep(user.user_id, dataToSave);
    }
  }, [step]);

  const handleSubmit = async () => {
    setStep(5);
  };

  if (step === 5) {
    return <CompletionScreen user={user} onComplete={onComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top Navigation Header */}
      <header className="w-full h-16 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group transition" title="Ybex Home">
            <YbexLogo className="h-7 w-auto" />
          </Link>
          
          {step > 0 && step < 5 && (
            <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Step {step} of 4
              </span>
              <span>{stepLabels[step]}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {(step > 1 || (step === 1 && state.step1SubStep === 2)) && step < 5 && (
            <button
              type="button"
              onClick={() => prevStep()}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          {user?.email && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[200px] truncate font-medium">{user.email}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-2xs"
            title="Log out and return to login screen"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Dev Bypass */}
      {(import.meta as any).env?.VITE_ENABLE_DEV_BYPASS === 'true' && (
        <button 
          onClick={() => {
            saveCreatorProfileStep(user.user_id, {
              full_name: "Demo Creator",
              profile_status: "under_review",
              onboarding_complete: true
            });
            setStep(5);
          }}
          className="fixed bottom-4 left-4 z-50 bg-[#e0af68] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 shadow-lg hover:bg-[#ffc777]"
        >
          <Zap size={14} /> Skip to Dashboard (Dev Mode)
        </button>
      )}

      {/* Left Panel: Live Preview */}
      <div className="hidden lg:flex lg:col-span-6 p-8 flex-col items-center justify-center relative order-2 lg:order-1 border-r border-gray-100 dark:border-gray-800 lg:sticky lg:top-[80px] lg:h-[calc(100vh-80px)]">
        <div className="absolute inset-0 pointer-events-none"></div>
        <div className="w-full max-w-[320px] 2xl:max-w-[360px] relative z-10 flex flex-col items-center justify-center">
          <div className="absolute top-1/3 -left-24 sm:-left-32 xl:-left-44 z-20 flex flex-col items-center transform -rotate-12">
            <span 
              className="text-slate-800 dark:text-white font-extrabold text-lg xl:text-xl tracking-wide text-center leading-tight whitespace-nowrap drop-shadow-md"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              This is how brands<br/>will see your profile!
            </span>
            <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--violet)] mt-2 xl:w-[60px] xl:h-[60px]">
              <path d="M10,20 Q50,90 90,50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M70,35 L90,50 L75,70" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <LivePreviewCard />
        </div>
      </div>

      {/* Right Panel: Form Wizard */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)] order-1 lg:order-2">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          {/* Progress Bar - Desktop */}
          {step > 0 && step < 5 && (
            <div className="hidden md:flex items-center gap-3 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <React.Fragment key={i}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= i ? 'bg-[#3B82F6] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`}>
                    {i}
                  </div>
                  {i < 4 && (
                    <div className={`flex-1 h-1 rounded-full transition-all ${step > i ? 'bg-[#3B82F6]' : 'bg-[var(--bg-card)] border border-[var(--border-default)]'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Progress Bar & Header - Mobile */}
          {step > 0 && step < 5 && (
            <div className="md:hidden mb-6">
              <div className="flex items-center justify-between mb-4">
                {(step > 1 || (step === 1 && state.step1SubStep === 2)) ? (
                  <button
                    type="button"
                    onClick={() => prevStep()}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm active:scale-95 transition cursor-pointer"
                    aria-label="Go back"
                  >
                    <ChevronLeft size={20} />
                  </button>
                ) : (
                  <div className="w-10 h-10" />
                )}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Step {step} · {step === 1 && state.step1SubStep === 2 ? 'Content Niche' : (stepLabels[step] || 'Profile')}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      step >= i
                        ? 'bg-[var(--violet)]'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 0 && <PreStep_EmailVerify user={user} />}
              {step === 1 && <Step1_Identity user={user} />}
              {step === 2 && <Step2_Demographics user={user} />}
              {step === 3 && <Step3_SocialChannels user={user} />}
              {step === 4 && <Step4_RateCard user={user} onSubmit={handleSubmit} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
}
