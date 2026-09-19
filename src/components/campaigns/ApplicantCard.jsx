import React from "react";
import { MessageSquare, X, Check, Eye } from "lucide-react";
import { Badge } from "@/components/common/Badge";

export default function ApplicantCard({ applicant, onShortlist, onReject, onViewProfile, onChat }) {
  const a = applicant;
  
  // Format followers display
  let followersCount = "0";
  const rawFollowers = a.followers_count ?? a.follower_count ?? a.followers ?? a.followers_instagram ?? a.ig_followers;
  
  if (typeof rawFollowers === 'number') {
    if (rawFollowers >= 1000000) followersCount = (rawFollowers / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
    else if (rawFollowers >= 1000) followersCount = (rawFollowers / 1000).toFixed(1).replace(/\.0$/, '') + "K";
    else followersCount = rawFollowers.toLocaleString();
  } else if (rawFollowers) {
    let str = String(rawFollowers).toUpperCase().trim();
    let num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      if (str.includes('M')) num = num * 1000000;
      else if (str.includes('K')) num = num * 1000;
      
      if (num >= 1000000) followersCount = (num / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
      else if (num >= 1000) followersCount = (num / 1000).toFixed(1).replace(/\.0$/, '') + "K";
      else followersCount = num.toLocaleString();
    } else {
      followersCount = String(rawFollowers);
    }
  }

  // Clean social handle if URL was passed
  let cleanHandle = a.instagram_handle || a.handle || "creator";
  if (cleanHandle.includes("instagram.com/")) {
    cleanHandle = cleanHandle.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0] || cleanHandle;
  } else if (cleanHandle.startsWith("http://") || cleanHandle.startsWith("https://")) {
    try {
      const urlObj = new URL(cleanHandle);
      cleanHandle = urlObj.pathname.replace(/^\/+|\/+$/g, '').split("/")[0] || (a.full_name || "creator").toLowerCase().replace(/\s+/g, '_');
    } catch (e) {
      cleanHandle = (a.full_name || "creator").toLowerCase().replace(/\s+/g, '_');
    }
  }
  cleanHandle = cleanHandle.replace(/^@+/, '') || (a.full_name || "creator").toLowerCase().replace(/\s+/g, '_');

  const rateProposed = a.proposed_amount ? `₹${a.proposed_amount.toLocaleString()}` : "₹12,000";
  const estDelivery = a.delivery_days || "5 days";
  const status = a.status || "PENDING";
  const bio = a.pitch_text || "I've worked with top-tier electronic brands in India before. My technical reviews average 40k+ real reach with high retention.";

  return (
    <div className="bg-[var(--bg-card)]/80 border border-[var(--border-default)] p-5 rounded-2xl shadow-sm text-left relative overflow-hidden hover:border-[var(--violet)]/20 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Author Avatar & details */}
        <div className="flex items-start gap-3.5">
          <img 
            src={a.profile_photo_url || a.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} 
            alt={a.full_name} 
            className="w-12 h-12 rounded-xl object-cover border border-[var(--border-default)] shrink-0" 
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight">{a.full_name || "Creator"}</h4>
              <span className="text-xs font-mono font-bold text-[#9D7CFF]">{followersCount} followers</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-sans">
              <span>@{cleanHandle}</span>
              <span>•</span>
              <span>{a.category || "Lifestyle"}</span>
              <span>•</span>
              <span>{a.city || "India"}</span>
            </div>
          </div>
        </div>

        {/* Commercial summary */}
        <div className="bg-white/[0.02] border border-[var(--border-default)] px-4 py-2.5 rounded-xl text-left sm:text-right font-mono min-w-[140px]">
          <div className="text-[10px] text-[var(--text-tertiary)] uppercase">Proposed Fee</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">{rateProposed}</div>
          <div className="text-[9px] text-[var(--text-secondary)] mt-1">Delivery: {estDelivery}</div>
        </div>
      </div>

      {/* Pitch pitch */}
      <div className="mt-4 bg-white/[0.02] border-l border-[var(--violet)]/30 pl-3.5 py-1 text-xs text-[var(--text-secondary)] leading-relaxed italic">
        &ldquo;{bio}&rdquo;
      </div>

      {/* Actions */}
      <div className="mt-5 pt-4 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => onViewProfile && onViewProfile(a)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Eye size={13} /> View Profile
        </button>

        {status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReject && onReject(a)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X size={14} /> Reject
            </button>
            
            <button
              onClick={() => onShortlist && onShortlist(a)}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[var(--violet)] hover:bg-[#6B4AFF] text-[var(--text-primary)] shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare size={14} /> Shortlist & Chat
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={status}>{status}</Badge>
            {status === 'ACCEPTED' && (
               <button
                 onClick={() => onChat && onChat(a)}
                 className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[var(--violet)] hover:bg-[#6B4AFF] text-[var(--text-primary)] shadow-md transition-all cursor-pointer flex items-center gap-1.5"
               >
                 <MessageSquare size={14} /> Chat
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
