import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  TrendingUp, 
  Search, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  X, 
  Building2, 
  User, 
  Filter, 
  Clock, 
  Lock, 
  Receipt,
  Copy,
  DollarSign,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  QrCode,
  Send,
  Smartphone,
  MessageSquare,
  ExternalLink,
  Layers,
  Check,
  ChevronRight,
  Shield,
  Zap,
  Info,
  Bell
} from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import RefundModal from './RefundModal';
import ReleasePayoutModal from './ReleasePayoutModal';

export default function EscrowDashboard({ refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('escrow'); // 'escrow' | 'payouts' | 'requests' | 'razorpay'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRefundTx, setSelectedRefundTx] = useState(null);
  
  // UTR Release Modal State
  const [selectedReleaseTx, setSelectedReleaseTx] = useState(null);
  const [utrInput, setUtrInput] = useState("");
  const [releasingPayout, setReleasingPayout] = useState(false);

  // Bank & Payout Details Modal State
  const [selectedBankDetailsTx, setSelectedBankDetailsTx] = useState(null);

  // QR Code Preview Modal State
  const [previewQrUrl, setPreviewQrUrl] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("admin/escrow/overview");
      if (res.data && Array.isArray(res.data.transactions)) {
        setTransactions(res.data.transactions);
      } else if (Array.isArray(res.data)) {
        setTransactions(res.data);
      }
      // The overview endpoint reports which of its name lookups failed. Without this the
      // table just shows "Brand" / "Creator" placeholders and looks like a UI bug.
      if (Array.isArray(res.data?.lookup_errors) && res.data.lookup_errors.length > 0) {
        console.warn("[EscrowDashboard] name lookups failed:", res.data.lookup_errors.join(", "));
        toast.warning(`Names may be incomplete — could not read: ${res.data.lookup_errors.join(", ")}`);
      }
    } catch (err) {
      // IMPORTANT: this fallback returns raw transactions with no brand/campaign/creator
      // names attached, which is exactly how the ledger ends up full of placeholders. It
      // used to happen silently.
      console.error("[EscrowDashboard] admin/escrow/overview failed, using raw ledger:", err?.response?.data?.error || err?.message || err);
      try {
        const fallbackRes = await api.get("admin/transactions");
        if (fallbackRes.data) {
          setTransactions(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          toast.warning("Showing the raw ledger — brand, campaign and creator names are unavailable.");
        }
      } catch (e) {
        console.error("Failed to load admin transactions:", e);
        toast.error("Failed to load ledger transactions");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReleasePayout = async (payload) => {
    if (!selectedReleaseTx) return;
    
    // Support both event and payload object ({ utr, note, appUsed })
    const utrVal = typeof payload === 'object' && payload?.utr !== undefined ? payload.utr : utrInput;
    const noteVal = typeof payload === 'object' && payload?.note !== undefined ? payload.note : "";
    const appVal = typeof payload === 'object' && payload?.appUsed !== undefined ? payload.appUsed : "";

    if (!utrVal || !String(utrVal).trim()) {
      toast.error("Please enter a valid UTR / Banking transaction reference number.");
      return;
    }

    try {
      setReleasingPayout(true);
      const dealId = selectedReleaseTx.deal_id || selectedReleaseTx.ugc_order_id || selectedReleaseTx.id;
      const res = await api.post(`admin/escrow/${dealId}/release-payout`, {
        utr_number: String(utrVal).trim(),
        reason: noteVal ? `${noteVal}${appVal ? ` (via ${appVal})` : ''}` : (appVal ? `Disbursed via ${appVal}` : "Payout released by admin"),
        transaction_id: selectedReleaseTx.id,
        deal_id: selectedReleaseTx.deal_id,
        ugc_order_id: selectedReleaseTx.ugc_order_id,
        creator_id: selectedReleaseTx.creator_id,
        creator_net_amount: selectedReleaseTx.creator_net_amount,
        gross_amount: selectedReleaseTx.gross_amount,
        platform_fee_amount: selectedReleaseTx.platform_fee_amount
      });

      toast.success(res.data?.message || `Payout of ₹${(Number(selectedReleaseTx.creator_net_amount) || 0).toLocaleString('en-IN')} released! UTR: ${String(utrVal).trim()}`);
      setSelectedReleaseTx(null);
      setUtrInput("");
      await fetchTransactions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to release payout.");
    } finally {
      setReleasingPayout(false);
    }
  };

  const txList = Array.isArray(transactions) ? transactions : [];

  // Lifecycle status helpers
  const isTxDisbursed = (tx) => {
    const utr = tx.utr_number || tx.utrNumber || tx.payout_reference;
    return Boolean(utr && String(utr).trim()) && (tx.payout_status === 'RELEASED' || tx.payout_status === 'PAID');
  };

  const isTxRefunded = (tx) => {
    return tx.status === 'REFUNDED' || tx.payout_status === 'REFUNDED' || tx.refund_status === 'PROCESSED';
  };

  const isTxApprovedByBrand = (tx) => {
    if (isTxDisbursed(tx) || isTxRefunded(tx)) return false;
    return (
      tx.payout_requested === true ||
      tx.is_brand_approved === true ||
      tx.payout_status === 'READY_FOR_RELEASE' ||
      tx.payout_status === 'PAYOUT_PENDING_ADMIN' ||
      tx.deal_status === 'COMPLETED' ||
      tx.deal_status === 'APPROVED' ||
      tx.deal_status === 'CONTENT_APPROVED' ||
      tx.deal_status === 'PAYOUT_REQUESTED'
    );
  };

  const isTxUnderReview = (tx) => {
    if (isTxDisbursed(tx) || isTxRefunded(tx) || isTxApprovedByBrand(tx)) return false;
    return (
      tx.is_content_submitted === true ||
      tx.payout_status === 'AWAITING_BRAND_REVIEW' ||
      tx.deal_status === 'SUBMITTED' ||
      tx.deal_status === 'IN_REVIEW'
    );
  };

  const isTxInProduction = (tx) => {
    if (isTxDisbursed(tx) || isTxRefunded(tx) || isTxApprovedByBrand(tx) || isTxUnderReview(tx)) return false;
    return true;
  };

  const isTxHeld = (tx) => {
    if (isTxDisbursed(tx) || isTxRefunded(tx)) return false;
    return true;
  };

  // Groupings for Tab Filtering & Badges
  const approvedPayoutsList = txList.filter(t => isTxApprovedByBrand(t));
  const inProductionList = txList.filter(t => isTxInProduction(t) || isTxUnderReview(t));
  const transferredList = txList.filter(t => isTxDisbursed(t));
  const refundsList = txList.filter(t => isTxRefunded(t));
  const heldTxns = txList.filter(t => isTxHeld(t));
  const payoutRequestsList = txList.filter(t => isTxApprovedByBrand(t) && (t.payout_requested || t.payout_status === 'READY_FOR_RELEASE'));
  const realRazorpayList = txList.filter(t => t.is_real_razorpay_order || ((t.payment_order_id || t.zaakpay_order_id) && (t.payment_order_id || t.zaakpay_order_id).startsWith('order_')) || (t.razorpay_payment_id && t.razorpay_payment_id.startsWith('pay_')));

  const filteredTransactions = txList.filter(tx => {
    const query = search.trim().toLowerCase();
    
    const matchesSearch = !query || (
      (tx.transaction_id || '').toLowerCase().includes(query) ||
      (tx.deal_id || '').toLowerCase().includes(query) ||
      (tx.brand_name || '').toLowerCase().includes(query) ||
      (tx.creator_name || '').toLowerCase().includes(query) ||
      (tx.creator_id || '').toLowerCase().includes(query) ||
      (tx.campaign_title || '').toLowerCase().includes(query) ||
      ((tx.payment_order_id || tx.zaakpay_order_id) || '').toLowerCase().includes(query) ||
      (tx.razorpay_payment_id || '').toLowerCase().includes(query) ||
      (tx.upi_id || '').toLowerCase().includes(query) ||
      (tx.utr_number || '').toLowerCase().includes(query) ||
      (tx.gst_invoice?.invoice_number || '').toLowerCase().includes(query)
    );

    if (activeTab === 'escrow') {
      if (statusFilter === 'held') return matchesSearch && isTxHeld(tx);
      if (statusFilter === 'disbursed') return matchesSearch && isTxDisbursed(tx);
      if (statusFilter === 'refunded') return matchesSearch && isTxRefunded(tx);
      return matchesSearch;
    }

    if (activeTab === 'payouts') {
      if (statusFilter === 'ready_for_release') {
        return matchesSearch && isTxApprovedByBrand(tx);
      }
      if (statusFilter === 'in_production') {
        return matchesSearch && (isTxInProduction(tx) || isTxUnderReview(tx));
      }
      if (statusFilter === 'transferred') {
        return matchesSearch && isTxDisbursed(tx);
      }
      if (statusFilter === 'refunds') {
        return matchesSearch && isTxRefunded(tx);
      }
      return matchesSearch;
    }

    if (activeTab === 'requests') {
      if (statusFilter === 'nudged') {
        return matchesSearch && isTxApprovedByBrand(tx) && (Number(tx.payout_request_count) > 1);
      }
      if (statusFilter === 'missing_bank') {
        return matchesSearch && isTxApprovedByBrand(tx) && (!tx.bank_account_no && !tx.upi_id);
      }
      return matchesSearch && isTxApprovedByBrand(tx);
    }

    // Razorpay tab:
    if (activeTab === 'razorpay') {
      return matchesSearch && (tx.is_real_razorpay_order || ((tx.payment_order_id || tx.zaakpay_order_id) && (tx.payment_order_id || tx.zaakpay_order_id).startsWith('order_')) || (tx.razorpay_payment_id && tx.razorpay_payment_id.startsWith('pay_')));
    }

    return matchesSearch;
  });

  // Calculate Investor KPI Metrics
  const totalGMV = txList.reduce((sum, t) => sum + (Number(t.gross_amount || t.amount) || 0), 0);
  // Platform fee is only realized when payout has actually been disbursed/released to the creator
  const totalRealizedFees = transferredList.reduce((sum, t) => sum + (Number(t.platform_fee_amount) || 0), 0);
  const totalSafeEscrow = heldTxns.reduce((sum, t) => sum + (Number(t.gross_amount || t.amount) || 0), 0);
  const totalDisbursed = transferredList.reduce((sum, t) => sum + (Number(t.creator_net_amount) || 0), 0);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label || 'Text'} copied to clipboard!`);
  };

  const handleOpenUpiApp = (appType) => {
    if (!selectedReleaseTx) return;
    const upiId = selectedReleaseTx.upi_id;
    const amount = Number(selectedReleaseTx.creator_net_amount) || 0;
    const creatorName = selectedReleaseTx.bank_holder_name || selectedReleaseTx.creator_name || 'Creator';

    if (!upiId) {
      toast.error("No UPI ID set for this creator. Please use Bank Account transfer details.");
      return;
    }

    const pa = encodeURIComponent(upiId.trim());
    const pn = encodeURIComponent(creatorName.trim());
    const am = amount;
    const tn = encodeURIComponent(`YBEX Escrow ${selectedReleaseTx.deal_id || ''}`.trim());

    const baseParams = `pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
    let deepLink = `upi://pay?${baseParams}`;

    if (appType === 'paytm') {
      deepLink = `paytmmp://pay?${baseParams}`;
    } else if (appType === 'phonepe') {
      deepLink = `phonepe://pay?${baseParams}`;
    } else if (appType === 'gpay') {
      deepLink = `tez://upi/pay?${baseParams}`;
    } else if (appType === 'amazonpay') {
      deepLink = `amazonpay://pay?${baseParams}`;
    } else if (appType === 'bhim') {
      deepLink = `bhim://pay?${baseParams}`;
    }

    navigator.clipboard.writeText(upiId.trim());

    const appLabels = {
      paytm: 'Paytm',
      phonepe: 'PhonePe',
      gpay: 'Google Pay',
      bhim: 'BHIM UPI',
      amazonpay: 'Amazon Pay',
      generic: 'UPI App'
    };

    toast.success(`Opening ${appLabels[appType] || 'UPI App'}... UPI ID copied to clipboard!`);

    try {
      window.location.href = deepLink;
    } catch (err) {
      console.error("UPI link error:", err);
    }
  };

  const navTabs = [
    { id: 'escrow', label: 'Escrow Inflows & Safe Vault', icon: ShieldCheck, count: txList.length },
    { id: 'payouts', label: 'Creator Payouts & Disbursements', icon: Send, count: (approvedPayoutsList.length + inProductionList.length) },
    { id: 'requests', label: 'Payment Requests', icon: Bell, count: payoutRequestsList.length },
    { id: 'razorpay', label: 'Razorpay Live Gateway Sync', icon: Zap, count: realRazorpayList.length }
  ];

  return (
    <div className="space-y-6 text-[var(--text-primary)] w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Escrow & Payouts</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage funds, disbursements, and financial records.</p>
        </div>
      </div>

      {/* Financial KPI Cards - High Contrast, Clean Solid Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total GMV Inflow */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 flex items-center justify-between">
            <span>Total GMV Inflow</span>
            <DollarSign size={15} className="text-blue-600" />
          </div>
          <div className="font-display text-2xl font-black text-[var(--text-primary)] tracking-tight">
            ₹{totalGMV.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            <span className="font-bold text-[var(--text-primary)]">{txList.length}</span> total brand deals
          </div>
        </div>

        {/* Safe Escrow Balance */}
        <div className="bg-[var(--bg-card)] border border-emerald-600/30 rounded-2xl p-4.5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1 flex items-center justify-between">
            <span>Safe Escrow Balance</span>
            <Lock size={15} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-black text-emerald-800 dark:text-emerald-400 tracking-tight">
            ₹{totalSafeEscrow.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-800 dark:text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
            <ShieldCheck size={12} /> {heldTxns.length} deals in active escrow
          </div>
        </div>

        {/* Ybex Platform Revenue (Realized upon Payout Release) */}
        <div className="bg-[var(--bg-card)] border border-[#9D7CFF]/30 rounded-2xl p-4.5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#7C5CFF] dark:text-[#9D7CFF] mb-1 flex items-center justify-between">
            <span>Ybex Fee Margin</span>
            <TrendingUp size={15} className="text-[#7C5CFF] dark:text-[#9D7CFF]" />
          </div>
          <div className="font-display text-2xl font-black text-[#7C5CFF] dark:text-[#9D7CFF] tracking-tight">
            ₹{totalRealizedFees.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            {transferredList.length > 0 ? `${transferredList.length} payouts completed` : 'Realized upon payout release'}
          </div>
        </div>

        {/* Disbursed to Creators */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4.5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1 flex items-center justify-between">
            <span>Disbursed to Creators</span>
            <ArrowUpRight size={15} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="font-display text-2xl font-black text-[var(--text-primary)] tracking-tight">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium">
            <span className="font-bold text-[var(--text-primary)]">{transferredList.length}</span> payouts released
          </div>
        </div>

        {/* Ready for Release (Brand Approved) */}
        <div className="bg-[var(--bg-card)] border border-indigo-500/30 rounded-2xl p-4.5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1 flex items-center justify-between">
            <span>Ready for Payout</span>
            <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="font-display text-2xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">
            ₹{approvedPayoutsList.reduce((sum, t) => sum + (Number(t.creator_net_amount) || 0), 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-400 mt-1.5 font-semibold">
            {approvedPayoutsList.length} approved by brand
          </div>
        </div>
      </div>

      {/* Main Tab Bar Navigation - Consistent Pill Style */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {navTabs.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={`escrow-tab-${t.id}`}
              onClick={() => {
                setActiveTab(t.id);
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-[#9D7CFF] text-white shadow-md shadow-[#9D7CFF]/20' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#9D7CFF]/40'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Universal Search & Status Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border-default)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--bg-elevated)]/40">
          {/* Universal Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by Deal ID, Brand Name, Creator, Razorpay Order ID, UTR..." 
              className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-xs font-medium focus:border-[#9D7CFF] focus:outline-none transition-all placeholder:text-[var(--text-secondary)]"
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Contextual Filter Chips based on Active Tab */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              All Records ({txList.length})
            </button>

            {activeTab === 'escrow' && (
              <>
                <button
                  onClick={() => setStatusFilter("held")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "held"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-emerald-700 dark:text-emerald-400 hover:border-emerald-600"
                  }`}
                >
                  <Lock size={12} />
                  <span>Held in Escrow ({heldTxns.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("disbursed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "disbursed"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  <span>Disbursed ({transferredList.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("refunded")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "refunded"
                      ? "bg-rose-700 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-rose-600 hover:border-rose-500"
                  }`}
                >
                  <RotateCcw size={12} />
                  <span>Refunded ({refundsList.length})</span>
                </button>
              </>
            )}

            {activeTab === 'payouts' && (
              <>
                <button
                  onClick={() => setStatusFilter("ready_for_release")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "ready_for_release"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-emerald-700 dark:text-emerald-400 hover:border-emerald-600"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  <span>Brand Approved ({approvedPayoutsList.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("in_production")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "in_production"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-amber-700 dark:text-amber-400 hover:border-amber-500"
                  }`}
                >
                  <Clock size={12} />
                  <span>In Production / Awaiting Approval ({inProductionList.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("transferred")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "transferred"
                      ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  <span>Transferred ({transferredList.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("refunds")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "refunds"
                      ? "bg-rose-700 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-rose-600 hover:border-rose-500"
                  }`}
                >
                  <RotateCcw size={12} />
                  <span>Refunds ({refundsList.length})</span>
                </button>
              </>
            )}

            {activeTab === 'requests' && (
              <>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "all"
                      ? "bg-[#9D7CFF] text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Bell size={12} />
                  <span>All Requests ({payoutRequestsList.length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("nudged")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "nudged"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-amber-700 dark:text-amber-400 hover:border-amber-500"
                  }`}
                >
                  <AlertCircle size={12} />
                  <span>Nudged / Follow-up ({payoutRequestsList.filter(t => Number(t.payout_request_count) > 1).length})</span>
                </button>

                <button
                  onClick={() => setStatusFilter("missing_bank")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === "missing_bank"
                      ? "bg-rose-700 text-white shadow-sm"
                      : "bg-[var(--bg-card)] border border-[var(--border-default)] text-rose-600 hover:border-rose-500"
                  }`}
                >
                  <AlertTriangle size={12} />
                  <span>Missing Bank/UPI ({payoutRequestsList.filter(t => !t.bank_account_no && !t.upi_id).length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center text-[var(--text-secondary)] space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#9D7CFF] border-t-transparent mb-2"></div>
            <p className="text-xs font-semibold">Loading escrow ledger & payout records...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center text-[var(--text-secondary)]">
            <ShieldCheck size={48} className="mb-3 opacity-20 text-[#027A48]" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No matching transactions found</p>
            <p className="text-xs max-w-sm mt-1 text-[var(--text-secondary)]">
              {search ? `No records match "${search}". Try another keyword.` : 'No transactions match the selected view.'}
            </p>
          </div>
        ) : (
          /* TAB 1: ESCROW INFLOWS & SAFE VAULT */
          activeTab === 'escrow' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3.5 font-bold">Brand & Campaign</th>
                    <th className="px-4 py-3.5 font-bold">Creator Allocated</th>
                    <th className="px-4 py-3.5 font-bold">Razorpay / Order ID</th>
                    <th className="px-4 py-3.5 font-bold text-right">Funded Amount (Gross)</th>
                    <th className="px-4 py-3.5 font-bold text-center">Escrow & Milestone Stage</th>
                    <th className="px-4 py-3.5 font-bold text-center">Linked Deal / Chat</th>
                    <th className="px-4 py-3.5 font-bold text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[var(--border-default)] font-medium">
                  {filteredTransactions.map((tx, idx) => {
                    const gross = Number(tx.gross_amount || tx.amount) || 0;
                    const fee = Number(tx.platform_fee_amount) || 0;
                    const net = Number(tx.creator_net_amount) || (gross - fee);
                    const isDisbursed = isTxDisbursed(tx);
                    const isRefund = isTxRefunded(tx);
                    const isApproved = isTxApprovedByBrand(tx);
                    const isReview = isTxUnderReview(tx);

                    return (
                      <tr key={`escrow-row-${tx.id || tx.transaction_id || tx.deal_id || 'item'}-${idx}`} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                        {/* Brand & Campaign */}
                        <td className="px-4 py-4 max-w-[220px]">
                          <div className="font-bold text-[var(--text-primary)] truncate text-xs flex items-center gap-1.5" title={tx.brand_name}>
                            <span className="truncate">{tx.brand_name || 'Brand Partner'}</span>
                            {(!isDisbursed && !isRefund) && (
                              <span className="relative flex h-2 w-2 shrink-0" title="Active Escrow / Pending Action">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                            )}
                          </div>
                          {tx.campaign_id ? (
                            <a
                              href={`/campaigns/${tx.campaign_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#7C5CFF] hover:text-[#9D7CFF] hover:underline truncate mt-0.5 flex items-center gap-1"
                              title={tx.campaign_title || 'View Campaign'}
                            >
                              <span className="truncate">{tx.campaign_title || 'Campaign Deal'}</span>
                              <ExternalLink size={10} className="shrink-0 opacity-70" />
                            </a>
                          ) : (
                            <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5" title={tx.campaign_title}>
                              {tx.campaign_title || 'UGC Campaign Deal'}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </div>
                        </td>

                        {/* Creator Allocated */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <User size={13} />
                            </div>
                            <div>
                              {tx.creator_id ? (
                                <a
                                  href={`/creator/${tx.creator_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-[var(--text-primary)] hover:text-[#7C5CFF] hover:underline flex items-center gap-1 text-xs"
                                  title="View Creator Public Profile"
                                >
                                  <span>{tx.creator_name || 'Content Creator'}</span>
                                  <ExternalLink size={10} className="shrink-0 opacity-60" />
                                </a>
                              ) : (
                                <span className="font-bold text-[var(--text-primary)] block text-xs">{tx.creator_name || 'Content Creator'}</span>
                              )}
                              <span className="text-[10px] text-[var(--text-secondary)] font-mono block">ID: {(tx.creator_id || 'N/A').slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Razorpay / Order ID */}
                        <td className="px-4 py-4">
                          {(tx.payment_order_id || tx.zaakpay_order_id) || tx.razorpay_payment_id ? (
                            <div className="space-y-1 font-mono text-[11px]">
                              {(tx.payment_order_id || tx.zaakpay_order_id) && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[var(--text-primary)] font-bold">{tx.payment_order_id || tx.zaakpay_order_id}</span>
                                  <button
                                    onClick={() => copyToClipboard((tx.payment_order_id || tx.zaakpay_order_id), 'Razorpay Order ID')}
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              )}
                              {tx.razorpay_payment_id && (
                                <div className="text-[10px] text-emerald-800 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                  <Check size={10} /> Pay: {tx.razorpay_payment_id}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                              Deal #{(tx.deal_id || tx.id || '').slice(0, 10)}
                            </span>
                          )}
                        </td>

                        {/* Gross Funded & Breakdown */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-display font-extrabold text-sm text-[var(--text-primary)]">
                            ₹{gross.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                            {isDisbursed ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                Disbursed: ₹{net.toLocaleString('en-IN')} | Fee: ₹{fee.toLocaleString('en-IN')}
                              </span>
                            ) : isRefund ? (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                Refunded: ₹{gross.toLocaleString('en-IN')} (Fee: ₹0)
                              </span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                Held in Escrow (Est. Net: ₹{net.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Escrow & Milestone Stage Badge */}
                        <td className="px-4 py-4 text-center">
                          {isDisbursed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700">
                              <CheckCircle2 size={12} className="text-emerald-600" /> Disbursed to Creator
                            </span>
                          ) : isRefund ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                              <RotateCcw size={12} /> Refunded to Brand
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-600/10 px-2.5 py-1 rounded-full border border-emerald-600/30">
                              <CheckCircle2 size={12} /> Brand Approved (Ready for Payout)
                            </span>
                          ) : isReview ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30">
                              <Clock size={12} /> Submitted (Under Brand Review)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                              <Lock size={12} /> Safe in Escrow (In Production)
                            </span>
                          )}
                        </td>

                        {/* Linked Deal / Chat */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {tx.thread_id ? (
                              <a
                                href={`/chat?thread=${tx.thread_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#9D7CFF]/10 hover:bg-[#9D7CFF]/20 text-[#7C5CFF] dark:text-[#9D7CFF] border border-[#9D7CFF]/30 rounded-lg text-xs font-bold transition-all"
                                title="Open Live Chat Thread"
                              >
                                <MessageSquare size={12} /> View Chat
                              </a>
                            ) : (
                              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                                Deal: {(tx.deal_id || tx.id || '').slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Receipt Button */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(tx)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                            title="View GST Tax Invoice"
                          >
                            <FileText size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'payouts' ? (
            /* TAB 2: CREATOR PAYOUTS & DISBURSEMENTS (CLEAR BRAND APPROVAL STATE) */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3.5 font-bold">Tx & Date</th>
                    <th className="px-4 py-3.5 font-bold">Campaign & Deal</th>
                    <th className="px-4 py-3.5 font-bold">Creator Name</th>
                    <th className="px-4 py-3.5 font-bold text-center">Payout Coordinates</th>
                    <th className="px-4 py-3.5 font-bold text-right">Net Payout & Milestone</th>
                    <th className="px-4 py-3.5 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[var(--border-default)] font-medium">
                  {filteredTransactions.map((tx, idx) => {
                    const isReleased = isTxDisbursed(tx);
                    const isApproved = isTxApprovedByBrand(tx);
                    const isReview = isTxUnderReview(tx);
                    const isInProd = isTxInProduction(tx);
                    const hasQr = Boolean(tx.upi_qr_code_url);

                    return (
                      <tr key={`payout-row-${tx.id || tx.transaction_id || tx.deal_id || 'item'}-${idx}`} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                        {/* Tx & Date */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              {(tx.transaction_id || tx.id || '').slice(0, 10)}...
                            </span>
                            <button 
                              onClick={() => copyToClipboard(tx.transaction_id || tx.id, 'Transaction ID')}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                            <Clock size={10} /> {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </div>
                        </td>

                        {/* Campaign & Deal */}
                        <td className="px-4 py-4 max-w-[190px] truncate">
                          {tx.campaign_id ? (
                            <a
                              href={`/campaigns/${tx.campaign_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-xs text-[#7C5CFF] hover:text-[#9D7CFF] hover:underline truncate flex items-center gap-1"
                              title={tx.campaign_title || 'View Campaign'}
                            >
                              <span className="truncate">{tx.campaign_title || 'UGC Content Deal'}</span>
                              <ExternalLink size={10} className="shrink-0 opacity-70" />
                            </a>
                          ) : (
                            <div className="font-bold text-xs text-[var(--text-primary)] truncate" title={tx.campaign_title}>
                              {tx.campaign_title || 'UGC Content Deal'}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                            Deal: {tx.deal_id ? `${tx.deal_id.slice(0, 8)}...` : (tx.ugc_order_id ? `${tx.ugc_order_id.slice(0, 8)}...` : 'N/A')}
                          </div>
                        </td>

                        {/* Creator Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <User size={13} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {tx.creator_id ? (
                                  <a
                                    href={`/creator/${tx.creator_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-bold text-xs text-[var(--text-primary)] hover:text-[#7C5CFF] hover:underline flex items-center gap-1"
                                    title="View Creator Public Profile"
                                  >
                                    <span>{tx.creator_name || 'Creator'}</span>
                                    <ExternalLink size={10} className="shrink-0 opacity-60" />
                                  </a>
                                ) : (
                                  <span className="font-bold text-xs text-[var(--text-primary)]">
                                    {tx.creator_name || 'Creator'}
                                  </span>
                                )}
                                {!isReleased && (
                                  <span className="relative flex h-2 w-2 shrink-0" title="Pending Payout Release">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--text-secondary)] font-mono block">Brand: {tx.brand_name || 'Brand'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Payout Coordinates - Clean Action Buttons Only (No Raw A/C or UPI Clutter) */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {hasQr && (
                              <button
                                onClick={() => setPreviewQrUrl(tx.upi_qr_code_url)}
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition-all cursor-pointer"
                              >
                                <QrCode size={13} /> View QR
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedBankDetailsTx(tx)}
                              className="px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#9D7CFF] text-[var(--text-primary)] rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Building2 size={13} className="text-[#9D7CFF]" /> View Account Details
                            </button>
                          </div>
                        </td>

                        {/* Net Payout & Milestone Status */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-display font-extrabold text-sm text-[var(--text-primary)]">
                            ₹{(Number(tx.creator_net_amount) || 0).toLocaleString('en-IN')}
                          </div>

                          <div className="mt-1 flex items-center justify-end">
                            {isReleased ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                                <CheckCircle2 size={10} className="text-emerald-600" /> Transferred {(tx.utr_number || tx.payout_reference) ? `(UTR: ${tx.utr_number || tx.payout_reference})` : ''}
                              </span>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-600/10 px-2 py-0.5 rounded-full border border-emerald-600/30">
                                <CheckCircle2 size={10} /> Brand Approved (Ready)
                              </span>
                            ) : isReview ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                <Clock size={10} /> In Brand Review
                              </span>
                            ) : isInProd ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30" title="Funds locked in escrow. Brand has not approved content yet.">
                                <Lock size={10} /> In Escrow (Awaiting Approval)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                                <RotateCcw size={10} /> Refunded
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isReleased ? (
                              <button
                                onClick={() => setSelectedInvoice(tx)}
                                className="px-2.5 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <FileText size={12} /> Receipt
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedReleaseTx(tx);
                                    setUtrInput("");
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                                    isApproved 
                                      ? "bg-[#027A48] hover:bg-[#02653C] text-white" 
                                      : "bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-amber-500"
                                  }`}
                                  title={isApproved ? "Brand has approved content. Release payout to creator." : "Brand has not approved content yet. Click to view escrow details or perform admin override."}
                                >
                                  <Send size={12} className={isApproved ? "text-white" : "text-amber-600"} />
                                  <span>{isApproved ? "Release Payout" : "Release (Override)"}</span>
                                </button>
                                <button
                                  onClick={() => setSelectedRefundTx(tx)}
                                  className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  title="Process refund of escrow funds to brand"
                                >
                                  Refund
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'requests' ? (
            /* TAB 3: CREATOR PAYMENT REQUESTS */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3.5 font-bold">Creator</th>
                    <th className="px-4 py-3.5 font-bold">Brand & Campaign</th>
                    <th className="px-4 py-3.5 font-bold">Request Info & Approval</th>
                    <th className="px-4 py-3.5 font-bold">Payout Coordinates</th>
                    <th className="px-4 py-3.5 font-bold text-right">Net Disbursable</th>
                    <th className="px-4 py-3.5 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[var(--border-default)] font-medium">
                  {filteredTransactions.map((tx, idx) => {
                    const gross = Number(tx.gross_amount || tx.amount) || 0;
                    const fee = Number(tx.platform_fee_amount) || 0;
                    const net = Number(tx.creator_net_amount) || (gross - fee);
                    const reqCount = Number(tx.payout_request_count) || 1;
                    const hasUpi = Boolean(tx.upi_id);
                    const hasBank = Boolean(tx.bank_account_no);

                    return (
                      <tr key={`req-row-${tx.id || tx.transaction_id || tx.deal_id || 'item'}-${idx}`} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                        {/* Creator */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <User size={15} />
                            </div>
                            <div>
                              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                                {tx.creator_name || 'Creator'}
                                <span className="relative flex h-2 w-2 shrink-0" title="Incoming Payout Request">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)] font-mono block">ID: {(tx.creator_id || 'N/A').slice(0, 10)}</span>
                              {hasUpi ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-600/10 px-1.5 py-0.2 rounded mt-0.5 border border-emerald-600/30">
                                  <Smartphone size={9} /> UPI Ready
                                </span>
                              ) : hasBank ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded mt-0.5 border border-blue-500/30">
                                  <Building2 size={9} /> Bank Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded mt-0.5 border border-rose-500/30">
                                  <AlertTriangle size={9} /> Missing Payout Info
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand & Campaign */}
                        <td className="px-4 py-4 max-w-[200px]">
                          <div className="font-bold text-[var(--text-primary)] truncate text-xs">{tx.brand_name || 'Brand Partner'}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">{tx.campaign_title || 'Campaign Deal'}</div>
                          {tx.thread_id && (
                            <a
                              href={`/chat?thread=${tx.thread_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#9D7CFF] hover:underline mt-0.5"
                            >
                              <MessageSquare size={10} /> View Chat
                            </a>
                          )}
                        </td>

                        {/* Request Info & Approval */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-600/10 px-2 py-0.5 rounded-full border border-emerald-600/30">
                                <CheckCircle2 size={10} /> Brand Approved
                              </span>
                              {reqCount > 1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                                  <Bell size={10} /> {reqCount}x Reminders
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              Requested: <span className="font-medium text-[var(--text-primary)]">{tx.last_payout_requested_at ? new Date(tx.last_payout_requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                            </div>
                            {tx.payout_request_notes && (
                              <div className="text-[10px] italic text-[var(--text-secondary)] max-w-[180px] truncate bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                                "{tx.payout_request_notes}"
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Payout Coordinates */}
                        <td className="px-4 py-4">
                          {hasUpi ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">UPI ID</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{tx.upi_id}</span>
                                  <button
                                    onClick={() => copyToClipboard(tx.upi_id, 'UPI ID')}
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                                    title="Copy UPI ID"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </div>
                              {tx.upi_qr_url && (
                                <button
                                  onClick={() => setPreviewQrUrl(tx.upi_qr_url)}
                                  className="p-1.5 bg-[var(--bg-elevated)] hover:bg-[#9D7CFF]/10 text-[#9D7CFF] border border-[var(--border-default)] rounded-lg transition-colors"
                                  title="View UPI QR Code"
                                >
                                  <QrCode size={13} />
                                </button>
                              )}
                            </div>
                          ) : hasBank ? (
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">Bank Account</span>
                              <div className="flex items-center gap-1 font-mono text-xs font-bold text-[var(--text-primary)]">
                                <span>{tx.bank_account_no}</span>
                                <button
                                  onClick={() => copyToClipboard(tx.bank_account_no, 'Account No')}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                                  title="Copy Account Number"
                                >
                                  <Copy size={11} />
                                </button>
                              </div>
                              <span className="text-[10px] text-[var(--text-secondary)] font-mono block">IFSC: {tx.bank_ifsc || 'N/A'}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedBankDetailsTx(tx)}
                              className="text-xs text-rose-600 hover:underline font-bold"
                            >
                              Check Details
                            </button>
                          )}
                        </td>

                        {/* Net Disbursable */}
                        <td className="px-4 py-4 text-right">
                          <div className="font-display font-extrabold text-sm text-[var(--text-primary)]">
                            ₹{net.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                            Gross: ₹{gross.toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedReleaseTx(tx);
                                setUtrInput("");
                              }}
                              className="px-3 py-1.5 bg-[#027A48] hover:bg-[#02653C] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Release payout and record banking UTR"
                            >
                              <Send size={12} className="text-white" />
                              <span>Release Payout</span>
                            </button>

                            <button
                              onClick={() => setSelectedBankDetailsTx(tx)}
                              className="px-2 py-1.5 bg-[var(--bg-elevated)] hover:bg-[#9D7CFF]/10 text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg text-xs font-bold transition-all"
                              title="View Full Coordinates"
                            >
                              <FileText size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* TAB 4: RAZORPAY LIVE GATEWAY TRANSACTIONS */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3.5 font-bold">Razorpay Order ID</th>
                    <th className="px-4 py-3.5 font-bold">Payment Reference</th>
                    <th className="px-4 py-3.5 font-bold">Brand & Campaign</th>
                    <th className="px-4 py-3.5 font-bold text-right">Captured Amount</th>
                    <th className="px-4 py-3.5 font-bold text-center">Settlement Status</th>
                    <th className="px-4 py-3.5 font-bold text-center">Linked Chat</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[var(--border-default)] font-medium">
                  {filteredTransactions.map((tx, idx) => {
                    const gross = Number(tx.gross_amount || tx.amount) || 0;
                    return (
                      <tr key={`rzp-row-${tx.id || tx.transaction_id || tx.deal_id || 'item'}-${idx}`} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                        <td className="px-4 py-4 font-mono font-bold text-xs text-[var(--text-primary)]">
                          {(tx.payment_order_id || tx.zaakpay_order_id) ? (
                            <div className="flex items-center gap-1.5">
                              <span>{tx.payment_order_id || tx.zaakpay_order_id}</span>
                              <button
                                onClick={() => copyToClipboard((tx.payment_order_id || tx.zaakpay_order_id), 'Razorpay Order ID')}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[var(--text-secondary)] font-normal italic">Auto-generated deal</span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs">
                          {tx.razorpay_payment_id ? (
                            <div className="flex items-center gap-1 text-emerald-800 dark:text-emerald-400 font-bold">
                              <Check size={12} /> {tx.razorpay_payment_id}
                            </div>
                          ) : (
                            <span className="text-[var(--text-secondary)] font-mono">{(tx.id || '').slice(0, 12)}</span>
                          )}
                        </td>

                        <td className="px-4 py-4 max-w-[200px] truncate">
                          <div className="font-bold text-xs text-[var(--text-primary)] truncate">{tx.brand_name || 'Brand'}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">{tx.campaign_title || 'UGC Campaign'}</div>
                        </td>

                        <td className="px-4 py-4 text-right font-display font-extrabold text-sm text-[var(--text-primary)]">
                          ₹{gross.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-600/10 px-2.5 py-1 rounded-full border border-emerald-600/30">
                            <CheckCircle2 size={12} /> Captured & Escrowed
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {tx.thread_id ? (
                            <a
                              href={`/chat?thread=${tx.thread_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-elevated)] hover:bg-[#9D7CFF]/10 text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg text-xs font-bold transition-all"
                            >
                              <MessageSquare size={12} className="text-[#9D7CFF]" /> View
                            </a>
                          ) : (
                            <span className="text-[var(--text-secondary)] text-xs font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* UTR Release Payout Modal */}
      {selectedReleaseTx && (
        <ReleasePayoutModal
          tx={selectedReleaseTx}
          onClose={() => setSelectedReleaseTx(null)}
          onConfirmRelease={handleConfirmReleasePayout}
          releasing={releasingPayout}
          isTxApprovedByBrand={isTxApprovedByBrand}
        />
      )}

      {/* Bank & Payout Details Modal */}
      {selectedBankDetailsTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <button 
              onClick={() => setSelectedBankDetailsTx(null)}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg bg-[var(--bg-elevated)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#027A48] font-bold text-base">
                <Building2 size={20} />
                <span>Creator Account & Payout Details</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Verified payment destination for <span className="font-bold text-[var(--text-primary)]">{selectedBankDetailsTx.creator_name}</span>
              </p>
            </div>

            {/* Net Amount Box */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/50 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider block">Net Disbursable Amount</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Deal: {(selectedBankDetailsTx.deal_id || selectedBankDetailsTx.id || '').slice(0, 10)}</span>
              </div>
              <div className="font-mono text-2xl font-black text-emerald-800 dark:text-emerald-400">
                ₹{(Number(selectedBankDetailsTx.creator_net_amount) || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Bank Coordinates */}
            <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-default)] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-medium">Beneficiary Name:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBankDetailsTx.bank_holder_name || selectedBankDetailsTx.creator_name || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)] font-medium">Bank Name:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedBankDetailsTx.bank_name || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)] font-medium">Account Number:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--text-primary)]">
                  <span>{selectedBankDetailsTx.bank_account_no || 'Not provided'}</span>
                  {selectedBankDetailsTx.bank_account_no && (
                    <button
                      onClick={() => copyToClipboard(selectedBankDetailsTx.bank_account_no, 'Bank Account Number')}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)] font-medium">IFSC Code:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--text-primary)]">
                  <span>{selectedBankDetailsTx.bank_ifsc || 'Not provided'}</span>
                  {selectedBankDetailsTx.bank_ifsc && (
                    <button
                      onClick={() => copyToClipboard(selectedBankDetailsTx.bank_ifsc, 'IFSC Code')}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)] font-medium">UPI ID:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                  <span>{selectedBankDetailsTx.upi_id || 'Not set'}</span>
                  {selectedBankDetailsTx.upi_id && (
                    <button
                      onClick={() => copyToClipboard(selectedBankDetailsTx.upi_id, 'UPI ID')}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              {selectedBankDetailsTx.upi_qr_code_url && (
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-default)]">
                  <span className="text-[var(--text-secondary)] font-medium">UPI QR Code:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewQrUrl(selectedBankDetailsTx.upi_qr_code_url)}
                    className="text-xs text-indigo-700 dark:text-indigo-400 font-bold underline hover:text-indigo-600 flex items-center gap-1"
                  >
                    <QrCode size={12} /> View QR Image
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBankDetailsTx(null)}
                className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Close
              </button>
              {!isTxDisbursed(selectedBankDetailsTx) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReleaseTx(selectedBankDetailsTx);
                    setSelectedBankDetailsTx(null);
                    setUtrInput("");
                  }}
                  className="px-5 py-2 bg-[#027A48] hover:bg-[#02653C] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Send size={13} /> Proceed to Release Payout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Code Preview Modal */}
      {previewQrUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setPreviewQrUrl(null)}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg bg-[var(--bg-elevated)] transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
              <QrCode size={18} />
              <span>Creator UPI Payment QR</span>
            </div>
            <div className="bg-white p-3 rounded-xl inline-block border shadow-inner max-w-[260px] mx-auto">
              <img src={previewQrUrl} alt="Creator UPI QR Code" className="max-h-[260px] w-auto object-contain mx-auto rounded-lg" />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Scan QR using Google Pay, PhonePe, or Paytm.</p>
            <button
              onClick={() => setPreviewQrUrl(null)}
              className="w-full py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs font-bold text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* GST Tax Invoice Viewer Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #tax-invoice-printable, #tax-invoice-printable * {
                visibility: visible !important;
              }
              #tax-invoice-printable {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 32px !important;
                margin: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="no-print absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div id="tax-invoice-printable" className="space-y-6 bg-white text-slate-900 p-2 sm:p-4 rounded-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Ybex</span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#9D7CFF]/10 text-[#9D7CFF] border border-[#9D7CFF]/30 uppercase tracking-wider">
                      TAX INVOICE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Ybex Media Technologies Pvt Ltd</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    GSTIN: <span className="font-mono text-slate-700 font-bold">07AAACY0000A1Z2</span> | HSN/SAC: <span className="font-mono text-slate-700 font-bold">998365</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">INVOICE NO</div>
                  <div className="font-mono text-sm font-bold text-[#9D7CFF]">
                    {selectedInvoice.gst_invoice?.invoice_number || `INV-${(selectedInvoice.id || selectedInvoice.transaction_id || '9DEB885').slice(0, 8).toUpperCase()}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">BILLED TO (BRAND)</div>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.brand_name || 'Brand Partner'}</div>
                  <div className="text-slate-500 mt-1 font-mono text-[11px]">
                    GSTIN: {selectedInvoice.gst_invoice?.brand_gstin || '29AAAAA0000A1Z5 (Unregistered / B2C)'}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">CREATOR BENEFICIARY</div>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.creator_name || 'Creator'}</div>
                  <div className="text-slate-500 mt-1 font-mono text-[11px]">
                    Transaction ID: {(selectedInvoice.transaction_id || selectedInvoice.id || '').slice(0, 10)}...
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                      <th className="p-3">SERVICE DESCRIPTION</th>
                      <th className="p-3 text-right">BASE AMOUNT</th>
                      <th className="p-3 text-right">CGST (9%)</th>
                      <th className="p-3 text-right">SGST (9%)</th>
                      <th className="p-3 text-right">TOTAL AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                    {(() => {
                      const baseAmt = Number(selectedInvoice.gst_invoice?.base_amount ?? selectedInvoice.platform_fee_amount) || 0;
                      const cgstAmt = Number(selectedInvoice.gst_invoice?.cgst ?? ((Number(selectedInvoice.gst_amount) || 0) / 2)) || 0;
                      const sgstAmt = Number(selectedInvoice.gst_invoice?.sgst ?? ((Number(selectedInvoice.gst_amount) || 0) / 2)) || 0;
                      const totalAmt = Number(selectedInvoice.gst_invoice?.total_amount ?? (baseAmt + cgstAmt + sgstAmt)) || 0;

                      return (
                        <tr>
                          <td className="p-3 font-sans">
                            <div className="font-semibold text-slate-900">
                              {selectedInvoice.campaign_title || `Collab #${(selectedInvoice.deal_id || selectedInvoice.id || '65da8639').slice(0, 8)}`}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Ybex Platform Facilitation & Escrow Fee
                            </div>
                          </td>
                          <td className="p-3 text-right">₹{baseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">₹{cgstAmt.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{sgstAmt.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            ₹{totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Total Campaign GMV:</span>
                  <span className="font-mono font-semibold text-slate-900">₹{(Number(selectedInvoice.gross_amount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Ybex Facilitation Fee (Commission):</span>
                  <span className="font-mono font-semibold text-[#9D7CFF]">₹{(Number(selectedInvoice.platform_fee_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">GST Accrued (18% on platform fee):</span>
                  <span className="font-mono font-semibold text-amber-600">₹{(Number(selectedInvoice.gst_amount) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-slate-200 text-sm font-extrabold">
                  <span className="text-slate-900">Net Disbursable Creator Payout:</span>
                  <span className="font-mono text-[#027A48]">₹{(Number(selectedInvoice.creator_net_amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-2 italic">
                This is a computer-generated tax invoice issued by Ybex Media. Certified under Section 31 of the CGST Act 2017.
              </div>
            </div>

            <div className="no-print flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#9D7CFF] hover:bg-[#8A63FF] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#9D7CFF]/20 transition-all"
              >
                <Download size={14} /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Refund Modal */}
      {selectedRefundTx && (
        <RefundModal
          transaction={selectedRefundTx}
          onClose={() => setSelectedRefundTx(null)}
          onSuccess={() => fetchTransactions()}
        />
      )}
    </div>
  );
}
