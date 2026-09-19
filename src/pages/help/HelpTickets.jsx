import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import TicketThread from "../../components/help/TicketThread";
import TicketForm from "../../components/help/TicketForm";
import { ChevronLeft, Plus, MessageSquare, Clock, AlertCircle, ShieldAlert, ShoppingBag } from "lucide-react";

export default function HelpTickets() {
  const { user } = useAuth();
  const { ticketId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.ticket_id === ticketId);
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [ticketId, tickets]);

  useEffect(() => {
    fetchTickets();
    
    if (user?.user_id) {
      const ticketsSub = supabase
        .channel(`public:support_tickets:${user.user_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.user_id}` }, payload => {
          fetchTickets();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ticketsSub);
      };
    }
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // First try API
      const res = await api.get("/support/my-tickets");
      if (res.data?.tickets) {
        setTickets(res.data.tickets);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("API my-tickets fallback to Supabase:", e);
    }

    try {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user?.user_id)
        .order("created_at", { ascending: false });
      
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN": return "bg-amber-100 text-amber-900 border border-amber-200";
      case "IN PROGRESS": return "bg-blue-100 text-blue-900 border border-blue-200";
      case "RESOLVED": return "bg-emerald-100 text-emerald-900 border border-emerald-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "HIGH": return <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />;
      case "URGENT": return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-none px-4 md:px-8 py-10 h-full">
      <Link to="/help" className="inline-flex items-center text-gray-500 hover:text-[#7C3AED] mb-8 font-medium transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Help Center
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Support Tickets</h1>
        <button
          onClick={() => setIsTicketFormOpen(true)}
          className="bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 space-y-3 ${selectedTicket ? 'hidden lg:block' : 'block'}`}>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">You don't have any support tickets.</p>
            </div>
          ) : (
            tickets?.map((ticket, ticketIdx) => {
              const meta = ticket.metadata || {};
              const orderId = ticket.order_id || meta.order_id;
              return (
                <button
                  key={ticket.ticket_id || ticketIdx}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedTicket?.ticket_id === ticket.ticket_id
                      ? "bg-purple-50/80 border-[#7C3AED] shadow-sm"
                      : "bg-white border-gray-200 hover:border-[#7C3AED]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(ticket.priority)}
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{String(ticket.ticket_id).substring(0, 10)}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{ticket.subject}</h3>
                  
                  {orderId && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md mb-2 w-fit">
                      <ShoppingBag size={12} className="shrink-0 text-indigo-600" />
                      <span className="truncate max-w-[200px]">Order: #{String(orderId).substring(0, 12)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate max-w-[120px] font-medium">{ticket.category}</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-gray-400" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={`lg:col-span-2 ${!selectedTicket ? 'hidden lg:flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 min-h-[400px]' : 'block'}`}>
          {selectedTicket ? (
            <TicketThread ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
          ) : (
            <div className="text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a ticket to view the conversation</p>
            </div>
          )}
        </div>
      </div>

      {isTicketFormOpen && (
        <TicketForm 
          onClose={() => {
            setIsTicketFormOpen(false);
            fetchTickets();
          }} 
        />
      )}
    </div>
  );
}
