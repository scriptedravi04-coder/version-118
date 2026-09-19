import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import NotificationItem from "./NotificationItem";
import { io } from "socket.io-client";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const ref = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await api.get("notifications", { timeout: 10000 });
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (e) {
      if (e?.message?.includes("timeout") || e?.code === "ECONNABORTED") {
        console.warn("Notifications check timed out; will retry on next poll cycle.");
      } else if (e?.message?.includes("Received HTML")) {
        console.warn("Notifications check received HTML response (auth flow / cookie check in progress).");
      } else if (e?.message === "Network Error") {
        // Ignore transient network errors during dev server restarts
      } else {
        console.error("Error fetching notifications:", e);
      }
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    // Auto-refresh when tab becomes active / focused again
    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // Listen for custom drawer open event (e.g. from Missed Notifications toast)
    const handleOpenDrawerEvent = () => {
      setOpen(true);
      markAllRead();
    };
    window.addEventListener("open_notification_drawer", handleOpenDrawerEvent);

    const userId = user?.user_id || user?.id;
    if (!userId) return;

    // Establish socket.io connection for real-time notifications
    const socket = io(window.location.origin, {
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      socket.emit("register_user", userId);
    });

    const handleIncomingNotif = (notif) => {
      if (notif && notif.user_id === userId) {
        const id = notif.notif_id || notif.id;
        setNotifications((prev) => {
          if (prev.some((n) => (n.notif_id || n.id) === id)) return prev;
          setUnreadCount((count) => count + 1);
          return [notif, ...prev];
        });
      }
    };

    socket.on("bell_notification", handleIncomingNotif);
    socket.on("new_notification", handleIncomingNotif);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("open_notification_drawer", handleOpenDrawerEvent);
      socket.disconnect();
    };
  }, [user?.user_id]);

  const handleToggleOpen = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState && unreadCount > 0) {
      // Mark all read immediately upon opening sidebar drawer
      markAllRead();
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post("notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  const markOneRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notif_id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Error marking notification read:", e);
    }
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const isPaymentNotification = (n) => {
      const type = n.type;
      const message = (n.message || "").toLowerCase();
      return (
        type === "PAYMENT_RECEIVED" || 
        type === "PAYMENT_PENDING" || 
        type === "PROOF_SUBMITTED" ||
        message.includes("payment") || 
        message.includes("payout") || 
        message.includes("money") || 
        message.includes("earning") || 
        message.includes("rupees") || 
        message.includes("₹")
      );
    };

    const aIsPay = isPaymentNotification(a);
    const bIsPay = isPaymentNotification(b);
    
    if (aIsPay && !bIsPay) return 1;  // Payment goes below non-payment
    if (!aIsPay && bIsPay) return -1; // Non-payment goes above payment
    
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return (
    <div ref={ref} className="relative inline-block z-[100]">
      {/* Bell Button */}
      <button
        onClick={handleToggleOpen}
        className="w-10 h-10 md:w-10 md:h-10 rounded-full md:rounded-[12px] md:rounded-t-[20px] md:rounded-bl-[20px] md:rounded-br-sm bg-white md:bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center relative shadow-sm hover:bg-gray-50 md:hover:bg-[var(--bg-elevated)] transition-all focus:outline-none group cursor-pointer"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-5 h-5 md:w-[18px] md:h-[18px] text-gray-700 md:text-[var(--text-secondary)] group-hover:animate-[jiggle_0.4s_ease-in-out]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--violet)] text-white text-[10px] md:text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold border border-white md:border-[var(--bg-card)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown/Drawer Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            />

            {/* Slide-over Content Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed top-0 right-0 w-full max-w-sm sm:max-w-md h-full bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-2xl z-[250] flex flex-col overflow-hidden select-none text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[var(--violet)]" />
                  <span className="font-bold text-lg tracking-wide text-[var(--text-primary)]">Notifications</span>
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-[var(--violet)] hover:underline mr-2 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    onClick={() => setOpen(false)} 
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--text-secondary)] cursor-pointer"
                  >
                    <X size={20}/>
                  </button>
                </div>
              </div> 

               {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)] bg-[var(--bg-card)]">
                {sortedNotifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-tertiary)] py-12">
                    <span className="text-sm font-medium">No notifications yet</span>
                  </div>
                ) : (
                  sortedNotifications.map((n) => (
                    <NotificationItem
                      key={n.notif_id}
                      notification={n}
                      onRead={markOneRead}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
