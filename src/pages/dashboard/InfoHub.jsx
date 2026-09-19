import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Building, Briefcase, Mail, Phone, MapPin, 
  CheckCircle, Globe, ChevronRight, Award, Megaphone, Users, Film, 
  Send, ExternalLink, Shield, MessageSquare, Laptop, Target, CheckCircle2 
} from "lucide-react";

export default function InfoHub() {
  const { slug } = useParams();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [careerApplied, setCareerApplied] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  // Scroll to top on page render
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Dynamic Content Data
  const getContent = () => {
    switch (slug) {
      /* ==================== ABOUT US ==================== */
      case "about":
        return {
          title: "About Ybex Media",
          subtitle: "India's most transparent open marketplace for verified creators and growth-centric brands.",
          badge: "OUR MISSION",
          heroImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
          body: (
            <div className="space-y-8">
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                Founded in 2026, <strong className="text-[var(--text-primary)]">Ybex Media</strong> (Datrux Systems Pvt. Limited) was structured to solve the single largest pain point in the Indian creator economy: <span className="text-[var(--violet)] font-semibold">The lack of rate and performance transparency.</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="p-6 rounded-2xl bg-foreground/5 border border-[var(--border-default)]">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[var(--violet)]">
                    <Shield size={18} /> Zero Middlemen Markup
                  </h3>
                  <p className="text-sm text-[var(--text-primary)]/60 leading-relaxed">
                    Most agencies charge 30-50% markups on top of creator rates. On Ybex, rate cards are public. You pay exactly what the creator quotes, secured in our neutral escrow locks.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-foreground/5 border border-[var(--border-default)]">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[var(--violet)]">
                    <Target size={18} /> Objective ROI Focus
                  </h3>
                  <p className="text-sm text-[var(--text-primary)]/60 leading-relaxed">
                    With our exclusive Performance Rank System (USP 04), creators earn scores after every delivery. The higher the score, the higher they rank, and the more top-tier campaigns they unlock.
                  </p>
                </div>
              </div>
              <div className="pt-6 border-t border-[var(--border-default)]">
                <h3 className="text-xl font-bold mb-4">Our Core Philosophy</h3>
                <ul className="space-y-3">
                  {[
                    "Trust the Data: 100% verified average reach scores from recent 30-day analytics.",
                    "Safeguard the Funds: Capital is guarded in escrow and only released upon proof-of-work verification.",
                    "Empower Local Markets: Direct support for tier-2 and tier-3 cities across India.",
                    "Nurture Long-term Collabs: High-delivering creators receive automatic re-collaboration prompts."
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--violet)] font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        };

      /* ==================== CAREERS ==================== */
      case "careers":
        return {
          title: "Join the Ybex Team",
          subtitle: "We are builders, data advocates, and creative thinkers shaping the future of influencer commerce in India.",
          badge: "WE'RE HIRING",
          body: (
            <div className="space-y-8">
              <p className="text-[var(--text-secondary)] text-base leading-relaxed">
                At Ybex Media, we are designing a product that empowers millions of creators to build real businesses, and thousands of brands to deploy ROI-driven campaigns with ease. Explore our active openings below.
              </p>

              {/* Job Listings */}
              <div className="space-y-4">
                {[
                  { title: "Senior React / Node Engineer", dept: "Engineering", loc: "Bangalore / Remote", type: "Full-Time" },
                  { title: "Creator Acquisition Specialist", dept: "Influencer Relations", loc: "Mumbai / Hybrid", type: "Full-Time" },
                  { title: "Brand Key Account Manager", dept: "Sales & Growth", loc: "Delhi NCR / Hybrid", type: "Full-Time" },
                  { title: "Design & UX Intern", dept: "Product Design", loc: "Remote", type: "Internship (6 Mos)" }
                ].map((job, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-foreground/5 border border-[var(--border-default)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[var(--violet)]/20 transition-all">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[var(--violet)] font-semibold">{job.dept}</span>
                      <h3 className="text-base font-bold mt-1 text-[var(--text-primary)]">{job.title}</h3>
                      <div className="flex gap-3 text-xs text-[var(--text-tertiary)] mt-1">
                        <span>{job.loc}</span>
                        <span>•</span>
                        <span>{job.type}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCareerApplied(false)} 
                      className="px-4 py-2 rounded-xl bg-[var(--violet)] hover:bg-[#5B3EE0] text-xs font-bold text-[var(--text-primary)] transition-all transform hover:scale-105"
                    >
                      Apply Now
                    </button>
                  </div>
                ))}
              </div>

              {/* Dynamic Careers Form */}
              <div className="mt-12 p-6 md:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/10 blur-xl rounded-full pointer-events-none"></div>
                
                {careerApplied ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-xl mb-4">✓</div>
                    <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2">Application Submitted!</h4>
                    <p className="text-sm text-[var(--text-primary)]/60">Thank you for applying. Our talent acquisition team will review your portfolio and reach out within 48 hours.</p>
                    <button onClick={() => setCareerApplied(false)} className="mt-4 text-xs text-[var(--violet)] hover:underline font-bold">Apply for another role</button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setCareerApplied(true); }} className="space-y-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Quick Application Form</h3>
                    <p className="text-xs text-[var(--text-primary)]/55">Send us your credentials. We review every single submission.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Your Name</label>
                        <input type="text" required className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Email Address</label>
                        <input type="email" required className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Desired Position</label>
                        <select className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all">
                          <option value="eng" className="bg-[var(--bg-card)]">Senior React/Node Engineer</option>
                          <option value="relations" className="bg-[var(--bg-card)]">Creator Acquisition Specialist</option>
                          <option value="sales" className="bg-[var(--bg-card)]">Brand Key Account Manager</option>
                          <option value="design" className="bg-[var(--bg-card)]">Design & UX Intern</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Portfolio / LinkedIn Link</label>
                        <input type="url" required placeholder="https://" className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Why Ybex? (Brief Cover Note)</label>
                      <textarea required rows={3} placeholder="Tell us why you wanted to join Ybex Media..." className="w-full bg-foreground/5 border border-[var(--border-default)] rounded-xl p-4 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all resize-none"></textarea>
                    </div>

                    <button type="submit" className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-xs hover:bg-[var(--violet)] hover:text-white transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,255,255,0.05)] hover:shadow-[0_4px_15px_rgba(124,58,237,0.2)]">
                      Submit My Application <Send size={12}/>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        };

      /* ==================== BLOG ==================== */
      case "blog":
        return {
          title: "Ybex Intelligence Hub",
          subtitle: "Data-backed research and market trends on the Indian creator and influencer landscape.",
          badge: "YBEX MEDIA BLOG",
          body: (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    title: "The Death of Agency Markups: How Escrow is Saving Brands 40% on Reels",
                    desc: "An in-depth look at how open marketplace models are replacing traditional influencer agency brokering in metropolitan capitals.",
                    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
                    date: "June 12, 2026",
                    read: "5 Min Read"
                  },
                  {
                    title: "Bharat Influencer Boom: Unlocking Engagement in Lucknow & Patna",
                    desc: "Recent traffic analysis shows that Tier-2 and Tier-3 micro-influencers deliver twice the organic engagement rate of Delhi-based premium stars.",
                    img: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80",
                    date: "June 05, 2026",
                    read: "8 Min Read"
                  },
                  {
                    title: "Understanding Ybex Performance Rank System (USP 04)",
                    desc: "A breakdown of how AI-scored campaign tracking automates re-collaboration alerts and maximizes ROI return metrics for Swiggy, Nykaa, and Meesho.",
                    img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
                    date: "May 28, 2026",
                    read: "4 Min Read"
                  },
                  {
                    title: "Guarding Creator Payments: Why Escrow Locks are Crucial for Solo Makers",
                    desc: "Freelance creator payment defaults are at an all-time high. Neutral tech protection prevents verification delays and guarantees zero-conflict releases.",
                    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
                    date: "May 15, 2026",
                    read: "6 Min Read"
                  }
                ].map((post, idx) => (
                  <div key={idx} className="group rounded-3xl border border-foreground/5 bg-foreground/[0.02] overflow-hidden hover:border-[var(--violet)]/20 transition-all flex flex-col h-full">
                    <div className="h-48 overflow-hidden relative">
                      <img src={post.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                      <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-[var(--violet)] text-[9px] font-black tracking-widest px-2.5 py-1 rounded-lg uppercase">
                        {post.read}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{post.date}</span>
                        <h3 className="text-base font-bold mt-1 text-[var(--text-primary)] leading-snug group-hover:text-[var(--violet)] transition-colors">{post.title}</h3>
                        <p className="text-xs text-[var(--text-primary)]/55 mt-3 leading-relaxed">{post.desc}</p>
                      </div>
                      <div className="mt-5 flex items-center gap-1.5 text-xs text-[var(--violet)] font-bold group-hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                        Read Full Article <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        };

      /* ==================== TERMS OF USE ==================== */
      case "terms":
        return {
          title: "Terms of Service",
          subtitle: "Please read these terms carefully before utilizing the Ybex Media professional network and Escrow Escrow mechanisms.",
          badge: "LEGAL & SECURITY",
          body: (
            <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
              <p className="text-xs font-mono text-[var(--text-tertiary)]">Last updated: June 15, 2026</p>
              
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-6">1. Scope of Agreement</h3>
              <p>
                These Terms of Service govern the relationship between users (Brands, Influencers, Agencies, or Celebrities) and Datrux Systems Pvt. Limited ("Company", "Ybex", "Ybex Media") regarding the use of the Ybex platform, directory interfaces, messaging consoles, and escrows.
              </p>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-6">2. Rate Card Compliance</h3>
              <p>
                Creators verify that prices published on their rate cards are accurate representations of their fees. Submitting arbitrary or fraudulent rates undermines the open market ecosystem. Brands understand and accept escrow deposit commitments prior to assigning collaboration briefs.
              </p>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-6">3. Escrow Lock System</h3>
              <p>
                Once a campaign partnership is agreed upon, the Brand deposits the negotiated fee into the Ybex Escrow system. These funds remain locked temporarily. Upon verification of appropriate deliverables (Reels, Stories, YouTube videos) satisfying the parameters of the brief, the funds are released to the Creator, minus platform service fees.
              </p>

              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-6">4. Resolution of Disputes</h3>
              <p>
                In the event of partial execution or unsatisfactory deliverables not conforming to the agreed-upon marketing brief, Ybex Mediators act as neutral arbiters inside the chat space. All decisions regarding partial or complete refund releases are final.
              </p>
            </div>
          )
        };

      /* ==================== CONTACT US ==================== */
      case "contact":
        return {
          title: "Get in Touch with Ybex",
          subtitle: "Have a custom campaign query? Or need priority agency onboarding? Simply send a brief message.",
          badge: "TALK TO US NOW",
          body: (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Form Col */}
              <div className="lg:col-span-7 bg-foreground/[0.02] border border-foreground/5 p-6 md:p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/5 blur-3xl rounded-full pointer-events-none"></div>
                
                {formSubmitted ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl mb-4">🤝</div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Message Received!</h3>
                    <p className="text-sm text-[var(--text-primary)]/60">One of our campaign strategists will reach out to you via Email/WhatsApp within the next 2-3 business hours.</p>
                    <button 
                      onClick={() => setFormSubmitted(false)} 
                      className="mt-6 px-5 py-2 hover:bg-foreground/10 text-xs text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl transition-all"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setFormSubmitted(true); }} className="space-y-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-display">Drop us a line</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Your Name</label>
                        <input type="text" required className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Your Email</label>
                        <input type="email" required className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Company / Brand Name</label>
                        <input type="text" required className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Campaign Budget (INR)</label>
                        <select className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 h-11 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all">
                          <option value="1">Under ₹50,000</option>
                          <option value="2">₹50,000 - ₹2,00,000</option>
                          <option value="3">₹2,00,000 - ₹10,00,000</option>
                          <option value="4">Over ₹10,00,000</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1 font-medium">Campaign Goals / Details</label>
                      <textarea required rows={4} placeholder="Describe what you plan to promote, required city-targets, or platform expectations..." className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C5CFF] transition-all resize-none"></textarea>
                    </div>

                    <button type="submit" className="w-full h-11 rounded-xl bg-[var(--violet)] text-white font-bold text-xs hover:bg-[var(--violet)]/90 shadow-[0_4px_15px_rgba(124,58,237,0.2)] transition-all flex items-center justify-center gap-2">
                      Send Secure Inquiry <Send size={12}/>
                    </button>
                  </form>
                )}
              </div>

              {/* Info Col */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/5 flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-[var(--violet)]/10 flex items-center justify-center text-[var(--violet)] shrink-0">📍</span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Corporate Headquarters</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Datrux Systems Pvt. Limited<br />
                      5th Floor, Block 3, Tech Park Phase II,<br />
                      Ghatkopar West, Mumbai - 400086
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/5 flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-[var(--violet)]/10 flex items-center justify-center text-[var(--violet)] shrink-0">✉</span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Electronic Support</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      General Queries: <a href="mailto:info@ybexmedia.com" className="text-[var(--text-primary)] hover:underline">info@ybexmedia.com</a><br />
                      Media & Escrow disputes: <a href="mailto:dispute@ybexmedia.com" className="text-[var(--text-primary)] hover:underline">dispute@ybexmedia.com</a>
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-foreground/[0.02] border border-foreground/5 flex gap-4">
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">📞</span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Direct Communication</h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      WhatsApp Support: <strong className="text-[var(--text-primary)] font-mono font-medium">+91 98845 XXXXX</strong><br />
                      Monday to Saturday · 10 AM to 7 PM IST
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        };

      /* ==================== INDIVIDUAL SERVICES ==================== */
      default:
        // Format slug string (such as "influencer-marketing" -> "Influencer Marketing")
        const serviceName = (slug || "")
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        return {
          title: `${serviceName} by Ybex`,
          subtitle: `Professional, performance-focused solutions to deploy, manage, and scale your ${serviceName} goals globally.`,
          badge: "YBEX BRAND SERVICES",
          heroImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
          body: (
            <div className="space-y-8">
              <p className="text-[var(--text-secondary)] text-base leading-relaxed">
                Ybex Media provides industry-grade infrastructure to automate planning, tracking, and execution for <strong className="text-[var(--text-primary)]">{serviceName}</strong> campaigns. We secure rate agreements, monitor engagement analytics, and release payments strictly after verified proof of delivery.
              </p>

              <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-default)] mt-10">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">What's Included in This Service</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Verified Data Integration: Access raw creator reach logs directly from Meta & Google integration nodes.",
                    "Contractual Protection: Automated campaign agreements detailing exact deliverables and target criteria.",
                    "Escrow Security Mechanism: Keep budgets guarded safely in neutral escrow boxes until campaigns close.",
                    "Leadership Board Visibility: Automated inclusion of creators in our ROI scoring and leaderboard ranking.",
                    "24-Hour Moderation: Support staff available directly inside your collaborative workspace chats.",
                    "Detailed ROI Dashboard: Track total impressions, Cost Per Click (CPC), and true consumer conversions."
                  ].map((inc, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-xs text-[var(--text-secondary)] leading-relaxed">
                      <span className="text-[var(--violet)] font-bold mt-0.5 shrink-0">✓</span>
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Call to Action inside current page */}
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#7C5CFF]/15 to-transparent border border-[var(--violet)]/20 text-center relative overflow-hidden mt-12">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--violet)]/15 blur-3xl rounded-full pointer-events-none"></div>
                <span className="inline-flex gap-1.5 items-center text-[10px] uppercase bg-[var(--violet)]/20 text-[#B19CFF] px-2.5 py-1 rounded-full font-black tracking-widest mb-4">Ybex Direct Onboarding</span>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">Launch Your Next Campaign Instantly</h3>
                <p className="text-xs text-[var(--text-primary)]/60 max-w-lg mx-auto mb-6">Create your brand account, search verified creator rosters, review transparent rate cards, and unlock maximum engagement now.</p>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link to="/signup?role=brand" className="px-5 py-2.5 bg-[var(--violet)] hover:bg-[var(--violet-hover)] text-white font-semibold rounded-xl text-xs transform hover:scale-105 transition-all outline-none">
                    Start Campaign Brief
                  </Link>
                  <Link to="/creators" className="px-5 py-2.5 bg-foreground/5 hover:bg-foreground/10 border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl text-xs font-semibold hover:scale-105 transition-all">
                    Explore Roster Rates
                  </Link>
                </div>
              </div>
            </div>
          )
        };
    }
  };

  const content = getContent();

  return (
    <div className="text-[var(--text-primary)] min-h-screen relative overflow-hidden bg-[var(--bg-base)] pb-24 font-sans leading-relaxed">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[var(--violet)]/10 blur-[130px]"></div>
        <div className="absolute top-80 left-1/4 w-[300px] h-[300px] rounded-full bg-[var(--violet)]/5 blur-[100px]"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 pt-12 md:pt-16">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-6 font-medium">
          <Link to="/" className="hover:text-[var(--text-primary)] transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text-primary)]/80">{content.title}</span>
        </div>

        {/* Dynamic Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-block"
        >
          <span className="inline-flex gap-1.5 items-center text-[10px] uppercase tracking-widest font-black bg-[var(--violet)]/15 border border-[var(--violet)]/20 text-[#B19CFF] px-3 py-1 rounded-full mb-4">
             {content.badge}
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4 leading-tight"
        >
          {content.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-base sm:text-lg text-[var(--text-primary)]/60 mb-12 font-medium leading-relaxed max-w-2xl"
        >
          {content.subtitle}
        </motion.p>

        {/* Optional Hero Image Banner */}
        {content.heroImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden border border-[var(--border-default)] mb-12"
          >
            <img src={content.heroImage} alt="" className="w-full h-full object-cover" />
          </motion.div>
        )}

        {/* Body Content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10"
        >
          {content.body}
        </motion.div>
      </div>

      {/* Embedded Simple Footer for marketing secondary pages */}
      <div className="max-w-4xl mx-auto px-6 mt-24 border-t border-foreground/5 pt-8 text-[10px] tracking-wider text-[var(--text-primary)]/30 font-medium flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>© 2026 Datrux Systems Pvt. Limited. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-[var(--text-primary)] transition-all">Back to Home</Link>
          <span>·</span>
          <a href="https://ybexmedia.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] font-bold text-[var(--violet)]">YBEXMEDIA.COM</a>
        </div>
      </div>
    </div>
  );
}
