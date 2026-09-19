import React, { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, ArrowRight, Eye, Check, ChevronLeft, ChevronRight, Video, Target, DollarSign, Users } from "lucide-react";
import { Badge } from "@/components/common/Badge";

// Helper to format raw dates / ISO strings beautifully
const formatCampaignDate = (dateStr) => {
  if (!dateStr) return "Jul 31, 2026";
  if (dateStr.includes("T")) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
      }
    } catch (e) {
      // fallback
    }
  }
  return dateStr;
};

export default function CampaignMiniList({ campaigns = [] }) {
  const navigate = useNavigate();
  const sliderRef = useRef(null);

  // Structured active campaigns for Brands
  const fallbackCampaigns = [
    { 
      campaign_id: "sc-1", 
      title: "Summer Collection Launch", 
      category: "Beauty & Lifestyle", 
      status: "LIVE", 
      budget_min: 10000, 
      budget_max: 25000, 
      applicantsLength: 4, 
      dealsLength: 2, 
      deadline: "Jun 30, 2026", 
      platform: "Instagram Reels",
      deliverable: "1x Video Reel",
      views: 142,
      description: "Looking for fashion creators to promote our new summer line with aesthetic transition videos."
    },
    { 
      campaign_id: "sc-3", 
      title: "Smartwatch Review Campaign", 
      category: "Tech & Gaming", 
      status: "LIVE", 
      budget_min: 10000, 
      budget_max: 65000, 
      applicantsLength: 8, 
      dealsLength: 3, 
      deadline: "Jul 10, 2026", 
      platform: "YouTube Video",
      deliverable: "Dedicated Review",
      views: 385,
      description: "Fitness creators needed for an honest, high-quality video review of our active GPS smartwatch."
    },
    { 
      campaign_id: "sc-2", 
      title: "Indian Food & Travel Vlog", 
      category: "Food & Travel", 
      status: "IN REVIEW", 
      budget_min: 15000, 
      budget_max: 50000, 
      applicantsLength: 12, 
      dealsLength: 5, 
      deadline: "Jul 15, 2026", 
      platform: "YouTube Shorts",
      deliverable: "2x Shorts Series",
      views: 290,
      description: "Food vloggers wanted to explore street foods and highlight dining app features across major cities."
    },
    { 
      campaign_id: "sc-4", 
      title: "Premium Fitwear Workout Reel", 
      category: "Fitness & Health", 
      status: "DRAFT", 
      budget_min: 20000, 
      budget_max: 30000, 
      applicantsLength: 0, 
      dealsLength: 0, 
      deadline: "Jul 25, 2026", 
      platform: "Instagram Post",
      deliverable: "1x Feed Video",
      views: 0,
      description: "Fitness influencers required to record high-energy workouts wearing our active compression line."
    },
    { 
      campaign_id: "sc-5", 
      title: "Fintech App Shorts Drive", 
      category: "Fintech & Finance", 
      status: "APPROVED", 
      budget_min: 50000, 
      budget_max: 80000, 
      applicantsLength: 15, 
      dealsLength: 8, 
      deadline: "Jul 05, 2026", 
      platform: "YouTube Shorts",
      deliverable: "3x Shorts/Reels",
      views: 610,
      description: "Creators wanted to explain smart budgeting tools and high-interest return accounts via snappy videos."
    }
  ];

  // Map real database briefs
  const realCampaigns = campaigns.map((c, i) => {
    const isTech = (c.category || "").toLowerCase().includes("tech") || (c.category || "").toLowerCase().includes("gaming");
    const isFood = (c.category || "").toLowerCase().includes("food") || (c.category || "").toLowerCase().includes("travel");
    
    return {
      campaign_id: c.campaign_id || c.id,
      title: c.title,
      category: c.category || "General Campaign",
      status: c.status || "LIVE",
      budget_min: c.budget_min || 15000,
      budget_max: c.budget_max || c.budget || 25000,
      applicantsLength: c.applicants?.length || 0,
      dealsLength: c.deals?.length || 0,
      deadline: c.deadline || "Jun 30, 2026",
      platform: isTech || isFood ? "YouTube Video" : "Instagram Reels",
      deliverable: isTech ? "Dedicated Review" : "1x Video Reel",
      views: c.views || 0,
      description: c.description || "UGC content campaign for creators to showcase key selling points & product reviews."
    };
  });

  const items = realCampaigns;

  const getStatusBadgeStyle = (status) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "LIVE":
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "IN REVIEW":
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DRAFT":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full mt-6" data-testid="campaign-mini-list">
      {/* CSS style block to hide scrollbars elegantly across devices */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* List Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2">
          
          <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider">
            Your Active Briefs
          </h3>
          <span className="text-xs text-zinc-400 font-medium hidden md:inline">• Swipe to manage live campaigns</span>
        </div>
        
        {/* Actions & Navigation Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
          {/* Slider Left/Right Arrows */}
          <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/50">
            <button 
              onClick={scrollLeft}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-zinc-200/60 text-zinc-600 hover:text-[var(--violet)] hover:border-[var(--violet)]/30 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Previous Brief"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <button 
              onClick={scrollRight}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-zinc-200/60 text-zinc-600 hover:text-[var(--violet)] hover:border-[var(--violet)]/30 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Next Brief"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/brand/campaigns/create")}
              className="p-2 px-3.5 rounded-xl bg-[var(--violet)] hover:bg-[#6b4aff] text-white hover:scale-[1.02] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={13} strokeWidth={3} /> Post Brief
            </button>
            <Link 
              to="/brand/campaigns" 
              className="text-xs font-extrabold text-[var(--violet)] hover:text-[#6b4aff] transition-all flex items-center gap-1 hover:underline ml-1"
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLLABLE SLIDER CONTAINER */}
      {items.length === 0 ? (
        <div className="w-full bg-white border border-dashed border-zinc-200 rounded-[24px] p-8 text-center flex flex-col items-center justify-center my-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[var(--violet)] mb-3">
            <Target size={22} />
          </div>
          <h4 className="text-base font-bold text-zinc-800">No Active Briefs Yet</h4>
          <p className="text-xs text-zinc-500 max-w-md mt-1 mb-4">
            Post your first campaign brief to start receiving high-converting pitches and UGC video proposals from verified creators.
          </p>
          <button
            onClick={() => navigate("/brand/campaigns/create")}
            className="px-5 py-2.5 rounded-xl bg-[var(--violet)] hover:bg-[#6b4aff] text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} /> Post Your First Briefing
          </button>
        </div>
      ) : (
        <div 
          ref={sliderRef}
          className="no-scrollbar flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory w-full"
        >
          {items.map((camp, idx) => {
          const isLive = ["LIVE", "APPROVED"].includes((camp.status || "").toUpperCase());
          return (
            <div 
              key={camp.campaign_id || idx} 
              onClick={() => navigate(`/brand/campaigns`)}
              className="group relative flex flex-col justify-between bg-white border border-zinc-150 hover:border-[var(--violet)]/30 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] transition-all duration-300 hover:shadow-[0_12px_28px_rgba(124,92,255,0.04)] cursor-pointer overflow-hidden w-[290px] sm:w-[325px] shrink-0 snap-start min-h-[290px] hover:bg-[var(--violet)]/[0.005]"
            >
              {/* Dynamic Status Tag absolute top right corner */}
              <div className="absolute top-3 right-3">
                <Badge variant={camp.status || "LIVE"}>{camp.status || "LIVE"}</Badge>
              </div>

              {/* Main Card Body */}
              <div>
                {/* Header Profile Info Row */}
                <div className="flex items-start gap-3.5">
                  {/* Category Rounded Avatar Placeholder */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm text-[var(--violet)]">
                    <Target size={18} strokeWidth={2.2} />
                  </div>
                  
                  {/* Title & Category Info */}
                  <div className="flex-1 pr-14 text-left min-w-0">
                    <h4 className="text-[14px] font-black text-zinc-800 tracking-tight leading-snug group-hover:text-[var(--violet)] transition-colors line-clamp-2">
                      {camp.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] font-extrabold text-zinc-400 bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                        {camp.category}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500">
                        • {camp.platform}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Looking For / Deliverable Description Section */}
                <div className="mt-4 text-left">
                  <span className="block text-[8px] font-black tracking-wider text-zinc-400 uppercase">
                    Briefing Objective
                  </span>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1 line-clamp-2 min-h-[36px]">
                    {camp.description}
                  </p>
                </div>

                {/* Highlights Container Grid - Premium 100% Brand-Focused Design */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Highlight Box 1: Budget Range */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FAFAFA] rounded-xl border border-zinc-100 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-zinc-150 flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-zinc-700 font-black text-[12px] shrink-0">
                      ₹
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-[7px] font-black tracking-widest text-zinc-400 uppercase leading-none">
                        Budget Block
                      </span>
                      <span className="block text-[10px] font-black text-zinc-800 mt-1 truncate">
                        ₹{Math.round(camp.budget_min / 1000)}K - ₹{Math.round(camp.budget_max / 1000)}K
                      </span>
                    </div>
                  </div>

                  {/* Highlight Box 2: Deliverable Required */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FAFAFA] rounded-xl border border-zinc-100 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-zinc-150 flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-[var(--violet)] shrink-0">
                      <Video size={12} strokeWidth={2.5} />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-[7px] font-black tracking-widest text-zinc-400 uppercase leading-none">
                        Deliverable
                      </span>
                      <span className="block text-[10px] font-black text-zinc-800 mt-1 truncate">
                        {camp.deliverable || "1x Video Reel"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Divider & Info */}
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                {/* Views and info */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                  <Eye size={11} strokeWidth={2.2} />
                  <span>{camp.views} views</span>
                  <span>•</span>
                  <span className="truncate">🗓️ {formatCampaignDate(camp.deadline)}</span>
                </div>

                {/* Applied Applicants Avatar / Status Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Applied pill */}
                  <span className="bg-indigo-50 text-[var(--violet)] text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Users size={9} />
                    <span>{camp.applicantsLength} {camp.applicantsLength === 1 ? 'pitch' : 'pitches'}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
