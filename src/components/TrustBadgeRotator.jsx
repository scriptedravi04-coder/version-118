import React, { useState, useEffect } from 'react';
import { t } from "@/lib/typography";
import { motion, AnimatePresence } from 'framer-motion';

export const GREEN_TICK_URL = "/assets/green-tick-badge.svg";

export const PAGE_BADGES = {
  brandDashboard: [
    { iconUrl: GREEN_TICK_URL, text: "0% Commission Platform" },
    { iconUrl: GREEN_TICK_URL, text: "Escrow Protected Deals" },
    { iconUrl: GREEN_TICK_URL, text: "100% KYC Verified Creators" },
    { iconUrl: GREEN_TICK_URL, text: "Instant Brief Publishing" }
  ],
  exploreCreators: [
    { iconUrl: GREEN_TICK_URL, text: "10,000+ Active Creators" },
    { iconUrl: GREEN_TICK_URL, text: "Verified Reach & Engagement" },
    { iconUrl: GREEN_TICK_URL, text: "Direct Brand Deals" },
    { iconUrl: GREEN_TICK_URL, text: "Trending Niche Influencers" }
  ],
  creatorDashboard: [
    { iconUrl: GREEN_TICK_URL, text: "Keep 100% Earnings" },
    { iconUrl: GREEN_TICK_URL, text: "Guaranteed Escrow Payouts" },
    { iconUrl: GREEN_TICK_URL, text: "Fast Milestone Approval" },
    { iconUrl: GREEN_TICK_URL, text: "Direct Legal Contracts" }
  ],
  earnings: [
    { iconUrl: GREEN_TICK_URL, text: "Direct Bank Payouts" },
    { iconUrl: GREEN_TICK_URL, text: "0% Cut on Creator Pay" },
    { iconUrl: GREEN_TICK_URL, text: "24-Hour Payout Processing" },
    { iconUrl: GREEN_TICK_URL, text: "Transparent GST Receipts" }
  ],
  ongoingDeals: [
    { iconUrl: GREEN_TICK_URL, text: "Funds Secured in Escrow" },
    { iconUrl: GREEN_TICK_URL, text: "Milestone-Based Delivery" },
    { iconUrl: GREEN_TICK_URL, text: "Encrypted Chat & Agreements" }
  ],
  applications: [
    { iconUrl: GREEN_TICK_URL, text: "Direct Application to Brands" },
    { iconUrl: GREEN_TICK_URL, text: "Zero Agency Markup" },
    { iconUrl: GREEN_TICK_URL, text: "Verified Brand Listings" }
  ],
  liveCampaigns: [
    { iconUrl: GREEN_TICK_URL, text: "No Fee. Zero Commissions." },
    { iconUrl: GREEN_TICK_URL, text: "100% Transparent Rates" },
    { iconUrl: GREEN_TICK_URL, text: "Protected Collaboration" }
  ]
};

export default function TrustBadgeRotator({ page = 'brandDashboard', className = '' }) {
  const badges = PAGE_BADGES[page] || PAGE_BADGES.brandDashboard;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!badges || badges.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % badges.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [badges]);

  const current = badges[index] || badges[0];
  const iconSrc = current.iconUrl || current.icon_url || GREEN_TICK_URL;

  return (
    <div className={`inline-flex items-center align-middle shrink-0 ${className}`}>
      <div className="relative h-7 min-w-max flex items-center pr-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${page}-${index}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold text-sm text-[var(--text-primary)]"
          >
            <img 
              src={iconSrc} 
              alt="Verified" 
              className="w-4 h-4 shrink-0 object-contain" 
            />
            <span className="font-bold text-sm leading-snug">
              {current.text}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
