import React from "react";
import { cn } from "@/lib/utils";

/**
 * Single Reusable Flat Badge Component (Apple/Stripe-style)
 *
 * Design Spec:
 * - Shape: pill, border-radius: 9999px (rounded-full)
 * - Padding: 4px 10px (px-[10px] py-[4px])
 * - Font: 12px, font-weight 600, letter-spacing 0.02em, uppercase
 * - Flat style: NO glow, NO drop-shadow, NO box-shadow, NO gradient
 *
 * Fixed Color Variants:
 * 1. success / live   -> bg #DCFCE7, text #15803D
 * 2. warning / review -> bg #FEF3C7, text #B45309
 * 3. info / type-tag  -> bg #F1F5F9, text #475569  (INSTAGRAM, YOUTUBE, UGC, CAMPAIGN)
 * 4. neutral        -> bg #F3F4F6, text #374151
 */

const VARIANT_MAP = {
  // 1. Success / Live
  success: "bg-[#DCFCE7] text-[#15803D]",
  live: "bg-[#DCFCE7] text-[#15803D]",
  active: "bg-[#DCFCE7] text-[#15803D]",
  completed: "bg-[#DCFCE7] text-[#15803D]",
  approved: "bg-[#DCFCE7] text-[#15803D]",
  accepted: "bg-[#DCFCE7] text-[#15803D]",
  delivered: "bg-[#DCFCE7] text-[#15803D]",
  verified: "bg-[#DCFCE7] text-[#15803D]",
  paid: "bg-[#DCFCE7] text-[#15803D]",
  released: "bg-[#DCFCE7] text-[#15803D]",
  open: "bg-[#DCFCE7] text-[#15803D]",

  // 2. Warning / Review (Yellow/Amber - Noticeable & Professional)
  warning: "bg-amber-50 text-amber-800 border border-amber-300/80",
  review: "bg-amber-50 text-amber-800 border border-amber-300/80",
  under_review: "bg-amber-50 text-amber-800 border border-amber-300/80",
  in_progress: "bg-amber-50 text-amber-800 border border-amber-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-300/80",
  pending_approval: "bg-amber-50 text-amber-800 border border-amber-300/80",
  revision: "bg-amber-50 text-amber-800 border border-amber-300/80",
  submitted: "bg-amber-50 text-amber-800 border border-amber-300/80",
  overdue: "bg-rose-50 text-rose-700 border border-rose-200",
  changes_requested: "bg-amber-50 text-amber-800 border border-amber-300/80",

  // 3. Info / Type Tag
  info: "bg-[#F1F5F9] text-[#475569]",
  "type-tag": "bg-[#F1F5F9] text-[#475569]",
  type: "bg-[#F1F5F9] text-[#475569]",
  instagram: "bg-[#F1F5F9] text-[#475569]",
  youtube: "bg-[#F1F5F9] text-[#475569]",
  ugc: "bg-[#F1F5F9] text-[#475569]",
  ugc_video: "bg-[#F1F5F9] text-[#475569]",
  reel: "bg-[#F1F5F9] text-[#475569]",
  collaboration_reel: "bg-[#F1F5F9] text-[#475569]",
  raw_content: "bg-[#F1F5F9] text-[#475569]",
  campaign: "bg-[#F1F5F9] text-[#475569]",

  // 4. Neutral
  neutral: "bg-[#F3F4F6] text-[#374151]",
  draft: "bg-[#F3F4F6] text-[#374151]",
  closed: "bg-[#F3F4F6] text-[#374151]",
  paused: "bg-[#F3F4F6] text-[#374151]",
  expired: "bg-[#F3F4F6] text-[#374151]",
  cancelled: "bg-[#F3F4F6] text-[#374151]",
  rejected: "bg-[#FEE2E2] text-[#B91C1C]",
  inactive: "bg-[#F3F4F6] text-[#374151]",
};

export function resolveVariantClass(variantKey) {
  if (!variantKey) return VARIANT_MAP.neutral;
  const key = String(variantKey).toLowerCase().trim().replace(/[-\s]+/g, "_");
  return VARIANT_MAP[key] || VARIANT_MAP.neutral;
}

export function Badge({
  children,
  variant = "neutral",
  className = "",
  icon = null,
  ...props
}) {
  const variantClass = resolveVariantClass(variant);
  const isUnderReview = String(variant).toLowerCase().includes("review") || String(children).toLowerCase().includes("review");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-[10px] py-[4px] text-[12px] font-semibold tracking-[0.02em] uppercase leading-none whitespace-nowrap select-none",
        isUnderReview ? "bg-amber-50 text-amber-800 border border-amber-300 shadow-xs" : variantClass,
        className
      )}
      {...props}
    >
      {isUnderReview && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
        </span>
      )}
      {icon && !isUnderReview && <span className="inline-flex shrink-0">{icon}</span>}
      <span className={isUnderReview ? "animate-pulse" : ""}>{children}</span>
    </span>
  );
}

export default Badge;
