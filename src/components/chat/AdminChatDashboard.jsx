import React, { useState, useEffect } from 'react';
import { safeLower } from "../../utils/safeFormat";
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { ShieldAlert, MessageSquare, Search, Eye, ShieldX, User, AlertTriangle, Filter, ArrowRight, ExternalLink, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminChatDashboard({ setActiveEnforcementUser, setSearchParams }) {
  const [threads, setThreads] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [guardViolations, setGuardViolations] = useState([]);
  const [violations, setViolations] = useState([]);
  const [tab, setTab] = useState('guard'); // default to 'guard' as per new priority
  const [guardSubTab, setGuardSubTab] = useState('all_violations'); // 'all_violations' or 'repeat_offenders'
  const [loading, setLoading] = useState(true);

  // Filters for All Violations Log
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'brand', 'creator'
  const [filterType, setFilterType] = useState('all'); // 'all', 'hard_number', 'soft_keyword'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [threadsRes, flaggedRes, guardRes, violationsRes] = await Promise.all([
        api.get('admin/chat/all'),
        api.get('admin/chat/flagged'),
        api.get('admin/chat_guard_violations').catch(() => ({ data: [] })),
        api.get('admin/chat_violations').catch(() => ({ data: [] }))
      ]);
      setThreads(threadsRes.data || []);
      setFlagged(flaggedRes.data || []);
      setGuardViolations(guardRes.data || []);
      setViolations(violationsRes.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to load chat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (flagId, action) => {
    try {
      await api.post(`/admin/chat/flagged/${flagId}/resolve`, { action });
      toast.success(`Action taken: ${action}`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Action failed");
    }
  };

  // Resolve chat violation (e.g. mark safe, unrestrict, warn, restrict)
  const handleResolveViolation = async (violationId, action, senderId) => {
    setResolvingId(violationId);
    try {
      await api.post(`/admin/chat_violations/${violationId}/resolve`, {
        action,
        user_id: senderId
      });
      toast.success(action === 'mark_safe' || action === 'unrestrict' 
        ? "Violation resolved as safe and user restrictions cleared!" 
        : `Violation updated: ${action}`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to resolve violation");
    } finally {
      setResolvingId(null);
    }
  };

  // Dedicated unrestrict user handler
  const handleUnrestrictUser = async (userId, senderName) => {
    setResolvingId(userId);
    try {
      await api.post(`/admin/users/${userId}/unrestrict`);
      toast.success(`User ${senderName || ''} unrestricted! Chat access restored.`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to unrestrict user");
    } finally {
      setResolvingId(null);
    }
  };

  // Set active enforcement user and switch tab to users to open the enforcement slide-over!
  const manageUser = (userId, name, email, role) => {
    if (typeof setActiveEnforcementUser === 'function' && typeof setSearchParams === 'function') {
      setActiveEnforcementUser({ user_id: userId, name, email, role });
      setSearchParams({ tab: 'users' });
    } else {
      toast.info(`Managing user: ${name} (${role}). Switch to the Users tab to take action.`);
    }
  };

  // Filtered violations log
  const filteredViolations = React.useMemo(() => {
    return violations.filter(v => {
      const matchesRole = filterRole === 'all' || v.sender_role === filterRole;
      const matchesType = filterType === 'all' || v.violation_type === filterType;
      const isResolved = v.status && v.status.startsWith('RESOLVED');
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'pending' && !isResolved) ||
        (filterStatus === 'resolved' && isResolved);
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (v.sender_name && safeLower(v.sender_name).includes(query)) ||
        (v.sender_email && safeLower(v.sender_email).includes(query)) ||
        (v.message_content_attempted && safeLower(v.message_content_attempted).includes(query));

      return matchesRole && matchesType && matchesStatus && matchesSearch;
    });
  }, [violations, filterRole, filterType, filterStatus, searchQuery]);

  // Dynamically aggregated repeat offenders
  const repeatOffenders = React.useMemo(() => {
    const agg = {};
    violations.forEach(v => {
      const senderId = v.sender_id;
      if (!agg[senderId]) {
        agg[senderId] = {
          sender_id: senderId,
          sender_name: v.sender_name || "Unknown Sender",
          sender_email: v.sender_email || "N/A",
          sender_picture: v.sender_picture,
          sender_role: v.sender_role || "unknown",
          total_count: 0,
          hard_count: 0,
          soft_count: 0,
          most_recent: v.detected_at
        };
      }
      
      const entry = agg[senderId];
      entry.total_count += 1;
      if (v.violation_type === 'hard_number') {
        entry.hard_count += 1;
      } else {
        entry.soft_count += 1;
      }
      
      if (new Date(v.detected_at).getTime() > new Date(entry.most_recent).getTime()) {
        entry.most_recent = v.detected_at;
      }
    });
    
    // Sort by total count desc
    return Object.values(agg).sort((a, b) => b.total_count - a.total_count);
  }, [violations]);

  if (loading) return (
      <div className="w-full p-4 space-y-4">
        <div className="h-10 bg-slate-200/60 rounded-lg animate-pulse w-1/4 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
          <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
          <div className="h-32 bg-slate-200/60 rounded-xl animate-pulse relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
        </div>
        <div className="h-64 bg-slate-200/60 rounded-xl animate-pulse mt-4 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"></div>
      </div>
    );

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Chat Security Guard</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Review chat security and flagged messages.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-[var(--border-default)] pb-4">
        <button 
           onClick={() => setTab('guard')} 
           className={`font-bold flex items-center gap-2 pb-1 border-b-2 transition-colors ${tab === 'guard' ? 'text-red-500 border-red-500' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
        >
          <ShieldX size={18} /> Chat Guard Blocks ({violations.length})
        </button>
        <button 
           onClick={() => setTab('flags')} 
           className={`font-bold flex items-center gap-2 pb-1 border-b-2 transition-colors ${tab === 'flags' ? 'text-amber-500 border-amber-500' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
        >
          <ShieldAlert size={18} /> Flagged Messages ({flagged.length})
        </button>
        <button 
           onClick={() => setTab('all')} 
           className={`font-bold flex items-center gap-2 pb-1 border-b-2 transition-colors ${tab === 'all' ? 'text-[var(--violet)] border-[var(--violet)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
        >
          <MessageSquare size={18} /> All Threads
        </button>
      </div>

      {/* CHAT GUARD TAB */}
      {tab === 'guard' && (
        <div className="space-y-6">
          {/* Sub-tab Switcher */}
          <div className="flex gap-4 border-b border-gray-100 pb-2">
            <button 
               onClick={() => setGuardSubTab('all_violations')} 
               className={`text-xs font-extrabold uppercase tracking-widest py-1 border-b-2 transition-colors ${guardSubTab === 'all_violations' ? 'text-[var(--violet)] border-[var(--violet)]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              All Violations Log ({filteredViolations.length})
            </button>
            <button 
               onClick={() => setGuardSubTab('repeat_offenders')} 
               className={`text-xs font-extrabold uppercase tracking-widest py-1 border-b-2 transition-colors ${guardSubTab === 'repeat_offenders' ? 'text-[var(--violet)] border-[var(--violet)]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              Repeat Offenders ({repeatOffenders.length})
            </button>
          </div>

          {/* SUBTAB: ALL VIOLATIONS LOG */}
          {guardSubTab === 'all_violations' && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
                    <Filter size={12} /> Filters:
                  </span>
                  
                  {/* Role filter */}
                  <div className="flex border border-gray-100 rounded-lg p-0.5 bg-gray-50">
                    {['all', 'creator', 'brand'].map(r => (
                      <button
                        key={r}
                        onClick={() => setFilterRole(r)}
                        className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md transition-colors ${filterRole === r ? 'bg-white text-[var(--violet)] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {r === 'all' ? 'All Roles' : r + 's'}
                      </button>
                    ))}
                  </div>

                  {/* Type filter */}
                  <div className="flex border border-gray-100 rounded-lg p-0.5 bg-gray-50">
                    {[
                      { id: 'all', label: 'All Types' },
                      { id: 'hard_number', label: 'Hard (Blocked)' },
                      { id: 'soft_keyword', label: 'Soft (Logged)' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setFilterType(t.id)}
                        className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md transition-colors ${filterType === t.id ? 'bg-white text-[var(--violet)] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Status filter */}
                  <div className="flex border border-gray-100 rounded-lg p-0.5 bg-gray-50">
                    {[
                      { id: 'all', label: 'All Status' },
                      { id: 'pending', label: 'Active / Flagged' },
                      { id: 'resolved', label: 'Resolved' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setFilterStatus(s.id)}
                        className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md transition-colors ${filterStatus === s.id ? 'bg-white text-[var(--violet)] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search query */}
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sender, message..."
                    className="w-full text-xs pl-9 pr-4 py-2 border border-gray-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--violet)]/40 focus:border-[var(--violet)] transition-all bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Log Table / List */}
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="p-4">Sender</th>
                        <th className="p-4">Violation Type</th>
                        <th className="p-4">Attempted Content</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Detected At</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredViolations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-gray-400 font-bold text-sm">
                            No violations found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredViolations.map((v, idx) => {
                          const isResolved = v.status && v.status.startsWith('RESOLVED');
                          return (
                            <tr key={v.id ? `viol-${v.id}-${idx}` : `viol-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                              {/* Sender Info */}
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {v.sender_picture ? (
                                    <img src={v.sender_picture} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E9D5FF] to-[#C084FC] flex items-center justify-center text-xs font-black text-white">
                                      {(v.sender_name || "?").charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                                      {v.sender_name}
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${v.sender_role === 'brand' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                        {v.sender_role}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{v.sender_email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Violation Type Pill */}
                              <td className="p-4">
                                {v.violation_type === 'hard_number' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    Hard Blocked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Soft Keyword
                                  </span>
                                )}
                              </td>

                              {/* Message Attempted */}
                              <td className="p-4 max-w-xs md:max-w-md">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 font-mono text-xs text-gray-700 whitespace-pre-wrap break-all select-all">
                                  {v.message_content_attempted}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  isResolved 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                }`}>
                                  {v.status || 'FLAGGED'}
                                </span>
                              </td>

                              {/* Detected At */}
                              <td className="p-4 text-xs font-semibold text-gray-400">
                                {new Date(v.detected_at).toLocaleString()}
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Mark Safe / Unrestrict (One click resolution) */}
                                  <button
                                    onClick={() => handleResolveViolation(v.id, 'mark_safe', v.sender_id)}
                                    disabled={resolvingId === v.id}
                                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors disabled:opacity-50"
                                    title="Mark message as safe false-positive & lift any restriction on this user"
                                  >
                                    Mark Safe
                                  </button>

                                  {/* Unrestrict User button */}
                                  <button
                                    onClick={() => handleUnrestrictUser(v.sender_id, v.sender_name)}
                                    disabled={resolvingId === v.sender_id}
                                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors disabled:opacity-50"
                                    title="Clear all violations and restore chat access for user"
                                  >
                                    Unrestrict
                                  </button>

                                  {v.sender_role === 'creator' && (
                                    <Link
                                      to={`/creator/${v.sender_id}`}
                                      target="_blank"
                                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-[var(--violet)] transition-colors border border-gray-200"
                                      title="View Profile"
                                    >
                                      <ExternalLink size={13} />
                                    </Link>
                                  )}

                                  <button
                                    onClick={() => manageUser(v.sender_id, v.sender_name, v.sender_email, v.sender_role)}
                                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-100 rounded-xl transition-colors"
                                  >
                                    Enforce
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB: REPEAT OFFENDERS */}
          {guardSubTab === 'repeat_offenders' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="p-4">Offender</th>
                        <th className="p-4 text-center">Violations Breakout</th>
                        <th className="p-4">Risk Status</th>
                        <th className="p-4">Most Recent Attempt</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {repeatOffenders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-gray-400 font-bold text-sm">
                            No offenders logged yet. Clean slate!
                          </td>
                        </tr>
                      ) : (
                        repeatOffenders.map((off, idx) => {
                          const isHighRisk = off.hard_count >= 3;
                          return (
                            <tr key={off.sender_id ? `off-${off.sender_id}-${idx}` : `off-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                              {/* Offender Info */}
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {off.sender_picture ? (
                                    <img src={off.sender_picture} alt="" className="w-9 h-9 rounded-full object-cover shadow-sm" />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E9D5FF] to-[#C084FC] flex items-center justify-center text-sm font-black text-white">
                                      {(off.sender_name || "?").charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
                                      {off.sender_name}
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${off.sender_role === 'brand' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                        {off.sender_role}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{off.sender_email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Violations breakout counts */}
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-3">
                                  <div className="text-center">
                                    <span className="block text-sm font-black text-gray-900">{off.total_count}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Total</span>
                                  </div>
                                  <div className="w-px h-6 bg-gray-100"></div>
                                  <div className="text-center">
                                    <span className="block text-sm font-black text-red-600">{off.hard_count}</span>
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Hard</span>
                                  </div>
                                  <div className="w-px h-6 bg-gray-100"></div>
                                  <div className="text-center">
                                    <span className="block text-sm font-black text-amber-600">{off.soft_count}</span>
                                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Soft</span>
                                  </div>
                                </div>
                              </td>

                              {/* Risk Rating Pulsing Status */}
                              <td className="p-4">
                                {isHighRisk ? (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-red-500 animate-pulse">
                                    <AlertTriangle size={12} className="shrink-0" />
                                    High Risk
                                  </div>
                                ) : off.hard_count > 0 ? (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    <Shield size={12} className="shrink-0 text-amber-500" />
                                    Medium Risk
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                    <Shield size={12} className="shrink-0 text-green-500" />
                                    Low Risk
                                  </div>
                                )}
                              </td>

                              {/* Most Recent Timestamp */}
                              <td className="p-4 text-xs font-semibold text-gray-400">
                                {new Date(off.most_recent).toLocaleString()}
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Quick Unrestrict Button */}
                                  <button
                                    onClick={() => handleUnrestrictUser(off.sender_id, off.sender_name)}
                                    disabled={resolvingId === off.sender_id}
                                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                    title="Unrestrict user and clear all violation flags"
                                  >
                                    Unrestrict
                                  </button>

                                  {off.sender_role === 'creator' && (
                                    <Link
                                      to={`/creator/${off.sender_id}`}
                                      target="_blank"
                                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-[var(--violet)] transition-colors border border-gray-200"
                                      title="View Public Profile"
                                    >
                                      <ExternalLink size={13} />
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => manageUser(off.sender_id, off.sender_name, off.sender_email, off.sender_role)}
                                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm"
                                  >
                                    Manage & Enforce
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLAGGED MESSAGES TAB */}
      {tab === 'flags' && (
        <div className="space-y-4">
          {flagged.length === 0 && <p className="text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-2xl p-8 text-center font-semibold">No pending flagged messages.</p>}
          {flagged.map((f, idx) => (
            <div key={f.id ? `flag-${f.id}-${idx}` : `flag-${idx}`} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-red-500/10 text-red-600 px-2.5 py-1 rounded-sm text-xs font-bold uppercase">{f.severity} RISK</span>
                  <p className="text-[var(--text-primary)] font-medium mt-2">{f.reason}</p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{new Date(f.created_at).toLocaleString()}</span>
              </div>
              
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
                <span className="text-[var(--text-tertiary)] text-xs mb-1 block">Flagged Content:</span>
                <p className="text-[var(--text-primary)]/90 text-sm font-mono">&quot;{f.message?.content}&quot;</p>
              </div>

              <div className="flex gap-3 mt-2">
                <button onClick={() => handleAction(f.id, 'WARN')} className="flex-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 py-2 rounded-xl text-sm font-bold transition-colors border border-amber-500/30">
                  Issue Warning
                </button>
                <button onClick={() => handleAction(f.id, 'SUSPEND')} className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 py-2 rounded-xl text-sm font-bold transition-colors border border-red-500/30">
                  Suspend User
                </button>
                <button onClick={() => handleAction(f.id, 'DISMISS')} className="px-4 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] py-2 rounded-xl text-sm font-bold transition-colors border border-[var(--border-default)]">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ALL THREADS TAB */}
      {tab === 'all' && (
        <div className="overflow-hidden border border-[var(--border-default)] rounded-2xl bg-[var(--bg-elevated)]">
          <table className="w-full text-left text-sm text-[var(--text-secondary)]">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs uppercase font-bold">
              <tr>
                <th className="p-4">Creator</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {threads.map((t, idx) => (
                <tr key={t.id ? `th-${t.id}-${idx}` : `th-${idx}`} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="p-4 font-medium text-[var(--text-primary)]">{t.creator?.name || 'Unknown'}</td>
                  <td className="p-4 font-medium text-[var(--text-primary)]">{t.brand?.name || 'Unknown'}</td>
                  <td className="p-4">
                    <span className="bg-[var(--bg-elevated)] px-2 py-1 rounded text-xs font-bold tracking-wide">{t.status}</span>
                  </td>
                  <td className="p-4 text-center font-bold">₹{t.agreed_amount || 0}</td>
                  <td className="p-4 text-right">
                    <button className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors text-[var(--text-primary)]">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {threads.length === 0 && <div className="p-8 text-center">No threads found.</div>}
        </div>
      )}
    </div>
  );
}

