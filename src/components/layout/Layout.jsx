import React, { useEffect, useState, useRef } from "react";
import { t } from "@/lib/typography";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/storage";
import { HelpCircle } from "lucide-react";
import { Bell, LogOut, Settings as SettingsIcon, Menu, X, ShieldAlert, User, Film, Video, Sun, Moon, LayoutGrid, Megaphone, FileText, Wallet, Briefcase, MessageCircle, Info, Users, Search, AlertTriangle, Cloud, ChevronRight, ChevronLeft, ArrowLeftRight, Link as LinkIcon, Compass, ChevronDown, Gift, Banknote, ArrowRight, Activity, Zap, Image as ImageIcon, BookOpen } from "lucide-react";
import YbexLogo from "./YbexLogo";
import NotificationBell from "../shared/NotificationBell";
import PremiumFooter from "./PremiumFooter";
import BottomNav from "./BottomNav";
import UnderReviewBanner from "../common/UnderReviewBanner";
import UnderReviewModal from "../common/UnderReviewModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Layout({ children }) {
  const { user, logout, isKycApproved, kycStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [hasPendingWork, setHasPendingWork] = useState(false);
  const [activeThreadsCount, setActiveThreadsCount] = useState(0);
  const [underReviewModalOpen, setUnderReviewModalOpen] = useState(false);
  const [adminPendingCounts, setAdminPendingCounts] = useState({ waitlist: 0, kyc: 0, campaigns: 0, reports: 0, escrow: 0, helpdesk: 0 });

  const isKycSubmittedOrApproved = Boolean(
    isKycApproved || 
    kycStatus?.status === 'pending' || 
    kycStatus?.status === 'PENDING' || 
    kycStatus?.status === 'under_review' || 
    kycStatus?.status === 'UNDER_REVIEW' || 
    kycStatus?.status === 'approved' || 
    kycStatus?.status === 'APPROVED' ||
    user?.kyc_verified ||
    user?.kyc_status === 'pending' ||
    user?.kyc_status === 'under_review' ||
    user?.kyc_status === 'approved'
  );

  const kycSettingsBadge = (!isKycSubmittedOrApproved && user && user.role !== 'admin' && user.team_role !== 'sub_admin') ? (
    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200/80 rounded-md uppercase tracking-wider leading-none shrink-0 shadow-2xs">
      KYC
    </span>
  ) : null;

  useEffect(() => {
    if (user && user.profile_status === 'under_review') {
      const hasSeenModal = sessionStorage.getItem(`under_review_modal_seen_${user.user_id}`);
      if (!hasSeenModal) {
        setUnderReviewModalOpen(true);
        sessionStorage.setItem(`under_review_modal_seen_${user.user_id}`, "true");
      }
    }
  }, [user]);

  const getFooterProps = () => {
    const path = location.pathname;
    
    const hideFooterRoutes = [
      '/creator-campaign-flow',
      '/creator/kyc',
      '/creator/settings',
      '/chat',
      '/brand/inbox',
      '/brand/campaigns/create',
      '/brand/kyc',
      '/brand/settings',
      '/brand/ugc',
      '/creator/ugc',
      '/settings',
      '/help',
      '/support',
      '/deals',
      '/login',
      '/signup',
      '/onboarding'
    ];

    if (hideFooterRoutes.some(route => path === route || path.startsWith(route + '/'))) {
      return null;
    }

    const config = {
      // Creator
      "/dashboard": { headline: ["Built For Creators.", "Powered By Opportunities."], subtitle: "Discover campaigns, connect with brands, and grow your creator business.", showInstagram: false },
      "/creators": { headline: ["Discover Brands That", "Match Your Voice."], subtitle: "Discover campaigns, connect with brands, and grow your creator business.", showInstagram: true },
      "/campaigns": { headline: ["Apply. Create.", "Get Paid."], subtitle: "Connecting creators and brands through meaningful partnerships.", showInstagram: false },
      "/earnings": { headline: ["Get Paid For", "What You Create."], subtitle: "Track every rupee, transparently.", showInstagram: false },
      "/collabs": { headline: ["Manage Every Deal,", "Effortlessly."], subtitle: "Manage every deal in one place.", showInstagram: false },
      "/creator/profile": { headline: ["Showcase What Makes", "You Different."], subtitle: "Keep it sharp — brands notice.", showInstagram: false },
      "/profile/overview": { headline: ["Showcase What Makes", "You Different."], subtitle: "Keep it sharp — brands notice.", showInstagram: false },
      "/leaderboard": { headline: ["The Best Creators", "Never Stop Growing."], subtitle: "Explore more of what Ybex offers.", showInstagram: false },
      "/creator/ugc/browse": { headline: ["Unleash Your", "Creativity."], subtitle: "Browse briefs and start creating.", showInstagram: false },

      // Brand
      "/brand/dashboard": { headline: ["Where Brands Meet", "Exceptional Creators."], subtitle: "Discover creators, launch campaigns, and drive meaningful results.", showInstagram: false },
      "/brand/campaigns": { headline: ["Scale Your Brand", "With Trusted Creators."], subtitle: "Launch campaigns that convert.", showInstagram: false },
      "/brand/profile": { headline: ["Tell Creators What", "Makes Your Brand Unique."], subtitle: "This is how creators see you.", showInstagram: false },
      "/brand/payments": { headline: ["Secure Payments.", "Seamless Collaborations."], subtitle: "Every transaction, fully tracked.", showInstagram: false },
      "/brand/ugc/briefs": { headline: ["Authentic Content", "At Scale."], subtitle: "Get creator content that converts.", showInstagram: false },
    };

    if (config[path]) return config[path];

    // Prefix matches
    if (path.startsWith("/brand/ugc/")) {
      return { headline: ["Authentic Content", "At Scale."], subtitle: "Get creator content that converts.", showInstagram: false };
    }
    if (path.startsWith("/brand/campaigns/") && path.endsWith("/applicants")) {
      return { headline: ["Find Creators Who", "Fit Your Brand."], subtitle: "Review, shortlist, and connect.", showInstagram: false };
    }
    if (path.startsWith("/campaigns/")) {
      return { headline: ["This Could Be", "Your Next Big Deal."], subtitle: "Connecting creators and brands through meaningful partnerships.", showInstagram: false };
    }
    if (path.startsWith("/creator/")) { // CreatorPublicView
      return { headline: ["Showcase What Makes", "You Different."], subtitle: "This is how brands see you.", showInstagram: false };
    }
    if (path.startsWith("/info/")) {
      return { headline: ["The Best Creators", "Never Stop Growing."], subtitle: "Explore more of what Ybex offers.", showInstagram: false };
    }

    return null; // fallback or empty
  };

  const footerProps = getFooterProps();

  useEffect(() => {
    if (!user) return;
    const fetchThreadsCount = () => {
      api.get("chat/v2/threads")
        .then(res => {
          if (Array.isArray(res.data)) {
            setActiveThreadsCount(res.data.length);
          } else {
            setActiveThreadsCount(0);
          }
        })
        .catch(err => {
          const msg = err?.message || "";
          if (!msg.includes("Received HTML") && msg !== "Network Error" && !msg.includes("timeout") && !msg.includes("429")) {
            // Silently ignore rate limits and network errors for background polling
          }
          setActiveThreadsCount(0);
        });
    };
    fetchThreadsCount();
    const interval = setInterval(fetchThreadsCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user?.user_id]);

  useEffect(() => {
    if (user?.role === 'creator') {
      const checkPendingWork = () => {
        api.get("ugc/orders/creator")
          .then(res => {
            if (Array.isArray(res.data)) {
              const pending = res.data.some(o => o.creator_status === 'CLAIMED' || o.creator_status === 'REVISION_REQUESTED' || o.creator_status === 'REVISION_REQ' || o.status === 'REVISION_REQ');
              setHasPendingWork(pending);
            }
          })
          .catch(err => {
            const msg = err?.message || "";
            const status = err?.response?.status;
            if (msg.includes("Received HTML")) {
              console.warn("Pending work check received HTML response (auth flow / cookie check in progress).");
            } else if (msg === "Network Error" || msg.includes("timeout")) {
              console.warn("Network Error/Timeout checking pending work (server might be booting up or busy).");
            } else if (status !== 401 && status !== 403) {
              console.error("Error checking pending work:", err.message);
            }
          });
      };
      checkPendingWork();
      const interval = setInterval(checkPendingWork, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    } else if (user?.role === 'admin' || user?.team_role === 'sub_admin') {
      const fetchAdminPendingCounts = () => {
        api.get("admin/pending-counts")
          .then(res => {
            if (res.data) setAdminPendingCounts(res.data);
          })
          .catch(err => {
            const msg = err?.message || "";
            const status = err?.response?.status;
            if (!msg.includes("429") && msg !== "Network Error" && !msg.includes("timeout") && status !== 401 && status !== 403) {
              console.error("Error checking admin pending counts:", err);
            }
          });
      };
      fetchAdminPendingCounts();
      const interval = setInterval(fetchAdminPendingCounts, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user?.user_id]);

  const [sidebarPosition, setSidebarPosition] = useState(() => {
    return safeStorage.getItem("sidebar_position") || "left";
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return safeStorage.getItem("sidebar_open") !== "false";
  });

  const toggleSidebarPosition = () => {
    const nextPos = sidebarPosition === "left" ? "right" : "left";
    setSidebarPosition(nextPos);
    safeStorage.setItem("sidebar_position", nextPos);
    toast.success(`Sidebar moved to the ${nextPos === 'left' ? 'left' : 'right'} side! ↔️`);
  };

  const toggleSidebarOpen = () => {
    const nextOpen = !sidebarOpen;
    setSidebarOpen(nextOpen);
    safeStorage.setItem("sidebar_open", String(nextOpen));
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Handle click outside to close avatar menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ API INTEGRATION: Fetch badge data (active threads count & pending work)
  useEffect(() => {
    const fetchBadgeData = async () => {
      if (!user) return;
      try {
        // Fetch active threads for inbox badge
        const threadsResponse = await api.get("/chat/v2/threads", { bypassCache: true });
        const threads = threadsResponse.data?.threads || threadsResponse.data || [];
        const unreadCount = threads.filter(t => t.unread_count > 0).reduce((sum, t) => sum + (t.unread_count || 0), 0);
        setActiveThreadsCount(unreadCount);

        // Fetch pending work for creator deals.
        // NOTE: there is no GET /deals list endpoint on the backend — the list of a
        // user's deals/collabs lives at GET /collabs (see backend/content_submissions_routes.ts),
        // which returns { sent, received, waves_sent, waves_received, campaign_applications }.
        if (user.role === "creator" || user.role === "influencer") {
          const collabsResponse = await api.get("collabs", { bypassCache: true });
          const c = collabsResponse.data || {};

          // Same "finished" definition the Collabs page uses, so the badge agrees with the list.
          const isFinished = (status) => {
            const s = String(status || "").toUpperCase();
            return ["COMPLETED", "DECLINED", "REJECTED", "CANCELLED", "PAID", "DELIVERED", "CLOSED", "SUCCESS"].includes(s);
          };

          const incoming = [
            ...(Array.isArray(c.received) ? c.received : []),
            ...(Array.isArray(c.waves_received) ? c.waves_received : []),
            ...(Array.isArray(c.campaign_applications) ? c.campaign_applications : []),
          ];

          setHasPendingWork(incoming.some((item) => !isFinished(item?.status)));
        }
      } catch (err) {
        // This runs every 30s in the background. A dropped wifi packet or a server restart
        // is not an application error, and logging it as one fills the console with red
        // that hides real problems. Genuine failures still surface.
        const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
        const isTransientNetwork =
          isOffline || err?.message === "Network Error" || err?.code === "ERR_NETWORK" || err?.code === "ECONNABORTED";
        const isAuth = err?.response?.status === 401 || err?.response?.status === 403;
        if (!isTransientNetwork && !isAuth) {
          console.error("[Layout] Failed to fetch badge data:", err);
        }
        // Badges keep their last value; they refresh on the next poll.
      }
    };

    fetchBadgeData();

    // Poll every 30 seconds for real-time badge updates
    const interval = setInterval(fetchBadgeData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const onLogout = async () => {
    await logout();
    // Do not use React Router navigate here because modifying the user state
    // will trigger ProtectedRoute's <Navigate> to bounce the user automatically.
    // If on an unprotected route, they just stay logged out.
    // To be perfectly safe against DOM caching issues on logout, a hard reload is best:
    window.location.href = "/login";
  };

  const isAdminUser = user && (user.role === 'admin' || user.team_role === 'sub_admin');
  const isFullAdmin = user?.role === 'admin' && user?.team_role !== 'sub_admin';
  const isSubAdmin = user?.team_role === 'sub_admin';

  const hasAdminPerm = (permKey) => {
    if (isFullAdmin) return true;
    if (!isSubAdmin) return false;
    if (!permKey) return true;
    if (!user?.permissions || !Array.isArray(user.permissions)) return false;

    // Alias map to support granular and legacy permission keys seamlessly
    const aliases = {
      manage_users: ['manage_users'],
      manage_waitlist: ['manage_waitlist', 'manage_users'],
      manage_kyc: ['manage_kyc'],
      manage_campaigns: ['manage_campaigns'],
      manage_chat: ['manage_chat', 'manage_campaigns'],
      manage_disputes: ['manage_disputes', 'manage_reports'],
      manage_reports: ['manage_reports', 'manage_disputes'],
      manage_escrow: ['manage_escrow'],
      manage_ugc: ['manage_ugc', 'manage_escrow'],
      manage_logs: ['manage_logs', 'manage_activity_logs', 'manage_users'],
      manage_activity_logs: ['manage_activity_logs', 'manage_logs', 'manage_users'],
      manage_blog: ['manage_blog'],
      manage_helpdesk: ['manage_helpdesk'],
      manage_settings: ['manage_settings', 'manage_banners'],
      manage_banners: ['manage_banners', 'manage_settings'],
      view_analytics: ['view_analytics']
    };

    const keysToCheck = aliases[permKey] || [permKey];

    return user.permissions.some((p) => {
      if (typeof p === 'string') return keysToCheck.includes(p);
      if (p && typeof p === 'object') {
        const pKey = p.permission_key || p.key;
        return keysToCheck.includes(pKey) && (p.allowed === true || p.allowed === 1 || p.allowed === 'true');
      }
      return false;
    });
  };

  const isFullBleedMobilePage = (pathname) => {
    return (
      pathname === '/settings' ||
      pathname === '/creator/settings' ||
      pathname === '/brand/settings' ||
      pathname === '/brand/account' ||
      pathname === '/creator/profile' ||
      pathname === '/brand/profile' ||
      pathname === '/profile' ||
      pathname === '/profile/overview' ||
      pathname === '/deals' ||
      pathname === '/collabs' ||
      pathname === '/brand/kyc' ||
      pathname === '/creator/kyc'
    );
  };

  const isMobileTabRoot = (path, role) => {
    if (role === 'brand') {
      return (
        path === '/brand' ||
        path === '/brand/dashboard' ||
        (path === '/dashboard' && role === 'brand') ||
        path === '/brand/campaigns' ||
        path === '/brand/discover'
      );
    }
    if (role === 'admin' || role === 'sub_admin') {
      return path === '/admin';
    }
    // Creator tab roots:
    return (
      path === '/dashboard' ||
      path === '/' ||
      path === '/deals' ||
      path === '/collabs' ||
      path === '/explore' ||
      path === '/creators' ||
      path === '/campaigns'
    );
  };

  const isChatThreadOpen = Boolean(
    (location.pathname.startsWith('/chat/') && location.pathname.length > 6) ||
    (location.pathname.startsWith('/brand/inbox/') && location.pathname.length > 13) ||
    (location.pathname.startsWith('/creator/inbox/') && location.pathname.length > 15) ||
    (location.pathname.startsWith('/inbox/') && location.pathname.length > 7) ||
    ((location.pathname === '/chat' || location.pathname === '/inbox' || location.pathname === '/brand/inbox' || location.pathname === '/creator/inbox') && (
      location.search?.includes('creator_id=') ||
      location.search?.includes('creator=') ||
      location.search?.includes('thread=') ||
      location.search?.includes('threadId=') ||
      location.search?.includes('dealId=') ||
      location.search?.includes('deal_id=') ||
      location.search?.includes('orderId=') ||
      location.search?.includes('order_id=') ||
      location.search?.includes('id=')
    ))
  );

  const renderMobileTopHeader = () => {
    if (!user) return null;
    if (isChatThreadOpen) return null;

    // Never render the generic mobile top header on inbox or chat
    if (
      location.pathname.startsWith('/brand/inbox') ||
      location.pathname.startsWith('/creator/inbox') ||
      location.pathname.startsWith('/inbox') ||
      location.pathname.startsWith('/chat')
    ) {
      return null;
    }

    // Only render mobile top header on primary tab roots
    if (!isMobileTabRoot(location.pathname, user.role)) {
      return null;
    }

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const rawName = user.name || user.full_name || user.fullName || user.firstName || user.first_name || user.display_name || user.displayName || user.email?.split('@')[0] || 'User';
    const cleanName = typeof rawName === 'string' ? rawName.trim() : String(rawName || '').trim();
    const firstName = cleanName ? (cleanName.split(/\s+/)[0] || cleanName) : 'User';

    return (
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 h-14 flex items-center justify-between px-4 w-full">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-gray-500 tracking-tight">{greeting}</span>
          <span className="text-[14px] font-bold text-gray-900 leading-tight opacity-90">{firstName}</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
        </div>
      </header>
    );
  };

  const renderMobileBottomNav = () => {
    if (!user) return null;

    // Spec: the bar is hidden on desktop widths, on full-screen flows (KYC capture,
    // the campaign post wizard, an open chat thread) and on any screen carrying its
    // own pinned primary button.
    const fullScreenRoutes = [
      '/onboarding',
      '/creator-campaign-flow',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      // KYC capture
      '/kyc',
      '/creator/kyc',
      '/brand/kyc',
      // Campaign / brief post wizards — each ends in its own pinned publish button
      '/brand/campaigns/create',
      '/brand/ugc/post'
    ];

    // Hide mobile bottom nav when viewing a thread on mobile (has threadId in URL)
    if (isChatThreadOpen) {
      return null;
    }

    if (fullScreenRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'))) {
      return null;
    }

    return (
      <BottomNav
        role={user.role || 'creator'}
        hasPendingWork={hasPendingWork}
        activeThreadsCount={activeThreadsCount}
      />
    );
  };

  const renderMobileDrawer = () => (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          />
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-16 w-[82vw] max-w-[320px] z-50 md:hidden bg-white border-l border-gray-200 shadow-2xl p-4 flex flex-col gap-2 overflow-y-auto"
          >
            {user && (
              <div className="bg-[#F5F0FF] rounded-2xl p-3 flex items-center justify-between gap-2 mb-2 border border-[var(--violet-border)]">
                <div className="flex items-center gap-3 min-w-0">
                  {user.picture || user.avatar ? (
                    <img src={user.picture || user.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border border-white shadow-xs" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate text-[var(--text-primary)] leading-tight">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate font-medium capitalize mt-0.5">{user.role || "User"}</div>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-[var(--violet)]/10 text-gray-500 hover:text-[var(--violet)] transition-colors shrink-0 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {isAdminUser ? (
                <>
                  {hasAdminPerm('view_analytics') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=dashboard" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><LayoutGrid size={16} />Overview</Link>
                  )}
                  {hasAdminPerm('manage_users') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=users" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Users size={16} />Users</Link>
                  )}
                  {hasAdminPerm('manage_waitlist') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=waitlist" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><FileText size={16} />Waitlist</div>{adminPendingCounts.waitlist > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_kyc') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=verifications" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><ShieldAlert size={16} />KYC Checks</div>{adminPendingCounts.kyc > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_campaigns') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=campaigns" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Megaphone size={16} />Campaigns</div>{adminPendingCounts.campaigns > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_chat') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=chat" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><MessageCircle size={16} />Chat Moderation</div></Link>
                  )}
                  {hasAdminPerm('manage_disputes') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=reports" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><AlertTriangle size={16} />System Reports</div>{adminPendingCounts.reports > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_escrow') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=escrow" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Wallet size={16} />Payments</div>{adminPendingCounts.escrow > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_ugc') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=ugc-orders" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Film size={16} />UGC Orders</Link>
                  )}
                  {hasAdminPerm('manage_logs') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=activity-logs" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Activity size={16} />Active Logs</Link>
                  )}
                  {hasAdminPerm('manage_blog') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=blog" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><BookOpen size={16} />Blogs & Content</Link>
                  )}
                  {hasAdminPerm('manage_helpdesk') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=helpdesk" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3"><div className="flex items-center gap-3"><HelpCircle size={16} />Help Desks</div>{adminPendingCounts.helpdesk > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}</Link>
                  )}
                  {hasAdminPerm('manage_settings') && (
                    <Link onClick={() => setMenuOpen(false)} to="/admin?tab=settings" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><SettingsIcon size={16} />Platform Settings</Link>
                  )}
                </>
              ) : user?.role !== 'creator' ? (
                <>
                  <Link onClick={() => setMenuOpen(false)} to="/dashboard" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><LayoutGrid size={16} />Dashboard</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/creators" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Search size={16} />Explore Creators</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/brand/campaigns" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Megaphone size={16} />My Campaigns</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/brand/ugc/briefs" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Video size={16} className="text-[var(--violet)]" />
                      <span>Instant UGC</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--violet)] text-white rounded-md uppercase tracking-wider shadow-xs">BETA</span>
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} to="/brand/inbox" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><MessageCircle size={16} />Inbox</Link>
                  <div className="h-px bg-gray-100 my-1.5" />
                  <Link onClick={() => setMenuOpen(false)} to="/brand/payments" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Wallet size={16} />Payments</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/brand/profile" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><User size={16} />Public Profile</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/refer" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Gift size={16} />Refer & Earn</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/help" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><HelpCircle size={16} />Help Center</Link>
                </>
              ) : (
                <>
                  <Link onClick={() => setMenuOpen(false)} to="/dashboard" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><LayoutGrid size={16} />Dashboard</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/campaigns" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Compass size={16} />Live Campaigns</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/creator/ugc" testId="tour-nav-ugc" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Zap size={16} className="text-[var(--violet)]" />
                      <span>Explore UGC</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--violet)] text-white rounded-md uppercase tracking-wider shadow-xs">BETA</span>
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} to="/collabs" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} />Ongoing Deals
                    </div>
                    {hasPendingWork && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} to="/chat" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <MessageCircle size={16} />Inbox
                    </div>
                    {activeThreadsCount > 0 && (
                      <div className="bg-[var(--violet)] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">{activeThreadsCount}</div>
                    )}
                  </Link>
                  <Link onClick={() => setMenuOpen(false)} to="/earnings" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Wallet size={16} />Earnings</Link>
                  <div className="h-px bg-gray-100 my-1.5" />
                  <Link onClick={() => setMenuOpen(false)} to="/profile/overview" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><User size={16} />Public Profile</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/refer" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><Gift size={16} />Refer & Earn</Link>
                  <Link onClick={() => setMenuOpen(false)} to="/help" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3"><HelpCircle size={16} />Help Center</Link>
                </>
              )}
              <div className="h-px bg-gray-100 my-1.5" />
              <Link onClick={() => setMenuOpen(false)} to="/settings" className="px-3.5 py-2.5 rounded-xl hover:bg-gray-100 text-gray-800 font-semibold text-xs flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <SettingsIcon size={16} />
                  <span>Settings</span>
                  {kycSettingsBadge}
                </div>
              </Link>
            </div>

            <div className="mt-auto pt-3 border-t border-gray-100">
              <button
                onClick={() => { setMenuOpen(false); onLogout(); }}
                className="w-full px-3.5 py-2.5 rounded-xl text-rose-500 font-bold text-xs text-left flex items-center gap-3 hover:bg-rose-50/80 transition-colors cursor-pointer"
              >
                <LogOut size={16} />Log Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const isOnboardingUser = user && !isAdminUser && !user.onboarded && !user.onboarding_completed && !user.onboarding_complete;
  if (location.pathname === "/onboarding" || isOnboardingUser) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] relative transition-colors duration-200 flex flex-col">
        {/* Main Onboarding Container without unwanted header */}
        <main className="w-full flex-1 min-h-screen flex flex-col">{children}</main>
      </div>
    );
  }

  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/onboarding";
  const useSidebar = user && !isAuthPage && location.pathname !== "/";

  const SidebarNavItem = ({ to, icon, children, testId, badge, isBold }) => {
    let isExactMatch = location.pathname + location.search === to;
    if (to === "/admin?tab=dashboard" && location.pathname === "/admin" && !location.search) {
       isExactMatch = true;
    } else if (!to.includes("?") && (location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to)))) {
       isExactMatch = true;
    } else if (to === "/dashboard" && location.pathname === "/dashboard") {
       isExactMatch = true;
    }

    // Clone icon to override size and style
    const clonedIcon = React.isValidElement(icon) 
      ? React.cloneElement(icon, { size: 16, className: "shrink-0" }) 
      : icon;

    return (
      <Link 
        to={to} 
        data-testid={testId} 
        className={`flex items-center justify-between px-3 py-2 transition-all duration-150 ${isExactMatch ? `bg-[#F5F0FF] text-[var(--violet)] border-l-2 border-[var(--violet)] rounded-r-[10px] font-bold text-sm` : `hover:bg-[var(--bg-elevated)] rounded-[10px] text-sm ${isBold ? 'font-bold text-[var(--text-primary)]' : 'text-gray-500'} hover:opacity-100`}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {clonedIcon}
          <span className="truncate">{children}</span>
        </div>
        {badge && <div className="shrink-0 ml-1.5 flex items-center">{badge}</div>}
      </Link>
    );
  };

  const SidebarNavGroup = ({ title, icon, items }) => {
    const isAnyActive = items.some(item => {
      return location.pathname + location.search === item.to;
    });
    
    const [isOpen, setIsOpen] = useState(isAnyActive);

    useEffect(() => {
      if (isAnyActive) {
        setIsOpen(true);
      }
    }, [location.pathname, location.search]);

    const clonedIcon = React.isValidElement(icon) 
      ? React.cloneElement(icon, { size: 16, className: "shrink-0" }) 
      : icon;

    return (
      <div className="space-y-1">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] transition-all duration-150 rounded-[10px] text-[#888888] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {clonedIcon}
            <span className="truncate font-medium">{title}</span>
          </div>
          <ChevronDown size={14} className={`transform transition-transform duration-200 text-[#888888] ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="pl-6 space-y-1 border-l border-[var(--border-default)] ml-4 animate-in slide-in-from-top-1 duration-150">
            {items.map((item, idx) => {
              const isActive = location.pathname + location.search === item.to;
              return (
                <Link 
                  key={idx}
                  to={item.to} 
                  className={`flex items-center justify-between px-2.5 py-1.5 text-[12px] transition-all duration-150 rounded-lg ${
                    isActive 
                      ? "bg-[#F5F0FF] text-[var(--violet)] font-semibold" 
                      : "text-[#888888] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (useSidebar) {
    if (user?.role === 'creator') {
      const isExactMatch = (path) => location.pathname === path;
      return (
        <div className={`flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
          
          {/* Main Sidebar */}
          {sidebarOpen && (
            <aside className={`w-56 flex-shrink-0 bg-white hidden md:flex flex-col z-10 border-[var(--border-default)] ${sidebarPosition === 'left' ? 'border-r' : 'border-l'}`}>
              <div className="p-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link to="/dashboard">
                    <YbexLogo className="h-8 text-[var(--violet)] w-auto max-w-[120px]" />
                  </Link>
                </div>
              </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
              <SidebarNavItem to="/dashboard" icon={<LayoutGrid />}>Dashboard</SidebarNavItem>
              <SidebarNavItem to="/campaigns" icon={<Compass />} testId="tour-nav-campaigns">Live Campaigns</SidebarNavItem>
              <SidebarNavItem 
                to="/creator/ugc" testId="tour-nav-ugc" 
                icon={<Zap className="text-[var(--violet)]" />}
                badge={<span className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--violet)] text-white rounded-md uppercase tracking-wider leading-none shrink-0 ml-auto shadow-xs">BETA</span>}
              >
                Explore UGC
              </SidebarNavItem>
              <SidebarNavItem to="/collabs" icon={<Briefcase />} testId="tour-nav-deals" badge={hasPendingWork ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0" /> : null}>Ongoing Deals</SidebarNavItem>
              
              <div className="relative">
                <SidebarNavItem to="/chat" icon={<MessageCircle />} testId="tour-nav-inbox">Inbox</SidebarNavItem>
                {activeThreadsCount > 0 && (
                  <div className="absolute right-2 top-2 bg-[var(--violet)] text-white text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">{activeThreadsCount}</div>
                )}
              </div>

              <SidebarNavItem to="/earnings" icon={<Wallet />} testId="tour-nav-earnings">Earnings</SidebarNavItem>

              <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>

              <SidebarNavItem to="/profile/overview" icon={<User />}>Public Profile</SidebarNavItem>
              <SidebarNavItem to="/refer" icon={<Gift />}>Refer & Earn</SidebarNavItem>
              <SidebarNavItem to="/help" icon={<HelpCircle />}>Help Center</SidebarNavItem>
              <SidebarNavItem to="/settings" icon={<SettingsIcon />} testId="tour-nav-settings" badge={kycSettingsBadge}>Settings</SidebarNavItem>
            </div>

            <div className="p-3 mt-auto bg-white border-t border-[var(--border-default)]">
              <div className="bg-[#F5F0FF] rounded-xl p-2.5 flex items-center gap-2">
                {user?.picture || user?.avatar ? (
                  <img src={user.picture || user.avatar} alt="" className="w-[30px] h-[30px] rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-[30px] h-[30px] rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(user?.name || "R").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">{user?.name || "Ravi Sharma"}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate font-medium capitalize">{user?.role || "Creator"}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-2.5 px-1">
                <Link to="/profile/overview" className="text-[11px] font-medium text-[var(--violet)] hover:underline flex items-center gap-1 transition-colors">
                  Public Profile <ArrowRight size={12} />
                </Link>
                <button
                  onClick={onLogout}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors w-full"
                >
                  <LogOut size={11} /> Log Out
                </button>
              </div>
            </div>
          </aside>
          )}

          {!sidebarOpen && (
            <button
              onClick={toggleSidebarOpen}
              className={`fixed hidden md:flex top-24 z-40 py-3 px-4 bg-gradient-to-r from-[var(--violet)] to-indigo-600 hover:from-indigo-600 hover:to-[var(--violet)] text-white shadow-xl hover:scale-105 transition-all duration-200 items-center gap-2 border border-white/10 cursor-pointer ${sidebarPosition === 'left' ? 'left-0 rounded-r-2xl border-l-0' : 'right-0 rounded-l-2xl border-r-0'}`}
              title="Open Sidebar"
            >
              {sidebarPosition === 'left' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Sidebar</span>
            </button>
          )}

          {/* Mobile Drawer for Creator */}
          {renderMobileDrawer()}

          {/* Mobile Bottom Dock Navigation */}
          {renderMobileBottomNav()}
          
          {/* Main Content Area */}
          <div id="app-scroll-container" className={`flex-1 flex flex-col min-w-0 h-full ${location.pathname.startsWith("/chat") || location.pathname.startsWith("/brand/inbox") || location.pathname.startsWith("/creator/inbox") || location.pathname.startsWith("/inbox") ? 'h-screen overflow-hidden' : 'overflow-y-auto'}`}>
             {/* Mobile Header for Creator */}
             {renderMobileTopHeader()}
             <main className={`flex-1 shrink-0 flex flex-col ${
               location.pathname.startsWith("/chat") || location.pathname.startsWith("/brand/inbox") || location.pathname.startsWith("/creator/inbox") || location.pathname.startsWith("/inbox")
                 ? 'h-full overflow-hidden' 
                 : isFullBleedMobilePage(location.pathname)
                   ? 'p-0 md:p-6 lg:p-8 mobile-nav-safe-pad md:pb-8'
                   : 'p-4 sm:p-6 lg:p-8 mobile-nav-safe-pad md:pb-8'
             }`}>
                {children}
                {footerProps && <PremiumFooter {...footerProps} />}
             </main>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] relative transition-colors duration-200 overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
         {/* Desktop Sidebar */}
         {sidebarOpen && (
           <aside className={`w-56 flex-shrink-0 bg-white hidden md:flex flex-col border-[var(--border-default)] ${sidebarPosition === 'left' ? 'border-r' : 'border-l'}`}>
              <div className="p-5 pb-4 flex items-center justify-between">
                <Link to={user?.role === 'admin' || user?.team_role === 'sub_admin' ? "/admin" : "/dashboard"} className="flex flex-col gap-1">
                  <YbexLogo className="h-8 text-[var(--violet)] w-auto max-w-[120px]" />
                </Link>
              </div>
            
            <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
               {user?.role === 'admin' || user?.team_role === 'sub_admin' ? (
                 <>
                   {hasAdminPerm('view_analytics') && (
                     <SidebarNavItem to="/admin?tab=dashboard" icon={<LayoutGrid />}>Overview</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_users') && (
                     <SidebarNavGroup 
                       title="Users" 
                       icon={<Users />} 
                       items={[
                         { to: "/admin?tab=users&role=all", label: "All Users" },
                         { to: "/admin?tab=users&role=brand", label: "Brands" },
                         { to: "/admin?tab=users&role=agency", label: "Agencies" },
                         { to: "/admin?tab=users&role=creator", label: "Creators" },
                         { to: "/admin?tab=users&role=unclaimed", label: "Unclaimed Creators" },
                         ...(isFullAdmin ? [{ to: "/admin?tab=users&role=admin", label: "Admins" }] : [])
                       ]}
                     />
                   )}
                   {hasAdminPerm('manage_waitlist') && (
                     <SidebarNavItem to="/admin?tab=waitlist" icon={<FileText />} badge={adminPendingCounts.waitlist > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>Waitlist</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_kyc') && (
                     <SidebarNavItem to="/admin?tab=verifications" icon={<ShieldAlert />} badge={adminPendingCounts.kyc > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>KYC Checks</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_campaigns') && (
                     <SidebarNavItem to="/admin?tab=campaigns" icon={<Megaphone />} badge={adminPendingCounts.campaigns > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>Campaigns</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_chat') && (
                     <SidebarNavItem to="/admin?tab=chat" icon={<MessageCircle />}>Chat Moderation</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_disputes') && (
                     <SidebarNavItem to="/admin?tab=reports" icon={<AlertTriangle />} badge={adminPendingCounts.reports > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>System Reports</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_escrow') && (
                     <SidebarNavItem to="/admin?tab=escrow" icon={<Wallet />} badge={adminPendingCounts.escrow > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>Payments</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_ugc') && (
                     <SidebarNavItem to="/admin?tab=ugc-orders" icon={<Film />}>UGC Orders <span className="text-red-400 font-bold ml-auto text-[9px] animate-pulse">AT RISK</span></SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_logs') && (
                     <SidebarNavItem to="/admin?tab=activity-logs" icon={<Activity />}>Active Logs</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_blog') && (
                     <SidebarNavItem to="/admin?tab=blog" icon={<BookOpen />}>Blogs & Content</SidebarNavItem>
                   )}
                   <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                   {hasAdminPerm('manage_helpdesk') && (
                     <SidebarNavItem to="/admin?tab=helpdesk" icon={<HelpCircle />} badge={adminPendingCounts.helpdesk > 0 ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-auto" /> : null}>Help Desks</SidebarNavItem>
                   )}
                   {hasAdminPerm('manage_settings') && (
                     <SidebarNavItem to="/admin?tab=settings" icon={<SettingsIcon />}>Platform Settings</SidebarNavItem>
                   )}
                 </>
                ) : user?.role !== 'creator' ? (
                  <>
                    <SidebarNavItem to="/dashboard" icon={<LayoutGrid />}>Dashboard</SidebarNavItem>
                    <SidebarNavItem to="/creators" icon={<Search />} testId="nav-explore-creators">Explore Creators</SidebarNavItem>
                    <SidebarNavItem to="/brand/campaigns" icon={<Megaphone />} testId="nav-campaigns">My Campaigns</SidebarNavItem>
                    <SidebarNavItem 
                      to="/brand/ugc/briefs" 
                      icon={<Video className="text-[var(--violet)]" />} 
                      badge={<span className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--violet)] text-white rounded-md uppercase tracking-wider leading-none shrink-0 ml-auto shadow-xs">BETA</span>}
                    >
                      Instant UGC
                    </SidebarNavItem>
                    <SidebarNavItem to="/brand/inbox" icon={<MessageCircle />} testId="tour-nav-brand-inbox">Inbox</SidebarNavItem>
                    <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                    <SidebarNavItem to="/brand/payments" icon={<Wallet />} testId="tour-nav-escrow">Payments</SidebarNavItem>
                    <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                    <SidebarNavItem to="/brand/profile" icon={<User />}>Public Profile</SidebarNavItem>
                    <SidebarNavItem to="/refer" icon={<Gift />}>Refer & Earn</SidebarNavItem>
                    <SidebarNavItem to="/help" icon={<HelpCircle />}>Help Center</SidebarNavItem>
                    <SidebarNavItem to="/settings" icon={<SettingsIcon />} testId="tour-nav-settings" badge={kycSettingsBadge}>Settings</SidebarNavItem>
                  </>
               ) : (
                 <>
                   <SidebarNavItem to="/dashboard" icon={<LayoutGrid />}>Dashboard</SidebarNavItem>
                   <SidebarNavItem to="/campaigns" icon={<Megaphone />} testId="tour-nav-campaigns">Live Campaigns</SidebarNavItem>
                   <SidebarNavItem to="/collabs" icon={<FileText />}>My Applications</SidebarNavItem>
                   <SidebarNavItem to="/chat" icon={<MessageCircle />} testId="tour-nav-inbox">Inbox</SidebarNavItem>
                   <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                   <div className="text-[10px] font-semibold text-[#BBBBB5] tracking-[0.7px] uppercase px-2.5 pt-3.5 pb-1">🎬 UGC</div>
                   <SidebarNavItem to="/creator/ugc/browse" icon={<Search />}>Browse Briefs</SidebarNavItem>
                   <SidebarNavItem to="/creator/ugc/orders" icon={<FileText />} badge={hasPendingWork ? <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0" /> : null}>Ongoing Deals</SidebarNavItem>
                   <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                   <SidebarNavItem to="/earnings" icon={<Wallet />} testId="tour-nav-earnings">Earnings</SidebarNavItem>
                   <div className="py-2"><div className="h-px bg-[var(--border-default)] w-full"></div></div>
                   <SidebarNavItem to="/help" icon={<HelpCircle />}>Help Center</SidebarNavItem>
                   <SidebarNavItem to="/settings" icon={<SettingsIcon />} testId="tour-nav-settings" badge={kycSettingsBadge}>Settings</SidebarNavItem>
                 </>
               )}
            </div>

            <div className="p-3 border-t border-[var(--border-default)] bg-white mt-auto">
               {user && (
                 <>
                     <div className="bg-[#F5F0FF] rounded-xl p-2.5 flex items-center gap-2 mb-2">
                      {user.picture ? (
                         <img src={user.picture} alt="" className="w-[30px] h-[30px] rounded-full object-cover shrink-0"/>
                       ) : (
                         <div className="w-[30px] h-[30px] rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                           {(user.name || "U").charAt(0).toUpperCase()}
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                         <div className="text-xs font-bold truncate text-[var(--text-primary)] leading-tight">{user.name}</div>
                         <Link to="/settings" className="text-[10px] text-[var(--violet)] hover:underline font-medium transition-colors">View Profile</Link>
                       </div>
                    </div>
                 </>
               )}

               <div className="flex items-center justify-between px-1 mt-2">
                 <button
                    onClick={onLogout}
                    title="Log Out"
                    className="text-[11px] font-medium text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                  >
                    <LogOut size={11}/> Log Out
                  </button>
               </div>
            </div>
         </aside>

         )}

          {!sidebarOpen && (
            <button
              onClick={toggleSidebarOpen}
              className={`fixed hidden md:flex top-24 z-40 py-3 px-4 bg-gradient-to-r from-[var(--violet)] to-indigo-600 hover:from-indigo-600 hover:to-[var(--violet)] text-white shadow-xl hover:scale-105 transition-all duration-200 items-center gap-2 border border-white/10 cursor-pointer ${sidebarPosition === 'left' ? "left-0 rounded-r-2xl border-l-0" : "right-0 rounded-l-2xl border-r-0"}`}
              title="Open Sidebar"
            >
              {sidebarPosition === 'left' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Sidebar</span>
            </button>
          )}

          {/* Mobile Drawer for Sidebar Layout */}
          {renderMobileDrawer()}

          {/* Mobile Bottom Navigation Dock */}
          {renderMobileBottomNav()}

          {/* Main content scroll area */}
          <div id="app-scroll-container" className={`flex-1 flex flex-col min-w-0 h-full ${location.pathname.startsWith("/chat") || location.pathname.startsWith("/brand/inbox") || location.pathname.startsWith("/creator/inbox") || location.pathname.startsWith("/inbox") ? 'h-screen overflow-hidden' : 'overflow-y-auto'}`}>
              {/* Mobile Header for Sidebar Layout */}
              {renderMobileTopHeader()}
              <UnderReviewBanner user={user} onOpenModal={() => setUnderReviewModalOpen(true)} />
              <main className={`flex-1 shrink-0 flex flex-col ${
                location.pathname.startsWith("/chat") || location.pathname.startsWith("/brand/inbox") || location.pathname.startsWith("/creator/inbox") || location.pathname.startsWith("/inbox")
                  ? 'h-full overflow-hidden' 
                  : isFullBleedMobilePage(location.pathname)
                    ? 'p-0 md:p-6 lg:p-8 mobile-nav-safe-pad md:pb-8'
                    : 'p-4 sm:p-6 lg:p-8 mobile-nav-safe-pad md:pb-8'
              }`}>
                 {children}
                 {footerProps && <PremiumFooter {...footerProps} />}
              </main>
          </div>

          <UnderReviewModal
            isOpen={underReviewModalOpen}
            onClose={() => setUnderReviewModalOpen(false)}
            user={user}
          />
      </div>
    );
  }

  // STANDARD LAYOUT (Unauthenticated or Landing Page)
  const isBlogRoute = location.pathname.startsWith("/blog");

  return (
    <div className={`min-h-screen ${isBlogRoute ? "bg-white" : "bg-[var(--bg-base)]"} text-[var(--text-primary)] relative transition-colors duration-200 flex flex-col`}>
      {/* Floating Pill Navbar */}
      <header data-testid="main-header" className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className={`pointer-events-auto bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-default)] rounded-2xl transition-all duration-300 ${scrolled ? "shadow-[0_15px_30px_rgba(124,92,255,0.15)] border-[var(--violet-border)] scale-[0.99]" : ""} px-4 h-14 flex items-center gap-5 w-full max-w-5xl`}>
          <Link to="/" data-testid="logo-link" className="flex items-center gap-2 pl-1 pr-2">
            <YbexLogo className="h-8 text-[var(--violet)] w-auto max-w-[120px]" />
          </Link>

          {/* Clean Navbar */}
          <div className="hidden md:flex items-center gap-2 mx-auto">
            <NavItem to="/campaigns" testId="nav-explore">Live Campaigns</NavItem>
            <NavItem to="/creators" testId="nav-explore-creators">Explore Creators</NavItem>
            {user && <NavItem to="/campaigns" testId="nav-campaigns">Campaigns</NavItem>}
            <NavItem to="/ugc-orders" testId="nav-ugc-orders">
              <span className="flex items-center gap-1.5 font-semibold">
                <Film size={14} className="text-[var(--violet)]" />
                Live UGC Orders
              </span>
            </NavItem>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {user && <NotificationBell />}
            

            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--violet)] hover:bg-[#6B4AFF] transition-all shadow-md">Dashboard</Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" data-testid="nav-login" className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">Sign In</Link>
                <Link to="/signup" data-testid="nav-signup" className="px-4 py-2 bg-[var(--violet)] text-white font-semibold rounded-xl text-xs hover:bg-[var(--violet-hover)] shadow-[0_4px_15px_rgba(124,58,237,0.3)] transition-all transform hover:scale-105 duration-200">Get Ybex</Link>
              </div>
            )}
            <button className="md:hidden p-2 text-[var(--text-secondary)]" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-20 left-4 right-4 z-40 md:hidden bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-default)] rounded-2xl shadow-2xl p-3 flex flex-col gap-1 origin-top overflow-hidden"
          >
            <Link to="/creators" className="px-4 py-3 rounded-xl hover:bg-foreground/5 text-sm font-medium">Explore Creators</Link>
            <Link to="/campaigns" className="px-4 py-3 rounded-xl hover:bg-foreground/5 text-sm font-medium">Campaigns</Link>
            <Link to="/ugc-orders" className="px-4 py-3 rounded-xl hover:bg-foreground/5 text-sm font-medium flex items-center gap-2">
              <Film size={15} className="text-[var(--violet)]"/> Live UGC Orders
            </Link>
            {!user && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--border-default)]">
                <Link to="/login" className="p-2.5 rounded-xl text-center bg-[var(--bg-elevated)] text-sm font-semibold border border-[var(--border-default)]">Sign In</Link>
                <Link to="/signup" className="p-2.5 rounded-xl text-center bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)] text-sm font-semibold">Sign Up</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className={`flex-1 ${isAuthPage ? "pt-0" : "pt-20"} min-h-[calc(100vh-280px)]`}>{children}</main>

      {/* Premium Minimal Footer */}
      {!isAuthPage && location.pathname !== "/" && (
        <footer className="border-t border-[var(--border-default)] mt-24 bg-[var(--bg-base)] pt-12 pb-20 overflow-hidden flex flex-col items-center">
          <div className="max-w-6xl w-full mx-auto px-6 md:px-10 flex flex-col items-center justify-between gap-8 md:flex-row text-xs tracking-wider text-[var(--text-primary)]/45">
            <div className="font-display font-medium text-center md:text-left select-none uppercase">
              © 2026 YBEX MEDIA. ALL RIGHTS RESERVED.
            </div>

            <div className="flex items-center gap-2 select-none uppercase text-[var(--text-primary)]/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>STATUS: OPERATIONAL</span>
            </div>

            <div className="flex items-center gap-5 select-none font-bold">
              <Link to="/blog" className="hover:text-[var(--text-primary)] transition-colors uppercase">
                BLOGS
              </Link>
              <Link to="/privacy-policy" className="hover:text-[var(--text-primary)] transition-colors uppercase">
                PRIVACY POLICY
              </Link>
              <a href="https://ybexmedia.com" target="_blank" rel="noreferrer" className="hover:text-[var(--text-primary)] transition-colors uppercase">
                YBEXMEDIA.COM
              </a>
              {user?.role === "admin" && (
                <Link to="/admin" className="text-[var(--violet)] hover:underline hover:text-[var(--violet-hover)] uppercase flex items-center gap-1">
                  <ShieldAlert size={12}/> ADMIN
                </Link>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

const NavItem = ({ to, testId, children }) => (
  <NavLink to={to} data-testid={testId} className={({isActive}) => `px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${isActive ? "text-[var(--text-primary)] bg-[var(--text-primary)]/10 shadow-[inner_0_1px_5px_rgba(255,255,255,0.05)] border border-[var(--text-primary)]/5" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"}`}>{children}</NavLink>
);
