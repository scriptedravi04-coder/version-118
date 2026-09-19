import React from "react";

export default function YbexLogo({ className = "h-8" }) {
  return (
    <svg 
      viewBox="0 0 320 120" 
      className={`fill-current text-slate-900 dark:text-white ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      aria-label="Ybex Logo"
    >
      <text 
        x="0" 
        y="95" 
        fontFamily="'Inter', system-ui, -apple-system, sans-serif" 
        fontWeight="900" 
        fontSize="110" 
        letterSpacing="-0.04em"
      >
        Ybex
      </text>
    </svg>
  );
}
