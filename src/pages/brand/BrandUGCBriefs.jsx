import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Briefcase, Plus, Video, Target, Users, Calendar, ArrowRight } from "lucide-react";

export default function BrandUGCBriefs() {
  const { user } = useAuth();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      const res = await api.get("ugc/briefs/my");
      setBriefs(res.data || []);
    } catch (err) {
      console.error("Error fetching UGC Briefs:", err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to load UGC Briefs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 bg-[var(--bg-base)] min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
          <div className="h-10 bg-slate-200/60 rounded-lg animate-pulse w-1/4 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
          <div className="h-4 bg-slate-200/60 rounded animate-pulse w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
            <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
            <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
          </div>
          <div className="h-64 bg-slate-200/60 rounded-xl animate-pulse mt-4 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
        </div>
          <div className="text-[var(--text-tertiary)] text-sm font-mono tracking-widest uppercase">Loading UGC Briefs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none text-left pb-8" data-testid="brand-ugc-briefs-page">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            My UGC Briefs
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
            Review, track and recruit creators for your active User Generated Content briefs.
          </p>
        </div>

        <Link
          to="/brand/ugc/post"
          className="flex items-center gap-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          Post UGC Brief
        </Link>
      </div>

      {briefs.length === 0 ? (
        <div className="bg-[var(--bg-card)]/80 border border-dashed border-[var(--border-default)] rounded-2xl p-16 text-center max-w-2xl mx-auto my-8 flex flex-col items-center">
          <div className="p-4 bg-[var(--violet)]/10 text-[#a38aff] rounded-full mb-4">
            <Briefcase size={32} />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">No UGC Briefs Found</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-md leading-relaxed">
            Create your first user-generated content brief to source high-quality custom videos from certified creator pros.
          </p>
          <Link
            to="/brand/ugc/post"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Post UGC Brief <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {briefs?.map((brief) => (
            <div
              key={brief.id}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm hover:border-[var(--violet)]/30 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[9px] font-extrabold text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {brief.deliverable_type ? brief.deliverable_type.replace(/_/g, " ") : "Instagram Reel"}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    brief.status === "OPEN" 
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                      : "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                  }`}>
                    {brief.status || "OPEN"}
                  </span>
                </div>

                <h3 className="font-sans font-bold text-base text-[var(--text-primary)] leading-snug mb-1">
                  {brief.title}
                </h3>
                
                <p className="text-xs text-[var(--text-secondary)] mb-4 font-medium flex items-center gap-1.5">
                  <Target size={13} className="text-[var(--text-tertiary)]" /> Product: {brief.product_name || "N/A"}
                </p>

                {brief.detailed_requirements && (
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed line-clamp-3 mb-4">
                    {brief.detailed_requirements}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Escrow Budget</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    ₹{Number(brief.budget || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Creators Recruited</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center justify-end gap-1 text-xs">
                    <Users size={12} className="text-[var(--text-tertiary)]" />
                    {brief.claimed_count || 0} / {brief.max_creators || 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
