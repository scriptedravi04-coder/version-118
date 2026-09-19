import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import TicketForm from "../../components/help/TicketForm";
import { Search, HelpCircle, FileText, Shield, CreditCard, ChevronRight } from "lucide-react";

export default function HelpCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(user?.role || "creator");
  const [searchQuery, setSearchQuery] = useState("");
  const [topFaqs, setTopFaqs] = useState([]);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [isSuspensionExpanded, setIsSuspensionExpanded] = useState(false);

  useEffect(() => {
    fetchTopFaqs();
  }, [activeTab]);

  const fetchTopFaqs = async () => {
    const { data } = await supabase
      .from("faq_articles")
      .select("*")
      .eq("is_active", true)
      .in("target_role", [activeTab, "both"])
      .order("view_count", { ascending: false })
      .limit(3);
    setTopFaqs(data || []);
  };

  const categories = [
    { id: "payments", name: "Payments & Earnings", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-100" },
    { id: "campaigns", name: "Campaigns & Deals", icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
    { id: "kyc", name: "Profile & KYC", icon: HelpCircle, color: "text-green-600", bg: "bg-green-100" },
    { id: "trust_safety", name: "Trust & Safety", icon: Shield, color: "text-red-600", bg: "bg-red-100" },
  ];

  return (
    <div className="w-full max-w-none px-4 md:px-8 py-10">
      {/* Header & Search */}
      <div className="text-center mb-12 mt-4">
        <h1 className="text-3xl font-bold mb-4">How can we help you?</h1>
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Search for articles..."
            className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery) {
                navigate(`/help/category/search?q=${encodeURIComponent(searchQuery)}`);
              }
            }}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-full inline-flex relative">
          <button
            type="button"
            onClick={() => setActiveTab("creator")}
            className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer z-10 ${
              activeTab === "creator" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {activeTab === "creator" && (
              <motion.div
                layoutId="helpCenterRoleTabPill"
                className="absolute inset-0 bg-white rounded-full shadow-sm z-0"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">For Creators</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("brand")}
            className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer z-10 ${
              activeTab === "brand" ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {activeTab === "brand" && (
              <motion.div
                layoutId="helpCenterRoleTabPill"
                className="absolute inset-0 bg-white rounded-full shadow-sm z-0"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">For Brands</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {categories?.map((cat, catIdx) => (
          <Link
            key={cat.id || catIdx}
            to={`/help/category/${cat.id}`}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${cat.bg} ${cat.color}`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900">{cat.name}</h3>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7C3AED] transition-colors" />
          </Link>
        ))}
      </div>

      {/* Top FAQs */}
      {topFaqs.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-4">Most Asked Questions</h2>
          <div className="space-y-3">
            {topFaqs?.map((faq, faqIdx) => (
              <Link
                key={faq.id || faqIdx}
                to={`/help/category/${faq.category}`}
                state={{ expandedId: faq.id }}
                className="block bg-white p-4 rounded-lg border border-gray-100 hover:border-[#7C3AED] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{faq.title}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#7C3AED]" />
                </div>
              </Link>
            ))}
            {/* Hardcoded Article for Account Suspensions */}
            <button
              onClick={() => setIsSuspensionExpanded(!isSuspensionExpanded)}
              className="w-full text-left bg-white p-4 rounded-lg border border-gray-100 hover:border-[#7C3AED] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">How to avoid account suspension or deletion ⚠️</span>
                <ChevronRight className={`w-4 h-4 text-gray-400 group-hover:text-[#7C3AED] transition-transform ${isSuspensionExpanded ? 'rotate-90' : ''}`} />
              </div>
              {isSuspensionExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    To ensure a safe and trustworthy environment, accounts that violate our Community Guidelines may face suspension or permanent deletion. 
                    During a suspension, your profile, active campaigns, and messaging will be temporarily disabled and hidden from other users.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">For Brands</h4>
                      <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                        <li><strong>Why it happens:</strong> Posting scam campaigns, non-payment of completed deliverables, abusive behavior toward creators, or violating platform terms.</li>
                        <li><strong>How to avoid:</strong> Ensure all campaign briefs are clear, communicate professionally, and clear all invoices within the agreed timeframe.</li>
                        <li><strong>What to do:</strong> Reach out via Support Ticket to clarify the dispute or complete pending verifications.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2 text-sm">For Creators</h4>
                      <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                        <li><strong>Why it happens:</strong> Providing fraudulent analytics, failing to deliver agreed content, plagiarizing UGC, or using inappropriate language in chat.</li>
                        <li><strong>How to avoid:</strong> Always deliver original, high-quality content on time. Be transparent about delays and adhere to brief guidelines.</li>
                        <li><strong>What to do:</strong> You can appeal the decision by submitting a detailed request through the "Contact Support" button on the suspension page.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Account Suspensions Information */}
      

      {/* Still need help */}
      <div className="bg-[#F2F2F7] rounded-2xl p-8 text-center border border-gray-100">
        <h2 className="text-xl font-bold mb-2">Still need help?</h2>
        <p className="text-gray-600 mb-6">Our support team is here to assist you.</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setIsTicketFormOpen(true)}
            className="bg-[#7C3AED] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Chat with Support
          </button>
          <Link
            to="/help/tickets"
            className="bg-white text-gray-700 border border-gray-200 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            View My Tickets
          </Link>
        </div>
      </div>

      {isTicketFormOpen && (
        <TicketForm onClose={() => setIsTicketFormOpen(false)} />
      )}
    </div>
  );
}
