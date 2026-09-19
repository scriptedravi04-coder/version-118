import React, { useState } from 'react';
import { useOnboardingStore } from '../../../store/useOnboardingStore';
import { saveCreatorProfileStep, uploadProfilePhoto } from '../../../api/onboarding';
import { toast } from 'sonner';

export default function MobileCreatorOnboarding({ user, onComplete }) {
  const store = useOnboardingStore();
  const step = store.step === 0 ? 1 : store.step; // Start at step 1 for mobile (skipping pre-step if any)
  
  const [loading, setLoading] = useState(false);

  const handleNext = async (currentStep) => {
    setLoading(true);
    let payload = {};
    if (currentStep === 1) {
      if (!store.fullName) { toast.error("Name is required"); setLoading(false); return; }
      payload = { full_name: store.fullName, dob: `${store.dobYear}-${store.dobMonth}-${store.dobDay}`, bio: store.bio, primary_niche: store.primaryNiche, avatar_url: store.photoUrl };
    } else if (currentStep === 2) {
      payload = { gender: store.gender, city: store.city, state: store.state, pincode: store.pinCode, languages: store.languages };
    } else if (currentStep === 3) {
      payload = { instagram_handle: store.instagramHandle, follower_count: store.followerCount, instagram_avg_reach: store.instagramAvgReach, youtube_channel_url: store.youtubeChannelUrl, youtube_subscribers: store.youtubeSubscribers };
    } else if (currentStep === 4) {
      payload = { reel_rate: store.reelRate, story_rate: store.storyRate, youtube_video_rate: store.youtubeVideoRate, barter_mode: store.barterMode };
    }

    try {
      await saveCreatorProfileStep(user.id || user.user_id, payload);
      if (currentStep === 4) {
         store.setStep(5);
      } else {
         store.setStep(currentStep + 1);
      }
    } catch (err) {
      toast.error("Failed to save step");
    }
    setLoading(false);
  };

  const handleSkip = (currentStep) => {
    store.setStep(currentStep + 1);
  };

  const renderProgressBar = (currentStep) => {
    return (
      <div className="flex gap-[5px]">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-sm ${i <= currentStep ? 'bg-[var(--violet)]' : 'bg-[#EDEDF2]'}`} />
        ))}
      </div>
    );
  };

  const Header = ({ currentStep, title, subtitle, stepName }) => (
    <div className="pt-3 px-5">
      <div className="h-9 flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl border border-[#E5E5E2] flex items-center justify-center cursor-pointer active:scale-95 transition-transform" onClick={() => store.setStep(Math.max(1, currentStep - 1))}>
          <svg width="8" height="14" viewBox="0 0 9 16" fill="none"><path d="M7.5 1L1.5 8l6 7" stroke="#0B0B0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg>
        </div>
        <div className="flex items-center gap-[6px] h-7 px-2.5 rounded-lg bg-[#F3EBFF]">
          <span className="font-bold text-[11px] text-[var(--violet)]">Creator</span>
        </div>
      </div>
      <div className="h-2"></div>
      {renderProgressBar(currentStep)}
      <div className="h-1.5"></div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-[11px] text-[#8A8A94]">Step {currentStep} of 5 &middot; {stepName}</span>
        {currentStep > 1 && currentStep < 5 && <span className="font-bold text-[11px] text-[var(--violet)] cursor-pointer" onClick={() => handleSkip(currentStep)}>Skip</span>}
      </div>
      <div className="h-2.5"></div>
      <div className="font-extrabold text-[22px] sm:text-[24px] leading-[1.2] text-[#0B0B0F] tracking-tight">{title}</div>
      <div className="h-1"></div>
      <div className="font-medium text-[13px] leading-[1.4] text-[#6B6B76]">{subtitle}</div>
    </div>
  );

  if (step === 1) {
    return (
      <div className="min-h-screen bg-white box-border flex flex-col justify-between relative font-sans">
        <div>
          <Header currentStep={1} stepName="Identity" title="Let's set up your profile" subtitle="Brands see this first when you apply." />
          <div className="px-5 pt-3 pb-24">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-[#F9F9FB] border-[1.5px] border-dashed border-[#D8D8DE] flex flex-col items-center justify-center gap-1 relative pb-1.5 box-border cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8.4" r="3.6" stroke="#8A8A94" strokeWidth="1.6"></circle><path d="M4 18.6c0-3.2 3.1-5 7-5s7 1.8 7 5" stroke="#8A8A94" strokeWidth="1.6" strokeLinecap="round"></path></svg>
                <span className="font-semibold text-[10px] text-[#8A8A94]">Add photo</span>
                <div className="absolute right-[-2px] bottom-[-4px] w-6 h-6 rounded-full bg-[var(--violet)] border-2 border-white flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3.4v9.2M3.4 8h9.2" stroke="#fff" strokeWidth="2" strokeLinecap="round"></path></svg>
                </div>
              </div>
            </div>
            <div className="h-3"></div>
            <div className="flex flex-col gap-2.5">
              <div className="h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3.5 flex flex-col justify-center gap-[2px] focus-within:bg-white focus-within:border-[1.5px] focus-within:border-[var(--violet)]">
                <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">Full name</div>
                <input value={store.fullName} onChange={(e) => store.updateField('fullName', e.target.value)} className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full" placeholder="Enter your name" />
              </div>
              
              <div className="h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3.5 flex items-center justify-between">
                <div className="flex flex-col justify-center gap-[2px] flex-1">
                  <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">Date of birth</div>
                  <input value={store.dobYear ? `${store.dobDay} / ${store.dobMonth} / ${store.dobYear}` : ""} readOnly className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full cursor-pointer placeholder:text-[#C6C6CE]" placeholder="DD / MM / YYYY" onClick={() => {store.updateField('dobDay', '01'); store.updateField('dobMonth', '01'); store.updateField('dobYear', '2000');}} />
                </div>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="shrink-0"><rect x="2.4" y="3.6" width="13.2" height="12" rx="2.6" stroke="#8A8A94" strokeWidth="1.6"></rect><path d="M2.4 7.4h13.2M6.2 2.4v2.4M11.8 2.4v2.4" stroke="#8A8A94" strokeWidth="1.6" strokeLinecap="round"></path></svg>
              </div>

              <div className="rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] pt-2 px-3.5 pb-2 focus-within:bg-white focus-within:border-[1.5px] focus-within:border-[var(--violet)]">
                <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">Bio</div>
                <div className="h-1"></div>
                <textarea value={store.bio} onChange={(e) => store.updateField('bio', e.target.value.slice(0, 160))} className="font-medium text-[13.5px] leading-[1.4] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full resize-none h-[38px]" placeholder="Anything you want brands to know" />
                <div className="flex justify-end"><span className="font-semibold text-[10px] text-[#C6C6CE]">{store.bio.length} / 160</span></div>
              </div>

              <div className="h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3.5 flex items-center justify-between">
                <div className="flex flex-col justify-center gap-[2px] flex-1">
                  <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">Primary niche</div>
                  <input value={store.primaryNiche[0] || ""} readOnly onClick={() => store.updateField('primaryNiche', ['Beauty & Skincare'])} className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full cursor-pointer placeholder:text-[#C6C6CE]" placeholder="Select niche" />
                </div>
                <svg width="10" height="6" viewBox="0 0 12 7" fill="none" className="shrink-0"><path d="M1 1l5 5 5-5" stroke="#8A8A94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="fixed sm:static bottom-0 left-0 right-0 border-t border-[#F0F0F3] pt-3 px-5 pb-5 sm:pb-6 bg-white z-20">
          <button onClick={() => handleNext(1)} className="w-full h-[48px] rounded-xl bg-[var(--violet)] flex items-center justify-center font-bold text-[15px] text-white active:scale-95 transition-transform cursor-pointer shadow-sm">
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const genders = ['Female', 'Male', 'Other'];
    const langs = ['Hindi', 'English', 'Kannada', 'Tamil', 'Telugu', 'Marathi', 'Bengali'];
    
    return (
      <div className="min-h-screen bg-white box-border flex flex-col justify-between relative font-sans">
        <div>
          <Header currentStep={2} stepName="Demographics" title="Where are you based?" subtitle="Brands filter by city and language." />
          <div className="px-5 pt-3 pb-24">
            <div className="font-bold text-[10.5px] leading-none tracking-[1px] uppercase text-[#A0A0AA]">Gender</div>
            <div className="h-2"></div>
            <div className="flex gap-2">
              {genders.map(g => (
                <div key={g} onClick={() => store.updateField('gender', g)} className={`flex-1 h-10 rounded-xl flex items-center justify-center font-bold text-[13px] cursor-pointer transition-all ${store.gender === g ? 'bg-[var(--violet)] text-white' : 'bg-[#F9F9FB] border border-[#EDEDF2] text-[#6B6B76]'}`}>
                  {g}
                </div>
              ))}
            </div>

            <div className="h-3"></div>
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2.5">
                <div className="flex-[1.35] h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3.5 flex flex-col justify-center gap-[2px] focus-within:bg-white focus-within:border-[1.5px] focus-within:border-[var(--violet)]">
                  <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">City</div>
                  <input value={store.city} onChange={(e) => store.updateField('city', e.target.value)} className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full placeholder:text-[#C6C6CE]" placeholder="City" />
                </div>
                <div className="flex-1 h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3 flex items-center justify-between">
                  <div className="flex flex-col justify-center gap-[2px] min-w-0">
                    <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA]">State</div>
                    <input value={store.state} readOnly onClick={() => store.updateField('state', 'KA')} className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] bg-transparent outline-none p-0 m-0 w-full placeholder:text-[#C6C6CE]" placeholder="State" />
                  </div>
                  <svg width="10" height="6" viewBox="0 0 12 7" fill="none" className="shrink-0"><path d="M1 1l5 5 5-5" stroke="#8A8A94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                </div>
              </div>
              
              <div className="h-12 rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] px-3.5 flex flex-col justify-center gap-[2px] focus-within:bg-[#FFF7F0] focus-within:border-[1.5px] focus-within:border-[#F6DFC8]">
                <div className="font-semibold text-[10.5px] leading-none text-[#A0A0AA] focus-within:text-[#D97706]">Pincode</div>
                <input value={store.pinCode} onChange={(e) => store.updateField('pinCode', e.target.value)} className="font-medium text-[14px] leading-[1.2] text-[#0B0B0F] focus-within:text-[#D97706] bg-transparent outline-none p-0 m-0 w-full placeholder:text-[#C6C6CE]" placeholder="6 digits" maxLength={6} />
              </div>
            </div>

            <div className="h-3.5"></div>
            <div className="flex items-baseline justify-between">
              <div className="font-bold text-[10.5px] leading-none tracking-[1px] uppercase text-[#A0A0AA]">Languages spoken</div>
              <span className="font-semibold text-[11px] text-[#8A8A94]">{store.languages.length} selected</span>
            </div>
            <div className="h-2"></div>
            <div className="flex gap-1.5 flex-wrap">
              {langs.map(l => {
                const isSelected = store.languages.includes(l);
                return (
                  <div key={l} onClick={() => {
                    if (isSelected) store.updateField('languages', store.languages.filter(x => x !== l));
                    else store.updateField('languages', [...store.languages, l]);
                  }} className={`h-8 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${isSelected ? 'bg-[var(--violet)] font-bold text-[12.5px] text-white' : 'bg-[#F9F9FB] border border-[#EDEDF2] font-medium text-[12.5px] text-[#6B6B76]'}`}>
                    {l}
                    {isSelected && <svg width="10" height="7" viewBox="0 0 12 9" fill="none"><path d="M1 4.6L4.2 7.8 11 1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="fixed sm:static bottom-0 left-0 right-0 border-t border-[#F0F0F3] pt-3 px-5 pb-5 sm:pb-6 bg-white z-20">
          <button onClick={() => handleNext(2)} className="w-full h-[48px] rounded-xl bg-[var(--violet)] flex items-center justify-center font-bold text-[15px] text-white active:scale-95 transition-transform cursor-pointer shadow-sm">
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-white box-border flex flex-col justify-between relative font-sans">
        <div>
          <Header currentStep={3} stepName="Channels" title="Add your channels" subtitle="Connect to auto-fill stats, or enter them yourself." />
          <div className="px-5 pt-3 pb-24">
            
            <div className={`rounded-2xl p-3.5 transition-all ${store.instagramHandle ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.instagramHandle ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="2.4" y="2.4" width="13.2" height="13.2" rx="4" stroke="#0B0B0F" strokeWidth="1.6"></rect><circle cx="9" cy="9" r="3.2" stroke="#0B0B0F" strokeWidth="1.6"></circle></svg>
                </div>
                <div className="flex-1 font-bold text-[14.5px] text-[#0B0B0F]">Instagram</div>
                <div className={`h-7 px-3 rounded-lg flex items-center font-bold text-xs cursor-pointer ${store.instagramHandle ? 'bg-white border border-[#E5E5E2] text-[var(--violet)]' : 'bg-[var(--violet)] text-white'}`} onClick={() => store.updateField('instagramHandle', '@ananyacreates')}>
                  Connect
                </div>
              </div>
              <div className="h-2.5"></div>
              <div className="flex flex-col gap-2">
                <div className={`h-11 rounded-xl px-3 flex flex-col justify-center gap-[1px] ${store.instagramHandle ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                  <div className="font-semibold text-[10px] leading-none text-[#A0A0AA]">Handle</div>
                  <input value={store.instagramHandle} onChange={(e) => store.updateField('instagramHandle', e.target.value)} className={`font-medium text-[13.5px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.instagramHandle ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="@handle" />
                </div>
                <div className="flex gap-2">
                  <div className={`flex-1 h-11 rounded-xl px-3 flex flex-col justify-center gap-[1px] ${store.instagramHandle ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                    <div className="font-semibold text-[10px] leading-none text-[#A0A0AA]">Followers</div>
                    <input value={store.followerCount} onChange={(e) => store.updateField('followerCount', e.target.value)} className={`font-medium text-[13.5px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.instagramHandle ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="e.g. 10,000" />
                  </div>
                  <div className={`flex-1 h-11 rounded-xl px-3 flex flex-col justify-center gap-[1px] ${store.instagramHandle ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                    <div className="font-semibold text-[10px] leading-none text-[#A0A0AA]">Avg. reach</div>
                    <input value={store.instagramAvgReach} onChange={(e) => store.updateField('instagramAvgReach', e.target.value)} className={`font-medium text-[13.5px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.instagramHandle ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="e.g. 5,000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-2.5"></div>
            
            <div className={`rounded-2xl p-3.5 transition-all ${store.youtubeChannelUrl ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.youtubeChannelUrl ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><rect x="1.8" y="4" width="14.4" height="10" rx="3" stroke="#0B0B0F" strokeWidth="1.6"></rect><path d="M7.6 6.8l3.6 2.2-3.6 2.2V6.8z" fill="#0B0B0F"></path></svg>
                </div>
                <div className="flex-1 font-bold text-[14.5px] text-[#0B0B0F]">YouTube</div>
                <div className={`h-7 px-3 rounded-lg flex items-center font-bold text-xs cursor-pointer ${store.youtubeChannelUrl ? 'bg-white border border-[#E5E5E2] text-[var(--violet)]' : 'bg-white border border-[#E5E5E2] text-[var(--violet)]'}`} onClick={() => store.updateField('youtubeChannelUrl', 'youtube.com/@ananya')}>
                  Connect
                </div>
              </div>
              <div className="h-2.5"></div>
              <div className="flex flex-col gap-2">
                <div className={`h-11 rounded-xl px-3 flex flex-col justify-center gap-[1px] ${store.youtubeChannelUrl ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                  <div className="font-semibold text-[10px] leading-none text-[#A0A0AA]">Channel URL</div>
                  <input value={store.youtubeChannelUrl} onChange={(e) => store.updateField('youtubeChannelUrl', e.target.value)} className={`font-medium text-[13.5px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.youtubeChannelUrl ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="youtube.com/@…" />
                </div>
                <div className={`h-11 rounded-xl px-3 flex flex-col justify-center gap-[1px] ${store.youtubeChannelUrl ? 'bg-white border border-[#E5E5E2]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                  <div className="font-semibold text-[10px] leading-none text-[#A0A0AA]">Subscribers</div>
                  <input value={store.youtubeSubscribers} onChange={(e) => store.updateField('youtubeSubscribers', e.target.value)} className={`font-medium text-[13.5px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.youtubeChannelUrl ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="e.g. 12,000" />
                </div>
              </div>
            </div>
            
            <div className="h-2.5"></div>
            <div className="h-11 rounded-xl bg-white border-[1.5px] border-dashed border-[#D8D8DE] flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3.4v9.2M3.4 8h9.2" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"></path></svg>
              <span className="font-bold text-[13px] text-[var(--violet)]">Add other platform</span>
            </div>
          </div>
        </div>

        <div className="fixed sm:static bottom-0 left-0 right-0 border-t border-[#F0F0F3] pt-3 px-5 pb-5 sm:pb-6 bg-white z-20">
          <button onClick={() => handleNext(3)} className="w-full h-[48px] rounded-xl bg-[var(--violet)] flex items-center justify-center font-bold text-[15px] text-white active:scale-95 transition-transform cursor-pointer shadow-sm">
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-white box-border flex flex-col justify-between relative font-sans">
        <div>
          <Header currentStep={4} stepName="Rate card" title="What do you charge?" subtitle="Only brands you apply to can see this. Change it anytime." />
          <div className="px-5 pt-3 pb-24">
            <div className="flex flex-col gap-2.5">
              <div className={`h-14 rounded-xl px-3.5 flex items-center gap-2.5 ${store.reelRate ? 'bg-white border-[1.5px] border-[var(--violet)]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.reelRate ? 'bg-[#F3EBFF]' : 'bg-white border border-[#E5E5E2]'}`}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.6" y="1.6" width="12.8" height="12.8" rx="4" stroke={store.reelRate ? '#7C3AED' : '#6B6B76'} strokeWidth="1.5"></rect><path d="M6.6 5.6l4.2 2.4-4.2 2.4V5.6z" fill={store.reelRate ? '#7C3AED' : '#6B6B76'}></path></svg>
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className={`font-semibold text-[10.5px] leading-none ${store.reelRate ? 'text-[var(--violet)]' : 'text-[#A0A0AA]'}`}>1 Instagram Reel</div>
                  <div className="flex items-center mt-0.5">
                    <span className={`font-bold text-[15px] leading-[1.2] mr-1 ${store.reelRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE]'}`}>₹</span>
                    <input value={store.reelRate} onChange={(e) => store.updateField('reelRate', e.target.value)} type="number" className={`font-bold text-[15px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.reelRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="5,000" />
                  </div>
                </div>
              </div>

              <div className={`h-14 rounded-xl px-3.5 flex items-center gap-2.5 ${store.storyRate ? 'bg-white border-[1.5px] border-[var(--violet)]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.storyRate ? 'bg-[#F3EBFF]' : 'bg-white border border-[#E5E5E2]'}`}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="3.2" y="1.6" width="9.6" height="12.8" rx="3" stroke={store.storyRate ? '#7C3AED' : '#6B6B76'} strokeWidth="1.5"></rect></svg>
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className={`font-semibold text-[10.5px] leading-none ${store.storyRate ? 'text-[var(--violet)]' : 'text-[#A0A0AA]'}`}>1 Instagram Story</div>
                  <div className="flex items-center mt-0.5">
                    <span className={`font-bold text-[15px] leading-[1.2] mr-1 ${store.storyRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE]'}`}>₹</span>
                    <input value={store.storyRate} onChange={(e) => store.updateField('storyRate', e.target.value)} type="number" className={`font-bold text-[15px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.storyRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="1,500" />
                  </div>
                </div>
              </div>

              <div className={`h-14 rounded-xl px-3.5 flex items-center gap-2.5 ${store.youtubeVideoRate ? 'bg-white border-[1.5px] border-[var(--violet)]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${store.youtubeVideoRate ? 'bg-[#F3EBFF]' : 'bg-white border border-[#E5E5E2]'}`}>
                  <svg width="15" height="15" viewBox="0 0 18 18" fill="none"><rect x="1.8" y="4" width="14.4" height="10" rx="3" stroke={store.youtubeVideoRate ? '#7C3AED' : '#6B6B76'} strokeWidth="1.6"></rect><path d="M7.6 6.8l3.6 2.2-3.6 2.2V6.8z" fill={store.youtubeVideoRate ? '#7C3AED' : '#6B6B76'}></path></svg>
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className={`font-semibold text-[10.5px] leading-none ${store.youtubeVideoRate ? 'text-[var(--violet)]' : 'text-[#A0A0AA]'}`}>1 YouTube Video</div>
                  <div className="flex items-center mt-0.5">
                    <span className={`font-bold text-[15px] leading-[1.2] mr-1 ${store.youtubeVideoRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE]'}`}>₹</span>
                    <input value={store.youtubeVideoRate} onChange={(e) => store.updateField('youtubeVideoRate', e.target.value)} type="number" className={`font-bold text-[15px] leading-[1.2] bg-transparent outline-none p-0 m-0 w-full ${store.youtubeVideoRate ? 'text-[#0B0B0F]' : 'text-[#C6C6CE] placeholder:text-[#C6C6CE]'}`} placeholder="25,000" />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-3"></div>
            <div className="rounded-xl bg-[#F9F9FB] border border-[#EDEDF2] p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-[13.5px] leading-[1.3] text-[#0B0B0F]">Open to barter collabs?</div>
                <div className="font-medium text-[11.5px] leading-[1.4] text-[#8A8A94] mt-0.5">Product or service instead of cash</div>
              </div>
              <div onClick={() => store.updateField('barterMode', store.barterMode === 'barter_friendly' ? 'cash_only' : 'barter_friendly')} className={`w-[44px] h-[26px] rounded-[13px] p-[2px] box-border flex shrink-0 cursor-pointer transition-all ${store.barterMode === 'barter_friendly' ? 'bg-[var(--violet)] justify-end' : 'bg-[#E5E5E2] justify-start'}`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed sm:static bottom-0 left-0 right-0 border-t border-[#F0F0F3] pt-3 px-5 pb-5 sm:pb-6 bg-white z-20">
          <button onClick={() => handleNext(4)} className="w-full h-[48px] rounded-xl bg-[var(--violet)] flex items-center justify-center font-bold text-[15px] text-white active:scale-95 transition-transform cursor-pointer shadow-sm">
            {loading ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="min-h-screen bg-white box-border flex flex-col justify-between pt-4 px-5 pb-6 relative overflow-hidden font-sans">
        <div className="absolute left-[-60px] top-[80px] w-[240px] h-[240px] rounded-full bg-[#F6F1FF] pointer-events-none"></div>
        <div className="absolute right-[-70px] top-[240px] w-[200px] h-[200px] rounded-full bg-[#FAF7FF] pointer-events-none"></div>
        
        <div>
          <div className="flex gap-[5px] relative">
            <div className="flex-1 h-1 rounded-sm bg-[var(--violet)]"></div>
            <div className="flex-1 h-1 rounded-sm bg-[var(--violet)]"></div>
            <div className="flex-1 h-1 rounded-sm bg-[var(--violet)]"></div>
            <div className="flex-1 h-1 rounded-sm bg-[var(--violet)]"></div>
            <div className="flex-1 h-1 rounded-sm bg-[var(--violet)]"></div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6 relative">
          <div className="w-[84px] h-[84px] rounded-full bg-[var(--violet)] flex items-center justify-center shadow-[0_12px_28px_rgba(124,58,237,0.25)]">
            <svg className="animate-[dash_0.4s_ease-out_forwards]" width="38" height="28" viewBox="0 0 12 9" fill="none" strokeDasharray="30" strokeDashoffset="0"><path d="M1 4.6L4.2 7.8 11 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          </div>
          
          <div className="h-4"></div>
          <div className="font-extrabold text-[24px] leading-[1.2] text-[#0B0B0F] tracking-tight text-center">You're all set, {store.fullName?.split(' ')[0] || "Creator"}</div>
          <div className="h-1.5"></div>
          <div className="font-medium text-[13.5px] leading-[1.5] text-[#6B6B76] text-center max-w-[280px]">
            Your profile is live. Brands matching {store.primaryNiche[0] || 'your niche'} can find you now.
          </div>
          
          <div className="h-4"></div>
          
          <div className="w-full rounded-2xl bg-[#F9F9FB] border border-[#EDEDF2] p-3.5 flex items-center">
            <div className="flex-1 text-center">
              <div className="font-extrabold text-[17px] leading-none text-[#0B0B0F]">42</div>
              <div className="font-semibold text-[10.5px] text-[#8A8A94] mt-1">Open briefs</div>
            </div>
            <div className="w-px h-7 bg-[#E5E5E2]"></div>
            <div className="flex-1 text-center">
              <div className="font-extrabold text-[17px] leading-none text-[#0B0B0F]">94%</div>
              <div className="font-semibold text-[10.5px] text-[#8A8A94] mt-1">Top match</div>
            </div>
            <div className="w-px h-7 bg-[#E5E5E2]"></div>
            <div className="flex-1 text-center">
              <div className="font-extrabold text-[17px] leading-none text-[#0B0B0F]">₹0</div>
              <div className="font-semibold text-[10.5px] text-[#8A8A94] mt-1">Platform fee</div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button onClick={onComplete} className="w-full h-[50px] rounded-xl bg-[var(--violet)] flex items-center justify-center font-bold text-[15.5px] text-white active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.2)] cursor-pointer">
            Go to Dashboard
          </button>
          <div className="h-2.5"></div>
          <div className="text-center font-semibold text-[12.5px] text-[#8A8A94]">
            Verify KYC later from Profile
          </div>
        </div>
      </div>
    );
  }

  return null;
}
