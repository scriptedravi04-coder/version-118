import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building, MapPin, Globe, CheckCircle, ShieldCheck, Briefcase, 
  ExternalLink, X, Eye, Video, MessageSquare, ArrowRight, Award 
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import AgencyBadge from "../common/AgencyBadge";

export default function BrandPublicProfileModal({ isOpen, onClose, brandUserId, brandName, brandLogo }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    async function fetchBrandData() {
      try {
        let bData = null;

        // 1. Fetch from Supabase brand_profiles by user_id if provided
        if (supabase && brandUserId) {
          const res = await supabase.from('brand_profiles').select('*').eq('user_id', brandUserId).maybeSingle();
          if (res?.data) bData = res.data;
        }

        // 2. Fallback search by company_name if user_id query missed
        if (!bData && supabase && brandName) {
          const res = await supabase.from('brand_profiles').select('*').ilike('company_name', `%${brandName}%`).maybeSingle();
          if (res?.data) bData = res.data;
        }

        // 3. Fallback to API call if available
        if (!bData && brandUserId) {
          const res = await api.get(`/brands/${brandUserId}`).catch(() => null);
          if (res?.data) bData = res.data;
        }

        if (isMounted) {
          if (bData) {
            setProfile(bData);
          } else {
            // Default elegant fallback profile for brand
            setProfile({
              company_name: brandName || "Brand Partner",
              industry: "Fashion & Lifestyle",
              website: "",
              description: `${brandName || "This brand"} is a verified brand partner on Ybex platform, actively collaborating with creators for UGC and influencer campaigns.`,
              city: "Mumbai",
              state: "Maharashtra",
              logo: brandLogo || "",
              cover_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
              verified: true
            });
          }
        }

        // Fetch campaigns by this brand
        const targetUserId = bData?.user_id || brandUserId;
        if (supabase && targetUserId) {
          const { data: camps } = await supabase.from('campaigns').select('*').eq('brand_user_id', targetUserId);
          if (camps && isMounted) setCampaigns(camps);
        } else {
          const campsRes = await api.get(`/campaigns`).catch(() => null);
          if (campsRes?.data && isMounted) {
            const list = Array.isArray(campsRes.data) ? campsRes.data : [];
            const filtered = list.filter(c => c.brand_user_id === targetUserId || (brandName && c.brand_name?.toLowerCase().includes(brandName.toLowerCase())));
            setCampaigns(filtered);
          }
        }

      } catch (err) {
        console.error("Error fetching brand public profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBrandData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, brandUserId, brandName, brandLogo]);

  if (!isOpen) return null;

  const displayLogo = profile?.logo || brandLogo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.company_name || brandName || 'Brand')}`;
  const displayCover = profile?.cover_image || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
          >
            <X size={18} />
          </button>

          {/* Banner Header */}
          <div className="relative h-40 md:h-48 w-full bg-slate-100 shrink-0">
            <img
              src={displayCover}
              alt="Brand Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          </div>

          {/* Profile Header Content */}
          <div className="relative px-6 md:px-8 pb-4 shrink-0">
            {(() => {
              const isAgency = Boolean(profile?.is_agency || profile?.isAgency);

              return (
                <div className="flex items-end justify-between -mt-12 md:-mt-14 mb-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white bg-white overflow-hidden shadow-lg flex items-center justify-center p-1 relative z-10">
                    <img
                      src={displayLogo}
                      alt={profile?.company_name || brandName}
                      className="w-full h-full object-contain rounded-xl"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile?.company_name || brandName || 'Brand')}`;
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isAgency ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                        <Briefcase size={14} className="text-purple-600" /> Marketing Agency
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                        <ShieldCheck size={14} className="text-emerald-600" /> Verified Brand Partner
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {profile?.company_name || brandName || "Brand Partner"}
                  <CheckCircle size={20} className="text-[var(--violet)] fill-[var(--violet)]/10 shrink-0" />
                </h2>
                {(profile?.is_agency || profile?.isAgency) && (
                  <AgencyBadge size="md" />
                )}
              </div>
              
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-slate-700 font-semibold">{profile?.industry || "Retail & E-commerce"}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-slate-400" /> {profile?.city || "Pan India"}{profile?.state ? `, ${profile.state}` : ''}</span>
                {(profile?.is_agency || profile?.isAgency) && (
                  <>
                    <span>•</span>
                    <span className="text-purple-600 font-bold">Agency Partner</span>
                  </>
                )}
              </p>

              {profile?.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--violet)] hover:underline mt-2"
                >
                  <Globe size={13} /> {profile.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="px-6 md:px-8 py-4 overflow-y-auto space-y-6 flex-1 divide-y divide-slate-100">
            {/* Trust Indicators */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="text-center">
                  <div className="text-lg font-black text-slate-900 font-mono">100%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escrow Secured</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-lg font-black text-slate-900 font-mono">{campaigns.length || '1+'}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Campaigns</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-emerald-600 font-mono">Verified</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KYC Approved</div>
                </div>
              </div>
            </div>

            {/* About / Description */}
            <div className="pt-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building size={14} /> About {profile?.company_name || brandName}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {profile?.description || `${profile?.company_name || brandName} is a top-tier brand partnering with content creators to build authentic influencer campaigns and high-performing UGC videos.`}
              </p>
            </div>

            {/* Live Campaigns Section */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Video size={14} /> Active Brand Campaigns ({campaigns.length})
                </h3>
              </div>

              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400 animate-pulse">Loading campaigns...</div>
              ) : campaigns.length > 0 ? (
                <div className="space-y-2.5">
                  {campaigns.map((camp) => (
                    <div
                      key={camp.id || camp.campaign_id}
                      onClick={() => {
                        onClose();
                        navigate(`/campaigns/${camp.id || camp.campaign_id}`);
                      }}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[var(--violet)] transition-colors truncate">
                          {camp.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span className="font-mono text-emerald-700 font-bold">
                            ₹{(camp.budget_min || 5000).toLocaleString('en-IN')} - ₹{(camp.budget_max || 15000).toLocaleString('en-IN')}
                          </span>
                          <span>•</span>
                          <span>{camp.category || camp.categories?.[0] || 'Influencer Brief'}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-white border border-slate-200 group-hover:border-[var(--violet)] group-hover:text-[var(--violet)] text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors">
                        View Brief <ArrowRight size={12} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-500">
                  No active public campaigns listed right now.
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 md:px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/campaigns');
              }}
              className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[#5b38f2] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              Explore Campaigns <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
