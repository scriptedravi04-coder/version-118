import React from "react";
import { ChevronRight, Calendar, Users2, ShieldCheck, AlertCircle, Video } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import AgencyBadge from "@/components/common/AgencyBadge";
import { t } from "@/lib/typography";

export default function CampaignCard({ campaign, onManage, onEdit, onSubmit }) {
  const c = campaign;
  const statusStr = (c.status || "").toLowerCase().trim();
  const isUnderReview = statusStr === "under_review" || statusStr === "under review" || statusStr === "pending_review" || statusStr === "in_review" || statusStr === "review";
  const isLive = statusStr === "live" || statusStr === "approved";
  const isDraft = statusStr === "draft" || !c.status;
  const isAgency = Boolean(c.is_agency || c.brand_is_agency || c.raw?.is_agency || c.raw?.brand_profiles?.is_agency);
  
  // Format platforms beautifully
  const platformsList = c.platforms || [];
  const platformsStr = platformsList.length > 0 ? platformsList.join(", ") : "Instagram";

  let expiryDays = 0;
  if (c.deadline) {
     const diff = new Date(c.deadline).getTime() - Date.now();
     expiryDays = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }
  const endsSoon = expiryDays > 0 && expiryDays <= 3;

  return (
    <div 
      className="group relative bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-[#DDD6FE] transition-all cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6" 
      onClick={() => !isDraft && onManage && onManage(c)}
    >
       {/* Left: Icon, Title, Tags - Fixed width on lg+ so middle stats line up perfectly */}
       <div className="flex gap-3 sm:gap-4 items-center w-full lg:w-[280px] xl:w-[340px] 2xl:w-[400px] shrink-0 min-w-0 pr-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#F5F0FF] border border-[#DDD6FE] flex items-center justify-center shrink-0">
             <Video size={18} className="text-[var(--violet)] sm:w-[20px] sm:h-[20px]" />
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
             <div className="flex items-center gap-1.5 flex-wrap">
               <h4 className="font-extrabold sm:font-black text-gray-900 text-sm sm:text-base group-hover:text-[var(--violet)] transition-colors line-clamp-2 leading-tight" title={c.title || "Brand Campaign"}>
                  {c.title || "Brand Campaign"}
               </h4>
               {isAgency && <AgencyBadge size="xs" className="shrink-0" />}
             </div>
             <p className="text-xs text-gray-500 font-semibold truncate">{c.isUgc ? "UGC Content Campaign" : "Influencer Campaign"}</p>
             <div className="flex flex-wrap gap-1.5 mt-1">
                {isUnderReview ? (
                   <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-amber-800 bg-amber-50 border-amber-300 flex items-center gap-1.5 shadow-xs">
                      <span className="relative flex h-1.5 w-1.5">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      <span className="animate-pulse">UNDER REVIEW</span>
                   </span>
                ) : (
                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isDraft ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                      {c.status || "LIVE"}
                   </span>
                )}
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 truncate max-w-[150px]">
                   {platformsStr}
                </span>
             </div>
          </div>
       </div>

       {/* Middle: Stats - Fixed width sub-columns for vertical alignment across cards */}
       <div className="flex items-center justify-between lg:justify-start gap-4 sm:gap-6 lg:gap-8 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 hide-scrollbar flex-1">
          {/* Est. Budget */}
          <div className="flex flex-col items-start w-[110px] sm:w-[130px] shrink-0">
             <span className="text-base sm:text-lg font-black text-gray-900 leading-none mb-1 truncate w-full">
                {c.budget_min === 0 ? "Barter" : `₹${(c.budget_min || 10000).toLocaleString("en-IN")}`}
             </span>
             <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest truncate">{c.budget_min === 0 ? "Collab Mode" : "Est. Budget"}</span>
          </div>

          {/* Applicants */}
          <div className="flex flex-col items-start w-[70px] sm:w-[85px] shrink-0">
             <span className="text-base sm:text-lg font-black text-gray-900 leading-none mb-1">
                {c.applicants?.length || 0}
             </span>
             <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Applicants</span>
          </div>

          {/* Deals */}
          <div className="flex flex-col items-start w-[60px] sm:w-[75px] shrink-0">
             <span className="text-base sm:text-lg font-black text-gray-900 leading-none mb-1">
                {c.deals?.length || 0}
             </span>
             <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Deals</span>
          </div>

          {/* Timeline & Status */}
          <div className="flex flex-col items-start w-[120px] sm:w-[140px] shrink-0 border-l border-gray-100 pl-4 sm:pl-6">
             <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1 truncate w-full">
                <Calendar size={12} className="text-gray-400 shrink-0" />
                <span className="truncate">{expiryDays > 0 ? `Ends in ${expiryDays}d` : (c.deadline || "Jun 30, 2026")}</span>
             </div>
             {isUnderReview ? (
                <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1.5 shrink-0 shadow-xs">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                   <span className="animate-pulse">Under Review</span>
                </div>
             ) : isDraft ? (
                <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-200 bg-amber-50 text-amber-600 flex items-center gap-1.5 shrink-0">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                   <span>Draft</span>
                </div>
             ) : (
                <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center gap-1.5 shrink-0">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   <span>Running</span>
                </div>
             )}
          </div>
       </div>

       {/* Right: Actions */}
       <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(c); }} 
            className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Edit
          </button>
          {isDraft ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onSubmit && onSubmit(c); }} 
              className="px-4 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white font-extrabold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Launch
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onManage && onManage(c); }} 
              className="px-4 py-2.5 bg-[#5438FF] hover:bg-[#432EE0] text-white font-extrabold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
            >
              Manage <ChevronRight size={14}/>
            </button>
          )}
       </div>
    </div>
  );
}
