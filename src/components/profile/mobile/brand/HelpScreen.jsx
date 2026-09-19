import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CreditCard, FileText, Shield, HelpCircle, ChevronRight, MessageSquare, Ticket } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { api } from "../../../../lib/api";
import TicketForm from "../../../help/TicketForm";
import { MobileScreen, Section, Card, Pill } from "./brandMobileUi";

// Screen 1k — help centre. FAQs come from the same Supabase faq_articles table
// HelpCenter.jsx reads (filtered to brand + shared articles), and the ticket count
// comes from GET support/my-tickets. Categories route into the existing
// /help/category pages.

const CATEGORIES = [
  { id: "payments", name: "Payments & escrow", icon: CreditCard },
  { id: "campaigns", name: "Briefs & orders", icon: FileText },
  { id: "kyc", name: "Profile & KYC", icon: HelpCircle },
  { id: "trust_safety", name: "Trust & safety", icon: Shield },
];

export default function HelpScreen({ onBack }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [ticketCount, setTicketCount] = useState(null);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from("faq_articles")
          .select("*")
          .eq("is_active", true)
          .in("target_role", ["brand", "both"])
          .order("view_count", { ascending: false })
          .limit(5);
        if (!cancelled && data) setFaqs(data);
      } catch (e) {
        console.warn("Failed to load FAQs:", e);
      }
    })();

    (async () => {
      try {
        const { data } = await api.get("support/my-tickets").catch(() => ({ data: null }));
        if (!cancelled && Array.isArray(data)) setTicketCount(data.length);
      } catch (e) {
        console.warn("Failed to load tickets:", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const runSearch = () => {
    if (query.trim()) navigate(`/help/category/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <MobileScreen title="Help centre" onBack={onBack}>
      <Section>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search for articles"
            className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/help/category/${c.id}`)}
              className="rounded-2xl border border-gray-200 p-4 text-left hover:bg-gray-50"
            >
              <c.icon size={18} className="text-violet-600" />
              <div className="text-sm font-semibold text-gray-900 mt-2.5 leading-snug">{c.name}</div>
            </button>
          ))}
        </div>
      </Section>

      {faqs.length > 0 && (
        <Section title="Most asked" className="pt-0">
          <Card>
            {faqs.map((f, idx) => (
              <button
                key={f.id || idx}
                onClick={() => navigate(`/help/category/${f.category || "payments"}?article=${f.id}`)}
                className={`w-full px-4 py-3.5 flex items-center gap-2 text-left hover:bg-gray-50 ${
                  idx !== faqs.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <span className="flex-1 text-sm text-gray-900">{f.title || f.question}</span>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Still need help?" hint="Support replies within a few hours." className="pt-0 pb-8">
        <button
          onClick={() => setTicketFormOpen(true)}
          className="w-full h-12 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <MessageSquare size={15} /> Chat with support
        </button>
        <button
          onClick={() => navigate("/help/tickets")}
          className="w-full h-12 mt-2 rounded-xl border border-gray-200 text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50"
        >
          <Ticket size={15} /> My tickets
          {ticketCount !== null && ticketCount > 0 && <Pill tone="violet">{ticketCount}</Pill>}
        </button>
      </Section>

      {ticketFormOpen && <TicketForm onClose={() => setTicketFormOpen(false)} />}
    </MobileScreen>
  );
}
