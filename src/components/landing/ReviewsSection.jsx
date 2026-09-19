import React from "react";
import { motion } from "framer-motion";
import { Star, ShieldCheck, Building2, UserCheck, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";
import { useState, useEffect } from "react";

const CREATOR_REVIEWS_TOP = [
  {
    id: "c1",
    name: "Ravi Sharma",
    handle: "@tech_ravi",
    location: "Delhi",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    role: "Tech & Gadgets Creator",
    rating: 5.0,
    quote: "Closed 3 brand deals in my first month without paying a single rupee agency commission! Ybex rate card transparency is a total game changer.",
    metric: "₹65,000 Earned · 0% Fee",
    type: "creator"
  },
  {
    id: "c2",
    name: "Ananya Iyer",
    handle: "@ananyastyle",
    location: "Bangalore",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    role: "Beauty & Fashion Creator",
    rating: 5.0,
    quote: "No middleman taking 30% cuts. Escrow locked payment directly transferred to my UPI right after reel submission. Super smooth experience!",
    metric: "12 Collabs Completed",
    type: "creator"
  },
  {
    id: "c3",
    name: "Karan Bajaj",
    handle: "@karan_fitness",
    location: "Mumbai",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    role: "Fitness & Wellness Creator",
    rating: 5.0,
    quote: "Got selected for a national brand campaign within 2 days of joining. Direct chat with brand manager without spam emails.",
    metric: "Fastest 24h Payouts",
    type: "creator"
  },
  {
    id: "c4",
    name: "Priya Deshmukh",
    handle: "@priya_cooks",
    location: "Pune",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    role: "Food & Recipe Creator",
    rating: 5.0,
    quote: "As a tier-2 city creator, agencies used to ignore me or quote peanuts. On Ybex, brands evaluate my real reach and pay my exact rate card.",
    metric: "₹40,000 / mo Avg",
    type: "creator"
  },
  {
    id: "c5",
    name: "Aman Verma",
    handle: "@vlogwithaman",
    location: "Jaipur",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    role: "Travel & Lifestyle Creator",
    rating: 5.0,
    quote: "The performance rank score helped me land repeat deals with top D2C brands. Transparency builds real trust.",
    metric: "9.8 Performance Score",
    type: "creator"
  },
  {
    id: "c6",
    name: "Sneha Gupta",
    handle: "@glamwithsneha",
    location: "Kolkata",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
    role: "Lifestyle Creator",
    rating: 5.0,
    quote: "Everything is so clean and organized. Escrow payments mean I never have to chase brands for unpaid invoices again!",
    metric: "100% Secure Escrow",
    type: "creator"
  }
];

const BRAND_REVIEWS_MIDDLE = [
  {
    id: "b1",
    name: "Nykaa",
    handle: "Deepak Mehta",
    location: "Influencer Lead",
    avatar: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=120&auto=format&fit=crop&q=80",
    role: "E-Commerce & Beauty Brand",
    rating: 5.0,
    quote: "We hired 40+ micro-creators across 15 cities for our summer sale. Hyperlocal filters and verified engagement saved us 2+ weeks of manual outreach.",
    metric: "3.4x Campaign ROI",
    type: "brand"
  },
  {
    id: "b2",
    name: "boAt Audio",
    handle: "Rahul Kapoor",
    location: "Performance Marketing",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80",
    role: "Consumer Electronics Brand",
    rating: 5.0,
    quote: "By bypassing traditional agency 20% markups, we saved ₹3.5 Lakhs on creator budget while scaling reel views to over 8 Million.",
    metric: "Saved ₹3.5L Agency Cuts",
    type: "brand"
  },
  {
    id: "b3",
    name: "Mamaearth",
    handle: "Tanya Roy",
    location: "Brand Partnerships",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    role: "Personal Care Brand",
    rating: 5.0,
    quote: "Rate card visibility is revolutionary. We could plan budgets instantly without waiting days for agency rate negotiation emails.",
    metric: "25+ Verified Creators",
    type: "brand"
  },
  {
    id: "b4",
    name: "Wow Skin Science",
    handle: "Vikramjit Singh",
    location: "Digital Marketing Dir.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    role: "Wellness & Beauty Brand",
    rating: 5.0,
    quote: "The escrow payment system gives us complete peace of mind. We lock funds upfront and approve content only when deliverables match standards.",
    metric: "100% On-time Deliveries",
    type: "brand"
  },
  {
    id: "b5",
    name: "Bewakoof",
    handle: "Simran Kaur",
    location: "Content & PR Manager",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    role: "Apparel & Youth Fashion",
    rating: 5.0,
    quote: "Ybex hyperlocal city search helped us discover untapped regional creators in Tier 2 cities who produced incredible high-converting UGC content.",
    metric: "12M+ Reel Views",
    type: "brand"
  },
  {
    id: "b6",
    name: "Noise",
    handle: "Aditya Saxena",
    location: "Growth Manager",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    role: "Smart Wearables Brand",
    rating: 5.0,
    quote: "No long contracts, no agency overheads. Launching a 20-creator campaign now takes 15 minutes instead of 3 weeks.",
    metric: "15-Min Campaign Launch",
    type: "brand"
  }
];

const CREATOR_REVIEWS_BOTTOM = [
  {
    id: "c7",
    name: "Rohan Joshi",
    handle: "@rohan_tech",
    location: "Hyderabad",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80",
    role: "Gaming & Tech Creator",
    rating: 5.0,
    quote: "Loved the dashboard interface! I can showcase my YouTube and Instagram statistics directly and receive custom campaign briefs.",
    metric: "8 YouTube Collabs",
    type: "creator"
  },
  {
    id: "c8",
    name: "Kavya Nair",
    handle: "@kavyanair_official",
    location: "Kochi",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80",
    role: "Fashion & Beauty Creator",
    rating: 5.0,
    quote: "Finally a platform built for Indian creators! Transparency, instant notifications, and zero cut-throat commission deduction.",
    metric: "₹55,000 Total Earnings",
    type: "creator"
  },
  {
    id: "c9",
    name: "Arjun Mehta",
    handle: "@fit_arjun",
    location: "Ahmedabad",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80",
    role: "Fitness & Sports Creator",
    rating: 5.0,
    quote: "Ybex ranking system boosted my profile visibility. Got contacted by 4 top wellness brands within 2 weeks!",
    metric: "9.9 Rank Rating",
    type: "creator"
  },
  {
    id: "c10",
    name: "Meera Singhania",
    handle: "@meera_lifestyle",
    location: "Lucknow",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    role: "Lifestyle & Travel Creator",
    rating: 5.0,
    quote: "Direct chat with brand managers saves endless back and forth. Deliverables approval and escrow payout happen seamlessly.",
    metric: "0% Commission",
    type: "creator"
  },
  {
    id: "c11",
    name: "Siddharth Malhotra",
    handle: "@sid_reviews",
    location: "Chandigarh",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=120&auto=format&fit=crop&q=80",
    role: "Gadgets & Gear Creator",
    rating: 5.0,
    quote: "I used to lose 25% to agency managers. On Ybex, 100% of my quoted rate comes straight to my bank account.",
    metric: "₹80,000 / mo Revenue",
    type: "creator"
  },
  {
    id: "c12",
    name: "Divya Sharma",
    handle: "@divya_dance",
    location: "Indore",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
    role: "Dance & Performing Arts",
    rating: 5.0,
    quote: "Super quick approval and safe payment release. Every creator in India needs to get on Ybex right now!",
    metric: "18 Collabs Completed",
    type: "creator"
  }
];

function ReviewCard({ review }) {
  const isBrand = review.type === "brand";

  return (
    <div
      id={`review-card-${review.id}`}
      className={`w-full p-5 sm:p-6 rounded-2xl bg-white border transition-all duration-300 group flex flex-col justify-between relative overflow-hidden mb-5 ${
        isBrand
          ? "border-emerald-200 hover:border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.06)] hover:shadow-lg"
          : "border-gray-200/90 hover:border-[#5846E0]/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg"
      }`}
    >
      <div>
        {/* Top Bar: Profile */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name || "User")}&background=5846E0&color=fff`}
                alt={review.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name || "User")}&background=5846E0&color=fff`;
                }}
              />
            </div>
            <div className="truncate">
              <h4 className="font-display font-bold text-sm text-[#111827] truncate flex items-center gap-1">
                {review.name}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {review.handle}{review.location ? ` • ${review.location}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Quote Text */}
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed italic line-clamp-3">
          "{review.quote}"
        </p>
      </div>

      {/* Footer Metric Pill */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-400 truncate max-w-[150px]">
          {review.role || review.category}
        </span>
        {review.metric && (
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
              review.metricColor === "green" || (isBrand && (!review.metricColor || review.metricColor === "green"))
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : review.metricColor === "blue"
                  ? "text-blue-700 bg-blue-50 border border-blue-200"
                  : "text-[#5846E0] bg-[#5846E0]/10 border border-[#5846E0]/20"
            }`}
          >
            {review.metric}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ReviewsSection() {
  const [reviewsData, setReviewsData] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/landing-reviews", { bypassCache: true })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setReviewsData(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load landing reviews from backend:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const mapRev = (r) => {
    const roleParts = (r.author_role || "").split(" • ");
    const handle = roleParts[0] || r.author_role || "";
    const location = roleParts.length > 1 ? roleParts.slice(1).join(" • ") : "";
    return {
      id: r.id,
      name: r.author_name || "Creator",
      handle: handle,
      location: location,
      avatar: r.author_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.author_name || "User")}&background=5846E0&color=fff`,
      role: r.category || (r.type === "brand" ? "Brand Partner" : "Creator"),
      category: r.category,
      rating: 5.0,
      quote: r.content || "",
      metric: r.highlight_text,
      metricColor: r.highlight_color || (r.type === "brand" ? "green" : "purple"),
      type: r.type || "creator"
    };
  };

  let col1Items = [];
  let col2Items = [];
  let col3Items = [];

  if (reviewsData.length > 0) {
    const mapped = reviewsData.map(mapRev);
    const creatorReviews = mapped.filter((r) => r.type === "creator");
    const brandReviews = mapped.filter((r) => r.type === "brand");

    const effectiveCreators = creatorReviews.length > 0 ? creatorReviews : [...CREATOR_REVIEWS_TOP, ...CREATOR_REVIEWS_BOTTOM];
    const effectiveBrands = brandReviews.length > 0 ? brandReviews : BRAND_REVIEWS_MIDDLE;

    const mid = Math.ceil(effectiveCreators.length / 2);
    const topCreators = effectiveCreators.slice(0, mid);
    const bottomCreators = effectiveCreators.slice(mid);

    col1Items = topCreators.length > 0 ? topCreators : CREATOR_REVIEWS_TOP;
    col2Items = effectiveBrands;
    col3Items = bottomCreators.length > 0 ? bottomCreators : (topCreators.length > 0 ? topCreators : CREATOR_REVIEWS_BOTTOM);
  } else {
    col1Items = CREATOR_REVIEWS_TOP;
    col2Items = BRAND_REVIEWS_MIDDLE;
    col3Items = CREATOR_REVIEWS_BOTTOM;
  }

  // Duplicate arrays for smooth 100% infinite vertical loop
  const seamlessCol1 = [...col1Items, ...col1Items, ...col1Items].slice(0, Math.max(6, col1Items.length * 2));
  const seamlessCol2 = [...col2Items, ...col2Items, ...col2Items].slice(0, Math.max(6, col2Items.length * 2));
  const seamlessCol3 = [...col3Items, ...col3Items, ...col3Items].slice(0, Math.max(6, col3Items.length * 2));

  return (
    <section
      className="py-16 sm:py-24 bg-[#FAFAFC] relative overflow-hidden"
      data-testid="reviews-section"
    >
      {/* Background Soft Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-[#5846E0]/5 blur-[140px]" />
      </div>

      <div className="relative max-w-none px-4 sm:px-6 lg:px-8 z-10 mb-12 text-center">
        {/* Section Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-[#111827] tracking-tight"
        >
          Loved by <span className="bg-gradient-to-r from-[var(--violet)] to-[#5B3EE0] bg-clip-text text-transparent">Creators</span>. Trusted by <span className="bg-gradient-to-r from-[var(--violet)] to-[#5B3EE0] bg-clip-text text-transparent">Brands</span>.
        </motion.h2>
      </div>

      {/* ================= 3-COLUMN INFINITE VERTICAL MARQUEE ================= */}
      <div className="relative z-10 max-w-none px-4 sm:px-6 lg:px-8 h-[640px] md:h-[700px] overflow-hidden marquee-col-container">
        {/* Top & Bottom Gradient Fades */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#FAFAFC] via-[#FAFAFC]/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FAFAFC] via-[#FAFAFC]/80 to-transparent z-20 pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          {/* COLUMN 1: Creator Reviews (Scrolls UP) */}
          <div className="overflow-hidden">
            <div className="marquee-col-up">
              {seamlessCol1.map((review, index) => (
                <ReviewCard key={`col1-${review.id}-${index}`} review={review} />
              ))}
            </div>
          </div>

          {/* COLUMN 2: Brand Reviews (Scrolls DOWN - Middle Column) */}
          <div className="overflow-hidden hidden md:block">
            <div className="marquee-col-down">
              {seamlessCol2.map((review, index) => (
                <ReviewCard key={`col2-${review.id}-${index}`} review={review} />
              ))}
            </div>
          </div>

          {/* COLUMN 3: Creator Reviews (Scrolls UP - Right Column) */}
          <div className="overflow-hidden hidden md:block">
            <div className="marquee-col-up">
              {seamlessCol3.map((review, index) => (
                <ReviewCard key={`col3-${review.id}-${index}`} review={review} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Trust Note */}
      <div className="relative z-10 max-w-none px-4 mt-10 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200/80 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>All reviews verified from active creators and brands registered on Ybex</span>
        </div>
      </div>
    </section>
  );
}
