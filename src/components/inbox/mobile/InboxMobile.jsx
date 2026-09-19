import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, Bell, X, ShieldCheck, MessageSquare } from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { io } from "socket.io-client";
import { getInboxChip, getIsUgcThread } from "../../chat/mobile/chatStageMap";
import ChatBoxMobile from "../../chat/mobile/ChatBoxMobile";
import NotificationsMobile from "./NotificationsMobile";

export default function InboxMobile({ role: propRole, onSelectThread = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId: routeUserId } = useParams();

  const role = propRole || (user?.role === "brand" ? "brand" : "creator");
  const isBrand = role === "brand";

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [rawThreads, setRawThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Determine target thread ID from URL search or route params
  const targetThreadId =
    searchParams.get("thread") ||
    searchParams.get("threadId") ||
    searchParams.get("dealId") ||
    searchParams.get("deal_id") ||
    searchParams.get("orderId") ||
    searchParams.get("order_id") ||
    searchParams.get("id") ||
    routeUserId;

  // Fetch threads from backend API
  const fetchThreads = useCallback(async (silently = false) => {
    try {
      if (!silently) setLoading(true);
      const { data } = await api.get("chat/v2/threads", { bypassCache: true });
      const list = Array.isArray(data) ? data : Array.isArray(data?.threads) ? data.threads : [];
      setRawThreads(list);
      setError(null);
    } catch (err) {
      console.error("[InboxMobile] Error fetching threads:", err);
      if (!silently) setError(err?.message || "Failed to load conversations");
    } finally {
      if (!silently) setLoading(false);
    }
  }, []);

  // Fetch unread notifications count
  const fetchUnreadNotifs = useCallback(async () => {
    try {
      const { data } = await api.get("notifications/unread", { timeout: 8000 });
      if (Array.isArray(data)) {
        setUnreadNotifsCount(data.length);
      }
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    fetchUnreadNotifs();

    // Polling fallback
    const interval = setInterval(() => {
      fetchThreads(true);
      fetchUnreadNotifs();
    }, 10000);

    // Socket.io real-time connection
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    const currentUserId = user?.user_id || user?.id;
    if (currentUserId) {
      socket.emit("join", currentUserId);
      socket.emit("user:online", currentUserId);
    }

    socket.on("users:online", (users) => {
      if (Array.isArray(users)) setOnlineUsers(users);
    });

    socket.on("message:new", () => {
      fetchThreads(true);
    });

    socket.on("thread:update", () => {
      fetchThreads(true);
    });

    socket.on("threads:refresh", () => {
      fetchThreads(true);
    });

    socket.on("notification:new", () => {
      setUnreadNotifsCount((prev) => prev + 1);
    });

    // Supabase Realtime Channel
    let supabaseChannel = null;
    if (supabase) {
      try {
        supabaseChannel = supabase
          .channel("inbox-mobile-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => {
            fetchThreads(true);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
            fetchThreads(true);
          })
          .subscribe();
      } catch (sErr) {
        console.warn("[InboxMobile] Supabase realtime sync warning:", sErr);
      }
    }

    return () => {
      clearInterval(interval);
      socket.disconnect();
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [fetchThreads, fetchUnreadNotifs, user?.id, user?.user_id]);

  // Handle opening a thread when URL target changes or threads load
  useEffect(() => {
    if (!targetThreadId) {
      setActiveThread(null);
      return;
    }
    const tid = String(targetThreadId).trim();
    const found = rawThreads.find(
      (x) =>
        String(x.id) === tid ||
        String(x.deal_id) === tid ||
        String(x.ugc_order_id) === tid ||
        String(x.creator_id) === tid ||
        String(x.brand_id) === tid
    );
    if (found) {
      setActiveThread(found);
    } else if (targetThreadId && !activeThread) {
      // Direct load attempt
      api
        .get(`chat/v2/threads/${targetThreadId}`)
        .then(({ data }) => {
          if (data) setActiveThread(data);
        })
        .catch(() => {});
    }
  }, [targetThreadId, rawThreads]);

  // Map thread items to UI structure
  const mappedThreads = rawThreads.map((thread) => {
    const isUgc = getIsUgcThread(thread);
    const other = isBrand ? thread.creator : thread.brand;
    const unread = Number(thread.unread_count) || 0;
    const ts = thread.updated_at || thread.created_at;

    const chip = getInboxChip(thread, isBrand);

    // Amount formatting
    const rawAmt =
      thread.agreed_amount ||
      thread.amount_fixed ||
      thread.ugc_order?.amount ||
      thread.ugc_order?.creator_payout ||
      thread.campaign?.budget ||
      thread.campaign_budget ||
      0;
    const formattedAmt = rawAmt > 0 ? `₹${Number(rawAmt).toLocaleString("en-IN")}` : "";

    // Subtitle formatting (e.g. "Summer sunscreen · ₹3,000")
    const baseTitle =
      thread.campaign_title ||
      thread.ugc_title ||
      thread.ugc_order?.title ||
      thread.ugc_brief?.title ||
      (isUgc ? "Instant UGC" : "Campaign Collaboration");
    const subtitle = formattedAmt ? `${baseTitle} · ${formattedAmt}` : baseTitle;

    // Partner name
    const rawName = isBrand
      ? other?.name || other?.full_name || other?.profile?.full_name || other?.profile?.name || "Creator"
      : other?.company_name || other?.profile?.company_name || other?.name || "Brand Partner";

    // Partner picture
    const partnerPic = isBrand
      ? other?.photo || other?.picture || other?.avatar || other?.avatar_url || other?.profile_picture_url || ""
      : other?.logo || other?.logo_url || other?.profile?.logo || other?.profile?.logo_url || "";

    const isVerified = Boolean(other?.verified || other?.is_verified || other?.profile?.is_verified);
    const hasKyc = Boolean(other?.kyc_verified || other?.kyc_status === "APPROVED" || other?.is_kyc_verified);

    // Format timestamp nicely
    let timeText = "";
    if (ts) {
      const d = new Date(ts);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        timeText = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      } else if (diffDays === 1) {
        timeText = "Yesterday";
      } else {
        timeText = d.toLocaleDateString([], { day: "numeric", month: "short" });
      }
    }

    return {
      id: thread.id,
      rawThread: thread,
      name: rawName,
      partnerPic,
      tag: isUgc ? "UGC" : "CAMPAIGN",
      isUgc,
      verified: isVerified,
      hasKyc,
      campaign: subtitle,
      status: chip.label,
      statusBg: chip.bg,
      statusText: chip.text,
      statusDot: chip.dot,
      needsAction: chip.needsAction,
      timestamp: timeText,
      unreadCount: unread,
      highlighted: unread > 0,
    };
  });

  // Actionable filter count
  const isActionable = (t) => t.needsAction || t.unreadCount > 0;
  const needsActionCount = mappedThreads.filter(isActionable).length;

  const filters = isBrand
    ? [
        { label: mappedThreads.length ? `All · ${mappedThreads.length}` : "All", value: "all" },
        { label: "Campaigns", value: "campaigns" },
        { label: "UGC", value: "ugc" },
        { label: needsActionCount ? `Needs action · ${needsActionCount}` : "Needs action", value: "action" },
      ]
    : [
        { label: mappedThreads.length ? `All · ${mappedThreads.length}` : "All", value: "all" },
        { label: "Campaigns", value: "campaigns" },
        { label: "UGC", value: "ugc" },
        { label: needsActionCount ? `Due soon · ${needsActionCount}` : "Due soon", value: "action" },
      ];

  const getAvatarBg = (name) => {
    const palette = [
      "bg-[#F3D9C7] text-[#8C4A27]",
      "bg-[#E0D4FC] text-[#5B21B6]",
      "bg-[#D1E7DD] text-[#0F5132]",
      "bg-[#CFF4FC] text-[#055160]",
      "bg-[#FEE2E2] text-[#991B1B]",
    ];
    const code = String(name || "?").charCodeAt(0);
    return palette[code % palette.length];
  };

  const filteredItems = mappedThreads.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(item.name || "").toLowerCase().includes(q) ||
      String(item.campaign || "").toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "campaigns" && item.tag === "CAMPAIGN") ||
      (activeFilter === "ugc" && item.tag === "UGC") ||
      (activeFilter === "action" && isActionable(item));
    return matchesSearch && matchesFilter;
  });

  const handleThreadSelect = (item) => {
    if (onSelectThread) {
      onSelectThread(item.id);
    }
    setActiveThread(item.rawThread);
    // Reflect in URL
    setSearchParams({ thread: item.id }, { replace: true });
  };

  const handleBackToList = () => {
    setActiveThread(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("thread");
    newParams.delete("threadId");
    newParams.delete("dealId");
    newParams.delete("deal_id");
    newParams.delete("orderId");
    newParams.delete("order_id");
    newParams.delete("id");
    setSearchParams(newParams, { replace: true });
  };

  // If active thread is open, render ChatBoxMobile full-screen
  if (activeThread) {
    return (
      <div className="h-full w-full bg-white flex flex-col">
        <ChatBoxMobile
          thread={activeThread}
          user={user}
          onlineUsers={onlineUsers}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // If notifications view is open, render NotificationsMobile
  if (showNotifications) {
    return (
      <NotificationsMobile
        role={role}
        onBack={() => setShowNotifications(false)}
        onSelectNotification={(notif) => {
          setShowNotifications(false);
          if (notif.thread_id || notif.deal_id || notif.order_id) {
            const targetId = notif.thread_id || notif.deal_id || notif.order_id;
            setSearchParams({ thread: targetId });
          }
        }}
      />
    );
  }

  return (
    <div className="h-full bg-white flex flex-col font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 pt-3.5 pb-2.5 z-10 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-[#0A0A0A] tracking-tight">Inbox</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="w-9 h-9 rounded-xl bg-[#F2F2F5] flex items-center justify-center hover:bg-gray-200 transition relative active:scale-95"
              aria-label="View notifications"
            >
              <Bell size={18} className="text-[#0A0A0A]" />
              {unreadNotifsCount > 0 && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white"></div>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="h-10 rounded-xl bg-[#F2F2F5] flex items-center gap-2.5 px-3 mb-3">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder={isBrand ? "Search creators or campaigns" : "Search brands or briefs"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-[#0A0A0A] placeholder-gray-400 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`h-7 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                activeFilter === filter.value
                  ? "bg-[#0A0A0A] text-white shadow-xs"
                  : "bg-[#F2F2F5] text-[#1C1C1E] hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-violet-600 animate-spin mb-3"></div>
            <p className="text-xs text-gray-500 font-medium">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-3">
              <X size={24} />
            </div>
            <h2 className="font-bold text-gray-900 text-sm mb-1">Unable to load conversations</h2>
            <p className="text-xs text-gray-500 mb-4 max-w-[240px]">{error}</p>
            <button
              onClick={() => fetchThreads()}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-700 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State (Figma Image 3 Panel 3) */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] mb-4">
              <MessageSquare size={26} />
            </div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-2">No conversations yet</h2>
            <p className="text-xs text-[#8E8E93] max-w-[280px] leading-relaxed mb-6">
              Chats open automatically once a brief is claimed or an offer is sent. Nothing to archive, nothing to clean up.
            </p>
            <button
              onClick={() => navigate(isBrand ? "/brand/discover" : "/explore")}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-sm active:scale-95"
            >
              {isBrand ? "Explore creators" : "Browse briefs"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleThreadSelect(item)}
                className={`w-full p-4 flex gap-3.5 hover:bg-gray-50 active:bg-gray-100 transition text-left ${
                  item.highlighted ? "bg-[#FAF8FF]" : "bg-white"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {item.partnerPic ? (
                    <img
                      src={item.partnerPic}
                      alt={item.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full ${getAvatarBg(
                        item.name
                      )} flex items-center justify-center font-bold text-base shadow-2xs`}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name, Verified, KYC, Type Badge, Timestamp, Unread */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-[15px] text-[#0A0A0A] truncate">{item.name}</span>
                    
                    {item.verified && (
                      <ShieldCheck size={14} className="text-[#059669] shrink-0 fill-[#059669] stroke-white" />
                    )}

                    {!isBrand && item.hasKyc && (
                      <span className="bg-[#0A0A0A] text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider shrink-0">
                        KYC
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 tracking-wider ${
                        item.isUgc ? "bg-[#F1E8FF] text-[#7C3AED]" : "bg-[#EAF1FF] text-[#2450B8]"
                      }`}
                    >
                      {item.tag}
                    </span>

                    <span className="text-xs text-gray-400 font-normal ml-auto shrink-0 pl-1">
                      {item.timestamp}
                    </span>

                    {item.unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 ml-1.5 shadow-2xs">
                        <span className="text-[10px] font-bold">{item.unreadCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Campaign Subtitle */}
                  <div className="text-[13px] text-gray-500 mb-2 truncate font-medium">
                    {item.campaign}
                  </div>

                  {/* Row 3: Status Badge */}
                  <div
                    className="h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full"
                    style={{ background: item.statusBg, color: item.statusText }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: item.statusDot }}
                    />
                    <span className="text-xs font-semibold tracking-tight">{item.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
