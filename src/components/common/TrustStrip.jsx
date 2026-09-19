import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

const ROTATING_BADGES = [
  {
    id: 'razorpay',
    text: "Payment Secured by",
    content: (
      <img
        src="https://i.ibb.co/rRm0vRz6/Untitled-design-9.png"
        alt="Razorpay"
        className="object-contain h-14 md:h-16 w-auto ml-1.5"
      />
    )
  },
  {
    id: 'upi',
    text: "Payouts managed by",
    content: (
      <div className="flex items-center gap-2 ml-2.5">
        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-3.5 md:h-4 object-contain" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-3 md:h-3.5 object-contain" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg" alt="Visa" className="h-2.5 md:h-3 object-contain" />
      </div>
    )
  },
  {
    id: 'legal',
    text: "Contracts managed by",
    content: (
      <img
        src="https://cdn.prod.website-files.com/5fef5231c8595fadb2b2a3cf/65a63eabd7998b73d63869c4_logo%20leegality%201.svg"
        alt="Leegality"
        className="object-contain h-4 md:h-5 w-auto ml-2.5"
      />
    )
  }
];

export default function TrustStrip({ className = "", compact = false }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_BADGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = ROTATING_BADGES[index];

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      <div className="flex items-center justify-center w-full max-w-[360px] sm:min-w-[360px] h-14 md:h-16 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center absolute w-full"
          >
            <span className="text-sm font-bold text-[var(--text-tertiary)] whitespace-nowrap z-10">
              {current.text}
            </span>
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-5 py-2.5 rounded-full border border-[var(--border-default)] shadow-sm">
          <span className="flex items-center gap-1.5">
            <Lock size={14} className="text-[var(--text-secondary)]" /> 
            Funds Held in Escrow
          </span>
          <span className="hidden md:block w-1 h-1 rounded-full bg-[var(--border-strong)]"></span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--text-secondary)]" /> 
            Verified Users Only
          </span>
        </div>
      )}
    </div>
  );
}
