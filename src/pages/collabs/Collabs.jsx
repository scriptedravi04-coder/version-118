import React, { useEffect, useState, useMemo } from "react";
import { safeArray } from "../../utils/safeFormat";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import DealSummaryStats from "../../components/deals/DealSummaryStats";
import DealDetailDrawer from "../../components/deals/DealDetailDrawer";
import TrustBadgeRotator from "../../components/TrustBadgeRotator";
import AgencyBadge from "../../components/common/AgencyBadge";
import { 
  X, CheckCircle, Ban, Briefcase, FileText, MessageSquare, 
  ArrowRight, History, Clock, AlertCircle, ShieldCheck
} from "lucide-react";

export default function Collabs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  
  // 3 Main Top Workspace Tabs: "applications" | "active_deals" | "history"
  const [tab, setTab] = useState(queryTab === "ugc_orders" ? "applications" : (queryTab || "applications"));
  
  // Sub-filter for Active Campaign Deals
  const [dealFilter, setDealFilter] = useState("ALL"); // "ALL" | "ACTION" | "PROGRESS" | "REVIEW" | "COMPLETED"

  const [data, setData] = useState({ 
    sent: [], 
    received: [], 
    waves_sent: [], 
    waves_received: [], 
    campaign_applications: [] 
  });
  
  const [transitioningId, setTransitioningId] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    if (queryTab === "ugc_orders") {
      setSearchParams({ tab: "applications" });
      setTab("applications");
    } else if (queryTab) {
      setTab(queryTab);
    }
  }, [queryTab, setSearchParams]);

  const handleTabSelect = (selectedTab) => {
    setTab(selectedTab);
    setSearchParams({ tab: selectedTab });
  };

  const load = () => {
    api.get("collabs")
      .then(({data}) => setData(data))
      .catch((e) => {
        console.error("Error loading collabs data:", e);
      });
  };
  
  useEffect(() => {
    load();
  }, [user]);

  // Accept or decline regular handshakes/collabs
  const act = async (cid, action, brandName = "Brand Partner") => {
    if (action === "accept") {
      setTransitioningId(cid);
      try { 
        await api.post(`/collabs/${cid}/action?action=accept`); 
        
        toast.custom((t) => (
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 max-w-md">
            <div>
              <p className="text-xs font-bold text-gray-900 leading-snug">🎉 {brandName} accepted!</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Moved to Campaign Deals pipeline</p>
            </div>
            <button 
              onClick={() => {
                toast.dismiss(t);
                handleTabSelect("active_deals");
              }}
              className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer"
            >
              View Deals &rarr;
            </button>
          </div>
        ), { duration: 6000 });

        setTimeout(() => {
          setTransitioningId(null);
          load();
        }, 1200);
      } catch (e) { 
        setTransitioningId(null);
        toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Action failed"); 
      }
    } else {
      try { 
        await api.post(`/collabs/${cid}/action?action=${action}`); 
        toast.success(`Collaboration proposal ${action}ed successfully.`); 
        load(); 
      } catch (e) { 
        toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Action failed"); 
      }
    }
  };

  // Accept or decline campaign applications
  const actOnApplication = async (campaignId, applicationId, action) => {
    if (action === "accept") {
      setTransitioningId(applicationId);
      try {
        await api.post(`/campaigns/${campaignId}/applications/${applicationId}/action`, { action });
        
        toast.custom((t) => (
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 max-w-md">
            <div>
              <p className="text-xs font-bold text-gray-900 leading-snug">🎉 Pitch Accepted!</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Moved to Campaign Deals pipeline</p>
            </div>
            <button 
              onClick={() => {
                toast.dismiss(t);
                handleTabSelect("active_deals");
              }}
              className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer"
            >
              View Deals &rarr;
            </button>
          </div>
        ), { duration: 6000 });

        setTimeout(() => {
          setTransitioningId(null);
          load();
        }, 1200);
      } catch (e) {
        setTransitioningId(null);
        toast.error(e.response?.data?.detail || "Could not process campaign application action.");
      }
    } else {
      try {
        await api.post(`/campaigns/${campaignId}/applications/${applicationId}/action`, { action });
        toast.success(`Application has been declined!`);
        load();
      } catch (e) {
        toast.error(e.response?.data?.detail || "Could not process campaign application action.");
      }
    }
  };

  // Sign Agreement Action handler for DealDetailDrawer
  const handleSignAgreement = async (dealId, signatureText) => {
    try {
      const threadId = selectedDeal?.thread_id || selectedDeal?.raw?.thread_id;
      if (threadId) {
        await api.post(`/campaign/threads/${threadId}/sign`, { signatureText });
      } else {
        await api.post(`/collabs/${dealId}/action?action=sign`, { signatureText });
      }
      toast.success("Agreement signed successfully!");
      if (selectedDeal) {
        setSelectedDeal(prev => prev ? { ...prev, stage: "IN_PROGRESS", status: "ACTIVE" } : null);
      }
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Error signing agreement");
    }
  };

  // Submit Deliverable Action handler for DealDetailDrawer
  const handleSubmitDeliverable = async (dealId, file, videoUrl, notes) => {
    try {
      const threadId = selectedDeal?.thread_id || selectedDeal?.raw?.thread_id;
      if (threadId) {
        await api.post(`/campaign/threads/${threadId}/submit-content`, { content_url: videoUrl, notes });
      } else {
        await api.post(`/collabs/${dealId}/deliverable`, { videoUrl, notes });
      }
      toast.success("Deliverable submitted for brand review!");
      if (selectedDeal) {
        setSelectedDeal(prev => prev ? { ...prev, stage: "IN_REVIEW", status: "CONTENT_SUBMITTED" } : null);
      }
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.response?.data?.error || "Error submitting deliverable");
    }
  };

  // Helper to map status to deal stage
  const getStageFromStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (['COMPLETED', 'PAID', 'DELIVERED', 'CLOSED', 'SUCCESS'].includes(s)) return 'COMPLETED';
    if (['REVISION_REQUESTED'].includes(s)) return 'REVISION_REQUESTED';
    if (['CONTENT_SUBMITTED', 'PENDING_REVIEW', 'CONTENT_APPROVED', 'PROOF_SUBMITTED', 'PAYMENT_PENDING', 'SUBMITTED', 'DELIVERED', 'IN_REVIEW'].includes(s)) return 'IN_REVIEW';
    if (['ACCEPTED', 'IN_PROGRESS', 'NEGOTIATING', 'ACTIVE'].includes(s)) return 'IN_PROGRESS';
    return 'APPLICATION';
  };

  // Process and categorize all live campaign items
  const categorized = useMemo(() => {
    const applications = [];
    const activeDeals = [];
    const history = [];

    const isFinished = (status) => {
      const s = String(status || '').toUpperCase();
      return ['COMPLETED', 'DECLINED', 'REJECTED', 'CANCELLED', 'PAID', 'DELIVERED', 'CLOSED', 'SUCCESS'].includes(s);
    };

    // Track application_ids that converted to deals
    const dealAppIds = new Set();
    [...(data.received || []), ...(data.sent || [])].forEach(item => {
      if (item.application_id) dealAppIds.add(item.application_id);
      if (item.raw?.application_id) dealAppIds.add(item.raw.application_id);
    });

    // 1. Regular campaign collabs received & sent
    [...(data.received || []), ...(data.sent || [])].forEach(item => {
      const isReceived = data.received.includes(item);
      const stage = getStageFromStatus(item.status);
      const formatted = {
        _type: 'collab',
        _direction: isReceived ? 'received' : 'sent',
        id: item.collab_id || item.id,
        brandName: item.brand_name || item.raw?.brand_profiles?.company_name || "Brand Partner",
        brandLogo: item.brand_logo || item.raw?.brand_profiles?.logo || null,
        title: item.title || item.deliverable || "Campaign Collaboration",
        subtitle: isReceived ? `From: ${item.from_name || item.brand_name || 'Brand'}` : `To: ${item.to_user_name || 'Brand Partner'}`,
        payout: Number(item.agreed_amount || item.proposed_amount || item.payout || 0),
        status: item.status || 'NEGOTIATING',
        stage: stage,
        date: item.created_at,
        thread_id: item.thread_id || item.raw?.thread_id,
        is_agency: Boolean(item.is_agency || item.raw?.is_agency || item.raw?.brand_profiles?.is_agency),
        raw: item
      };

      if (isFinished(formatted.status)) {
        history.push(formatted);
      } else {
        activeDeals.push(formatted);
      }
    });

    // 2. Campaign applications
    (data.campaign_applications || []).forEach(item => {
      const isIncoming = user?.role === 'brand';
      const stage = getStageFromStatus(item.status);
      const isAcceptedOrHasDeal = item.status === 'ACCEPTED' || item.status === 'accepted' || dealAppIds.has(item.application_id);

      if (isAcceptedOrHasDeal) {
        return;
      }

      const formatted = {
        _type: 'campaign_app',
        _direction: isIncoming ? 'received' : 'sent',
        id: item.application_id,
        brandName: item.brand_name || "Brand Partner",
        title: item.campaign_title || item.title || "Campaign Pitch",
        subtitle: isIncoming ? `Pitch: "${item.pitch}"` : `Applied to: ${item.brand_name || 'Brand'}`,
        creatorName: item.creator_name,
        pitch: item.pitch,
        payout: Number(item.proposed_amount || 0),
        status: item.status || 'pending',
        stage: stage,
        date: item.applied_at || item.created_at,
        is_agency: Boolean(item.is_agency || item.raw?.is_agency || item.raw?.brand_profiles?.is_agency),
        raw: item
      };

      if (isFinished(formatted.status)) {
        history.push(formatted);
      } else {
        applications.push(formatted);
      }
    });

    // 3. Campaign Waves / Invites
    [...(data.waves_received || []), ...(data.waves_sent || [])].forEach(item => {
      const stage = getStageFromStatus(item.status);
      const formatted = {
        _type: 'wave',
        _direction: data.waves_received.includes(item) ? 'received' : 'sent',
        id: item.wave_id || item.id,
        brandName: item.brand_name || "Brand Partner",
        title: `Campaign Invite: ${item.brief_title || "Sponsorship Offer"}`,
        subtitle: `Pitch: "${item.pitch || 'Campaign Pitch'}"`,
        payout: Number(item.proposed_amount || item.payout || 0),
        status: item.status || 'pending',
        stage: stage,
        date: item.created_at,
        raw: item
      };

      if (isFinished(formatted.status)) {
        history.push(formatted);
      } else {
        applications.push(formatted);
      }
    });

    const dedupeAndSort = (arr) => {
      const seen = new Set();
      const result = [];
      for (const item of arr) {
        if (item?.id && !seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
      return result.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    };

    return {
      applications: dedupeAndSort(applications),
      activeDeals: dedupeAndSort(activeDeals),
      history: dedupeAndSort(history)
    };
  }, [data, user]);

  // Unified list for DealSummaryStats top cards
  const unifiedDealsForStats = useMemo(() => {
    return [
      ...categorized.activeDeals,
      ...categorized.history.filter(h => h.status === 'COMPLETED' || h.status === 'PAID')
    ];
  }, [categorized]);

  return (
    <div className="w-full max-w-none relative animate-in fade-in duration-300" data-testid="collabs-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-[var(--text-primary)] font-black">Ongoing Deals & Workspace</h1>
          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <p className="text-[var(--text-tertiary)] text-xs sm:text-sm font-medium">Manage pitches, live campaign SLAs, active contracts, and completed deliverables.</p>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-600">•</span>
            <TrustBadgeRotator page="applications" />
          </div>
        </div>
      </div>

      {/* Universal 4 Stat Cards */}
      <div className="mb-6">
        <DealSummaryStats deals={unifiedDealsForStats} />
      </div>

      {/* 3 Workspace Main Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] overflow-x-auto scroll-thin py-2 mb-8">
        {[
          { 
            id: "applications", 
            label: "Applications", 
            badgeIcon: "📌", 
            icon: <FileText size={16} />,
            count: categorized.applications.length 
          },
          { 
            id: "active_deals", 
            label: "Ongoing", 
            badgeIcon: "🤝", 
            icon: <Briefcase size={16} />,
            count: categorized.activeDeals.length 
          },
          { 
            id: "history", 
            label: "Completed & History", 
            badgeIcon: "✅", 
            icon: <History size={16} />,
            count: categorized.history.length 
          }
        ].map(t => {
          const isActive = tab === t.id;
          return (
            <button 
              key={t.id} 
              onClick={() => handleTabSelect(t.id)} 
              className={`relative px-5 py-3 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all duration-200 flex items-center gap-2 rounded-2xl cursor-pointer z-10 shrink-0 ${
                isActive 
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-md border border-[var(--border-default)]" 
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{t.badgeIcon}</span>
                <span>{t.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
                  isActive ? "bg-[var(--violet)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                }`}>
                  {t.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Ongoing Deals View */}
      {tab === "active_deals" && (
        <div className="space-y-6">
          {categorized.activeDeals.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center shadow-xs">
              <div className="w-16 h-16 bg-[var(--violet)]/10 text-[var(--violet)] rounded-full flex items-center justify-center mb-4">
                <Briefcase size={26} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-1.5">No active campaign deals</h3>
              <p className="text-gray-400 text-xs max-w-md leading-relaxed mb-6">
                Once brand partners accept your pitch for live campaigns, active campaign deals will appear here automatically.
              </p>
              <Link 
                to="/campaigns" 
                className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95"
              >
                <span>Browse Live Campaigns</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
              { safeArray(categorized.activeDeals).map((deal, idx) => {
                const brandUserId = deal.raw?.brand_id || deal.raw?.brand_user_id || 'brand';
                
                // Determine exact status and step
                const rawStatus = (deal.status || deal.stage || '').toUpperCase();
                const isRevisionRequested = rawStatus === 'REVISION_REQUESTED' || deal.raw?.revision_notes || deal.raw?.content_submissions?.some(s => s.status === 'CHANGES_REQUESTED');
                const isSignedBoth = deal.raw?.agreement_signed_creator && deal.raw?.agreement_signed_brand;
                const isSignedMe = deal.raw?.agreement_signed_creator;

                let currentStep = 1; // Default: In Production
                if (rawStatus === 'COMPLETED' || rawStatus === 'PAID') {
                  currentStep = 4;
                } else if (rawStatus === 'CONTENT_APPROVED' || rawStatus === 'PAYMENT_PENDING' || rawStatus === 'PROOF_SUBMITTED' || rawStatus === 'APPROVED' || rawStatus === 'PAYMENT_CLEARED') {
                  currentStep = 3;
                } else if (rawStatus === 'CONTENT_SUBMITTED' || rawStatus === 'IN_REVIEW' || rawStatus === 'SUBMITTED') {
                  currentStep = 2;
                } else {
                  // NEGOTIATING, ACTIVE, IN_PROGRESS, REVISION_REQUESTED
                  currentStep = 1;
                }

                const isProd = currentStep === 1;
                const isReview = currentStep === 2;
                const isPaid = currentStep === 3;
                const isCompleted = currentStep === 4;

                let badgeText = 'In Production';
                if (currentStep === 4 || rawStatus === 'COMPLETED' || rawStatus === 'PAID') {
                  badgeText = 'Completed';
                } else if (currentStep === 3) {
                  badgeText = 'Payment Cleared';
                } else if (rawStatus === 'NEGOTIATING') {
                  badgeText = 'Negotiating';
                } else if (!isSignedBoth && deal.payout > 0) {
                  badgeText = 'Agreement Pending';
                } else if (isRevisionRequested) {
                  badgeText = 'Revision Requested';
                } else if (currentStep === 2) {
                  badgeText = 'Waiting for Approval';
                }

                const stepTitles = {
                  1: isRevisionRequested ? 'Revision Requested' : (rawStatus === 'NEGOTIATING' ? 'Negotiating' : 'In Production'),
                  2: 'Waiting for Approval',
                  3: 'Payment Cleared',
                  4: 'Completed & Paid'
                };

                const stepDescs = {
                  1: isRevisionRequested 
                    ? `Brand requested changes: "${deal.raw?.revision_notes || deal.raw?.content_submissions?.find(s => s.status === 'CHANGES_REQUESTED')?.brand_feedback || 'Please update content'}"`
                    : (rawStatus === 'NEGOTIATING' ? 'Exchanging price offers' : 'Filming & editing in progress'),
                  2: 'Content submitted, pending brand review',
                  3: 'Deliverable approved, payment processing',
                  4: 'Funds released to wallet'
                };

                return (
                  <div 
                    key={`${deal._type || 'deal'}-${deal.id || 'id'}-${idx}`} 
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 relative overflow-hidden"
                  >
                    {/* 1. Campaign Name Prominently at Top & Status Badge (No Order ID) */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-extrabold text-gray-900 tracking-tight leading-snug">
                          {deal.title}
                        </h3>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 ${
                          isCompleted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          isRevisionRequested ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          isReview ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-purple-50 text-[var(--violet)] border border-purple-100'
                        }`}>
                          {badgeText}
                        </span>
                      </div>

                      {/* 2. Applied to which brand */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-[var(--violet)] font-black flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                          {deal.brandLogo ? (
                            <img src={deal.brandLogo} alt={deal.brandName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            deal.brandName?.charAt(0).toUpperCase() || "B"
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-gray-400 font-semibold">Applied to:</span>
                          <span className="text-xs font-extrabold text-gray-900">{deal.brandName}</span>
                          <CheckCircle size={13} className="text-emerald-500 fill-emerald-50 shrink-0" />
                          {deal.is_agency && <AgencyBadge size="xs" className="shrink-0" />}
                        </div>
                      </div>

                      {/* 3. Short info / description about campaign */}
                      {deal.subtitle && (
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                          {deal.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Stage Details & Stepper */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-gray-900">
                            {stepTitles[currentStep]}
                          </h4>
                          <p className="text-xs text-gray-400 font-medium">
                            {stepDescs[currentStep]}
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-[var(--violet)] border border-purple-100/80">
                          Step {currentStep} of 4
                        </span>
                      </div>

                      {/* Progress Stepper Bar */}
                      <div className="pt-1 space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((stepNum) => {
                            const isPast = stepNum < currentStep;
                            const isCurrent = stepNum === currentStep;

                            return (
                              <div 
                                key={stepNum} 
                                className={`h-2.5 rounded-full transition-all duration-300 relative overflow-hidden ${
                                  isPast || isCurrent ? 'bg-emerald-500' : 'bg-gray-100'
                                }`}
                              >
                                {isCurrent && (
                                  <div className="absolute inset-0 bg-white/25 animate-pulse" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-4 text-[10px] font-bold text-gray-400 text-center gap-1">
                          {[
                            { num: 1, label: 'In Production' },
                            { num: 2, label: 'Waiting for Approval' },
                            { num: 3, label: 'Payment Cleared' },
                            { num: 4, label: 'Completed' },
                          ].map((s) => {
                            const isCurrent = s.num === currentStep;
                            const isPast = s.num < currentStep;

                            return (
                              <span 
                                key={s.num} 
                                className={`transition-colors ${
                                  isCurrent ? 'text-gray-900 font-black' :
                                  isPast ? 'text-emerald-600 font-bold' : 'text-gray-400 font-medium'
                                }`}
                              >
                                {s.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer Payout & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block">PAYOUT</span>
                        {(isProd || isReview || isCompleted || deal.raw?.is_signed || deal.raw?.signature_text || deal.status === 'ACCEPTED' || deal.status === 'IN_PROGRESS') && deal.payout > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black font-mono text-[#027A48]">₹{deal.payout?.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-purple-50 text-[var(--violet)] rounded-md border border-purple-100 uppercase tracking-wider">
                              SECURED IN ESCROW
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                              Pending Deal Signature
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const targetChatId = deal.raw?.thread_id || deal.thread_id || deal.raw?.collab_id || deal.id || brandUserId;
                            navigate(`/chat/${targetChatId}`);
                          }}
                          className="px-3.5 py-2.5 bg-purple-50/80 hover:bg-purple-100/80 text-[var(--violet)] font-extrabold text-xs uppercase tracking-wider rounded-xl border border-purple-100 transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                          title="Open Campaign Chat"
                        >
                          <MessageSquare size={14} className="stroke-[2.5]" />
                          <span>VIEW CHAT</span>
                        </button>

                        <button 
                          onClick={() => setSelectedDeal(deal)}
                          className="px-4 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>MANAGE</span>
                          <span>&gt;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2 & 3: Applications / History List Views */}
      {tab !== "active_deals" && (
        <div className="space-y-4">
          {((tab === "applications" ? categorized.applications : categorized.history)).length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center shadow-xs">
              <div className="w-16 h-16 bg-[var(--violet)]/10 text-[var(--violet)] rounded-full flex items-center justify-center mb-4">
                
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight mb-1.5">
                {tab === "applications" ? "No pending applications or pitches" : "No completed deals in history"}
              </h3>
              <p className="text-[var(--text-tertiary)] text-xs max-w-md leading-relaxed mb-6">
                {tab === "applications" 
                  ? "Apply to Live Campaigns to submit pitches to brand partners!"
                  : "Completed and paid deliverables will be archived here automatically."
                }
              </p>
              <Link 
                to="/campaigns" 
                className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95"
              >
                <span>Browse Live Campaigns</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <AnimatePresence>
              {(tab === "applications" ? categorized.applications : categorized.history).map((it, idx) => {
                const isTransitioning = it.id === transitioningId;
                const isCompleted = it.status === "accepted" || it.status === "COMPLETED" || isTransitioning;
                const isDeclined = it.status === "declined" || it.status === "rejected" || it.status === "DECLINED";
                const isPending = it.status === "pending" || it.status === "applied" || it.status === "sent";

                return (
                  <motion.div 
                    layout
                    key={`${it._type || 'item'}-${it.id || 'id'}-${idx}`} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[var(--violet)]/40 transition-all shadow-xs relative overflow-hidden ${
                      isTransitioning ? "border-emerald-500 bg-emerald-50/10" : ""
                    }`}
                  >
                    {/* Visual bar on left */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      isCompleted || isTransitioning ? "bg-emerald-500" :
                      isDeclined ? "bg-rose-500" :
                      it._direction === 'received' && isPending ? "bg-[var(--violet)]" : "bg-gray-300"
                    }`} />

                    <div className="space-y-2 pl-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                          it._type === 'campaign_app' ? 'bg-indigo-500/10 text-indigo-500' :
                          it._type === 'wave' ? 'bg-pink-500/10 text-pink-500' :
                          'bg-sky-500/10 text-sky-500'
                        }`}>
                          {it._type === 'campaign_app' ? 'Campaign Pitch' :
                           it._type === 'wave' ? 'Campaign Invite' : 'Direct Handshake'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider ${
                          it._direction === 'received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {it._direction}
                        </span>
                      </div>

                      <h3 className="font-display text-lg text-[var(--text-primary)] font-bold tracking-tight">
                        {it.title}
                      </h3>

                      <div className="text-sm text-[var(--text-secondary)] font-medium">
                        {it.subtitle}
                      </div>

                      {it.pitch && (
                        <p className="text-xs text-[var(--text-tertiary)] max-w-2xl bg-[var(--bg-elevated)] px-4 py-2.5 rounded-xl border border-[var(--border-default)] leading-relaxed italic">
                          &ldquo;{it.pitch}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)] mt-2">
                        {it.payout > 0 && (
                          <div className="font-semibold text-emerald-600 flex items-center gap-1 font-mono">
                            Payout: ₹{it.payout?.toLocaleString("en-IN")}
                          </div>
                        )}
                        <div className="font-mono">{new Date(it.date).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 pl-3 md:pl-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-3 py-1 rounded-xl font-mono font-bold uppercase tracking-wider border ${
                          isCompleted || isTransitioning ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                          isDeclined ? "bg-rose-50 text-rose-500 border-rose-200" :
                          "bg-purple-50 text-[var(--violet)] border-purple-200"
                        }`}>
                          {isTransitioning ? "Accepting..." : it.status}
                        </span>

                        {/* Direct actions for received proposals */}
                        {it._type === 'collab' && it._direction === 'received' && it.status === 'pending' && !isTransitioning && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => act(it.id, "accept", it.brandName)} 
                              className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => act(it.id, "decline")} 
                              className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {it._type === 'campaign_app' && it._direction === 'received' && it.status === 'pending' && user?.role === 'brand' && !isTransitioning && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => actOnApplication(it.raw.campaign_id, it.id, "accept")} 
                              className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle size={13} /> Accept
                            </button>
                            <button 
                              onClick={() => actOnApplication(it.raw.campaign_id, it.id, "decline")} 
                              className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Ban size={13} /> Decline
                            </button>
                          </div>
                        )}

                        {(it.status === 'ACCEPTED' || it.status === 'accepted') && (
                          <button 
                            onClick={() => navigate(`/chat/${it.raw?.brand_id || it.raw?.brand_user_id || 'brand'}`)}
                            className="px-3.5 py-1.5 bg-[var(--violet)]/10 hover:bg-[var(--violet)]/20 text-[var(--violet)] text-xs font-bold border border-[var(--violet)]/20 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare size={13} /> Chat / Negotiate
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Deal Detail Drawer Modal for Managing Active Deals */}
      {selectedDeal && (
        <DealDetailDrawer 
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onSign={handleSignAgreement}
          onSubmitDeliverable={handleSubmitDeliverable}
        />
      )}
    </div>
  );
}
