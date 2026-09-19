import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import { t } from "@/lib/typography";

const CREATOR_GLOW_PALETTE = [
  'rgba(56,132,255,0.65)',   // blue
  'rgba(46,200,140,0.65)',   // green
  'rgba(168,85,247,0.65)',   // purple
  'rgba(20,184,166,0.65)',   // teal
  'rgba(244,114,182,0.65)',  // pink
  'rgba(251,146,60,0.65)',   // orange
  'rgba(234,179,8,0.65)'     // amber
];

const NICHE_GLOW = {
  fashion: 'rgba(244,114,182,0.65)',
  fitness: 'rgba(46,200,140,0.65)',
  health: 'rgba(46,200,140,0.65)',
  lifestyle: 'rgba(168,85,247,0.65)',
  travel: 'rgba(56,132,255,0.65)',
  tech: 'rgba(20,184,166,0.65)',
  food: 'rgba(251,146,60,0.65)',
  comedy: 'rgba(234,179,8,0.65)',
  entertainment: 'rgba(234,179,8,0.65)'
};

function pickCreatorGlow(id, niche) {
  const n = (niche || '').toLowerCase();
  for (const k in NICHE_GLOW) {
    if (n.includes(k)) return NICHE_GLOW[k];
  }
  const s = (id || '').toString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CREATOR_GLOW_PALETTE[Math.abs(h % CREATOR_GLOW_PALETTE.length)];
}

const formatNum = (v) => {
  if (!v && v !== 0) return "0";
  if (typeof v === 'string' && /[a-zA-Z]/.test(v)) return v;
  let n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : v;
  if (isNaN(n)) return String(v);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + "K";
  return String(n);
};

export default function CreatorCard({ c, index = 0 }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const totalFollowers = (c.followers_count) || ((c.followers_instagram || 0) + (c.followers_youtube || 0));
  const reach = c.avg_reach_per_reel || c.avg_views_30d || c.avg_reach || 0;
  
  const name = c.name || c.full_name || "Creator";
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const photoUrl = c.photo || c.profile_photo_url || c.picture;
  
  const niche = c.category || c.content_niches || "";
  const primaryNiche = niche.split(',')[0].trim();
  const city = c.city ? c.city.split(',')[0].trim() : "";
  
  const glow = pickCreatorGlow(c.user_id || c.id, primaryNiche || niche);

  return (
    <Link 
      to={`/creator/${c.user_id || c.id}`} 
      data-testid={`creator-card-${c.user_id || c.id}`}
      className="creator-card block"
      style={{ '--card-glow': glow }}
    >
      {photoUrl ? (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 bg-[var(--bg-elevated)] animate-pulse z-0 rounded-[20px]" />
          )}
          <img 
            className={`creator-bg ${imgLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
            src={photoUrl} 
            alt={name}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling.style.display = "flex";
              setImgLoaded(true);
            }}
          />
        </>
      ) : null}
      <div className="creator-bg-fallback" style={{ display: photoUrl ? 'none' : 'flex' }}>
        {initials}
      </div>

      <div className="creator-reach-block">
        <span className={`font-mono font-bold tracking-tight text-lg text-white drop-shadow-md leading-none`}>{formatNum(reach)}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider text-white/90 drop-shadow-md`}>Average Reach</span>
      </div>

      <div className="creator-overlay">
        <div className="creator-overlay-top">
          <h3 className={`text-lg font-bold tracking-tight text-white drop-shadow-md truncate`}>{name}</h3>
        </div>
        <div className="creator-overlay-bottom">
          <div className="creator-stats">
            <div className={`text-sm text-gray-500 text-white/90`}><strong className={`font-mono tracking-tight text-sm text-white mr-1`}>{formatNum(totalFollowers)}</strong> Followers</div>
            <div className="creator-location-row">
              {primaryNiche && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/10`}>{primaryNiche}</span>
              )}
              {city && (
                <div className={`text-[11px] font-medium flex gap-1 items-center text-white/90 drop-shadow-md`}>
                  <MapPin size={11} className="shrink-0" />
                  {city}
                  {typeof c._distance === 'number' && (
                    <span className="opacity-75">
                      ({c._distance} km away)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
