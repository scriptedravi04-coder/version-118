import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { t } from "@/lib/typography";
import { Badge } from "../common/Badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence, animate } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { gsap } from "gsap";
import { 
  Eye, Users, Megaphone, DollarSign, ArrowRight, Share2, Package, Check, 
  MapPin, Gift, ChevronRight, X, Briefcase, Bell, Link as LinkIcon, AlertCircle, AlertTriangle,
  Search, Power, TrendingUp, Film, Wallet, User, ShieldAlert, FileText, Heart, MessageCircle,
  IndianRupee, CheckCircle, Clock, LogOut,
  Zap,
} from "lucide-react";
import { useLoading } from "../../contexts/LoadingContext";
import { useAuth } from "../../contexts/AuthContext";
import NotificationBell from "../shared/NotificationBell";
import TrustedBrandsWidget from "./TrustedBrandsWidget";
import TrustBadgeRotator from "../TrustBadgeRotator";
import { getCampaignStats, getCampaignAvatars } from "../../utils/campaignStats";


const formatNumber = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(num);
};

const AnimatedNumber = ({ value, prefix = "", format = false }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v)
    });
    return controls.stop;
  }, [value]);
  
  const formatted = format ? formatNumber(display) : Math.floor(display);
  return <span>{prefix}{formatted}</span>;
};

const heroBannersList = [
  {
    id: "h1",
    title: "boAt Rockerz ANC Series",
    description: "Produce premium UGC for the new active noise cancelling series. Earn up to ₹25,000 per video.",
    tag: "⚡ HIGH BUDGET",
    brand: "boAt Lifestyle",
    link: "/campaigns",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    gradient: "from-slate-900 via-slate-800 to-zinc-900"
  },
  {
    id: "h2",
    title: "Nike Pegasus 40 Launch",
    description: "Review & style the ultimate running shoes in your aesthetic. Receive free footwear + premium payout.",
    tag: "🔥 TRENDING NOW",
    brand: "Nike India",
    link: "/campaigns",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=600&auto=format&fit=crop",
    gradient: "from-zinc-950 via-neutral-900 to-zinc-800"
  },
  {
    id: "h3",
    title: "Mamaearth Pure Tea Tree Series",
    description: "Clean, organic skincare campaign. Promote daily routines with real testimonials. Escrow pre-funded.",
    tag: "🍃 SAFE ESCROW",
    brand: "Mamaearth",
    link: "/campaigns",
    image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=600&auto=format&fit=crop",
    gradient: "from-emerald-950 via-emerald-900 to-teal-950"
  },
  {
    id: "h4",
    title: "mCaffeine Espresso Glow",
    description: "Create an engaging aesthetic reel for coffee body scrub. Quick turnaround payouts.",
    tag: "☕ UGC SPECIAL",
    brand: "mCaffeine",
    link: "/campaigns",
    image: "https://images.unsplash.com/photo-1608248597481-496100c80836?q=80&w=600&auto=format&fit=crop",
    gradient: "from-amber-950 via-stone-900 to-amber-900"
  },
  {
    id: "h5",
    title: "Zomato Food Carnival 2026",
    description: "Feature local dining experiences with Zomato Pay. High audience engagement guaranteed.",
    tag: "🍔 INSTANT PAYOUTS",
    brand: "Zomato",
    link: "/campaigns",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
    gradient: "from-rose-950 via-rose-900 to-red-950"
  }
];

export default function CreatorDashboard({ user: propUser }) {
  const [kycStatus, setKycStatus] = useState(null);
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();
  const { user: authUser, logout } = useAuth();
  const user = propUser || authUser;
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasPendingDeliveries, setHasPendingDeliveries] = useState(false);
  const [hasApprovedDeals, setHasApprovedDeals] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [showKycBanner, setShowKycBanner] = useState(true);
  const [activeDealsTab, setActiveDealsTab] = useState("All");
  const containerRef = useRef(null);
  const [adminPopup, setAdminPopup] = useState(null);

  const [loading, setLoading] = useState(false);
  const [portfolioCount, setPortfolioCount] = useState(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  
  const [profile, setProfile] = useState({ profile_views: 0, profile_reach: 0, portfolio: "" });
  const [collabCount, setCollabCount] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [brandInterest, setBrandInterest] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [realDeals, setRealDeals] = useState([]);



  const handleDismissPopup = async () => {
    if (!adminPopup) return;
    const notifId = adminPopup.notif_id || adminPopup.id;
    try {
      await api.post(`/notifications/${notifId}/read`);
      setAdminPopup(null);
      toast.success("Notification acknowledged");
    } catch (e) {
      console.error(e);
      setAdminPopup(null);
    }
  };

  const importantTasks = React.useMemo(() => {
    const tasks = [];
    
    // 1. Profile completion
    if (!user?.profile_completed) {
      tasks.push({ 
        id: 'profile', 
        icon: User, 
        iconColor: 'text-blue-500',
        title: 'Complete your profile', 
        desc: 'Finish onboarding and add content categories to attract verified brands.', 
        btnText: 'Complete Profile',
        link: '/profile/overview' 
      });
    }
    
    // 2. Financial KYC
    if (!user?.kyc_verified && kycStatus !== "approved" && kycStatus !== "APPROVED" && kycStatus !== "pending" && kycStatus !== "PENDING" && kycStatus !== "UNDER_REVIEW") {
      tasks.push({ 
        id: 'kyc', 
        icon: AlertTriangle, 
        iconColor: 'text-orange-500',
        title: 'Complete Financial KYC', 
        desc: 'Verify your ID and tax status to process payouts and legally sign brand contracts.', 
        btnText: 'Complete Verification',
        link: '/kyc'
      });
    }
    
    // 2b. Financial KYC Under Review
    if (kycStatus === "pending" || kycStatus === "PENDING" || kycStatus === "UNDER_REVIEW") {
      tasks.push({ 
        id: 'kyc_review', 
        icon: Clock, 
        iconColor: 'text-blue-500',
        title: 'Financial KYC under Review ⏳', 
        desc: 'Our compliance officers are verifying your documents. This usually takes 24-48 hours.', 
        btnText: 'Check Status',
        link: '/kyc/status'
      });
    }
    
    // 3. Bank Details
    if (!user?.bank_details_added) {
      tasks.push({ 
        id: 'bank', 
        icon: Wallet, 
        iconColor: 'text-emerald-600',
        title: 'Add Bank Details',
        desc: 'Add your active bank account details to receive verified campaign payouts directly.', 
        btnText: 'Add Bank Details',
        link: '/earnings' 
      });
    }

    // 3b. Portfolio Completion Nudge
    if (portfolioCount === 0) {
      tasks.push({
        id: 'portfolio_sample',
        icon: Film,
        iconColor: 'text-amber-600',
        title: 'Add past work sample',
        desc: 'Creators with at least one past work sample are 5x more likely to receive direct pitches.',
        btnText: 'Add Sample Work',
        link: '/profile/overview'
      });
    }

    // 4. Downstream engagement tasks (Only show when onboarding tasks are complete)
    if (tasks.length === 0) {
      if (hasUnreadMessages) {
        tasks.push({
          id: 'chat',
          icon: MessageCircle,
          iconColor: 'text-indigo-500',
          title: 'Unread Messages',
          desc: 'Check your inbox for unread brand DMs and collaborative proposals requiring your response.',
          btnText: 'Go to Inbox',
          link: '/chat'
        });
      }

      if (hasPendingDeliveries) {
        tasks.push({
          id: 'pending_work',
          icon: Briefcase,
          iconColor: 'text-rose-600',
          title: 'Pending Deliverables',
          desc: 'Review your ongoing brand deals and upload content drafts or final posting proofs.',
          btnText: 'View Pending Deals',
          link: '/collabs?tab=sent'
        });
      }

      if (hasApprovedDeals) {
        tasks.push({
          id: 'brand_approval',
          icon: CheckCircle,
          iconColor: 'text-teal-500',
          title: 'Approved Deals',
          desc: 'A brand approved your application! Accept terms and start collaborating immediately.',
          btnText: 'My Applications',
          link: '/collabs?tab=campaign_applications'
        });
      }

      // Fallbacks if nothing is pending
      if (tasks.length === 0) {
        tasks.push({
          id: 'campaign',
          icon: Megaphone,
          iconColor: 'text-purple-500',
          title: 'Apply to Campaigns',
          desc: 'Explore active live campaigns matching your niche and submit your pitch to work with leading brands!',
          btnText: 'Explore Campaigns',
          link: '/campaigns'
        });

        tasks.push({
          id: 'refer',
          icon: Gift,
          iconColor: 'text-pink-500',
          title: 'Refer & Earn',
          desc: 'Invite your creator friends to join the platform and earn up to ₹500 on their first successful collab!',
          btnText: 'Refer Friends',
          link: '/refer'
        });
      }
    }

    return tasks;
  }, [user, hasUnreadMessages, hasPendingDeliveries, hasApprovedDeals, kycStatus, portfolioCount]);

  useEffect(() => {
    const statInterval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(statInterval);
  }, []);

  useEffect(() => {
    if (importantTasks.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTaskIndex((prev) => (prev + 1) % importantTasks.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [importantTasks.length]);


  
  const handleCampaignTap = (campaignId, index) => {
     // Tracking click
     api.post(`/campaigns/${campaignId}/track-view`).catch(e => console.warn('Failed to track view'));
     navigate(`/campaigns/${campaignId}`);
  };
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  
  const [widgetIndex, setWidgetIndex] = useState(0);

  const [banners, setBanners] = useState([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!user) return;
      if (campaigns.length === 0) {
        // No global block loader, local loading skeleton will show
      }
      try {
        const isBypass = user.email === 'dev@ybex.io' || user.email === 'nexus_brand@ybex.io' || user.email === 'admin@ybex.io' || user.email.includes("bypass");
        
        if (isBypass) {
          setProfile({ profile_views: 1200, profile_reach: 48200, portfolio: "" });
          setCollabCount(4);
          setMonthlyEarnings(48500);
          setBrandInterest(32);
        } else {
          const profileRes = await api.get(`/creators/${user.user_id}/profile`).catch(() => null);
          if (profileRes?.data) {
            setProfile({
              profile_views: profileRes.data.profile_views || 0,
              profile_reach: profileRes.data.profile_reach || 0,
              portfolio: profileRes.data.portfolio || ""
            });
          } else {
            setProfile({ profile_views: 0, profile_reach: 0, portfolio: "" });
          }
          setCollabCount(0);
          setMonthlyEarnings(0);
          setBrandInterest(0);
        }
        
        const { data: bannersData } = await api.get('banners').catch(() => ({ data: [] }));
        if (mounted && Array.isArray(bannersData)) setBanners(bannersData);
        
        const { data: camps } = await api.get('campaigns').catch(() => ({ data: [] }));
        if (mounted && camps) {
          const arr = Array.isArray(camps) ? camps : [];
          const filtered = arr.filter(c => c.status === "live" || c.stage === "Live" || c.stage === "Under Review");
          setCampaigns(filtered.reverse().slice(0, 5));
        }

        // Fetch operational tasks data
        const { data: threadsData } = await api.get('chat/v2/threads').catch(() => ({ data: [] }));
        if (mounted && Array.isArray(threadsData)) {
          const unreadThreads = threadsData.filter(t => t.unread_creator || t.unread === true || (t.last_message_sender && t.last_message_sender !== user.user_id && !t.read));
          setHasUnreadMessages(unreadThreads.length > 0);
          setUnreadCount(unreadThreads.length);
        }

        const { data: collabsData } = await api.get('collabs').catch(() => ({ data: { sent: [], received: [], campaign_applications: [] } }));
        if (mounted && collabsData) {
          const sent = collabsData.sent || [];
          const received = collabsData.received || [];
          const apps = collabsData.campaign_applications || [];

          const activeCollabs = [...sent, ...received].filter(c => c.status === "active" || c.status === "approved" || c.stage === "Content Submission" || c.stage === "Draft Upload" || c.stage === "active" || c.status === "pending_draft");
          setHasPendingDeliveries(activeCollabs.length > 0);

          const approvedApps = apps.filter(a => a.status === "accepted" || a.status === "approved");
          setHasApprovedDeals(approvedApps.length > 0);
          
          const allDeals = [...sent, ...received];
          setRealDeals(allDeals);

          if (!isBypass) {
            // Calculate unique brand count as Brand Interest
            const uniqBrands = new Set(allDeals.map(d => d.brand_id || d.brand_name).filter(Boolean));
            setBrandInterest(uniqBrands.size);

            // Fetch real transactions to calculate earnings from transactions table
            try {
              const { data: txns } = await api.get('transactions');
              if (txns && Array.isArray(txns)) {
                const completedTxns = txns.filter(t => t.status === 'SUCCESS' || t.status === 'SUCCESS');
                const totalEarnings = completedTxns.reduce((sum, t) => sum + Number(t.net_amount || t.amount || 0), 0);
                setMonthlyEarnings(totalEarnings);
              } else {
                setMonthlyEarnings(0);
              }
            } catch (err) {
              console.warn("Failed to load transactions for earnings:", err);
              setMonthlyEarnings(0);
            }
          }
        }

        const { data: notifData } = await api.get('notifications').catch(() => ({ data: [] }));
        if (mounted && Array.isArray(notifData)) {
          const unreadNotifs = notifData.filter(n => !n.read);
          const adminCustomMsg = unreadNotifs.find(n => n.type === 'admin_custom_message');
          if (adminCustomMsg) {
            setAdminPopup(adminCustomMsg);
          }
          if (unreadNotifs.length > 0) {
            const hasChatNotif = unreadNotifs.some(n => n.type === 'message' || n.type === 'chat' || n.message?.toLowerCase().includes('message'));
            if (hasChatNotif) {
              setHasUnreadMessages(true);
            }
          }
        }

        if (supabase && user) {
          const { count, error: countErr } = await supabase
            .from('creator_portfolio_items')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.user_id);
          if (!countErr && count !== null) {
            setPortfolioCount(count);
          } else {
            setPortfolioCount(0);
          }
        }

        const { data: kycRes } = await api.get('verifications/me').catch(() => ({ data: null }));
        if (mounted && kycRes) {
          setKycStatus(kycRes.status);
        }
      } catch (e) {
        console.warn('Silent fail Dashboard shell', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();

    // Simulating Live Sync with periodic polling
    const syncInterval = setInterval(() => {
       api.get('campaigns').then(({ data }) => {
          if (mounted && data) {
             const arr = Array.isArray(data) ? data : [];
             const filtered = arr.filter(c => c.status === "live" || c.stage === "Live" || c.stage === "Under Review");
             setCampaigns(filtered.reverse().slice(0, 5));
          }
       }).catch(e => console.warn('Silent live sync fail', e));
    }, 60000);

    return () => { mounted = false; clearInterval(syncInterval); };
  }, [user?.user_id, user?.email]);

  const isNewUser = !user?.kyc_verified || !user?.bank_details_added || !user?.profile_completed;
  const heroBanners = banners.filter(b => 
    b.placement === "Dashboard Hero Carousel" && 
    b.status === "Live" && 
    (b.type === "Common" || b.type === "Influencer")
  ).slice(0, 5);
  const displayBanners = heroBanners.length > 0 ? heroBanners : heroBannersList;

  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % displayBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [displayBanners.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setWidgetIndex((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const generateChartData = () => {
    if (user?.email === 'dev@ybex.io' || user?.email === 'nexus_brand@ybex.io' || user?.email === 'admin@ybex.io' || user?.email?.includes("bypass")) {
      return [
        { name: 'Week 1', profile_views: 300, collab_interest: 5 },
        { name: 'Week 2', profile_views: 420, collab_interest: 8 },
        { name: 'Week 3', profile_views: 550, collab_interest: 12 },
        { name: 'Week 4', profile_views: 680, collab_interest: 15 }
      ];
    }
    return [
      { name: 'Week 1', profile_views: 0, collab_interest: 0 },
      { name: 'Week 2', profile_views: 0, collab_interest: 0 },
      { name: 'Week 3', profile_views: 0, collab_interest: 0 },
      { name: 'Week 4', profile_views: 0, collab_interest: 0 }
    ];
  };

  const CHART_DATA = generateChartData();

  useEffect(() => {
    if (!loading && containerRef.current) {
      // Trigger GSAP entrance stagger animation for beautiful smooth load
      gsap.fromTo(
        containerRef.current.querySelectorAll(".gsap-reveal"),
        { opacity: 0, y: 16 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.65, 
          stagger: 0.05, 
          ease: "power2.out",
          clearProps: "all" 
        }
      );
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full max-w-none animate-pulse bg-[var(--bg-base)] min-h-screen">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-8 pt-6">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0"></div>
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/4"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-xl w-32"></div>
        </div>
        {/* Main grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / center column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-44 bg-gray-200 dark:bg-zinc-800 rounded-3xl"></div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-zinc-800 rounded-3xl"></div>
              ))}
            </div>
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/3 mt-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-3xl"></div>
              ))}
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-6">
            <div className="h-80 bg-gray-200 dark:bg-zinc-800 rounded-3xl"></div>
            <div className="h-44 bg-gray-200 dark:bg-zinc-800 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const rawName = user?.name || user?.full_name || user?.fullName || user?.firstName || user?.first_name || user?.display_name || user?.displayName || authUser?.name || authUser?.full_name || user?.email?.split('@')[0] || "Creator";
  const cleanName = typeof rawName === 'string' ? rawName.trim() : String(rawName || '').trim();
  const firstName = cleanName ? (cleanName.split(/\s+/)[0] || cleanName) : "Creator";
  const userPhoto = user?.photo || user?.picture || user?.avatar || authUser?.photo || authUser?.picture || authUser?.avatar || "https://i.pravatar.cc/150?u=creator";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div ref={containerRef} className="w-full max-w-none flex flex-col pb-8" data-testid="creator-dashboard">
      {/* Header Area */}
      <div className="hidden md:flex mb-6 justify-between items-center relative z-40 gsap-reveal">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--border-default)] relative shrink-0">
             <img src={userPhoto} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              {greeting}, {firstName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-sm text-gray-500">
                Ready to find your next collaboration today?
              </p>
              <span className="hidden sm:inline text-gray-400 font-bold">•</span>
              <TrustBadgeRotator page="creatorDashboard" className="hidden md:block" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button 
            onClick={() => navigate("/chat")}
            className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center relative shadow-sm hover:bg-[var(--bg-elevated)] transition-all cursor-pointer"
            title="Go to Inbox"
          >
            <MessageCircle className="w-[18px] h-[18px] text-[var(--text-tertiary)]" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--violet)] rounded-full text-white text-[10px] font-bold flex items-center justify-center border border-white animate-pulse">
                {unreadCount}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="md:hidden flex items-center mb-3 mt-1 gsap-reveal">
        <TrustBadgeRotator page="creatorDashboard" />
      </div>
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 gsap-reveal pt-1 md:pt-0">
        {/* Sliding Banners for All Users */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[20px] relative overflow-hidden flex flex-col justify-center border border-[var(--border-default)] h-[180px] md:h-[200px] lg:h-[280px] w-full group">
             {displayBanners.map((banner, idx) => (
               <Link 
                 key={banner.id || idx} 
                 to={banner.link || "/campaigns"}
                 className={`absolute inset-0 transition-opacity duration-700 ${idx === currentBannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
               >
                 <img 
                   src={banner.image_url || banner.imgUrl || banner.image} 
                   alt={banner.title || "Banner"} 
                   className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" 
                   referrerPolicy="no-referrer"
                 />
               </Link>
             ))}
             
             {/* Slider Dots */}
             {displayBanners.length > 1 && (
               <div className="absolute bottom-3 left-4 md:left-10 flex items-center gap-1.5 z-20">
                 {displayBanners.map((_, idx) => (
                   <button 
                     key={idx}
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       setCurrentBannerIdx(idx);
                     }}
                     className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentBannerIdx ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
                     title={`Slide ${idx + 1}`}
                   />
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Important for you */}
        <div className="hidden sm:flex bg-white rounded-[20px] p-3 sm:p-6 border border-[var(--border-default)] flex-col md:h-[200px] lg:h-[280px] relative w-full">
          <div className="mb-3 sm:mb-0 shrink-0">
            <h4 className={'text-sm sm:text-base font-bold'}>Important For You</h4>
            <p className={`text-[10px] sm:text-[11px] font-medium mt-0.5 leading-snug text-gray-500`}>Actions required to boost your reach</p>
          </div>
          
          {/* Desktop: Animated single task loop */}
          <div className="hidden sm:flex relative overflow-hidden flex-1 flex-col justify-center my-3 mb-8">
            <AnimatePresence mode="wait">
              {importantTasks[currentTaskIndex] && (() => {
                const task = importantTasks[currentTaskIndex];
                const IconComp = task.icon;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                  >
                    <Link
                      to={task.link}
                      className="block bg-[var(--bg-elevated)] rounded-[16px] p-6 hover:bg-[#F2F2F7]/50 transition-all border border-[var(--border-default)] group shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <IconComp size={16} className={`${task.iconColor} shrink-0 opacity-80 sm:w-[20px] sm:h-[20px]`} />
                        <h5 className={`font-bold text-sm sm:text-base transition-colors leading-none`}>
                          {task.title}
                        </h5>
                      </div>
                      <p className={`text-[12px] sm:text-sm text-gray-500 leading-relaxed mb-3 sm:mb-4 sm:h-[40px] line-clamp-2`}>
                        {task.desc}
                      </p>
                      <div className="h-px bg-[#E5E5E5] mb-3"></div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1`}>
                        {task.btnText} <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform opacity-75 sm:w-[14px] sm:h-[14px]" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Slider Dots at the bottom of the card (Desktop only) */}
          {importantTasks.length > 1 && (
            <div className="hidden sm:flex absolute bottom-3 left-0 right-0 justify-center gap-1.5 z-20">
              {importantTasks.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentTaskIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentTaskIndex ? "w-5 bg-[var(--violet)]" : "w-1.5 bg-neutral-200 hover:bg-neutral-300"}`}
                  title={`Task ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile 2-Column Compact Stats & Important Row */}
      <div className="sm:hidden grid grid-cols-2 gap-3 mb-6">
         {/* Left Box: Stats Auto-Scroller */}
         <div className="bg-white rounded-[16px] p-2.5 sm:p-3 border border-[var(--border-default)] shadow-sm flex flex-col relative aspect-square overflow-hidden">
            <div className="mb-2 shrink-0">
               <h4 className="text-xs font-bold">Stats</h4>
               <p className="text-[9px] font-medium mt-0.5 leading-snug text-gray-500">Your progress</p>
            </div>
            <div className="flex-1 relative flex flex-col justify-center">
               <AnimatePresence mode="wait">
                  {currentStatIndex === 0 && (
                     <motion.div key="stat-0" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.35 }} className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Views</span>
                        <div className="font-mono font-bold tracking-tight text-lg my-0.5 text-gray-900">
                           <AnimatedNumber value={profile.profile_views || 0} format={true} />
                        </div>
                        <span className="inline-flex items-center text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">+18%</span>
                     </motion.div>
                  )}
                  {currentStatIndex === 1 && (
                     <motion.div key="stat-1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.35 }} className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Interest</span>
                        <div className="font-mono font-bold tracking-tight text-lg my-0.5 text-gray-900">
                           <AnimatedNumber value={brandInterest} />
                        </div>
                        <span className="inline-flex items-center text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">+12%</span>
                     </motion.div>
                  )}
                  {currentStatIndex === 2 && (
                     <motion.div key="stat-2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.35 }} className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Earnings</span>
                        <div className="font-mono font-bold tracking-tight text-lg my-0.5 text-gray-900">
                           <AnimatedNumber value={monthlyEarnings} format={true} prefix="₹" />
                        </div>
                        <span className="inline-flex items-center text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">+22%</span>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
            {/* Slider Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
               {[0, 1, 2].map((idx) => (
                  <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentStatIndex ? "w-4 bg-[var(--violet)]" : "w-1.5 bg-neutral-200"}`} />
               ))}
            </div>
         </div>

         {/* Right Box: Important For You Auto-Scroller */}
         <div className="bg-white rounded-[16px] p-2.5 sm:p-3 border border-[var(--border-default)] shadow-sm flex flex-col relative aspect-square overflow-hidden">
            <div className="mb-2 shrink-0">
               <h4 className="text-xs font-bold truncate">Important For You</h4>
               <p className="text-[9px] font-medium mt-0.5 leading-snug text-gray-500 truncate">Tasks required</p>
            </div>
            <div className="flex-1 relative flex flex-col justify-center">
               <AnimatePresence mode="wait">
                  {importantTasks[currentTaskIndex] && (() => {
                     const task = importantTasks[currentTaskIndex];
                     const IconComp = task.icon;
                     return (
                        <motion.div key={task.id} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.35 }} className="w-full flex flex-col h-full justify-center">
                           <Link to={task.link} className="flex flex-col items-center text-center group">
                              <div className="flex justify-center mb-2">
                                 <IconComp size={18} className={`${task.iconColor} opacity-90`} />
                              </div>
                              <h5 className="font-bold text-[10px] sm:text-[11px] leading-tight mb-1 line-clamp-2">
                                 {task.title}
                              </h5>
                              <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--violet)] flex items-center justify-center gap-0.5 mt-0.5">
                                 {task.btnText} <ChevronRight size={8} className="group-hover:translate-x-1 transition-transform" />
                              </span>
                           </Link>
                        </motion.div>
                     );
                  })()}
               </AnimatePresence>
            </div>
            {/* Slider Dots */}
            {importantTasks.length > 1 && (
               <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {importantTasks.map((_, idx) => (
                     <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentTaskIndex ? "w-4 bg-[var(--violet)]" : "w-1.5 bg-neutral-200"}`} />
                  ))}
               </div>
            )}
         </div>
      </div>

      {/* Desktop Stats Row: exactly 3 cards */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 gsap-reveal">
         {[
           { 
             label: "Profile Views", 
             value: profile.profile_views || 0, 
             format: true, 
             trend: (profile.profile_views || 0) > 0 ? "+ 18%" : "0%", 
             trendValue: (profile.profile_views || 0) > 0 ? "180" : "0",
             color: "var(--violet)", 
             chartData: (profile.profile_views || 0) > 0 ? [{v: 10},{v: 15},{v: 18},{v: 30},{v: 45}] : [{v: 0},{v: 0},{v: 0},{v: 0},{v: 0}] 
           },
           { 
             label: "Brand Interest", 
             value: brandInterest, 
             trend: brandInterest > 0 ? "+ 12%" : "0%", 
             trendValue: brandInterest > 0 ? "4" : "0",
             color: "#EC4899", 
             chartData: brandInterest > 0 ? [{v: 5},{v: 12},{v: 20},{v: 25},{v: 32}] : [{v: 0},{v: 0},{v: 0},{v: 0},{v: 0}] 
           },
           { 
             label: "Monthly Earnings", 
             value: monthlyEarnings, 
             prefix: "₹", 
             format: true, 
             trend: monthlyEarnings > 0 ? "+ 22%" : "0%", 
             trendValue: monthlyEarnings > 0 ? "₹4.2k" : "₹0",
             color: "var(--green)", 
             chartData: monthlyEarnings > 0 ? [{v: 20},{v: 28},{v: 25},{v: 35},{v: 48}] : [{v: 0},{v: 0},{v: 0},{v: 0},{v: 0}] 
           }
         ].map((s, i) => (
           <div key={i} className="bg-white border border-[var(--border-default)] rounded-[20px] pt-4.5 px-5 pb-0 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-between hover:border-[var(--border-strong)] transition-all">
             
             <div className="relative z-10 flex flex-col items-start">
               <span className={'text-[10px] font-bold uppercase tracking-wider'}>{s.label}</span>
               <div className={`font-mono font-bold tracking-tight text-lg my-1`}>
                 <AnimatedNumber value={s.value} format={s.format} prefix={s.prefix} />
               </div>
               
               {/* Pill Badge */}
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] text-emerald-600 text-[9px] font-semibold">
                 <TrendingUp size={10} className="opacity-75" />
                 <span>{s.trend}</span>
                 <span className="opacity-70 ml-0.5">({s.trendValue})</span>
               </div>
             </div>
             
             {/* Sparkline at the Bottom */}
             <div className="absolute bottom-0 left-0 right-0 h-11 pointer-events-none opacity-80 mt-auto translate-y-1 group-hover:translate-y-0 transition-transform">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={s.chartData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                       <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                     </linearGradient>
                   </defs>
                   <Area 
                     type="monotone" 
                     dataKey="v" 
                     stroke={s.color} 
                     strokeWidth={2} 
                     fillOpacity={1} 
                     fill={`url(#gradient-${i})`} 
                     isAnimationActive={false}
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>
         ))}
      </div>
      
      <TrustedBrandsWidget userType="creator" />

      {/* Main Content Area */}
      <div className="flex flex-col gap-8 gsap-reveal">
        
        {/* Left Column (Recommended Campaigns) */}
        <div className="w-full flex flex-col gap-6">
          <div className="flex justify-between items-center mb-2">
             <div className="flex flex-col">
               <h3 className={'text-lg font-bold tracking-tight'}>Recommended Campaigns</h3>
               <span className={'hidden md:block text-sm text-gray-500'}>by Brands & Agencies</span>
             </div>
             <Link to="/campaigns" className={`font-bold text-sm text-[var(--violet)] hover:underline flex items-center gap-1 bg-[var(--bg-elevated)] px-4 py-2 rounded-full transition-colors border border-[var(--border-default)]`}>View all <ArrowRight size={14} className="opacity-80"/></Link>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 pr-6 snap-x snap-mandatory hide-scrollbar">
             {campaigns.length === 0 ? (
                <div className={`py-12 text-center text-[11px] font-medium bg-[var(--bg-elevated)]/50 rounded-[1.5rem] border border-dashed border-[var(--border-default)] flex flex-col items-center justify-center p-6 gap-2 w-full`}>
                   <span className="text-2xl">⚡</span>
                   <p className={'font-bold text-sm'}>No Recommended Campaigns Yet</p>
                   <p className={'hidden md:block text-sm text-gray-500'}>
                      We don't have any active campaigns matching your profile right now. Check back soon for new brand collaborations!
                   </p>
                </div>
             ) : (campaigns).map((c, i) => (
                 <div key={i} onClick={() => handleCampaignTap(c.campaign_id || i, i)} className="snap-start shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-[400px] max-md:h-[180px] bg-[var(--bg-card)] rounded-2xl md:rounded-[1.5rem] border border-[var(--border-default)] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:border-[var(--violet)]/50 transition-colors relative overflow-hidden">
                    
                    <div className={`absolute top-0 right-0 bg-[var(--violet)]/10 text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] px-2 md:px-3 py-1 md:py-1.5 rounded-bl-xl border-b border-l border-[var(--violet)]/20 flex items-center gap-1 z-10`}>
                       <Zap size={12} className="fill-[var(--violet)] opacity-80" /> {c.match_score || (75 + ((i * 13) % 21))}% Match
                    </div>
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                       <div className="flex gap-2.5 md:gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0 border border-[var(--border-default)]">
                             <img src={c.brand_logo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop'} alt="Brand Profile" className="w-full h-full object-cover" />
                          </div>
                          <div>
                             <h4 className={`font-semibold md:font-bold text-[15px] md:text-sm line-clamp-2 leading-tight pr-16`}>{c.title}</h4>
                             <p className={`text-[12px] md:text-xs text-gray-500 md:mt-0.5 flex items-center gap-1`}>
                               by {c.brand_name || c.company || 'Brand'} <CheckCircle size={10} className="md:w-3 md:h-3 text-emerald-600 opacity-80" />
                             </p>
                             <p className={`hidden md:block text-[11px] font-medium mt-1`}>1d ago</p>
                          </div>
                       </div>
                    </div>
                    
                    {/* Mobile stat row */}
                    <div className="md:hidden flex items-center gap-2 text-[12px] font-medium text-gray-600 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                       <span className="font-semibold text-gray-900 font-mono">
                          {c.price_range || `₹10,000`}
                       </span>
                       <span className="text-gray-300">·</span>
                       <span className="truncate flex items-center gap-1">
                          <Megaphone size={12} className="text-gray-400" /> {c.brand_type || c.company || c.brand_name || 'Brand'}
                       </span>
                    </div>

                    <div className="hidden md:block mb-4 flex-1">
                       <p className={`text-[10px] font-bold uppercase tracking-wider mb-1`}>Looking for</p>
                       <p className={`text-sm text-gray-500 line-clamp-2 leading-relaxed`}>
                          {c.description || c.targetAudience || (c.categories && c.categories.join(", ")) || "Content creators with strong engagement and professional delivery."}
                       </p>
                    </div>
                   
                   <div className="hidden md:flex flex-wrap items-center gap-6 text-xs mb-5">
                      <div className="flex items-center gap-3">
                         <span className="flex items-center justify-center w-[42px] h-[42px] text-[var(--text-primary)] bg-[var(--bg-card)] border-[2.5px] border-[var(--text-primary)] shadow-sm rounded-t-[20px] rounded-bl-[20px] rounded-br-sm"><IndianRupee size={18} strokeWidth={2.5}/></span>
                         <div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5`}>Per Influencer</div>
                            <div className={'font-mono tracking-tight text-sm'}>{c.price_range || `₹10,000`}</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="flex items-center justify-center w-[42px] h-[42px] text-[var(--text-primary)] bg-[var(--bg-card)] border-[2.5px] border-[var(--text-primary)] shadow-sm rounded-t-[20px] rounded-bl-sm rounded-br-[20px]"><Megaphone size={18} strokeWidth={2.5}/></span>
                         <div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5`}>Brand collab with</div>
                            <div className={`font-bold text-sm line-clamp-1`}>{c.company || c.brand_name || 'Brand'}</div>
                         </div>
                      </div>
                   </div>

                   <div className={`border-t border-[var(--border-default)] pt-2 md:pt-3 flex items-center gap-2 text-[11px] font-medium`}>
                      {(() => {
                         const stats = getCampaignStats(c);
                         const count = stats.applied;
                         let displayAvatars = [];
                         if (c.applicants && c.applicants.length > 0) {
                            displayAvatars = c.applicants.slice(0, Math.min(count, 4)).map(a => a.creator_photo || a.photo);
                         } else {
                            displayAvatars = getCampaignAvatars(c, count, 4);
                         }
                         return (
                           <>
                             <span className="flex items-center gap-1.5"><Eye size={14} className="animate-eye-blink"/> {stats.views} Views</span>
                             <span className="w-1 h-1 bg-[var(--border-default)] rounded-full"></span>
                             <div className="flex items-center gap-1.5 text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-1 rounded-md">
                                <div className="hidden md:flex -space-x-1.5 mr-0.5">
                                   {displayAvatars.map((avatarUrl, idx) => (
                                        <img key={idx} className="w-4 h-4 rounded-full border border-[var(--bg-card)] shadow-sm object-cover" src={avatarUrl} alt="avatar" />
                                   ))}
                                </div>
                                <span>{count}+ creators applied</span>
                             </div>
                           </>
                         );
                      })()}
                      <span className="md:hidden ml-auto text-[var(--violet)] font-bold text-[10px] uppercase">View Details</span>
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-8 flex justify-between items-center mb-2">
             <h3 className={'text-base font-bold'}>Your Active Deals</h3>
             <Link to="/creator/ugc/orders" className={`font-bold text-sm text-sm hover:underline`}>View All</Link>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: "All", label: "All" },
              { id: "In Progress", label: "In Progress" },
              { id: "Pending Review", label: "Pending Review" },
              { id: "Completed", label: "Completed" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDealsTab(tab.id)}
                className={`text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all ${
                  activeDealsTab === tab.id
                    ? "bg-[var(--violet)] text-white shadow-sm"
                    : "bg-white text-[var(--text-tertiary)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Deals Cards Grid */}
          {(() => {
            const mappedDeals = realDeals.map(d => {
              let friendlyStatus = "In Progress";
              if (d.status?.toLowerCase() === "pending_review" || d.stage?.toLowerCase() === "pending review") {
                friendlyStatus = "Pending Review";
              } else if (d.status?.toLowerCase() === "completed" || d.status?.toLowerCase() === "delivered" || d.status?.toLowerCase() === "signed") {
                friendlyStatus = "Completed";
              }
              return {
                id: d.id,
                brand: d.brand_name || "Brand Partner",
                campaign: d.deliverables || "Campaign Sponsorship",
                status: friendlyStatus,
                amount: d.agreed_rate ? `₹${Number(d.agreed_rate).toLocaleString("en-IN")}` : "₹0",
                logo: d.brand_logo || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop"
              };
            });

            const filteredDeals = mappedDeals.filter(deal => {
              if (activeDealsTab === "All") return true;
              return deal.status === activeDealsTab;
            });

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {filteredDeals.length > 0 ? (
                  filteredDeals.map((deal) => (
                    <div key={deal.id} className="p-3.5 bg-white border border-[var(--border-default)] rounded-xl flex items-center justify-between hover:border-[var(--border-strong)] transition-all shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-[var(--border-default)] shrink-0">
                          <img src={deal.logo} alt={deal.brand} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className={`font-bold text-sm text-xs truncate`}>{deal.brand}</h4>
                          <p className={`text-[11px] font-medium mt-0.5 truncate`}>{deal.campaign}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <p className={`font-mono tracking-tight text-sm text-xs`}>{deal.amount}</p>
                        <Badge variant={deal.status}>{deal.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-8 text-center text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] rounded-xl border border-dashed border-[var(--border-default)]">
                    No active deals in this category.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Dashboard Footer Logout Block REMOVED */}
        </div>


      


      {/* Admin Custom Message Popup */}
      <AnimatePresence>
        {adminPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismissPopup}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl z-10 font-sans overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#A855F7] to-[#C084FC]" />
              
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-[var(--text-primary)] shrink-0">
                  <Bell size={24} className="animate-bounce" />
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1`}>Official Notification</span>
                  <h4 className={'text-xl font-bold tracking-tight'}>Message from YBEX Admin</h4>
                </div>
                <button 
                  onClick={handleDismissPopup}
                  className="ml-auto p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 mb-6">
                <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap`}>
                  {adminPopup.message}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={handleDismissPopup}
                  className={`w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition-colors shadow-md`}
                >
                  Got it, thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portfolio Add Modal */}
      <AnimatePresence>
        {showPortfolioModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-[var(--border-default)] max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>

              <h3 className={`text-base font-bold mb-1 flex items-center gap-1.5`}>
                 Add a sample of past work
              </h3>
              <p className={`text-[11px] font-medium mb-4`}>
                Provide a link to any previous work or brand promotion you have successfully delivered.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const url = e.currentTarget.elements.contentUrl.value.trim();
                const brand = e.currentTarget.elements.brandName.value.trim();
                const desc = e.currentTarget.elements.description.value.trim();

                if (!url) {
                  toast.error("Please provide a valid content URL.");
                  return;
                }

                setLoading(true);
                try {
                  let platform = "other";
                  if (url.toLowerCase().includes("instagram.com") || url.toLowerCase().includes("instagram.in")) {
                    platform = "instagram";
                  } else if (url.toLowerCase().includes("youtube.com") || url.toLowerCase().includes("youtu.be")) {
                    platform = "youtube";
                  }

                  const { error } = await supabase.from("creator_portfolio_items").insert({
                    creator_id: user.user_id,
                    content_url: url,
                    brand_name: brand || null,
                    description: desc || null,
                    platform,
                    views: 0,
                    engagement_rate: 0
                  });

                  if (error) {
                    toast.error("Error saving past work: " + error.message);
                  } else {
                    toast.success("Past work sample saved! 🚀");
                    setPortfolioCount(1); // Hide nudge
                    setShowPortfolioModal(false);
                  }
                } catch (err) {
                  toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "An unexpected error occurred.");
                } finally {
                  setLoading(false);
                }
              }} className="space-y-4">
                <div className="font-sans">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1`}>
                    Content URL (Required)
                  </label>
                  <input
                    name="contentUrl"
                    type="url"
                    required
                    className={`w-full bg-[var(--bg-elevated)] border border-[#DDD6FE] rounded-xl p-3 text-sm focus:border-[var(--violet)] outline-none`}
                    placeholder="https://instagram.com/reel/... or YouTube link"
                  />
                </div>

                <div className="font-sans">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1`}>
                    Brand Name (Optional)
                  </label>
                  <input
                    name="brandName"
                    type="text"
                    className={`w-full bg-[var(--bg-elevated)] border border-[#DDD6FE] rounded-xl p-3 text-sm focus:border-[var(--violet)] outline-none`}
                    placeholder="e.g. Nike, boAt"
                  />
                </div>

                <div className="font-sans">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1`}>
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    maxLength={200}
                    className={`w-full bg-[var(--bg-elevated)] border border-[#DDD6FE] rounded-xl p-3 text-sm focus:border-[var(--violet)] outline-none`}
                    placeholder="Brief description of work done (max 200 chars)"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end font-sans">
                  <button
                    type="button"
                    onClick={() => setShowPortfolioModal(false)}
                    className={`px-4 py-2 text-[11px] font-medium hover:bg-[#F2F2F7] rounded-lg transition-colors cursor-pointer`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer`}
                  >
                    Save Work
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}