import React, { useState, useEffect } from "react";
import { Bell, Clock, DollarSign, CheckCircle, RefreshCw, FileText, Star } from "lucide-react";
import { api } from "../../../lib/api";

export default function NotificationsMobile({ role = "brand" }) {
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ API INTEGRATION: Fetch notifications from backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        // Shared axios client: applies /api prefix + ybex_token bearer + HTML guard.
        const { data } = await api.get("notifications", { bypassCache: true });
        
        // Map API response to component format
        const list = Array.isArray(data) ? data : (Array.isArray(data?.notifications) ? data.notifications : []);
        const mappedNotifs = list.map((notif) => ({
          id: notif.notif_id || notif.id,
          type: notif.type || "general",
          title: notif.message || notif.title,
          subtitle: notif.details || new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          accentColor: getAccentColor(notif.type),
          group: getGroup(notif.created_at),
          action: notif.action_url ? { label: "View", onClick: () => window.location.href = notif.action_url } : null
        }));
        
        setNotificationsList(mappedNotifs);
        setError(null);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message);
        setNotificationsList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getAccentColor = (type) => {
    const colorMap = {
      deadline: "red",
      revision: "amber",
      escrow: "green",
      payout: "green",
      rating: "gray",
      briefs: "purple"
    };
    return colorMap[type] || "gray";
  };

  const getGroup = (createdAt) => {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return "Earlier";
  };

  const accentColors = {
    red: { bg: "#FEE2E2", border: "#DC2626", icon: "#DC2626" },
    amber: { bg: "#FFFBEB", border: "#D97706", icon: "#D97706" },
    green: { bg: "#ECFDF3", border: "#059669", icon: "#059669" },
    purple: { bg: "#F5F0FF", border: "#7C3AED", icon: "#7C3AED" },
    gray: { bg: "#F2F2F7", border: "#9CA3AF", icon: "#9CA3AF" }
  };

  // Real data only. Empty API result => empty state, never mockNotifications.
  const displayNotifications = notificationsList;
  
  const groupedNotifications = displayNotifications.reduce((acc, notif) => {
    const group = notif.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(notif);
    return acc;
  }, {});

  const groups = ["Today", "Yesterday", "Earlier"];

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 z-10 flex items-center gap-3">
        <button className="text-gray-900">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7"></path>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-violet-600 animate-spin mb-4"></div>
            <p className="text-sm text-gray-600">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="font-bold text-gray-900 mb-1">Error loading notifications</h2>
            <p className="text-xs text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700"
            >
              Retry
            </button>
          </div>
        ) : displayNotifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Bell size={27} className="text-gray-400" />
            </div>
            <h2 className="font-bold text-gray-900 mb-1 text-lg">You're all caught up</h2>
            <p className="text-xs text-gray-600">Deadlines, escrow movements and payouts show up here first.</p>
          </div>
        ) : (
          <div>
            {groups.map((groupName) =>
              groupedNotifications[groupName] ? (
                <div key={groupName}>
                  {/* Group Header */}
                  <div className="sticky top-0 bg-white px-4 py-2.5 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">{groupName}</h3>
                  </div>

                  {/* Group Items */}
                  <div>
                    {groupedNotifications[groupName].map((notif, idx) => {
                      const colors = accentColors[notif.accentColor] || accentColors.gray;
                      const showBorder = ["red", "amber", "green"].includes(notif.accentColor);

                      return (
                        <div
                          key={notif.id}
                          className={`px-4 py-3.5 flex gap-3 border-t border-gray-100 ${
                            showBorder ? "bg-white" : "bg-white"
                          }`}
                          style={
                            showBorder
                              ? {
                                  borderLeft: `3px solid ${colors.border}`,
                                  background: "#FBFAFF"
                                }
                              : {}
                          }
                        >
                          {/* Icon */}
                          <div
                            className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: colors.bg }}
                          >
                            <notif.icon size={16} color={colors.icon} strokeWidth={2} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm leading-5 font-medium text-gray-900"
                              dangerouslySetInnerHTML={{
                                __html: notif.title.replace(
                                  /\*\*(.*?)\*\*/g,
                                  "<b style='font-weight:600'>$1</b>"
                                )
                              }}
                            />
                            <p className="text-xs text-gray-600 mt-1">{notif.subtitle}</p>
                            {notif.action && (
                              <button
                                onClick={notif.action.onClick}
                                className="mt-2 h-8 px-3.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 inline-block"
                              >
                                {notif.action.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
