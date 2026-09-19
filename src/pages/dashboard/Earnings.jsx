import React, { useState, useEffect, useMemo } from "react";
import { t } from "@/lib/typography";
import { useNavigate } from "react-router-dom";
import { DollarSign, Wallet, CheckCircle, Clock, Building2, ChevronRight, ChevronLeft, Plus, Edit2, ShieldCheck, X, ShieldAlert, Loader2, FileText, Download, Bell, Send, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import AddPaymentMethod from "../../components/payments/AddPaymentMethod";
import PaymentMethodCard from "../../components/payments/PaymentMethodCard";
import InvoiceModal from "../../components/payments/InvoiceModal";
import TrustBadgeRotator from "../../components/TrustBadgeRotator";

// --- HELPER COMPONENT: COUNT UP ---
function formatInr(val) {
  const num = Number(val) || 0;
  return Number.isInteger(num)
    ? num.toLocaleString('en-IN')
    : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CountUp({ value, prefix = "", suffix = "" }) {
  const spring = useSpring(0, { bounce: 0, duration: 2000 });
  const display = useTransform(spring, (current) => {
    const numericValue = typeof current === 'number' && !isNaN(current) ? current : 0;
    return prefix + Math.round(numericValue).toLocaleString("en-IN") + suffix;
  });

  useEffect(() => {
    const numericTarget = typeof value === 'number' && !isNaN(value) ? value : 0;
    spring.set(numericTarget);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [bankDetails, setBankDetails] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [eligibleDeals, setEligibleDeals] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [requestingPayoutDealId, setRequestingPayoutDealId] = useState(null);
  const [requestNoteModalDeal, setRequestNoteModalDeal] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [kycObj, setKycObj] = useState(null);
  const [platformFeeConfig, setPlatformFeeConfig] = useState(null);
  const [withdrawalRequested, setWithdrawalRequested] = useState(false);
  const itemsPerPage = 10;
  
  useEffect(() => {
    fetchPaymentMethods();
    fetchTransactions();
    fetchKycStatus();
    fetchEligibleDeals();
    fetchFeeConfig();
  }, []);

  const fetchFeeConfig = async () => {
    try {
      const { data } = await api.get('platform/fee-config');
      if (data) setPlatformFeeConfig(data);
    } catch (err) {
      console.warn("Could not load platform fee config:", err);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const { data } = await api.get("verifications/me");
      setKycObj(data);
    } catch (err) {
      console.warn("Could not retrieve KYC in earnings:", err);
    }
  };

  const fetchEligibleDeals = async () => {
    try {
      setLoadingEligible(true);
      const { data } = await api.get('creator/payout-eligible-deals');
      setEligibleDeals(Array.isArray(data) ? data : (Array.isArray(data?.deals) ? data.deals : []));
    } catch (err) {
      console.warn("Could not load eligible deals:", err);
    } finally {
      setLoadingEligible(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await api.get('transactions');
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTxns(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await api.get('creator/payment-methods');
      setPaymentMethods(data || []);
      // Maintain backward compatibility for conditional rendering
      if (data && data.length > 0) {
        setBankDetails(true); 
      }
    } catch (err) {
      console.error("Error fetching payment methods:", err);
    }
  };

  const handleRaisePayoutRequest = async (dealId, note = "") => {
    try {
      setRequestingPayoutDealId(dealId);
      const res = await api.post('creator/payout-request', {
        deal_id: dealId,
        note: note || undefined
      });
      toast.success(res.data?.message || "Payment request submitted to Admin! You will receive updates shortly.");
      setRequestNoteModalDeal(null);
      setRequestNote("");
      await fetchEligibleDeals();
      await fetchTransactions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to raise payment request.");
    } finally {
      setRequestingPayoutDealId(null);
    }
  };
  
  // Calculate Totals using live data
  const txDataSource = transactions;
  
  const isReleasedTx = (e) => e.payout_status === 'RELEASED' || e.payout_status === 'PAID' || Boolean(e.utr_number || e.utrNumber || e.payout_reference);

  const getTxDate = (item) => item.payout_completed_at || item.payout_released_at || item.created_at || item.updated_at;

  const getDynamicTxFee = (item) => {
    const gross = Number(item.gross_amount || item.amount || 0);
    if (item.platform_fee_amount !== undefined && item.platform_fee_amount !== null) {
      return Number(item.platform_fee_amount);
    }
    if (item.fee_amount !== undefined && item.fee_amount !== null) {
      return Number(item.fee_amount);
    }
    const threshold = Number(platformFeeConfig?.threshold_amount) || 20000;
    const belowRate = Number(platformFeeConfig?.below_threshold_rate) ?? 15.0;
    const aboveRate = Number(platformFeeConfig?.above_threshold_rate) ?? 5.0;
    const rate = gross < threshold ? belowRate : aboveRate;
    return Math.round((gross * (rate / 100)) * 100) / 100;
  };

  const getDynamicTxNet = (item) => {
    const gross = Number(item.gross_amount || item.amount || 0);
    if (item.creator_net_amount !== undefined && item.creator_net_amount !== null) {
      return Number(item.creator_net_amount);
    }
    if (item.net_amount !== undefined && item.net_amount !== null) {
      return Number(item.net_amount);
    }
    const fee = getDynamicTxFee(item);
    return Math.max(0, Math.round((gross - fee) * 100) / 100);
  };

  const totalEarned = txDataSource?.filter(e => isReleasedTx(e)).reduce((sum, e) => sum + getDynamicTxNet(e), 0);
  const thisMonth = txDataSource?.filter(e => {
    const d = new Date(getTxDate(e));
    return isReleasedTx(e) && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((sum, e) => sum + getDynamicTxNet(e), 0);
  const pendingPayout = txDataSource?.filter(e => !isReleasedTx(e) && e.status !== 'REFUNDED').reduce((sum, e) => sum + getDynamicTxNet(e), 0);
  const completedCollabs = txDataSource?.filter(e => isReleasedTx(e) || e.status === 'SUCCESS').length;

  const chartData = useMemo(() => {
    const data = [
      { month: "Jan", amount: 0 },
      { month: "Feb", amount: 0 },
      { month: "Mar", amount: 0 },
      { month: "Apr", amount: 0 },
      { month: "May", amount: 0 },
      { month: "Jun", amount: 0 },
      { month: "Jul", amount: 0 },
      { month: "Aug", amount: 0 },
      { month: "Sep", amount: 0 },
      { month: "Oct", amount: 0 },
      { month: "Nov", amount: 0 },
      { month: "Dec", amount: 0 },
    ];
    txDataSource.forEach(tx => {
      if (isReleasedTx(tx) || tx.status === 'paid' || tx.status === 'SUCCESS') {
        const date = new Date(getTxDate(tx));
        const monthIndex = date.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          data[monthIndex].amount += getDynamicTxNet(tx);
        }
      }
    });
    // Return last 6 months
    const currentMonth = new Date().getMonth();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      result.push(data[m]);
    }
    return result;
  }, [txDataSource]);
  const totalPages = Math.ceil(txDataSource.length / itemsPerPage);
  const currentItems = txDataSource.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleBankSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const accNumber = formData.get('account_number');
    const confirmAcc = formData.get('confirm_account_number');
    
    if (accNumber !== confirmAcc) {
      toast.error("Account numbers do not match.");
      return;
    }
    
    setBankDetails({
      account_holder: formData.get('account_holder'),
      account_number: accNumber,
      ifsc: (formData.get('ifsc') || "").toString().toUpperCase(),
      bank_name: formData.get('bank_name'),
      upi_id: formData.get('upi_id'),
    });
    
    toast.success("Bank details saved successfully!");
    setShowBankModal(false);
  };

  const handleWithdrawal = () => {
    setWithdrawalRequested(true);
    toast.success("Payout request submitted! We'll transfer within 3-5 business days.");
  };

  return (
    <div className="w-full max-w-none transition-all duration-300">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-[var(--text-primary)] mb-2 tracking-tight">Earnings &amp; Payouts</h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--text-secondary)]">
            <p>Track your balance, view history, and manage bank information.</p>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-600">•</span>
            <TrustBadgeRotator page="earnings" />
          </div>
        </div>
        
        {/* WITHDRAWAL REQUEST ACTION */}
        {(pendingPayout > 0 && bankDetails) && (
          <button 
            onClick={handleWithdrawal}
            disabled={withdrawalRequested}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${withdrawalRequested ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-not-allowed' : 'bg-[#10B981] hover:bg-[var(--green)] text-[var(--text-primary)] shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}
          >
            {withdrawalRequested ? (
               <>Payout Requested ✓</>
            ) : (
               <>
                 <Wallet size={18} /> Request Payout (₹{(pendingPayout || 0).toLocaleString('en-IN')})
               </>
            )}
          </button>
        )}
      </div>

      {/* KYC WARNING / STATUS BANNER */}
      {user?.role === "creator" && (!kycObj || (kycObj.status?.toLowerCase() !== "approved" && kycObj.status?.toLowerCase() !== "verified")) && (
        <div className="mb-8">
          {(kycObj?.status?.toLowerCase() === "pending" || kycObj?.status?.toLowerCase() === "under_review") ? (
            <div id="kyc-banner-pending" className="relative overflow-hidden bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent border-2 border-amber-500/30 rounded-3xl p-6 text-amber-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_4px_24px_rgba(245,158,11,0.08)]">
                {/* Decorative background glow */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0 mt-1">
                    <span className="p-3 bg-amber-500/15 text-amber-500 rounded-2xl border border-amber-500/25 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-amber-500" />
                    </span>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">Pending Clearance</span>
                      <span className="text-[var(--text-tertiary)] text-[10px] flex items-center gap-1 font-semibold">⏱ Resolves in 24 hrs</span>
                    </div>
                    <h4 className="text-[var(--text-primary)] font-sans font-bold text-base">KYC Compliance Check Under Review</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed font-medium">
                      Our compliance operators are verifying your government IDs, tax registry, settlement bank, and social channel metrics. Payout privileges will automatically unlock as soon as verification completes.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate("/settings?tab=kyc")} 
                  className="w-full md:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 shrink-0 text-center"
                >
                  View Submitted Details
                </button>
              </div>
            ) : kycObj?.status?.toLowerCase() === "rejected" ? (
              <div id="kyc-banner-rejected" className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 sm:p-6 text-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 group cursor-pointer">
                  <span className="p-2.5 bg-rose-500/20 text-rose-400 rounded-t-[14px] rounded-bl-[14px] rounded-br-[4px] border border-rose-500/30 mt-0.5 sm:mt-0 shrink-0 group-hover:anim-jiggle">
                    <ShieldAlert size={18} />
                  </span>
                  <div>
                    <h4 className="text-[var(--text-primary)] font-bold text-sm">KYC Compliance Check Rejected</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                      Correction needed: <span className="text-rose-400 font-semibold">"{kycObj.review_note || "Invalid or blurry ID files."}"</span>. Please resubmit valid details to lift withdrawal constraints immediately.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate("/creator/kyc")} 
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-900/30 whitespace-nowrap"
                >
                  Fix & Resubmit
                </button>
              </div>
            ) : (
              <div id="kyc-banner-unverified" className="bg-[var(--violet)]/10 border border-[var(--violet)]/20 rounded-3xl p-6 text-[var(--violet)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-32 w-32 bg-[var(--violet)]/5 rounded-full filter blur-2xl pointer-events-none" />
                <div className="flex items-start gap-4 group cursor-pointer">
                  <span className="p-3 bg-[var(--violet)]/20 text-[var(--violet)] rounded-t-[14px] rounded-bl-[14px] rounded-br-[4px] border border-[var(--violet)]/20 shrink-0 group-hover:anim-jiggle">
                    <ShieldAlert size={20} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--violet)] bg-[var(--violet)]/10 px-2.5 py-0.5 rounded border border-[var(--violet)]/20">Action Mandatory</span>
                      <span className="text-[var(--text-tertiary)] text-[10px] flex items-center gap-1"> 2 mins verification</span>
                    </div>
                    <h4 className="text-[var(--text-primary)] font-sans font-bold text-base">Complete KYC Verification Now</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                      In compliance with local financial acts and money laundering checks, you must submit automated KYC registration. Unverified accounts cannot initiate direct transfers. Start secure verifications to obtain your Checked badge.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate("/creator/kyc")} 
                  className="px-6 py-3 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[var(--violet)]/20 shrink-0 whitespace-nowrap w-full sm:w-auto text-center"
                >
                  Complete KYC Verification
                </button>
              </div>
            )}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6 relative overflow-hidden transition-all hover:bg-[var(--bg-card)] group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-t-[16px] rounded-bl-[16px] rounded-br-sm bg-[var(--violet)]/20 text-[var(--violet)] flex items-center justify-center">
              <DollarSign size={20} className="group-hover:-translate-y-1 transition-transform" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Earned</div>
          </div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
             <CountUp value={totalEarned} prefix="₹" />
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6 relative overflow-hidden transition-all hover:bg-[var(--bg-card)] group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-t-[16px] rounded-bl-[16px] rounded-br-sm bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock size={20} className="group-hover:anim-jiggle" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">This Month</div>
          </div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
             <CountUp value={thisMonth} prefix="₹" />
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6 relative overflow-hidden transition-all hover:bg-[var(--bg-card)] group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-t-[16px] rounded-bl-[16px] rounded-br-sm bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Wallet size={20} className="group-hover:animate-pulse" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pending Payout</div>
          </div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
             <CountUp value={pendingPayout} prefix="₹" />
          </div>
        </div>

        <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6 relative overflow-hidden transition-all hover:bg-[var(--bg-card)] group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-t-[16px] rounded-bl-[16px] rounded-br-sm bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle size={20} className="group-hover:anim-fold" />
            </div>
            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Completed Collabs</div>
          </div>
          <div className="text-3xl font-display font-bold text-[var(--text-primary)] tracking-tight">
             <CountUp value={completedCollabs} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        
        {/* TRANSACTIONS CHART (LEFT) */}
        <div className="xl:col-span-2 bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Earnings Overview</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{fill: '#9CA3AF', fontSize: 13}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fill: '#9CA3AF', fontSize: 13}} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${(value || 0).toLocaleString()}`} />
                <Tooltip 
                  cursor={{fill: 'rgba(124, 58, 237, 0.1)'}}
                  contentStyle={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#FFFFFF' }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                  formatter={(value) => [`₹${(value || 0).toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="var(--violet)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PAYOUT REQUESTS SECTION (RIGHT) */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl p-6 flex flex-col h-full">
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-600/10 px-2.5 py-0.5 rounded-full border border-emerald-600/30 flex items-center gap-1">
                  <CheckCircle size={11} /> Brand Approved
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">Ready for Payout</span>
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Deals Cleared for Disbursement</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Request admin payout release for approved deliverables below.
              </p>
            </div>

            <div className="flex-grow flex flex-col space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {eligibleDeals && eligibleDeals.length > 0 ? (
                eligibleDeals.map((deal) => {
                  const netAmount = Number(deal.creator_net_amount || (deal.amount * 0.9) || deal.amount || 0);
                  const isRequested = Boolean(deal.payout_requested);
                  const reqCount = Number(deal.request_count || 1);

                  return (
                    <div key={`eligible-deal-${deal.deal_id}`} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-500/50 transition-all">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-[var(--text-primary)] truncate" title={deal.brand_name}>
                            {deal.brand_name || 'Brand Partner'}
                          </span>
                          <span className="font-display font-extrabold text-sm text-emerald-800 dark:text-emerald-400">
                            ₹{netAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-medium line-clamp-1" title={deal.deal_title}>
                          {deal.deal_title || 'UGC Collaboration'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between gap-2">
                        {isRequested ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                            <Bell size={11} /> Requested ({reqCount}x)
                          </div>
                        ) : (
                          <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                            Payout ready
                          </div>
                        )}

                        <button
                          onClick={() => setRequestNoteModalDeal(deal)}
                          disabled={requestingPayoutDealId === deal.deal_id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                            isRequested
                              ? 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)]'
                              : 'bg-[#027A48] hover:bg-[#02653C] text-white shadow-emerald-500/20'
                          }`}
                        >
                          <Send size={12} className={isRequested ? "text-amber-500" : "text-white"} />
                          <span>{isRequested ? "Reminder" : "Request"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 my-auto text-[var(--text-secondary)] text-sm">
                  <p>No deals currently cleared for payout.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && <InvoiceModal transaction={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
      </AnimatePresence>

      {/* TRANSACTIONS TABLE */}
      <div className="bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-default)] rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Transaction History</h2>
        </div>
        
        {loadingTxns ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-[var(--border-default)]">
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4"></div>
                </div>
                <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : txDataSource.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
             <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
               <DollarSign className="text-[var(--text-primary)]/20" size={32} />
             </div>
             <h3 className="text-[var(--text-primary)] font-medium mb-2">No earnings yet</h3>
             <p className="text-sm text-[var(--text-secondary)] mb-6">Complete campaigns and collaborations to earn money.</p>
             <button className="text-[var(--violet)] font-bold text-sm bg-[var(--violet)]/10 hover:bg-[var(--violet)]/20 px-6 py-2.5 rounded-xl transition-colors">
               Explore Campaigns
             </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                  <th className={`p-4 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap font-mono tracking-tight text-sm`}>Campaign Name</th>
                  <th className={`p-4 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap font-mono tracking-tight text-sm`}>Net Bank Payout</th>
                  <th className={`p-4 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap font-mono tracking-tight text-sm`}>Breakdown (Gross - Fee)</th>
                  <th className={`p-4 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap font-mono tracking-tight text-sm`}>Payout Status</th>
                  <th className={`p-4 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider font-mono tracking-tight text-sm text-right whitespace-nowrap`}>Date</th>
                  <th className={`p-4 pr-6 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider font-mono tracking-tight text-sm text-right whitespace-nowrap`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentItems?.map((item) => {
                  const grossAmount = Number(item.gross_amount || item.amount || 0);
                  const feeAmount = getDynamicTxFee(item);
                  const netAmount = getDynamicTxNet(item);
                  const feePercentage = grossAmount > 0 ? Math.round((feeAmount / grossAmount) * 100) : 0;
                  const title = item.campaign_title || (item.deals && item.deals.campaigns ? item.deals.campaigns.title : 'Campaign Payment');
                  
                  const isTransferred = item.payout_status === 'RELEASED' || item.payout_status === 'PAID' || Boolean(item.utr_number || item.utrNumber || item.payout_reference);
                  const utrNum = item.utr_number || item.utrNumber || item.payout_reference;
                  const dealId = item.deal_id || (item.deals ? item.deals.id : null);
                  const matchingEligible = eligibleDeals.find(d => d.deal_id === dealId);
                  const isApproved = Boolean(item.is_brand_approved || matchingEligible || item.payout_status === 'READY_FOR_RELEASE');
                  const isRequested = Boolean(matchingEligible?.payout_requested || item.payout_requested);
                  const reqCount = matchingEligible?.request_count || item.payout_request_count || 1;
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-[var(--text-primary)] whitespace-nowrap">{title}</td>
                      <td className="p-4 font-display font-extrabold text-[var(--text-primary)] text-sm whitespace-nowrap">
                        ₹{formatInr(netAmount)}
                      </td>
                      <td className="p-4 text-xs whitespace-nowrap text-[var(--text-secondary)]">
                        <span className="font-mono text-[var(--text-primary)]">₹{formatInr(grossAmount)}</span>
                        <span className="text-rose-400 font-mono ml-1">- ₹{formatInr(feeAmount)} ({feePercentage}%)</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                         <span className={`inline-flex flex-col gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                           isTransferred 
                             ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20' 
                             : isApproved
                               ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                               : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                         }`}>
                           <span>
                             {isTransferred 
                               ? 'DONE ✓' 
                               : isApproved 
                                 ? 'Brand Approved (Ready)' 
                                 : 'In Escrow (Awaiting Approval)'}
                           </span>
                           {utrNum && <span className="text-[9px] font-mono text-emerald-400 font-semibold">UTR: {utrNum}</span>}
                         </span>
                      </td>
                      <td className="p-4 text-right text-[var(--text-secondary)] text-sm whitespace-nowrap">
                        <span className="block font-mono text-xs">
                          {new Date(getTxDate(item)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {item.payout_completed_at && item.created_at && (
                          <span className="text-[10px] text-[var(--text-tertiary)] font-mono block">
                            Funded: {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!isTransferred && isApproved && dealId && (
                            <button
                              onClick={() => {
                                const targetDeal = matchingEligible || {
                                  deal_id: dealId,
                                  deal_title: title,
                                  brand_name: item.brand_name || 'Brand',
                                  amount: grossAmount,
                                  creator_net_amount: netAmount,
                                  payout_requested: isRequested,
                                  request_count: reqCount
                                };
                                setRequestNoteModalDeal(targetDeal);
                              }}
                              disabled={requestingPayoutDealId === dealId}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isRequested
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                                  : 'bg-[#027A48] text-white hover:bg-[#02653C] shadow-sm'
                              }`}
                              title={isRequested ? `Payment request already sent (${reqCount}x). Click to send a reminder.` : "Raise payment disbursement request to admin"}
                            >
                              <Send size={11} className={isRequested ? "text-amber-500" : "text-white"} />
                              <span>{isRequested ? `Remind (${reqCount}x)` : "Ask Payment"}</span>
                            </button>
                          )}

                          <button 
                            onClick={() => setSelectedInvoice(item)} 
                            className="text-xs text-[var(--violet)] hover:text-[var(--text-primary)] bg-[var(--violet)]/20 px-3 py-1.5 rounded-lg transition-colors border border-[var(--violet)]/30 flex items-center gap-1.5"
                          >
                            <FileText size={12} /> Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
           <div className="p-4 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-secondary)]">
             <div>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, txDataSource.length)} of {txDataSource.length} entries</div>
             <div className="flex items-center gap-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 transition-colors"
               >
                 <ChevronLeft size={16} />
               </button>
               <div className="px-3 font-semibold text-[var(--text-primary)]">Page {currentPage} of {totalPages}</div>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 transition-colors"
               >
                 <ChevronRight size={16} />
               </button>
             </div>
           </div>
        )}
      </div>

      {/* BANK DETAILS MODAL */}
      {showBankModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBankModal(false)}></div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="text-[var(--violet)]" size={22} />
                Bank Information
              </h2>
              <button type="button" onClick={() => setShowBankModal(false)} className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="bank-form" onSubmit={handleBankSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Account Holder Name</label>
                  <input required name="account_holder" defaultValue={bankDetails?.account_holder} type="text" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all font-medium" placeholder="As per bank records" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Account Number</label>
                  <input required name="account_number" defaultValue={bankDetails?.account_number} type="password" placeholder="Enter Account Number" className={`w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all font-mono tracking-tight text-sm`} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Confirm Account Number</label>
                  <input required name="confirm_account_number" defaultValue={bankDetails?.account_number} type="text" placeholder="Re-enter Account Number" className={`w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all font-mono tracking-tight text-sm`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">IFSC Code</label>
                    <input required name="ifsc" defaultValue={bankDetails?.ifsc} type="text" placeholder="e.g. HDFC0001234" className={`w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all uppercase font-mono tracking-tight text-sm`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Bank Name</label>
                    <input required name="bank_name" defaultValue={bankDetails?.bank_name} type="text" placeholder="e.g. HDFC Bank" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all font-medium" />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex justify-between">
                    <span>UPI ID</span>
                    <span className="text-[var(--text-tertiary)]">(Optional)</span>
                  </label>
                  <input name="upi_id" defaultValue={bankDetails?.upi_id} type="text" pattern="^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$" placeholder="yourname@bank" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]/50 transition-all font-medium" />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-[var(--border-default)] shrink-0 bg-white/[0.02]">
               <button form="bank-form" type="submit" className="w-full bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white py-3 rounded-xl font-bold shadow-[0_4px_15px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2">
                 <ShieldCheck size={18} /> Save Securely
               </button>
            </div>
          </div>
        </div>
      )}

      {/* RAISE PAYOUT REQUEST MODAL */}
      {requestNoteModalDeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRequestNoteModalDeal(null)}></div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl w-full max-w-md relative z-10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">
                    {requestNoteModalDeal.payout_requested ? "Send Payout Reminder" : "Request Payout Release"}
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">Brand Approved • Escrow Ready</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setRequestNoteModalDeal(null)} 
                className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-default)]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Campaign</span>
                    <span className="font-bold text-xs text-[var(--text-primary)]">{requestNoteModalDeal.deal_title || 'Deliverables'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-600/10 px-2 py-0.5 rounded-full border border-emerald-600/30">
                    Approved
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[var(--border-default)]">
                  <span className="text-xs text-[var(--text-secondary)]">Net Disbursable Amount:</span>
                  <span className="font-display font-extrabold text-base text-emerald-800 dark:text-emerald-400">
                    ₹{Number(requestNoteModalDeal.creator_net_amount || (requestNoteModalDeal.amount * 0.9) || requestNoteModalDeal.amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Note to Finance / Admin</span>
                  <span className="text-[var(--text-tertiary)] font-normal">(Optional)</span>
                </label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="e.g. Published on Instagram, links verified, please release to primary UPI / Bank."
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none h-20"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                <span>
                  Admin will verify bank/UPI coordinates and transfer directly. UTR reference number will be linked to your statement.
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-default)] bg-white/[0.01] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRequestNoteModalDeal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRaisePayoutRequest(requestNoteModalDeal.deal_id, requestNote)}
                disabled={requestingPayoutDealId === requestNoteModalDeal.deal_id}
                className="px-5 py-2.5 rounded-xl bg-[#027A48] hover:bg-[#02653C] text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {requestingPayoutDealId === requestNoteModalDeal.deal_id ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>{requestNoteModalDeal.payout_requested ? "Send Reminder" : "Confirm Request"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
