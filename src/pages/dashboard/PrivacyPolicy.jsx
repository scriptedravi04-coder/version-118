import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Eye, Database, Share2, Lock, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-16 px-4 max-w-4xl mx-auto">
      {/* Glow highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--violet)]/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="relative z-10 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-2xl bg-[var(--violet)]/10 border border-[var(--violet)]/20 flex items-center justify-center mx-auto text-[var(--violet)] shadow-[0_8px_24px_rgba(124,92,255,0.15)]"
          >
            <ShieldCheck size={28} />
          </motion.div>
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Privacy <span className="text-[#7C5CFF]">Policy</span>
            </h1>
            <p className="text-xs font-mono text-[var(--violet)] tracking-widest uppercase">
              LAST UPDATED: JUNE 2026 • YBEX PLATFORM INTENT
            </p>
          </div>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
            Your trust is our highest parameter. This policy details how Ybex Media manages profiles, communication logs, and secure escrow contracts to protect creators and brand partners.
          </p>
        </div>

        {/* Highlight Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-card to-card border border-[var(--violet)]/20 shadow-2xl flex gap-4 items-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Escrow and Communication Confidentiality</h3>
            <p className="text-xs text-[var(--text-primary)]/60 mt-1 leading-relaxed">
              We encrypt all communication logs, direct message threads, and dynamic escrow payments held within our dashboard. Client budgets and legal briefs are protected and cleared only through authorised, verified user portals.
            </p>
          </div>
        </div>

        {/* Section Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          {/* Card 1: Information Collected */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 hover:border-foreground/15 transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--violet)]/10 text-[#7C5CFF] flex items-center justify-center">
                <Database size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">1. Data Collected</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              We collect information that allows our marketplace matching to operate smoothly:
            </p>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]/75 pl-4 list-disc marker:text-[#7C5CFF]">
              <li>
                <strong className="text-[var(--text-primary)]">Creator Profiles:</strong> Name, social links, location, category tags, language choices, rate card pricing, and profile picture.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Brand Representatives:</strong> Organisation name, corporate website, contact names, logo, and campaign deliverables.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Transactional Data:</strong> Chat logs, campaign submissions, escrow delivery URLs, and feedback reviews.
              </li>
            </ul>
          </div>

          {/* Card 2: How We Use It */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 hover:border-foreground/15 transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center">
                <Eye size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">2. Process and Utility</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              We strictly process active user data for the core functions of the Ybex matching interface:
            </p>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]/75 pl-4 list-disc marker:text-[var(--violet)]">
              <li>To populate the Explore page feed for searching, tagging, and matching creators.</li>
              <li>To construct public creator rate cards and portfolio profiles.</li>
              <li>To facilitate instant chat channels and secure Dynamic Escrow locks.</li>
              <li>To resolve system disputes via the verified Admin Dashboard panel.</li>
            </ul>
          </div>

          {/* Card 3: Data Shared */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 hover:border-foreground/15 transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--violet-soft)] text-[var(--violet)] flex items-center justify-center">
                <Share2 size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">3. Information Access</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Data visibility operates under a closed role-based ecosystem to protect user privacy:
            </p>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]/75 pl-4 list-disc marker:text-[#D1F23F]">
              <li>Public fields on creator profiles can be filtered by registered brands.</li>
              <li>Campaign briefs entered by brands are searchable by creators.</li>
              <li>We never loan, barter, target, or lease personal analytics/emails with third-party advertisers.</li>
            </ul>
          </div>

          {/* Card 4: Access and Controls */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 hover:border-foreground/15 transition-all space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">4. User Rights</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You retain full, custom control over your personal profile parameters:
            </p>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]/75 pl-4 list-disc marker:text-emerald-400">
              <li>Edit or update profile pricing and pictures at any time in the Settings console.</li>
              <li>Restrict profile visibility or withdraw custom active campaign applications.</li>
              <li>Request complete account deletion, clearing logs from active database state.</li>
            </ul>
          </div>

        </div>

        {/* Detailed text section */}
        <div className="bg-[var(--bg-card)] border border-foreground/5 rounded-3xl p-8 space-y-6 text-xs text-[var(--text-primary)]/60 leading-relaxed">
          <h2 className="font-display text-[var(--text-primary)] text-base font-bold uppercase tracking-wider">Cookie Policy and Technical Integration</h2>
          <p>
            Ybex uses cookies and transient web storage tokens solely to maintain authenticated user sessions (AuthContext) and store client state preferences. General request telemetry is processed anonymously to track platform availability and match responsiveness. We do not place behavior tracking pixels from external brokers on active user dashboards.
          </p>

          <h2 className="font-display text-[var(--text-primary)] text-base font-bold uppercase tracking-wider pt-2">Security Real-Time Auditing</h2>
          <p>
            Our infrastructure maintains ongoing diagnostic logs. If any suspected data security breach is identified, notification warnings will be broadcast directly via the system notifications center within 24 hours. Accounts holding transactional Escrow parameters will require prompt validation keys to proceed.
          </p>

          <h2 className="font-display text-[var(--text-primary)] text-base font-bold uppercase tracking-wider pt-2">Contact Ybex Support</h2>
          <p>
            For privacy inquiries, GDPR queries, profile clearing requests, or standard support validation, reach our dedicated admin panel directly at {" "}
            <a href="mailto:info@ybexmedia.com" className="text-[#7C5CFF] font-bold hover:underline">
              info@ybexmedia.com
            </a>.
          </p>
        </div>

        {/* Action Link back */}
        <div className="text-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--violet)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#6849E0] transition-all shadow-[0_4px_16px_rgba(124,92,255,0.25)] hover:scale-105"
          >
            Return to Marketplace Home
          </Link>
        </div>
      </div>
    </div>
  );
}
