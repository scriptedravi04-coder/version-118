import GeminiIcon from "../../components/common/GeminiIcon";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import ApplicantCard from "../../components/campaigns/ApplicantCard";
import ExportAnalyticsPdfButton from "../../components/common/ExportAnalyticsPdfButton";
import { 
  ArrowLeft, Megaphone, Users, HelpCircle, Check, Loader2,
  X, FileText, Eye, CreditCard, ShieldCheck, CheckCircle2, MapPin, ExternalLink, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BrandCampaignApplicants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [campaign, setCampaign] = useState(location.state?.campaign || null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRoi, setAiRoi] = useState(null);
  const [isPredictingRoi, setIsPredictingRoi] = useState(false);

  const handlePredictRoi = async () => {
    setIsPredictingRoi(true);
    try {
      const { data } = await api.post("ai/predict-roi", { campaign, creators: applicants });
      setAiRoi(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to predict ROI");
    } finally {
      setIsPredictingRoi(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch campaign details
      try {
        const { data: campDetail } = await api.get(`/campaigns/${id}`);
        if (campDetail) {
          setCampaign(campDetail);
        }
      } catch (e) {
        const { data: camps } = await api.get("campaigns?mine=true").catch(() => ({ data: [] }));
        const found = camps?.find(c => String(c.campaign_id || c.id) === String(id));
        if (found) {
          setCampaign(found);
        }
      }
      
      // Fetch actual applicants from backend
      try {
        const { data: apps } = await api.get(`/campaigns/${id}/applications`);
        setApplicants(apps || []);
      } catch (err) {
        setApplicants([]);
      }
      
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleShortlist = async (app) => {
    try {
      const { data } = await api.post(`/campaigns/${id || campaign?.campaign_id}/applications/${app.application_id}/action`, { action: "accept" });
      
      toast.success(`${app.full_name} has been shortlisted! Initiating secure chat.`);
      
      if (data.thread_id) {
        navigate(`/chat/${data.thread_id}`);
      } else {
        toast.error("Could not open chat — thread not found. Please try again.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Process error, shortlist request failed.");
    }
  };

  const handleReject = async (app) => {
    const reason = window.prompt("Reason for rejection (optional):");
    if (reason === null) return; // User cancelled
    
    try {
      await api.post(`/campaigns/${id || campaign?.campaign_id}/applications/${app.application_id}/action`, { action: "reject" });
      
      // FIX: Update status and rejection_reason in Supabase
      await supabase
        .from("brand_applications")
        .update({
          status: "rejected",
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .eq("id", app.application_id);

      toast.success(`Application entry has been declined.`);
      setApplicants(prev => prev?.filter(a => a.application_id !== app.application_id));
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        "Decline action failed."
      );
    }
  };

  const exportCsv = () => {
    if (!applicants.length) return toast.error("No applicants to export.");
    const headers = ["Name", "Email", "Platform", "Handle", "Message", "Status"];
    const csvContent = applicants.map(a => 
      [a.full_name, a.email, a.platform, a.handle, a.cover_letter, a.status].map(val => `"${(val || "").toString().replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([headers.join(",") + "\n" + csvContent.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProfileView = (app) => {
    navigate(`/creator/${app.creator_id}`);
  };

  const handleChat = async (app) => {
    try {
      // Find the thread
      const { data } = await api.get('chat/v2/threads');
      const thread = data.find(t => t.campaign_id === (app.campaign_id || id) && t.creator_id === app.creator_id);
      if (thread) {
        navigate(`/chat/${thread.id}`);
      } else {
        toast.error("Chat thread not found.");
      }
    } catch(err) {
      toast.error("Could not open chat");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-none px-4 py-8 animate-pulse bg-[var(--bg-base)] min-h-screen">
        <div className="h-10 bg-gray-200 dark:bg-zinc-800 rounded-xl w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(k => (
            <div key={k} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl p-6 border border-[var(--border-default)]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none text-left min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mb-8">
        <button 
          onClick={() => navigate("/brand/campaigns")}
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-all"
        >
          <ArrowLeft size={14} /> Back to My Campaigns
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-3 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 uppercase tracking-normal ${
                (campaign?.status || '').toLowerCase() === 'live' 
                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                  : ((campaign?.status || '').toLowerCase() === 'under_review' || (campaign?.status || '').toLowerCase() === 'under review')
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {((campaign?.status || '').toLowerCase() === 'under_review' || (campaign?.status || '').toLowerCase() === 'under review') ? (
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                ) : (
                  <Megaphone size={12} className="text-purple-600" />
                )}
                <span className={((campaign?.status || '').toLowerCase() === 'under_review' || (campaign?.status || '').toLowerCase() === 'under review') ? 'animate-pulse' : ''}>
                  {(campaign?.status || '').toLowerCase() === 'live' ? 'Active Campaign Briefing' : (campaign?.status || 'Active Campaign Briefing').replace(/_/g, ' ')}
                </span>
              </span>
              <span className="text-[var(--text-primary)]/20">•</span>
              <span className="text-emerald-700 text-xs font-semibold font-sans">
                {campaign?.budget_max && Number(campaign.budget_max) > Number(campaign.budget_min || 0) ? (
                  `₹${Number(campaign.budget_min || 0).toLocaleString("en-IN")} - ₹${Number(campaign.budget_max).toLocaleString("en-IN")}`
                ) : (
                  `₹${Number(campaign?.budget_min || campaign?.budget || 10000).toLocaleString("en-IN")}`
                )}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-1.5">
              {campaign?.title || "Campaign Applicants"}
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative group">
              <div className="absolute -top-2.5 -right-2.5 z-20 overflow-hidden rounded-md">
                <span className="relative inline-block bg-[#FF0033] shadow-[0_0_8px_rgba(255,0,51,0.5)] text-white text-[9px] font-black px-1.5 py-0.5 rounded drop-shadow-sm uppercase tracking-wider overflow-hidden">
                  <span className="relative z-10">NEW</span>
                  <span className="absolute top-0 bottom-0 left-0 w-full bg-white opacity-40 animate-shine"></span>
                </span>
              </div>
              <ExportAnalyticsPdfButton 
                campaign={campaign} 
                applicants={applicants} 
                aiRoi={aiRoi} 
                buttonText="Download Analysis" 
                variant="box" 
              />
            </div>
            
            <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-default)] px-4 py-2.5 rounded-2xl shadow-sm">
              <Users size={18} className="text-[var(--violet)] shrink-0" />
              <div className="text-left font-sans">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">Pitching pool</div>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{applicants.length} {applicants.length === 1 ? 'Creator Pitch' : 'Creator Pitches'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      <div className="mt-6 mb-8 pt-6 border-t border-[var(--border-default)]">
        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <GeminiIcon className="w-4 h-4" />
          Predictive AI ROI
        </h4>
        {aiRoi ? (
          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-default)]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[var(--text-secondary)]">Est. Reach</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{aiRoi.estimatedReach?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[var(--text-secondary)]">Est. Engagement</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{aiRoi.estimatedEngagement?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-[var(--text-secondary)]">ROI Multiplier</span>
              <span className="text-sm font-black text-emerald-500">{aiRoi.roiMultiplier}x</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">{aiRoi.analysis}</p>
          </div>
        ) : (
          <button 
            onClick={handlePredictRoi}
            disabled={isPredictingRoi}
            className="w-full py-3 bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--violet)]/30 hover:bg-[var(--violet)]/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            {isPredictingRoi ? <Loader2 size={16} className="animate-spin" /> : <GeminiIcon className="w-4 h-4" />}
            Predict ROI for Applicant Pool
          </button>
        )}
      </div>


      <div className="grid grid-cols-1 gap-5">
        {applicants.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-16 text-center max-w-2xl mx-auto flex flex-col items-center justify-center">
            <div className="p-4 bg-[var(--bg-elevated)] text-[var(--text-tertiary)] rounded-full mb-3">
              <HelpCircle size={28} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">No applicant entries yet</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed max-w-md">
              Pitches from creators will show up here as soon as verification completes. You can share your active campaign briefing URL to promote your listing!
            </p>
          </div>
        ) : (
          applicants?.map((app, index) => (
            <ApplicantCard
              key={(app.application_id || app.id) ? (app.application_id || app.id) + "-" + index : index}
              applicant={app}
              onShortlist={handleShortlist}
              onReject={handleReject}
              onViewProfile={handleProfileView}
              onChat={handleChat}
            />
          ))
        )}
      </div>

    </div>
  );
}
