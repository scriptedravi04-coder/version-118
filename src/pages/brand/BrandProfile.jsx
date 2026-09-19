import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { 
  Building, MapPin, Globe, CheckCircle, ShieldCheck, Briefcase, Plus, 
  ExternalLink, Edit2, Camera, Loader2, ListCollapse, Share2
} from "lucide-react";
import AgencyBadge from "../../components/common/AgencyBadge";
import useIsMobile from "../../hooks/useIsMobile";
import BrandProfileMobile from "../../components/profile/mobile/BrandProfileMobile";

export default function BrandProfile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBrandProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data = null;
      if (supabase) {
        const res = await supabase.from('brand_profiles').select('*').eq('user_id', user.user_id).maybeSingle();
        if (res?.data) data = res.data;
      }
      if (!data) {
        const res = await api.get("brands/me").catch(() => null);
        if (res?.data) data = res.data;
      }

      if (data) {
        setProfileData(data);
      } else {
        // Fallback default brand profile
        setProfileData({
          company_name: user.name || "Global Brand Inc.",
          industry: "Fashion & Retail",
          website: "https://globalbrand.com",
          description: "We are a pioneering direct-to-consumer apparel brand bringing premium-grade essentials straight to consumers worldwide.",
          city: "New Delhi",
          state: "Delhi",
          verified: true
        });
      }

      // Fetch campaign listings by this brand
      if (supabase) {
        const { data: camps } = await supabase.from('campaigns').select('*').eq('brand_user_id', user.user_id);
        if (camps) setCampaigns(camps);
      } else {
        const campsRes = await api.get(`/campaigns`).catch(() => null);
        if (campsRes?.data) {
          const filterCamps = campsRes.data?.filter(c => c.brand_user_id === user.user_id);
          setCampaigns(filterCamps);
        }
      }
    } catch (e) {
      console.error("Error loading brand profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrandProfile();
  }, [user]);

  const isMobile = useIsMobile();

  if (isMobile) {
    return <BrandProfileMobile brandData={profileData} parentLoading={loading} campaigns={campaigns} />;
  }

  if (loading) {
    return (
      <div className="w-full max-w-none pb-8 space-y-6 sm:space-y-8 animate-pulse">
        <div className="h-48 md:h-64 bg-slate-100 rounded-3xl" />
        <div className="flex flex-col md:flex-row justify-between gap-6 px-2 sm:px-4">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-slate-100 rounded-lg" />
            <div className="h-4 w-48 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const isVerified = profileData?.verified || user?.verified;

  return (
    <div className="w-full max-w-none pb-8 relative" data-testid="brand-profile-page">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--violet)]/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Cover Banner Wrapper */}
      <div className="relative mb-14 sm:mb-16">
        <div className="relative rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-64 border border-[var(--border-default)] shadow-lg">
          <img 
            src={profileData?.cover_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop"} 
            className="w-full h-full object-cover" 
            alt="Brand Banner"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
          <Link 
            to="/brand/settings" 
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white transition-all border border-slate-200 shadow-sm"
          >
            <Camera size={14}/> Change Cover
          </Link>
        </div>
        
        {/* Profile Picture */}
        <div className="absolute -bottom-10 left-4 sm:left-6 md:left-10 flex items-end gap-5 z-10">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white bg-white overflow-hidden relative shadow-md flex items-center justify-center p-1.5">
            {profileData?.logo ? (
              <img 
                src={profileData.logo} 
                alt="Brand Logo" 
                className="w-full h-full object-contain rounded-2xl"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData?.company_name || 'Brand')}`;
                }}
              />
            ) : (
              <Building className="text-slate-300 w-12 h-12" />
            )}
          </div>
        </div>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2 sm:px-4 md:px-6 mb-8 sm:mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {profileData?.company_name || "Global Brand Inc."} 
              {isVerified && <CheckCircle className="text-[var(--violet)] fill-[var(--violet)]/10" size={24} />}
            </h1>
            {(profileData?.is_agency || user?.is_agency) && (
              <AgencyBadge size="md" />
            )}
          </div>
          <p className="text-slate-600 font-semibold mt-1.5 flex items-center gap-2">
            {profileData?.industry || "Fashion & Retail"} 
            <span className="text-slate-300">|</span> 
            <MapPin size={15} className="text-slate-400" /> {profileData?.city || "New Delhi"}, {profileData?.state || "IN"}
            {(profileData?.is_agency || user?.is_agency) && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-purple-600 font-bold">Marketing Agency</span>
              </>
            )}
          </p>
          {profileData?.website && (
            <a 
              href={profileData.website}
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--violet)] hover:underline mt-3"
            >
              <Globe size={13} /> {profileData.website} <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Profile URL copied to clipboard!");
            }}
            className="flex-1 md:flex-initial text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 size={14} /> Share Profile
          </button>
          <Link 
            to="/brand/settings" 
            className="flex-1 md:flex-initial text-center bg-white border border-slate-200 text-slate-800 text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Edit2 size={14} /> Edit Company Info
          </Link>
          <Link 
            to="/brand/settings#kyc" 
            className="flex-1 md:flex-initial text-center bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <ShieldCheck size={14} /> Compliance Verification
          </Link>
        </div>
      </div>

      {/* Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 px-0 md:px-4">
        
        {/* Left Column: Sidebar-ish information (About & Metrics) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">About Us</h3>
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              {profileData?.description 
                ? profileData.description.replace(/\[cover_image\]:.*/g, '').trim()
                : "No description provided. Add one in the company settings to let creators learn more about your brand and products."}
            </p>
          </div>

          <div className="bg-white border border-[var(--violet)]/10 rounded-3xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[var(--violet)] block mb-1">Metrics & Status</span>
            <div className="mt-4 space-y-4 text-xs font-bold relative z-10">
              <div className="flex justify-between border-b border-slate-100 pb-3 items-center">
                <span className="text-slate-400">Industry Category</span>
                <span className="text-slate-800">{profileData?.industry || "Retail / D2C"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3 items-center">
                <span className="text-slate-400">Campaigns Launched</span>
                <span className="text-slate-800">{campaigns.length} active</span>
              </div>
              <div className="flex justify-between pb-1 items-center">
                <span className="text-slate-400">Compliance Verified</span>
                <span className={isVerified ? "text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-[10px]" : "text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-[10px]"}>
                  {isVerified ? "APPROVED" : "PENDING"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Collabs / Campaigns */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
              <h3 className="text-lg font-extrabold text-slate-900 font-display">Active Collaborations</h3>
              <Link 
                to="/brand/campaigns/create" 
                className="px-4 py-2.5 bg-[var(--violet)] hover:bg-[#6c48d4] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <Plus size={14} /> Launch Campaign
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center h-48">
                <Briefcase className="mb-4 text-slate-300" size={40} />
                <span className="font-bold text-slate-500 text-base">No active collaborations yet.</span>
                <span className="mt-1 font-medium">Launch a campaign brief to start onboarding creators!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {campaigns?.map((camp) => (
                  <Link key={camp.campaign_id} to={`/campaigns/${camp.campaign_id}`} className="group p-5 border border-slate-200/80 rounded-2xl hover:border-[var(--violet)]/50 hover:shadow-md transition-all flex flex-col justify-between items-start gap-4 bg-white cursor-pointer relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--violet)]/[0.02] rounded-bl-full pointer-events-none group-hover:bg-[var(--violet)]/[0.04] transition-colors"></div>
                    <div className="w-full relative z-10">
                      <div className="flex justify-between items-start w-full mb-3">
                         <span className="text-[9px] font-extrabold text-[var(--violet)] bg-[var(--violet)]/10 px-2.5 py-1 rounded-md uppercase tracking-wider block">{camp.platforms?.join(" & ") || "Multi-Platform"}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-[var(--violet)] transition-colors">{camp.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-5 font-medium leading-relaxed">{camp.description}</p>
                      
                      <div className="flex flex-col gap-2.5 text-xs text-slate-500 font-bold bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 w-full">
                        <div className="flex justify-between items-center">
                          <span>Budget:</span>
                          <strong className="text-slate-800">₹{camp.budget_min?.toLocaleString()} - ₹{camp.budget_max?.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Deadline:</span>
                          <strong className="text-slate-800">{camp.deadline || "Flexible"}</strong>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
