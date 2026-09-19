import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import CampaignCard from "../../components/campaigns/CampaignCard";
import { ListFilter, Megaphone, Plus, PlusCircle, AlertCircle, Clock } from "lucide-react";
import { t } from "@/lib/typography";
import KycPromptModal from "../../components/common/KycPromptModal";

export default function BrandCampaigns() {
  const navigate = useNavigate();
  const { user, isKycApproved } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [kyc, setKyc] = useState(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [showKycPrompt, setShowKycPrompt] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const handleCreateClick = () => {
    if (!isKycApproved) {
      setShowKycPrompt(true);
      return;
    }
    navigate("/brand/campaigns/create");
  };

  const handleResumeDraft = () => {
    setFabOpen(false);
    navigate("/brand/campaigns/create");
  };

  const handleStartNewCampaign = () => {
    setFabOpen(false);
    handleCreateClick();
  };

  useEffect(() => {
    try {
      const draft = localStorage.getItem('campaign_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && (parsed.title || parsed.description || parsed.brandName)) {
          setHasLocalDraft(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user && user.role === "creator") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: camps } = await api.get("campaigns?mine=true").catch(() => ({ data: [] }));
      setCampaigns(Array.isArray(camps) ? camps : []);

      const { data: kycData } = await api.get("verifications/me").catch(() => ({ data: null }));
      setKyc(kycData);
    } catch (e) {
      console.error("Failed to load campaigns list", e);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (c) => {
    navigate(`/brand/campaigns/create?edit=${c.campaign_id || c.id}`);
  };

  const handleSubmitDraft = async (c) => {
    const isKycApproved = kyc?.status === "approved" || kyc?.status === "APPROVED";
    if (!isKycApproved) {
      toast.error("Action denied: Brand requires approved compliance validation to enable launching campaigns.");
      navigate("/brand/kyc");
      return;
    }

    try {
      const campaignId = c.campaign_id || c.id;
      const res = await api.post(`/campaigns/${campaignId}/submit-draft`);
      
      if (res?.data && (res.data.success || res.data.status === "live" || res.data.campaign?.status === "live")) {
        toast.success("Brief draft successfully launched! Now viewing applicants pool.");
        loadData();
      } else {
        const errorMsg = res?.data?.error || res?.data?.detail || "Failed to launch campaign. Unexpected response from server.";
        console.error("Failed to submit campaign draft:", res?.data || res);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Error launching campaign brief draft:", err);
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Failed to launch campaign. Please try again.";
      toast.error(errorMsg);
    }
  };

  const handleManage = (c) => {
    navigate(`/brand/campaigns/${c.campaign_id || c.id}/applicants`, { state: { campaign: c } });
  };

  const isUnderReview = (status) => {
    const s = (status || "").toLowerCase().trim();
    return s === "under_review" || s === "under review" || s === "pending_review" || s === "in_review" || s === "review";
  };

  const filtered = campaigns?.filter(c => {
    if (activeTab === "all") return true;
    if (activeTab === "review") return isUnderReview(c.status);
    if (activeTab === "live") return (c.status || "").toLowerCase() === "live" || (c.status || "").toLowerCase() === "approved";
    if (activeTab === "draft") return (c.status || "").toLowerCase() === "draft" || !c.status;
    if (activeTab === "completed") return (c.status || "").toLowerCase() === "completed";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
            <div className="h-10 bg-slate-200/60 rounded-lg animate-pulse w-1/4"></div>
            <div className="h-4 bg-slate-200/60 rounded animate-pulse w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse"></div>
              <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse"></div>
              <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse"></div>
            </div>
            <div className="h-64 bg-slate-200/60 rounded-xl animate-pulse mt-4"></div>
          </div>
          <div className="text-[var(--text-tertiary)] text-sm font-mono tracking-widest uppercase">Loading Campaigns Panel...</div>
        </div>
      </div>
    );
  }

  const reviewCount = campaigns?.filter(c => isUnderReview(c.status)).length || 0;

  const tabs = [
    { id: "all", label: "All Briefs", count: campaigns.length },
    ...(reviewCount > 0 ? [{ id: "review", label: "Under Review", count: reviewCount }] : []),
    { id: "live", label: "Live", count: campaigns?.filter(c => (c.status || "").toLowerCase() === "live" || (c.status || "").toLowerCase() === "approved").length },
    { id: "draft", label: "Drafts", count: campaigns?.filter(c => (c.status || "").toLowerCase() === "draft" || !c.status).length },
    { id: "completed", label: "Completed", count: campaigns?.filter(c => (c.status || "").toLowerCase() === "completed").length }
  ];

  return (
    <div className="w-full max-w-none text-left pb-8" data-testid="brand-campaigns-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            My Campaign Briefs
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Launch, edit, or configure live performance tracking briefs for Indian creators.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {tabs.find(t => t.id === "draft")?.count > 0 && (
            <button 
              onClick={() => setActiveTab("draft")}
              className="px-5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-gray-50 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              Drafts <span className="flex items-center justify-center bg-amber-100 text-amber-700 w-5 h-5 rounded-full text-[10px] font-black">{tabs.find(t => t.id === "draft")?.count}</span>
            </button>
          )}
          {hasLocalDraft && (
            <button 
              onClick={() => {
                if (!isKycApproved) {
                  setShowKycPrompt(true);
                  return;
                }
                navigate("/brand/campaigns/create");
              }}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              <AlertCircle size={16} strokeWidth={3} /> Resume Draft
            </button>
          )}
          <button 
            onClick={handleCreateClick}
            className={`px-5 py-3 rounded-xl bg-[var(--violet)] hover:bg-[#6B4AFF] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xl transition-all hover:scale-[1.02] cursor-pointer`}
          >
            <Plus size={16} strokeWidth={3} /> Post Briefing
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-12 sm:p-16 text-center max-w-2xl mx-auto flex flex-col items-center justify-center mt-8">
          <div className="p-4 bg-[var(--violet)]/10 text-[var(--text-primary)] rounded-full mb-4 animate-bounce">
            <Megaphone size={28} />
          </div>
          <h3 className={'text-base font-bold'}>No campaign briefings found</h3>
          <p className={`text-sm text-gray-500 mt-2 leading-relaxed max-w-md`}>
            You haven't posted any campaign deliverables or creative guidelines yet. Launch your first briefing to attract the top Indian creators.
          </p>
          <button 
            onClick={handleCreateClick}
            className={`mt-6 px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-xs font-bold text-sm text-[var(--text-primary)] border border-[var(--border-default)] transition-all flex items-center gap-1.5 cursor-pointer`}
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs header */}
          <div className="flex gap-2 border-b border-[var(--border-default)] overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 relative pb-1">
            {tabs?.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative py-2.5 px-4 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer z-10 ${
                    isActive 
                      ? "text-[var(--text-primary)]" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="brandCampaignsTabPill"
                      className="absolute inset-0 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] shadow-xs z-0"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                  <span className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                    isActive ? "bg-[var(--violet)]/20 text-[var(--violet)] font-bold" : "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]"
                  }`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 w-full">
            {filtered.length === 0 ? (
              <div className="py-20 text-center bg-[var(--bg-card)]/50 rounded-2xl border border-[var(--border-default)] text-xs text-[var(--text-tertiary)] font-medium">
                No campaigns match selected status filter &ldquo;{activeTab}&rdquo;.
              </div>
            ) : (
              filtered?.map((camp, index) => (
                <CampaignCard 
                  key={(camp.campaign_id || camp.id) ? (camp.campaign_id || camp.id) + "-" + index : index} 
                  campaign={camp}
                  onManage={handleManage}
                  onEdit={handleEdit}
                  onSubmit={handleSubmitDraft}
                />
              ))
            )}
          </div>
        </div>
      )}

      <KycPromptModal
        isOpen={showKycPrompt}
        onClose={() => setShowKycPrompt(false)}
        role="brand"
        actionType="create_campaign"
        title="Complete Business Verification"
        subtitle="Without business verification, brands cannot create or publish campaign briefs. Please verify your business identity and GSTIN / Corporate PAN to start collaborating with creators."
        primaryText="Start Verification"
        secondaryText="Remind Me Later"
        allowDraft={false}
      />

      {/* Mobile Floating Action Button (FAB) & Menu */}
      <div className="md:hidden">
        {/* FAB Backdrop */}
        <AnimatePresence>
          {fabOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setFabOpen(false)} 
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" 
            />
          )}
        </AnimatePresence>

        {/* FAB Popup Menu */}
        <AnimatePresence>
          {fabOpen && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.8, opacity: 0, y: 20 }} 
              className="fixed bottom-[164px] right-5 z-50 flex flex-col items-end gap-2.5"
            >
              {hasLocalDraft && (
                <button 
                  onClick={handleResumeDraft}
                  className="bg-white dark:bg-[#1E293B] text-[#0A0A0A] dark:text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-[#E5E5EA] dark:border-slate-700 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock size={14} />
                  </div>
                  <span>Resume draft</span>
                </button>
              )}

              <button 
                onClick={handleStartNewCampaign}
                className="bg-white dark:bg-[#1E293B] text-[#0A0A0A] dark:text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-[#E5E5EA] dark:border-slate-700 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-[#F1E8FF] text-[#7C3AED] flex items-center justify-center">
                  <Plus size={14} />
                </div>
                <span>New campaign</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Action Button (Raised cleanly above 84px bottom navbar) */}
        <button 
          onClick={() => setFabOpen(!fabOpen)}
          className="fixed bottom-[96px] right-5 z-40 w-14 h-14 rounded-[19px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-[0_14px_28px_-12px_rgba(124,58,237,.65)] active:scale-95 transition-all cursor-pointer"
          aria-label="Create Campaign"
        >
          <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={24} strokeWidth={2.5} />
          </motion.div>
        </button>
      </div>
    </div>
  );
}
