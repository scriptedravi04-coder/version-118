import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Briefcase,
  Search,
  MessageCircle,
  User,
  LayoutGrid,
  Megaphone,
  ShoppingBag,
  Users,
  ShieldAlert,
  Wallet,
  HelpCircle,
  PenLine,
  Video,
  X,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";

/**
 * BottomNav Component — Mobile Only
 * Spec:
 * - Fixed bottom, full width, 84px height (including safe-area inset)
 * - rgba(255, 255, 255, 0.94) + 16px backdrop blur, 1px top border #E5E5E2
 * - Equal flex tabs, icon 22px above a 10px label, 5px gap, min 44px hit target
 * - Role-based tabs: "creator" | "brand" | "admin"
 * - Active state dynamic from router
 * - Raised center for Creator Explore tab (46px, -18px offset)
 * - Re-tap on active tab scrolls page to top
 */
export default function BottomNav({
  role = "creator",
  hasPendingWork = false,
  activeThreadsCount = 0,
  className = "",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // State for Brand action popup menu ("Create Campaign" / "Create UGC")
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [hasUgcDraft, setHasUgcDraft] = useState(false);

  useEffect(() => {
    try {
      const draft = localStorage.getItem("nexus_brand_ugc_draft");
      setHasUgcDraft(Boolean(draft && draft.length > 20));
    } catch (e) {
      setHasUgcDraft(false);
    }
  }, [createMenuOpen]);

  // Close create action sheet whenever location pathname changes
  useEffect(() => {
    setCreateMenuOpen(false);
  }, [currentPath]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setCreateMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Define tab sets for each role according to the design specification
  const getTabsForRole = () => {
    if (role === "brand") {
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutGrid,
          path: "/brand",
          matches: (path) =>
            path === "/brand" ||
            path === "/brand/dashboard" ||
            (path === "/dashboard" && role === "brand"),
        },
        {
          id: "discover",
          label: "Discover",
          icon: Search,
          path: "/brand/discover",
          matches: (path) =>
            path === "/brand/discover" ||
            path === "/creators" ||
            path.startsWith("/creator/"),
        },
        {
          id: "manage",
          label: "Manage",
          icon: Layers,
          isRaised: true,
          isAction: true,
          matches: (path) =>
            path.startsWith("/brand/campaigns") ||
            path.startsWith("/brand/ugc"),
        },
        {
          id: "inbox",
          label: "Inbox",
          icon: MessageCircle,
          path: "/brand/inbox",
          matches: (path) =>
            path === "/brand/inbox" ||
            path.startsWith("/brand/inbox/") ||
            path.startsWith("/chat"),
          badgeCount: activeThreadsCount,
        },
        {
          id: "brand",
          label: "Brand",
          icon: ShoppingBag,
          path: "/brand/account",
          isAccountTab: true,
          hubPaths: ["/brand/account"],
          matches: (path) =>
            path === "/brand/account" ||
            path === "/brand/settings" ||
            path === "/brand/profile" ||
            path === "/brand/payments" ||
            path === "/brand/kyc" ||
            (path === "/settings" && role === "brand"),
        },
      ];
    }

    if (role === "admin" || role === "sub_admin") {
      return [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutGrid,
          path: "/admin?tab=dashboard",
          matches: (path) => path.startsWith("/admin") && (!location.search || location.search.includes("tab=dashboard")),
        },
        {
          id: "users",
          label: "Users",
          icon: Users,
          path: "/admin?tab=users",
          matches: (path) => path.includes("tab=users"),
        },
        {
          id: "kyc",
          label: "KYC",
          icon: ShieldAlert,
          path: "/admin?tab=verifications",
          matches: (path) => path.includes("tab=verifications"),
        },
        {
          id: "escrow",
          label: "Escrow",
          icon: Wallet,
          path: "/admin?tab=escrow",
          matches: (path) => path.includes("tab=escrow"),
        },
        {
          id: "helpdesk",
          label: "Helpdesk",
          icon: HelpCircle,
          path: "/admin?tab=helpdesk",
          matches: (path) => path.includes("tab=helpdesk"),
        },
      ];
    }

    // Default: Creator (5 Tabs)
    return [
      {
        id: "home",
        label: "Home",
        icon: Home,
        path: "/dashboard",
        matches: (path) => path === "/dashboard" || path === "/",
      },
      {
        id: "deals",
        label: "My Work",
        icon: Briefcase,
        path: "/deals",
        matches: (path) =>
          path === "/deals" ||
          path === "/collabs" ||
          path.startsWith("/deals/") ||
          path.startsWith("/creator/deals") ||
          path === "/creator/ugc/orders",
        badge: hasPendingWork,
      },
      {
        id: "explore",
        label: "Explore",
        icon: Search,
        path: "/explore",
        matches: (path) =>
          path === "/explore" ||
          path === "/creators" ||
          path === "/campaigns" ||
          path.startsWith("/campaigns/") ||
          path === "/creator/ugc" ||
          path === "/creator/ugc/browse" ||
          path === "/ugc" ||
          path === "/ugc-orders" ||
          path === "/creator-campaign-flow",
        isRaised: true, // Raised centre for Creator only (46px, -18px offset)
      },
      {
        id: "chat",
        label: "Chat",
        icon: MessageCircle,
        path: "/inbox",
        matches: (path) =>
          path === "/inbox" ||
          path === "/chat" ||
          path.startsWith("/chat/"),
        badgeCount: activeThreadsCount,
      },
      {
        id: "profile",
        label: "Profile",
        icon: User,
        path: "/profile",
        isAccountTab: true,
        hubPaths: ["/profile", "/creator/settings"],
        matches: (path) =>
          path === "/profile" ||
          path === "/creator/settings" ||
          path === "/creator/profile" ||
          path === "/profile/overview" ||
          path === "/settings" ||
          path === "/earnings" ||
          path === "/refer" ||
          path === "/creator/kyc" ||
          path === "/kyc" ||
          path === "/kyc/status" ||
          path.startsWith("/help"),
      },
    ];
  };

  const tabs = getTabsForRole();

  // The app scrolls an inner container, not the window — Layout gives it this id.
  const getScroller = () => document.getElementById("app-scroll-container");

  const scrollToTop = () => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
    try { getScroller()?.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
  };

  // Spec: "tapping a different tab restores that tab's last scroll position".
  // Kept in a ref rather than sessionStorage so it resets with the session and can
  // never resurrect a stale offset for a page whose content has since changed.
  const scrollMemory = useRef({});
  const activeTabId = tabs.find((t) => t.matches(currentPath))?.id;

  const rememberScroll = () => {
    if (!activeTabId) return;
    const el = getScroller();
    scrollMemory.current[activeTabId] = el ? el.scrollTop : window.scrollY || 0;
  };

  const restoreScroll = (tabId) => {
    const top = scrollMemory.current[tabId];
    if (!top) return;
    // Wait for the destination route to paint before restoring.
    requestAnimationFrame(() => {
      setTimeout(() => {
        try { getScroller()?.scrollTo({ top, behavior: "auto" }); } catch (e) {}
      }, 60);
    });
  };

  const handleTabClick = (tab, isActive) => {
    if (tab.isAction) {
      setCreateMenuOpen((prev) => !prev);
      return;
    }

    if (createMenuOpen) {
      setCreateMenuOpen(false);
    }

    // The account tab owns a hub with push-route sub-screens behind a ?section=
    // param (creator and brand both). Re-tapping it must come back to the hub,
    // not just scroll whatever sub-screen is open.
    if (tab.isAccountTab) {
      window.dispatchEvent(new CustomEvent("reset-mobile-profile-hub"));
      if (isActive) {
        // Already on the hub with no sub-screen open? Just scroll. Otherwise come
        // back to it — the account tab also matches /refer, /help, /earnings and
        // the like, and re-tapping should return home from those too.
        const onHub = (tab.hubPaths || [tab.path]).includes(location.pathname);
        if (location.search || !onHub) navigate(tab.path, { replace: true });
        scrollToTop();
      } else {
        rememberScroll();
        navigate(tab.path);
        restoreScroll(tab.id);
      }
      return;
    }

    if (isActive) {
      scrollToTop();
    } else {
      rememberScroll();
      navigate(tab.path);
      restoreScroll(tab.id);
    }
  };

  return (
    <>
      {/* Brand Create Action Menu Backdrop */}
      <AnimatePresence>
        {createMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setCreateMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Brand Create Action Menu Modal / Popup */}
      <AnimatePresence>
        {createMenuOpen && (
          <motion.div
            id="brand-hub-menu-modal"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 440, damping: 28 }}
            className="fixed z-50 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 w-full max-w-[310px] px-3 pointer-events-auto"
            style={{
              bottom: "calc(118px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {/* Option 1: CAMPAIGNS */}
            <button
              id="brand-action-campaigns"
              type="button"
              onClick={() => {
                setCreateMenuOpen(false);
                navigate("/brand/campaigns");
              }}
              className="flex-1 min-w-[130px] bg-white dark:bg-[#1E293B] text-[#0A0A0A] dark:text-white font-bold text-xs py-3 px-3.5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.16)] border border-[#E5E5EA] dark:border-slate-700/80 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer hover:border-[#7C3AED]/50"
            >
              <div className="w-7 h-7 rounded-xl bg-[#F1E8FF] dark:bg-purple-950/60 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center shrink-0">
                <Megaphone size={15} strokeWidth={2.2} />
              </div>
              <span className="tracking-tight text-[13px]">Campaigns</span>
            </button>

            {/* Option 2: UGC */}
            <button
              id="brand-action-ugc"
              type="button"
              onClick={() => {
                setCreateMenuOpen(false);
                navigate("/brand/ugc/instant");
              }}
              className="flex-1 min-w-[130px] bg-white dark:bg-[#1E293B] text-[#0A0A0A] dark:text-white font-bold text-xs py-3 px-3.5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.16)] border border-[#E5E5EA] dark:border-slate-700/80 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer hover:border-emerald-500/50"
            >
              <div className="w-7 h-7 rounded-xl bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <Video size={15} strokeWidth={2.2} />
              </div>
              <span className="tracking-tight text-[13px]">UGC</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Bottom Navigation"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 w-full bg-white/94 dark:bg-[#0f172a]/94 backdrop-blur-[16px] border-t border-[#E5E5E2] dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-all duration-150 select-none ${className}`}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
          height: "calc(84px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center justify-around h-[84px] px-1.5 w-full max-w-lg mx-auto relative">
          {tabs.map((tab) => {
            const isActive = tab.matches(currentPath);
            const Icon = tab.icon;
            const isMenuOpenForThisTab = tab.isAction && createMenuOpen;

            if (tab.isRaised) {
              // Raised Centre Tab (Explore for Creator, Pencil Create for Brand: squircle, -18px offset)
              return (
                <button
                  key={tab.id}
                  id={`bottom-nav-tab-${tab.id}`}
                  type="button"
                  onClick={() => handleTabClick(tab, isActive)}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center relative touch-manipulation cursor-pointer group py-1"
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Raised Floating Squircle */}
                  <div
                    className={`w-[46px] h-[46px] rounded-[16px] flex items-center justify-center -translate-y-[18px] transition-all duration-200 active:scale-95 shadow-[0_8px_20px_rgba(124,58,237,0.38)] ring-4 ring-white dark:ring-[#0f172a] ${
                      isMenuOpenForThisTab || isActive
                        ? "bg-[#7C3AED] text-white scale-105"
                        : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                    }`}
                  >
                    {isMenuOpenForThisTab ? (
                      <X size={22} strokeWidth={2.4} className="animate-in fade-in zoom-in-75 duration-150" />
                    ) : (
                      <Icon size={22} strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Label aligned directly underneath */}
                  <span
                    className={`text-[10px] leading-tight tracking-tight -translate-y-[12px] truncate max-w-[64px] transition-colors ${
                      isMenuOpenForThisTab || isActive
                        ? "font-bold text-[#7C3AED] dark:text-[#A78BFA]"
                        : "font-semibold text-[#A0A0AA] dark:text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            }

            // Standard Flat Tab
            return (
              <button
                key={tab.id}
                id={`bottom-nav-tab-${tab.id}`}
                type="button"
                onClick={() => handleTabClick(tab, isActive)}
                className="flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center relative touch-manipulation cursor-pointer group py-1.5 transition-all"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon Container with Badge */}
                <div className="relative flex items-center justify-center">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    fill={isActive ? "rgba(124,58,237,0.14)" : "none"}
                    className={`transition-colors duration-150 ${
                      isActive
                        ? "text-[#7C3AED] dark:text-[#A78BFA]"
                        : "text-[#A0A0AA] dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                    }`}
                  />

                  {/* Badge Indicator */}
                  {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 bg-[#7C3AED] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-white dark:ring-[#0f172a] shadow-xs">
                      {tab.badgeCount > 9 ? "9+" : tab.badgeCount}
                    </span>
                  )}

                  {/* Dot badge if boolean */}
                  {tab.badge && !tab.badgeCount && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#7C3AED] ring-2 ring-white dark:ring-[#0f172a] animate-pulse" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] leading-tight tracking-tight mt-[5px] truncate max-w-[64px] text-center transition-colors ${
                    isActive
                      ? "font-bold text-[#7C3AED] dark:text-[#A78BFA]"
                      : "font-semibold text-[#A0A0AA] dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
