import { create } from 'zustand';
import { safeJsonParse } from "../utils/safeFormat";

interface OnboardingState {
  step: number;
  step1SubStep: number;
  emailVerified: boolean;
  
  // Step 1
  fullName: string;
  username: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  photoUrl: string;
  bio: string;
  primaryNiche: string[];
  gender: string;

  // Step 2
  city: string;
  state: string;
  pinCode: string;
  languages: string[];

  // Step 3
  instagramHandle: string;
  followerCount: number | "";
  instagramAvgReach: number | "";
  instagramAvgLikes: number | "";
  instagramAvgComments: number | "";
  instagramVerified: boolean;
  instagramConnectedVia: 'oauth' | 'manual' | null;

  youtubeConnected: boolean;
  youtubeChannelUrl: string;
  youtubeSubscribers: number | "";
  youtubeAvgViews: number | "";
  youtubeConnectedVia: 'oauth' | 'manual' | null;

  otherPlatforms: {
    twitter: string;
    x: string;
    threads: string;
    moj: string;
    sharechat: string;
    linkedin: string;
    snapchat: string;
    facebook: string;
  };

  // Step 4
  reelRate: number | '';
  storyRate: number | '';
  youtubeVideoRate: number | '';
  barterMode: 'cash_only' | 'barter_friendly' | 'partial_barter';

  // Actions
  setStep: (step: number) => void;
  setStep1SubStep: (subStep: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateField: (field: keyof OnboardingState, value: any) => void;
  updateOtherPlatform: (platform: keyof OnboardingState['otherPlatforms'], value: string) => void;
  loadSavedState: (userId: string) => void;
  saveStateToStorage: (userId: string) => void;
  clearState: (userId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 1, // Default to 1 (profile) since email verify is handled or bypassed
  step1SubStep: 1,
  emailVerified: false,
  
  fullName: '',
  username: '',
  dobDay: '',
  dobMonth: '',
  dobYear: '',
  photoUrl: '',
  bio: '',
  primaryNiche: [],
  gender: '',

  city: '',
  state: '',
  pinCode: '',
  languages: [],

  instagramHandle: '',
  followerCount: "",
  instagramAvgReach: "",
  instagramAvgLikes: "",
  instagramAvgComments: "",
  instagramVerified: false,
  instagramConnectedVia: null,

  youtubeConnected: false,
  youtubeChannelUrl: '',
  youtubeSubscribers: "",
  youtubeAvgViews: "",
  youtubeConnectedVia: null,

  otherPlatforms: {
    twitter: '',
    x: '',
    threads: '',
    moj: '',
    sharechat: '',
    linkedin: '',
    snapchat: '',
    facebook: '',
  },

  reelRate: '',
  storyRate: '',
  youtubeVideoRate: '',
  barterMode: 'cash_only',

  setStep: (step) => {
    set({ step });
    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        get().saveStateToStorage(saved);
      }
    } catch(e) {}
  },
  setStep1SubStep: (step1SubStep) => {
    set({ step1SubStep });
    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        get().saveStateToStorage(saved);
      }
    } catch(e) {}
  },
  nextStep: () => set((state) => {
    const newStep = Math.min(5, state.step + 1);
    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        const fullState = { ...state, step: newStep };
        localStorage.setItem(`ybex_creator_onboarding_${saved}`, JSON.stringify(fullState));
      }
    } catch(e) {}
    return { step: newStep };
  }),
  prevStep: () => set((state) => {
    let newStep = state.step;
    let newSubStep = state.step1SubStep || 1;

    if (state.step === 1) {
      if (newSubStep === 2) {
        newSubStep = 1;
      } else {
        // Already at Step 1 SubStep 1 - stay on Step 1, never drop back to Step 0 (OTP)
        return state;
      }
    } else if (state.step === 2) {
      newStep = 1;
      newSubStep = 2;
    } else if (state.step === 3) {
      newStep = 2;
    } else if (state.step === 4) {
      newStep = 3;
    } else if (state.step > 4) {
      newStep = 4;
    }

    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        const fullState = { ...state, step: newStep, step1SubStep: newSubStep };
        localStorage.setItem(`ybex_creator_onboarding_${saved}`, JSON.stringify(fullState));
      }
    } catch(e) {}
    return { step: newStep, step1SubStep: newSubStep };
  }),
  updateField: (field, value) => {
    set({ [field]: value });
    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        get().saveStateToStorage(saved);
      }
    } catch(e) {}
  },
  updateOtherPlatform: (platform, value) => {
    set((state) => ({
      otherPlatforms: { ...state.otherPlatforms, [platform]: value }
    }));
    try {
      const saved = localStorage.getItem('ybex_active_user_id');
      if (saved) {
        get().saveStateToStorage(saved);
      }
    } catch(e) {}
  },

  loadSavedState: (userId: string) => {
    if (!userId) return;
    try {
      localStorage.setItem('ybex_active_user_id', userId);
      const raw = localStorage.getItem(`ybex_creator_onboarding_${userId}`);
      if (raw) {
        const parsed = safeJsonParse(raw, null);
        if (parsed && typeof parsed === 'object') {
          // Never drop below step 1 on load
          const stepVal = parsed.step !== undefined && parsed.step >= 1 ? parsed.step : 1;
          set((state) => ({
            ...state,
            ...parsed,
            step: stepVal,
            step1SubStep: parsed.step1SubStep || 1
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to load saved onboarding state:", e);
    }
  },

  saveStateToStorage: (userId: string) => {
    if (!userId) return;
    try {
      const state = get();
      const payload = {
        step: state.step,
        step1SubStep: state.step1SubStep,
        emailVerified: state.emailVerified,
        fullName: state.fullName,
        username: state.username,
        dobDay: state.dobDay,
        dobMonth: state.dobMonth,
        dobYear: state.dobYear,
        photoUrl: state.photoUrl,
        bio: state.bio,
        primaryNiche: state.primaryNiche,
        gender: state.gender,
        city: state.city,
        state: state.state,
        pinCode: state.pinCode,
        languages: state.languages,
        instagramHandle: state.instagramHandle,
        followerCount: state.followerCount,
        instagramAvgReach: state.instagramAvgReach,
        instagramAvgLikes: state.instagramAvgLikes,
        instagramAvgComments: state.instagramAvgComments,
        instagramVerified: state.instagramVerified,
        instagramConnectedVia: state.instagramConnectedVia,
        youtubeConnected: state.youtubeConnected,
        youtubeChannelUrl: state.youtubeChannelUrl,
        youtubeSubscribers: state.youtubeSubscribers,
        youtubeAvgViews: state.youtubeAvgViews,
        youtubeConnectedVia: state.youtubeConnectedVia,
        otherPlatforms: state.otherPlatforms,
        reelRate: state.reelRate,
        storyRate: state.storyRate,
        youtubeVideoRate: state.youtubeVideoRate,
        barterMode: state.barterMode,
      };
      localStorage.setItem(`ybex_creator_onboarding_${userId}`, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save onboarding state to storage:", e);
    }
  },

  clearState: (userId: string) => {
    if (!userId) return;
    try {
      localStorage.removeItem(`ybex_creator_onboarding_${userId}`);
    } catch(e) {}
  }
}));
