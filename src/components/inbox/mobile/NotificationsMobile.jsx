import React, { useState, useEffect } from "react";
import { ChevronLeft, Bell, Clock, AlertCircle, CreditCard, MessageSquare, CheckCircle2 } from "lucide-react";
import { api } from "../../../lib/api";

export default function NotificationsMobile({ role = "brand", onBack, onSelectNotification = null }) {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const isBrand = role === "brand";

  const tabs = isBrand
    ? [
        { id: "all", label: "All" },
        { id: "orders", label: "Orders" },
        { id: "payments", label: "Payments" },
      ]
    : [
        { id: "all", label: "All" },
        { id: "briefs", label: "Briefs" },
        { id: "payouts", label: "Payouts" },
      ];

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("notifications", { bypassCache: true });
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.post("notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (item) => {
    if (!item.read) {
      try {
        await api.post(`notifications/${item.notif_id || item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => ((n.notif_id || n.id) === (item.notif_id || item.id) ? { ...n, read: true } : n))
        );
      } catch (e) {
        // silent
      }
    }
    if (onSelectNotification) {
      onSelectNotification(item);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "all") return true;
    const type = String(item.type || item.subtype || "").toLowerCase();
    const title = String(item.title || "").toLowerCase();
    const msg = String(item.message || "").toLowerCase();

    if (isBrand) {
      if (activeTab === "orders") {
        return (
          type.includes("order") ||
          type.includes("brief") ||
          type.includes("campaign") ||
          type.includes("draft") ||
          type.includes("deliverable") ||
          title.includes("order") ||
          title.includes("draft")
        );
      }
      if (activeTab === "payments") {
        return (
          type.includes("payment") ||
          type.includes("escrow") ||
          type.includes("payout") ||
          title.includes("payment") ||
          title.includes("escrow") ||
          msg.includes("₹")
        );
      }
    } else {
      if (activeTab === "briefs") {
        return (
          type.includes("brief") ||
          type.includes("campaign") ||
          type.includes("order") ||
          type.includes("draft") ||
          title.includes("brief") ||
          title.includes("campaign")
        );
      }
      if (activeTab === "payouts") {
        return (
          type.includes("payout") ||
          type.includes("payment") ||
          type.includes("escrow") ||
          title.includes("payout") ||
          title.includes("payment") ||
          msg.includes("₹")
        );
      }
    }
    return true;
  });

  const getNotificationCategory = (item) => {
    const text = `${item.title || ""} ${item.message || ""} ${item.type || ""}`.toLowerCase();
    if (text.includes("waiting on your review") || text.includes("review draft") || text.includes("sla") || text.includes("reupload")) {
      return {
        color: "amber",
        borderColor: "#F59E0B",
        bg: "#FFFBEB",
        icon: <Clock size={16} className="text-amber-600" />,
        actionLabel: isBrand ? "Review draft" : "Reupload draft",
      };
    }
    if (text.includes("counter") || text.includes("expire") || text.includes("declined") || text.includes("alert")) {
      return {
        color: "red",
        borderColor: "#EF4444",
        bg: "#FEF2F2",
        icon: <AlertCircle size={16} className="text-red-600" />,
        actionLabel: text.includes("counter") ? "Respond to counter" : null,
      };
    }
    if (text.includes("escrow") || text.includes("deposit") || text.includes("payment")) {
      return {
        color: "purple",
        borderColor: "#8B5CF6",
        bg: "#F5F3FF",
        icon: <CreditCard size={16} className="text-purple-600" />,
        actionLabel: null,
      };
    }
    if (text.includes("released") || text.includes("received") || text.includes("completed") || text.includes("approved")) {
      return {
        color: "green",
        borderColor: "#10B981",
        bg: "#ECFDF5",
        icon: <CheckCircle2 size={16} className="text-emerald-600" />,
        actionLabel: null,
      };
    }
    return {
      color: "gray",
      borderColor: "#9CA3AF",
      bg: "#F9FAFB",
      icon: <MessageSquare size={16} className="text-gray-500" />,
      actionLabel: null,
    };
  };

  // Group by date
  const now = new Date();
  const todayItems = [];
  const yesterdayItems = [];
  const olderItems = [];

  filteredNotifications.forEach((item) => {
    const d = new Date(item.created_at || item.timestamp || Date.now());
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      todayItems.push(item);
    } else if (diffHours < 48) {
      yesterdayItems.push(item);
    } else {
      olderItems.push(item);
    }
  });

  const renderSection = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div key={title} className="mb-4">
        <div className="text-[11px] font-bold text-gray-400 tracking-wider px-4 py-2 uppercase">
          {title}
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {items.map((item) => {
            const meta = getNotificationCategory(item);
            const id = item.notif_id || item.id || item._id;
            return (
              <div
                key={id}
                onClick={() => handleItemClick(item)}
                className={`p-4 flex gap-3.5 transition cursor-pointer relative ${
                  item.read ? "bg-white" : "bg-[#FAF8FF]"
                }`}
                style={{
                  borderLeft: `3px solid ${meta.borderColor}`,
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.bg }}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-gray-900 truncate pr-2">
                      {item.title || "Notification"}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Just now"}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed mb-2">
                    {item.message || item.content || item.body || ""}
                  </p>
                  {meta.actionLabel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition"
                    >
                      {meta.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-[#F8F9FB] flex flex-col font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 pt-3 pb-3 z-10 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition active:scale-95"
              aria-label="Back to inbox"
            >
              <ChevronLeft size={22} className="text-gray-900" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 px-2 py-1 rounded transition active:opacity-70 disabled:opacity-50"
          >
            {markingAll ? "Marking..." : "Mark all read"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-7 px-3.5 rounded-full text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-[#0A0A0A] text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-violet-600 animate-spin mb-3"></div>
            <p className="text-xs text-gray-500">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <Bell size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">You're all caught up</h3>
            <p className="text-xs text-gray-500 max-w-[260px] leading-relaxed">
              Deadlines, escrow movements and payouts show up here first.
            </p>
          </div>
        ) : (
          <div className="py-2">
            {todayItems.length > 0 && renderSection("TODAY", todayItems)}
            {yesterdayItems.length > 0 && renderSection("YESTERDAY", yesterdayItems)}
            {olderItems.length > 0 && renderSection("OLDER", olderItems)}
          </div>
        )}
      </div>
    </div>
  );
}
