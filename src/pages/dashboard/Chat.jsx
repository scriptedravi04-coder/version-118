import { safeStorage } from "../../utils/storage";
import { isUgcThread as isUgc } from "../../utils/dealFlow";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useLoading } from "../../contexts/LoadingContext";
import { 
  Search, ShieldAlert, Lock, BarChart3, TrendingUp, 
  Users, Flame, ArrowUpRight, MapPin, CheckCircle2, ChevronLeft, ChevronRight
} from "lucide-react";
import ChatBox from "../../components/chat/ChatBox";
import ChatBoxMobile from "../../components/chat/mobile/ChatBoxMobile";
import InboxMobile from "../../components/inbox/mobile/InboxMobile";
import useIsMobile from "../../hooks/useIsMobile";
import { io } from "socket.io-client";

export default function Chat() {
  const { userId: urlUserId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const isMobile = useIsMobile();
  
  // Extract target ID from either path parameter or query string
  const queryTargetId = searchParams.get("thread") || 
    searchParams.get("threadId") || 
    searchParams.get("dealId") || 
    searchParams.get("deal_id") || 
    searchParams.get("orderId") || 
    searchParams.get("order_id") || 
    searchParams.get("creator") || 
    searchParams.get("creator_id") || 
    searchParams.get("id");
  
  const urlThreadId = urlUserId || queryTargetId;

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [search, setSearch] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const [allCreators, setAllCreators] = useState([]);
  const [virtualPartner, setVirtualPartner] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [tabFilter, setTabFilter] = useState("all"); // 'all' | 'campaigns' | 'ugc' | 'unread'

  const isBrand = user?.role === 'brand' || user?.user_type === 'brand';

  // Helper to match thread across IDs, UGC order IDs, deal IDs, and partner user IDs
  const matchThread = useCallback((threadList, targetId) => {
    if (!targetId || !Array.isArray(threadList)) return null;
    const tid = String(targetId).trim();
    if (!tid) return null;

    // 1. Direct ID matches
    let found = threadList.find(x => 
      String(x.id) === tid || 
      String(x.deal_id) === tid || 
      String(x.collab_id) === tid || 
      String(x.ugc_order_id) === tid ||
      String(x.ugc_order?.id) === tid ||
      String(x.ugc_order?.order_id) === tid ||
      (x.id && x.id.replace(/^thread_ugc_/, '') === tid) ||
      (x.deal_id && String(x.deal_id).replace(/^thread_ugc_/, '') === tid) ||
      (tid.startsWith('thread_ugc_') && x.id === tid.replace('thread_ugc_', '')) ||
      (tid.startsWith('thread_ugc_') && x.deal_id === tid.replace('thread_ugc_', ''))
    );
    if (found) return found;

    // 2. Match by partner user ID
    const userMatches = threadList.filter(x => String(x.creator_id) === tid || String(x.brand_id) === tid);
    if (userMatches.length > 0) {
      userMatches.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
      return userMatches[0];
    }

    // 3. Match new_ prefix if applicable
    if (tid.startsWith("new_")) {
      const actualId = tid.replace("new_", "");
      return matchThread(threadList, actualId);
    }

    return null;
  }, []);

  // Fetch all creators for contact list when viewer is brand
  useEffect(() => {
    if (isBrand && user) {
      api.get("creators")
        .then(({ data }) => {
          if (data && Array.isArray(data)) {
            setAllCreators(data);
          }
        })
        .catch(err => console.error("Error loading creators for contact list:", err));
    }
  }, [isBrand, user]);

  // Fetch virtual partner profile (when thread isNew)
  useEffect(() => {
    if (activeThread?.isNew) {
      const partnerId = isBrand ? activeThread.creator_id : activeThread.brand_id;
      if (isBrand && partnerId) {
        // Check if creator exists in allCreators first
        const existing = allCreators?.find(c => String(c.user_id || c.id) === String(partnerId));
        if (existing) {
          setVirtualPartner({
            user_id: partnerId,
            name: existing.name || existing.full_name || "Creator",
            profile_picture_url: existing.photo || existing.picture || existing.profile_picture_url,
            logo_url: existing.photo || existing.picture || existing.profile_picture_url,
            profile: existing
          });
          return;
        }

        // Try /creators/:id/profile then /creators/:id, with fallback
        api.get(`/creators/${partnerId}/profile`)
          .then(({ data }) => {
            if (data) {
              setVirtualPartner({
                user_id: partnerId,
                name: data.name || data.full_name || "Creator",
                profile_picture_url: data.photo || data.picture || data.profile_picture_url,
                logo_url: data.photo || data.picture || data.profile_picture_url,
                profile: data
              });
            }
          })
          .catch(() => {
            api.get(`/creators/${partnerId}`)
              .then(({ data }) => {
                if (data) {
                  setVirtualPartner({
                    user_id: partnerId,
                    name: data.name || data.full_name || "Creator",
                    profile_picture_url: data.photo || data.picture || data.profile_picture_url,
                    logo_url: data.photo || data.picture || data.profile_picture_url,
                    profile: data
                  });
                }
              })
              .catch(() => {
                // Graceful fallback for new/virtual partner thread
                setVirtualPartner({
                  user_id: partnerId,
                  name: "Creator Partner",
                  profile_picture_url: "",
                  logo_url: "",
                  profile: {}
                });
              });
          });
      }
    } else {
      setVirtualPartner(null);
    }
  }, [activeThread?.id, activeThread?.isNew, isBrand, allCreators]);

  // Real-time socket connection for user online presence and message listeners
  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      socket.emit("register_user", user.user_id || user.id);
      socket.emit("get_online_users");
    });

    socket.on("online_users_list", (users) => {
      setOnlineUsers(users || []);
    });

    socket.on("user_status_change", ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === "online") {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        } else {
          return prev?.filter(id => id !== userId);
        }
      });
    });

    socket.on("thread_updated", (payload) => {
      api.get("chat/v2/threads").then(({ data }) => {
        if (data) {
          setThreads(data);
          setActiveThread(prev => {
            if (!prev) return prev;
            const updated = data.find(t => t.id === prev.id || (prev.deal_id && t.deal_id === prev.deal_id));
            return updated ? { ...prev, ...updated } : prev;
          });
        }
      }).catch(err => console.error("Socket thread update error:", err));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Mark active thread as read
  useEffect(() => {
    if (activeThread && user && threads.length > 0) {
      const activeT = threads.find(t => t.id === activeThread.id);
      if (activeT) {
        safeStorage.setItem(`last_read_count_${user.user_id || user.id}_${activeThread.id}`, String(activeT.total_messages_count || 0));
      }
    }
  }, [activeThread?.id, threads, user]);

  // Listen to read updates from ChatBox
  useEffect(() => {
    const handleReadUpdate = () => {
      setThreads(prev => [...prev]);
    };
    window.addEventListener("chat_read_update", handleReadUpdate);
    return () => {
      window.removeEventListener("chat_read_update", handleReadUpdate);
    };
  }, []);

  useEffect(() => {
    setHasLoaded(false);
  }, [user?.user_id || user?.id]);

  useEffect(() => {
    if (!hasLoaded) {
      loadThreads();
    } else {
      if (urlThreadId) {
        let t = matchThread(threads, urlThreadId);

        if (t) {
          setActiveThread(t);
        } else if (urlThreadId.length > 0) {
          // Attempt direct fetch from server before setting new thread placeholder
          api.get(`chat/v2/threads/${urlThreadId}`)
            .then(({ data }) => {
              if (data) {
                setActiveThread(data);
                setThreads(prev => [...prev.filter(x => x.id !== data.id), data]);
              }
            })
            .catch((err) => {
              if (err?.response?.status === 404 || urlThreadId.startsWith("new_")) {
                const actualId = urlThreadId.startsWith("new_") ? urlThreadId.replace("new_", "") : urlThreadId;
                setActiveThread({
                  id: urlThreadId.startsWith("new_") ? urlThreadId : `new_${actualId}`,
                  creator_id: isBrand ? actualId : (user?.user_id || user?.id),
                  brand_id: isBrand ? (user?.user_id || user?.id) : actualId,
                  status: 'NEGOTIATING',
                  isNew: true
                });
              } else {
                toast.error("Failed to load conversation thread.", {
                  action: {
                    label: "Retry",
                    onClick: () => loadThreads()
                  }
                });
              }
            });
        }
      } else {
        // When urlThreadId is missing (e.g. /inbox), reset the active thread to null
        setActiveThread(null);
      }
    }
  }, [user, urlThreadId, threads, hasLoaded, matchThread]);

  const loadThreads = async () => {
    if (!user) return;
    startLoading();
    try {
      const { data } = await api.get("chat/v2/threads");
      setThreads(data || []);
      setIsRestricted(false);
      
      if (urlThreadId) {
        let t = matchThread(data || [], urlThreadId);

        if (t) {
          setActiveThread(t);
        } else if (urlThreadId.length > 0) {
          api.get(`chat/v2/threads/${urlThreadId}`)
            .then(({ data: threadData }) => {
              if (threadData) {
                setActiveThread(threadData);
                setThreads(prev => [...prev.filter(x => x.id !== threadData.id), threadData]);
              }
            })
            .catch(() => {
              const actualId = urlThreadId.startsWith("new_") ? urlThreadId.replace("new_", "") : urlThreadId;
              setActiveThread({
                id: urlThreadId.startsWith("new_") ? urlThreadId : `new_${actualId}`,
                creator_id: isBrand ? actualId : (user?.user_id || user?.id),
                brand_id: isBrand ? (user?.user_id || user?.id) : actualId,
                status: 'NEGOTIATING',
                isNew: true
              });
            });
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 && err.response?.data?.restricted) {
        setIsRestricted(true);
        setRestrictionMessage(err.response.data.detail);
      }
    } finally {
      setHasLoaded(true);
      stopLoading();
    }
  };

  // Merge actual threads with active virtual and default seeded creators
  const displayThreads = [...threads];
  
  if (activeThread && activeThread.isNew) {
    const virtualThreadWithPartner = {
      ...activeThread,
      creator: isBrand ? virtualPartner : activeThread.creator,
      brand: !isBrand ? virtualPartner : activeThread.brand,
      updated_at: activeThread.updated_at || new Date().toISOString()
    };
    if (!threads.some(t => t.id === activeThread.id || t.creator_id === activeThread.creator_id)) {
      displayThreads.push(virtualThreadWithPartner);
    }
  }

  const filteredThreads = displayThreads?.filter(t => {
    const opp = isBrand ? t.creator : t.brand;
    const matchesSearch = !opp || (opp.name || opp.company_name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Was an inline check that omitted the ugcord_/thread_ugc_ prefixes, so a UGC thread
    // without the is_ugc flag (which the DB does not set) was listed under Campaigns.
    const isUgcThread = isUgc(t);

    if (tabFilter === "campaigns") {
      return !isUgcThread;
    }
    if (tabFilter === "ugc") {
      return isUgcThread;
    }
    if (tabFilter === "unread") {
      let unreadCount = t.unread_count ?? t.unreadCount ?? 0;
      if (t.last_message?.sender_user_id === (user?.user_id || user?.id)) {
        unreadCount = 0;
      }
      return unreadCount > 0;
    }
    return true;
  });

  const displayActiveThread = activeThread?.isNew && virtualPartner ? {
    ...activeThread,
    creator: isBrand ? virtualPartner : activeThread.creator,
    brand: !isBrand ? virtualPartner : activeThread.brand
  } : activeThread;

  if (isMobile) {
    return <InboxMobile role={isBrand ? "brand" : "creator"} />;
  }

  if (isRestricted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[var(--bg-base)] relative overflow-hidden min-h-[500px] h-full">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[120%] absolute bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwIDBMMCAwaDB2MzBoMzBWMHptLTEgMXYyOEgxVjFoMjh6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDcpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] [mask-image:radial-gradient(circle_at_center,black_0%,transparent_50%)] opacity-40"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center max-w-md px-6 py-12 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-lg animate-pulse">
               <ShieldAlert size={40} className="text-rose-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--violet)] text-white rounded-xl flex items-center justify-center shadow-md">
               <Lock size={16} />
            </div>
          </div>
          
          <h3 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-3">Inbox Locked 🔒</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
            {restrictionMessage || "Please apply to at least one campaign to unlock your chat and inbox section!"}
          </p>

          <Link to="/campaigns" className="px-6 py-3.5 bg-[var(--violet)] hover:bg-[#6b3deb] text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg hover:scale-105 transform duration-200">
             Explore Campaigns &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[var(--bg-card)] h-full overflow-hidden border-t border-[var(--border-default)] text-[var(--text-primary)]">
      
      {/* 2. Sidebar - Inbox List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[var(--border-default)] flex flex-col bg-white dark:bg-[var(--bg-card)] shrink-0 ${activeThread ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3.5 md:p-5 border-b border-[var(--border-default)] h-13 md:h-20 shrink-0 flex items-center justify-between">
          <h2 className="text-base md:text-xl font-display font-bold text-[var(--text-primary)]">Inbox</h2>
          <div className="flex gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-default)] overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'campaigns', label: 'Campaigns' },
              { id: 'ugc', label: 'UGC' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`px-2 md:px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                  tabFilter === tab.id
                    ? 'bg-[var(--violet)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-2.5 md:p-4 border-b border-[var(--border-default)] bg-white dark:bg-[var(--bg-card)] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] md:w-4 md:h-4" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg md:rounded-xl pl-8 md:pl-9 pr-3 md:pr-4 py-1.5 md:py-2.5 text-xs md:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--violet)] transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredThreads?.map((t, idx) => {
            const isActive = activeThread?.id === t.id;
            const partner = isBrand ? t.creator : t.brand;
            const isPartnerOnline = partner && onlineUsers.includes(partner.user_id || partner.id);

            const partnerName = (!isBrand ? (partner?.profile?.company_name || partner?.company_name) : (partner?.profile?.full_name || partner?.profile?.name || partner?.full_name)) || partner?.name || 'Unknown';
            const resolvedPic = (partner ? (
              (!isBrand ? (
                partner.profile?.logo || 
                partner.logo || 
                partner.logo_url || 
                partner.profile?.logo_url ||
                partner.photo || 
                partner.picture || 
                partner.avatar || 
                partner.avatar_url
              ) : (
                partner.photo || 
                partner.picture || 
                partner.avatar || 
                partner.avatar_url || 
                partner.profile?.photo || 
                partner.profile?.picture || 
                partner.profile?.avatar
              )) || ""
            ) : "") || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}`;

            let unreadCount = isActive ? 0 : (t.unread_count ?? t.unreadCount ?? 0);
            if (t.last_message?.sender_user_id === (user?.user_id || user?.id)) {
              unreadCount = 0;
            }

            return (
              <button
                key={`${t.id}-${idx}`}
                onClick={() => {
                  setActiveThread(t);
                  const targetPath = isBrand ? `/brand/inbox/${t.id}` : `/chat/${t.id}`;
                  navigate(targetPath, { replace: true });
                }}
                className={`w-full text-left p-2.5 md:p-4 border-b border-[var(--border-default)] transition-all duration-200 flex items-center gap-2.5 md:gap-3 hover:bg-[var(--bg-elevated)] ${isActive ? 'bg-[var(--bg-elevated)] border-l-4 ' + (isBrand ? 'border-l-[var(--violet)]' : 'border-l-emerald-500') : 'border-l-4 border-l-transparent'}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-9 h-9 md:w-12 md:h-12 rounded-full overflow-hidden bg-[var(--bg-elevated)] shrink-0 border-2 transition-all duration-300 ${isPartnerOnline ? 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] scale-105' : 'border-[var(--border-default)]'}`}>
                    <img src={resolvedPic} alt="" className="w-full h-full object-cover" />
                  </div>
                  {isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-[var(--bg-base)] rounded-full animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex flex-col flex-1 min-w-0 pr-1.5 md:pr-2">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <span className={`text-xs md:text-[15px] truncate ${unreadCount > 0 ? 'font-bold text-[var(--text-primary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
                        {partnerName}
                      </span>
                      {isUgc(t) ? (
                        <span className="px-1 py-0.2 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                          UGC
                        </span>
                      ) : (
                        <span className="px-1 py-0.2 text-[8px] md:text-[9px] font-black uppercase tracking-wider rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
                          Campaign
                        </span>
                      )}
                    </div>
                    
                    <div className="text-[11px] md:text-[13px] text-[var(--text-secondary)] truncate flex items-center mt-0.5 font-medium">
                      {t.ugc_title || t.ugc_brief?.title || t.ugc_order?.title || t.campaigns?.title || t.campaign_title || 'Direct Deal'}
                    </div>
                  </div>
                  
                  {unreadCount > 0 && (
                    <div className="shrink-0 flex items-center justify-center ml-1.5 md:ml-2">
                      <span className="min-w-[16px] h-[16px] md:min-w-[20px] md:h-[20px] px-1 md:px-1.5 bg-[#3B82F6] text-white text-[9px] md:text-xs font-bold flex items-center justify-center rounded-full shadow-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
          {filteredThreads.length === 0 && (
            <div className="p-6 md:p-8 text-center text-[var(--text-tertiary)] text-xs md:text-sm">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeThread ? 'hidden md:flex' : 'flex'}`}>
        {isMobile ? (
          <ChatBoxMobile
            thread={displayActiveThread}
            user={user}
            onlineUsers={onlineUsers}
            onBack={() => {
              setActiveThread(null);
              navigate(isBrand ? '/brand/inbox' : '/chat', { replace: true });
            }}
          />
        ) : (
          <ChatBox
            thread={displayActiveThread}
            user={user}
            onlineUsers={onlineUsers}
            onBack={() => {
              setActiveThread(null);
              navigate(isBrand ? '/brand/inbox' : '/chat', { replace: true });
            }}
          />
        )}
      </div>
    </div>
  );
}
