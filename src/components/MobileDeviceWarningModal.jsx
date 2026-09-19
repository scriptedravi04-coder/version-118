import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, 
  Monitor, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CheckCircle2, 
  ExternalLink,
  Info
} from "lucide-react";

export default function MobileDeviceWarningModal() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideSteps, setShowGuideSteps] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in localStorage
    const dismissed = localStorage.getItem("ybex_mobile_notice_dismissed_time");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // If dismissed less than 24 hours ago, keep it hidden
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }

    const checkMobileStatus = () => {
      // If window width is under 1024px (mobile/tablet view), or userAgent is mobile & screen width < 1024
      const width = window.innerWidth;
      const isTouchOrMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // If width >= 1024px, the browser is presenting a desktop layout (e.g. desktop site mode or desktop device)
      if (width < 1024) {
        setIsMobileDevice(true);
      } else {
        // Desktop site mode active or wide desktop viewport -> hide immediately!
        setIsMobileDevice(false);
      }
    };

    checkMobileStatus();
    window.addEventListener("resize", checkMobileStatus);
    window.addEventListener("orientationchange", checkMobileStatus);

    return () => {
      window.removeEventListener("resize", checkMobileStatus);
      window.removeEventListener("orientationchange", checkMobileStatus);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("ybex_mobile_notice_dismissed_time", Date.now().toString());
  };

  const handleResetDismiss = () => {
    setIsDismissed(false);
    localStorage.removeItem("ybex_mobile_notice_dismissed_time");
  };

  // If not mobile device / viewport, or user dismissed for 24h, do not render
  if (!isMobileDevice || isDismissed) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-3 sm:p-4 select-none pointer-events-auto">
        {/* Semi-transparent Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Card - Solid Dark High-Contrast Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl p-5 sm:p-6 text-[var(--text-primary)] font-sans overflow-hidden z-10"
        >
          {/* Top Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Dismiss Notice"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3.5 mb-4 pr-6">
            <div className="w-11 h-11 rounded-2xl bg-[var(--warning-bg)] border border-[var(--warning-text)]/20 flex items-center justify-center shrink-0 text-[var(--warning-text)] shadow-sm">
              <Smartphone size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--warning-bg)] border border-[var(--warning-text)]/20 text-[var(--warning-text)] text-[10px] font-bold uppercase tracking-wider mb-1">
                
                <span>Mobile App In Development</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight leading-snug">
                Optimized for Desktop Experience
              </h3>
            </div>
          </div>

          {/* Body Description */}
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            We are actively crafting our full native mobile experience! For the most seamless navigation and full feature set, we recommend opening YBEX on your desktop browser, or enabling <strong className="text-[var(--text-primary)] font-bold">Desktop Site Mode</strong> below.
          </p>

          {/* Collapsible How to Enable Desktop Mode Guide */}
          <div className="mb-5">
            <button
              onClick={() => setShowGuideSteps(!showGuideSteps)}
              className="w-full flex items-center justify-between gap-2 p-3.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-bold transition-all cursor-pointer shadow-sm group"
            >
              <span className="flex items-center gap-2 text-[var(--text-primary)]">
                <Monitor size={16} className="text-[var(--violet)] shrink-0" />
                <span className="font-bold">How to enable Desktop Mode in Browser</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--violet)] bg-[var(--violet-soft)] px-2 py-0.5 rounded-lg border border-[var(--violet-border)]">
                {showGuideSteps ? "Hide Steps" : "View Steps"}
                {showGuideSteps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </span>
            </button>

            <AnimatePresence>
              {showGuideSteps && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {/* High Contrast Solid Dark Steps Box */}
                  <div className="mt-2.5 p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-2xl text-xs space-y-3.5 shadow-inner">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--violet)] text-xs border-b border-[var(--border-default)] pb-2.5">
                      <Info size={16} className="shrink-0 text-[var(--violet)]" />
                      <span>Follow these quick steps to switch to Desktop View:</span>
                    </div>

                    {/* Android Chrome */}
                    <div className="space-y-1">
                      <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                        <span className="text-[var(--text-primary)] font-bold text-xs">Chrome (Android / iOS):</span>
                      </div>
                      <p className="pl-7 text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
                        Tap the <strong className="text-[var(--text-primary)] font-bold">three dots (⋮)</strong> menu in top-right → Check the box for <strong className="text-[var(--text-primary)] font-bold">"Desktop site"</strong>.
                      </p>
                    </div>

                    {/* Safari iOS */}
                    <div className="space-y-1">
                      <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                        <span className="text-[var(--text-primary)] font-bold text-xs">Safari (iPhone / iPad):</span>
                      </div>
                      <p className="pl-7 text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
                        Tap the <strong className="text-[var(--text-primary)] font-bold">'aA' or Settings icon</strong> in address bar → Select <strong className="text-[var(--text-primary)] font-bold">"Request Desktop Website"</strong>.
                      </p>
                    </div>

                    <div className="pt-2 text-[11px] text-[var(--text-secondary)] font-medium border-t border-[var(--border-default)] flex items-center gap-1.5">
                      <span>⚡ Note: Once switched to Desktop Site, this popup will automatically disappear!</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer border border-[var(--border-strong)] bg-white text-center shadow-sm"
            >
              Continue Anyway
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-[var(--violet)] hover:bg-[var(--violet-hover)] shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>Got it, thanks!</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
