import React, { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, AlertTriangle, Scale, Check, IndianRupee, ShieldAlert, FileText, Ban, ShieldCheck, UserX, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { CustomDatePicker } from '../ui/custom-date-picker';
import { toast } from 'sonner';

export default function SystemReports() {
  const [activeTab, setActiveTab] = useState('disputes'); // disputes or chat_guard
  const [activeView, setActiveView] = useState('overview'); // overview, collab_detail, dispute_detail
  const [activeCollab, setActiveCollab] = useState(null);
  const [collabs, setCollabs] = useState([]);

  // Chat violations state
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    fetchCollabs();
  }, [activeView]);

  useEffect(() => {
    if (activeTab === 'chat_guard') {
      fetchChatViolations();
    }
  }, [activeTab]);

  const fetchCollabs = async () => {
    try {
      const res = await api.get("admin/system-collabs");
      setCollabs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch collabs:", err);
    }
  };

  const fetchChatViolations = async () => {
    setLoadingViolations(true);
    try {
      const res = await api.get("admin/chat_violations");
      setViolations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch chat violations:", err);
      toast.error("Failed to load chat violations");
    } finally {
      setLoadingViolations(false);
    }
  };

  const handleResolveViolation = async (violationId, action, senderId) => {
    const note = window.prompt(`Optional note for action "${action}":`, "");
    if (note === null) return;

    setResolvingId(violationId);
    try {
      await api.post(`admin/chat_violations/${violationId}/resolve`, {
        action,
        note,
        user_id: senderId
      });
      toast.success(`Violation resolved with action: ${action}`);
      fetchChatViolations();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to resolve violation");
    } finally {
      setResolvingId(null);
    }
  };

  if (activeView === 'collab_detail' && activeCollab) {
     return <CollabStatusControl collab={activeCollab} onBack={() => setActiveView('overview')} />;
  }

  if (activeView === 'dispute_detail' && activeCollab) {
     return <DisputeMediation collab={activeCollab} onBack={() => setActiveView('overview')} />;
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Disputes & Support</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage collab disputes, mediations, and chat security.</p>
        </div>
      </div>

       {/* Sub Navigation Bar */}
       <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-default)] w-full sm:w-auto self-start">
          <button 
             onClick={() => setActiveTab('disputes')}
             className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'disputes' ? 'bg-[#9D7CFF] text-[var(--text-primary)] shadow-md' : 'text-[var(--text-primary)]/60 hover:text-[var(--text-primary)]'}`}
          >
             <AlertTriangle size={16}/> Collab Disputes & Oversight
          </button>
          <button 
             onClick={() => setActiveTab('chat_guard')}
             className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'chat_guard' ? 'bg-[#9D7CFF] text-[var(--text-primary)] shadow-md' : 'text-[var(--text-primary)]/60 hover:text-[var(--text-primary)]'}`}
          >
             <ShieldAlert size={16}/> Chat Guard & Violations ({violations.filter(v => v.status === 'DETECTED' || v.status === 'PENDING').length})
          </button>
       </div>

       {activeTab === 'chat_guard' ? (
          /* Chat Guard & Violations Panel */
          <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                   <h2 className="font-display text-xl font-bold flex items-center gap-2 text-amber-400">
                      <ShieldAlert size={20} /> Off-Platform Contact & Policy Violations
                   </h2>
                   <p className="text-xs text-[var(--text-secondary)]">
                      Automated Chat Guard flags phone numbers, emails, WhatsApp handles, and external payment links in user messages.
                   </p>
                </div>
                <button
                   onClick={fetchChatViolations}
                   className="px-3.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:bg-foreground/5 rounded-xl text-xs font-semibold transition-colors"
                >
                   Refresh Violations
                </button>
             </div>

             {loadingViolations ? (
                <div className="p-12 text-center text-[var(--text-tertiary)]">
                   <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#9D7CFF] border-t-transparent mb-2"></div>
                   <p className="text-sm font-medium">Scanning chat guard logs...</p>
                </div>
             ) : violations.length === 0 ? (
                <div className="p-12 border border-dashed border-[var(--border-default)] rounded-2xl text-center text-[var(--text-tertiary)]">
                   <ShieldCheck size={48} className="mx-auto mb-3 text-emerald-400 opacity-40" />
                   <p className="text-base font-semibold text-[var(--text-primary)]">No chat violations detected</p>
                   <p className="text-xs mt-1">Platform chats are clean and compliant with terms of service.</p>
                </div>
             ) : (
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                         <thead>
                            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                               <th className="px-4 py-3.5 font-semibold">Sender & Time</th>
                               <th className="px-4 py-3.5 font-semibold">Violation Type</th>
                               <th className="px-4 py-3.5 font-semibold">Flagged Content / Snippet</th>
                               <th className="px-4 py-3.5 font-semibold text-center">Severity</th>
                               <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                               <th className="px-4 py-3.5 font-semibold text-right">Moderation Actions</th>
                            </tr>
                         </thead>
                         <tbody className="text-sm divide-y divide-[var(--border-default)]">
                            {violations.map((v, idx) => {
                               const isPending = v.status === 'DETECTED' || v.status === 'PENDING';
                               return (
                                  <tr key={v.id ? `sys-viol-${v.id}-${idx}` : `sys-viol-${idx}`} className="hover:bg-foreground/5 transition-colors">
                                     <td className="px-4 py-4">
                                        <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                                           {v.sender_name || v.sender_id || 'Unknown User'}
                                           {isPending && (
                                              <span className="relative flex h-2 w-2 shrink-0" title="Pending Moderation Review">
                                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                              </span>
                                           )}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-tertiary)]">{v.sender_email || 'N/A'}</div>
                                        <div className="text-[10px] text-[var(--text-tertiary)] mt-1">{v.detected_at ? new Date(v.detected_at).toLocaleString() : 'Recent'}</div>
                                     </td>

                                     <td className="px-4 py-4">
                                        <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                           {v.type || v.violation_type || 'OFF_PLATFORM_CONTACT'}
                                        </span>
                                     </td>

                                     <td className="px-4 py-4 max-w-xs truncate">
                                        <div className="text-xs font-mono bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border-default)] truncate max-w-sm text-red-400" title={v.content || v.snippet}>
                                           "{v.content || v.snippet || v.flagged_text || 'Off-platform contact attempt'}"
                                        </div>
                                     </td>

                                     <td className="px-4 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${v.severity === 'HARD' || v.is_hard_violation ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                                           {v.severity || (v.is_hard_violation ? 'HARD' : 'SOFT')}
                                        </span>
                                     </td>

                                     <td className="px-4 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                                           {v.status}
                                        </span>
                                     </td>

                                     <td className="px-4 py-4 text-right">
                                        {isPending ? (
                                           <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                 onClick={() => handleResolveViolation(v.id, 'mark_safe', v.sender_id)}
                                                 disabled={resolvingId === v.id}
                                                 className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all"
                                                 title="Dismiss violation as false positive"
                                              >
                                                 Dismiss
                                              </button>
                                              <button
                                                 onClick={() => handleResolveViolation(v.id, 'issue_warning', v.sender_id)}
                                                 disabled={resolvingId === v.id}
                                                 className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all"
                                                 title="Issue warning notification to user"
                                              >
                                                 Warn User
                                              </button>
                                              <button
                                                 onClick={() => handleResolveViolation(v.id, 'restrict_user', v.sender_id)}
                                                 disabled={resolvingId === v.id}
                                                 className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-all"
                                                 title="Restrict user from sending chat messages"
                                              >
                                                 Restrict
                                              </button>
                                           </div>
                                        ) : (
                                           <span className="text-xs text-[var(--text-tertiary)] italic">Resolved</span>
                                        )}
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
             )}
          </div>
       ) : (
          /* Active Disputes & Collab Oversight Panel */
          <div className="space-y-8">
             {/* Active Disputes Section (High Priority) */}
             <div>
                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
                   <AlertTriangle size={20} /> Active Disputes Requiring Mediation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {collabs.filter(c => c.status?.toUpperCase() === 'DISPUTED').map((c, idx) => (
                      <div key={c.id ? `disp-${c.id}-${idx}` : `disp-${idx}`} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 hover:border-red-500/50 transition-colors cursor-pointer group" onClick={() => { setActiveCollab(c); setActiveView('dispute_detail')}}>
                         <div className="flex justify-between items-start mb-4">
                            <div className="px-2.5 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded-full tracking-wider border border-red-500/20">Open Dispute</div>
                            <span className="text-xs text-[var(--text-secondary)]">{c.lastUpdate}</span>
                         </div>
                         <h3 className="font-semibold text-lg mb-1 flex items-center gap-1.5">
                            {c.campaign}
                            <span className="relative flex h-2 w-2 shrink-0" title="Active Disputed Collaboration">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                         </h3>
                         <div className="text-sm text-[var(--text-secondary)] mb-4">{c.brand} vs {c.creator}</div>
                         <div className="flex items-center justify-between border-t border-red-500/10 pt-4">
                            <div className="text-sm"><span className="text-[var(--text-secondary)]">Escrow:</span> <span className="font-mono font-medium">₹{c.escrow?.toLocaleString() || 0}</span></div>
                            <div className="text-sm text-red-400 flex items-center gap-1 group-hover:text-red-500 font-semibold transition-colors">Resolve Option <ArrowRight size={14}/></div>
                         </div>
                      </div>
                   ))}
                   {collabs.filter(c => c.status?.toUpperCase() === 'DISPUTED').length === 0 && (
                      <div className="col-span-full p-6 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border-default)] rounded-2xl">
                         No active disputes at the moment.
                      </div>
                   )}
                </div>
             </div>

             {/* All Collabs Oversight */}
             <div>
                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                   <FileText size={20} className="text-[#9D7CFF]"/> Collab Management Oversight
                </h2>
                <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-foreground/5 border-b border-[var(--border-default)] text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                            <th className="px-4 py-3 font-medium">Collab ID / Campaign</th>
                            <th className="px-4 py-3 font-medium">Brand & Creator</th>
                            <th className="px-4 py-3 font-medium">Status / Deadline</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-foreground/5">
                         {collabs.map((c, idx) => (
                            <tr key={c.id ? `collab-${c.id}-${idx}` : `collab-${idx}`} className="hover:bg-foreground/5 transition-colors">
                               <td className="px-4 py-4">
                                  <div className="font-mono text-xs text-[var(--text-tertiary)] mb-1">{c.id}</div>
                                  <div className="font-semibold">{c.campaign}</div>
                               </td>
                               <td className="px-4 py-4">
                                  <div>{c.brand}</div>
                                  <div className="text-[var(--text-secondary)] text-xs mt-0.5">With: {c.creator}</div>
                               </td>
                               <td className="px-4 py-4">
                                  <div className="mb-1">
                                     {c.status === 'In Progress' && <span className="text-indigo-400 font-medium">In Progress</span>}
                                     {c.status === 'Delivered' && <span className="text-blue-400 font-medium">Delivered (Pending Approval)</span>}
                                     {c.status?.toUpperCase() === 'DISPUTED' && <span className="text-red-500 font-medium font-bold">Disputed</span>}
                                  </div>
                                  <div className="text-xs text-[var(--text-tertiary)]">Due: {c.deadline}</div>
                               </td>
                               <td className="px-4 py-4 text-right">
                                  <button 
                                     onClick={() => { setActiveCollab(c); setActiveView('collab_detail'); }}
                                     className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[#9D7CFF]/50 hover:bg-foreground/5 rounded-lg text-xs font-semibold transition-colors"
                                  >
                                     Manage Collab
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}function CollabStatusControl({ collab, onBack }) {
  const [overrideStatus, setOverrideStatus] = useState("");
  const [reason, setReason] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (collab?.id) {
      fetchMessages();
    }
  }, [collab?.id]);

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`admin/system-collabs/${collab.id}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load collab messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleForceStatus = async () => {
    if (!overrideStatus || !reason) return;
    setIsSubmitting(true);
    try {
      await api.post(`admin/system-collabs/${collab.id}/force-status`, { status: overrideStatus, reason });
      toast.success(`Collab status successfully updated to "${overrideStatus}"`);
      onBack();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to force change status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendDeadline = async () => {
    if (!extensionDate) {
      toast.error("Please select a new extension date first");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`admin/system-collabs/${collab.id}/extend-deadline`, {
        new_deadline: extensionDate,
        reason: "Admin extension request"
      });
      toast.success(`Deadline extended to ${extensionDate}`);
      collab.deadline = extensionDate;
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to extend deadline");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInjectMessage = async () => {
    if (!adminMessage.trim()) {
      toast.error("Message content cannot be empty");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post(`admin/system-collabs/${collab.id}/inject-message`, {
        message: adminMessage.trim()
      });
      toast.success("Official message sent to collab chat log!");
      setAdminMessage("");
      setSelectedTemplate("");
      if (res.data?.injectedMessage) {
        setMessages((prev) => [...prev, res.data.injectedMessage]);
      } else {
        fetchMessages();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to inject message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateSelect = (e) => {
    const val = e.target.value;
    setSelectedTemplate(val);
    if (val) {
      setAdminMessage(val);
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-6">
       <button onClick={onBack} className="text-sm text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] flex items-center gap-2 mb-4 font-semibold transition-colors">
          &larr; Back to Reports
       </button>

       <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl flex items-center justify-between">
          <div>
             <h2 className="font-display text-2xl font-bold">{collab.campaign}</h2>
             <div className="text-sm text-[var(--text-secondary)] mt-1">{collab.brand} • {collab.creator}</div>
          </div>
          <div className="text-right">
             <div className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-semibold mb-1">Escrow Funds</div>
             <div className="font-mono text-xl text-green-400">₹{collab.escrow?.toLocaleString() || 0}</div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">Collab Status Override</h3>
                <p className="text-sm text-[var(--text-primary)]/60 mb-6 leading-relaxed">
                   Admins can force-change a collaboration's status. This bypasses the normal automated triggers. Use only when necessary.
                </p>
                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">New Status Target</label>
                      <select 
                         value={overrideStatus}
                         onChange={e=>setOverrideStatus(e.target.value)}
                         className="w-full p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[#9D7CFF] focus:outline-none text-sm text-[var(--text-primary)]"
                      >
                         <option value="">Select status...</option>
                         <option value="CANCELLED">Cancelled (Refund Brand)</option>
                         <option value="DELIVERED">Force Delivered Status</option>
                         <option value="COMPLETED">Force Completed (Release Funds to Creator)</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">Reason for manual change (Mandatory log)</label>
                      <textarea 
                         value={reason}
                         onChange={e=>setReason(e.target.value)}
                         placeholder="Explain why status is being force changed..."
                         className="w-full p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl focus:border-[#9D7CFF] focus:outline-none text-sm h-24 resize-none text-[var(--text-primary)]"
                      />
                   </div>
                   <button 
                      onClick={handleForceStatus}
                      disabled={!overrideStatus || !reason || isSubmitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl disabled:opacity-50 transition-colors"
                   >
                      {isSubmitting ? "Updating..." : "Apply Force Status Change"}
                   </button>
                </div>
             </div>
             
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">Extend Deadline</h3>
                <div className="flex gap-4">
                   <div className="flex-1">
                      <CustomDatePicker 
                        placeholder="Select extension date" 
                        value={extensionDate}
                        onChange={(d) => setExtensionDate(d)}
                        className="w-full bg-[var(--bg-elevated)] border-[var(--border-default)]" 
                      />
                   </div>
                   <button 
                      onClick={handleExtendDeadline}
                      disabled={!extensionDate || isSubmitting}
                      className="px-6 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                   >
                      Extend
                   </button>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-3">Both parties will be notified of the deadline extension in their campaign view.</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 h-[460px] flex flex-col">
                <h3 className="font-semibold mb-3 flex items-center justify-between">
                   <span>Admin Message Injection</span>
                   <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 uppercase font-bold">Visible to both</span>
                </h3>
                
                <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)] p-4 overflow-y-auto mb-3 text-xs space-y-3">
                   {loadingMessages ? (
                      <div className="text-center py-8 text-[var(--text-tertiary)]">Loading chat history...</div>
                   ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-tertiary)] italic">No chat messages logged yet for this campaign.</div>
                   ) : (
                      messages.map((m, idx) => (
                         <div key={m.id || idx} className={`p-2.5 rounded-lg border text-xs ${m.type === 'admin_injection' ? 'bg-[#9D7CFF]/10 border-[#9D7CFF]/30 text-[#9D7CFF]' : 'bg-[var(--bg-card)] border-[var(--border-default)]'}`}>
                            <div className="flex items-center justify-between font-bold text-[10px] opacity-70 mb-1">
                               <span>{m.sender}</span>
                               <span>{m.time}</span>
                            </div>
                            <div className="leading-relaxed">{m.text}</div>
                         </div>
                      ))
                   )}
                </div>
                
                <div className="space-y-2">
                   <select 
                      value={selectedTemplate}
                      onChange={handleTemplateSelect}
                      className="w-full p-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-xs focus:border-[#9D7CFF] focus:outline-none text-[var(--text-secondary)]"
                   >
                      <option value="">Select a quick template...</option>
                      <option value="Reminder: Campaign deadline is approaching. Please upload deliverables promptly.">Reminder: Deadline is approaching.</option>
                      <option value="Warning: Platform policy prohibits sharing off-platform contact details or external payment links.">Warning: Keep communication on-platform.</option>
                      <option value="Official Notice: Collaboration paused under active administrative dispute review.">Notification: Collab paused due to dispute.</option>
                   </select>
                   <textarea 
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="Type official admin message..." 
                      className="w-full h-16 p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-sm focus:border-[#9D7CFF] focus:outline-none resize-none text-[var(--text-primary)]"
                   />
                   <button 
                      onClick={handleInjectMessage}
                      disabled={!adminMessage.trim() || isSubmitting}
                      className="w-full py-2.5 bg-[#9D7CFF] hover:bg-[#8B6BE0] text-white font-semibold rounded-xl text-xs transition-colors text-center disabled:opacity-50"
                   >
                      {isSubmitting ? "Sending..." : "Send to Chat Log"}
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function DisputeMediation({ collab, onBack }) {
  const [resolution, setResolution] = useState(null);
  const [brandRefundPct, setBrandRefundPct] = useState(50);
  const [creatorPayoutPct, setCreatorPayoutPct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [freezeReason, setFreezeReason] = useState("");
  const [isFrozen, setIsFrozen] = useState(collab.escrow_hold || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFreeze = async () => {
    if (!freezeReason) {
      toast.error("Please enter a reason for freezing escrow");
      return;
    }
    try {
      await api.post(`admin/system-collabs/${collab.id}/freeze`, { reason: freezeReason });
      setIsFrozen(true);
      toast.success("Escrow funds frozen successfully");
    } catch(err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to freeze escrow");
    }
  };

  const handleResolve = async () => {
    if (!resolution) {
      toast.error("Please select a resolution outcome");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`admin/system-collabs/${collab.id}/resolve`, { 
        resolution, 
        rationale: rationale || "Admin mediated resolution enforced.",
        brand_refund_pct: brandRefundPct,
        creator_payout_pct: creatorPayoutPct
      });
      toast.success("Dispute resolution enforced successfully!");
      onBack();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to enforce dispute resolution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
     <div className="w-full max-w-7xl flex flex-col h-[calc(100vh-100px)]">
       <div className="flex items-center justify-between mb-6 shrink-0">
          <button onClick={onBack} className="text-sm text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] flex items-center gap-2 font-semibold">
             &larr; Back to Reports
          </button>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={14}/> Active Dispute</div>
             <div className="text-sm font-mono text-[var(--text-secondary)]">Escrow: <span className="text-[var(--text-primary)] font-bold text-base">₹{collab.escrow?.toLocaleString() || 0}</span></div>
          </div>
       </div>

       <div className="flex flex-1 gap-6 min-h-0">
          {/* Left Panel: Brand Complaint */}
          <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl flex flex-col overflow-hidden">
             <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                <span className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-wider">Brand Claim</span>
                <h3 className="font-semibold text-lg">{collab.brand}</h3>
             </div>
             <div className="p-5 overflow-y-auto space-y-4">
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                   <div className="text-xs font-medium text-red-400 mb-1">Complaint Reason</div>
                   <div className="text-sm text-[var(--text-primary)]">Deliverables do not match the agreed brief standards and creator missed the campaign deadline. Requesting full refund.</div>
                </div>
                <div>
                   <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Evidence Uploaded</div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-video bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center border border-[var(--border-default)] text-[var(--text-tertiary)] text-xs font-medium">Brief_Requirements.pdf</div>
                      <div className="aspect-video bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center border border-[var(--border-default)] text-[var(--text-tertiary)] text-xs font-medium">Brand_Chat_Log.png</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Right Panel: Creator Response */}
          <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl flex flex-col overflow-hidden">
             <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                <span className="text-xs uppercase font-bold text-[var(--text-secondary)] tracking-wider">Creator Response</span>
                <h3 className="font-semibold text-lg">{collab.creator}</h3>
             </div>
             <div className="p-5 overflow-y-auto space-y-4">
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                   <div className="text-xs font-medium text-blue-400 mb-1">Defense</div>
                   <div className="text-sm text-[var(--text-primary)]">Brand requested multiple unagreed revisions outside the initial scope, causing delay. Draft video was submitted on time per core guidelines.</div>
                </div>
                <div>
                   <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Evidence Uploaded</div>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-video bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center border border-[var(--border-default)] text-[var(--text-tertiary)] text-xs font-medium">Draft_Video_v1.mp4</div>
                   </div>
                </div>
             </div>
          </div>

          {/* Center Panel: Admin Decision Control */}
          <div className="flex-[1.2] flex flex-col gap-4 min-h-0">
             <div className="bg-[var(--bg-card)] border border-[#9D7CFF]/30 shadow-[0_0_20px_rgba(157,124,255,0.05)] rounded-2xl p-6 flex flex-col h-full overflow-y-auto">
                <h3 className="font-display font-bold text-xl flex items-center gap-2 mb-6"><Scale size={20} className="text-[#9D7CFF]"/> Admin Resolution</h3>
                
                {/* Freeze Escrow Controls */}
                <div className="mb-6 p-4 border border-[var(--border-default)] rounded-xl bg-[var(--bg-elevated)]">
                   <h4 className="font-bold mb-2 text-sm">Escrow Hold Status</h4>
                   {isFrozen ? (
                      <div className="text-xs text-red-500 font-bold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                         Escrow is currently frozen. {collab.escrow_hold_reason || freezeReason}
                      </div>
                   ) : (
                      <div className="flex flex-col gap-2">
                         <input type="text" value={freezeReason} onChange={e => setFreezeReason(e.target.value)} placeholder="Reason for hold..." className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-2 text-xs focus:outline-none focus:border-[#9D7CFF]" />
                         <button onClick={handleFreeze} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 text-xs rounded-lg transition-colors">Freeze Escrow</button>
                      </div>
                   )}
                </div>
                
                <div className="space-y-3 mb-6">
                   <label className={`flex p-4 border rounded-xl cursor-pointer transition-colors ${resolution === 'refund' ? 'bg-red-500/10 border-red-500' : 'border-[var(--border-default)] hover:bg-foreground/5'}`}>
                      <input type="radio" name="resolution" className="hidden" onChange={() => setResolution('refund')} />
                      <div>
                         <div className="font-bold flex items-center gap-2 text-red-500">Full Refund <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded font-mono">₹{collab.escrow?.toLocaleString() || 0} to Brand</span></div>
                         <div className="text-xs text-[var(--text-primary)]/60 mt-1">Collab marked failed. Brand receives 100% back to wallet.</div>
                      </div>
                   </label>
                   
                   <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${resolution === 'partial' ? 'bg-amber-500/10 border-amber-500' : 'border-[var(--border-default)] hover:bg-foreground/5'}`}>
                      <div className="flex items-start">
                         <input type="radio" name="resolution" className="hidden" onChange={() => setResolution('partial')} />
                         <div>
                            <div className="font-bold text-amber-500 mb-1">Split / Partial Payout</div>
                            <div className="text-xs text-[var(--text-primary)]/60">Both parties receive a custom percentage of the escrowed amount.</div>
                         </div>
                      </div>
                      {resolution === 'partial' && (
                         <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center gap-4">
                            <div className="flex-1">
                               <label className="text-[10px] uppercase tracking-wider text-amber-500 font-bold mb-1 block">Brand Refund %</label>
                               <input 
                                  type="number" 
                                  value={brandRefundPct} 
                                  onChange={(e) => {
                                     const val = Number(e.target.value);
                                     setBrandRefundPct(val);
                                     setCreatorPayoutPct(100 - val);
                                  }}
                                  className="w-full bg-[var(--bg-elevated)] border border-amber-500/30 rounded-lg p-2 text-center font-mono text-xs focus:outline-none" 
                               />
                            </div>
                            <div className="flex-1">
                               <label className="text-[10px] uppercase tracking-wider text-green-500 font-bold mb-1 block">Creator Payout %</label>
                               <input 
                                  type="number" 
                                  value={creatorPayoutPct}
                                  onChange={(e) => {
                                     const val = Number(e.target.value);
                                     setCreatorPayoutPct(val);
                                     setBrandRefundPct(100 - val);
                                  }}
                                  className="w-full bg-[var(--bg-elevated)] border border-green-500/30 rounded-lg p-2 text-center font-mono text-xs focus:outline-none" 
                               />
                            </div>
                         </div>
                      )}
                   </label>

                   <label className={`flex p-4 border rounded-xl cursor-pointer transition-colors ${resolution === 'pay' ? 'bg-green-500/10 border-green-500' : 'border-[var(--border-default)] hover:bg-foreground/5'}`}>
                      <input type="radio" name="resolution" className="hidden" onChange={() => setResolution('pay')} />
                      <div>
                         <div className="font-bold flex items-center gap-2 text-green-500">Release Payment <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded font-mono">₹{collab.escrow?.toLocaleString() || 0} to Creator</span></div>
                         <div className="text-xs text-[var(--text-primary)]/60 mt-1">Collab marked complete. Creator receives full payout minus standard platform fees.</div>
                      </div>
                   </label>
                </div>

                <div className="mt-auto">
                   <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">Resolution Rationale (Sent to both)</label>
                   <textarea 
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      placeholder="Explain the platform's official decision..." 
                      className="w-full h-20 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-xs focus:outline-none focus:border-[#9D7CFF] resize-none mb-3 text-[var(--text-primary)]"
                   />
                   <button 
                      onClick={handleResolve}
                      disabled={!resolution || isSubmitting}
                      className="w-full py-3.5 text-black font-bold text-xs bg-gradient-to-r from-[#9D7CFF] to-[var(--violet)] hover:to-[#6A4BE0] rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(157,124,255,0.3)]"
                   >
                      <Ban size={15}/> {isSubmitting ? "Enforcing Resolution..." : "Enforce Resolution & Close Dispute"}
                   </button>
                </div>
             </div>
          </div>
       </div>
     </div>
  );
}
