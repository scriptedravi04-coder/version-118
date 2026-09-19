import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Clock, CheckCircle, Clock3, AlertCircle, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export default function AdminHelpdesk() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('OPEN');
  const [enrichedThread, setEnrichedThread] = useState(null);

  useEffect(() => {
    fetchTickets();

    const ticketsSub = supabase
      .channel('public:support_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, payload => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsSub);
    };
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(`*`)
      .order("created_at", { ascending: false });
    
    if (ticketsError) {
      console.error(ticketsError);
      setTickets([]);
      setLoading(false);
      return;
    }

    if (!ticketsData || ticketsData.length === 0) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(ticketsData.map(t => t.user_id).filter(Boolean))];
    
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("user_id, name, email, role")
        .in("user_id", userIds);
        
      if (!usersError && usersData) {
        usersData.forEach(u => {
          usersMap[u.user_id] = u;
        });
      }
    }

    const ticketsWithUsers = ticketsData.map(ticket => ({
      ...ticket,
      users: usersMap[ticket.user_id] || null
    }));

    setTickets(ticketsWithUsers);
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };


  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.ticket_id);
      
      
      // Try fetching thread info if metadata is missing/incomplete
      const fetchThreadInfo = async () => {
        setEnrichedThread(null);
        const meta = selectedTicket.metadata || {};
        let orderId = selectedTicket.order_id || meta.order_id || (selectedTicket.page_context?.includes('/chat/') ? selectedTicket.page_context.replace('/chat/', '') : null);
        
        let fetchedData = null;
        if (orderId && orderId.startsWith('thread_')) {
          try {
            const { data } = await supabase.from("chat_threads").select("*, brand:brand_id(*), creator:creator_id(*)").eq("id", orderId).maybeSingle();
            fetchedData = data;
          } catch(e) {
            console.error("Error fetching thread for ticket", e);
          }
        } else if (orderId && orderId.startsWith('ORD-')) {
          try {
            const { data } = await supabase.from("deals").select("*, brand:brand_id(*), creator:creator_id(*)").eq("id", orderId).maybeSingle();
            if (data) fetchedData = { deal: data, brand: data.brand, creator: data.creator, brand_id: data.brand_id, creator_id: data.creator_id };
          } catch(e) {}
        }
        
        if (fetchedData) {
           // We also fetch user records for safety (phone, email)
           try {
              const brandId = fetchedData.brand_id || (fetchedData.brand && (fetchedData.brand.id || fetchedData.brand.user_id));
              const creatorId = fetchedData.creator_id || (fetchedData.creator && (fetchedData.creator.id || fetchedData.creator.user_id));
              
              if (brandId || creatorId) {
                 const { data: usersData } = await supabase.from("users").select("user_id, name, email, phone, company").in("user_id", [brandId, creatorId].filter(Boolean));
                 if (usersData) {
                    const brandUser = usersData.find(u => u.user_id === brandId);
                    const creatorUser = usersData.find(u => u.user_id === creatorId);
                    
                    if (brandUser) {
                       fetchedData.brand = { ...fetchedData.brand, ...brandUser };
                    }
                    if (creatorUser) {
                       fetchedData.creator = { ...fetchedData.creator, ...creatorUser };
                    }
                 }
              }
           } catch(e) {}
           setEnrichedThread(fetchedData);
        }
      };
      
      fetchThreadInfo();
      
      const messagesSub = supabase

        .channel(`public:ticket_messages:${selectedTicket.ticket_id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${selectedTicket.ticket_id}` }, payload => {
          fetchMessages(selectedTicket.ticket_id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSub);
      };
    }
  }, [selectedTicket]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setIsSending(true);
    try {
      await api.post(`/support/tickets/${selectedTicket.ticket_id}/reply`, {
        message: reply
      });
      setReply("");
      fetchMessages(selectedTicket.ticket_id);
      toast.success("Reply sent & email delivered to user");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await supabase
        .from("support_tickets")
        .update({ status: newStatus, assigned_admin_id: user.user_id })
        .eq("ticket_id", selectedTicket.ticket_id);
      
      setSelectedTicket({ ...selectedTicket, status: newStatus });
      fetchTickets();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Failed to update status");
    }
  };

  const stats = {
    open: tickets?.filter(t => t.status === "OPEN").length,
    inProgress: tickets?.filter(t => t.status === "IN PROGRESS").length,
    resolved: tickets?.filter(t => t.status === "RESOLVED" && new Date(t.created_at).toDateString() === new Date().toDateString()).length,
  };

  if (selectedTicket) {
    const meta = selectedTicket.metadata || {};
    const orderId = selectedTicket.order_id || meta.order_id || (selectedTicket.page_context?.includes('/chat/') ? selectedTicket.page_context.replace('/chat/', '') : null);
    
    // Resolve fallback details
    let brandInfo = meta.brand || {};
    let creatorInfo = meta.creator || {};
    let campaignTitle = meta.campaign_title || selectedTicket.subject?.replace('Order Dispute: ', '') || 'Order Details';
    let dealAmount = meta.deal_amount;

    if (enrichedThread) {
      if (enrichedThread.brand) {
        brandInfo = {
          name: enrichedThread.brand.name || enrichedThread.brand.brand_name || brandInfo.name,
          email: enrichedThread.brand.email || brandInfo.email,
          phone: enrichedThread.brand.phone || enrichedThread.brand.phone_number || brandInfo.phone
        };
      }
      if (enrichedThread.creator) {
        creatorInfo = {
          name: enrichedThread.creator.name || enrichedThread.creator.full_name || creatorInfo.name,
          email: enrichedThread.creator.email || creatorInfo.email,
          phone: enrichedThread.creator.phone || enrichedThread.creator.phone_number || creatorInfo.phone
        };
      }
      if (enrichedThread.deal) {
         campaignTitle = enrichedThread.deal.campaign_title || campaignTitle;
         dealAmount = enrichedThread.deal.amount || enrichedThread.deal.agreed_amount || dealAmount;
      } else if (enrichedThread.amount_fixed) {
         dealAmount = enrichedThread.amount_fixed;
      }
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-[calc(100vh-180px)] flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center space-x-3">
            <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-gray-900 text-base">{selectedTicket.subject}</h2>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  #{selectedTicket.ticket_id}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                <span>Raised By: <strong>{selectedTicket.users?.name || selectedTicket.users?.email || "User"}</strong> ({selectedTicket.role})</span>
                <span>•</span>
                <span>Category: <strong>{selectedTicket.category}</strong></span>
                <span>•</span>
                <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">Status:</label>
            <select
              value={selectedTicket.status}
              onChange={(e) => updateStatus(e.target.value)}
              className="text-xs font-bold rounded-xl border border-gray-300 p-2 bg-white outline-none focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)] cursor-pointer"
            >
              <option value="OPEN">🟡 Open</option>
              <option value="IN PROGRESS">🔵 In Progress</option>
              <option value="RESOLVED">🟢 Resolved</option>
            </select>
          </div>
        </div>

        {/* Order Dispute & Private Contact Details Panel */}
        {(orderId || dealAmount || brandInfo.email || creatorInfo.email) && (
          <div className="bg-indigo-50/60 border-b border-indigo-100 p-3.5 px-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  🔒 Order Mediation Snapshot (Admin Confidential)
                </span>
              </div>
              {orderId && (
                <a
                  href={`/chat/${selectedTicket.thread_id || orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                >
                  Open Deal Chat ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Order Info */}
              <div className="bg-white p-3 rounded-xl border border-indigo-100/80 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-gray-400">Order / Escrow Info</span>
                <p className="font-bold text-gray-900 mt-0.5 truncate">{campaignTitle}</p>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="font-mono text-gray-500">ID: #{String(orderId).substring(0, 12)}</span>
                  {dealAmount ? (
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ₹{Number(dealAmount).toLocaleString('en-IN')} Escrow
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Brand Contact Box */}
              <div className="bg-white p-3 rounded-xl border border-indigo-100/80 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-indigo-500">Brand Contact (Private)</span>
                <p className="font-bold text-gray-900 mt-0.5 truncate">{brandInfo.name || "Brand User"}</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                  <p className="truncate">📧 {brandInfo.email || selectedTicket.users?.email || "No email"}</p>
                  <p className="truncate">📞 {brandInfo.phone || "No phone provided"}</p>
                </div>
              </div>

              {/* Creator Contact Box */}
              <div className="bg-white p-3 rounded-xl border border-indigo-100/80 shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-purple-500">Creator Contact (Private)</span>
                <p className="font-bold text-gray-900 mt-0.5 truncate">{creatorInfo.name || "Creator User"}</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                  <p className="truncate">📧 {creatorInfo.email || "No email provided"}</p>
                  <p className="truncate">📞 {creatorInfo.phone || "No phone provided"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages?.map((msg, msgIdx) => {
            const isAdmin = msg.sender_type === "admin";
            const isAi = msg.sender_type === "ai";
            return (
              <div key={msg.message_id || msg.id || `msg-${msgIdx}`} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div className={`p-4 rounded-2xl max-w-[85%] shadow-sm ${isAdmin ? "bg-slate-900 text-white rounded-tr-none" : isAi ? "bg-purple-50 text-gray-800 border border-purple-100 rounded-tl-none" : "bg-white border border-gray-200 text-gray-900 rounded-tl-none"}`}>
                  <div className="flex justify-between items-center mb-1 gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? "text-indigo-300" : "text-gray-400"}`}>
                      {isAdmin ? "Admin Resolution Officer" : isAi ? "AI Escalation" : "User / Creator / Brand"}
                    </span>
                    <span className={`text-[10px] font-mono ${isAdmin ? "text-slate-400" : "text-gray-400"}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed font-sans">{msg.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <form onSubmit={handleReply} className="p-4 bg-white border-t border-gray-200 flex items-end space-x-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type official admin resolution message to user (email notification will also be dispatched)..."
            className="flex-1 max-h-32 min-h-[44px] rounded-xl border border-gray-300 p-3 outline-none resize-none text-xs focus:border-[var(--violet)] focus:ring-1 focus:ring-[var(--violet)]"
            rows="2"
          />
          <button
            type="submit"
            disabled={!reply.trim() || isSending}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>Send Reply</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Support Helpdesk</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage user support tickets and inquiries.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><AlertCircle className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Open Tickets</p><p className="text-2xl font-bold">{stats.open}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Clock3 className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold">{stats.inProgress}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Resolved Today</p><p className="text-2xl font-bold">{stats.resolved}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Clock className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500">Avg Response</p><p className="text-2xl font-bold">~15m</p></div>
        </div>
      </div>

      {/* Kanban Board Tabs */}
      <div className="flex flex-col space-y-6">
        <div className="flex bg-[var(--bg-card)] border border-[var(--border-default)] p-1 rounded-2xl w-fit shadow-sm">
          {['OPEN', 'IN PROGRESS', 'RESOLVED'].map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === status
                  ? "bg-[var(--violet)] text-white shadow-md"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              {status}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === status ? "bg-white/20 text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              }`}>
                {tickets?.filter(t => t.status === status).length}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {tickets?.filter(t => t.status === activeTab).map(ticket => (
              <div 
                key={ticket.ticket_id} 
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-[var(--violet)] cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ticket.role}
                  </span>
                  {ticket.priority === 'HIGH' && (
                    <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">High</span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate flex items-center gap-1.5">
                  {ticket.subject}
                  {(ticket.status === 'OPEN' || ticket.status === 'IN PROGRESS') && (
                    <span className="relative flex h-2 w-2 shrink-0" title="Active Support Request">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-500 truncate mb-3">{ticket.users?.name}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{ticket.category}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {tickets?.filter(t => t.status === activeTab).length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                No tickets found for this status.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
