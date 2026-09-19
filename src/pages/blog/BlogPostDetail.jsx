import React, { useState, useEffect, useMemo } from "react";
import { safeLower } from "../../utils/safeFormat";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  BookOpen,
  Clock,
  ListOrdered,
  ArrowRight,
  User,
  ChevronRight
} from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function BlogPostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setLoading(true);

    api
      .get(`/blog/posts/${slug}`)
      .then((res) => {
        if (res.data?.post) {
          setPost(res.data.post);
          setRelatedPosts(res.data.relatedPosts || []);

          // Set document title & SEO meta
          document.title = `${res.data.post.meta_title || res.data.post.title} — YBEX`;
        }
      })
      .catch((err) => {
        console.error("[BlogPostDetail]", err);
        toast.error("Failed to load article");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Extract table of contents from HTML content
  const tableOfContents = useMemo(() => {
    if (!post?.content) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(post.content, "text/html");
      const headings = doc.querySelectorAll("h2, h3");
      const items = [];
      headings.forEach((h, idx) => {
        const text = h.textContent || "";
        const id =
          text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `heading-${idx}`;
        items.push({
          id,
          text,
          level: safeLower(h.tagName) === "h2" ? 2 : 3
        });
      });
      return items;
    } catch {
      return [];
    }
  }, [post?.content]);

  // Inject IDs into headings for smooth anchor scroll
  const processedContent = useMemo(() => {
    if (!post?.content) return "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(post.content, "text/html");
      const headings = doc.querySelectorAll("h2, h3");
      headings.forEach((h, idx) => {
        const text = h.textContent || "";
        const id =
          text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `heading-${idx}`;
        h.setAttribute("id", id);
      });
      return doc.body.innerHTML;
    } catch {
      return post.content;
    }
  }, [post?.content]);

  // Estimated read time
  const readTime = useMemo(() => {
    if (!post) return "3 min read";
    const text = (post.content || post.excerpt || "") + "";
    const words = text.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  }, [post]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "June 24, 2026";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-28">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B7280]">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 py-28">
        <div className="max-w-md w-full bg-white border border-[#E5E5E2] rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F0FF] text-[#7C3AED] border border-[#DDD6FE] flex items-center justify-center mx-auto">
            <BookOpen size={24} />
          </div>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Article Not Found</h2>
          <p className="text-xs text-[#6B7280]">
            The requested article could not be located or may have been updated.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Return to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[var(--text-primary)] w-full">
      {/* Main Article Container */}
      <div className="max-w-none 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-16">
        
        {/* Navigation Breadcrumbs & Back Link */}
        <div className="flex items-center justify-between gap-4 pb-3 mb-5 border-b border-[#F0F0F0]">
          <nav className="flex items-center gap-2 text-xs text-[#6B7280]">
            <Link to="/" className="hover:text-[#0A0A0A] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-[#0A0A0A] transition-colors">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-[#0A0A0A] font-semibold truncate max-w-[200px] sm:max-w-md">{post.title}</span>
          </nav>

          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] transition-colors group cursor-pointer shrink-0 px-3 py-1.5 rounded-xl bg-[#F5F0FF] hover:bg-[#EDE9FE]"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>All Blogs</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT MAIN COLUMN: ARTICLE BODY */}
          <article className="lg:col-span-8 space-y-5">

            {/* Main Headline H1 moved to the top to fill empty space */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-extrabold text-[#0A0A0A] tracking-tight leading-[1.2]">
              {post.title}
            </h1>

            {/* Category & Metadata positioned below headline - Colorful, noticeable, no circle or glow */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
              <Link
                to={`/blog?category=${encodeURIComponent(post.category || "General")}`}
                className="text-xs sm:text-[13px] font-extrabold text-[#7C3AED] hover:text-[#6D28D9] transition-colors uppercase tracking-wide"
              >
                {post.category || "Creator Economy"}
              </Link>
              <span className="text-[#D1D5DB] font-bold">•</span>
              <span className="text-xs sm:text-[13px] text-[#6B7280] font-medium">{formatDate(post.published_at)}</span>
              <span className="text-[#D1D5DB] font-bold">•</span>
              <span className="flex items-center gap-1 text-xs sm:text-[13px] text-[#6B7280] font-medium">
                <Clock size={13} className="text-[#7C3AED]" /> {readTime}
              </span>
            </div>

            {/* Author Byline */}
            <div className="flex items-center gap-3 py-3 border-y border-[#F0F0F0]">
              <div>
                <div className="text-xs font-bold text-[#0A0A0A]">
                  {(() => {
                    const authorNameTag = post.tags?.find(t => t.startsWith('__author_name:'));
                    return authorNameTag ? authorNameTag.substring(14) : 'YBEX Editorial Team';
                  })()}
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  {(() => {
                    const authorRoleTag = post.tags?.find(t => t.startsWith('__author_role:'));
                    return authorRoleTag ? authorRoleTag.substring(14) : 'Insights for verified creators & brand builders';
                  })()}
                </div>
              </div>
            </div>

            {/* Lead Excerpt Summary */}
            {post.excerpt && (
              <p className="text-base text-[#4B5563] leading-relaxed font-normal">
                {post.excerpt}
              </p>
            )}

            {/* Hero Cover Image */}
            {post.cover_image_url && (
              <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-[#F9F9FB] border border-[#E5E5E2] shadow-xs">
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Rendered HTML Content */}
            <div className="pt-2">
              <div
                className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-[#0A0A0A] prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-lg prose-h3:mt-6 prose-p:text-[#374151] prose-p:leading-relaxed prose-p:text-sm md:prose-p-base prose-a:text-[#7C3AED] prose-a:font-bold prose-a:no-underline hover:prose-a:underline prose-li:text-sm md:prose-li-base prose-li:text-[#374151] prose-blockquote:border-l-4 prose-blockquote:border-[#7C3AED] prose-blockquote:bg-[#F5F0FF] prose-blockquote:py-3.5 prose-blockquote:px-5 prose-blockquote:rounded-r-2xl prose-blockquote:text-sm prose-blockquote:text-[#4B5563] prose-blockquote:not-italic prose-strong:text-[#0A0A0A] prose-code:font-mono prose-code:bg-[#F2F2F7] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:text-[#7C3AED] prose-img:rounded-2xl prose-img:border prose-img:border-[#E5E5E2] prose-img:shadow-xs"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>

            {/* Tags section */}
            {post.tags && post.tags.filter(t => !t.startsWith('__')).length > 0 && (
              <div className="pt-6 border-t border-[#F0F0F0] flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#6B7280] mr-1">Tags:</span>
                {post.tags.filter(t => !t.startsWith('__')).map((t) => (
                  <Link
                    key={t}
                    to={`/blog?search=${encodeURIComponent(t)}`}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#F5F0FF] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-colors border border-[#DDD6FE]"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

          </article>

          {/* RIGHT SIDEBAR: Table of Contents + Related Articles + Platform CTA */}
          <aside className="lg:col-span-4 space-y-6 sticky top-24">

            {/* 1. Table of Contents */}
            {tableOfContents.length > 0 && (
              <div className="rounded-3xl bg-white border border-[#E5E5E2] p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                  <ListOrdered size={14} className="text-[#7C3AED]" />
                  Table of Contents
                </div>
                <nav className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                  {tableOfContents.map((item, idx) => (
                    <a
                      key={idx}
                      href={`#${item.id}`}
                      className={`block text-xs py-1 transition-colors leading-snug ${
                        item.level === 3 ? "pl-3 text-[#6B7280]" : "font-semibold text-[#0A0A0A]"
                      } hover:text-[#7C3AED]`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* 2. Related Articles Compact Vertical Stack */}
            {relatedPosts.length > 0 && (
              <div className="rounded-3xl bg-white border border-[#E5E5E2] p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-extrabold text-[#0A0A0A] uppercase tracking-wider pb-2 border-b border-[#F0F0F0]">
                  Related Articles
                </h4>
                <div className="space-y-3.5">
                  {relatedPosts.map((rPost) => (
                    <Link
                      key={rPost.id}
                      to={`/blog/${rPost.slug}`}
                      className="group flex items-start gap-3 pb-3 border-b border-[#F5F5F7] last:border-b-0 last:pb-0"
                    >
                      {/* Compact Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-[#E5E5E2] relative">
                        {rPost.cover_image_url ? (
                          <img
                            src={rPost.cover_image_url}
                            alt={rPost.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#F5F0FF] text-[#7C3AED]">
                            <BookOpen size={16} className="opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Detail */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h5 className="text-xs font-bold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors leading-snug line-clamp-2">
                          {rPost.title}
                        </h5>
                        <span className="text-[10px] text-[#7C3AED] font-semibold block truncate">
                          {rPost.category || "General"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. YBEX Platform Promotion Card */}
            <div className="relative rounded-[24px] p-6 bg-gradient-to-b from-[#F5F0FF] to-white border border-[#EBE5F5] shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-[#7C3AED]/5 to-transparent blur-xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-start space-y-4">
                <h4 className="text-[17px] font-black tracking-tight text-[#0A0A0A] leading-snug">
                  Scale Your Influencer Campaigns with Zero Escrow Risk
                </h4>
                
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl bg-[#7C3AED] text-white font-bold text-xs hover:bg-[#6D28D9] transition-all shadow-md shadow-[#7C3AED]/20 mt-2"
                >
                  Get Started Free <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
