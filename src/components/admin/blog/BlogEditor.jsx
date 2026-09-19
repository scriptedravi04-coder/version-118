import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Send,
  Upload,
  Image as ImageIcon,
  Clock,
  Eye,
  Globe,
  Tag,
  Share2,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Check,
  Calendar,
  Layers,
  User,
  AlertCircle
} from "lucide-react";
import TiptapEditor from "./TiptapEditor";
import BlogAiModal from "./BlogAiModal";
import SocialShareModal from "./SocialShareModal";
import { api } from "../../../lib/api";
import { toast } from "sonner";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogEditor({ post, onBack, onSaved }) {
  const isNew = !post || !post.id;

  const authorNameTag = post?.tags?.find(t => t.startsWith('__author_name:'));
  const authorRoleTag = post?.tags?.find(t => t.startsWith('__author_role:'));
  
  const initialAuthorName = authorNameTag ? authorNameTag.substring(14) : (post?.author_name || "YBEX Editorial");
  const initialAuthorRole = authorRoleTag ? authorRoleTag.substring(14) : (post?.author_role || "Editorial Team");

  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [authorRole, setAuthorRole] = useState(initialAuthorRole);
  
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [isSlugLocked, setIsSlugLocked] = useState(!isNew);
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.cover_image_url || "");
  const [category, setCategory] = useState(post?.category || "Influencer Marketing");
  
  const [tags, setTags] = useState(Array.isArray(post?.tags) ? post.tags.filter(t => !t.startsWith('__')) : []);
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState(post?.status === "published" ? "published" : "draft");
  const [aiGenerated, setAiGenerated] = useState(Boolean(post?.ai_generated));
  const [publishedAt, setPublishedAt] = useState(
    post?.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : ""
  );

  // SEO & Social
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || "");
  const [canonicalUrl, setCanonicalUrl] = useState(post?.canonical_url || "");
  const [ogImageUrl, setOgImageUrl] = useState(post?.og_image_url || "");

  // Modals & states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  // Auto-slugify when title changes if unlocked
  useEffect(() => {
    if (!isSlugLocked && title) {
      setSlug(slugify(title));
    }
  }, [title, isSlugLocked]);

  // Handle Cover Image Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingImage(true);
    try {
      const res = await api.post("/admin/blog/upload-cover", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.url) {
        setCoverImageUrl(res.data.url);
        toast.success("Cover image uploaded!");
      }
    } catch (err) {
      toast.error("Failed to upload image. You can also paste an image URL directly.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Tag
  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const rawVals = tagInput.split(',').map(v => v.trim().replace(/^#/, ""));
      let updatedTags = [...tags];
      let added = false;
      for (const val of rawVals) {
        if (val && !updatedTags.includes(val)) {
          updatedTags.push(val);
          added = true;
        }
      }
      if (added) {
        setTags(updatedTags);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Handle Save
  const handleSave = async (newStatus) => {
    if (!title.trim()) {
      toast.error("Article Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Article Content cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const finalStatus = (newStatus || status) === "published" ? "published" : "draft";
      
      const payloadTags = tags.filter(t => !t.startsWith('__'));
      if (authorName.trim()) payloadTags.push(`__author_name:${authorName.trim()}`);
      if (authorRole.trim()) payloadTags.push(`__author_role:${authorRole.trim()}`);

      const payload = {
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_image_url: coverImageUrl.trim() || null,
        category,
        tags: payloadTags,
        status: finalStatus,
        ai_generated: Boolean(aiGenerated),
        published_at: publishedAt ? new Date(publishedAt).toISOString() : finalStatus === "published" ? new Date().toISOString() : null,
        meta_title: metaTitle.trim() || title.trim(),
        meta_description: metaDescription.trim() || excerpt.trim(),
        canonical_url: canonicalUrl.trim() || `https://ybex.io/blog/${slug || slugify(title)}`,
        og_image_url: ogImageUrl.trim() || coverImageUrl.trim() || null
      };

      let res;
      if (isNew) {
        res = await api.post("/admin/blog/posts", payload);
      } else {
        res = await api.put(`/admin/blog/posts/${post.id}`, payload);
      }

      if (res.data?.ok) {
        toast.success(
          finalStatus === "published"
            ? "Post published live!"
            : isNew
            ? "Post created as draft!"
            : "Post updated successfully!"
        );
        if (onSaved) onSaved(res.data.post);
      }
    } catch (err) {
      console.error("[Save Blog Post Error]:", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  // Apply AI Content Handler
  const handleApplyAiContent = (aiData, mode) => {
    setAiGenerated(true);
    if (aiData.title && !title) setTitle(aiData.title);
    if (aiData.slug && !slug) setSlug(aiData.slug);
    if (aiData.excerpt) setExcerpt(aiData.excerpt);
    if (aiData.category) setCategory(aiData.category);
    if (Array.isArray(aiData.tags) && aiData.tags.length > 0) {
      setTags(Array.from(new Set([...tags, ...aiData.tags])));
    }
    if (aiData.meta_title) setMetaTitle(aiData.meta_title);
    if (aiData.meta_description) setMetaDescription(aiData.meta_description);

    if (aiData.content) {
      setContent(aiData.content);
    } else if (aiData.html) {
      setContent((prev) => (prev ? prev + "\n" + aiData.html : aiData.html));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
            title="Back to Posts"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-base font-bold text-[#0A0A0A]">
              {isNew ? "Create New Blog Post" : `Editing: ${title || "Untitled"}`}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status === "published"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {status.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#6B7280]">
                {slug ? `ybex.io/blog/${slug}` : "Draft Slug"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Advanced Mode Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer mr-2">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={advancedMode}
                onChange={() => setAdvancedMode(!advancedMode)}
              />
              <div className={`block w-8 h-4.5 rounded-full transition-colors ${advancedMode ? 'bg-[#7C3AED]' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${advancedMode ? 'translate-x-3.5' : ''}`}></div>
            </div>
            <span className="text-xs font-bold text-[#6B7280]">Advanced</span>
          </label>

          {/* Gemini AI Assistant Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F5F0FF] text-[#7C3AED] hover:bg-[#EDE5FF] border border-[#DDD6FE] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            Gemini Assistant
          </button>

          {!isNew && (
            <>
              <a
                href={`/blog/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E2] text-[#0A0A0A] hover:bg-[#F9F9FB] text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Eye size={15} />
                Preview Live
              </a>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E2] text-[#0A0A0A] hover:bg-[#F9F9FB] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 size={15} />
                Social Pack
              </button>
            </>
          )}

          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-white border border-[#E5E5E2] text-[#0A0A0A] hover:bg-[#F9F9FB] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            Save Draft
          </button>

          <button
            onClick={() => handleSave("published")}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={15} />
            {status === "published" ? "Update & Keep Published" : "Publish Now"}
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Content Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Title Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-2">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10 Proven UGC Video Formats That Boost Conversion in 2026"
                className="w-full px-4 py-3 text-lg font-extrabold text-[#0A0A0A] placeholder-[#ABABAB] rounded-2xl border border-[#E5E5E2] focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 bg-[#F9F9FB]"
              />
            </div>

            {/* Slug & Permalinks */}
            {advancedMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
                    <Globe size={12} /> URL Slug / Permalink
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSlugLocked(!isSlugLocked)}
                    className="text-[11px] font-semibold text-[#7C3AED] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isSlugLocked ? <Lock size={11} /> : <Unlock size={11} />}
                    {isSlugLocked ? "Unlock Slug" : "Auto-sync with Title"}
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-[#E5E5E2] bg-[#F9F9FB] px-3.5 py-2 text-xs font-mono text-[#6B7280] focus-within:border-[#7C3AED]">
                  <span>https://ybex.io/blog/</span>
                  <input
                    type="text"
                    value={slug}
                    disabled={isSlugLocked}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="article-url-slug"
                    className="w-full bg-transparent text-[#0A0A0A] font-bold focus:outline-none ml-1 disabled:opacity-75"
                  />
                </div>
              </div>
            )}

            {/* Excerpt / Summary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                  Excerpt / Summary Hook
                </label>
                <span className="text-[11px] text-[#ABABAB]">{excerpt.length}/160 chars</span>
              </div>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A compelling 2-sentence hook shown on blog cards and search engine results..."
                className="w-full px-4 py-2.5 text-xs text-[#0A0A0A] placeholder-[#ABABAB] rounded-xl border border-[#E5E5E2] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] bg-white leading-relaxed"
              />
            </div>
          </div>

          {/* Cover Image Selector */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={15} className="text-[#7C3AED]" /> Cover Image
              </label>
              <span className="text-[11px] text-[#6B7280]">Recommended: 1200 x 630px (16:9)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Upload Image File
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E5E5E2] hover:border-[#7C3AED] rounded-2xl cursor-pointer bg-[#F9F9FB] transition-colors group">
                  <Upload size={22} className="text-[#6B7280] group-hover:text-[#7C3AED] mb-1.5 transition-colors" />
                  <span className="text-xs font-bold text-[#0A0A0A]">
                    {uploadingImage ? "Uploading..." : "Click or Drag to Upload"}
                  </span>
                  <span className="text-[10px] text-[#6B7280] mt-0.5">PNG, JPG, WebP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Or Paste Direct Image URL
                </label>
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-white mb-2"
                />

                {coverImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-[#E5E5E2] h-24 bg-[#F2F2F7]">
                    <img
                      src={coverImageUrl}
                      alt="Cover Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl("")}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rich Content Editor */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                Article Body (Rich Text) *
              </label>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="text-xs font-bold text-[#7C3AED] hover:underline flex items-center gap-1"
              >
                Expand with Gemini
              </button>
            </div>

            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Write or paste your article content here. Use H2, H3 headings, lists, quotes, and links..."
            />
          </div>

          {/* Tags Manager */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-3">
            <label className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={15} className="text-[#7C3AED]" /> Keyword Tags
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-xl bg-[#F5F0FF] text-[#7C3AED] border border-[#DDD6FE] text-xs font-bold flex items-center gap-1.5"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag and press Enter..."
                className="px-3 py-1.5 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB]"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Publishing Settings & SEO Sidebar */}
        <div className="space-y-6">
          {/* Publishing Controls */}
          <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider border-b border-[#F0F0F0] pb-2">
              Publishing Settings
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs font-semibold focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB] text-[#0A0A0A]"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Live to World)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs font-semibold focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB] text-[#0A0A0A]"
              >
                <option value="Influencer Marketing">Influencer Marketing</option>
                <option value="Creator Economy">Creator Economy</option>
                <option value="Platform Updates">Platform Updates</option>
                <option value="Guides & Playbooks">Guides & Playbooks</option>
                <option value="Case Studies">Case Studies</option>
                <option value="Monetization & Payouts">Monetization & Payouts</option>
              </select>
            </div>

            {advancedMode && (
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Publication Date
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs font-medium focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB] text-[#0A0A0A]"
                />
              </div>
            )}
          </div>

          {/* Author Details Card */}
          {advancedMode && (
            <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider border-b border-[#F0F0F0] pb-2 flex items-center gap-1.5">
                <User size={14} className="text-[#7C3AED]" /> Author Attribution
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Author Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. YBEX Editorial or Yash Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">Author Role</label>
                <input
                  type="text"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="e.g. Head of Growth or Creator Strategist"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB]"
                />
              </div>
            </div>
          )}

          {/* SEO & Meta Box */}
          {advancedMode && (
            <div className="p-6 rounded-3xl bg-white border border-[#E5E5E2] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-2">
                <h3 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-[#7C3AED]" /> SEO & Meta Tags
                </h3>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#6B7280]">Meta Title</label>
                  <span className="text-[10px] text-[#ABABAB]">{metaTitle.length}/60</span>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || "SEO Page Title (60 chars max)"}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#6B7280]">Meta Description</label>
                  <span className="text-[10px] text-[#ABABAB]">{metaDescription.length}/155</span>
                </div>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={excerpt || "Search description snippet..."}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E5E2] text-xs text-[#0A0A0A] focus:outline-none focus:border-[#7C3AED] bg-[#F9F9FB]"
                />
              </div>

              {/* Live Google Search Preview Box */}
              <div className="p-3.5 rounded-2xl bg-[#F9F9FB] border border-[#E5E5E2] space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                  Google Search Preview
                </span>
                <div className="text-[11px] text-[#202124] font-medium truncate flex items-center gap-1">
                  <span>ybex.io › blog › {slug || "slug"}</span>
                </div>
                <div className="text-xs font-bold text-[#1a0dab] line-clamp-1">
                  {metaTitle || title || "Article Headline - YBEX Blog"}
                </div>
                <div className="text-[11px] text-[#4d5156] line-clamp-2 leading-tight">
                  {metaDescription || excerpt || "Read comprehensive playbooks and insights on the creator economy and influencer marketing."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Modal */}
      <BlogAiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyContent={handleApplyAiContent}
        currentTitle={title}
        currentContent={content}
      />

      {/* Social Distribution Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={{ id: post?.id, title, slug: slug || slugify(title), excerpt }}
      />
    </div>
  );
}
