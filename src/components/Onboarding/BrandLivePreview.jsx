import React from "react";
import { Link2, MapPin, Building2 } from "lucide-react";

export default function BrandLivePreview({ formData }) {
  const rawCompanyName = formData?.companyName?.trim() || "";
  const hasCustomName = rawCompanyName && rawCompanyName.toLowerCase() !== "your brand";
  const companyName = hasCustomName ? rawCompanyName : "";
  const displayName = companyName
    ? companyName.length > 15
      ? companyName.substring(0, 15) + "..."
      : companyName
    : null;

  const handle = formData?.socialHandle || (companyName ? companyName.toLowerCase().replace(/\s+/g, "") : "");
  const description = formData?.description?.trim() || null;
  const category = formData?.industry?.trim() || null;

  const normalizeWebsiteUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const rawWebsite = formData?.website || formData?.websiteUrl || formData?.website_url || "";
  const websiteHref = normalizeWebsiteUrl(rawWebsite);
  const isValidWebsite = rawWebsite ? isValidUrl(websiteHref) : false;

  const location = formData?.city
    ? formData?.city + (formData?.state ? `, ${formData?.state}` : "")
    : null;

  const twitterUrl = formData?.twitterUrl || formData?.twitter_url || (formData?.twitterHandle ? `https://x.com/${formData.twitterHandle}` : "");
  const instagramUrl = formData?.instagramUrl || formData?.instagram_url || (formData?.instagramHandle ? `https://instagram.com/${formData.instagramHandle}` : "");
  const facebookUrl = formData?.facebookUrl || formData?.facebook_url || "";

  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 w-full">
      <div className="relative w-full max-w-[320px]">
        {/* The Card */}
        <div className="rounded-3xl overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100">
          
          {/* Banner Area */}
          <div className="h-32 w-full relative bg-gradient-to-br from-slate-900 to-indigo-950 flex items-start justify-end p-5 overflow-hidden">
            {/* Watermark */}
            <div className="absolute top-4 right-4 opacity-40 select-none pointer-events-none">
              <span className="text-white font-display font-black text-3xl tracking-widest uppercase truncate max-w-[260px] block">
                {displayName || <span className="inline-block w-32 h-6 bg-white/20 rounded animate-pulse" />}
              </span>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-6 pb-8 relative">
            
            {/* Avatar */}
            <div className="-mt-10 mb-4 flex justify-start">
              <div className="w-[76px] h-[76px] rounded-full border-4 border-white bg-white shadow-sm overflow-hidden flex items-center justify-center relative z-10">
                {formData?.logoUrl ? (
                  <img src={formData.logoUrl} className="w-full h-full object-contain p-1" alt="Brand Logo" />
                ) : companyName ? (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white shadow-inner">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Building2 className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Title and Connect Button */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-xl text-slate-900 truncate">
                {displayName || <span className="inline-block w-28 h-6 bg-gray-200 rounded animate-pulse" />}
              </h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors shrink-0">
                Connect
              </button>
            </div>

            {/* Handle */}
            <p className="text-[13px] text-slate-500 font-medium mb-4">
              {handle ? `@${handle}` : <span className="inline-block w-20 h-4 bg-gray-200 rounded animate-pulse" />}
            </p>

            {/* Description */}
            <p className="text-[13px] text-slate-700 leading-relaxed min-h-[40px] mb-4">
              {description || "Please Tell Us About Your Brand A Bit More"}
            </p>

            {/* Category */}
            <div className="mb-6">
              {category ? (
                <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  {category}
                </span>
              ) : (
                <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  BRAND CATEGORY
                </span>
              )}
            </div>

            {/* Website Link */}
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={16} className="text-blue-500 shrink-0" />
              {rawWebsite ? (
                isValidWebsite ? (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-600 text-[13px] truncate">
                    {rawWebsite.replace(/^https?:\/\//i, "")}
                  </a>
                ) : (
                  <span className="truncate text-red-500 text-[13px]">{rawWebsite}</span>
                )
              ) : (
                <span className="text-slate-600 text-[13px] truncate">yourbrand.com</span>
              )}
            </div>

            {/* Location and Socials */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 truncate pr-2">
                <MapPin size={16} className="text-slate-400 shrink-0" />
                <span className="truncate text-[13px] text-slate-600">{location || "India"}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Twitter */}
                {twitterUrl ? (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors" title="Twitter / X">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                  </a>
                ) : (
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 opacity-80">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                  </span>
                )}
                {/* Instagram */}
                {instagramUrl ? (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors" title="Instagram">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                ) : (
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 opacity-80">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </span>
                )}
                {/* Facebook */}
                {facebookUrl ? (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors" title="Facebook">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                  </a>
                ) : (
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 opacity-80">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
