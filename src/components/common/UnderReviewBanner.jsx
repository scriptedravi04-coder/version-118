import React from "react";
import { Clock, ShieldAlert, ArrowRight } from "lucide-react";

export default function UnderReviewBanner({ user, onOpenModal }) {
  if (!user || user.profile_status !== "under_review") return null;

  const etaHoursStored = user.review_eta_hours || 20;
  const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : Date.now();
  const elapsedHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);
  const hoursLeft = Math.max(1, Math.ceil(etaHoursStored - elapsedHours));

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 shadow-md">
      <div className="max-w-none flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
            <Clock size={16} className="animate-pulse" />
          </span>
          <span className="font-semibold">
            Profile Under Review: <span className="text-white font-mono font-bold">~{hoursLeft} hrs</span> remaining. You can submit KYC and explore, but campaign applications are paused until approval.
          </span>
        </div>

        <button
          onClick={onOpenModal}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition-all cursor-pointer shrink-0"
        >
          View Review Details <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
