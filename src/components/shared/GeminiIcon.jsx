import React from 'react';

export default function GeminiIcon({ className = "w-5 h-5", style, size, ...props }) {
  const inlineStyle = size ? { width: size, height: size, ...style } : style;
  
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={className} 
      style={{ overflow: 'visible', ...inlineStyle }}
      {...props}
    >
      <defs>
        <linearGradient id="ai-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#0044FF" />
        </linearGradient>
      </defs>

      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#0066FF" strokeWidth="1.5">
        <animate attributeName="r" values="8.5; 16" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5; 0" dur="2s" repeatCount="indefinite" />
      </circle>
      
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#0066FF" strokeWidth="1.5">
        <animate attributeName="r" values="8.5; 16" dur="2s" begin="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5; 0" dur="2s" begin="1s" repeatCount="indefinite" />
      </circle>

      <g stroke="url(#ai-ring-grad)" strokeWidth="2.8" strokeLinecap="round" fill="none">
        <path d="M 11 3.5 Q 14.5 3.5 17 6" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(45 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(90 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(135 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(180 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(225 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(270 12 12)" />
        <path d="M 11 3.5 Q 14.5 3.5 17 6" transform="rotate(315 12 12)" />
      </g>
    </svg>
  );
}
