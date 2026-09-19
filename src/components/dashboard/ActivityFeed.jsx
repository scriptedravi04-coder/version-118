import React from "react";
import { Link } from "react-router-dom";

export default function ActivityFeed({ activities = [] }) {
  const getDotColorClass = (status) => {
    switch (status) {
      case "approved":
      case "live":
        return "bg-emerald-500";
      case "pending":
      case "new":
        return "bg-amber-500";
      case "rejected":
        return "bg-red-500";
      case "in_progress":
        return "bg-blue-500";
      default:
        return "bg-zinc-400";
    }
  };

  return (
    <div className="bg-white border border-zinc-200/80 p-6 rounded-[24px] shadow-sm text-left flex flex-col">
      <div>
        <div className="flex justify-between items-center mb-5 border-b border-zinc-100 pb-3">
          <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">
            Recent Activity
          </h3>
          <span className="text-[10px] font-mono font-bold text-[var(--violet)] uppercase tracking-wider animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Live Updates
          </span>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-xs text-zinc-400 text-center py-6">No recent activity</div>
          ) : (
            activities.slice(0, 4).map((act) => (
              <div key={act.id} className="flex items-start gap-3.5 group py-1">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm ${getDotColorClass(act.status)}`} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-zinc-700 group-hover:text-[var(--violet)] transition-colors leading-relaxed">
                    {act.message}
                  </p>
                  <span className="text-[9px] font-medium text-zinc-400 block mt-0.5">{act.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 mt-5 flex justify-end">
        <Link 
          to="/brand/campaigns" 
          className="text-[11px] font-extrabold text-[var(--violet)] hover:text-[#6b4aff] transition-all flex items-center gap-1 hover:underline"
        >
          View All Activities
        </Link>
      </div>
    </div>
  );
}
