import React from "react";
import { motion } from "framer-motion";
import { List, AlertCircle, PlayCircle, Eye, CheckCircle2 } from "lucide-react";

export default function DealFilterTabs({ activeTab, setActiveTab, deals }) {
  // Count deals in each filter category
  const counts = {
    all: deals.length,
    awaiting_action: deals.filter(d => d.stage === "REVISION_REQUESTED").length,
    in_progress: deals.filter(d => d.stage === "IN_PROGRESS" || d.stage === "REVISION_REQUESTED").length,
    in_review: deals.filter(d => d.stage === "IN_REVIEW").length,
    completed: deals.filter(d => d.stage === "COMPLETED").length
  };

  const tabs = [
    { id: "all", label: "All Deals", icon: List },
    { id: "awaiting_action", label: "Awaiting Action", icon: AlertCircle, badgeColor: "bg-amber-500 text-white" },
    { id: "in_progress", label: "In Progress", icon: PlayCircle },
    { id: "in_review", label: "In Review", icon: Eye },
    { id: "completed", label: "Completed", icon: CheckCircle2 }
  ];

  return (
    <div className="mt-8 mb-6 border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-none relative py-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 relative outline-none cursor-pointer group"
          >
            {/* Background Pill highlight with Framer Motion LayoutId */}
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-xl border border-gray-200/80 shadow-sm z-0"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}

            <span className={`flex items-center gap-2 relative z-10 transition-colors ${
              isActive ? "text-[var(--violet)]" : "text-gray-400 group-hover:text-gray-600"
            }`}>
              <Icon size={14} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold transition-all ${
                  isActive
                    ? tab.badgeColor || "bg-[var(--violet)] text-white"
                    : tab.badgeColor || "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
