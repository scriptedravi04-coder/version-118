import { motion, AnimatePresence } from "framer-motion";
import { safeArray } from "../../utils/safeFormat";
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle2, XCircle, Users, CheckSquare, 
  Square, ChevronDown, Building2, Globe, Mail, Phone, 
  Calendar, ArrowLeft, ExternalLink, ShieldAlert, AlertTriangle,
  Trash2, RotateCcw, RefreshCw, MessageSquare, UserX, Link2, Pencil, MapPin
} from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import WaitlistEditModal from './WaitlistEditModal';

export default function WaitlistManager({ onUpdate }) {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('creator'); // 'creator' or 'brand' or 'rejected_bin'
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // "All", "Pending", "Approved", "Rejected"
  const [platformFilter, setPlatformFilter] = useState("All"); // For creators: "All", "Instagram", "YouTube"
  const [categoryFilter, setCategoryFilter] = useState("All"); // For brands/creators category
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [editingWaitlistItem, setEditingWaitlistItem] = useState(null);

  // States for animations and dashboard messages
  const [actionAnimType, setActionAnimType] = useState(null); // 'approved' or 'rejected'
  const [isAnimActive, setIsAnimActive] = useState(false);
  const [messageModalItem, setMessageModalItem] = useState(null);
  const [panelMessageText, setPanelMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const res = await api.get('admin/waitlist');
      setWaitlist(res.data || []);
    } catch (err) {
      console.error("Error loading waitlist:", err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to fetch waitlist");
    } finally {
      setLoading(false);
    }
  };

  // Helper to normalize items
  const normalizedWaitlist = waitlist.map(w => {
    const isBrand = w.role === 'brand' || !!w.company_name;
    return {
      ...w,
      role: isBrand ? 'brand' : 'creator'
    };
  });

  // KPI Calculations
  const pendingCreatorsCount = normalizedWaitlist.filter(w => w.role === 'creator' && w.status === 'Pending').length;
  const pendingBrandsCount = normalizedWaitlist.filter(w => w.role === 'brand' && w.status === 'Pending').length;
  
  const approvedCount = normalizedWaitlist.filter(w => w.status === 'Approved').length;
  const rejectedCount = normalizedWaitlist.filter(w => w.status === 'Rejected').length;

  const handleApprove = async (id) => {
    try {
      setActionAnimType('approved');
      setIsAnimActive(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.4 } });

      await api.post(`/admin/waitlist/${id}/approve`);
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: "Approved" } : w));
      setSelectedIds(prev => prev.filter(i => i !== id));
      if (selectedItemDetails && selectedItemDetails.id === id) {
        setSelectedItemDetails(prev => ({ ...prev, status: "Approved" }));
      }
      onUpdate?.();
      toast.success("Application approved successfully!");

      setTimeout(() => {
        setIsAnimActive(false);
        setActionAnimType(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Approval failed");
      setIsAnimActive(false);
      setActionAnimType(null);
    }
  };

  const handleReject = async (id, finalReason) => {
    try {
      setActionAnimType('rejected');
      setIsAnimActive(true);

      await api.post(`/admin/waitlist/${id}/reject`, { reason: finalReason });
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: "Rejected", rejectReason: finalReason } : w));
      setSelectedIds(prev => prev.filter(i => i !== id));
      if (selectedItemDetails && selectedItemDetails.id === id) {
        setSelectedItemDetails(prev => ({ ...prev, status: "Rejected", rejectReason: finalReason }));
      }
      setRejectModalId(null);
      setRejectReason("");
      setCustomRejectReason("");
      toast.success("Application rejected.");

      setTimeout(() => {
        setIsAnimActive(false);
        setActionAnimType(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Rejection failed");
      setIsAnimActive(false);
      setActionAnimType(null);
    }
  };

  const handleRestoreApprove = async (id) => {
    try {
      await api.post(`/admin/waitlist/${id}/approve`);
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: "Approved" } : w));
      setSelectedIds(prev => prev.filter(i => i !== id));
      onUpdate?.();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success("Application re-approved successfully from the Rejected Bin!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Re-approval failed");
    }
  };

  const batchApprove = async () => {
    if (!selectedIds.length) return;
    try {
      await api.post('admin/waitlist/batch-approve', { ids: selectedIds });
      setWaitlist(prev => prev.map(w => selectedIds.includes(w.id) ? { ...w, status: "Approved" } : w));
      setSelectedIds([]);
      onUpdate?.();
      toast.success(`Batch approved ${selectedIds.length} profiles.`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Batch approval failed");
    }
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (itemsOnPage) => {
    const pendingOnPage = itemsOnPage.filter(w => w.status === 'Pending').map(w => w.id);
    const allSelected = pendingOnPage.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pendingOnPage.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pendingOnPage])]);
    }
  };

  // Filtering waitlist based on tab, search, and filters
  const filteredItems = normalizedWaitlist.filter(w => {
    if (activeTab === 'rejected_bin') {
      if (w.status !== 'Rejected') return false;
      const searchString = searchTerm.toLowerCase();
      return (
        (w.name || '').toLowerCase().includes(searchString) ||
        (w.email || '').toLowerCase().includes(searchString) ||
        (w.handle || '').toLowerCase().includes(searchString) ||
        (w.company_name || '').toLowerCase().includes(searchString) ||
        (w.phone || w.mobile || '').toLowerCase().includes(searchString)
      );
    }

    if (w.role !== activeTab) return false;

    // Search filter
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = 
      (w.name || '').toLowerCase().includes(searchString) ||
      (w.email || '').toLowerCase().includes(searchString) ||
      (w.handle || '').toLowerCase().includes(searchString) ||
      (w.company_name || '').toLowerCase().includes(searchString) ||
      (w.phone || w.mobile || '').toLowerCase().includes(searchString);

    // Status filter
    const matchesStatus = statusFilter === "All" || w.status === statusFilter;

    // Platform filter (Creators only)
    const matchesPlatform = activeTab === 'brand' || platformFilter === "All" || w.platform === platformFilter;

    // Category filter
    const matchesCategory = categoryFilter === "All" || (w.category || '').toLowerCase().includes(categoryFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPlatform && matchesCategory;
  });

  // Get unique categories for filters based on active tab
  const categoriesList = Array.from(
    new Set(
      normalizedWaitlist
        .filter(w => w.role === activeTab && w.category)
        .map(w => w.category)
    )
  );

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {!selectedItemDetails ? (
        <>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Waitlist Manager</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">Review and approve creators and brands.</p>
            </div>
          </div>

          {/* KPI Counters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Pending Creators</div>
                  <div className="text-3xl font-mono font-bold text-[var(--text-primary)] mt-1">{pendingCreatorsCount}</div>
                </div>
             </div>
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Pending Brands</div>
                  <div className="text-3xl font-mono font-bold text-[var(--text-primary)] mt-1">{pendingBrandsCount}</div>
                </div>
             </div>
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[var(--green)] flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Approved Overall</div>
                  <div className="text-3xl font-mono font-bold text-[var(--text-primary)] mt-1">{approvedCount}</div>
                </div>
             </div>
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-[var(--red)] flex items-center justify-center">
                  <XCircle size={24} />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Rejected Overall</div>
                  <div className="text-3xl font-mono font-bold text-[var(--text-primary)] mt-1">{rejectedCount}</div>
                </div>
             </div>
          </div>

          {/* Main Tab Switchers (Branded & Beautiful) */}
          <div className="flex border-b border-[var(--border-default)]">
            <button
              onClick={() => { setActiveTab('creator'); setSelectedIds([]); }}
              className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'creator' 
                  ? 'border-[var(--violet)] text-[var(--violet)]' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              
              Creators Waitlist
              {pendingCreatorsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-[var(--violet)] text-white rounded-full">
                  {pendingCreatorsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('brand'); setSelectedIds([]); }}
              className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'brand' 
                  ? 'border-[var(--violet)] text-[var(--violet)]' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 size={16} />
              Brands Waitlist
              {pendingBrandsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-[var(--violet)] text-white rounded-full">
                  {pendingBrandsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('rejected_bin'); setSelectedIds([]); }}
              className={`pb-4 px-6 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'rejected_bin' 
                  ? 'border-[var(--red)] text-[var(--red)]' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Trash2 size={16} />
              Rejected Bin
              {rejectedCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-[var(--red)] text-white rounded-full">
                  {rejectedCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter and Toolbar Panel */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              
              {/* Leftside Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={16} />
                  <input 
                    type="text" 
                    placeholder={
                      activeTab === 'creator' 
                        ? "Search handle or name..." 
                        : activeTab === 'brand' 
                          ? "Search brand or company..." 
                          : "Search rejected applicants..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--violet)] focus:outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                  />
                </div>

                {/* Status Filter */}
                {activeTab !== 'rejected_bin' && (
                  <div className="relative">
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--violet)] focus:outline-none text-sm text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="All" className="text-[var(--text-primary)]">All Statuses</option>
                      <option value="Pending" className="text-[var(--text-primary)]">Pending</option>
                      <option value="Approved" className="text-[var(--text-primary)]">Approved</option>
                      <option value="Rejected" className="text-[var(--text-primary)]">Rejected</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" size={14} />
                  </div>
                )}

                {/* Platform Filter (Only for Creators) */}
                {activeTab === 'creator' && (
                  <div className="relative">
                    <select 
                      value={platformFilter} 
                      onChange={(e) => setPlatformFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--violet)] focus:outline-none text-sm text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="All" className="text-[var(--text-primary)]">All Platforms</option>
                      <option value="Instagram" className="text-[var(--text-primary)]">Instagram</option>
                      <option value="YouTube" className="text-[var(--text-primary)]">YouTube</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" size={14} />
                  </div>
                )}

                {/* Category Filter */}
                {activeTab !== 'rejected_bin' && categoriesList.length > 0 && (
                  <div className="relative">
                    <select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="appearance-none pl-4 pr-9 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--violet)] focus:outline-none text-sm text-[var(--text-primary)] cursor-pointer"
                    >
                      <option value="All" className="text-[var(--text-primary)]">All Categories</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat} className="text-[var(--text-primary)]">{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" size={14} />
                  </div>
                )}

                {/* Quick Refresh Button */}
                <button
                  onClick={async () => {
                    setLoading(true);
                    await fetchWaitlist();
                    toast.success("Waitlist data refreshed!");
                  }}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--violet-border)] hover:text-[var(--violet)] rounded-xl text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Refresh waitlist data"
                >
                  <RefreshCw size={13} className={loading ? "animate-spin text-[var(--violet)]" : ""} />
                  <span>{loading ? "Refreshing..." : "Refresh"}</span>
                </button>
              </div>

              {/* Rightside Batch Actions (Only shown if pending items selected) */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-0 pt-3 lg:pt-0 border-[var(--border-default)]">
                  <span className="text-sm text-[var(--text-secondary)] font-medium">{selectedIds.length} selected</span>
                  <button 
                    onClick={batchApprove} 
                    className="px-4 py-2 bg-[var(--green)] hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Approve Selected
                  </button>
                  <button 
                    onClick={() => setRejectModalId("batch")} 
                    className="px-4 py-2 border border-[var(--red)]/30 text-[var(--red)] hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Reject Selected
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Waitlist Data Table Grid */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {activeTab === 'rejected_bin' ? (
                    <tr className="bg-foreground/5 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="px-5 py-4 font-medium">Type</th>
                      <th className="px-5 py-4 font-medium">Applicant Name & Email</th>
                      <th className="px-5 py-4 font-medium">Platform / Website</th>
                      <th className="px-5 py-4 font-medium">Rejection Reason</th>
                      <th className="px-5 py-4 font-medium text-right">Actions</th>
                    </tr>
                  ) : (
                    <tr className="bg-foreground/5 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="px-5 py-4 font-medium w-10">
                        <button 
                          onClick={() => toggleSelectAll(filteredItems)} 
                          className="p-1 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                        >
                          {filteredItems.filter(w => w.status === 'Pending').length > 0 &&
                           filteredItems.filter(w => w.status === 'Pending').every(id => selectedIds.includes(id.id)) 
                           ? <CheckSquare size={16} className="text-[#9D7CFF]"/> 
                           : <Square size={16} />}
                        </button>
                      </th>
                      <th className="px-5 py-4 font-medium">Pos / Date</th>
                      
                      {/* Dynamic Columns based on Tab */}
                      {activeTab === 'creator' ? (
                        <>
                          <th className="px-5 py-4 font-medium">Creator</th>
                          <th className="px-5 py-4 font-medium">Platform & Handle</th>
                          <th className="px-5 py-4 font-medium">Category / Niche</th>
                          <th className="px-5 py-4 font-medium text-right">Followers</th>
                        </>
                      ) : (
                        <>
                          <th className="px-5 py-4 font-medium">Company & Contact</th>
                          <th className="px-5 py-4 font-medium">Website</th>
                          <th className="px-5 py-4 font-medium">Niche & Size</th>
                          <th className="px-5 py-4 font-medium text-right">Est. Budget</th>
                        </>
                      )}
                      
                      <th className="px-5 py-4 font-medium">Status</th>
                      <th className="px-5 py-4 font-medium text-right">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="text-sm divide-y divide-foreground/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-[var(--text-tertiary)]">
                        Loading application roster...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-[var(--text-secondary)]">
                        {activeTab === 'rejected_bin' ? "No rejected applications in the bin." : "No waitlist applications found in this section."}
                      </td>
                    </tr>
                  ) : activeTab === 'rejected_bin' ? (
                    filteredItems.map((item, idx) => (
                      <tr 
                        key={item.id ? `rej-${item.id}` : `rej-${idx}`} 
                        onClick={() => setSelectedItemDetails(item)}
                        className="hover:bg-[var(--bg-elevated)] transition-all duration-150 cursor-pointer group"
                      >
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                            item.role === 'brand' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)]'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={item.photo || undefined} 
                              alt={item.name} 
                              className={`w-10 h-10 border border-[var(--border-default)] object-cover ${item.role === 'brand' ? 'rounded-xl bg-[var(--bg-elevated)]' : 'rounded-full'}`} 
                            />
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors flex items-center gap-1.5">
                                {item.role === 'brand' ? item.company_name : item.name}
                                {(item.status === 'Pending' || item.is_registered_user === false || (item.kyc_status && item.kyc_status !== 'APPROVED')) && (
                                  <span className="relative flex h-2 w-2 shrink-0" title="Pending / Unverified">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-tertiary)]">{item.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {item.role === 'creator' ? (
                            <div>
                              <div className="font-semibold text-[var(--text-primary)]">{item.platform}</div>
                              <div className="text-xs text-[var(--violet)] font-mono">{item.handle}</div>
                            </div>
                          ) : (
                            <div>
                              {item.website ? (
                                <a 
                                  href={item.website} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[var(--violet)] hover:underline flex items-center gap-1 font-medium text-xs cursor-pointer"
                                >
                                  Visit Website <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-[var(--text-tertiary)]">—</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
                          <div className="text-xs text-[var(--text-secondary)] font-medium bg-red-50/50 border border-red-100/40 text-[var(--red)] px-2.5 py-1 rounded-lg inline-block break-words max-w-full">
                            {item.rejectReason || "Unspecified reason"}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setMessageModalItem(item);
                                setPanelMessageText(`Dear ${item.role === 'brand' ? item.company_name : item.name},\n\nWe have re-reviewed your waitlist application and are pleased to inform you that it has been approved! You can now log into your dashboard and complete your registration.\n\nBest regards,\nYBEX Team`);
                              }}
                              className="px-3 py-1.5 border border-[var(--border-default)] hover:border-[var(--violet-border)] text-[var(--text-secondary)] hover:text-[var(--violet)] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <MessageSquare size={12} /> Message
                            </button>
                            <button 
                              onClick={() => handleRestoreApprove(item.id)} 
                              className="px-3 py-1.5 bg-[var(--green)] text-white hover:opacity-90 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <RotateCcw size={12} /> Re-Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr 
                        key={item.id ? `wl-${item.id}` : `wl-${idx}`} 
                        onClick={() => setSelectedItemDetails(item)}
                        className="hover:bg-[var(--bg-elevated)] transition-all duration-150 cursor-pointer group"
                      >
                        {/* Checkbox Column */}
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          {item.status === 'Pending' ? (
                            <button 
                              onClick={(e) => toggleSelect(e, item.id)} 
                              className="p-1 hover:text-[var(--violet)] text-[var(--text-tertiary)] transition-colors flex items-center justify-center cursor-pointer"
                            >
                              {selectedIds.includes(item.id) ? <CheckSquare size={16} className="text-[var(--violet)]"/> : <Square size={16}/>}
                            </button>
                          ) : (
                            <div className="w-4"></div>
                          )}
                        </td>

                        {/* Position & Date */}
                        <td className="px-5 py-4">
                          <div className="font-mono text-[var(--text-primary)]/80 text-xs font-semibold">#{item.position || 0}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.date}</div>
                        </td>

                        {/* Creator Tab Specifics */}
                        {activeTab === 'creator' && (
                          <>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={item.photo || undefined} 
                                  alt={item.name} 
                                  className="w-10 h-10 rounded-full border border-[var(--border-default)] object-cover" 
                                />
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors flex items-center gap-1.5">
                                    {item.name}
                                    {(item.status === 'Pending' || item.is_registered_user === false || (item.kyc_status && item.kyc_status !== 'APPROVED')) && (
                                      <span className="relative flex h-2 w-2 shrink-0" title="Pending / Unverified">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                      </span>
                                    )}
                                    {item.is_registered_user === false && (
                                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold shrink-0">
                                        Not Registered
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[var(--text-tertiary)]">{item.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-[var(--text-primary)]">{item.platform}</div>
                              <div className="text-xs text-[var(--violet)] font-mono">{item.handle}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-[var(--text-secondary)] font-medium">{item.category || "General"}</div>
                              <div className="text-xs text-[var(--text-tertiary)]">{item.location || "India"}</div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="font-semibold text-[var(--text-primary)]">
                                {item.followers >= 1000000 
                                  ? `${(item.followers / 1000000).toFixed(1)}M` 
                                  : item.followers >= 1000 
                                    ? `${(item.followers / 1000).toFixed(1)}k` 
                                    : item.followers}
                              </div>
                              <div className="text-xs text-[var(--text-tertiary)]">Followers</div>
                            </td>
                          </>
                        )}

                        {/* Brand Tab Specifics */}
                        {activeTab === 'brand' && (
                          <>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={item.photo || undefined} 
                                  alt={item.company_name} 
                                  className="w-10 h-10 rounded-xl border border-[var(--border-default)] object-cover bg-[var(--bg-elevated)]" 
                                />
                                <div>
                                  <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--violet)] transition-colors flex items-center gap-1.5">
                                    {item.company_name}
                                    {(item.status === 'Pending' || item.is_registered_user === false || (item.kyc_status && item.kyc_status !== 'APPROVED')) && (
                                      <span className="relative flex h-2 w-2 shrink-0" title="Pending / Unverified">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[var(--text-tertiary)]">Rep: {item.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {item.website ? (
                                <a 
                                  href={item.website} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[var(--violet)] hover:underline flex items-center gap-1 font-medium text-xs cursor-pointer"
                                >
                                  Visit Website <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-[var(--text-tertiary)]">—</span>
                              )}
                              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.email}</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-[var(--text-secondary)] font-medium">{item.category || "Retail"}</div>
                              <div className="text-xs text-[var(--text-tertiary)]">{item.company_size || "1-10 employees"}</div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="font-semibold text-[var(--text-primary)]">{item.monthly_budget || "—"}</div>
                              <div className="text-xs text-[var(--text-tertiary)]">Budget/mo</div>
                            </td>
                          </>
                        )}

                        {/* Status badge */}
                        <td className="px-5 py-4">
                          {item.status === 'Pending' && <span className="px-2.5 py-1 bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/20 rounded-full text-xs font-bold">Pending</span>}
                          {item.status === 'Approved' && <span className="px-2.5 py-1 bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20 rounded-full text-xs font-bold">Approved</span>}
                          {item.status === 'Rejected' && <span className="px-2.5 py-1 bg-red-50 text-[var(--red)] border border-red-100 rounded-full text-xs font-bold">Rejected</span>}
                        </td>

                        {/* Row Action Panel */}
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedItemDetails(item)}
                              className="px-2.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--violet-soft)] border border-[var(--border-default)] hover:border-[var(--violet-border)] text-[var(--text-secondary)] hover:text-[var(--violet)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="View full questionnaire details"
                            >
                              View
                            </button>

                            {item.status === 'Pending' ? (
                              <button 
                                onClick={() => setEditingWaitlistItem(item)}
                                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Edit pending application fields"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                            ) : (
                              <button 
                                disabled
                                className="px-2.5 py-1.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-lg text-xs font-bold opacity-50 cursor-not-allowed flex items-center gap-1"
                                title={`${item.status} application — edit karne ke liye Unclaimed Creators section use karo`}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                            )}

                            {item.status === 'Pending' && (
                              <>
                                <motion.button 
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => handleApprove(item.id)} 
                                  className="px-3 py-1.5 bg-[var(--green)] text-white hover:opacity-90 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Approve
                                </motion.button>
                                <motion.button 
                                  whileTap={{ scale: 0.93 }}
                                  onClick={() => { setRejectModalId(item.id); setRejectReason(""); }} 
                                  className="px-3 py-1.5 border border-[var(--border-default)] hover:border-[var(--red)]/40 hover:bg-red-50 text-[var(--text-secondary)] hover:text-[var(--red)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Reject
                                </motion.button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* FULL-PAGE REVIEW DETAILS VIEW */
        <div className="space-y-6 animate-fade-in pb-12">
          
          {/* Top Back Action Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <button 
              onClick={() => setSelectedItemDetails(null)} 
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to waitlist list
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)] font-mono bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1.5 rounded-xl">Position #{selectedItemDetails.position || 0}</span>
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] px-3 py-1.5 rounded-xl">Signed up: {selectedItemDetails.date}</span>
            </div>
          </div>

          {/* Profile Main Header Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <img 
                src={selectedItemDetails.photo || undefined} 
                alt={selectedItemDetails.role === 'brand' ? selectedItemDetails.company_name : selectedItemDetails.name}
                className={`w-20 h-20 border-2 border-[var(--border-default)] object-cover ${selectedItemDetails.role === 'brand' ? 'rounded-2xl bg-[var(--bg-elevated)]' : 'rounded-full'}`} 
              />
              <div className="space-y-1.5">
                <div className="flex items-center flex-wrap justify-center sm:justify-start gap-3">
                  <h2 className="text-2xl font-bold font-display text-[var(--text-primary)]">
                    {selectedItemDetails.role === 'brand' ? selectedItemDetails.company_name : selectedItemDetails.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    selectedItemDetails.role === 'brand' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)]'
                  }`}>
                    {selectedItemDetails.role}
                  </span>
                  {selectedItemDetails.is_registered_user === false && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <UserX size={12}/> Not Registered User (Public Form)
                    </span>
                  )}
                </div>
                {selectedItemDetails.role === 'creator' ? (
                  <div className="text-[var(--violet)] font-mono text-sm font-semibold">{selectedItemDetails.handle}</div>
                ) : (
                  <div className="text-[var(--text-secondary)] text-sm">Primary Contact: <span className="text-[var(--text-primary)] font-semibold">{selectedItemDetails.name}</span></div>
                )}
                <div className="text-xs text-[var(--text-secondary)]">{selectedItemDetails.location || "India"}</div>
              </div>
            </div>

            {/* Application Status Widget */}
            <div className="flex flex-col items-center md:items-end justify-center gap-2 border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
              <div className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Application Actions & Status</div>
              <AnimatePresence mode="wait">
                {isAnimActive ? (
                  <motion.div 
                    key="animating"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center justify-center py-2"
                  >
                    {actionAnimType === 'approved' ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <motion.div 
                          initial={{ rotate: -90, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500 text-[var(--green)]"
                        >
                          <CheckCircle2 size={24} className="stroke-[3px]" />
                        </motion.div>
                        <span className="text-xs font-bold text-[var(--green)] animate-pulse">Approved! Done</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <motion.div 
                          initial={{ rotate: 90, scale: 0 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-500 text-[var(--red)]"
                        >
                          <XCircle size={24} className="stroke-[3px]" />
                        </motion.div>
                        <span className="text-xs font-bold text-[var(--red)] animate-pulse">Rejected! Done</span>
                      </div>
                    )}
                  </motion.div>
                ) : selectedItemDetails.status === 'Pending' ? (
                  <motion.div 
                    key="pending-actions"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-3 mt-1"
                  >
                    <button 
                      onClick={() => setEditingWaitlistItem(selectedItemDetails)} 
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Edit application questionnaire fields"
                    >
                      <Pencil size={14} /> Edit Application
                    </button>
                    <button 
                      onClick={() => { setRejectModalId(selectedItemDetails.id); setRejectReason(""); }} 
                      className="px-4 py-2 border border-[var(--red)]/40 text-[var(--red)] hover:bg-red-50 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button 
                      onClick={() => handleApprove(selectedItemDetails.id)} 
                      className="px-5 py-2 bg-[var(--green)] hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="status-badge"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1"
                  >
                    {selectedItemDetails.status === 'Approved' ? (
                      <span className="px-3.5 py-1.5 bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/20 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Approved Application
                      </span>
                    ) : (
                      <div className="flex flex-col items-center md:items-end gap-1">
                        <span className="px-3.5 py-1.5 bg-red-50 text-[var(--red)] border border-red-100 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                          <XCircle size={14} /> Rejected
                        </span>
                        {selectedItemDetails.rejectReason && (
                          <div className="text-center sm:text-right mt-1 max-w-[280px]">
                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">Reason</div>
                            <div className="text-xs font-bold text-[var(--red)] break-words">{selectedItemDetails.rejectReason}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Grid Questionnaire Answers (THE IMPORTANT CHOTI SE CHOTI DETAILS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold font-display text-[var(--text-primary)] mb-6 flex items-center gap-2 border-b border-[var(--border-default)] pb-4">
                <ShieldAlert size={18} className="text-[var(--violet)]" /> Submitted Questionnaire Details
              </h3>

              {selectedItemDetails.role === 'creator' ? (
                /* CREATOR QUESTIONNAIRE */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Primary Handle / Platform</span>
                    <strong className="text-sm text-[var(--violet)] mt-1 block font-mono">
                      {selectedItemDetails.handle || selectedItemDetails.social_handle || "@creator"} ({selectedItemDetails.platform || "Instagram"})
                    </strong>
                    {selectedItemDetails.instagram_link && (
                      <a 
                        href={selectedItemDetails.instagram_link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[11px] text-[var(--violet)] hover:underline flex items-center gap-1 mt-1 font-semibold"
                      >
                        Visit Profile <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Follower Count &amp; Reach</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">{(Number(selectedItemDetails.followers) || 0).toLocaleString()} followers</strong>
                    {(selectedItemDetails.avg_reach || selectedItemDetails.avg_views_30d) && (
                      <span className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 block">
                        Avg Reach / Views: {selectedItemDetails.avg_reach || selectedItemDetails.avg_views_30d}
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Date of Birth &amp; Age</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-400" />
                      {selectedItemDetails.dob || selectedItemDetails.date_of_birth || selectedItemDetails.rate_card?.dob || selectedItemDetails.rate_card?.date_of_birth || selectedItemDetails.profile?.dob || selectedItemDetails.profile?.date_of_birth || selectedItemDetails.profile?.rate_card?.dob || "Not provided"}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Gender &amp; Location</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-400" />
                      {selectedItemDetails.gender ? `${selectedItemDetails.gender}, ` : ""}{selectedItemDetails.city || ""}{selectedItemDetails.city && selectedItemDetails.state ? ", " : ""}{selectedItemDetails.state || selectedItemDetails.location || "India"}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Content Niche / Category</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">
                      {selectedItemDetails.niche || selectedItemDetails.category || "Fashion & Lifestyle"}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Languages Spoken</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">
                      {Array.isArray(selectedItemDetails.languages) && selectedItemDetails.languages.length > 0
                        ? selectedItemDetails.languages.join(", ")
                        : (typeof selectedItemDetails.languages === 'string' && selectedItemDetails.languages.trim() ? selectedItemDetails.languages : "Hindi, English")}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Creator Email Address</span>
                    <strong className="text-sm text-[var(--violet)] mt-1 block flex items-center gap-1.5 select-all">
                      <Mail size={14}/> {selectedItemDetails.email || "Not provided"}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Contact Mobile Number</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block flex items-center gap-1.5 select-all">
                      <Phone size={14} className="text-green-500" /> {selectedItemDetails.mobile || selectedItemDetails.phone || "Not provided"}
                    </strong>
                  </div>

                  {/* Rates & Experience */}
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl sm:col-span-2">
                    <span className="text-xs text-[var(--text-tertiary)] block mb-3 font-semibold text-[var(--violet)] uppercase tracking-wider">
                      Rates &amp; Experience
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mt-1">
                      <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-default)]">
                        <div className="text-xs text-[var(--text-secondary)]">Instagram Reel</div>
                        <div className="font-mono text-sm font-extrabold text-[var(--green)] mt-1">
                          {selectedItemDetails.rate_reel || selectedItemDetails.pricing?.reel || selectedItemDetails.rate_card?.reels
                            ? `₹${Number(selectedItemDetails.rate_reel || selectedItemDetails.pricing?.reel || selectedItemDetails.rate_card?.reels).toLocaleString()}`
                            : (selectedItemDetails.charges || "—")}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-default)]">
                        <div className="text-xs text-[var(--text-secondary)]">Story Shoutout</div>
                        <div className="font-mono text-sm font-extrabold text-[var(--green)] mt-1">
                          {selectedItemDetails.rate_story || selectedItemDetails.pricing?.story || selectedItemDetails.rate_card?.stories
                            ? `₹${Number(selectedItemDetails.rate_story || selectedItemDetails.pricing?.story || selectedItemDetails.rate_card?.stories).toLocaleString()}`
                            : "—"}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-default)]">
                        <div className="text-xs text-[var(--text-secondary)]">Main / UGC Charge</div>
                        <div className="font-mono text-sm font-extrabold text-blue-400 mt-1">
                          {selectedItemDetails.charges 
                            ? (String(selectedItemDetails.charges).startsWith('₹') ? selectedItemDetails.charges : `₹${selectedItemDetails.charges}`)
                            : (selectedItemDetails.pricing?.ugc ? `₹${Number(selectedItemDetails.pricing.ugc).toLocaleString()}` : "—")}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-default)]">
                        <div className="text-xs text-[var(--text-secondary)]">Rating &amp; Mode</div>
                        <div className="font-mono text-xs font-bold text-[var(--violet)] mt-1">
                          {selectedItemDetails.ugc_rating || 8}/10 • {selectedItemDetails.barter_mode === 'cash_and_barter' ? 'Barter+Cash' : (selectedItemDetails.barter_mode === 'barter_only' ? 'Barter' : 'Cash')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Collab Types */}
                  {Array.isArray(selectedItemDetails.collab_types) && selectedItemDetails.collab_types.length > 0 && (
                    <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl sm:col-span-2">
                      <span className="text-xs text-[var(--text-tertiary)] block mb-2 font-semibold uppercase tracking-wider">Preferred Collaboration Types</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        { safeArray(selectedItemDetails.collab_types).map((type, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)] rounded-lg text-xs font-semibold">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Work Links */}
                  {Array.isArray(selectedItemDetails.sample_links) && selectedItemDetails.sample_links.length > 0 && (
                    <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl sm:col-span-2">
                      <span className="text-xs text-[var(--text-tertiary)] block mb-2 font-semibold uppercase tracking-wider">Submitted Sample Content Links</span>
                      <div className="space-y-1.5 mt-2">
                        { safeArray(selectedItemDetails.sample_links).map((link, idx) => (
                          <a 
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-[var(--violet)] hover:underline font-mono bg-[var(--bg-card)] p-2.5 rounded-lg border border-[var(--border-default)] truncate"
                          >
                            <Link2 size={13} className="shrink-0" />
                            <span className="truncate">{link}</span>
                            <ExternalLink size={12} className="shrink-0 ml-auto text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* BRAND QUESTIONNAIRE */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Company Name</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">{selectedItemDetails.company_name}</strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Official Brand Website</span>
                    {selectedItemDetails.website ? (
                      <a 
                        href={selectedItemDetails.website} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[var(--violet)] hover:underline mt-1 block flex items-center gap-1 text-sm font-semibold cursor-pointer"
                      >
                        {selectedItemDetails.website} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <strong className="text-sm text-[var(--text-tertiary)] mt-1 block">Not provided</strong>
                    )}
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Brand Category / Niche</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">{selectedItemDetails.category || "General Retail"}</strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Company Size</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">{selectedItemDetails.company_size || "11-50 employees"}</strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Partner Email Address</span>
                    <strong className="text-sm text-[var(--violet)] mt-1 block flex items-center gap-1.5 select-all">
                      <Mail size={14}/> {selectedItemDetails.email}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Contact Number</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block flex items-center gap-1.5 select-all">
                      <Phone size={14}/> {selectedItemDetails.phone || "Not provided"}
                    </strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block">Corporate HQ Location</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-1 block">{selectedItemDetails.location || "India"}</strong>
                  </div>
                  <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl">
                    <span className="text-xs text-[var(--text-tertiary)] block font-semibold text-[var(--violet)] uppercase tracking-wider">Estimated Monthly Budget</span>
                    <strong className="text-base text-[var(--green)] mt-1 block font-mono font-extrabold">{selectedItemDetails.monthly_budget || "—"}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Biography / About section */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-[var(--text-primary)] mb-6 flex items-center gap-2 border-b border-[var(--border-default)] pb-4">
                  Biography & Goals
                </h3>
                <div className="p-5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl min-h-[220px]">
                  <span className="text-xs text-[var(--text-tertiary)] block mb-2 font-semibold uppercase tracking-wider">
                    {selectedItemDetails.role === 'brand' ? 'About Brand Goals & Philosophy' : 'Creator Biography & Goals'}
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                    "{selectedItemDetails.about || selectedItemDetails.notes || "No additional bio or brand details were provided during waitlist submission."}"
                  </p>
                </div>
              </div>
            </div>

          </div>


        </div>
      )}

      {/* REJECTION OVERLAY DIALOG */}
      {rejectModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-in">
            <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle className="text-[var(--red)]" size={20} /> Reject Waitlist Application
              </h3>
              <button onClick={() => { setRejectModalId(null); setRejectReason(""); setCustomRejectReason(""); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">Primary Rejection Reason *</label>
                <div className="relative">
                  <select 
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--red)] focus:outline-none text-[var(--text-primary)] text-sm cursor-pointer"
                  >
                    <option value="" disabled className="text-[var(--text-secondary)]">Choose a predefined reason...</option>
                    <option value="Fake / Suspicious Engagement" className="text-[var(--text-primary)]">Fake / Suspicious Engagement</option>
                    <option value="Incomplete questionnaire fields" className="text-[var(--text-primary)]">Incomplete questionnaire fields</option>
                    <option value="Out of target geographical region" className="text-[var(--text-primary)]">Out of target geographical region</option>
                    <option value="Business website is not operational" className="text-[var(--text-primary)]">Business website is not operational</option>
                    <option value="Unsuitable niche or category alignment" className="text-[var(--text-primary)]">Unsuitable niche or category alignment</option>
                    <option value="Content against policy guidelines" className="text-[var(--text-primary)]">Content against policy guidelines</option>
                    <option value="Other" className="text-[var(--text-primary)]">Other (Write custom reason)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" size={16} />
                </div>
              </div>

              {/* Custom reason textbox (Only if "Other" is chosen or any rejection) */}
              {(rejectReason === 'Other' || rejectReason) && (
                <div>
                  <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">
                    {rejectReason === 'Other' ? 'Custom Rejection Reason *' : 'Detailed feedback (Optional)'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide explanatory feedback for this application rejection..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="w-full p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--red)] focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm"
                  />
                </div>
              )}
            </div>

            <div className="p-5 bg-[var(--bg-elevated)] border-t border-[var(--border-default)] flex gap-3 justify-end items-center">
              <button 
                onClick={() => { setRejectModalId(null); setRejectReason(""); setCustomRejectReason(""); }} 
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={!rejectReason || (rejectReason === 'Other' && !customRejectReason.trim())}
                onClick={() => {
                  const finalReason = rejectReason === 'Other' ? customRejectReason.trim() : rejectReason + (customRejectReason ? ` - ${customRejectReason.trim()}` : '');
                  if (rejectModalId === 'batch') {
                    setWaitlist(prev => prev.map(w => selectedIds.includes(w.id) ? { ...w, status: "Rejected", rejectReason: finalReason } : w));
                    setRejectModalId(null);
                    setRejectReason("");
                    setCustomRejectReason("");
                    setSelectedIds([]);
                    toast.success(`Batch rejected ${selectedIds.length} profiles.`);
                  } else {
                    handleReject(rejectModalId, finalReason);
                  }
                }} 
                className="px-5 py-2.5 bg-[var(--red)] hover:opacity-90 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL MESSAGE OVERLAY DIALOG */}
      {messageModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-scale-in">
            <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare className="text-[var(--violet)]" size={20} /> Send Action Message
              </h3>
              <button onClick={() => setMessageModalItem(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                The message below will be dispatched to the applicant's user dashboard notification panel. You can customize the text to explain their action steps, re-evaluation reason, or instructions.
              </p>
              <div>
                <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">Recipient</label>
                <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] font-semibold">
                  {messageModalItem.role === 'brand' ? messageModalItem.company_name : messageModalItem.name} ({messageModalItem.email})
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">Message Body</label>
                <textarea
                  rows={6}
                  value={panelMessageText}
                  onChange={(e) => setPanelMessageText(e.target.value)}
                  className="w-full p-4 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[var(--violet)] focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="p-5 bg-[var(--bg-elevated)] border-t border-[var(--border-default)] flex gap-3 justify-end items-center">
              <button 
                onClick={() => setMessageModalItem(null)} 
                className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={sendingMessage || !panelMessageText.trim()}
                onClick={async () => {
                  setSendingMessage(true);
                  try {
                    await api.post(`/admin/waitlist/${messageModalItem.id}/message`, { message: panelMessageText });
                    toast.success("Action message successfully sent to the applicant's panel!");
                    setMessageModalItem(null);
                  } catch (e) {
                    console.error(e);
                    toast.error(e?.response?.data?.error || e?.message || "Failed to send message. Please try again.");
                  } finally {
                    setSendingMessage(false);
                  }
                }} 
                className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {sendingMessage ? "Sending..." : "Dispatch Message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingWaitlistItem && (
        <WaitlistEditModal
          item={editingWaitlistItem}
          onClose={() => setEditingWaitlistItem(null)}
          onSaveSuccess={(updatedItem) => {
            setWaitlist(prev => prev.map(w => (w.id === updatedItem.id || w.user_id === updatedItem.user_id) ? { ...w, ...updatedItem } : w));
            if (selectedItemDetails && (selectedItemDetails.id === updatedItem.id || selectedItemDetails.user_id === updatedItem.user_id)) {
              setSelectedItemDetails(prev => ({ ...prev, ...updatedItem }));
            }
          }}
        />
      )}
    </div>
  );
}
