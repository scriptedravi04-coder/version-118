import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { PlusCircle, LayoutGrid, Clock, Film, ShieldCheck, CheckCircle2, AlertTriangle, ExternalLink, Send, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UgcOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);

  // Post form state
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Fashion");
  const [videoLength, setVideoLength] = useState("30s");
  const [instructions, setInstructions] = useState("");
  const [refLink, setRefLink] = useState("");
  const [budget, setBudget] = useState("");

  // Submission video state for creator
  const [submitOrderId, setSubmitOrderId] = useState(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("ugc-orders")
      .then(({ data }) => setOrders(data))
      .catch((e) => toast.error("Failed to load UGC Orders"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!productName || !budget) {
      toast.error("Please fill in required fields.");
      return;
    }
    try {
      await api.post("ugc-orders", {
        product_name: productName,
        category,
        video_length: videoLength,
        instructions,
        ref_link: refLink,
        budget,
      });
      toast.success("Instant 24-Hour UGC Order Brief posted!");
      setShowPostModal(false);
      // Reset
      setProductName("");
      setInstructions("");
      setRefLink("");
      setBudget("");
      load();
    } catch {
      toast.error("Failed to post order. Try again.");
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await api.post(`/ugc-orders/${orderId}/accept`);
      toast.success("Order claimed! 24-Hour Countdown Started.");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to claim order.");
    }
  };

  const triggerInHouse = async (orderId) => {
    try {
      await api.post(`/ugc-orders/${orderId}/in-house`);
      toast.success("SLA backup triggered! In-house team assigned.");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || e?.message || "Failed to trigger in-house override.");
    }
  };

  const submitVideo = async (e) => {
    e.preventDefault();
    if (!deliveryUrl) {
      toast.error("Please provide link.");
      return;
    }
    try {
      await api.post(`/ugc-orders/${submitOrderId}/submit`, { video_url: deliveryUrl });
      toast.success("Success! UGC Video project submitted to brand.");
      setSubmitOrderId(null);
      setDeliveryUrl("");
      load();
    } catch {
      toast.error("Failed to submit delivery.");
    }
  };

  return (
    <div className="w-full max-w-none px-4 sm:px-6 md:px-10 py-10" data-testid="ugc-orders-page">
      {/* SLA Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-tr from-card via-background/80 to-card border border-[var(--border-default)] xl:bg-gradient-to-r rounded-[28px] p-6 sm:p-10 md:p-12 mb-10 shadow-lg shadow-foreground/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="relative z-10 max-w-2xl">
          
          <h1 className="font-display text-4xl sm:text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight">
            Live UGC <br />
            <span className="text-[#a18bf1] font-black drop-shadow-sm">Video Orders</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-4 text-sm leading-relaxed">
            Bridge the content gap instantly. Brands post high-priority product video briefs, and creators claim orders to produce original, mobile-optimized reviews within <span className="font-bold border-b-2 border-foreground/30 pb-0.5">24 hours</span>.
            {user?.role === "brand" && (
              <>
                <br /><br />
                <span className="text-[var(--text-primary)] font-black">🤝 Secured Escrow protection:</span> Your payouts are safely held in Ybex neutral escrow prior to submission.
                <br />
                <span className="text-[var(--text-primary)] font-black">🛡️ The Ybex SLA Guarantee:</span> If no local creator claims and starts your brief within <span className="font-bold">15 hours</span>, our dedicated in-house creative agency is instantly auto-notified to produce and hand over your assets on schedule!
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            {user?.role === "brand" ? (
              <button
                onClick={() => setShowPostModal(true)}
                className="px-6 py-3 bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)] rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-[1.03] shadow-[0_4px_20px_rgba(124,58,237,0.35)] flex items-center gap-2"
              >
                <PlusCircle size={15}/> Post UGC Requirement
              </button>
            ) : user?.role === "creator" ? (
              <div className="text-xs text-[var(--text-secondary)] bg-foreground/5 px-4 py-2 rounded-xl border border-foreground/5">
                👋 You are logged in as a <span className="text-[var(--violet)] font-bold">Creator</span>. Scroll below to claim live orders and start earning!
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/signup?role=brand")}
                  className="px-5 py-2.5 bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)] rounded-xl text-xs font-black uppercase tracking-wider transition-all transform hover:scale-[1.03] shadow-lg"
                >
                  Post as Brand
                </button>
                <button
                  onClick={() => navigate("/signup?role=creator")}
                  className="px-5 py-2.5 bg-foreground/10 hover:bg-foreground/15 text-[var(--text-primary)] rounded-xl text-xs font-bold uppercase tracking-wider border border-[var(--border-default)] transition-all"
                >
                  Apply as Creator
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Dynamic decorative icon */}
        <div className="relative flex justify-center items-center h-48 w-48 bg-[var(--violet)]/10 border border-[var(--violet)]/20 rounded-full shadow-[inset_0_0_30px_rgba(124,92,255,0.2)] animate-pulse hidden md:flex">
          <Film size={60} className="text-[var(--violet)] opacity-75"/>
        </div>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center justify-between pb-3 border-b border-foreground/5">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <LayoutGrid size={18} className="text-[#7C5CFF]"/> Open UGC Video Briefs
          </h2>
          <button onClick={load} className="text-xs font-black text-[var(--text-secondary)] hover:text-[var(--violet)]">Refresh List ↺</button>
        </div>

        {loading ? (
          <div className="py-24 text-center text-[var(--text-tertiary)]">Loading digital requests...</div>
        ) : orders.length === 0 ? (
          <div className="bg-[var(--bg-card)]/60 border border-foreground/5 rounded-2xl p-16 text-center text-[var(--text-tertiary)]">
            No UGC orders are currently open. Check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {orders?.map((o, idx) => {
                const mine = o.brand_user_id === user?.user_id;
                const statusLower = (o.status || "").toLowerCase();
                const isAccepted = statusLower === "accepted" || statusLower === "in_progress";
                const isSubmitted = statusLower === "submitted" || statusLower === "completed";
                const isInHouse = statusLower === "in_house_backup" || statusLower === "in_house_assigned" || !!o.in_house_assigned;
                const isOpen = statusLower === "open";
                
                return (
                  <motion.div 
                    key={`${o.order_id}-${idx}`}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`card-dark p-4 sm:p-6 flex flex-col justify-between border ${isSubmitted ? "border-emerald-500/30" : isAccepted ? "border-[var(--violet)]/20" : "border-[var(--border-default)]"} hover:border-foreground/20 transition-all hover:shadow-[0_8px_32px_rgba(124,92,255,0.12)]`}
                  >
                  <div>
                    {/* Header: Company and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-2 mb-3">
                      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                        <div className="flex items-center gap-2.5">
                          <img src={o.brand_logo || undefined} alt="" className="w-8 h-8 rounded-lg bg-foreground/10 object-cover"/>
                          <div className="min-w-0">
                            <div className="text-[10px] sm:text-xs font-black text-[var(--text-secondary)] truncate uppercase tracking-widest">{o.brand_name}</div>
                            <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight">{o.product_name}</div>
                          </div>
                        </div>
                        <div className="sm:hidden">
                           {/* Status Pills (Mobile duplicate) */}
                           <div className="flex overflow-x-auto hide-scrollbar snap-x max-w-[120px] justify-end">
                           {isSubmitted ? (
                             <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shrink-0 snap-end">
                               <CheckCircle2 size={10}/> Delivered
                             </span>
                           ) : isInHouse ? (
                             <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/35 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shrink-0 snap-end">
                               Backup Assigned
                             </span>
                           ) : isAccepted ? (
                             <span className="px-2 py-0.5 rounded bg-[#4F46E5]/15 text-[var(--violet)] border border-[#4F46E5]/35 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse whitespace-nowrap shrink-0 snap-end">
                               <Clock size={10}/> 24h timer
                             </span>
                           ) : (
                             <span className="px-2 py-0.5 rounded bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)] text-[8px] font-black uppercase tracking-widest whitespace-nowrap shrink-0 snap-end">
                               Open
                             </span>
                           )}
                           </div>
                        </div>
                      </div>
                      
                      {/* Status Pills (Desktop) */}
                      <div className="hidden sm:flex overflow-x-auto hide-scrollbar max-w-[200px] justify-end">
                        {isSubmitted ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shrink-0">
                            <CheckCircle2 size={11}/> Delivered
                          </span>
                        ) : isInHouse ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/35 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 whitespace-nowrap shrink-0">
                            🔥 Ybex Studio SLA Backup Assigned
                          </span>
                        ) : isAccepted ? (
                          <span className="px-2 py-0.5 rounded bg-[#4F46E5]/15 text-[var(--violet)] border border-[#4F46E5]/35 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse whitespace-nowrap shrink-0">
                            <Clock size={11}/> Production (24h timer)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)] text-[9px] font-black uppercase tracking-widest whitespace-nowrap shrink-0">
                            Open request
                          </span>
                        )}
                      </div>
                    </div>


                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 font-sans line-clamp-3">
                      {o.instructions}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-foreground/2 border border-foreground/5 text-[var(--text-secondary)]">{o.category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-foreground/2 border border-foreground/5 text-[var(--text-secondary)]">Length: {o.video_length}</span>
                      {o.ref_link && (
                        <a href={o.ref_link} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                          Reference <ExternalLink size={9}/>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-4 border-t border-foreground/5 flex items-center justify-between gap-4 mt-auto">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] leading-none mb-1">Payout Budget</div>
                      <div className="text-lg font-display font-black text-[var(--text-primary)]">
                        ₹{new Intl.NumberFormat("en-IN").format(o.budget)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Case 1: Mine and Open, show option to trigger In-House */}
                      {mine && (isOpen || isAccepted) && (
                        <button
                          onClick={() => triggerInHouse(o.order_id)}
                          className="px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-wide rounded-lg flex items-center gap-1.5"
                          title="Instantly deploy internal team to produce"
                        >
                          Manager Override
                        </button>
                      )}

                      {/* Case 2: Deliver Completed (Submit delivery link modal) */}
                      {isAccepted && (o.accepted_by_creator_id === user?.user_id || user?.role === "admin" || !o.accepted_by_creator_id) && (
                        <button
                          onClick={() => setSubmitOrderId(o.order_id)}
                          className="px-4 py-2 bg-[#D1F23F] text-black font-black text-[10px] uppercase tracking-wider rounded-lg hover:scale-105 transition-all flex items-center gap-1"
                        >
                          <Send size={11}/> Submit Delivery
                        </button>
                      )}

                      {/* Case 3: Claim / Apply actions */}
                      {isOpen && (
                        user?.role === "creator" || user?.role === "admin" ? (
                          <button
                            onClick={() => handleAccept(o.order_id)}
                            className="px-4 py-2 bg-[var(--violet)] text-white font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-[#6849E0] transition-all flex items-center gap-1"
                          >
                            Claim Brief <ArrowRight size={11}/>
                          </button>
                        ) : !user ? (
                          <button
                            onClick={() => {
                              toast.info("Please sign up first to claim this live order brief!");
                              navigate("/signup?role=creator");
                            }}
                            className="px-4 py-2 bg-[var(--violet)] text-white font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-[#6849E0] transition-all flex items-center gap-1"
                          >
                            Claim Brief <ArrowRight size={11}/>
                          </button>
                        ) : user?.role === "brand" ? (
                          <span className="text-[10px] text-[var(--text-tertiary)] italic font-medium pt-2">Open to Vetted Creators</span>
                        ) : null
                      )}

                      {/* View Submission if ready */}
                      {isSubmitted && o.submitted_video_url && (
                        <a
                          href={o.submitted_video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-wider rounded-lg inline-flex items-center gap-1"
                        >
                          Watch Video <ExternalLink size={11}/>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status subtitle info */}
                  {(isAccepted || isInHouse) && (
                    <div className="mt-4 pt-2.5 border-t border-foreground/5 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                      <Clock size={11} className="text-[var(--violet)]"/>
                      <span>
                        Claimed by: <span className="text-[var(--text-primary)] font-semibold">{o.accepted_by_creator_name || "Vetted Creator"}</span>
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          </div>
        )}
      </div>

      {/* POST UGC ORDER MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border-default)] mb-6">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                 Create 24h UGC Brief
              </h3>
              <button onClick={() => setShowPostModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] font-bold p-1">&times;</button>
            </div>

            <form onSubmit={handlePost} className="space-y-4 text-sm text-[var(--text-primary)]">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise-Cancelling Earbuds Max"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Product Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                  >
                    <option value="Fashion">Fashion</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Tech">Tech</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Food & Beverages">Food & Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Video Length</label>
                  <select
                    value={videoLength}
                    onChange={(e) => setVideoLength(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                  >
                    <option value="15s">15s Short Hook</option>
                    <option value="30s">30s Key Features</option>
                    <option value="60s">60s Full Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Brief / Instructions *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Clearly detail key talking points, hooks, the style of recording, or background aesthetic requirements."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Reference Product URL</label>
                <input
                  type="url"
                  placeholder="https://amazon.in/product-page"
                  value={refLink}
                  onChange={(e) => setRefLink(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider block mb-1 text-[var(--text-secondary)]">Offer Payout Budget (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 4500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div className="pt-4 border-t border-[var(--border-default)] flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowPostModal(false)} className="px-4 py-2 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[var(--violet)] text-white font-black text-xs uppercase tracking-wide rounded-xl">Create Live Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT RECORDED LINK MODAL */}
      {submitOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6">
            <h3 className="font-display font-black text-base uppercase text-[var(--text-primary)] mb-3">Submit your Completed UGC Video</h3>
            <p className="text-xs text-[var(--text-primary)]/55 leading-relaxed mb-4">Paste the link where the brand or admin can download or review your raw or produced MP4 video file (e.g. Google Drive, YouTube link, Dropbox, Dropbox Replay, cloud storage, etc.).</p>
            <form onSubmit={submitVideo} className="space-y-4">
              <input
                type="url"
                required
                placeholder="https://drive.google.com/your-drive-link-path"
                value={deliveryUrl}
                onChange={(e) => setDeliveryUrl(e.target.value)}
                className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#7C5CFF]"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setSubmitOrderId(null)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#D1F23F] text-black font-black uppercase tracking-wide rounded-xl">Deliver Video</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
