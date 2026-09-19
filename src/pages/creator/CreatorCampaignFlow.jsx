import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, UserCircle, Search, Shield, 
  MessageSquare, FileText, Video, UploadCloud, 
  Share2, BarChart2, IndianRupee, FileCheck, Banknote, HelpCircle
} from "lucide-react";

const phases = [
  {
    title: "Profile & Discovery",
    id: "phase-1",
    color: "from-blue-600/20 to-purple-600/20",
    borderColor: "border-blue-500/30",
    steps: [
      {
        num: 1,
        title: "Complete Your Profile",
        icon: <UserCircle size={24} className="text-blue-400" />,
        points: [
          "Select your specialization niche (Fashion / Tech / Food / Lifestyle, etc.)",
          "Input accurate follower count (fake metrics are strictly forbidden — brands verify them)",
          "Set your rate card — per post / per reel / per story rates",
          "Connect your Instagram, YouTube, or TikTok channel links",
          "Add your past work / portfolio examples (at least 3-5 high-quality works)",
          "Write a descriptive bio highlighting your specific specialization"
        ],
        extra: "Incomplete Profile = Less Visibility | Pro tip: Use a professional profile picture"
      },
      {
        num: 2,
        title: "Explore Campaigns",
        icon: <Search size={24} className="text-blue-400" />,
        points: [
          "View active campaigns on your Home Feed or Explore tab",
          "Filter by category, budget range, and deadlines",
          "Click on any campaign card to view full specifications",
          "Check brand requirements, follower limits, budget, and deliverables"
        ],
        extra: "Niche alignment is highly recommended"
      }
    ]
  },
  {
    title: "Eligibility & Application",
    id: "phase-2",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    callout: {
      type: 'decision',
      title: "Decision — Are You Eligible?",
      left: { title: "Yes — Apply Now", desc: "Followers count aligns, niche matches, rate range is acceptable — proceed to apply" },
      right: { title: "No — Skip Campaign", desc: "Follower requirements not met or niche is different — skip and search for other offers" }
    },
    steps: [
      {
        num: 3,
        title: "Required System Permissions",
        icon: <Shield size={24} className="text-amber-400" />,
        points: [
          "Camera — For shooting media directly within the app (video/photo)",
          "Media & Gallery Access — For uploading existing drafts and content proofs",
          "Microphone — For recording high-quality voiceovers or custom audio tracks",
          "Notifications — To receive instant brand messages and payment alerts",
          "File Storage — For saving and retrieving draft files"
        ],
        extra: "Please allow permissions to ensure seamless media creation and uploads"
      }
    ]
  },
  {
    title: "Brand Response & Chat",
    id: "phase-3",
    color: "from-pink-500/20 to-rose-500/20",
    borderColor: "border-pink-500/30",
    steps: [
      {
        num: 4,
        title: "Submit Your Proposal",
        icon: <FileText size={24} className="text-pink-400" />,
        points: [
          "Quote your competitive rate — aligned with or slightly above the campaign budget",
          "Write a short, engaging pitch: \"I will promote your product by...\"",
          "Attach your portfolio or past work links",
          "Provide an estimated delivery timeline",
          "Mention any special additions: e.g. \"Will provide 1 Reel + 2 Stories\""
        ],
        extra: "Avoid generic templates - customize your proposal for the brand | Strong Pitch = High Selection Rate"
      }
    ],
    callout: {
      type: 'decision',
      title: "Brand Decision Received",
      left: { title: "Proposal Rejected", desc: "Don't worry — continue applying to other active campaigns. Keep improving your profile." },
      right: { title: "Shortlisted!", desc: "Chat is unlocked! You can now speak and align on terms directly with the brand." }
    },
    postSteps: [
      {
        num: 5,
        title: "Negotiate Terms & Deliverables",
        icon: <MessageSquare size={24} className="text-pink-400" />,
        points: [
          "Negotiate Rates: \"I can execute this for ₹8,000, including 1 Reel and 2 Stories\"",
          "Confirm Deliverables: Agree on exact formats, aspect ratios, and content length",
          "Set Deadlines: \"Draft delivered in 3 days, final live post within 5 days\"",
          "Define Revision Caps: Agree on revision limits (e.g., 2 free rounds of edits)",
          "Lock Posting Date: Finalize the exact publishing date and time",
          "Clarify Usage Rights: Confirm if the brand can repurpose or run ads with your content",
          "Keep Chats in App: Conduct all talks in-app with full logging for verification"
        ],
        extra: "Keep all agreements locked in chat - do not negotiate verbally | Escrow payments are processed securely"
      }
    ]
  },
  {
    title: "Content Creation & Submission",
    id: "phase-4",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    steps: [
      {
        num: 6,
        title: "Seal the Deal — Digital Signature",
        icon: <CheckCircle2 size={24} className="text-emerald-400" />,
        points: [
          "A secure digital contract is automatically generated within the app",
          "Contract defines agreement amounts, deliverables, and revision rules",
          "Both parties complete digital signatures to legally execute the partnership",
          "Payments are fully structured and locked securely in Ybex Escrow"
        ],
        extra: "Request custom amendments in chat if terms need adjustment after signature"
      },
      {
        num: 7,
        title: "Produce High-Quality Content",
        icon: <Video size={24} className="text-emerald-400" />,
        points: [
          "Carefully review the brand brief: script hooks, key USPs, and talking points",
          "Shoot videos matching the agreed specifications (e.g., Reel = 9:16 aspect ratio)",
          "Ensure the product, packaging, and brand logos are visible and well-lit",
          "Incorporate mandatory sponsorship disclaimers (#ad, #sponsored)",
          "Draft engaging captions including hashtags requested by the brand",
          "Use premium audio recordings or voiceovers for high-quality playback"
        ],
        extra: "Do not go live without brand approval | Verify aspect ratios and resolution first"
      },
      {
        num: 8,
        title: "Submit Draft for Approval",
        icon: <UploadCloud size={24} className="text-emerald-400" />,
        points: [
          "Navigate to the campaign page and click \"Submit Draft\"",
          "Upload your video draft directly from your device gallery",
          "Provide the drafted caption and tags",
          "Ensure all agreed brand mentions and tags are attached",
          "Submit draft to transition campaign status to 'Draft Submitted'"
        ],
        extra: "Status: Draft Submitted | Brands usually complete reviews within 24-48 hours"
      }
    ],
    callout: {
      type: 'decision',
      title: "Draft Approval & Feedback Loop",
      left: { title: "Revisions Requested", desc: "Review brand's exact edits in chat, adjust your draft, and resubmit cleanly." },
      right: { title: "Approved!", desc: "The brand has approved your content draft. Lock the go-live schedule!" }
    }
  },
  {
    title: "Go Live & Proof",
    id: "phase-5",
    color: "from-indigo-500/20 to-cyan-500/20",
    borderColor: "border-indigo-500/30",
    steps: [
      {
        num: 9,
        title: "Publish & Go Live",
        icon: <Share2 size={24} className="text-indigo-400" />,
        points: [
          "Publish the approved content on your social channel at the agreed day and time",
          "Ensure caption, tags, links, and disclaimers are exactly as approved",
          "Paste and submit the live post URL in the app as campaign proof",
          "Upload supplementary story links if included in deliverables"
        ],
        extra: "Submit the live link immediately after publishing to trigger verification"
      },
      {
        num: 10,
        title: "Submit Engagement Reports",
        icon: <BarChart2 size={24} className="text-indigo-400" />,
        points: [
          "Capture analytics screenshots 24-48 hours after publishing",
          "Log final views, reach, likes, and engagement metrics",
          "Upload metrics in the 'Submit Campaign Report' section",
          "These verified metrics trigger the escrow release process",
          "Confirm metrics alignment with any guaranteed targets"
        ],
        extra: "Campaign report is required to release escrow funds | Capture story insights within 24 hours"
      }
    ]
  },
  {
    title: "Payment & Invoice",
    id: "phase-6",
    color: "from-[var(--violet)]/20 to-[#9D7CFF]/20",
    borderColor: "border-[var(--violet)]/30",
    steps: [
      {
        num: 11,
        title: "Escrow Release Request",
        icon: <IndianRupee size={24} className="text-[var(--violet)]" />,
        points: [
          "Click 'Mark as Complete' or 'Request Escrow Release'",
          "The brand is instantly notified that deliverables are fulfilled",
          "The brand approves the payout release (typically processed in 1-3 days)",
          "Politely follow up in chat if approvals take longer than expected",
          "Disputes can be logged in the portal for resolution"
        ],
        extra: "Contact Ybex Support if payment remains pending beyond 7 business days"
      },
      {
        num: 12,
        title: "Automated Invoicing",
        icon: <FileCheck size={24} className="text-[var(--violet)]" />,
        points: [
          "Ybex automatically generates a compliant invoice on your behalf",
          "Invoice details include creator & brand entities, campaign terms, and date",
          "Instantly download professional PDF invoices for your records",
          "Add your GSTIN to your profile settings for tax compliance",
          "Applicable withholding tax (TDS) is deducted where legally required"
        ],
        extra: "Invoices are saved automatically and can be exported for tax filing purposes"
      },
      {
        num: 13,
        title: "Secure Payout Processing",
        icon: <Banknote size={24} className="text-[var(--violet)]" />,
        points: [
          "Payment rails are backed by certified institutional escrow systems",
          "Methods: Instant UPI, Direct Bank Account Transfer, Wallet Payouts",
          "Your bank account or UPI ID must be pre-verified in profile settings",
          "Net amount equals total agreed deal value fully protected in escrow",
          "Internally tracked with cryptographically secure session IDs",
          "Instant UPI transfers take 1-2 hours; Bank transfers process in 1-3 business days"
        ],
        extra: "Platform fees are clearly detailed on the contract summary before you sign"
      },
      {
        num: 14,
        title: "Payout Confirmation",
        icon: <CheckCircle2 size={24} className="text-emerald-400" />,
        points: [
          "Receive automated notification of successful direct transfer credit",
          "Audit and view instant status updates in your transaction tab",
          "Verify received funds directly with your banking application",
          "Download and save the finalized invoice as a tax record",
          "Campaign status changes to fully 'Completed'"
        ],
        extra: "Always archive your Transaction ID for tracking"
      }
    ]
  }
];

export default function CreatorCampaignFlow() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--violet)]/30 font-sans pb-24">
      {/* Background Ornaments */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[500px] bg-[var(--violet)]/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 relative z-10 pt-12 md:pt-20">
        
        {/* Navigation */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4 text-[#B19CFF]">
            Influish — Creator Campaign Flow
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium">
            From Agreement to Payment & Automated Invoices — Complete Process Guide
          </p>
        </div>

        {/* Dynamic Phases */}
        <div className="space-y-16">
          {phases?.map((phase, pIdx) => (
            <div key={phase.id} className="relative">
              
              {/* Phase Header */}
              <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border ${phase.borderColor} bg-gradient-to-r ${phase.color} mb-8 backdrop-blur-md`}>
                <span className="text-xs uppercase tracking-widest font-black opacity-80">PHASE {pIdx + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                <span className="text-sm font-bold">{phase.title}</span>
              </div>

              {/* Callout (if any before steps) */}
              {phase.callout && !phase.postSteps && (
                <DecisionBox callout={phase.callout} />
              )}

              {/* Steps */}
              <div className="space-y-6 lg:ml-4">
                {phase.steps?.map((step, sIdx) => (
                  <StepCard key={step.num} step={step} isLast={sIdx === phase.steps.length - 1 && !phase.callout && pIdx === phases.length - 1} />
                ))}
              </div>

              {/* Mid-Phase Callout */}
              {phase.callout && phase.postSteps && (
                <div className="my-8">
                  <DecisionBox callout={phase.callout} />
                </div>
              )}

              {/* Post Steps */}
              {phase.postSteps && (
                <div className="space-y-6 lg:ml-4 mt-8">
                  {phase.postSteps?.map((step) => (
                    <StepCard key={step.num} step={step} />
                  ))}
                </div>
              )}

            </div>
          ))}

          {/* Success Banner */}
          <div className="mt-16 bg-gradient-to-br from-emerald-900/40 to-[#0A1A14] border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center backdrop-blur-xl">
             <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-emerald-400" />
             </div>
             <h2 className="text-2xl md:text-3xl font-display font-bold text-[var(--text-primary)] mb-6">Campaign Successfully Complete!</h2>
             
             <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-emerald-100/80 font-medium mb-8">
               <span>Rate the Brand</span>
               <span className="hidden sm:inline opacity-30">|</span>
               <span>Add to Portfolio</span>
               <span className="hidden sm:inline opacity-30">|</span>
               <span>Save Automated Invoice</span>
             </div>

             <div className="inline-block bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-6 py-3 text-sm text-emerald-200">
               Apply for the next campaign — with your new experience, your next proposal will be even stronger!
             </div>
          </div>

          {/* Quick Ref */}
          <div className="mt-12 bg-[#161622] rounded-3xl p-8 border border-[var(--border-default)]">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
               <HelpCircle size={20} className="text-[var(--violet)]" />
               Quick Reference — Important Points
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--text-secondary)]">
              <ul className="space-y-3">
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Profile completion is required</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Personalize your pitch proposal</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Do not go live without brand approval</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Download and save your invoices</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Fix revision limits in initial terms</li>
              </ul>
              <ul className="space-y-3">
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Keep all communication on chat — no WhatsApp</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Start work only after agreement confirmation</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Submit verified analytics proof</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> Payouts arrive directly via Cashfree UPI/Bank</li>
                <li className="flex items-start gap-2"><span className="text-[var(--violet)] font-bold">·</span> TDS applies for earnings exceeding ₹30,000</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StepCard({ step }) {
  return (
    <div className="relative pl-6 md:pl-10 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[26px] top-[40px] bottom-[-20px] w-px bg-[var(--bg-elevated)] hidden md:block"></div>
      
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl p-6 md:p-8 hover:border-[var(--border-default)] transition-colors group">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Number & Icon */}
          <div className="flex-shrink-0 flex items-center md:items-start gap-4 md:flex-col md:w-12">
            <div className="w-10 h-10 rounded-full bg-[#222230] text-lg font-display font-black flex items-center justify-center text-[var(--text-primary)]/80 border border-[var(--border-default)] group-hover:bg-[var(--violet)] group-hover:border-[var(--violet)] transition-all">
              {step.num}
            </div>
            <div className="hidden md:flex w-10 h-10 rounded-xl bg-[var(--bg-elevated)] items-center justify-center">
              {step.icon}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-5">{step.title}</h3>
            <ul className="space-y-3 mb-6">
              {step.points?.map((pt, i) => (
                <li key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed flex items-start gap-3">
                  <span className="text-[var(--violet)] mt-1 shrink-0">{"→"}</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            {step.extra && (
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-3 text-xs text-[var(--violet)] font-medium leading-relaxed flex flex-col md:flex-row md:items-center gap-2 md:gap-4 md:divide-x divide-black/5">
                {step.extra.split('|').map((part, index) => (
                   <span key={index} className={index > 0 ? "md:pl-4" : ""}>{part.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionBox({ callout }) {
  return (
    <div className="border border-amber-500/30 border-dashed rounded-3xl p-6 bg-amber-500/5 my-8">
      <h3 className="text-center font-bold text-amber-400 mb-6">{callout.title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-emerald-500/20">
          <h4 className="font-bold text-emerald-400 mb-2">{callout.left.title}</h4>
          <p className="text-sm text-[var(--text-secondary)]">{callout.left.desc}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-5 border border-rose-500/20">
          <h4 className="font-bold text-rose-400 mb-2">{callout.right.title}</h4>
          <p className="text-sm text-[var(--text-secondary)]">{callout.right.desc}</p>
        </div>
      </div>
    </div>
  );
}
