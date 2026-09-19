import React, { useState, useRef, useEffect } from 'react';
import { Play, ExternalLink, Video, Youtube, Instagram, HardDrive, AlertCircle, RefreshCw, Maximize2, Minimize2, Lock } from 'lucide-react';

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (!clean) return '';

  const supabaseUrl = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || 
                      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                      'https://mzcovvzkwzjvzskjqwwy.supabase.co';

  // Fix pseudo/malformed URLs like "https://ugc-videos/..." or "http://ugc-videos/..."
  if (clean.startsWith('https://ugc-videos/') || clean.startsWith('http://ugc-videos/')) {
    const pathPart = clean.replace(/^https?:\/\/ugc-videos\//, '');
    return `${supabaseUrl}/storage/v1/object/public/content-submissions/ugc-videos/${pathPart}`;
  }
  if (clean.startsWith('https://content-submissions/') || clean.startsWith('http://content-submissions/')) {
    const pathPart = clean.replace(/^https?:\/\/content-submissions\//, '');
    return `${supabaseUrl}/storage/v1/object/public/content-submissions/${pathPart}`;
  }
  if (clean.startsWith('https://chat-submissions/') || clean.startsWith('http://chat-submissions/')) {
    const pathPart = clean.replace(/^https?:\/\/chat-submissions\//, '');
    return `${supabaseUrl}/storage/v1/object/public/content-submissions/chat-submissions/${pathPart}`;
  }

  // If already absolute http/https/blob/data
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:') || clean.startsWith('data:')) {
    return clean;
  }

  // Supabase storage bucket relative paths
  if (clean.startsWith('ugc-videos/')) {
    return `${supabaseUrl}/storage/v1/object/public/content-submissions/${clean}`;
  }
  if (clean.startsWith('chat-submissions/')) {
    return `${supabaseUrl}/storage/v1/object/public/content-submissions/${clean}`;
  }
  if (clean.startsWith('content-submissions/')) {
    return `${supabaseUrl}/storage/v1/object/public/${clean}`;
  }
  if (clean.startsWith('live-proofs/')) {
    return `${supabaseUrl}/storage/v1/object/public/live-proofs/${clean.replace(/^live-proofs\//, '')}`;
  }
  if (clean.startsWith('ugc-assets/')) {
    return `${supabaseUrl}/storage/v1/object/public/ugc-assets/${clean.replace(/^ugc-assets\//, '')}`;
  }
  if (clean.startsWith('/uploads/') || clean.startsWith('uploads/')) {
    return clean.startsWith('/') ? clean : `/${clean}`;
  }

  return `https://${clean}`;
}

export function parseVideoLink(url) {
  if (!url || typeof url !== 'string') return null;
  const resolvedUrl = resolveMediaUrl(url);
  const cleanUrl = resolvedUrl.trim();

  // 1. YouTube & Shorts
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const isShorts = cleanUrl.includes('/shorts/');
    return {
      type: 'youtube',
      isShorts,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&autoplay=0`,
      videoId: ytMatch[1],
      originalUrl: cleanUrl
    };
  }

  // 2. Instagram Reels & Posts
  const igMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_\-]+)/i);
  if (igMatch && igMatch[1]) {
    const isReel = cleanUrl.includes('/reel/') || cleanUrl.includes('/reels/');
    return {
      type: 'instagram',
      isReel,
      embedUrl: isReel 
        ? `https://www.instagram.com/reel/${igMatch[1]}/embed/` 
        : `https://www.instagram.com/p/${igMatch[1]}/embed/`,
      postId: igMatch[1],
      originalUrl: cleanUrl
    };
  }

  // 3. Google Drive Video
  const driveMatch = cleanUrl.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_\-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'gdrive',
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      fileId: driveMatch[1],
      originalUrl: cleanUrl
    };
  }

  // 4. Vimeo
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
      videoId: vimeoMatch[3],
      originalUrl: cleanUrl
    };
  }

  // 5. Direct Video File (.mp4, .webm, .mov, blob, Supabase storage, etc.)
  if (
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(cleanUrl) || 
    cleanUrl.includes('blob:') || 
    cleanUrl.includes('video/upload') || 
    cleanUrl.includes('supabase.co/storage') ||
    cleanUrl.includes('/object/public/') ||
    cleanUrl.includes('/uploads/')
  ) {
    return {
      type: 'direct_video',
      embedUrl: cleanUrl,
      originalUrl: cleanUrl
    };
  }

  // 6. Generic external link
  return {
    type: 'external',
    embedUrl: cleanUrl,
    originalUrl: cleanUrl
  };
}

// --- YBEX WATERMARK OVERLAY ---
// Subtle, blended, non-intrusive watermark overlay (no heavy box, clean typography, low opacity)
export function YbexWatermarkOverlay({ label = "Ybex Protected Draft", isFullscreen = false }) {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none z-20 overflow-hidden select-none flex flex-col justify-between p-3 sm:p-4 ${
        isFullscreen ? 'p-6 md:p-8' : ''
      }`}
      aria-hidden="true"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* 1. Discrete Top Corner Badge */}
      <div className="flex items-center justify-between w-full pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-semibold shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{label}</span>
        </div>
        <div className="text-[10px] font-mono font-bold text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/15 shadow-sm hidden md:block">
          Unapproved Draft
        </div>
      </div>

      {/* 2. Clean, Softly-Blended Center Watermark (Balanced contrast on both white and dark backgrounds) */}
      <div className="flex items-center justify-center pointer-events-none select-none my-auto">
        <span 
          className="text-xl sm:text-2xl md:text-3.5xl font-black tracking-widest uppercase -rotate-12 select-none font-mono pointer-events-none text-white/30"
          style={{
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
            WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.25)',
          }}
        >
          YBEX PREVIEW
        </span>
      </div>

      {/* Bottom spacer so playback timeline scrubber stays completely clear */}
      <div className="h-8 sm:h-10 pointer-events-none" />
    </div>
  );
}

export default function VideoEmbedPreview({ 
  url, 
  title, 
  className = "", 
  aspectRatio = "aspect-video",
  watermark = true,
  isApproved = false,
  showWatermark = undefined
}) {
  const [loadError, setLoadError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const videoInfo = parseVideoLink(url);

  // If showWatermark explicitly provided, use it; otherwise show watermark if watermark is true and not yet approved
  const isWatermarkActive = showWatermark !== undefined ? showWatermark : (watermark && !isApproved);

  // Sync fullscreen state across document events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl = document.fullscreenElement || document.webkitFullscreenElement;
      const isTargetFullscreen = activeEl === containerRef.current;
      setIsFullscreen(Boolean(isTargetFullscreen));

      // If native video element was triggered into fullscreen, switch fullscreen to container
      if (activeEl === videoRef.current && containerRef.current) {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => {
            if (containerRef.current?.requestFullscreen) {
              containerRef.current.requestFullscreen().catch(() => {});
            }
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  if (!url || !videoInfo) {
    return (
      <div className={`w-full ${aspectRatio} bg-[var(--bg-elevated)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-tertiary)] p-4 border border-[var(--border-default)] ${className}`}>
        <Video size={32} className="mb-2 opacity-50 text-[var(--violet)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">No video link provided</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`w-full ${aspectRatio} bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-2xl flex flex-col items-center justify-center p-4 text-center border border-[var(--border-default)] ${className}`}>
        <AlertCircle size={28} className="text-amber-500 mb-2" />
        <p className="text-xs font-bold mb-2">{title || "Video Preview Unavailable"}</p>
        <a 
          href={videoInfo.originalUrl} 
          target="_blank" 
          rel="noreferrer"
          className="px-3.5 py-1.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <ExternalLink size={12} /> Open in New Tab
        </a>
      </div>
    );
  }

  // Render YouTube / Shorts
  if (videoInfo.type === 'youtube') {
    if (videoInfo.isShorts) {
      return (
        <div 
          ref={containerRef}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative w-full max-w-[340px] sm:max-w-[360px] aspect-[9/16] max-h-[55vh] mx-auto bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] select-none ${className}`}
        >
          <iframe
            src={videoInfo.embedUrl}
            title={title || "YouTube Shorts"}
            className="w-full h-full border-0 rounded-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onError={() => setLoadError(true)}
          />
          {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
        </div>
      );
    }
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full max-w-2xl ${aspectRatio} mx-auto bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] select-none ${className}`}
      >
        <iframe
          src={videoInfo.embedUrl}
          title={title || "YouTube video"}
          className="w-full h-full border-0 rounded-2xl"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={() => setLoadError(true)}
        />
        {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
      </div>
    );
  }

  // Render Instagram Reel / Post Embed
  if (videoInfo.type === 'instagram') {
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full max-w-[340px] sm:max-w-[360px] h-[480px] sm:h-[520px] max-h-[58vh] mx-auto bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] flex flex-col select-none ${className}`}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-500">
            <Instagram size={13} />
            <span>{videoInfo.isReel ? "Instagram Reel" : "Instagram Post"}</span>
          </div>
          {isApproved && (
            <a
              href={videoInfo.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 bg-[var(--bg-card)] hover:bg-[var(--border-default)] px-2 py-0.5 rounded-md border border-[var(--border-default)] transition-colors"
            >
              <span>Open in App</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        <div className="relative flex-1 w-full bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
          <iframe
            src={videoInfo.embedUrl}
            title={title || "Instagram Reel"}
            className="w-full h-full border-0"
            allowtransparency="true"
            allowFullScreen
            allow="encrypted-media"
            onError={() => setLoadError(true)}
          />
          {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
        </div>
      </div>
    );
  }

  // Render Google Drive Video
  if (videoInfo.type === 'gdrive') {
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full max-w-2xl ${aspectRatio} mx-auto bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] select-none ${className}`}
      >
        <iframe
          src={videoInfo.embedUrl}
          title={title || "Google Drive Video"}
          className="w-full h-full border-0 rounded-2xl"
          allow="autoplay"
          allowFullScreen
          onError={() => setLoadError(true)}
        />
        
        {/* Anti-Download Shield: Blocks Google Drive's top-right Pop-out/Download icon before approval */}
        {!isApproved && (
          <div 
            className="absolute top-0 right-0 w-24 h-16 z-25 bg-transparent pointer-events-auto cursor-default" 
            title="Ybex Escrow Protected - Direct download disabled until approval"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}

        {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
      </div>
    );
  }

  // Render Vimeo
  if (videoInfo.type === 'vimeo') {
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full max-w-2xl ${aspectRatio} mx-auto bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] select-none ${className}`}
      >
        <iframe
          src={videoInfo.embedUrl}
          title={title || "Vimeo Video"}
          className="w-full h-full border-0 rounded-2xl"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onError={() => setLoadError(true)}
        />
        {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
      </div>
    );
  }

  // Render Direct HTML5 Video
  if (videoInfo.type === 'direct_video') {
    return (
      <div 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full max-w-2xl max-h-[58vh] mx-auto bg-black rounded-2xl overflow-hidden shadow-sm border border-[var(--border-default)] flex items-center justify-center select-none group ${
          isFullscreen ? '!max-w-7xl !max-h-none !w-screen !h-screen !rounded-none !border-0' : ''
        } ${className}`}
      >
        <video
          ref={videoRef}
          src={videoInfo.embedUrl}
          controls
          controlsList="nodownload nofullscreen"
          disablePictureInPicture
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          className={`protected-video-el w-full h-full object-contain ${isFullscreen ? 'h-screen' : 'max-h-[58vh] rounded-2xl'}`}
          onError={() => setLoadError(true)}
        />

        {/* Clean, Non-Glitchy Fullscreen Toggle Button Placed at Bottom Right */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={`absolute ${
            isFullscreen ? 'bottom-5 right-5' : 'bottom-2.5 right-2.5'
          } z-30 px-2.5 py-1.5 bg-black/75 hover:bg-black/95 text-white/90 hover:text-white rounded-xl backdrop-blur-md transition-all border border-white/20 cursor-pointer flex items-center gap-1.5 text-[11px] font-bold shadow-xl`}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <>
              <Minimize2 size={13} />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </button>

        {/* Watermark overlay remains active across all sizes and fullscreen */}
        {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
      </div>
    );
  }

  // Fallback / External link
  return (
    <div 
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full ${aspectRatio} bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-2xl p-5 flex flex-col justify-between border border-[var(--border-default)] shadow-xs select-none ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider uppercase bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)] px-2.5 py-1 rounded-lg">
          Protected Draft
        </span>
        {isApproved && (
          <a
            href={videoInfo.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-[var(--bg-card)] hover:bg-[var(--border-default)] border border-[var(--border-default)] rounded-xl text-[var(--text-secondary)] transition-colors"
            title="Open link in new tab"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="my-auto text-center py-2 relative z-10">
        <div className="w-12 h-12 bg-[var(--violet-soft)] rounded-full flex items-center justify-center mx-auto mb-2 text-[var(--violet)] border border-[var(--violet-border)]">
          <Play size={20} className="ml-0.5 fill-[var(--violet)]" />
        </div>
        <p className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{title || "View Campaign Deliverable"}</p>
        <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[240px] mx-auto mt-0.5">Ybex Escrow Protected Asset</p>
      </div>

      {isApproved ? (
        <a
          href={videoInfo.originalUrl}
          target="_blank"
          rel="noreferrer"
          download
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition-colors shadow-xs"
        >
          Download Master Deliverable
        </a>
      ) : (
        <div className="w-full py-2 bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-tertiary)] rounded-xl text-[11px] font-medium text-center">
          🔒 Download unlocks after approval
        </div>
      )}

      {isWatermarkActive && <YbexWatermarkOverlay isFullscreen={isFullscreen} />}
    </div>
  );
}
