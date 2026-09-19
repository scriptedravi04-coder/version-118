import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import TicketForm from "../../components/help/TicketForm";
import { Search, ChevronLeft, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";

export default function HelpCategory() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const query = searchParams.get("q");
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState([]);
  const [expandedId, setExpandedId] = useState(location.state?.expandedId || null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query || "");

  const categoryNames = {
    payments: "Payments & Earnings",
    campaigns: "Campaigns & Deals",
    kyc: "Profile & KYC",
    trust_safety: "Trust & Safety",
    search: "Search Results"
  };

  const currentCategoryName = categoryNames[category] || categoryNames.search;

  useEffect(() => {
    fetchArticles();
  }, [category, query, user?.role]);

  const fetchArticles = async () => {
    const role = user?.role || "creator";
    let q = supabase
      .from("faq_articles")
      .select("*")
      .eq("is_active", true);
      
    // Always filter by role unless it's a global search where we might want both
    q = q.in("target_role", [role, "both"]);
      
    if (category === "search" && query) {
      q = q.ilike("title", `%${query}%`);
    } else {
      q = q.eq("category", category);
    }
    
    const { data } = await q.order("view_count", { ascending: false });
    setArticles(data || []);
  };

  const handleHelpful = async (id, currentCount) => {
    // Optimistic update
    setArticles(prev => prev?.map(a => a.id === id ? { ...a, voted: true } : a));
    
    await supabase
      .from("faq_articles")
      .update({ view_count: currentCount + 1 })
      .eq("id", id);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery) {
      navigate(`/help/category/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="w-full max-w-none px-4 md:px-8 py-10">
      <Link to="/help" className="inline-flex items-center text-gray-500 hover:text-[#7C3AED] mb-8 font-medium transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Help Center
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold">{currentCategoryName}</h1>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </form>
      </div>

      <div className="space-y-4">
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-500">No articles found in this category.</p>
          </div>
        ) : (
          articles?.map((article, articleIdx) => {
            const isExpanded = expandedId === article.id;
            return (
              <div key={article.id || articleIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{article.title}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                    <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-6 text-sm leading-relaxed">
                      {article.content}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 font-medium">Was this helpful?</span>
                        {!article.voted ? (
                          <>
                            <button
                              onClick={() => handleHelpful(article.id, article.view_count || 0)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHelpful(article.id, article.view_count || 0)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">Thanks for your feedback!</span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setIsTicketFormOpen(true)}
                        className="text-sm text-[#7C3AED] hover:text-purple-700 font-medium"
                      >
                        This didn't help (Raise a Ticket)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isTicketFormOpen && (
        <TicketForm 
          onClose={() => setIsTicketFormOpen(false)} 
          initialCategory={category !== 'search' ? categoryNames[category] : ''} 
        />
      )}
    </div>
  );
}
