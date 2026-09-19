import React from "react";
import { t } from "@/lib/typography";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { MapPin } from "lucide-react";

const formatNum = (v) => {
  if (!v && v !== 0) return "0";
  let n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : v;
  if (isNaN(n)) return String(v);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + "K";
  return String(n);
};

export default function LivePreviewCard() {
  const {
    fullName,
    photoUrl,
    primaryNiche,
    city,
    followerCount,
    instagramAvgReach,
  } = useOnboardingStore();

  const name = fullName || "Your Name";
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const displayLocation = city ? city.split(',')[0].trim() : "Location";
  const displayNiche = (Array.isArray(primaryNiche) && primaryNiche.length > 0) ? primaryNiche[0] : (primaryNiche || "Category");
  
  // Use a default glow for the preview
  const glow = 'rgba(168,85,247,0.65)'; // Purple glow

  return (
    <div className="w-[310px] xl:w-[320px] shrink-0 pointer-events-none relative">
      {/* Top Badge */}
      <div className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/10 tracking-widest uppercase shadow-sm">
        LIVE PREVIEW
      </div>
      
      <div 
        className="creator-card block pointer-events-none" 
        style={{ '--card-glow': glow, height: '450px', width: '100%', aspectRatio: 'auto' } as React.CSSProperties}
      >
        {photoUrl ? (
          <img 
            className="creator-bg opacity-100 transition-opacity duration-500"
            src={photoUrl} 
            alt={name}
          />
        ) : (
          <div className="creator-bg-fallback">
            {initials}
          </div>
        )}
        
        <div className="creator-reach-block">
          <span className="crb-num">{formatNum(instagramAvgReach)}</span>
          <span className="crb-label">Average Reach</span>
        </div>
        
        <div className="creator-overlay">
          <div className="creator-overlay-top">
            <h3 className="creator-name line-clamp-2">{name}</h3>
          </div>
          <div className="creator-overlay-bottom">
            <div className="creator-stats">
              <div className="creator-meta"><strong>{formatNum(followerCount)}</strong> Followers</div>
              <div className="creator-location-row">
                <span className="creator-niche-pill">{displayNiche}</span>
                <div className="creator-location flex gap-1 items-center">
                  <MapPin size={11} className="shrink-0" />
                  {displayLocation}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
