import React from "react";
import { safeLower } from "../../../../utils/safeFormat";
import { useNavigate } from "react-router-dom";
import { Building, Share2, Plus, Check, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { MobileScreen, Card, EmptyState, Loader, Pill, kycBadgeFor } from "./brandMobileUi";

// Screen 1b — the brand's public profile, rendered from the same brand_profiles row
// and campaigns list the desktop profile page reads. No placeholder brand data:
// missing fields are shown as missing so the brand can see what creators would see.

export default function PublicProfileScreen({ onBack, profile, loading, campaigns = [], kyc }) {
  const navigate = useNavigate();
  const badge = kycBadgeFor(kyc?.status);
  const isApproved = String(kyc?.status || "").toLowerCase() === "approved";

  const handleShare = async () => {
    const url = window.location.origin + "/brand/profile";
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.company_name || "Brand profile", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Couldn't share the link.");
    }
  };

  if (loading) {
    return (
      <MobileScreen title="Public profile" subtitle="How creators see you" onBack={onBack}>
        <Loader label="Loading your public profile…" />
      </MobileScreen>
    );
  }

  const location = profile?.location || "";
  const metaLine = [profile?.industry, location].filter(Boolean).join(" · ");

  return (
    <MobileScreen title="Public profile" subtitle="How creators see you" onBack={onBack}>
      {/* Cover + identity */}
      <div className="relative">
        <div className="h-28 bg-gray-100">
          {profile?.cover && (
            <img src={profile.cover} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-5 -mt-8 relative">
          <div className="w-16 h-16 rounded-2xl border-4 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center text-xl font-bold text-gray-900">
            {profile?.logo
              ? <img src={profile.logo} alt="" className="w-full h-full object-cover" />
              : (profile?.company_name?.charAt(0)?.toUpperCase() || <Building size={22} className="text-gray-300" />)}
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">
              {profile?.company_name || "Your brand"}
            </h2>
            <Pill tone={badge.tone}>
              {isApproved && <Check size={10} strokeWidth={3} />}
              KYC {safeLower(badge.label)}
            </Pill>
          </div>
          {metaLine && <p className="text-xs text-gray-600 mt-1">{metaLine}</p>}
          {!isApproved && (
            <p className="text-xs text-amber-700 mt-2 leading-relaxed">
              Creators don't see a verified badge on your briefs until KYC is approved.
            </p>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={handleShare}
          className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Share2 size={13} /> Share Profile
        </button>
        <button
          onClick={() => navigate("/brand/campaigns/create")}
          className="h-11 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
        >
          <Plus size={14} /> Launch Campaign
        </button>
      </div>

      {/* About */}
      <div className="px-5 pt-6">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">About us</h3>
        {profile?.description ? (
          <p className="text-sm text-slate-600 leading-relaxed">
            {profile.description.replace(/\[cover_image\]:.*/g, "").trim()}
          </p>
        ) : (
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            No description yet. Creators read this before accepting a brief — add one in Company details.
          </p>
        )}
      </div>

      {/* Facts */}
      <div className="px-5 pt-6">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
          Brand Snapshot
        </span>
        <div className="divide-y divide-slate-100">
          <div className="py-3 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Industry</span>
            <span className="text-xs font-bold text-slate-900">{profile?.industry || "—"}</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">Campaigns launched</span>
            <span className="text-xs font-bold text-slate-900">{campaigns.length} active</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">KYC Status</span>
            <Pill tone={badge.tone}>{badge.label}</Pill>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="px-5 pt-6 pb-12">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Active collaborations</h3>
        {campaigns.length === 0 ? (
          <div className="rounded-2xl bg-slate-50/70 p-6 text-center">
            <EmptyState
              icon={Briefcase}
              title="No live campaigns"
              body="Launch a brief and it will show up here for creators browsing your profile."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((camp) => (
              <button
                key={camp.campaign_id || camp.id}
                onClick={() => navigate(`/campaigns/${camp.campaign_id}`)}
                className="w-full text-left rounded-2xl bg-slate-50/70 hover:bg-slate-100/70 p-4 transition-all cursor-pointer"
              >
                {Array.isArray(camp.platforms) && camp.platforms.length > 0 && (
                  <span className="inline-block text-[10px] font-black text-[#7C3AED] bg-purple-100 px-2 py-0.5 rounded-md mb-2">
                    {camp.platforms.join(" & ")}
                  </span>
                )}
                <h4 className="font-bold text-sm text-slate-900">{camp.title || "Untitled campaign"}</h4>
                {camp.description && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{camp.description}</p>
                )}
                <div className="mt-3 rounded-xl bg-white p-3 space-y-1.5 border border-slate-100/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Budget</span>
                    <span className="font-bold text-slate-900">
                      {camp.budget_min || camp.budget_max
                        ? `₹${Number(camp.budget_min || 0).toLocaleString("en-IN")}${camp.budget_max ? ` – ₹${Number(camp.budget_max).toLocaleString("en-IN")}` : ""}`
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Deadline</span>
                    <span className="font-bold text-slate-900">{camp.deadline || "Flexible"}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileScreen>
  );
}
