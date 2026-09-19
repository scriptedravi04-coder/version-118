import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Mail,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Tag
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function BlogIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("search") || "";

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Auto-carousel state for top big featured hero
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Founders corner carousel/pagination index
  const [foundersPage, setFoundersPage] = useState(0);

  // Set document title
  useEffect(() => {
    document.title = "YBEX Journal — Creator Economy & Influencer Marketing";
  }, []);

  // Fetch categories
  useEffect(() => {
    api
      .get("/blog/categories")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch((err) => console.warn("[BlogIndex categories]", err));
  }, []);

  // Fetch Posts
  useEffect(() => {
    setLoading(true);
    const params = {
      page,
      limit: 15
    };
    if (activeCategory !== "all") params.category = activeCategory;
    if (searchQuery) params.search = searchQuery;

    api
      .get("/blog/posts", { params })
      .then((res) => {
        if (res.data?.posts) {
          setPosts(res.data.posts);
          setTotalPages(res.data.totalPages || 1);
        }
      })
      .catch((err) => {
        console.error("[BlogIndex posts error]", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeCategory, searchQuery, page]);

  // Featured hero posts (featured ones or top 5)
  const featuredPosts = React.useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const feat = posts.filter((p) => p.is_featured);
    return feat.length > 0 ? feat : posts.slice(0, 5);
  }, [posts]);

  // Auto-slide effect for big hero post (5 seconds per slide)
  useEffect(() => {
    if (featuredPosts.length <= 1 || isHeroHovered) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredPosts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredPosts.length, isHeroHovered]);

  // Latest posts for the right side column (top 4-5 latest)
  const latestPosts = React.useMemo(() => {
    return posts.slice(0, 5);
  }, [posts]);

  // Founders corner / Curated insights (posts for bottom horizontal grid)
  const foundersPosts = React.useMemo(() => {
    const pool = posts.length > 3 ? posts.slice(2) : posts;
    return pool;
  }, [posts]);

  const handleCategoryClick = (catName) => {
    setPage(1);
    if (catName === "all" || catName === "All") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", catName);
    }
    setSearchParams(searchParams);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const val = form.elements.search.value.trim();
    setPage(1);
    if (val) {
      searchParams.set("search", val);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Aug 10";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const calculateReadTime = (content) => {
    if (!content) return "3 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    toast.success("Subscribed! You'll receive weekly creator insights.");
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen bg-white text-[var(--text-primary)] w-full">
      {/* Editorial Header Section */}
      <div className="pt-3 sm:pt-4 pb-4 px-4 sm:px-6 lg:px-8 border-b border-[#F0F0F0] bg-white">
        <div className="max-w-none space-y-3.5">
          {/* Top Title & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A0A0A] tracking-tight">
                Our Latest Blog Posts
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-xl">
                Tactics, verified creator benchmarks, and strategic playbooks for modern brands and creators.
              </p>
            </div>

            {/* Quick Search */}
            <form onSubmit={handleSearch} className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                name="search"
                type="text"
                defaultValue={searchQuery}
                placeholder="Search articles, topics..."
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-[#E5E5E2] bg-[#F9F9FB] text-xs text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 transition-all"
              />
            </form>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
            <button
              onClick={() => handleCategoryClick("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === "all"
                  ? "bg-[#7C3AED] text-white shadow-xs"
                  : "bg-[#F9F9FB] border border-[#E5E5E2] text-[#0A0A0A] hover:bg-[#F2F2F7]"
              }`}
            >
              All Topics
            </button>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#7C3AED] text-white shadow-xs"
                      : "bg-[#F9F9FB] border border-[#E5E5E2] text-[#0A0A0A] hover:bg-[#F2F2F7]"
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.post_count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? "bg-white/20 text-white" : "bg-black/5 text-[#6B7280]"
                      }`}
                    >
                      {cat.post_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-none px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-9 h-9 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#6B7280]">Loading articles...</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-[#F9F9FB] rounded-3xl border border-[#E5E5E2] space-y-3">
            <BookOpen size={32} className="mx-auto text-[#9CA3AF]" />
            <h3 className="text-base font-bold text-[#0A0A0A]">No articles found</h3>
            <p className="text-xs text-[#6B7280]">Try clearing your search query or selecting another topic.</p>
            <button
              onClick={() => handleCategoryClick("all")}
              className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] transition-colors"
            >
              View All Articles
            </button>
          </div>
        ) : (
          <>
            {/* SECTION 1: TOP HERO SECTION (Auto-scrolling Large Post on Left + "Latest post" on Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* LEFT: BIG FEATURED POST (Auto-scrolling Carousel Banner) */}
              <div
                className="lg:col-span-8 relative min-h-[360px] sm:min-h-[400px] rounded-3xl overflow-hidden shadow-xs border border-[#DDD6FE] bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] flex flex-col justify-end group"
                onMouseEnter={() => setIsHeroHovered(true)}
                onMouseLeave={() => setIsHeroHovered(false)}
              >
                {featuredPosts.length > 0 && (
                  <>
                    {/* Active Slide */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={featuredPosts[currentHeroIndex]?.id || currentHeroIndex}
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-0"
                      >
                        {/* Background Image */}
                        <img
                          src={
                            featuredPosts[currentHeroIndex]?.cover_image_url ||
                            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80"
                          }
                          alt={featuredPosts[currentHeroIndex]?.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover brightness-95 group-hover:scale-103 transition-transform duration-700 ease-out"
                        />
                        {/* Gradient Overlay for optimal readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#1E1B4B]/40 to-transparent" />
                      </motion.div>
                    </AnimatePresence>

                    {/* Content Overlay */}
                    <div className="relative z-10 p-6 sm:p-7 space-y-2.5 text-white">
                      {/* Main Title */}
                      <Link to={`/blog/${featuredPosts[currentHeroIndex]?.slug}`}>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white hover:text-[#DDD6FE] transition-colors leading-tight line-clamp-2">
                          {featuredPosts[currentHeroIndex]?.title}
                        </h2>
                      </Link>

                      {/* Date and Read Time */}
                      <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
                        <span>{formatDate(featuredPosts[currentHeroIndex]?.published_at)}</span>
                        <span>•</span>
                        <span>{calculateReadTime(featuredPosts[currentHeroIndex]?.content)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT: "LATEST POST" COMPACT STACK */}
              <div className="lg:col-span-4 rounded-3xl bg-white border border-[#E5E5E2] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A0A0A] tracking-tight pb-2.5 mb-1 border-b border-[#F0F0F0] flex items-center justify-between">
                    <span>Latest Posts</span>
                    <span className="text-[10px] font-bold text-[#7C3AED] bg-[#F5F0FF] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                      Fresh Releases
                    </span>
                  </h3>

                  <div className="divide-y divide-[#F5F5F7]">
                    {latestPosts.map((post) => (
                      <Link
                        key={post.id}
                        to={`/blog/${post.slug}`}
                        className="group flex items-start gap-3 py-2.5 first:pt-1 last:pb-1 transition-all"
                      >
                        {/* Square Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F9F9FB] border border-[#E5E5E2] overflow-hidden flex-shrink-0 relative">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#F5F0FF] text-[#7C3AED]">
                              <BookOpen size={16} className="opacity-40" />
                            </div>
                          )}
                        </div>

                        {/* Text Information */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h4 className="text-xs font-bold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h4>
                          <div className="text-[10px] text-[#8E8E93] flex items-center gap-1 font-medium">
                            <span>{formatDate(post.published_at)}</span>
                            <span>•</span>
                            <span className="text-[#7C3AED] font-semibold">{post.category || "General"}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#F0F0F0]">
                  <Link
                    to="/blog"
                    onClick={() => {
                      searchParams.delete("category");
                      searchParams.delete("search");
                      setSearchParams(searchParams);
                    }}
                    className="w-full py-2 rounded-xl bg-[#F5F0FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#DDD6FE]"
                  >
                    View All Archives <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

            </div>

            {/* SECTION 2: FOUNDERS CORNER */}
            <div className="space-y-4 pt-2">
              {/* Section Header with Left/Right Arrows */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] tracking-tight">
                    Founders corner
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Curated playbooks and strategic essays for scaling creator partnerships.
                  </p>
                </div>

                {/* Left/Right Pagination Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFoundersPage((prev) => Math.max(0, prev - 1))}
                    disabled={foundersPage === 0}
                    aria-label="Previous articles"
                    className="w-8 h-8 rounded-full border border-[#E5E5E2] bg-white hover:bg-[#F5F0FF] hover:text-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[#0A0A0A] transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() =>
                      setFoundersPage((prev) =>
                        prev + 3 < foundersPosts.length ? prev + 1 : prev
                      )
                    }
                    disabled={foundersPage + 3 >= foundersPosts.length}
                    aria-label="Next articles"
                    className="w-8 h-8 rounded-full border border-[#E5E5E2] bg-white hover:bg-[#F5F0FF] hover:text-[#7C3AED] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[#0A0A0A] transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 3-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {foundersPosts
                  .slice(foundersPage * 3, foundersPage * 3 + 3)
                  .map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group flex flex-col justify-between bg-white rounded-2xl border border-[#E5E5E2] overflow-hidden hover:border-[#DDD6FE] hover:shadow-xs transition-all duration-300 p-4 space-y-3"
                    >
                      {/* Image Frame */}
                      <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#F9F9FB] border border-[#F0F0F0] relative">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#F5F0FF] text-[#7C3AED]">
                            <BookOpen size={24} className="opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          {/* Category with Color Dot */}
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                            <span>{post.category || "Strategy"}</span>
                          </div>

                          {/* Post Title */}
                          <h4 className="text-sm sm:text-base font-bold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h4>

                          {/* Excerpt */}
                          {post.excerpt && (
                            <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2">
                              {post.excerpt}
                            </p>
                          )}
                        </div>

                        {/* Date & Read Time */}
                        <div className="pt-2 border-t border-[#F5F5F7] text-[11px] text-[#8E8E93] flex items-center gap-1.5 font-medium">
                          <span>{formatDate(post.published_at)}</span>
                          <span>•</span>
                          <span>{calculateReadTime(post.content)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

            {/* SECTION 3: ALL ARTICLES CATALOGUE */}
            <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-[#0A0A0A] tracking-tight">
                    Explore All Articles
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Browse our full library of playbooks, guides, and creator insights.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl border border-[#E5E5E2] p-4 flex flex-col justify-between hover:border-[#DDD6FE] hover:shadow-xs transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#F9F9FB] border border-[#F0F0F0]">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#F5F0FF] text-[#7C3AED]">
                            <BookOpen size={24} className="opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C3AED]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                          <span>{post.category || "General"}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h4>
                        {post.excerpt && (
                          <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-[#F5F5F7] text-[10px] text-[#8E8E93] flex items-center justify-between font-medium">
                      <span>{formatDate(post.published_at)}</span>
                      <span>{calculateReadTime(post.content)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* SECTION 4: PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-full border border-[#E5E5E2] bg-white hover:bg-[#F5F0FF] hover:text-[#7C3AED] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold text-[#0A0A0A] cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      pageNum === page
                        ? "bg-[#7C3AED] text-white shadow-xs"
                        : "bg-white border border-transparent hover:border-[#DDD6FE] text-[#0A0A0A]"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 rounded-full border border-[#E5E5E2] bg-white hover:bg-[#F5F0FF] hover:text-[#7C3AED] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold text-[#0A0A0A] cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* SECTION 5: YBEX BRAND NEWSLETTER SUBSCRIPTION BANNER */}
            <div className="rounded-3xl bg-gradient-to-br from-[#F5F0FF] via-white to-[#F5F0FF] border border-[#DDD6FE] text-[#0A0A0A] p-7 sm:p-9 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="space-y-2 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-xs font-bold border border-[#DDD6FE]">
                  <Mail size={12} /> YBEX Weekly Digest
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0A0A0A]">
                  Get high-ROI creator strategies delivered to your inbox
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Join 10,000+ marketing leaders, founders, and creators receiving our weekly teardowns of viral campaigns, payout benchmarks, and creator economy trends.
                </p>
              </div>

              <form onSubmit={handleNewsletterSubmit} className="w-full md:w-auto flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your work email..."
                  required
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#DDD6FE] text-xs text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30 min-w-[240px] shadow-xs"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <span>Subscribe Free</span> <ArrowRight size={13} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
