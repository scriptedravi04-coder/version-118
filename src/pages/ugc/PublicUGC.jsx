import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Play, TrendingUp, Clock, MapPin, Zap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicUGC() {
  const [showcase, setShowcase] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("ugc/showcase").then(res => setShowcase(res.data)).catch(() => {});
  }, []);

  const handlePost = () => {
    if (user?.role === 'brand') navigate("/brand/ugc/post");
    else navigate("/login");
  };

  const handleApply = () => {
    if (user?.role === 'creator') navigate("/creator/ugc/browse");
    else navigate("/login");
  };

  return (
    <div className="w-full bg-[var(--bg-base)] min-h-screen text-[var(--text-primary)] font-sans">
      
      {/* Hero Section */}
      <div className="max-w-none px-4 md:px-8 py-16 md:py-24 text-center">
        
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
          Live UGC <br className="md:hidden"/>
          <span className="text-[var(--violet)]">Video Orders</span>
        </h1>
        <p className="text-[var(--text-tertiary)] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Bridge the content gap instantly. Brands post high-priority product video briefs, and creators claim orders to produce original, mobile-optimized reviews within 24 hours.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={handlePost} className="w-full sm:w-auto bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold uppercase tracking-wider text-sm px-8 py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(124,58,237,0.3)] active:scale-95">
            Post as Brand
          </button>
          <button onClick={handleApply} className="w-full sm:w-auto bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-sm px-8 py-3.5 rounded-xl transition-all border border-[var(--border-default)] active:scale-95">
            Apply as Creator
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="border-y border-[var(--border-default)] bg-white/[0.02] py-8">
        <div className="max-w-none px-4 md:px-8 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <h3 className="text-3xl font-black text-[var(--text-primary)]">140K+</h3>
            <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest mt-1">Creators</p>
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-black text-[var(--text-primary)]">500+</h3>
            <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest mt-1">Cities</p>
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-black text-[var(--violet)]">24hr</h3>
            <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest mt-1">Turnaround</p>
          </div>
          <div className="text-center">
            <h3 className="text-3xl font-black text-[var(--text-primary)]">₹2000</h3>
            <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest mt-1">Avg UGC</p>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="max-w-none px-4 md:px-8 py-20">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-12">How it Works</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/20 rounded-full blur-3xl" />
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)] border-b border-[var(--border-default)] pb-4">Brand Side</h3>
            <ol className="space-y-6 text-[var(--text-tertiary)]">
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold mt-0.5">1</span> <div><strong className="text-[var(--text-primary)]">Post Brief</strong><br/>Define deliverables, dos, donts, and budget.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold mt-0.5">2</span> <div><strong className="text-[var(--text-primary)]">Pay & Hold Budget</strong><br/>Escrow secures the transaction.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold mt-0.5">3</span> <div><strong className="text-[var(--text-primary)]">Track Progress</strong><br/>Live updates as creator works.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--violet)] text-white flex items-center justify-center text-xs font-bold mt-0.5">4</span> <div><strong className="text-[var(--text-primary)]">Approve & Done</strong><br/>Review content and release payment.</div></li>
            </ol>
            <button onClick={handlePost} className="mt-8 w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(124,58,237,0.15)]">Post as Brand</button>
          </div>

          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
            <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)] border-b border-[var(--border-default)] pb-4">Creator Side</h3>
            <ol className="space-y-6 text-[var(--text-tertiary)]">
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</span> <div><strong className="text-[var(--text-primary)]">Browse Briefs</strong><br/>Find open orders you match.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</span> <div><strong className="text-[var(--text-primary)]">Claim Order</strong><br/>Commit to a 22-hour delivery window.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</span> <div><strong className="text-[var(--text-primary)]">Create in 22hrs</strong><br/>Shoot and upload the video directly.</div></li>
              <li className="flex gap-4 items-start"><span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">4</span> <div><strong className="text-[var(--text-primary)]">Get Paid Fast</strong><br/>Payment released upon brand approval.</div></li>
            </ol>
            <button onClick={handleApply} className="mt-8 w-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-sm px-6 py-3 border border-[var(--border-default)] rounded-xl transition-all">Apply as Creator</button>
          </div>

        </div>
      </div>

      {/* Showcase Grid */}
      <div className="max-w-none px-4 md:px-8 py-12 mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">UGC Videos We've Delivered</h2>
          <button className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest hover:text-[var(--violet)] transition-colors flex items-center gap-1">
            Refresh <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          </button>
        </div>

        {showcase.length > 0 ? (
          <div 
            style={{
              display: "grid",
              width: "100%",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              gap: "24px",
            }}
          >
            {showcase?.map((item, idx) => (
              <div key={item.id || idx} className="relative aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer border border-[var(--border-default)]">
                <img src={item.thumbnail_url || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800"} alt="UGC" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-[var(--text-primary)]">
                    <Play size={24} className="ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                  <span className="bg-[var(--violet)] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">{item.category || "UGC Content"}</span>
                  <span className="bg-black/50 backdrop-blur-sm text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[var(--border-default)]">{item.deliverable_type?.replace(/_/g," ") || "Instagram Reel"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[var(--bg-elevated)] rounded-3xl border border-[var(--border-default)]">
            <span className="text-[var(--text-secondary)]">More videos coming soon...</span>
          </div>
        )}
      </div>

    </div>
  );
}
