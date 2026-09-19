import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import CreatorOnboarding from "../../pages/onboarding/CreatorOnboarding";
import CreatorOnboardingMobile from "../../pages/onboarding/CreatorOnboardingMobile";
import BrandOnboardingFlow from "../../components/Onboarding/BrandOnboardingFlow";
import BrandOnboardingMobile from "../../pages/onboarding/BrandOnboardingMobile";
import useIsMobile from "../../hooks/useIsMobile";
import { LogOut } from "lucide-react";

export default function Onboarding() {
  const { user, refreshUser, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    // If they finish onboarding, send them off
    if (user?.onboarding_completed || user?.onboarding_complete || user?.onboarded) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">Loading...</div>;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans relative overflow-x-hidden w-full max-w-full">
      {user?.role === 'brand' ? (
        isMobile ? (
          <BrandOnboardingMobile
            user={user}
            onComplete={async () => {
              setUser({ ...user, onboarding_completed: true });
              try { await refreshUser(); } catch(e){}
            }}
          />
        ) : (
          <BrandOnboardingFlow 
            user={user} 
            onComplete={async () => {
              setUser({ ...user, onboarding_completed: true });
              try { await refreshUser(); } catch(e){}
              navigate('/dashboard');
            }} 
          />
        )
      ) : isMobile ? (
        <CreatorOnboardingMobile
          user={user}
          onComplete={async () => {
            setUser({ ...user, onboarding_completed: true });
            try { await refreshUser(); } catch(e){}
          }}
        />
      ) : (
        <CreatorOnboarding 
          user={user} 
          onComplete={async () => {
            setUser({ ...user, onboarding_completed: true });
            try { await refreshUser(); } catch(e){}
            navigate('/dashboard');
          }} 
        />
      )}
      
      <button
        onClick={() => logout()}
        className="hidden sm:flex fixed bottom-4 left-4 z-50 items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg shadow-sm border border-red-100 transition-colors text-xs font-semibold dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/40"
      >
        <LogOut size={14} />
        Log Out
      </button>
    </div>
  );
}
