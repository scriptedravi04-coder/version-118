import React from 'react';
import { useLoading } from "../../contexts/LoadingContext";
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalLoader() {
  const { isLoading, isFinishing } = useLoading();

  if (!isLoading && !isFinishing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-base)]/90 backdrop-blur-[10px]"
      >
        <div className="flex items-center justify-center font-sans select-none relative w-64 h-32">
          <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
            <defs>
              <clipPath id="e-clip">
                <text 
                  x="112" 
                  y="70" 
                  fill="var(--violet)" 
                  fontFamily="sans-serif" 
                  fontWeight="900" 
                  fontSize="64"
                  letterSpacing="-0.05em"
                >e</text>
              </clipPath>
              {/* Liquid glow filter */}
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Yb text */}
            <text 
              x="30" 
              y="70" 
              fill="var(--text-primary)" 
              fontFamily="sans-serif" 
              fontWeight="900" 
              fontSize="64"
              letterSpacing="-0.05em"
              style={{ filter: "drop-shadow(0px 0px 10px rgba(124, 92, 255, 0.1))" }}
            >Yb</text>

            {/* Background hollow 'e' */}
            <text 
              x="112" 
              y="70" 
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="1.5"
              fontFamily="sans-serif" 
              fontWeight="900" 
              fontSize="64"
              letterSpacing="-0.05em"
            >e</text>

            {/* Liquid fill restricted by the 'e' clipPath */}
            <g clipPath="url(#e-clip)">
              {/* Back wave */}
              <motion.path 
                d="M 0 100 Q 50 80 100 100 T 200 100 T 300 100 L 300 200 L 0 200 Z"
                fill="var(--violet-hover)"
                filter="url(#neon-glow)"
                animate={{
                  x: [0, -100],
                  y: isFinishing ? -80 : [0, -30, -10, -40]
                }}
                transition={{
                  x: { repeat: Infinity, duration: 1.5, ease: "linear" },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", repeatType: "reverse" },
                }}
              />
              
              {/* Front wave */}
              <motion.path 
                d="M 0 100 Q 50 120 100 100 T 200 100 T 300 100 L 300 200 L 0 200 Z"
                fill="var(--violet)"
                animate={{
                  x: [-100, 0],
                  y: isFinishing ? -80 : [10, -20, 0, -30]
                }}
                transition={{
                  x: { repeat: Infinity, duration: 2, ease: "linear" },
                  y: { repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatType: "reverse" },
                }}
              />

              {/* Shimmer overlay when finishing */}
              <AnimatePresence>
                {isFinishing && (
                  <motion.rect
                    initial={{ x: 80 }}
                    animate={{ x: 160 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    y="0"
                    width="20"
                    height="100"
                    fill="rgba(255, 255, 255, 0.9)"
                    style={{ filter: "blur(2px)", transform: "skewX(-20deg)" }}
                  />
                )}
              </AnimatePresence>
            </g>

            {/* x text */}
            <text 
              x="148" 
              y="70" 
              fill="var(--text-primary)" 
              fontFamily="sans-serif" 
              fontWeight="900" 
              fontSize="64"
              letterSpacing="-0.05em"
              style={{ filter: "drop-shadow(0px 0px 10px rgba(124, 92, 255, 0.1))" }}
            >x</text>
            
          </svg>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
