import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { formatEnglishNotification } from "../utils/translateNotification";
import { 
  Bell, 
  AlertOctagon, 
  Megaphone, 
  X, 
  Check, 
  Info, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare, 
  Hourglass 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNotificationRedirectPath } from "./shared/NotificationItem";

// Categories:
// 1. subtype = 'warning' -> Blocking modal
// 2. subtype = 'version_update' -> Blocking modal
// 3. subtype = 'general' AND target_type = 'user' -> Blocking modal
// Everything else is Sidebar bell + Toast ONLY (never blocking)
function isBlockingNotification(notif) {
  if (!notif) return false;
  if (notif.event_type) return false; // Any row with event_type is never blocking
  
  const subtype = notif.subtype || 'general';
  const targetType = notif.target_type || 'user';
  const is_admin_message = notif.is_admin_message;

  if (notif.type !== 'admin_notification' && !is_admin_message) {
    return false;
  }

  if (subtype === 'warning' || subtype === 'version_update') {
    return true;
  }
  if (subtype === 'general' && targetType === 'user') {
    return true;
  }
  return false;
}

function getSeverity(notif) {
  if (!notif) return 'info';
  const type = (notif.event_type || notif.type || '').toLowerCase();
  const subtype = (notif.subtype || '').toLowerCase();
  
  // Danger / High Risk (Red)
  if (
    subtype === 'warning' ||
    type.includes('reject') ||
    type.includes('decline') ||
    type.includes('fail') ||
    type.includes('restrict') ||
    type.includes('dispute') ||
    type.includes('danger') ||
    type.includes('error') ||
    type.includes('warn')
  ) {
    return 'danger';
  }
  
  // Warning / Low Risk / Pending / Revision (Yellow/Orange)
  if (
    subtype === 'pending' ||
    subtype === 'revision' ||
    type.includes('pending') ||
    type.includes('revision') ||
    type.includes('escrow') ||
    type.includes('hold') ||
    type.includes('submit') ||
    type.includes('new_application') ||
    type.includes('shortlisted')
  ) {
    return 'warning';
  }
  
  // Success / Good News (Green)
  if (
    type.includes('success') ||
    type.includes('approve') ||
    type.includes('accept') ||
    type.includes('complete') ||
    type.includes('sign') ||
    type.includes('live') ||
    type.includes('deposit') ||
    type.includes('released')
  ) {
    return 'success';
  }
  
  // General / Info / Theme (Purple)
  return 'info';
}

function getEmoji(notif) {
  if (notif.emoji) return notif.emoji;
  
  const type = notif.event_type || notif.type || '';
  const subtype = notif.subtype || '';
  
  if (subtype === 'warning') return '⚠️';
  if (subtype === 'version_update') return '🎉';
  if (subtype === 'general') return '✉️';
  if (subtype === 'announcement') return '📢';
  
  const NOTI_ICONS = {
    KYC_APPROVED: '✅',
    KYC_REJECTED: '❌',
    CAMPAIGN_LIVE: '🚀',
    CAMPAIGN_REJECTED: '❌',
    NEW_APPLICATION: '📩',
    SHORTLISTED: '⭐',
    CHAT_UNLOCKED: '💬',
    OFFER_RECEIVED: '💰',
    DEAL_SIGNED: '🤝',
    CONTENT_SUBMITTED: '🎬',
    CONTENT_APPROVED: '✅',
    REVISION_REQUESTED: '✏️',
    PROOF_SUBMITTED: '📊',
    PAYMENT_RECEIVED: '💸',
    PAYMENT_PENDING: '⏳',
    PAYMENT_METHOD_APPROVED: '🏦',
    PAYMENT_METHOD_REJECTED: '🚫',
    campaign_application_approved: '✅',
    campaign_application_declined: '❌',
    collab_action: '🤝',
    wave: '👋',
    collab_request: '💼'
  };
  
  return NOTI_ICONS[type] || '🔔';
}

export default function NotificationPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Queues and presentation states
  const [blockingQueue, setBlockingQueue] = useState([]);
  const [currentBlocking, setCurrentBlocking] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Toast States
  const [toastQueue, setToastQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [isGapPeriod, setIsGapPeriod] = useState(false);
  const seenIdsRef = useRef(new Set());

  // Browser Permission State
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // 1. Fetch unread notifications on mount and split into appropriate queues
  useEffect(() => {
    if (!user?.user_id) {
      setBlockingQueue([]);
      setCurrentBlocking(null);
      setToastQueue([]);
      setActiveToast(null);
      setIsGapPeriod(false);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await api.get("/notifications/unread", { bypassCache: true, timeout: 10000 });
        if (Array.isArray(res.data)) {
          const unreads = res.data;
          const blocking = unreads.filter(isBlockingNotification);
          const toasts = unreads.filter(n => !isBlockingNotification(n));
          
          setBlockingQueue(blocking);

          // Group missed notifications only when there are multiple unread items (>= 3)
          if (toasts.length > 0 && toasts.length < 3) {
            setToastQueue(toasts);
          } else if (toasts.length >= 3) {
            setToastQueue([{
              notif_id: "missed_summary_" + Date.now(),
              title: "Missed Notifications",
              message: `You have ${toasts.length} new notifications while you were away. Click here to check your notifications.`,
              type: "general",
              subtype: "general",
              emoji: "📬",
              redirect_path: "OPEN_DRAWER"
            }]);
          }
        }
      } catch (err) {
        if (err?.message?.includes("timeout") || err?.code === "ECONNABORTED") {
          console.warn("Unread notifications check timed out; will retry on connection/event.");
        } else {
          console.error("Error fetching unread notifications:", err);
        }
      }
    };

    fetchUnread();

    // Setup Socket.io connection
    const socket = io(window.location.origin, {
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      socket.emit("register_user", user.user_id);
    });

    const handleIncomingNotif = (notif) => {
      if (notif && notif.user_id === user.user_id) {
        const id = notif.notif_id || notif.id;
        if (id) {
          if (seenIdsRef.current.has(id)) return;
          seenIdsRef.current.add(id);
        }
        if (isBlockingNotification(notif)) {
          setBlockingQueue(prev => {
            if (prev.some(n => (n.notif_id || n.id) === id)) return prev;
            return [...prev, notif];
          });
        } else {
          // Check tab focus for OS level native notification
          if (document.hidden && Notification.permission === "granted") {
            try {
              const title = notif.title || "YBEX Notification";
              const body = notif.message || "";
              new Notification(title, { body });
            } catch (e) {
              console.error("Error showing native browser notification:", e);
            }
          } else {
            // Put into FIFO queue for in-app toast
            setToastQueue(prev => {
              if (prev.some(n => (n.notif_id || n.id) === id)) return prev;
              return [...prev, notif];
            });
          }
        }
      }
    };

    // Listen to Socket.io directly
    socket.on("new_notification", handleIncomingNotif);
    socket.on("bell_notification", handleIncomingNotif);

    // Also listen to window CustomEvent from NotificationBell to sync any duplicate-free events
    const handleCustomToastPush = (e) => {
      if (e.detail) {
        handleIncomingNotif(e.detail);
      }
    };
    window.addEventListener("toast_queue_push", handleCustomToastPush);

    // Permission Banner Setup
    if ("Notification" in window && Notification.permission === "default") {
      const dismissed = localStorage.getItem("ybex_notif_prompt_dismissed");
      const choice = localStorage.getItem("ybex_notif_choice") || sessionStorage.getItem("ybex_notif_choice");
      if (!dismissed && choice !== "denied" && choice !== "granted") {
        setShowPermissionBanner(true);
      }
    }

    return () => {
      socket.disconnect();
      window.removeEventListener("toast_queue_push", handleCustomToastPush);
    };
  }, [user?.user_id]);

  // 2. Manage Blocking Modal Queue Shifting
  useEffect(() => {
    if (!currentBlocking && blockingQueue.length > 0) {
      setCurrentBlocking(blockingQueue[0]);
    }
  }, [blockingQueue, currentBlocking]);

  // 3. Manage Toast FIFO Queue & Pacing
  useEffect(() => {
    if (activeToast || isGapPeriod || toastQueue.length === 0) return;

    // Shift next toast from queue
    const nextToast = toastQueue[0];
    setActiveToast(nextToast);
    setToastQueue(prev => prev.slice(1));
  }, [toastQueue, activeToast, isGapPeriod]);

  // Separate effect for Auto-dismiss so it doesn't get cancelled by queue updates
  useEffect(() => {
    if (!activeToast) return;
    
    // Auto-dismiss after 7 seconds
    const dismissTimer = setTimeout(() => {
      dismissActiveToast();
    }, 7000);

    return () => clearTimeout(dismissTimer);
  }, [activeToast]);

  const dismissActiveToast = () => {
    setActiveToast(null);
    setIsGapPeriod(true);
    // 7 seconds Gap/Cooldown period
    setTimeout(() => {
      setIsGapPeriod(false);
    }, 7000);
  };

  const handleToastClick = async (notif) => {
    // Dismiss early
    dismissActiveToast();

    // If it's a missed notifications summary or directed to drawer, open notification drawer
    if (notif?.redirect_path === "OPEN_DRAWER" || notif?.notif_id?.startsWith("missed_summary") || notif?.title === "Missed Notifications") {
      window.dispatchEvent(new CustomEvent("open_notification_drawer"));
      return;
    }

    // Mark as read in backend
    try {
      if (notif?.notif_id) {
        await api.post(`/notifications/${notif.notif_id}/read`);
      }
    } catch (err) {
      console.error("Failed to mark toast as read in backend:", err);
    }

    // Navigate to target route
    const path = getNotificationRedirectPath(notif, user?.role || "creator");
    if (path) {
      navigate(path);
    }
  };

  const handleAction = async (actionType) => {
    if (!currentBlocking || processing) return;
    setProcessing(true);

    try {
      const res = await api.post(`/notifications/${currentBlocking.notif_id}/ack`, {
        action: actionType
      });

      // Clear current blocking and filter out of queue
      setBlockingQueue(prev => prev.filter(n => n.notif_id !== currentBlocking.notif_id));
      setCurrentBlocking(null);

      if (actionType === "contact_support" && res.data?.redirect) {
        navigate(res.data.redirect);
      }
    } catch (err) {
      console.error("Error acknowledging notification:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDismissAll = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      await api.post("/notifications/read-all");
      setBlockingQueue([]);
      setCurrentBlocking(null);
    } catch (err) {
      console.error("Error dismissing all notifications:", err);
    } finally {
      setProcessing(false);
    }
  };

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem("ybex_notif_choice", permission);
      if (permission === "granted") {
        console.log("Browser notifications granted!");
      } else {
        console.log("Browser notifications denied.");
      }
    } catch (err) {
      console.error("Error requesting browser notification permission:", err);
    } finally {
      setShowPermissionBanner(false);
    }
  };

  const dismissPermissionBanner = () => {
    // Only dismiss for this session to respect the "only re-prompt if they previously dismissed"
    sessionStorage.setItem("ybex_notif_choice", "dismissed");
    setShowPermissionBanner(false);
  };

  const getBlockingIcon = () => {
    if (!currentBlocking) return null;
    switch (currentBlocking.subtype) {
      case "warning":
        return <AlertOctagon className="w-12 h-12 text-[var(--red)] animate-pulse" />;
      case "version_update":
        return <CheckCircle2 className="w-12 h-12 text-[var(--violet)]" />;
      case "announcement":
        return <Megaphone className="w-12 h-12 text-[var(--violet)]" />;
      default:
        return <Bell className="w-12 h-12 text-[var(--violet)]" />;
    }
  };

  // Toast Color Schemes per Severity/Style
  const getToastStyle = (notif) => {
    const sev = getSeverity(notif);
    switch (sev) {
      case 'danger':
        return {
          bg: 'bg-[#FEF2F2]', // Soft red background
          border: 'border-[#FCA5A5]/60', // soft red border
          accent: '#EF4444', // Red accent
          text: 'text-[#991B1B]',
          titleColor: 'text-[#991B1B]',
          descColor: 'text-[#B91C1C]',
          badgeBg: 'bg-[#EF4444]', // solid red
          badgeText: 'text-[#FFFFFF]',
          badgeLabel: '⚠️ Danger',
          iconBg: 'bg-[#FEE2E2]',
          iconBorder: 'border-[#FEB2B2]',
          iconColor: 'text-[#EF4444]',
          icon: <ShieldAlert size={20} className="text-[#EF4444]" />
        };
      case 'warning':
        return {
          bg: 'bg-[#FFFBEB]', // Soft amber background
          border: 'border-[#FCD34D]/60', // soft amber border
          accent: '#F59E0B', // Amber accent
          text: 'text-[#92400E]',
          titleColor: 'text-[#92400E]',
          descColor: 'text-[#B45309]',
          badgeBg: 'bg-[#F59E0B]', // solid amber
          badgeText: 'text-[#FFFFFF]',
          badgeLabel: '⚠️ Warning',
          iconBg: 'bg-[#FEF3C7]',
          iconBorder: 'border-[#FDE68A]',
          iconColor: 'text-[#D97706]',
          icon: <AlertTriangle size={20} className="text-[#D97706]" />
        };
      case 'success':
        return {
          bg: 'bg-[#ECFDF5]', // Soft emerald background
          border: 'border-[#A7F3D0]/60', // soft emerald border
          accent: '#10B981', // Emerald accent
          text: 'text-[#065F46]',
          titleColor: 'text-[#065F46]',
          descColor: 'text-[#047857]',
          badgeBg: 'bg-[#10B981]', // solid emerald
          badgeText: 'text-[#FFFFFF]',
          badgeLabel: 'Success',
          iconBg: 'bg-[#D1FAE5]',
          iconBorder: 'border-[#A7F3D0]',
          iconColor: 'text-[var(--green)]',
          icon: <CheckCircle2 size={20} className="text-[var(--green)]" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-[#F5F0FF]', // Soft purple/lavender background (theme-based)
          border: 'border-[#DDD6FE]/60', // soft lavender border
          accent: 'var(--violet)', // Theme violet
          text: 'text-[#5B21B6]',
          titleColor: 'text-[#5B21B6]',
          descColor: 'text-[var(--violet-hover)]',
          badgeBg: 'bg-[var(--violet)]', // solid violet
          badgeText: 'text-[#FFFFFF]',
          badgeLabel: '📢 Update',
          iconBg: 'bg-[#EDE9FE]',
          iconBorder: 'border-[#DDD6FE]',
          iconColor: 'text-[var(--violet)]',
          icon: <MessageSquare size={18} className="text-[var(--violet)]" />
        };
    }
  };

  const activeToastStyle = activeToast ? getToastStyle(activeToast) : null;

  return createPortal(
    <>
      {/* 1. macOS-Style Toast Banner */}
      <AnimatePresence>
        {activeToast && activeToastStyle && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className={`fixed bottom-4 left-4 right-4 sm:bottom-auto sm:top-4 sm:left-auto sm:right-4 z-[999999] w-[calc(100%-32px)] sm:w-full sm:max-w-[380px] ${activeToastStyle.bg} rounded-3xl border ${activeToastStyle.border} shadow-2xl p-5 flex flex-col gap-4 overflow-visible cursor-pointer transition-all hover:scale-[1.02]`}
            onClick={() => handleToastClick(activeToast)}
            id="macos-toast"
          >
            {/* Top Pill Badge (overlapping the border) */}
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${activeToastStyle.badgeBg} ${activeToastStyle.badgeText} px-3.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1.5 border border-white/10 select-none whitespace-nowrap`}>
              {activeToastStyle.badgeLabel}
            </div>

            <div className="flex items-start gap-4">
              {/* Left Column: Icon Container */}
              <div className={`w-12 h-12 rounded-2xl ${activeToastStyle.iconBg} ${activeToastStyle.iconBorder} border flex items-center justify-center text-xl shrink-0 shadow-inner relative overflow-hidden`}>
                {/* Subtle Grid Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
                {activeToastStyle.icon}
              </div>

              {/* Right Column: Title & Message */}
              <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-extrabold tracking-tight leading-tight ${activeToastStyle.titleColor} truncate`}>
                    {activeToast.title || "Notification"}
                  </h4>
                  {/* Manual Dismiss inside header */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissActiveToast();
                    }}
                    className="p-1 hover:bg-black/5 rounded-full text-black/30 hover:text-black/60 transition-colors shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className={`text-xs mt-1.5 leading-relaxed font-semibold ${activeToastStyle.descColor} line-clamp-2`}>
                  {formatEnglishNotification(activeToast.message)}
                </p>
              </div>
            </div>

            {/* Action Buttons at the bottom */}
            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-black/[0.03]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissActiveToast();
                }}
                className="text-[11px] font-bold text-black/40 hover:text-black/70 px-3.5 py-1.5 hover:bg-black/5 rounded-xl transition-all cursor-pointer"
              >
                Dismiss
              </button>
              {(activeToast?.redirect_path === "OPEN_DRAWER" || activeToast?.notif_id?.startsWith("missed_summary") || getNotificationRedirectPath(activeToast, user?.role || "creator")) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToastClick(activeToast);
                  }}
                  className="text-[11px] font-extrabold text-white bg-black hover:bg-black/80 px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    {(activeToast?.redirect_path === "OPEN_DRAWER" || activeToast?.notif_id?.startsWith("missed_summary")) ? "Open Notifications" : "View Details"}
                  </span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>

            {/* Countdown Progress line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/[0.02] overflow-hidden rounded-b-3xl">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 7, ease: "linear" }}
                className="h-full"
                style={{ backgroundColor: activeToastStyle.accent }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Sleek Custom Permission Banner (Compact at bottom right) */}
      <AnimatePresence>
        {showPermissionBanner && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-3 right-3 left-3 sm:left-auto z-[99998] w-auto sm:max-w-xs bg-white rounded-xl border border-gray-200 shadow-xl p-3 select-none text-left"
            id="permission-banner"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F5F0FF] flex items-center justify-center shrink-0 mt-0.5">
                <Bell size={14} className="text-[var(--violet)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Enable Notifications</h5>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Get real-time updates for applications & messages.
                </p>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={dismissPermissionBanner}
                    className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={requestBrowserPermission}
                    className="text-[11px] font-bold text-white bg-[var(--violet)] hover:bg-[var(--violet-hover)] px-3 py-1 rounded-lg cursor-pointer shadow-xs transition-colors"
                  >
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Full-Screen Blocking Modal */}
      <AnimatePresence>
        {currentBlocking && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 overflow-hidden select-none" id="ybex-popup-overlay">
            {/* Backdrop-blur semi-transparent black overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-[#FFFFFF] rounded-3xl border border-[var(--border-default)] shadow-2xl p-6 sm:p-8 flex flex-col font-sans select-text text-[var(--text-primary)]"
              id="ybex-popup-card"
            >
              {/* Header Area */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4 p-3 bg-[#F5F0FF] rounded-2xl border border-[#DDD6FE] inline-flex items-center justify-center">
                  {getBlockingIcon()}
                </div>
                
                <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight leading-snug">
                  {currentBlocking.title || (currentBlocking.subtype === "warning" ? "Official Warning Notice" : currentBlocking.subtype === "version_update" ? "New Platform Update is Here!" : "System Notification")}
                </h2>

                {currentBlocking.subtype === "version_update" && currentBlocking.version_number && (
                  <span className="mt-2 px-3 py-1 bg-[#F5F0FF] text-[var(--violet)] text-xs font-extrabold uppercase tracking-wider rounded-full border border-[#DDD6FE]">
                    v{currentBlocking.version_number}
                  </span>
                )}
              </div>

              {/* Body Area */}
              <div className="flex-1 overflow-y-auto max-h-[220px] mb-8 pr-1 scrollbar-thin">
                {currentBlocking.subtype === "version_update" ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-[var(--text-secondary)] leading-relaxed text-center">
                      We've rolled out a fresh set of updates and optimizations:
                    </p>
                    <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-default)] text-left">
                      <ul className="space-y-2.5">
                        {Array.isArray(currentBlocking.changelog) && currentBlocking.changelog.length > 0 ? (
                          currentBlocking.changelog.map((line, idx) => (
                            <li key={idx} className="flex gap-2.5 text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                              <span className="text-[var(--violet)] select-none mt-0.5">•</span>
                              <span>{line}</span>
                            </li>
                          ))
                        ) : (
                          currentBlocking.message ? (
                            currentBlocking.message.split("\n").map((line, idx) => {
                              const clean = line.replace(/^[•\-\*\s]+/, "");
                              if (!clean) return null;
                              return (
                                <li key={idx} className="flex gap-2.5 text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                                  <span className="text-[var(--violet)] select-none mt-0.5">•</span>
                                  <span>{clean}</span>
                                </li>
                              );
                            })
                          ) : (
                            <li className="text-xs text-[var(--text-secondary)] italic">Performance enhancements and bug fixes.</li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border-default)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {currentBlocking.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons Area */}
              <div className="flex flex-col gap-3">
                {currentBlocking.subtype === "warning" ? (
                  <>
                    <button
                      onClick={() => handleAction("contact_support")}
                      disabled={processing}
                      className="w-full py-3 px-4 bg-[#FFFFFF] hover:bg-[#F5F0FF] text-[var(--violet)] border border-[#DDD6FE] text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      id="notif-btn-support"
                    >
                      Contact Support
                    </button>
                    <button
                      onClick={() => handleAction("sure")}
                      disabled={processing}
                      className="w-full py-3 px-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-[#FFFFFF] text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      id="notif-btn-comply"
                    >
                      I Understand & Comply
                    </button>
                  </>
                ) : currentBlocking.subtype === "version_update" ? (
                  <button
                    onClick={() => handleAction("sure")}
                    disabled={processing}
                    className="w-full py-3.5 px-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-[#FFFFFF] text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    id="notif-btn-explore"
                  >
                    Amazing, let's explore!
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction("sure")}
                    disabled={processing}
                    className="w-full py-3 px-4 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-[#FFFFFF] text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    id="notif-btn-dismiss"
                  >
                    Dismiss Alert
                  </button>
                )}

                {blockingQueue.length > 1 && (
                  <button
                    onClick={handleDismissAll}
                    disabled={processing}
                    className="w-full py-2.5 px-4 bg-gray-50 hover:bg-red-50 text-red-500 hover:text-red-700 text-xs font-bold rounded-xl border border-dashed border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                    id="notif-btn-dismiss-all"
                  >
                    Dismiss All Remaining Alerts ({blockingQueue.length})
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
