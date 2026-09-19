import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check, Share2, Linkedin, Twitter, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SocialShareModal({ isOpen, onClose, post }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen || !post) return null;

  const postUrl = `https://ybex.io/blog/${post.slug}`;
  const title = post.title || "Latest article on YBEX";
  const excerpt = post.excerpt || "Read our deep dive on creator marketing.";

  const socialTemplates = {
    linkedin: `🚀 New Deep Dive: ${title}\n\n${excerpt}\n\nKey takeaways:\n📌 Performance-driven creator incentives\n📌 Verified engagement rate benchmarks\n📌 Scalable UGC workflows for D2C brands\n\nRead the full playbook here 👇\n${postUrl}\n\n#InfluencerMarketing #CreatorEconomy #UGC #MarketingStrategy #YBEX`,
    twitter: `Scaling creator collaborations in 2026? 🧵\n\nWe just broke down: "${title}"\n\n${excerpt}\n\nFull guide on YBEX Blogs 📖\n${postUrl} #CreatorEconomy #InfluencerMarketing`,
    threads: `⚡️ "${title}"\n\n${excerpt}\n\nRead the full post at ${postUrl}`,
    newsletter: `Subject: ${title}\n\nHi there,\n\n${excerpt}\n\nRead the complete breakdown on our blog:\n${postUrl}\n\nBest,\nTeam YBEX`
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5E5E2] overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F0F0F0] bg-[#F9F9FB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0A0A0A]">Social Distribution & Sharing</h3>
              <p className="text-xs text-[#6B7280]">
                Pre-formatted social snippets for LinkedIn, Twitter/X, Threads, and Newsletters
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

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick link box */}
          <div className="p-3.5 rounded-2xl bg-[#F9F9FB] border border-[#E5E5E2] flex items-center justify-between gap-3">
            <div className="truncate text-xs font-mono text-[#0A0A0A]">{postUrl}</div>
            <button
              onClick={() => handleCopy(postUrl, "link")}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E2] text-xs font-bold text-[#0A0A0A] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copiedKey === "link" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedKey === "link" ? "Copied" : "Copy Link"}
            </button>
          </div>

          {/* LinkedIn Snippet */}
          <div className="p-4 rounded-2xl border border-[#E5E5E2] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Linkedin size={16} className="text-[#0A66C2]" />
                <span className="text-xs font-bold text-[#0A0A0A]">LinkedIn Post</span>
              </div>
              <button
                onClick={() => handleCopy(socialTemplates.linkedin, "linkedin")}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F9F9FB] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] text-[#6B7280] transition-colors flex items-center gap-1"
              >
                {copiedKey === "linkedin" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedKey === "linkedin" ? "Copied" : "Copy Post"}
              </button>
            </div>
            <pre className="text-xs text-[#4B5563] whitespace-pre-wrap font-sans bg-[#F9F9FB] p-3 rounded-xl border border-[#F0F0F0] max-h-32 overflow-y-auto">
              {socialTemplates.linkedin}
            </pre>
          </div>

          {/* Twitter / X Snippet */}
          <div className="p-4 rounded-2xl border border-[#E5E5E2] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Twitter size={16} className="text-[#0A0A0A]" />
                <span className="text-xs font-bold text-[#0A0A0A]">Twitter / X Hook</span>
              </div>
              <button
                onClick={() => handleCopy(socialTemplates.twitter, "twitter")}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F9F9FB] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] text-[#6B7280] transition-colors flex items-center gap-1"
              >
                {copiedKey === "twitter" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedKey === "twitter" ? "Copied" : "Copy Tweet"}
              </button>
            </div>
            <pre className="text-xs text-[#4B5563] whitespace-pre-wrap font-sans bg-[#F9F9FB] p-3 rounded-xl border border-[#F0F0F0] max-h-32 overflow-y-auto">
              {socialTemplates.twitter}
            </pre>
          </div>

          {/* Newsletter Blurb */}
          <div className="p-4 rounded-2xl border border-[#E5E5E2] bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[#7C3AED]" />
                <span className="text-xs font-bold text-[#0A0A0A]">Email Newsletter Blurb</span>
              </div>
              <button
                onClick={() => handleCopy(socialTemplates.newsletter, "newsletter")}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F9F9FB] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] text-[#6B7280] transition-colors flex items-center gap-1"
              >
                {copiedKey === "newsletter" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedKey === "newsletter" ? "Copied" : "Copy Blurb"}
              </button>
            </div>
            <pre className="text-xs text-[#4B5563] whitespace-pre-wrap font-sans bg-[#F9F9FB] p-3 rounded-xl border border-[#F0F0F0] max-h-32 overflow-y-auto">
              {socialTemplates.newsletter}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F9F9FB] border-t border-[#F0F0F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-bold hover:bg-[#24283B] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
