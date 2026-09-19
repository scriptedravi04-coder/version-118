import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { 
  Camera, Edit2, MapPin, Instagram, Youtube, Globe, Link as LinkIcon, 
  CheckCircle, TrendingUp, ShieldCheck, Brain, Image as ImageIcon,
  Award, Briefcase, ChevronRight, BookOpen, AlertCircle, Loader2, Info, X
} from "lucide-react";

export default function MyProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  
  // Dynamic states
  const [profileData, setProfileData] = useState(null);
  const [collabs, setCollabs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Policy Modal States
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState("terms"); // 'terms' | 'privacy' | 'escrow'

  useEffect(() => {
    if (!user) return;
    
    const fetchAllData = async () => {
      setLoadingProfile(true);
      try {
        // 1. Fetch Profile
        const profileRes = await api.get(`/creators/${user.user_id}/profile`).catch(() => null);
        if (profileRes?.data) {
          const d = profileRes.data;
          setProfileData({
            name: d.name || user.name || "Creator",
            category: d.category || "Content Creator",
            city: d.city || "Not Specified",
            state: d.state || "Not Specified",
            performance_score: d.performance_score || 0,
            followers: d.followers || "0",
            instagram_handle: d.instagram_handle || "",
            youtube: d.youtube || "",
            about: d.about || "No profile bio written yet. Click 'Edit Settings' to customize your creator profile, select categories, set your city, and write an awesome about section!",
            rate_card: d.rate_card || { reels: "0", stories: "0", youtube_integration: "0" },
            sub_categories: d.sub_categories || ["General"]
          });
        } else {
          // Fallback static profile matching the actual logged-in user
          setProfileData({
            name: user.name || "Creator",
            category: "Content Creator",
            city: "Not Specified",
            state: "Not Specified",
            performance_score: 0,
            followers: "0",
            instagram_handle: "",
            youtube: "",
            about: "No profile bio written yet. Click 'Edit Settings' to customize your creator profile, select categories, set your city, and write an awesome about section!",
            rate_card: {
              reels: "0",
              stories: "0",
              youtube_integration: "0"
            },
            sub_categories: ["General"]
          });
        }

        // 2. Fetch Collaborations/Applications
        const collabsRes = await api.get("collabs").catch(() => null);
        if (collabsRes?.data?.campaign_applications && collabsRes.data.campaign_applications.length > 0) {
          setCollabs(collabsRes.data.campaign_applications);
        } else {
          // No active collaborations, use clean empty state
          setCollabs([]);
        }

        // 3. Fetch Leaderboard to locate current user rank
        const leaderboardRes = await api.get("leaderboard").catch(() => null);
        if (leaderboardRes?.data) {
          setLeaderboard(leaderboardRes.data);
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchAllData();
  }, [user]);

  // Load AI suggestions
  useEffect(() => {
    if (profileData) {
      loadSuggestions(profileData);
    }
  }, [profileData]);

  const loadSuggestions = async (creatorObj) => {
    if (loadingSuggestions) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await api.post("ai/profile-suggestions", { creator: creatorObj });
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else {
        // Fallback default suggestions
        setSuggestions([
          { title: "Complete your Bio & Location", description: "Brands filter creators by city (e.g. Mumbai, Delhi). Complete this to boost score by 15 points instantly.", category: "Bio" },
          { title: "Link Instagram & YouTube Channels", description: "Verify your reach and raise transparency score by 20 points.", category: "Socials" },
          { title: "Add recent Campaign work", description: "A robust portfolio showing past brand deals is the absolute best way to attract high ticket brands.", category: "Portfolio" },
          { title: "Optimize your rates card", description: "Setting competitive rates for reels & stories makes it easy for brands to initiate direct handshakes.", category: "Rates" }
        ]);
      }
    } catch (err) {
      console.error("Error fetching AI suggestions, applying fallback:", err);
      setSuggestions([
        { title: "Complete your Bio & Location", description: "Brands filter creators by city (e.g. Mumbai, Delhi). Complete this to boost score by 15 points instantly.", category: "Bio" },
        { title: "Link Instagram & YouTube Channels", description: "Verify your reach and raise transparency score by 20 points.", category: "Socials" },
        { title: "Add recent Campaign work", description: "A robust portfolio showing past brand deals is the absolute best way to attract high ticket brands.", category: "Portfolio" },
        { title: "Optimize your rates card", description: "Setting competitive rates for reels & stories makes it easy for brands to initiate direct handshakes.", category: "Rates" }
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Find user rank
  const myRank = leaderboard.length > 0 
    ? leaderboard.findIndex(item => item.user_id === user?.user_id) + 1 
    : 0;
  const displayRank = myRank > 0 ? `#${myRank}` : "#4";

  if (loadingProfile) {
    return (
      <div className="w-full max-w-[1100px] mx-auto px-4 md:px-8 py-10 pb-20 space-y-8 animate-pulse">
        {/* Cover Skeleton */}
        <div className="h-48 md:h-64 bg-slate-100 rounded-3xl" />
        {/* Profile Info Skeleton */}
        <div className="flex flex-col md:flex-row justify-between gap-6 px-4">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-slate-100 rounded-lg" />
            <div className="h-4 w-48 bg-slate-100 rounded-lg" />
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-100 rounded-lg" />
            <div className="h-10 w-32 bg-slate-100 rounded-lg" />
          </div>
        </div>
        {/* Tabs Skeleton */}
        <div className="h-12 bg-slate-100 rounded-xl" />
        {/* Body Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-slate-100 rounded-3xl" />
            <div className="h-64 bg-slate-100 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-slate-100 rounded-3xl" />
            <div className="h-48 bg-slate-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  // Get score details
  const score = profileData?.performance_score || 94;

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 md:px-8 py-10 pb-20 relative" data-testid="profile-page">
      {/* Glow highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[var(--violet)]/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Cover & Avatar Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-100 h-48 md:h-64 border border-[var(--border-default)] mb-16 shadow-lg">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-40 mix-blend-luminosity" 
          alt="Banner cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
        <Link 
          to="/dashboard/settings" 
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-white transition-all border border-slate-200 shadow-sm"
        >
          <Camera size={14}/> Change Cover
        </Link>
        
        <div className="absolute -bottom-12 left-8 flex items-end gap-5">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden relative group shadow-md">
            <img 
              src={user?.avatar || "" + encodeURIComponent(profileData?.name || "Ravi Kumar") + "&background=7C3AED&color=fff"} 
              className="w-full h-full object-cover" 
              alt="Avatar"
            />
            <Link 
              to="/dashboard/settings" 
              className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="text-white" size={24} />
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Details Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1 mb-10 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {profileData?.name || "Ravi Kumar"} 
            <CheckCircle className="text-[var(--violet)] fill-[var(--violet)]/10" size={24} />
          </h1>
          <p className="text-slate-600 font-semibold mt-1.5 flex items-center gap-2">
            {profileData?.category || "Fashion & Lifestyle Creator"} 
            <span className="text-slate-300">|</span> 
            <MapPin size={15} className="text-slate-400" /> {profileData?.city || "Mumbai"}, {profileData?.state || "IN"}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-4">
            <a 
              href={`https://instagram.com/${profileData?.instagram_handle || "ravik"}`}
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-pink-500/10 text-pink-600 rounded-xl text-xs font-bold border border-pink-500/20 hover:bg-pink-500/15 transition-all"
            >
              <img src="/assets/instagram.png" className="w-3.5 h-3.5 object-contain" alt="Instagram" /> @{profileData?.instagram_handle || "ravik"}
            </a>
            <a 
              href={`https://youtube.com/${profileData?.youtube || "RaviVlogs"}`}
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 text-red-600 rounded-xl text-xs font-bold border border-red-500/20 hover:bg-red-500/15 transition-all"
            >
              <img src="/assets/youtube.png" className="w-3.5 h-3.5 object-contain" alt="YouTube" /> {profileData?.youtube || "RaviVlogs"}
            </a>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + `/creator/${user?.user_id || "demo"}`);
              toast.success("Profile link copied! Share with brands.");
            }}
            className="flex-1 md:flex-none px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Globe size={16}/> Public Link
          </button>
          <Link 
            to="/dashboard/settings"
            className="flex-1 md:flex-none px-5 py-3 bg-[var(--violet)] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#6D4AE5] transition-all shadow-lg shadow-[var(--violet)]/15 hover:-translate-y-0.5"
          >
            <Edit2 size={16}/> Edit Details
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto hide-scrollbar scroll-smooth relative z-10 gap-2 py-1">
        {["Overview", "Portfolio & Past Work", "Rates & Services"].map(tab => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-3 font-extrabold text-sm whitespace-nowrap transition-colors rounded-xl cursor-pointer z-10 ${
                isActive 
                  ? 'text-[var(--violet)]' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="myProfileTabPill"
                  className="absolute inset-0 bg-[var(--violet)]/10 rounded-xl border border-[var(--violet)]/20 shadow-xs z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Main Content Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === "Overview" && (
            <>
              {/* About block */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative group">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900">About Me</h3>
                  <Link to="/dashboard/settings" className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors">
                    <Edit2 size={16}/>
                  </Link>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">
                  {profileData?.about || "I am a passionate lifestyle and fashion creator based in Mumbai. With over 3 years of experience creating high-quality content, I specialize in aesthetic reels, style guides, and urban lifestyle photography. I've worked with top brands to drive authentic engagement and conversions."}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {(profileData?.sub_categories || ["Fashion", "Lifestyle", "Travel", "Streetwear"]).map(tag => (
                    <span 
                      key={tag} 
                      className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Recommendations Module using dynamic Gemini responses */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      
                      AI Profile Improvement Tips
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Gemini-powered checklist specifically tailored for your stats</p>
                  </div>
                  <button 
                    onClick={() => loadSuggestions(profileData)}
                    disabled={loadingSuggestions}
                    className="self-start sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-50"
                  >
                    {loadingSuggestions ? (
                      <><Loader2 size={13} className="animate-spin" /> Fetching...</>
                    ) : (
                      <> Regenerate Tips</>
                    )}
                  </button>
                </div>

                {loadingSuggestions ? (
                  <div className="space-y-4 py-6">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-indigo-500" />
                      <span className="text-sm font-bold text-slate-600">Analyzing your portfolio metrics...</span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestions?.map((tip, idx) => (
                      <div 
                        key={idx} 
                        className="bg-slate-50/50 border border-slate-150/70 rounded-2xl p-4 flex gap-3 hover:border-indigo-400/30 transition-all duration-300"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                          {tip.category ? tip.category.substring(0,2).toUpperCase() : "AI"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{tip.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "Portfolio & Past Work" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Past Brand Deals & Applications</h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time status tracking of your campaigns</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {collabs.length} campaigns
                  </span>
                </div>

                <div className="space-y-4">
                  {collabs?.map((collab, index) => (
                    <div 
                      key={collab.application_id || index} 
                      className="border border-slate-150 rounded-2xl p-5 hover:bg-slate-50/50 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                            {collab.brand_name || "Nova Brand"}
                          </span>
                          <h4 className="font-bold text-slate-900 text-base mt-1.5">{collab.campaign_title}</h4>
                        </div>
                        <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full border ${
                          collab.status === "approved" || collab.status === "accepted"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : collab.status === "delivered" || collab.status === "completed"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>
                          {collab.status || "pending"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium italic mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        "{collab.pitch || "No custom pitch text submitted."}"
                      </p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                        <span>Payout proposed</span>
                        <strong className="text-slate-800 font-extrabold text-sm">
                          ₹{(collab.proposed_amount || 15000).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  ))}

                  {collabs.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <Briefcase size={36} className="mx-auto mb-3 opacity-40" />
                      <p className="font-bold">No campaign applications found</p>
                      <p className="text-xs mt-1">Apply to live collaborations on the Explore feed to populate your portfolio!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Rates & Services" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">My Rates (INR)</h3>
                  <p className="text-xs text-slate-500 mt-1">Starting prices for standard marketing deliverables</p>
                </div>
                <Link to="/dashboard/settings" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-all">
                  Edit Rates
                </Link>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center"><img src="/assets/instagram.png" className="w-[18px] h-[18px] object-contain" alt="Instagram" /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Instagram Reel</p>
                      <p className="text-xs text-slate-400">Up to 60s video with product integration</p>
                    </div>
                  </div>
                  <p className="font-extrabold text-slate-900 text-base">₹{profileData?.rate_card?.reels || "15,000"}</p>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center"><img src="/assets/instagram.png" className="w-[18px] h-[18px] object-contain" alt="Instagram" /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Instagram Story</p>
                      <p className="text-xs text-slate-400">24-hour slide with clickable swipe-up Link</p>
                    </div>
                  </div>
                  <p className="font-extrabold text-slate-900 text-base">₹{profileData?.rate_card?.stories || "5,000"}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center"><img src="/assets/youtube.png" className="w-[18px] h-[18px] object-contain" alt="YouTube" /></div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">YouTube Dedicated Integration</p>
                      <p className="text-xs text-slate-400">60-90 seconds co-promotional segment</p>
                    </div>
                  </div>
                  <p className="font-extrabold text-slate-900 text-base">₹{profileData?.rate_card?.youtube_integration || "25,000"}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          
          {/* AI Score Card Widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--violet)]/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Brain className="text-[var(--violet)]" size={20} /> AI Profile Score
                </h3>
                <p className="text-xs text-slate-400 mt-1">Consolidated quality parameter</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--violet)] to-[#00f2fe] p-[3px] shadow-md shrink-0">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-base text-slate-900">
                  {score}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-600">Audience Quality</span>
                  <span className="font-extrabold text-emerald-500">Excellent</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-600">Engagement Consistency</span>
                  <span className="font-extrabold text-[var(--violet)]">High</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--violet)] rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-600">Brand Match Potential</span>
                  <span className="font-extrabold text-amber-500">Very Good</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-150 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">Authenticity</p>
                <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500"/> 98.2%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold mb-1">Growth Velocity</p>
                <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                  <TrendingUp size={14} className="text-[var(--violet)]"/> +14.5% /mo
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Position Widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative group overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full pointer-events-none" />
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="text-amber-500" size={18} />
                Leaderboard Position
              </h3>
              <Link 
                to="/leaderboard" 
                className="text-[11px] font-extrabold text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                See Leaderboard <ChevronRight size={12} />
              </Link>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xl shrink-0">
                🏆
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Ranking</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">{displayRank}</span>
                  <span className="text-xs text-emerald-500 font-bold">▲ 2 positions</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-medium">Ranked among top creators in your niche based on campaign success ratios.</p>
          </div>

          {/* Guidelines and Policy Widget */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" size={18} /> Legal & Safety Governing
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              We secure your collaborative contract parameters, communication logs, and payout release routes held under the Ybex escrow agreement.
            </p>
            <div className="space-y-2 pt-2">
              <button 
                onClick={() => { setPolicyTab("terms"); setPolicyOpen(true); }}
                className="w-full text-left px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
              >
                <span>Terms of Service</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
              <button 
                onClick={() => { setPolicyTab("privacy"); setPolicyOpen(true); }}
                className="w-full text-left px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
              >
                <span>User Privacy Safeguards</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
              <button 
                onClick={() => { setPolicyTab("escrow"); setPolicyOpen(true); }}
                className="w-full text-left px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
              >
                <span>Escrow Protection Policies</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* POLICY MODAL DIALOG */}
      {policyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPolicyOpen(false)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X size={20}/>
            </button>
            
            <div className="flex gap-2.5 border-b border-slate-150 pb-4 mb-6 pr-8">
              <button 
                onClick={() => setPolicyTab("terms")} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  policyTab === "terms" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => setPolicyTab("privacy")} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  policyTab === "privacy" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setPolicyTab("escrow")} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  policyTab === "escrow" 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                Escrow Protection
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scroll-thin">
              {policyTab === "terms" && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-600 font-medium">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Governing Platform Terms</h3>
                  <p>
                    Welcome to Ybex. By registering a creator profile, setting rate-cards, and utilizing our matchmaking interface, you enter a binding governance contract governed strictly by the laws of India.
                  </p>
                  <p>
                    Creators agree that all deliverables, content copyrights, and brand requirements specified under accepted campaigns will be delivered strictly as written, conforming to schedule parameters. Late or non-compliant actions can compromise milestone release cycles.
                  </p>
                  <h4 className="font-bold text-slate-800">User Eligibility & Accountability</h4>
                  <p>
                    All creators must maintain verified and legitimate identity details. Simulated or misleading analytics represent a material violation of this agreement and lead to instant platform suspension.
                  </p>
                </div>
              )}

              {policyTab === "privacy" && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-600 font-medium">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">User Data Privacy Policy</h3>
                  <p>
                    Our dynamic platform strictly handles data to process matches and verify legitimacy. No behavior-tracking cookies or external analytics pixels are embedded into your personal user portal.
                  </p>
                  <p>
                    Data collected contains public social links, city parameters, niche tags, and verified UPI profiles to execute payouts. If a creator wants to terminate their profile, we clear all active logs securely from the primary database instance within 48 hours.
                  </p>
                  <h4 className="font-bold text-slate-800">Auditing and Information Access</h4>
                  <p>
                    Registered and verified brand partners are authorized to search and view public creator fields. Private contact parameters (phone/email) are protected and only shown once mutual handshakes or campaign applications are confirmed.
                  </p>
                </div>
              )}

              {policyTab === "escrow" && (
                <div className="space-y-4 text-xs leading-relaxed text-slate-600 font-medium">
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">Dynamic Escrow Protection Policies</h3>
                  <p>
                    To ensure secure partnerships, Ybex manages campaign payouts via an Escrow container setup. Brands pre-fund the total approved amount before creators initiate production on deliverables.
                  </p>
                  <p>
                    Pre-funded amounts are held securely in a container state and only released once deliverables are submitted, approved, and verified. In case of campaign modification or disputes, the compliance committee acts as mediator to audit logs and allocate funds proportionately.
                  </p>
                  <h4 className="font-bold text-slate-800">Dispute & Compensation Protocols</h4>
                  <p>
                    Dispute claims must be filed directly inside the chat workspace within 72 hours of deliverable submission. Our compliance framework arbitrates based strictly on clear textual brief metrics.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-150 pt-4 mt-6 flex justify-end">
              <button 
                onClick={() => setPolicyOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close Policies
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
