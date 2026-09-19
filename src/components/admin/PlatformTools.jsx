import React, { useState, useEffect, useMemo } from 'react';
import { formatAmount, safeArray, safeLower, safeUpper } from "../../utils/safeFormat";
import { 
  Settings, Wrench, RadioReceiver, Ticket, Share2, DollarSign, Image as ImageIcon, 
  Search, Plus, X, Edit3, Trash2, Clock, CheckCircle2, AlertTriangle, Lock, 
  ShieldAlert, RefreshCw, Save, ChevronRight, UserCheck, ShieldCheck, ArrowUpRight,
  Filter, Eye, Percent, AlertCircle, Ban
} from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BannerManager from './BannerManager';
import LandingContentManager from './LandingContentManager';

export default function PlatformTools() {
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance' | 'fees' | 'coupons' | 'referrals' | 'messages' | 'banners'
  const [searchQuery, setSearchQuery] = useState('');

  // Maintenance State
  const [maintenanceCreator, setMaintenanceCreator] = useState(false);
  const [maintenanceBrand, setMaintenanceBrand] = useState(false);
  const [autoOffCreator, setAutoOffCreator] = useState('');
  const [autoOffBrand, setAutoOffBrand] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [enabledBy, setEnabledBy] = useState('');
  const [enabledAt, setEnabledAt] = useState('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [confirmData, setConfirmData] = useState({ type: null, currentVal: false, autoOffHours: '' });

  // Fees & Risk Controls State
  const [feeConfig, setFeeConfig] = useState({
    threshold_amount: 20000,
    below_threshold_rate: 15.0,
    above_threshold_rate: 5.0,
    gst_rate: 18.0,
    platform_gst_registered: false,
    platform_gstin: '',
    ugc_commission_pct: 10.0,
    min_withdrawal_amount: 1000,
    withdrawal_fee_rate: 0,
    payout_freeze_all: false,
    dispute_refund_window_days: 7,
    min_campaign_budget: 500,
    max_campaign_budget: 1000000
  });
  const [originalFeeConfig, setOriginalFeeConfig] = useState({});
  const [savingFees, setSavingFees] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'zero_fee', // 'zero_fee' | 'flat_discount'
    discount_amount: 200,
    applies_to: 'creator', // 'creator' | 'brand'
    usage_limit: 100,
    per_user_limit: 1,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: '',
    min_campaign_value: 1000,
    status: 'active'
  });
  const [viewRedemptionsModal, setViewRedemptionsModal] = useState(null);
  const [couponRedemptions, setCouponRedemptions] = useState([]);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState(null);
  const [deletingCoupon, setDeletingCoupon] = useState(false);

  // Referrals State
  const [referralConfig, setReferralConfig] = useState({
    creator_referral_reward: 500,
    brand_referral_reward: 1000,
    referral_trigger_action: 'first_completed_collab',
    referral_monthly_cap: 10,
    referral_enabled: true
  });
  const [referralsActivity, setReferralsActivity] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [savingReferralConfig, setSavingReferralConfig] = useState(false);

  // Version Messages State
  const [versions, setVersions] = useState([]);
  const [versionNumber, setVersionNumber] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [changelogText, setChangelogText] = useState('');
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Resend Broadcast Email State
  const [broadcastAudience, setBroadcastAudience] = useState('all');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastHeading, setBroadcastHeading] = useState('');
  const [broadcastBodyText, setBroadcastBodyText] = useState('');
  const [broadcastCtaLabel, setBroadcastCtaLabel] = useState('Explore Ybex Dashboard');
  const [broadcastCtaUrl, setBroadcastCtaUrl] = useState('/');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Load All Initial Data
  const loadSystemStatus = async () => {
    try {
      const { data } = await api.get("system-status");
      if (data) {
        setMaintenanceCreator(!!data.maintenance_mode_creator);
        setMaintenanceBrand(!!data.maintenance_mode_brand);
        setTypedMessage(data.message || '');
        setEnabledBy(data.enabled_by || '');
        setEnabledAt(data.enabled_at || '');
      }
    } catch (e) {
      console.warn("Failed to fetch system status:", e);
    }
  };

  const loadFeeConfig = async () => {
    try {
      const { data } = await api.get("admin/fee-config");
      if (data) {
        const loaded = {
          threshold_amount: data.threshold_amount ?? 20000,
          below_threshold_rate: data.below_threshold_rate ?? 15.0,
          above_threshold_rate: data.above_threshold_rate ?? 5.0,
          gst_rate: data.gst_rate ?? 18.0,
          platform_gst_registered: !!data.platform_gst_registered,
          platform_gstin: data.platform_gstin || '',
          ugc_commission_pct: data.ugc_commission_pct ?? 10.0,
          min_withdrawal_amount: data.min_withdrawal_amount ?? 1000,
          withdrawal_fee_rate: data.withdrawal_fee_rate ?? 0,
          payout_freeze_all: !!data.payout_freeze_all,
          dispute_refund_window_days: data.dispute_refund_window_days ?? 7,
          min_campaign_budget: data.min_campaign_budget ?? 500,
          max_campaign_budget: data.max_campaign_budget ?? 1000000
        };
        setFeeConfig(loaded);
        setOriginalFeeConfig(loaded);
      }
    } catch (e) {
      console.warn("Failed to fetch fee config:", e);
    }
  };

  const loadCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const { data } = await api.get("admin/coupons");
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch coupons:", e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const loadReferrals = async () => {
    setLoadingReferrals(true);
    try {
      const { data } = await api.get("admin/referrals");
      if (data) {
        if (data.config) {
          setReferralConfig({
            creator_referral_reward: data.config.creator_referral_reward ?? 500,
            brand_referral_reward: data.config.brand_referral_reward ?? 1000,
            referral_trigger_action: data.config.referral_trigger_action || 'first_completed_collab',
            referral_monthly_cap: data.config.referral_monthly_cap ?? 10,
            referral_enabled: data.config.referral_enabled !== false
          });
        }
        setReferralsActivity(Array.isArray(data.activity) ? data.activity : []);
      }
    } catch (e) {
      console.warn("Failed to fetch referrals:", e);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const loadVersions = async () => {
    try {
      const { data } = await api.get("admin/versions");
      setVersions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to fetch versions:", e);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    loadFeeConfig();
    loadCoupons();
    loadReferrals();
    loadVersions();
  }, []);

  // Universal Search Index Definitions
  const searchIndex = useMemo(() => [
    { tab: 'maintenance', title: 'Creator Maintenance Mode', desc: 'Toggle platform access lock for Creator users' },
    { tab: 'maintenance', title: 'Brand Maintenance Mode', desc: 'Toggle platform access lock for Brand users' },
    { tab: 'maintenance', title: 'Maintenance Custom Message', desc: 'Message displayed during scheduled maintenance' },
    { tab: 'fees', title: 'Fee Threshold Amount', desc: 'Deal boundary (₹50,000) switching between 10% and 8% deduction' },
    { tab: 'fees', title: 'Below Threshold Fee Rate (%)', desc: 'Creator platform deduction rate for deals under threshold' },
    { tab: 'fees', title: 'Above Threshold Fee Rate (%)', desc: 'Creator platform deduction rate for deals over threshold' },
    { tab: 'fees', title: 'GST Taxation Rate (%)', desc: 'GST percentage applied on platform fee deduction' },
    { tab: 'fees', title: 'Platform GSTIN Registration', desc: 'GST registration status and GSTIN number' },
    { tab: 'fees', title: 'UGC Order Commission (%)', desc: 'Commission charged on UGC brand brief orders' },
    { tab: 'fees', title: 'Minimum Payout/Withdrawal Amount', desc: 'Floor amount required for creator wallet payout request' },
    { tab: 'fees', title: 'Global Payout Freeze Switch', desc: 'Emergency freeze all escrow/wallet disbursements' },
    { tab: 'fees', title: 'Dispute & Refund Window', desc: 'Grace period (days) brands have to contest content delivery' },
    { tab: 'fees', title: 'Min & Max Campaign Budget', desc: 'Floor and ceiling limits for brand campaign budgets' },
    { tab: 'coupons', title: 'Create Coupon Code', desc: 'Generate Zero Fee or Flat Discount promotional coupons' },
    { tab: 'coupons', title: 'Zero Platform Fee Coupon', desc: 'Waive creator platform deduction fee for N redemptions' },
    { tab: 'coupons', title: 'Flat Discount Coupon', desc: 'Flat ₹ amount discount on brand campaign budget' },
    { tab: 'referrals', title: 'Creator Referral Reward', desc: 'Flat bonus awarded for referring new creators' },
    { tab: 'referrals', title: 'Brand Referral Reward', desc: 'Flat bonus awarded for referring new brands' },
    { tab: 'referrals', title: 'Referral Trigger Condition', desc: 'Action required before referral reward is triggered' },
    { tab: 'referrals', title: 'Referral Monthly Cap', desc: 'Maximum paid referrals allowed per user per month' },
    { tab: 'messages', title: 'Version Update Manager', desc: 'Draft and broadcast app updates and changelogs' },
    { tab: 'banners', title: 'Banner Management', desc: 'Manage Common, Creator, and Brand hero banners' }
  ], []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex.filter(item => 
      safeLower(item.title).includes(q) || safeLower(item.desc).includes(q)
    );
  }, [searchQuery, searchIndex]);

  // Tab definitions
  const tabs = [
    { id: 'broadcast', label: 'Resend Email Broadcast', icon: RadioReceiver },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'fees', label: 'Fees & Risk Controls', icon: DollarSign },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'messages', label: 'App Version Updates', icon: Clock },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'landing', label: 'Landing Page', icon: ImageIcon }
  ];

  // Resend Promotional Broadcast Handler
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBodyText.trim()) {
      toast.error("Subject and Email Body are required!");
      return;
    }
    setSendingBroadcast(true);
    try {
      const { data } = await api.post("admin/broadcast-email", {
        targetAudience: broadcastAudience,
        subject: broadcastSubject,
        heading: broadcastHeading,
        bodyText: broadcastBodyText,
        ctaLabel: broadcastCtaLabel,
        ctaUrl: broadcastCtaUrl
      });
      toast.success(data.message || "Mass broadcast email dispatched successfully!");
      setBroadcastSubject('');
      setBroadcastHeading('');
      setBroadcastBodyText('');
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to dispatch email broadcast");
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Maintenance Handlers
  const handleSaveMaintenanceMessage = async () => {
    try {
      await api.post("admin/maintenance", {
        type: 'creator',
        maintenance: maintenanceCreator,
        message: typedMessage
      });
      toast.success("Maintenance message updated successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update maintenance message");
    }
  };

  const triggerToggleConfirm = (type, currentVal, autoOffHours) => {
    setConfirmData({ type, currentVal, autoOffHours });
    setShowMaintenanceModal(true);
  };

  const handleConfirmMaintenanceToggle = async () => {
    setShowMaintenanceModal(false);
    const { type, currentVal, autoOffHours } = confirmData;
    const newVal = !currentVal;

    if (type === 'creator') setMaintenanceCreator(newVal);
    if (type === 'brand') setMaintenanceBrand(newVal);

    try {
      await api.post("admin/maintenance", {
        type,
        maintenance: newVal,
        autoOffHours: newVal && autoOffHours ? Number(autoOffHours) : null,
        message: typedMessage
      });
      toast.success(`${type === 'creator' ? 'Creator' : 'Brand'} maintenance mode ${newVal ? 'enabled' : 'disabled'}`);
      loadSystemStatus();
    } catch (err) {
      if (type === 'creator') setMaintenanceCreator(!newVal);
      if (type === 'brand') setMaintenanceBrand(!newVal);
      toast.error(err?.response?.data?.error || err?.message || "Failed to update maintenance mode");
    }
  };

  // Fees Handlers
  const handleSaveFees = async () => {
    setSavingFees(true);
    setShowFeeModal(false);
    try {
      const { data } = await api.put("admin/fee-config", feeConfig);
      toast.success("Fee configuration & risk controls saved live to Supabase!");
      if (data) {
        setFeeConfig(data);
        setOriginalFeeConfig(data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save fee configuration");
    } finally {
      setSavingFees(false);
    }
  };

  // Coupon Handlers
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      if (editingCoupon) {
        await api.put(`admin/coupons/${editingCoupon.id}`, couponForm);
        toast.success("Coupon updated successfully!");
      } else {
        await api.post("admin/coupons", couponForm);
        toast.success("New coupon created successfully!");
      }
      setShowCouponModal(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save coupon");
    }
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code || '',
      type: coupon.type || 'zero_fee',
      discount_amount: coupon.discount_amount ?? 200,
      override_fee_rate: coupon.override_fee_rate ?? 5,
      applies_to_first_n_payouts: coupon.applies_to_first_n_payouts ?? 1,
      applies_to: coupon.applies_to || 'creator',
      usage_limit: coupon.usage_limit ?? 100,
      per_user_limit: coupon.per_user_limit ?? 1,
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : new Date().toISOString().slice(0, 10),
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : '',
      min_campaign_value: coupon.min_campaign_value ?? 1000,
      status: coupon.status || 'active'
    });
    setShowCouponModal(true);
  };

  const handleToggleCouponStatus = async (coupon) => {
    const nextStatus = coupon.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`admin/coupons/${coupon.id}/status`, { status: nextStatus });
      toast.success(`Coupon ${coupon.code} status set to ${nextStatus}`);
      loadCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status");
    }
  };

  const handleConfirmDeleteCoupon = async () => {
    if (!deleteConfirmCoupon) return;
    setDeletingCoupon(true);
    try {
      await api.delete(`admin/coupons/${deleteConfirmCoupon.id}`);
      toast.success(`Coupon ${deleteConfirmCoupon.code} deleted successfully`);
      setDeleteConfirmCoupon(null);
      loadCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete coupon");
    } finally {
      setDeletingCoupon(false);
    }
  };

  const handleViewRedemptions = async (coupon) => {
    setViewRedemptionsModal(coupon);
    try {
      const { data } = await api.get(`admin/coupons/${coupon.id}/redemptions`);
      setCouponRedemptions(Array.isArray(data) ? data : []);
    } catch (e) {
      setCouponRedemptions([]);
    }
  };

  // Referral Handlers
  const handleSaveReferrals = async () => {
    setSavingReferralConfig(true);
    try {
      await api.post("admin/fee-config", referralConfig);
      toast.success("Referral program configuration updated!");
      loadReferrals();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save referral config");
    } finally {
      setSavingReferralConfig(false);
    }
  };

  // Version Message Handlers
  const handleDraftVersion = async (e) => {
    e.preventDefault();
    if (!versionNumber.trim()) {
      toast.error("Please enter a version number");
      return;
    }
    const changelogArray = changelogText.split("\n").map(l => l.trim().replace(/^[•\-\*\s]+/, "")).filter(Boolean);
    if (changelogArray.length === 0) {
      toast.error("Please enter at least one changelog bullet point");
      return;
    }

    setSubmittingVersion(true);
    try {
      await api.post("admin/versions", {
        version_number: versionNumber,
        target_audience: targetAudience,
        changelog: changelogArray
      });
      toast.success("Version drafted successfully!");
      setVersionNumber('');
      setChangelogText('');
      loadVersions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to draft version");
    } finally {
      setSubmittingVersion(false);
    }
  };

  const handlePublishVersion = async (id) => {
    try {
      await api.post(`admin/versions/${id}/publish`);
      toast.success("Version published! Active users will be notified.");
      loadVersions();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to publish version");
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Platform Settings & Tools</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure maintenance modes, fees, coupons, and rules.</p>
        </div>
      </div>

      {/* Universal Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-[var(--text-tertiary)]" />
          <input 
            type="text" 
            placeholder="Search platform settings, fee rules, coupons, referrals, or maintenance controls..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl pl-12 pr-10 py-3.5 text-sm font-medium focus:outline-none focus:border-[#9D7CFF] transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-3.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Live Search Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-2 z-[100] max-h-80 overflow-y-auto divide-y divide-[var(--border-default)]">
            {searchResults.map((item, idx) => (
              <div 
                key={`search-${item.tab}-${item.title}-${idx}`}
                onClick={() => {
                  setActiveTab(item.tab);
                  setSearchQuery('');
                }}
                className="p-3 hover:bg-[var(--bg-elevated)] rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[#9D7CFF] flex items-center gap-2">
                    {item.title}
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#9D7CFF]/10 text-[#9D7CFF]">
                      {item.tab}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{item.desc}</div>
                </div>
                <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:text-[#9D7CFF]" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Horizontal Pill Navigation Shell */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-[var(--border-default)] pt-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-[#9D7CFF] text-white shadow-md shadow-[#9D7CFF]/20' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#9D7CFF]/40'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB: RESEND PROMOTIONAL BROADCAST EMAIL */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-default)]">
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <RadioReceiver size={20} className="text-[#9D7CFF]"/> Promotional Mass Email Broadcast (Resend API)
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Send real email alerts, announcements, and promotional updates directly to your registered users via Resend.
                </p>
              </div>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-mono font-bold">
                Resend Active
              </span>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-5 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Target Audience</label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#9D7CFF]"
                  >
                    <option value="unclaimed_creators">Unclaimed Creators & Waitlist Applications Only (Convert to Sign-up)</option>
                    <option value="all_with_unclaimed">All Users + Unclaimed Creators & Waitlist (Maximum Reach)</option>
                    <option value="all">Registered Users Only (Creators + Brands + Agencies)</option>
                    <option value="creators">Registered Creators Only</option>
                    <option value="brands">Registered Brands Only</option>
                    <option value="agencies">Registered Agencies Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Email Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g. 🎉 Exciting New Feature on Ybex Media!"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Heading Banner (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive Update for Ybex Partners"
                  value={broadcastHeading}
                  onChange={(e) => setBroadcastHeading(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Email Message Body</label>
                <textarea
                  rows={6}
                  placeholder="Write your email body message here..."
                  value={broadcastBodyText}
                  onChange={(e) => setBroadcastBodyText(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-sm focus:outline-none focus:border-[#9D7CFF] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Button Label (CTA)</label>
                  <input
                    type="text"
                    placeholder="e.g. Claim Offer / View Campaign"
                    value={broadcastCtaLabel}
                    onChange={(e) => setBroadcastCtaLabel(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Button Target Link (CTA URL)</label>
                  <input
                    type="text"
                    placeholder="e.g. /campaigns or /chat"
                    value={broadcastCtaUrl}
                    onChange={(e) => setBroadcastCtaUrl(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="px-6 py-3 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#9D7CFF]/20 flex items-center gap-2"
                >
                  <RadioReceiver size={18} />
                  {sendingBroadcast ? 'Sending Mass Email Broadcast...' : 'Dispatch Email Broadcast via Resend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
              <Wrench size={18} className="text-[#9D7CFF]"/> Global Platform Maintenance Toggles
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              Lock creator or brand side access independently. Active sessions are automatically presented with the upgrade screen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Creator Maintenance Card */}
              <div className={`p-5 rounded-xl border transition-all ${maintenanceCreator ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">Creator Side Lock</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Applies to all creator accounts</p>
                  </div>
                  <button 
                    onClick={() => triggerToggleConfirm('creator', maintenanceCreator, autoOffCreator)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      maintenanceCreator 
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                        : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-amber-500'
                    }`}
                  >
                    {maintenanceCreator ? '🔒 Locked (Active)' : '🔓 Unlocked (Live)'}
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Auto-Off Timer (Hours)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2 (Leave empty for manual)" 
                    value={autoOffCreator}
                    onChange={(e) => setAutoOffCreator(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              </div>

              {/* Brand Maintenance Card */}
              <div className={`p-5 rounded-xl border transition-all ${maintenanceBrand ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">Brand Side Lock</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Applies to all brand accounts</p>
                  </div>
                  <button 
                    onClick={() => triggerToggleConfirm('brand', maintenanceBrand, autoOffBrand)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      maintenanceBrand 
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                        : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-amber-500'
                    }`}
                  >
                    {maintenanceBrand ? '🔒 Locked (Active)' : '🔓 Unlocked (Live)'}
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Auto-Off Timer (Hours)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2 (Leave empty for manual)" 
                    value={autoOffBrand}
                    onChange={(e) => setAutoOffBrand(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              </div>

            </div>

            {/* Custom Maintenance Message */}
            <div className="mt-6 space-y-3">
              <label className="text-xs font-bold text-[var(--text-primary)] block">Maintenance Overlay Broadcast Message</label>
              <textarea 
                placeholder="Enter custom maintenance note (e.g. We are performing scheduled database upgrades...)" 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="w-full h-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-xs focus:outline-none focus:border-[#9D7CFF] resize-none"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {enabledAt ? `Last modified by ${enabledBy || 'Admin'} at ${new Date(enabledAt).toLocaleString()}` : ''}
                </span>
                <button 
                  onClick={handleSaveMaintenanceMessage}
                  className="px-5 py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Save size={14} /> Save Message Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEES & MONEY RISK CONTROLS */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          
          {/* Main Fees Configuration Form */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-400"/> Platform Fee Model & GST Setup
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Brands pay ₹0 platform fee. Fee deductions apply strictly to Creator payout amounts based on deal threshold.
                </p>
              </div>
              <button 
                onClick={() => setShowFeeModal(true)}
                className="px-5 py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <Save size={14} /> Review & Apply Changes
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Threshold Amount (₹)</label>
                <input 
                  type="number" 
                  value={feeConfig.threshold_amount}
                  onChange={(e) => setFeeConfig({...feeConfig, threshold_amount: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
                <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Boundary (Default ₹50,000)</span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Below Threshold Rate (%)</label>
                <input 
                  type="number" step="0.1"
                  value={feeConfig.below_threshold_rate}
                  onChange={(e) => setFeeConfig({...feeConfig, below_threshold_rate: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
                <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Deals ≤ ₹{formatAmount(feeConfig.threshold_amount)} (10%)</span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Above Threshold Rate (%)</label>
                <input 
                  type="number" step="0.1"
                  value={feeConfig.above_threshold_rate}
                  onChange={(e) => setFeeConfig({...feeConfig, above_threshold_rate: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
                <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Deals &gt; ₹{formatAmount(feeConfig.threshold_amount)} (8%)</span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">GST Rate on Fee (%)</label>
                <input 
                  type="number" step="0.1"
                  value={feeConfig.gst_rate}
                  onChange={(e) => setFeeConfig({...feeConfig, gst_rate: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
                <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Government GST (18%)</span>
              </div>
            </div>

            {/* GST Details & UGC Commission */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] mb-8">
              <div className="flex items-center justify-between md:block">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block">GST Registered Entity</label>
                  <p className="text-[10px] text-[var(--text-secondary)]">Show GST invoices on creator payouts</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFeeConfig({...feeConfig, platform_gst_registered: !feeConfig.platform_gst_registered})}
                  className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    feeConfig.platform_gst_registered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  {feeConfig.platform_gst_registered ? 'Registered (Active)' : 'Not Registered'}
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Platform GSTIN Number</label>
                <input 
                  type="text" 
                  placeholder="27AAAAA0000A1Z5"
                  value={feeConfig.platform_gstin}
                  onChange={(e) => setFeeConfig({...feeConfig, platform_gstin: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">UGC Order Commission Rate (%)</label>
                <input 
                  type="number" step="0.1"
                  value={feeConfig.ugc_commission_pct}
                  onChange={(e) => setFeeConfig({...feeConfig, ugc_commission_pct: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>
            </div>

            {/* Money & Risk Controls Block */}
            <div className="pt-6 border-t border-[var(--border-default)]">
              <h4 className="font-display text-base font-bold flex items-center gap-2 mb-1 text-amber-400">
                <ShieldAlert size={17} /> Money & Risk Financial Controls
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mb-5">
                Financial safety parameters, minimum payouts, campaign caps, and emergency payout freeze switches.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Global Payout Freeze Toggle */}
                <div className={`p-4 rounded-xl border ${feeConfig.payout_freeze_all ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'}`}>
                  <label className="text-xs font-bold text-red-400 block mb-1">Global Payout Freeze</label>
                  <p className="text-[10px] text-[var(--text-secondary)] mb-3">Freeze all wallet disbursements during audits</p>
                  <button 
                    type="button"
                    onClick={() => setFeeConfig({...feeConfig, payout_freeze_all: !feeConfig.payout_freeze_all})}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      feeConfig.payout_freeze_all 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                        : 'bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-red-500/40'
                    }`}
                  >
                    {feeConfig.payout_freeze_all ? '🚨 PAYOUTS FROZEN' : '✅ Payouts Normal'}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Dispute & Refund Window (Days)</label>
                  <input 
                    type="number" 
                    value={feeConfig.dispute_refund_window_days}
                    onChange={(e) => setFeeConfig({...feeConfig, dispute_refund_window_days: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Days to dispute before auto-release</span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Min Campaign Budget (₹)</label>
                  <input 
                    type="number" 
                    value={feeConfig.min_campaign_budget}
                    onChange={(e) => setFeeConfig({...feeConfig, min_campaign_budget: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Floor budget for brand campaign post</span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Max Campaign Budget (₹)</label>
                  <input 
                    type="number" 
                    value={feeConfig.max_campaign_budget}
                    onChange={(e) => setFeeConfig({...feeConfig, max_campaign_budget: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1 block">Ceiling limit for brand campaign post</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <Ticket size={18} className="text-[#9D7CFF]"/> Coupon Management
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Issue Zero Platform Fee, Partial Fee Waiver (%), or Flat Discount coupons for creators and brands.
              </p>
            </div>
            <button 
              onClick={() => {
                setEditingCoupon(null);
                setCouponForm({
                  code: '',
                  type: 'zero_fee',
                  discount_amount: 200,
                  override_fee_rate: 5,
                  applies_to_first_n_payouts: 1,
                  applies_to: 'creator',
                  usage_limit: 100,
                  per_user_limit: 1,
                  valid_from: new Date().toISOString().slice(0, 10),
                  valid_until: '',
                  min_campaign_value: 1000,
                  status: 'active'
                });
                setShowCouponModal(true);
              }}
              className="px-4 py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={16} /> Create New Coupon
            </button>
          </div>

          {/* Coupon Cards List */}
          {loadingCoupons ? (
            <div className="py-12 text-center text-xs text-[var(--text-tertiary)]">Loading promotional coupons...</div>
          ) : coupons.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-card)]">
              No active coupons found. Click "Create New Coupon" above to issue one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coupons.map((c, idx) => (
                <div key={`coupon-${c.id || c.code || idx}`} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-base font-mono font-black text-[var(--text-primary)] tracking-wider block">
                        {c.code}
                      </span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          c.type === 'zero_fee' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : c.type === 'fee_rate_override'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {c.type === 'zero_fee' 
                            ? 'Zero Platform Fee' 
                            : c.type === 'fee_rate_override'
                            ? `${c.override_fee_rate}% Fee Rate Waiver`
                            : `Flat ₹${c.discount_amount} Off`}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-foreground/10 text-[var(--text-secondary)]">
                          {c.applies_to}s
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-default)] font-mono">
                    <div className="flex justify-between">
                      <span>Redemptions:</span>
                      <span className="font-bold text-[var(--text-primary)]">{c.used_count || 0} / {c.usage_limit || '∞'} used</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Per User Limit:</span>
                      <span className="font-bold text-[var(--text-primary)]">{c.per_user_limit || 1}</span>
                    </div>
                    {c.type === 'fee_rate_override' && (
                      <>
                        <div className="flex justify-between">
                          <span>Override Fee Rate:</span>
                          <span className="font-bold text-purple-400">{c.override_fee_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payout Limit:</span>
                          <span className="font-bold text-[var(--text-primary)]">First {c.applies_to_first_n_payouts || 1} payout(s)</span>
                        </div>
                      </>
                    )}
                    {c.type === 'zero_fee' && (
                      <div className="flex justify-between">
                        <span>Payout Limit:</span>
                        <span className="font-bold text-[var(--text-primary)]">First {c.applies_to_first_n_payouts || 1} payout(s)</span>
                      </div>
                    )}
                    {c.type === 'flat_discount' && c.min_campaign_value && (
                      <div className="flex justify-between">
                        <span>Min Campaign:</span>
                        <span className="font-bold text-[var(--text-primary)]">₹{c.min_campaign_value}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
                    <button 
                      onClick={() => handleViewRedemptions(c)}
                      className="text-xs font-bold text-[#9D7CFF] hover:underline"
                    >
                      Audit Trail
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditCoupon(c)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-blue-500/10 text-blue-400 border-blue-500/30"
                      >
                        Edit
                      </button>

                      <button 
                        onClick={() => handleToggleCouponStatus(c)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          c.status === 'active' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {c.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      
                      <button 
                        onClick={() => setDeleteConfirmCoupon(c)}
                        title="Delete Coupon"
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REFERRALS */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <Share2 size={18} className="text-[#9D7CFF]"/> Referral Program Controls
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Configure two-sided referral rewards triggered on verified actions (e.g. first paid collaboration).
                </p>
              </div>

              <button 
                onClick={handleSaveReferrals}
                disabled={savingReferralConfig}
                className="px-5 py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Save size={14} /> Save Referral Rules
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Creator Referral Reward (₹)</label>
                <input 
                  type="number" 
                  value={referralConfig.creator_referral_reward}
                  onChange={(e) => setReferralConfig({...referralConfig, creator_referral_reward: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Brand Referral Reward (₹)</label>
                <input 
                  type="number" 
                  value={referralConfig.brand_referral_reward}
                  onChange={(e) => setReferralConfig({...referralConfig, brand_referral_reward: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Trigger Condition</label>
                <select 
                  value={referralConfig.referral_trigger_action}
                  onChange={(e) => setReferralConfig({...referralConfig, referral_trigger_action: e.target.value})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#9D7CFF]"
                >
                  <option value="first_completed_collab">First Completed Collab</option>
                  <option value="first_paid_campaign">First Paid Campaign</option>
                  <option value="profile_verification">KYC Verification</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Monthly Cap per User</label>
                <input 
                  type="number" 
                  value={referralConfig.referral_monthly_cap}
                  onChange={(e) => setReferralConfig({...referralConfig, referral_monthly_cap: Number(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button 
                  type="button"
                  onClick={() => setReferralConfig({...referralConfig, referral_enabled: !referralConfig.referral_enabled})}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    referralConfig.referral_enabled 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}
                >
                  {referralConfig.referral_enabled ? '✅ Referrals Active' : '⏸ Program Paused'}
                </button>
              </div>
            </div>

            {/* Live Referral Activity Table */}
            <div className="pt-6 border-t border-[var(--border-default)]">
              <h4 className="font-display text-sm font-bold mb-4">Live Referral Activity Log</h4>
              
              {loadingReferrals ? (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">Loading referral log...</div>
              ) : referralsActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-elevated)]">
                  No referral redemptions logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)] uppercase font-mono">
                        <th className="pb-2">Referrer</th>
                        <th className="pb-2">Referred User</th>
                        <th className="pb-2">Trigger Condition</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Reward Paid</th>
                        <th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {referralsActivity.map((r, idx) => (
                        <tr key={`ref-${r.id || idx}`} className="hover:bg-[var(--bg-elevated)] transition-colors">
                          <td className="py-3 font-semibold text-[var(--text-primary)]">{r.referrer_name}</td>
                          <td className="py-3 text-[var(--text-secondary)]">{r.referred_name}</td>
                          <td className="py-3 font-mono">{r.trigger_action || referralConfig.referral_trigger_action}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'rewarded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold text-[#027A48]">₹{r.reward_amount || (r.referred_type === 'brand' ? referralConfig.brand_referral_reward : referralConfig.creator_referral_reward)}</td>
                          <td className="py-3 text-[var(--text-tertiary)]">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: MESSAGES / VERSION UPDATE MANAGER */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-2">
              <RadioReceiver size={18} className="text-[#9D7CFF]"/> Version Update Broadcast Manager
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              Draft application updates and publish global changelogs. Active users will be presented with in-app update notifications.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Draft Form */}
              <form onSubmit={handleDraftVersion} className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Draft App Version</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Version Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1.2.0" 
                      value={versionNumber} 
                      onChange={(e) => setVersionNumber(e.target.value)} 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#9D7CFF]" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Target Audience</label>
                    <select 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#9D7CFF]"
                    >
                      <option value="all">All Users</option>
                      <option value="creator">Creators Only</option>
                      <option value="brand">Brands Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">Changelog Bullet Points (One per line)</label>
                  <textarea 
                    placeholder="• Added new escrow payout rules&#10;• Enhanced brand campaign reviews" 
                    value={changelogText} 
                    onChange={(e) => setChangelogText(e.target.value)} 
                    rows={5} 
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-sm focus:outline-none focus:border-[#9D7CFF]" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submittingVersion} 
                  className="w-full py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {submittingVersion ? 'Saving Draft...' : 'Save Version Draft'}
                </button>
              </form>

              {/* Version History List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Version History & Broadcasts</h4>
                
                {versions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-elevated)]">
                    No version drafts created yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {versions.map((v, idx) => (
                      <div key={`version-${v.id || v.version_number || idx}`} className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">v{v.version_number}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            v.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {v.status}
                          </span>
                        </div>

                        {Array.isArray(v.changelog) && (
                          <ul className="text-xs text-[var(--text-secondary)] list-disc list-inside space-y-0.5">
                            { safeArray(v.changelog).map((item, i) => (
                              <li key={`changelog-${v.id || idx}-${i}`}>{item}</li>
                            ))}
                          </ul>
                        )}

                        {v.status === 'draft' && (
                          <button 
                            onClick={() => handlePublishVersion(v.id)}
                            className="w-full mt-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Publish & Broadcast to Users
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BANNERS */}
      {activeTab === 'landing' && (
        <div className="mt-6">
          <LandingContentManager />
        </div>
      )}

      {activeTab === 'banners' && (
        <BannerManager />
      )}

      {/* MODAL: Maintenance Confirmation */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={18} /> Confirm Maintenance Lock Toggle
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              You are about to {confirmData.currentVal ? 'disable' : 'enable'} maintenance lock for {confirmData.type} users.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowMaintenanceModal(false)}
                className="px-4 py-2 border border-[var(--border-default)] text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmMaintenanceToggle}
                className="px-4 py-2 bg-[#9D7CFF] text-white text-xs font-bold rounded-xl"
              >
                Confirm Toggle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Fee Review Confirmation */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] max-w-xl w-full rounded-2xl p-6 space-y-5 shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={20} /> Review Live Platform Fee Changes
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Updating these values will immediately take effect on all live deals and payout structures.
            </p>

            <div className="space-y-2 text-xs font-mono bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-default)]">
              <div className="flex justify-between">
                <span>Threshold Limit:</span>
                <span className="font-bold">₹{formatAmount(feeConfig.threshold_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Below Threshold Rate:</span>
                <span className="font-bold">{feeConfig.below_threshold_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Above Threshold Rate:</span>
                <span className="font-bold">{feeConfig.above_threshold_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span>GST Rate:</span>
                <span className="font-bold">{feeConfig.gst_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Payout Freeze:</span>
                <span className={`font-bold ${feeConfig.payout_freeze_all ? 'text-red-400' : 'text-[#027A48]'}`}>
                  {feeConfig.payout_freeze_all ? 'FROZEN' : 'Normal'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowFeeModal(false)}
                className="px-4 py-2.5 border border-[var(--border-default)] text-xs font-bold rounded-xl"
              >
                Cancel & Revise
              </button>
              <button 
                onClick={handleSaveFees}
                disabled={savingFees}
                className="px-5 py-2.5 bg-[#9D7CFF] text-white text-xs font-bold rounded-xl shadow-md"
              >
                {savingFees ? 'Saving...' : 'Confirm & Apply Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Coupon */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                {editingCoupon ? 'Edit Coupon' : 'Create Promotional Coupon'}
              </h3>
              <button onClick={() => setShowCouponModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Coupon Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. NEW40" 
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({...couponForm, code: safeUpper(e.target.value)})}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold text-sm focus:outline-none focus:border-[#9D7CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Coupon Type</label>
                  <select 
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({...couponForm, type: e.target.value})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#9D7CFF]"
                  >
                    <option value="zero_fee">Zero Platform Fee</option>
                    <option value="fee_rate_override">Partial Fee Waiver (%)</option>
                    <option value="flat_discount">Flat Discount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Applies To</label>
                  <select 
                    value={couponForm.applies_to}
                    onChange={(e) => setCouponForm({...couponForm, applies_to: e.target.value})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-[#9D7CFF]"
                  >
                    <option value="creator">Creator Accounts</option>
                    <option value="brand">Brand Accounts</option>
                  </select>
                </div>
              </div>

              {couponForm.type === 'fee_rate_override' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Override Fee Rate (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="e.g. 5"
                      value={couponForm.override_fee_rate ?? 5}
                      onChange={(e) => setCouponForm({...couponForm, override_fee_rate: Number(e.target.value)})}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Applies to First N Payouts</label>
                    <input 
                      type="number" 
                      min="1"
                      value={couponForm.applies_to_first_n_payouts ?? 1}
                      onChange={(e) => setCouponForm({...couponForm, applies_to_first_n_payouts: Number(e.target.value)})}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                    />
                  </div>
                </div>
              )}

              {couponForm.type === 'zero_fee' && (
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Applies to First N Payouts</label>
                  <input 
                    type="number" 
                    min="1"
                    value={couponForm.applies_to_first_n_payouts ?? 1}
                    onChange={(e) => setCouponForm({...couponForm, applies_to_first_n_payouts: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              )}

              {couponForm.type === 'flat_discount' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Flat Discount Amount (₹)</label>
                    <input 
                      type="number" 
                      value={couponForm.discount_amount}
                      onChange={(e) => setCouponForm({...couponForm, discount_amount: Number(e.target.value)})}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Min Campaign Budget (₹)</label>
                    <input 
                      type="number" 
                      value={couponForm.min_campaign_value ?? 1000}
                      onChange={(e) => setCouponForm({...couponForm, min_campaign_value: Number(e.target.value)})}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Usage Limit (Total)</label>
                  <input 
                    type="number" 
                    value={couponForm.usage_limit}
                    onChange={(e) => setCouponForm({...couponForm, usage_limit: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Per User Limit</label>
                  <input 
                    type="number" 
                    value={couponForm.per_user_limit}
                    onChange={(e) => setCouponForm({...couponForm, per_user_limit: Number(e.target.value)})}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-[#9D7CFF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 border border-[var(--border-default)] text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#9D7CFF] text-white text-xs font-bold rounded-xl"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Coupon Redemptions Audit Log */}
      {viewRedemptionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                Redemptions: {viewRedemptionsModal.code}
              </h3>
              <button onClick={() => setViewRedemptionsModal(null)}><X size={18} /></button>
            </div>

            {couponRedemptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-tertiary)]">
                No redemptions logged for this coupon code yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {couponRedemptions.map((r, idx) => (
                  <div key={`redemption-${r.id || r.user_id || idx}`} className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{r.user_name || r.user_id}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">{r.user_email || 'N/A'} • <span className="capitalize">{r.user_role || 'user'}</span></div>
                      <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : 'N/A'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">
                        {r.discount_applied ? `-₹${r.discount_applied}` : 'Applied'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Delete Coupon Confirmation */}
      {deleteConfirmCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--bg-card)] border border-[var(--border-default)] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                <Trash2 size={20} />
                <span>Delete Coupon?</span>
              </div>
              <button 
                type="button"
                onClick={() => setDeleteConfirmCoupon(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
                disabled={deletingCoupon}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to permanently delete coupon code <strong className="font-mono text-base text-[var(--text-primary)]">{deleteConfirmCoupon.code}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoupon(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                disabled={deletingCoupon}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCoupon}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer"
                disabled={deletingCoupon}
              >
                {deletingCoupon ? 'Deleting...' : 'Yes, Delete Coupon'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
