import React, { useState } from "react";
import { safeArray } from "../../../utils/safeFormat";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, X, Check, Loader2, FileText, ArrowRight, Layers, Search, RefreshCw } from "lucide-react";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import GeminiIcon from "../../common/GeminiIcon";

export default function BlogAiModal({ isOpen, onClose, onApplyContent, currentTitle = "", currentContent = "" }) {
  const [activeMode, setActiveMode] = useState("full_draft"); // 'full_draft', 'outline', 'expand_section', 'seo_optimize'
  const [topic, setTopic] = useState(currentTitle || "");
  const [category, setCategory] = useState("Influencer Marketing");
  const [targetAudience, setTargetAudience] = useState("Brands & Marketers");
  const [tone, setTone] = useState("Authoritative & Data-driven");
  const [keywords, setKeywords] = useState("");
  const [sectionHeading, setSectionHeading] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic && activeMode !== "seo_optimize") {
      toast.error("Please enter a topic or focus headline");
      return;
    }

    setLoading(true);
    setGeneratedResult(null);

    try {
      const payload = {
        action: activeMode,
        topic: topic.trim(),
        category,
        target_audience: targetAudience,
        tone,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        current_title: currentTitle || topic,
        current_content: currentContent,
        section_heading: sectionHeading
      };

      const res = await api.post("/admin/blog/generate", payload, { timeout: 120000 });
      if (res.data?.ok && res.data?.data) {
        setGeneratedResult(res.data.data);
        toast.success("AI draft generated successfully!");
      } else {
        toast.error("Unexpected response from AI service");
      }
    } catch (err) {
      console.error("[Blog AI Generate]", err);
      if (err?.message?.includes("timeout") || err?.code === "ECONNABORTED") {
        toast.error("AI content generation took longer than expected. Please retry or generate an outline first.");
      } else {
        toast.error(err?.response?.data?.error || err?.message || "Failed to generate AI content");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult) return;
    onApplyContent(generatedResult, activeMode);
    toast.success("Applied to editor!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E5E5E2] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F0F0F0] bg-[#F9F9FB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0A0A0A]">Gemini AI Content Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F0FF] text-[#7C3AED] border border-[#DDD6FE]">
                  PRO
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Generate high-converting blog posts, outlines, and SEO metadata with Gemini 2.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F2F2F7] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-[#F0F0F0] flex gap-2 overflow-x-auto">
          {[
            { id: "full_draft", label: "Full Article Draft", icon: FileText },
            { id: "outline", label: "Structured Outline", icon: Layers },
            { id: "expand_section", label: "Expand Section", icon: Wand2 },
            { id: "seo_optimize", label: "SEO & Social Pack", icon: Search }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveMode(tab.id);
                  setGeneratedResult(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? "bg-[#7C3AED] text-white shadow-sm"
                    : "bg-[#F9F9FB] text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F2F2F7]"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!generatedResult ? (
            <>
              {/* Form Input fields */}
              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  {activeMode === "expand_section" ? "Section Topic / Context" : "Article Topic or Headline *"}
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    activeMode === "expand_section"
                      ? "e.g. How performance-based creator incentives outperform flat fees"
                      : "e.g. The 2026 Guide to UGC Creator ROI: How Indian D2C Brands Scale Authentic Ads"
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E2] text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] bg-white text-[#0A0A0A]"
                />
              </div>

              {activeMode === "expand_section" && (
                <div>
                  <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Section Heading (H2)
                  </label>
                  <input
                    type="text"
                    value={sectionHeading}
                    onChange={(e) => setSectionHeading(e.target.value)}
                    placeholder="e.g. Key Performance Metrics You Must Track"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E2] text-sm focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] bg-white text-[#0A0A0A]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E2] text-xs font-medium focus:outline-none focus:border-[#7C3AED] bg-white text-[#0A0A0A]"
                  >
                    <option value="Influencer Marketing">Influencer Marketing</option>
                    <option value="Creator Economy">Creator Economy</option>
                    <option value="Platform Updates">Platform Updates</option>
                    <option value="Guides & Playbooks">Guides & Playbooks</option>
                    <option value="Case Studies">Case Studies</option>
                    <option value="Monetization & Payouts">Monetization & Payouts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E2] text-xs font-medium focus:outline-none focus:border-[#7C3AED] bg-white text-[#0A0A0A]"
                  >
                    <option value="Brands & Marketers">Brands & Marketers</option>
                    <option value="Content Creators & Influencers">Content Creators & Influencers</option>
                    <option value="Agencies & Media Planners">Agencies & Media Planners</option>
                    <option value="D2C Founders">D2C Founders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                    Tone of Voice
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E2] text-xs font-medium focus:outline-none focus:border-[#7C3AED] bg-white text-[#0A0A0A]"
                  >
                    <option value="Authoritative & Data-driven">Authoritative & Data-driven</option>
                    <option value="Practical Playbook & Step-by-Step">Practical Playbook</option>
                    <option value="Conversational & Punchy">Conversational & Punchy</option>
                    <option value="Inspiring & Creator-focused">Inspiring & Creator-focused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-1.5">
                  Target Keywords (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. UGC marketing, Instagram Reels engagement, creator escrow, ROI benchmarks"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E2] text-sm focus:outline-none focus:border-[#7C3AED] bg-white text-[#0A0A0A]"
                />
              </div>
            </>
          ) : (
            /* Result Preview Screen */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                    Generation Complete
                  </span>
                </div>
                <button
                  onClick={handleGenerate}
                  className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>

              {generatedResult.title && (
                <div className="p-4 rounded-2xl bg-[#F9F9FB] border border-[#E5E5E2]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Generated Headline
                  </span>
                  <h4 className="text-base font-extrabold text-[#0A0A0A]">{generatedResult.title}</h4>
                  {generatedResult.excerpt && (
                    <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">{generatedResult.excerpt}</p>
                  )}
                </div>
              )}

              {generatedResult.content && (
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                    Article Preview (HTML Body)
                  </span>
                  <div
                    className="p-5 rounded-2xl bg-white border border-[#E5E5E2] max-h-60 overflow-y-auto prose prose-sm text-xs text-[#0A0A0A] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: generatedResult.content }}
                  />
                </div>
              )}

              {generatedResult.html && (
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1.5">
                    Section Content
                  </span>
                  <div
                    className="p-5 rounded-2xl bg-white border border-[#E5E5E2] max-h-60 overflow-y-auto prose prose-sm text-xs text-[#0A0A0A] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: generatedResult.html }}
                  />
                </div>
              )}

              {generatedResult.outline_sections && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                    Outline Blueprint
                  </span>
                  { safeArray(generatedResult.outline_sections).map((sec, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-[#F9F9FB] border border-[#E5E5E2] text-xs">
                      <div className="font-bold text-[#0A0A0A] mb-1">{sec.heading}</div>
                      <ul className="list-disc list-inside text-[#6B7280] space-y-0.5">
                        {sec.key_points?.map((pt, j) => (
                          <li key={j}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {generatedResult.meta_title && (
                <div className="p-4 rounded-2xl bg-[#F5F0FF] border border-[#DDD6FE]">
                  <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">
                    SEO Meta Snippet
                  </span>
                  <div className="text-xs font-bold text-[#0A0A0A]">{generatedResult.meta_title}</div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">{generatedResult.meta_description}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F9F9FB] border-t border-[#F0F0F0] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E5E5E2] text-xs font-semibold text-[#6B7280] hover:text-[#0A0A0A] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {!generatedResult ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating with Gemini...
                </>
              ) : (
                <>
                  <Wand2 size={15} />
                  Generate Draft
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGeneratedResult(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E5E2] text-xs font-semibold text-[#0A0A0A] hover:bg-white transition-colors cursor-pointer"
              >
                Back to Form
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Check size={15} />
                Apply to Editor
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
