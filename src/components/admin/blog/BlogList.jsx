import React, { useState, useEffect } from "react";
import { safeUpper } from "../../../utils/safeFormat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Share2,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Globe,
  ExternalLink,
  MoreVertical,
  Layers,
  Calendar
} from "lucide-react";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import SocialShareModal from "./SocialShareModal";
import BlogAiModal from "./BlogAiModal";

export default function BlogList({ onNewPost, onEditPost, onAiGeneratedPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSharePost, setSelectedSharePost] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get("/admin/blog/posts", { params });
      if (res.data?.posts) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error("[BlogList fetch]", err);
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  // Quick Toggle Publish / Unpublish
  const handleTogglePublish = async (post) => {
    try {
      if (post.status === "published") {
        await api.post(`/admin/blog/posts/${post.id}/unpublish`);
        toast.success("Post unpublished (moved to draft)");
      } else {
        await api.post(`/admin/blog/posts/${post.id}/publish`);
        toast.success("Post published live!");
      }
      fetchPosts();
    } catch (err) {
      toast.error("Failed to update publication status");
    }
  };

  // Delete Post
  const handleDeletePost = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await api.delete(`/admin/blog/posts/${id}`);
      toast.success("Blog post deleted");
      fetchPosts();
    } catch (err) {
      toast.error("Failed to delete blog post");
    }
  };

  // Computed metrics
  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const totalViews = posts.reduce((acc, p) => acc + (p.views_count || 0), 0);

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tags, or author..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E5E5E2] bg-[#F9F9FB] focus:outline-none focus:border-[#7C3AED] text-[#0A0A0A]"
            />
          </form>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E5E2] bg-[#F9F9FB] text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED]"
          >
            <option value="all">All Categories</option>
            <option value="Influencer Marketing">Influencer Marketing</option>
            <option value="Creator Economy">Creator Economy</option>
            <option value="Platform Updates">Platform Updates</option>
            <option value="Guides & Playbooks">Guides & Playbooks</option>
            <option value="Case Studies">Case Studies</option>
            <option value="Monetization & Payouts">Monetization & Payouts</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#F5F0FF] text-[#7C3AED] hover:bg-[#EDE5FF] border border-[#DDD6FE] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            AI Write
          </button>

          <button
            onClick={onNewPost}
            className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            New Post
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#F0F0F0] pb-2">
        {["all", "published", "draft"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusFilter === st
                ? "bg-[#0A0A0A] text-white"
                : "text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F2F2F7]"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Posts Table / List */}
      <div className="rounded-3xl bg-white border border-[#E5E5E2] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[#6B7280]">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading blog articles...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F0FF] text-[#7C3AED] flex items-center justify-center mx-auto mb-4 border border-[#DDD6FE]">
              <FileText size={24} />
            </div>
            <h3 className="text-base font-bold text-[#0A0A0A] mb-1">No articles found</h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto mb-5">
              Start sharing authoritative influencer marketing insights, creator playbooks, and platform updates.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#F5F0FF] text-[#7C3AED] text-xs font-bold hover:bg-[#EDE5FF] transition-colors flex items-center gap-1.5"
              >
                Generate with Gemini
              </button>
              <button
                onClick={onNewPost}
                className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} /> Create Post
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F9FB] border-b border-[#F0F0F0] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3.5 px-6">Article</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Views</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-xs">
                {posts.map((post) => {
                  const isPub = post.status === "published";
                  return (
                    <tr key={post.id} className="hover:bg-[#F9F9FB] transition-colors group">
                      {/* Post info */}
                      <td className="py-4 px-6 max-w-sm">
                        <div className="flex items-center gap-3.5">
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-14 h-10 rounded-xl object-cover border border-[#E5E5E2] shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-10 rounded-xl bg-[#F2F2F7] border border-[#E5E5E2] flex items-center justify-center text-[#6B7280] shrink-0">
                              <FileText size={16} />
                            </div>
                          )}
                          <div className="truncate">
                            <div
                              onClick={() => onEditPost(post)}
                              className="font-bold text-[#0A0A0A] hover:text-[#7C3AED] cursor-pointer truncate transition-colors"
                            >
                              {post.title}
                            </div>
                            <div className="text-[11px] text-[#6B7280] font-mono truncate mt-0.5">
                              /blog/{post.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F2F2F7] text-[#0A0A0A]">
                          {post.category || "General"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            isPub
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {safeUpper(post.status)}
                        </button>
                      </td>

                      {/* Author */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-semibold text-[#0A0A0A]">
                          {(() => {
                            const authorNameTag = post.tags?.find(t => t.startsWith('__author_name:'));
                            return authorNameTag ? authorNameTag.substring(14) : "YBEX Editorial";
                          })()}
                        </span>
                      </td>

                      {/* Views */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-[#0A0A0A]">
                          <Eye size={12} className="text-[#6B7280]" />
                          {(post.views_count || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-[11px] text-[#6B7280]">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : new Date(post.created_at).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPub && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#0A0A0A] hover:bg-white transition-colors"
                              title="View Public Post"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          <button
                            onClick={() => setSelectedSharePost(post)}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#7C3AED] hover:bg-[#F5F0FF] transition-colors cursor-pointer"
                            title="Social Distribution Pack"
                          >
                            <Share2 size={14} />
                          </button>

                          <button
                            onClick={() => onEditPost(post)}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#0A0A0A] hover:bg-white transition-colors cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            className="p-1.5 rounded-lg text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Post"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Social Modal */}
      <SocialShareModal
        isOpen={Boolean(selectedSharePost)}
        onClose={() => setSelectedSharePost(null)}
        post={selectedSharePost}
      />

      {/* AI Write Modal */}
      <BlogAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyContent={(aiData) => {
          onAiGeneratedPost(aiData);
        }}
      />
    </div>
  );
}
