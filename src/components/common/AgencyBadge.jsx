import React from "react";
import { Briefcase, Building2 } from "lucide-react";

export default function AgencyBadge({ size = "sm", className = "", showIcon = true, text = "Agency" }) {
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1",
    sm: "text-[10px] sm:text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2"
  };

  const iconSizes = {
    xs: 10,
    sm: 11,
    md: 13,
    lg: 15
  };

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-purple-50 text-purple-700 border border-purple-300 shadow-2xs select-none ${sizeClasses[size] || sizeClasses.sm} ${className}`}
      title="Marketing & Influencer Agency"
    >
      {showIcon && <Briefcase size={iconSizes[size] || 11} className="text-purple-600 shrink-0" />}
      <span>{text}</span>
    </span>
  );
}
