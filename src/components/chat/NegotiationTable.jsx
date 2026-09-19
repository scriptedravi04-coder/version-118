import React, { useState, useEffect } from 'react';
import { formatAmount } from "../../utils/safeFormat";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, RefreshCw, HelpCircle, Save, Plus, Trash2, CheckCircle, Flame, ShieldCheck, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export default function NegotiationTable({ thread, onClose, role, onActionComplete, locked = false }) {
  const isBrand = role === 'brand';
  // `locked` is set by ChatBox once THIS user has signed the partnership contract on a
  // campaign thread. View-only from that point: no edits, no counter, no accept. The
  // server enforces the same rule (see negotiationLockedFor in deals_chat_routes.ts),
  // so this is purely so the UI does not offer buttons that will be refused.
  const lockNotice = "You have signed this contract — the negotiation is now view-only.";
  const [loading, setLoading] = useState(false);
  const [activeOffer, setActiveOffer] = useState(null);
  
  // Local editable state for proposing new rates
  const [items, setItems] = useState([]);
  const [revisions, setRevisions] = useState(3);
  const [deadlineDays, setDeadlineDays] = useState(7);

  // Load existing breakdown or seed from thread deliverables
  useEffect(() => {
    if (thread) {
      // Fetch latest pending offer for this thread if any
      loadLatestOffer();
      
      if (thread.breakdown && Array.isArray(thread.breakdown) && thread.breakdown.length > 0) {
        setItems(thread.breakdown.map((item, idx) => ({
          id: item.id || String(idx),
          name: item.name || item.item || 'Deliverable',
          qty: item.qty || 1,
          rate: item.rate || 0
        })));
      } else {
        // Build items dynamically based on thread.amount_fixed and thread.deliverables
        const campaignPrice = thread.amount_fixed || 3000;
        const deliverablesList = (thread.deliverables && thread.deliverables.length > 0)
          ? thread.deliverables
          : ['Campaign Deliverable & Scope Contract'];

        // Distribute campaignPrice across deliverablesList
        const count = deliverablesList.length;
        const baseRate = Math.floor(campaignPrice / count);
        const remainder = campaignPrice - (baseRate * count);

        const seeded = deliverablesList.map((del, idx) => {
          return {
            id: String(idx),
            name: del,
            qty: 1,
            rate: idx === count - 1 ? (baseRate + remainder) : baseRate
          };
        });
        setItems(seeded);
      }
      
      if (thread.revision_count) {
        setRevisions(thread.revision_count);
      }
    }
  }, [thread]);

  const loadLatestOffer = async () => {
    try {
      const { data } = await api.get(`/chat/v2/threads/${thread.id}/messages`);
      if (data && Array.isArray(data)) {
        // Find latest message of type 'offer' or 'negotiation_offer'
        const offerMsgs = data.filter(m => 
          (m.message_type === 'offer' && m.metadata && m.metadata.status === 'PENDING') ||
          m.message_type === 'negotiation_offer'
        );
        if (offerMsgs.length > 0) {
          const latestMsg = offerMsgs[offerMsgs.length - 1];
          const latestOffer = latestMsg.metadata?.proposed_amount 
            ? {
                id: latestMsg.id || latestMsg.message_id,
                amount: latestMsg.metadata.proposed_amount,
                offered_by: latestMsg.sender_id || latestMsg.sender_user_id || thread?.creator_id,
                status: 'PENDING',
                breakdown: latestMsg.metadata?.breakdown
              }
            : (latestMsg.metadata || {});
          setActiveOffer(latestOffer);
          
          if (latestOffer.breakdown && Array.isArray(latestOffer.breakdown)) {
            setItems(latestOffer.breakdown);
          } else if (latestOffer.amount) {
            setItems([{
              id: 'counter_0',
              name: 'Campaign Deliverables & Scope',
              qty: 1,
              rate: latestOffer.amount
            }]);
          }
        } else if (thread?.flow_state === 'NEGOTIATING_COUNTER' && thread?.counter_amount) {
          setActiveOffer({
            id: 'thread_counter',
            amount: thread.counter_amount,
            offered_by: thread.creator_id,
            status: 'PENDING'
          });
        } else {
          setActiveOffer(null);
        }
      }
    } catch (err) {
      console.error("Error loading offer:", err);
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + (curr.qty * curr.rate), 0);
  const platformFeePct = 2; // 2% platform fee
  const platformFee = Math.round(subtotal * (platformFeePct / 100));
  const creatorDeduction = Math.round(subtotal * 0.02); // 2% creator safety deduction
  const brandTotal = subtotal + platformFee;
  const creatorTotal = subtotal - creatorDeduction;

  // Add Row
  const handleAddRow = () => {
    if (locked) { toast.error(lockNotice); return; }
    setItems([...items, {
      id: String(Date.now()),
      name: 'Custom Deliverable',
      qty: 1,
      rate: 3000
    }]);
  };

  // Remove Row
  const handleRemoveRow = (id) => {
    if (locked) { toast.error(lockNotice); return; }
    if (items.length <= 1) {
      toast.error("You must have at least one deliverable in the negotiation table.");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  // Handle Input Changes
  const handleItemChange = (id, field, value) => {
    if (locked) return;
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: field === 'name' ? value : Math.max(0, parseInt(value) || 0)
        };
      }
      return item;
    }));
  };

  // Submit Propose/Counter Offer
  const handlePropose = async () => {
    if (locked) { toast.error(lockNotice); return; }
    if (subtotal <= 0) {
      toast.error("Subtotal must be greater than zero.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/campaign/threads/${thread.id}/creator-negotiate`, {
        counter_amount: subtotal
      });

      toast.success("New counter negotiation proposal sent! 🚀", {
        description: `Counter offer of ₹${subtotal.toLocaleString('en-IN')} logged in thread.`
      });
      
      if (onActionComplete) onActionComplete(response.data);
      loadLatestOffer();
      if (onClose) onClose();
    } catch (err) {
      toast.error("Failed to propose rates: " + (err.response?.data?.error || err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Accept pending offer
  const handleAcceptOffer = async () => {
    if (locked) { toast.error(lockNotice); return; }
    setLoading(true);
    try {
      const response = await api.post(`/campaign/threads/${thread.id}/brand-accept-counter`);
      toast.success("Negotiation accepted & fixed successfully! 🤝");
      if (onActionComplete) onActionComplete(response.data);
      onClose();
    } catch (err) {
      toast.error("Failed to accept offer: " + (err.response?.data?.error || err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Reject pending offer
  const handleRejectOffer = () => {
    setActiveOffer(null);
    toast.info("Proposal declined. You can propose your counter rates below.");
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-[420px] max-w-full bg-[var(--bg-card)] border-l border-[var(--border-default)] z-30 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-[var(--border-default)] bg-[var(--bg-elevated)]/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight">Live Negotiation Table</h3>
              <span className="text-[10px] text-[var(--violet)] font-bold tracking-wider uppercase block">
                Fix & Lock Partnership Value
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          
          {/* Active Status Display */}
          {activeOffer && (
            <div className={`p-4 rounded-2xl border ${activeOffer.offered_by === thread.creator_id && isBrand || activeOffer.offered_by === thread.brand_id && !isBrand ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0 mt-0.5">
                  <Flame size={16} />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    {activeOffer.offered_by === thread.creator_id ? 'Creator Proposed Counter' : 'Brand Sent Proposal'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    An itemized offer of <strong className="text-[var(--text-primary)]">₹{formatAmount(activeOffer.amount)}</strong> is awaiting review. Accepting this updates the legal contract terms.
                  </p>
                  
                  {activeOffer.offered_by !== (isBrand ? thread.brand_id : thread.creator_id) ? (
                    <div className="flex gap-2 pt-1">
                      <button 
                        hidden={locked}
                        onClick={handleAcceptOffer}
                        disabled={loading}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Check size={12} /> Accept Proposal
                      </button>
                      <button 
                        hidden={locked}
                        onClick={handleRejectOffer}
                        disabled={loading}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] rounded-lg transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-500 italic font-mono">
                      ⏳ Awaiting counter response from partner...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {locked && (
            <div className="p-3.5 bg-[var(--bg-elevated)]/50 border border-[var(--border-default)] rounded-2xl flex items-start gap-2.5">
              <Lock size={15} className="text-[var(--text-tertiary)] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-bold text-[var(--text-primary)]">Negotiation locked</p>
                <p className="text-[var(--text-secondary)]">
                  You have signed this partnership contract, so these terms are final and view-only.
                  Contact support if the agreed terms genuinely need to change.
                </p>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-extrabold tracking-widest">
                Deliverables & Sub-rates
              </span>
              {!locked && (
                <button 
                  onClick={handleAddRow}
                  className="text-[11px] text-[var(--violet)] hover:text-indigo-400 font-bold flex items-center gap-1"
                >
                  <Plus size={12} /> Add Item
                </button>
              )}
            </div>

            {/* Table Header & Rows */}
            <div className="bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]/60 text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
                <div className="col-span-6">Deliverable Asset</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Unit Rate</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-[var(--border-default)]">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[var(--bg-elevated)]/20 transition-all">
                    {/* Item Name */}
                    <div className="col-span-6">
                      <input 
                        type="text" 
                        value={item.name}
                        readOnly={locked}
                        disabled={locked}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] font-medium focus:ring-0 focus:outline-none p-0"
                        placeholder="e.g. YouTube Ded. video"
                      />
                    </div>
                    {/* Quantity */}
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        value={item.qty}
                        readOnly={locked}
                        disabled={locked}
                        onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg text-center text-xs py-1 focus:ring-1 focus:ring-[var(--violet)] focus:outline-none"
                        min="1"
                      />
                    </div>
                    {/* Rate */}
                    <div className="col-span-3 relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-tertiary)]">₹</span>
                      <input 
                        type="number" 
                        value={item.rate}
                        readOnly={locked}
                        disabled={locked}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg pl-4 pr-1 py-1 text-right text-xs focus:ring-1 focus:ring-[var(--violet)] focus:outline-none font-mono"
                        min="0"
                      />
                    </div>
                    {/* Trash Action */}
                    <div className="col-span-1 flex justify-end">
                      {!locked && (
                        <button 
                          onClick={() => handleRemoveRow(item.id)}
                          className="p-1 text-[var(--text-tertiary)] hover:text-rose-500 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline and Revision Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-extrabold tracking-widest block">Revisions Included</label>
              <input 
                type="number" 
                value={revisions}
                readOnly={locked}
                disabled={locked}
                onChange={e => setRevisions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--violet)]"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[var(--text-tertiary)] uppercase font-extrabold tracking-widest block">Delivery Within (Days)</label>
              <input 
                type="number" 
                value={deadlineDays}
                readOnly={locked}
                disabled={locked}
                onChange={e => setDeadlineDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[var(--bg-elevated)]/40 border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--violet)]"
                min="1"
              />
            </div>
          </div>

          {/* Final Live Breakdown Calculator */}
          <div className="bg-[var(--bg-elevated)]/30 border border-[var(--border-default)] rounded-2xl p-4.5 space-y-3.5">
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-extrabold tracking-widest block">
              Contract Value Ledger
            </span>

            <div className="space-y-2 text-xs font-serif">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Deliverables Subtotal:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {isBrand ? (
                <>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Platform Service Charge (2%):</span>
                    <span className="font-mono text-indigo-400">+₹{platformFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-default)] flex justify-between text-sm font-bold">
                    <span className="text-[var(--text-primary)]">Total Brand Escrow Bond:</span>
                    <span className="font-mono text-[var(--violet)]">₹{brandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Ybex Escrow Protection & Coverage:</span>
                    <span className="font-mono text-emerald-400">✓ Included (100% Secured)</span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-default)] flex justify-between text-sm font-bold">
                    <span className="text-[var(--text-primary)]">Guaranteed Creator Net Payout:</span>
                    <span className="font-mono text-[var(--violet)]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Indian Judicial System & Udaipur Escrow Guarantee */}
          <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl text-[10px] text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5 shadow-sm">
            <ShieldCheck size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Under **IT Act, 2000**, submitting a counter-proposal constitutes an electronic business quote. Once approved by the opposite party, it automatically overrides past valuations.
            </p>
          </div>
        </div>

        {/* Propose Action Footer Button */}
        <div className="p-5 border-t border-[var(--border-default)] bg-[var(--bg-card)] shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex items-center gap-1">
            <RefreshCw size={10} className="animate-spin text-indigo-400" /> ACTIVE FEED
          </span>
          {locked ? (
            <span className="px-4 py-2.5 rounded-xl font-bold text-[11px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Lock size={12} /> SIGNED — VIEW ONLY
            </span>
          ) : (
            <button 
              onClick={handlePropose}
              disabled={loading || subtotal === 0}
              className="px-5 py-3 rounded-xl font-bold text-xs font-mono shadow-lg transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)]"
            >
              <Save size={14} /> {loading ? 'SENDING...' : 'PROPOSE NEW RATES'}
            </button>
          )}
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
