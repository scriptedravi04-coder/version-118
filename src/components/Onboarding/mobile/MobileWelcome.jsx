import React from 'react';
import { Link } from 'react-router-dom';

export default function MobileWelcome({ role, setRole, onEmailSignup, onGoogleLogin }) {
  return (
    <div className="min-h-screen bg-white box-border flex flex-col pt-24 px-5 pb-8 relative overflow-hidden font-sans">
      <div>
        <h1 className="font-extrabold text-[28px] sm:text-[32px] leading-[1.2] text-[#0B0B0F] tracking-tight">
          Welcome to Ybex
        </h1>
        <p className="mt-2 font-medium text-[15px] leading-[1.5] text-[#6B6B76]">
          Tell us who you are. This sets up your whole workspace.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <div 
          onClick={() => setRole("creator")}
          className={`rounded-3xl p-[18px] flex gap-[14px] items-center cursor-pointer transition-all ${role === 'creator' ? 'bg-white border-[1.5px] border-[var(--violet)] shadow-[0_1px_2px_rgba(124,58,237,0.1)]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}
        >
          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${role === 'creator' ? 'bg-[#F3EBFF]' : 'bg-white border border-[#E5E5E2]'}`}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="3.6" stroke={role === 'creator' ? '#7C3AED' : '#6B6B76'} strokeWidth="1.7"></circle><path d="M3.6 19.4c0-3.6 3.3-5.6 7.4-5.6s7.4 2 7.4 5.6" stroke={role === 'creator' ? '#7C3AED' : '#6B6B76'} strokeWidth="1.7" strokeLinecap="round"></path></svg>
          </div>
          <div className="flex-1">
            <div className="font-bold text-[17px] leading-[1.3] text-[#0B0B0F]">I am a Creator</div>
            <div className="h-[3px]"></div>
            <div className="font-medium text-[13px] leading-[1.45] text-[#6B6B76]">Apply to briefs, deliver, get paid.</div>
          </div>
          <div className={`w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center ${role === 'creator' ? 'bg-[var(--violet)]' : 'border-[1.5px] border-[#D8D8DE]'}`}>
            {role === 'creator' && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.6L4.2 7.8 11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
          </div>
        </div>

        <div 
          onClick={() => setRole("brand")}
          className={`rounded-3xl p-[18px] flex gap-[14px] items-center cursor-pointer transition-all ${role === 'brand' ? 'bg-white border-[1.5px] border-[var(--violet)] shadow-[0_1px_2px_rgba(124,58,237,0.1)]' : 'bg-[#F9F9FB] border border-[#EDEDF2]'}`}
        >
          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${role === 'brand' ? 'bg-[#F3EBFF]' : 'bg-white border border-[#E5E5E2]'}`}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="6.5" width="16" height="12.5" rx="2.5" stroke={role === 'brand' ? '#7C3AED' : '#6B6B76'} strokeWidth="1.7"></rect><path d="M8 6.5V4.8A1.8 1.8 0 019.8 3h2.4A1.8 1.8 0 0114 4.8v1.7" stroke={role === 'brand' ? '#7C3AED' : '#6B6B76'} strokeWidth="1.7" strokeLinecap="round"></path></svg>
          </div>
          <div className="flex-1">
            <div className="font-bold text-[17px] leading-[1.3] text-[#0B0B0F]">I am a Brand</div>
            <div className="h-[3px]"></div>
            <div className="font-medium text-[13px] leading-[1.45] text-[#6B6B76]">Post campaigns, hire creators.</div>
          </div>
          <div className={`w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center ${role === 'brand' ? 'bg-[var(--violet)]' : 'border-[1.5px] border-[#D8D8DE]'}`}>
            {role === 'brand' && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.6L4.2 7.8 11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={onGoogleLogin}
          className="w-full h-[54px] rounded-2xl bg-white border border-[#E5E5E2] flex items-center justify-center gap-2.5 active:scale-95 transition-transform cursor-pointer hover:bg-gray-50/80"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8a4.1 4.1 0 01-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" fill="#4285F4"></path><path d="M9 18c2.4 0 4.5-.8 6-2.3l-2.9-2.2c-.8.55-1.85.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 009 18z" fill="#34A853"></path><path d="M3.9 10.6a5.4 5.4 0 010-3.2V5.1H.9a9 9 0 000 7.8l3-2.3z" fill="#FBBC05"></path><path d="M9 3.6c1.3 0 2.5.45 3.4 1.35l2.6-2.6A9 9 0 00.9 5.1l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" fill="#EA4335"></path></svg>
          <span className="font-bold text-[15px] text-[#0B0B0F]">Continue with Google</span>
        </button>
      </div>

      <div className="my-4 flex items-center gap-[14px]">
        <div className="flex-1 h-px bg-[#E5E5E2]"></div>
        <span className="font-semibold text-xs text-[#A0A0AA]">or</span>
        <div className="flex-1 h-px bg-[#E5E5E2]"></div>
      </div>

      <button 
        onClick={onEmailSignup}
        className="w-full h-[54px] rounded-2xl bg-[var(--violet)] flex items-center justify-center font-bold text-[16px] text-white active:scale-95 transition-transform shadow-[0_4px_15px_rgba(124,58,237,0.2)] cursor-pointer hover:bg-[var(--violet-hover)]"
      >
        Sign up with email
      </button>

      <div className="flex-1 min-h-[24px]"></div>
      <div className="pt-4 pb-2 text-center font-medium text-sm text-[#6B6B76]">
        Already have an account? <Link to="/login" className="font-bold text-[var(--violet)] hover:underline">Log in</Link>
      </div>
    </div>
  );
}
