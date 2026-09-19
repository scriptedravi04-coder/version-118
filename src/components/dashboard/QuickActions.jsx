import React from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Users2, FileVideo, Coins } from "lucide-react";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Create Campaign",
      icon: ClipboardList,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      desc: "Post a briefing & configure goals",
      route: "/brand/campaigns/create"
    },
    {
      label: "View Applicants",
      icon: Users2,
      color: "text-[var(--violet)] bg-purple-50 border-purple-100",
      desc: "Check pitched entries & rate cards",
      route: "/brand/campaigns"
    },
    {
      label: "Review Drafts",
      icon: FileVideo,
      color: "text-pink-600 bg-pink-50 border-pink-100",
      desc: "Approve creative deliverables",
      route: "/brand/campaigns"
    },
    {
      label: "Release Payment",
      icon: Coins,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      desc: "Release payouts from secured escrow",
      route: "/brand/payments"
    }
  ];

  return (
    <div className="bg-white border border-zinc-200/80 p-6 rounded-2xl shadow-sm text-left relative overflow-hidden">
      <h3 className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest mb-4">Quick Actions Gate</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <button
              key={idx}
              id={`quick-action-${idx}`}
              onClick={() => navigate(act.route)}
              className="p-5 rounded-2xl bg-white border border-zinc-150 text-left transition-all hover:bg-[var(--violet)]/[0.02] hover:border-[var(--violet)]/30 hover:shadow-[0_8px_30px_rgba(124,92,255,0.04)] group cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${act.color} mb-4 group-hover:scale-105 transition-transform duration-200`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-800 group-hover:text-[var(--violet)] transition-colors">{act.label}</div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-normal line-clamp-2">{act.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
