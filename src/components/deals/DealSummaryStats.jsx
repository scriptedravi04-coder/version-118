import React from "react";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, FileText, CheckCircle } from "lucide-react";
import CountUp from "./CountUp";

export default function DealSummaryStats({ deals = [] }) {
  // Compute metrics based on unified deals stage
  const isCompletedDeal = (d) => {
    const st = String(d?.stage || '').toUpperCase();
    const status = String(d?.status || '').toUpperCase();
    return st === "COMPLETED" || status === "COMPLETED" || status === "PAID" || status === "SUCCESS" || status === "DELIVERED";
  };

  const inProductionCount = deals.filter(d => (d.stage === "IN_PROGRESS" || d.stage === "REVISION_REQUESTED") && !isCompletedDeal(d)).length;
  const underReviewCount = deals.filter(d => d.stage === "IN_REVIEW" && !isCompletedDeal(d)).length;
  const activeCount = deals.filter(d => !isCompletedDeal(d) && d.stage !== "APPLICATION" && d.status !== "PENDING").length;
  
  const totalEarnings = deals
    .filter(d => isCompletedDeal(d))
    .reduce((sum, d) => sum + (Number(d.payout) || Number(d.proposed_amount) || 0), 0);

  const stats = [
    {
      label: "Active Deals",
      value: activeCount,
      isCurrency: false,
      icon: Activity,
      color: "text-indigo-600 bg-indigo-50",
      description: "In production or review"
    },
    {
      label: "In Production",
      value: inProductionCount,
      isCurrency: false,
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
      description: "Creating UGC content"
    },
    {
      label: "Under Review",
      value: underReviewCount,
      isCurrency: false,
      icon: ShieldAlert,
      color: "text-amber-600 bg-amber-50",
      description: "Waiting for brand approval"
    },
    {
      label: "Total Earnings",
      value: totalEarnings,
      isCurrency: true,
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
      description: "Paid out to your wallet"
    }
  ];

  // Animation variants for the stat cards staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-3 mb-2"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-white p-3 sm:p-3.5 rounded-xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md hover:border-gray-200/80 transition-all duration-200 relative overflow-hidden group"
          >
            {/* Soft accent bar at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[var(--violet)]/30 transition-all duration-200" />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-lg ${stat.color} transition-all duration-200 group-hover:scale-105`}>
                <Icon size={14} />
              </div>
            </div>

            <div className="mt-2">
              <CountUp value={stat.value} isCurrency={stat.isCurrency} className="font-mono text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight" />
              <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 font-medium tracking-tight">
                {stat.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
