import React, { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { t } from "@/lib/typography";

function CountUp({ value, prefix = "", suffix = "" }) {
  const spring = useSpring(0, { bounce: 0, duration: 1500 });
  const display = useTransform(spring, (current) => 
    prefix + Math.round(current).toLocaleString("en-IN") + suffix
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function StatsCard({ label, value, prefix = "", suffix = "", icon: Icon }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 text-left relative overflow-hidden transition-all hover:border-[var(--violet-border)]"
    >
      <div className="absolute right-3 bottom-0 text-[var(--text-tertiary)]/10 pointer-events-none">
        {Icon && <Icon size={80} className="opacity-40" />}
      </div>
      <div className={'text-[10px] font-bold uppercase tracking-wider'}>
        {label}
      </div>
      <div className={`font-mono font-bold tracking-tight text-lg mt-2`}>
        <CountUp value={Number(value) || 0} prefix={prefix} suffix={suffix} />
      </div>
    </motion.div>
  );
}
