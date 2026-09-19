import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle, 
  ArrowLeft, ArrowRight, BrainCircuit, X, Eye, ThumbsUp, ThumbsDown, 
  MessageSquare, ShieldCheck, Wallet, Calendar, Users, Landmark, 
  FileText, ChevronRight, Share2, Award, RotateCcw, Check, Ban
} from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function CampaignReviewQueue() {
  const [campaigns, setCampaigns] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation tabs: 'board' (Campaign Reviews) or 'bin' (Rejection Trash Bin)
  const [activeHubTab, setActiveHubTab] = useState('board');
  
  // Sub-tabs for Rejection Bin: 'campaigns_rejections' or 'waitlist_rejections'
  const [binSubTab, setBinSubTab] = useState('campaigns_rejections');
  
  const [filter, setFilter] = useState('Under Review');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  
  // Custom message modal for re-engaging rejected creators/brands
  const [messageModalItem, setMessageModalItem] = useState(null);
  const [panelMessageText, setPanelMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignRes, waitlistRes, settingsRes] = await Promise.all([
        api.get("admin/campaigns"),
        api.get("admin/waitlist").catch(err => { if(err?.message !== "Network Error"){ console.error(err); toast.error("Failed to load waitlist data."); } return { data: [] }; }),
        api.get('admin/settings').catch(err => { if(err?.message !== "Network Error"){ console.error(err); toast.error("Failed to load settings data."); } return { data: null }; })
      ]);
      
      setCampaigns(campaignRes.data || []);
      setWaitlist(waitlistRes.data || []);
      
      if (settingsRes.data && typeof settingsRes.data.ai_review_enabled === 'boolean') {
        setAiEnabled(settingsRes.data.ai_review_enabled);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to load admin campaign resources");
    } finally {
      setLoading(false);
    }
  };

  const toggleAiReview = async () => {
    const newState = !aiEnabled;
    setAiEnabled(newState);
    try {
      await api.put('admin/settings', { ai_review_enabled: newState });
      toast.success(`AI Auto-Moderation ${newState ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Failed to update AI settings", err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update AI settings");
      setAiEnabled(!newState);
    }
  };

  const getNormalizedStage = (c) => {
    const stage = c.stage || c.status || 'Draft';
    const s = stage.toLowerCase();
    if (s === 'under review' || s === 'under_review') return 'Under Review';
    if (s === 'live' || s === 'approved') return 'Live';
    if (s === 'rejected' || s === 'review failed') return 'Rejected';
    if (s === 'draft') return 'Draft';
    return stage;
  };

  const handleAction = async (id, newStage, reason = "") => {
    try {
      if (newStage === "Live") {
        // Run confetti explosion
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.4 }
        });
      }

      await api.post(`/admin/campaigns/${id}/status`, { stage: newStage, reason });
      toast.success(`Campaign marked as ${newStage}`);
      
      setCampaigns(prev => prev.map(c => c.campaign_id === id ? { ...c, stage: newStage, rejectReason: reason } : c));
      setSelectedCampaign(null);
      setRejectReason("");
      fetchData(); // Reload stats and items
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Action failed");
    }
  };

  // Re-approve waitlist submission
  const handleRecoverWaitlist = async (id) => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.4 }
      });
      await api.post(`/admin/waitlist/${id}/approve`);
      toast.success("Waitlist applicant approved successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to approve waitlist applicant");
    }
  };

  // Send message to waitlist applicant
  const handleSendWaitlistMessage = async () => {
    if (!panelMessageText.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSendingMessage(true);
    try {
      await api.post(`/admin/waitlist/${messageModalItem.id}/message`, { message: panelMessageText });
      toast.success("Message sent to applicant dashboard!");
      setMessageModalItem(null);
      setPanelMessageText("");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Metrics
  const stats = {
    'Draft': campaigns.filter(c => getNormalizedStage(c) === 'Draft').length,
    'Under Review': campaigns.filter(c => getNormalizedStage(c) === 'Under Review').length,
    'Live': campaigns.filter(c => getNormalizedStage(c) === 'Live').length,
    'Rejected': campaigns.filter(c => getNormalizedStage(c) === 'Rejected').length,
  };

  // 1. Total Rs of Live Campaigns
  const totalLiveBudget = campaigns
    .filter(c => getNormalizedStage(c) === 'Live')
    .reduce((sum, c) => sum + (c.budget_max || c.budget || 0), 0);

  // 2. Average Budget
  const liveCampaignsCount = stats['Live'];
  const avgCampaignBudget = liveCampaignsCount > 0 
    ? Math.round(totalLiveBudget / liveCampaignsCount) 
    : 0;

  // 3. Rejected in Waitlist Bin
  const rejectedWaitlistItems = waitlist.filter(w => w.status === 'Rejected');

  // Filter campaigns inside review board
  const filteredCampaigns = campaigns.filter(c => getNormalizedStage(c) === filter);

  return (
    <div className="space-y-6 flex flex-col h-full select-none pb-12 w-full animate-in fade-in duration-200" id="campaign-review-hub">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Campaign Review Queue</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Review and manage incoming brand campaigns.</p>
        </div>
      </div>

      {/* Dynamic Dashboard KPI Cards */}
      {!selectedCampaign && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="campaign-stats-grid">
          {/* Total Live Value */}
          <div className="bg-gradient-to-br from-[var(--violet)] to-[#5B21B6] rounded-2xl p-6 text-white border border-[var(--violet)]/20 shadow-md relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
              <Landmark size={120} />
            </div>
            <div className="flex items-center gap-2 text-white/80 font-semibold text-xs uppercase tracking-wider">
              <Wallet size={14} /> Total Live campaign value
            </div>
            <div className="text-3xl font-black mt-3 font-mono tracking-tight">
              ₹{totalLiveBudget.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-white/70 mt-1.5 font-medium">Currently active budget on Ybex platform</p>
          </div>

          {/* Under Review Queue */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-indigo-500/5">
              <Clock size={120} />
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold text-xs uppercase tracking-wider">
              <Clock size={14} className="text-[var(--violet)]" /> Awaiting approval
            </div>
            <div className="text-3xl font-bold mt-3 text-[var(--text-primary)]">
              {stats['Under Review']} <span className="text-xs text-[var(--text-secondary)] font-medium">campaigns</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Requires moderator validation and risk analysis</p>
          </div>

          {/* Average Budget */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-emerald-500/5">
              <Award size={120} />
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold text-xs uppercase tracking-wider">
              <Award size={14} className="text-emerald-500" /> Average Brand Budget
            </div>
            <div className="text-3xl font-bold mt-3 text-[var(--text-primary)] font-mono">
              ₹{avgCampaignBudget.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Average budget allocated per campaign brief</p>
          </div>

          {/* AI Safety Score */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] text-violet-500/5">
              <BrainCircuit size={120} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold text-xs uppercase tracking-wider">
                <BrainCircuit size={14} className="text-[var(--violet)]" /> AI Auto-Screening
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${aiEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                {aiEnabled ? "Active" : "Off"}
              </span>
            </div>
            <div className="text-3xl font-bold mt-3 text-[var(--text-primary)]">
              99.4% <span className="text-xs text-[var(--text-secondary)] font-medium">Accuracy</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Pre-screening filtering spam & policy non-compliance</p>
          </div>
        </div>
      )}

      {/* Main Campaign Workspaces Tab Hub */}
      {!selectedCampaign && (
        <div className="flex flex-col gap-6" id="campaign-review-workspace">
          {/* Hub Navigation Bars */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-default)]">
              <button 
                onClick={() => setActiveHubTab('board')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeHubTab === 'board' ? 'bg-[#9D7CFF] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <FileText size={16} /> Campaign Reviews ({stats['Under Review'] + stats['Live'] + stats['Draft']})
              </button>
              <button 
                onClick={() => setActiveHubTab('bin')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeHubTab === 'bin' ? 'bg-red-500 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <XCircle size={16} /> Rejection Trash Bin ({stats['Rejected'] + rejectedWaitlistItems.length})
              </button>
            </div>

            {/* Config controls on the right */}
            {activeHubTab === 'board' && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAiModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl hover:bg-foreground/5 transition-all text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <BrainCircuit size={14} className={aiEnabled ? "text-green-500" : "text-[#9D7CFF]"} />
                  AI Settings
                </button>
                <button 
                  onClick={fetchData}
                  className="p-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl hover:bg-foreground/5 transition-all text-[var(--text-secondary)]"
                  title="Refresh items"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeHubTab === 'board' ? (
              <motion.div 
                key="review-board-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Board Stage Filters */}
                <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl w-max overflow-x-auto border border-[var(--border-default)]">
                  {['Under Review', 'Live', 'Draft'].map(status => (
                    <button 
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${filter === status ? 'bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)]' : 'text-[var(--text-primary)]/60 hover:text-[var(--text-primary)]'}`}
                    >
                      {status}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === status ? 'bg-[var(--violet)]/10 text-[var(--violet)]' : 'bg-foreground/10 text-[var(--text-secondary)]'}`}>
                        {stats[status] || 0}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Queue Table */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-foreground/3 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                        <th className="px-6 py-4 font-bold">Brand & Campaign Title</th>
                        <th className="px-6 py-4 font-bold">Total Budget</th>
                        <th className="px-6 py-4 font-bold">Submission Deadline</th>
                        <th className="px-6 py-4 font-bold">Current Status</th>
                        <th className="px-6 py-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-foreground/5">
                      {filteredCampaigns.map(c => (
                        <tr 
                          key={c.campaign_id} 
                          className="hover:bg-foreground/[0.02] transition-colors cursor-pointer group"
                          onClick={() => setSelectedCampaign(c)}
                        >
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <img src={c.brand_logo || "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=100"} alt="" className="w-10 h-10 rounded-xl object-cover border border-[var(--border-default)]" />
                              <div>
                                <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors flex items-center gap-1.5">
                                  {c.title}
                                  {(getNormalizedStage(c) === 'Under Review' || c.status === 'under_review' || c.status === 'pending' || c.stage === 'under_review') && (
                                    <span className="relative flex h-2 w-2 shrink-0" title="Pending Approval Review">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{c.brand_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 font-bold text-[var(--text-primary)] font-mono">
                            ₹{(c.budget_max || c.budget || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4.5 text-[var(--text-secondary)] font-medium">
                            {c.deadline}
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`px-2.5 py-1 bg-foreground/5 border border-[var(--border-default)] rounded-full text-[10px] font-black uppercase ${
                              getNormalizedStage(c) === 'Live' ? 'text-green-500 border-green-100 bg-green-50/50' :
                              getNormalizedStage(c) === 'Draft' ? 'text-amber-500 border-amber-100 bg-amber-50/50' :
                              'text-[var(--violet)] border-[var(--violet-border)] bg-[var(--violet-soft)]/50'
                            }`}>
                              {getNormalizedStage(c)}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            <button onClick={() => setSelectedCampaign(c)} className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--violet-soft)] border border-[var(--border-default)] hover:border-[var(--violet-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--violet)] rounded-lg transition-all flex items-center gap-1.5 ml-auto">
                              Review Application <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredCampaigns.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-[var(--text-tertiary)] italic">
                            No campaigns found in {filter} status.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="trash-bin-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Trash Sub Tabs */}
                <div className="flex items-center gap-4 border-b border-[var(--border-default)] pb-1.5">
                  <button 
                    onClick={() => setBinSubTab('campaigns_rejections')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer relative ${binSubTab === 'campaigns_rejections' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    🏢 Brand Campaign Rejections ({stats['Rejected']})
                    {binSubTab === 'campaigns_rejections' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setBinSubTab('waitlist_rejections')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer relative ${binSubTab === 'waitlist_rejections' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    👥 Waitlist Creator Rejections ({rejectedWaitlistItems.length})
                    {binSubTab === 'waitlist_rejections' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
                  </button>
                </div>

                {/* Sub-tab 1: Rejected Campaigns */}
                {binSubTab === 'campaigns_rejections' ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-foreground/3 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                          <th className="px-6 py-4 font-bold">Campaign & Brand</th>
                          <th className="px-6 py-4 font-bold">Original Budget</th>
                          <th className="px-6 py-4 font-bold">Rejection Feedback Note</th>
                          <th className="px-6 py-4 font-bold text-right">Administrative Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-foreground/5">
                        {campaigns.filter(c => getNormalizedStage(c) === 'Rejected').map(c => (
                          <tr 
                            key={c.campaign_id} 
                            className="hover:bg-foreground/[0.02] transition-colors cursor-pointer group"
                            onClick={() => setSelectedCampaign(c)}
                          >
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <img src={c.brand_logo || "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=100"} alt="" className="w-10 h-10 rounded-xl object-cover border border-[var(--border-default)]" />
                                <div>
                                  <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors">{c.title}</div>
                                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{c.brand_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 font-bold font-mono text-[var(--text-primary)]">
                              ₹{(c.budget_max || c.budget || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="bg-red-500/[0.03] border border-red-500/10 rounded-xl p-3 text-red-500 text-xs font-medium max-w-md leading-relaxed">
                                {c.rejectReason || c.reject_reason || "Violation of platform policy / insufficient details"}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAction(c.campaign_id, "Live"); }}
                                className="px-4 py-2 bg-green-500 text-white font-bold text-xs rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm"
                              >
                                <RotateCcw size={14} /> Re-Approve & Live
                              </button>
                            </td>
                          </tr>
                        ))}

                        {campaigns.filter(c => getNormalizedStage(c) === 'Rejected').length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-16 text-center text-[var(--text-tertiary)] italic">
                              No rejected brand campaigns found in bin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Sub-tab 2: Rejected Waitlist */
                  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-foreground/3 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">
                          <th className="px-6 py-4 font-bold">Applicant Details</th>
                          <th className="px-6 py-4 font-bold">Waitlist Role</th>
                          <th className="px-6 py-4 font-bold">Rejection Note</th>
                          <th className="px-6 py-4 font-bold text-right">Administrative Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-foreground/5">
                        {rejectedWaitlistItems.map(w => (
                          <tr key={w.id} className="hover:bg-foreground/[0.01]">
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={w.photo || undefined} 
                                  alt="" 
                                  className="w-10 h-10 rounded-full object-cover border border-[var(--border-default)]" 
                                />
                                <div>
                                  <div className="font-bold text-[var(--text-primary)]">{w.name || w.company_name}</div>
                                  <div className="text-xs text-[var(--text-secondary)]">{w.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                w.role === 'brand' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)]'
                              }`}>
                                {w.role || 'creator'}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="bg-red-500/[0.03] border border-red-500/10 rounded-xl p-3 text-red-500 text-xs font-medium max-w-md leading-relaxed">
                                {w.rejectReason || "Identity verification mismatch / incorrect social handles"}
                              </div>
                              {w.panelMessage && (
                                <div className="text-[10px] text-[var(--violet)] font-bold mt-1.5 flex items-center gap-1">
                                  <Check size={12} /> Active Panel Message Sent
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => { setMessageModalItem(w); setPanelMessageText(w.panelMessage || undefined); }}
                                  className="px-3.5 py-2 border border-[var(--border-default)] hover:border-[var(--violet-border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--violet)] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer bg-white"
                                >
                                  <MessageSquare size={13} /> Panel Msg
                                </button>
                                <button 
                                  onClick={() => handleRecoverWaitlist(w.id)}
                                  className="px-4 py-2 bg-green-500 text-white font-bold text-xs rounded-xl hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <RotateCcw size={14} /> Re-Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {rejectedWaitlistItems.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-6 py-16 text-center text-[var(--text-tertiary)] italic">
                              No rejected waitlist applications in bin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* FULL-PAGE DETAILED REVIEW VIEW */}
      <AnimatePresence mode="wait">
        {selectedCampaign && (
          <motion.div 
            key="campaign-detailed-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="space-y-6"
            id="campaign-detail-fullpage"
          >
            {/* Top Back Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
              <button 
                onClick={() => setSelectedCampaign(null)} 
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-sm transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to campaigns queue
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Calendar size={13} /> Deadline: {selectedCampaign.deadline}
                </span>
                <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Clock size={13} /> {selectedCampaign.daysInReview || 1} days in review
                </span>
              </div>
            </div>

            {/* Main Header Profile Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <img 
                  src={selectedCampaign.brand_logo || "https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=100"} 
                  alt="" 
                  className="w-20 h-20 rounded-2xl border border-[var(--border-default)] object-cover bg-[var(--bg-elevated)] shadow-sm"
                />
                <div className="space-y-2">
                  <div className="flex items-center flex-wrap justify-center sm:justify-start gap-3">
                    <h2 className="text-2xl font-bold font-display text-[var(--text-primary)] tracking-tight">
                      {selectedCampaign.title}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      getNormalizedStage(selectedCampaign) === 'Live' ? 'bg-green-50 text-green-600 border-green-200' :
                      getNormalizedStage(selectedCampaign) === 'Rejected' ? 'bg-red-50 text-red-500 border-red-200' :
                      getNormalizedStage(selectedCampaign) === 'Draft' ? 'bg-amber-50 text-amber-500 border-amber-200' :
                      'bg-indigo-50 text-[var(--violet)] border border-indigo-200'
                    }`}>
                      {getNormalizedStage(selectedCampaign)}
                    </span>
                  </div>
                  <div className="text-[var(--text-secondary)] text-sm">
                    Submitted by: <span className="text-[var(--text-primary)] font-bold">{selectedCampaign.brand_name}</span>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] flex items-center justify-center sm:justify-start gap-1">
                    Campaign ID: <span className="font-mono text-[var(--text-primary)]">{selectedCampaign.campaign_id}</span>
                  </div>
                </div>
              </div>

              {/* Quick Status / Actions widget */}
              <div className="flex flex-col items-center md:items-end justify-center gap-1.5 border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-widest">Verification Status</span>
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                  <ShieldCheck size={14} /> Brand Identity Verified
                </div>
              </div>
            </div>

            {/* Detailed Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left & Middle Column (Main Content) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Brief Description */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-3">
                  <h3 className="text-sm uppercase font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-[var(--violet)]" /> Campaign Summary & Brief
                  </h3>
                  <p className="text-sm text-[var(--text-primary)]/80 leading-relaxed font-medium">
                    {selectedCampaign.description || "Looking for passionate creators to share authentic video and image content of our product collection on social handles."}
                  </p>
                </div>

                {/* Requirements & Target Demographics */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm uppercase font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-[var(--violet)]" /> Target Audience & Creator Requirements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 space-y-1">
                      <span className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Demographics</span>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {selectedCampaign.targetAudience || "18-35 years, Fashion, Urban dwellers"}
                      </div>
                    </div>
                    <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 space-y-1">
                      <span className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-wider">Creator Niche</span>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {selectedCampaign.categories 
                          ? (Array.isArray(selectedCampaign.categories) ? selectedCampaign.categories.join(", ") : String(selectedCampaign.categories))
                          : (selectedCampaign.niches 
                              ? (Array.isArray(selectedCampaign.niches) ? selectedCampaign.niches.join(", ") : String(selectedCampaign.niches))
                              : "Lifestyle, Tech, Creative Arts, Reviewers")
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Review Smart Summary */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm uppercase font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                      <BrainCircuit size={16} className="text-[#9D7CFF]" /> AI Smart Review Analysis
                    </h3>
                    <span className="px-2.5 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-full text-[10px] font-bold uppercase">
                      Pass • Low Risk (8%)
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-[#9D7CFF]/5 border border-[#9D7CFF]/15 rounded-xl space-y-2">
                      <div className="font-bold text-[var(--text-primary)]">Automated Screening Insights:</div>
                      <p className="text-[var(--text-secondary)] leading-relaxed font-medium">
                        "The proposed budget is highly appropriate for the specified deliverables. Deliverables do not contain any disintermediation text, third-party payment requests, or links that violate platform integrity. Safety ranking is fully compliant."
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[var(--text-secondary)] font-medium">
                      <div className="flex items-center gap-2 p-2.5 bg-foreground/2 rounded-lg border border-[var(--border-default)]">
                        <Check size={14} className="text-green-500" /> Disintermediation Link Check: Safe
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-foreground/2 rounded-lg border border-[var(--border-default)]">
                        <Check size={14} className="text-green-500" /> Language & Safety Check: Safe
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-foreground/2 rounded-lg border border-[var(--border-default)]">
                        <Check size={14} className="text-green-500" /> Brand Wallet Verification: Verified
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-foreground/2 rounded-lg border border-[var(--border-default)]">
                        <Check size={14} className="text-green-500" /> Budget-to-Deliverables Match: Normal
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (Financials & Actions) */}
              <div className="space-y-6">
                
                {/* Budget Details */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs uppercase font-bold text-indigo-500 tracking-wider flex items-center gap-2">
                    <Landmark size={15} /> Campaign Finances
                  </h3>
                  
                  <div className="space-y-1">
                    <span className="text-xs text-[var(--text-tertiary)] font-semibold">Total Allocated Budget</span>
                    <div className="text-3xl font-black text-[var(--text-primary)] font-mono tracking-tight">
                      ₹{(selectedCampaign.budget_max || selectedCampaign.budget || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="border-t border-indigo-100/50 pt-3 space-y-2.5 text-xs text-[var(--text-secondary)] font-medium">
                    <div className="flex justify-between items-center">
                      <span>Escrow Status:</span>
                      <span className="text-green-600 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck size={12} /> 100% Funded
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Brand Processing Fee:</span>
                      <span className="font-mono font-bold text-[#027A48] ">₹0 (0% - Free for Brands)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Payout to Creators:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">Guaranteed on approval</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] italic pt-1 border-t border-slate-100 dark:border-slate-800">
                      * Standard Ybex platform commission is deducted from creator earnings upon payout release, not charged to the brand.
                    </div>
                  </div>
                </div>

                {/* Deliverables */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                    <Share2 size={15} className="text-[var(--violet)]" /> Platform & Deliverables
                  </h3>
                  
                  <div className="space-y-2">
                    {Array.isArray(selectedCampaign.deliverables) ? (
                      selectedCampaign.deliverables.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-semibold text-[var(--text-primary)]/80">
                          <CheckCircle2 size={14} className="text-[var(--violet)] shrink-0" />
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl font-mono text-xs text-[var(--text-primary)]/80 leading-relaxed">
                        {selectedCampaign.deliverables || "1 Instagram Reels, 2 Story Mentions"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Audit Actions Header */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-2">
                    <Award size={15} className="text-[var(--violet)]" /> Review Moderation Controls
                  </h3>

                  {/* Feedback Message Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Feedback / Rejection Reason</label>
                    <textarea 
                      rows={2}
                      placeholder="Specify reason for reject/draft return..." 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>

                  {/* Decision Actions Button Bar */}
                  <div className="flex flex-col gap-2 pt-1">
                    {getNormalizedStage(selectedCampaign) === 'Under Review' && (
                      <>
                        <button 
                          onClick={() => handleAction(selectedCampaign.campaign_id, "Rejected", rejectReason)}
                          disabled={!rejectReason}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/15 text-red-500 font-bold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <XCircle size={14} /> Reject Campaign Brief
                        </button>
                        <button 
                          onClick={() => handleAction(selectedCampaign.campaign_id, "Draft", rejectReason)}
                          disabled={!rejectReason}
                          className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 font-bold rounded-xl text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <RotateCcw size={14} /> Return to Draft Mode
                        </button>
                        <button 
                          onClick={() => handleAction(selectedCampaign.campaign_id, "Live")}
                          className="w-full py-3 bg-green-500 text-white font-bold rounded-xl text-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-green-500/10"
                        >
                          <CheckCircle2 size={15} /> Approve & Publish Live
                        </button>
                      </>
                    )}

                    {getNormalizedStage(selectedCampaign) === 'Live' && (
                      <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                        <div className="text-xs font-bold text-green-600 flex items-center gap-1.5 p-2 bg-green-50 rounded-lg">
                          <CheckCircle2 size={14} /> Campaign is currently Live & Public
                        </div>
                        <button 
                          onClick={() => handleAction(selectedCampaign.campaign_id, "Rejected", "Moderation policy recall")}
                          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-500/20"
                        >
                          <AlertTriangle size={14} /> Recall / Unpublish Brief
                        </button>
                      </div>
                    )}

                    {getNormalizedStage(selectedCampaign) === 'Draft' && (
                      <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                        <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg">
                          <RotateCcw size={14} /> Returned to Brand as Draft
                        </div>
                        <button 
                          onClick={() => handleAction(selectedCampaign.campaign_id, "Live")}
                          className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          <CheckCircle2 size={14} /> Re-Approve & Publish Live
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Moderation Settings Modal */}
      <AnimatePresence>
        {aiModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setAiModalOpen(false)} 
                className="absolute top-4 right-4 p-2 hover:bg-foreground/10 rounded-full transition-colors cursor-pointer text-[var(--text-secondary)]"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#9D7CFF]/10 rounded-xl flex items-center justify-center border border-[#9D7CFF]/20">
                  <BrainCircuit size={24} className="text-[#9D7CFF]" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">AI Moderation Engine</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Gemini-powered automated campaign screening</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-4 bg-foreground/5 rounded-xl border border-[var(--border-default)]">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-[var(--text-primary)]"><CheckCircle2 size={16} className="text-green-500"/> How it works</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                    When a brand submits a new campaign brief, the AI instantly scans the title, description, and deliverables for:
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]/85 list-disc list-inside font-semibold">
                    <li>Prohibited content (gambling, adult, illegal substances)</li>
                    <li>Contact info sharing (bypassing platform fees)</li>
                    <li>Unrealistic deliverables vs. budget ratios</li>
                    <li>Spam or scam language patterns</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]">
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Auto-Reject High Risk</div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-1">Automatically rejects campaigns scoring 90%+ risk.</div>
                  </div>
                  <button 
                    onClick={toggleAiReview}
                    className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${aiEnabled ? 'bg-green-500' : 'bg-foreground/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiEnabled ? 'left-[26px]' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setAiModalOpen(false)} 
                className="w-full py-3 bg-[var(--text-primary)] text-[var(--bg-base)] hover:bg-[var(--text-secondary)] font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Panel Message Modal for Waitlist re-engagement */}
      <AnimatePresence>
        {messageModalItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setMessageModalItem(null)} 
                className="absolute top-4 right-4 p-2 hover:bg-foreground/10 rounded-full transition-colors cursor-pointer text-[var(--text-secondary)]"
              >
                <X size={20} />
              </button>
              
              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <MessageSquare className="text-[var(--violet)]" size={20} /> Send Panel Message
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Send a message directly to the applicant's dashboard regarding their application status or request for updates.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-secondary)] space-y-1">
                  <div>Recipient: <span className="text-[var(--text-primary)] font-bold">{messageModalItem.name || messageModalItem.company_name}</span></div>
                  <div>Email: <span className="text-[var(--text-primary)] font-mono font-bold">{messageModalItem.email}</span></div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Custom Dashboard Message</label>
                  <textarea 
                    rows={4}
                    placeholder="Enter message (e.g. 'Please update your Instagram profile to public and add our tag so we can verify your follower count...')" 
                    value={panelMessageText}
                    onChange={(e) => setPanelMessageText(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--violet-border)] font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setMessageModalItem(null)}
                    className="flex-1 py-2.5 border border-[var(--border-default)] text-[var(--text-secondary)] font-bold rounded-xl text-xs hover:bg-foreground/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSendWaitlistMessage}
                    disabled={sendingMessage || !panelMessageText.trim()}
                    className="flex-1 py-2.5 bg-[var(--violet)] text-white font-bold rounded-xl text-xs hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                  >
                    {sendingMessage ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
