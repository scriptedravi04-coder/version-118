import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, Zap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LivePreviewCard from "../../components/onboarding/LivePreviewCard";
import BrandLivePreview from "../../components/Onboarding/BrandLivePreview";
import PreStep_EmailVerify from "../../components/onboarding/PreStep_EmailVerify";
import YbexLogo from "../../components/layout/YbexLogo";
import { useOnboardingStore } from "../../store/useOnboardingStore";

export default function VerifyEmail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setStep } = useOnboardingStore();

  const roleParam = searchParams.get("role") || user?.role || "creator";
  const isBrand = roleParam.toLowerCase() === "brand";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDevBypass = () => {
    setStep(1);
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-sans relative overflow-hidden">
      {/* Header Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-background/50 backdrop-blur-md z-20">
        <Link to="/" className="flex items-center gap-2">
          <YbexLogo size="md" />
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-red-600 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer bg-white shadow-sm"
        >
          <LogOut size={14} /> Log Out
        </button>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 bg-[var(--bg-base)]">
        {/* Dev Mode Bypass */}
        {import.meta.env?.DEV && (
          <button 
            onClick={handleDevBypass}
            className="fixed bottom-4 left-4 z-50 bg-[#e0af68] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1 shadow-lg hover:bg-[#ffc777] cursor-pointer"
          >
            <Zap size={14} /> Skip to Dashboard (Dev Mode)
          </button>
        )}

        {/* Left Panel: Live Preview Card */}
        <div className="hidden lg:flex lg:col-span-7 p-8 flex-col items-center justify-center relative overflow-hidden order-2 lg:order-1 border-r border-gray-100 dark:border-gray-800">
          <div className="w-full max-w-[340px] 2xl:max-w-[380px] relative z-10 -translate-y-2">
            <div className="absolute top-1/4 -left-24 sm:-left-32 xl:-left-44 z-20 flex flex-col items-center transform -rotate-12 pointer-events-none">
              <span 
                className="text-slate-800 dark:text-white font-extrabold text-lg xl:text-xl tracking-wide text-center leading-tight whitespace-nowrap drop-shadow-md"
                style={{ fontFamily: "'Caveat', cursive" }}
              >
                {isBrand ? (
                  <>This is how creators<br/>will see your brand!</>
                ) : (
                  <>This is how brands<br/>will see your profile!</>
                )}
              </span>
              <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--violet)] mt-2 xl:w-[60px] xl:h-[60px]">
                <path d="M10,20 Q50,90 90,50" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M70,35 L90,50 L75,70" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isBrand ? (
              <BrandLivePreview formData={{ companyName: user?.company_name || user?.name || '', logoUrl: user?.picture || user?.logo_url, website: user?.website || '' }} />
            ) : (
              <LivePreviewCard />
            )}
          </div>
        </div>

        {/* Right Panel: Email Verification Form */}
        <div className="lg:col-span-5 flex flex-col justify-center py-12 px-6 lg:px-12 h-full overflow-y-auto order-1 lg:order-2">
          <div className="w-full max-w-sm sm:max-w-md mx-auto">
            <PreStep_EmailVerify user={user} />
          </div>
        </div>

      </div>
    </div>
  );
}

