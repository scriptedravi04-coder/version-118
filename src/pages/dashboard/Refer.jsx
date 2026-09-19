import React, { useState, useEffect } from "react";
import { formatAmount } from "../../utils/safeFormat";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { Gift, Copy, Check, Share2, Mail, Twitter, MessageSquare, ArrowRight, Award, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Refer() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total_referred: 0, rewards_earned: 0, reward_amount: 1000 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const { data } = await api.get("referral/stats");
      if (data) {
        setStats({
          total_referred: data.total_referred || 0,
          rewards_earned: data.rewards_earned || 0,
          reward_amount: data.reward_amount || (user?.role === 'brand' ? 1000 : 500)
        });
      }
    } catch (err) {
      console.warn("Failed to fetch referral stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const isBrand = user?.role === "brand";
  const rewardFormatted = `₹${(stats.reward_amount || (isBrand ? 1000 : 500)).toLocaleString('en-IN')}`;
  
  // Generate a clean referral code based on the user's name or id
  const userNameClean = (user?.name || "User").replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const userUniquePart = (user?.user_id || user?.id || "YBEX").slice(0, 4).toUpperCase();
  const referralCode = `${userNameClean}${userUniquePart}`;
  
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard! 📋");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = isBrand
    ? `Hey! I'm hiring creators on YBEX with zero hidden commissions. Use my referral link to sign up, and we both get ${rewardFormatted} platform credit! ${referralLink}`
    : `Hey! Sign up as a creator or brand on YBEX, India's most transparent influencer marketplace with zero commission fees. Use my link to get ${rewardFormatted} reward: ${referralLink}`;

  const shareViaWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareViaTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareViaEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent("Join Ybex - India's Transparent Influencer Marketplace")}&body=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <div className="w-full max-w-none px-4 md:px-8 py-10">
      {/* Header section with high-impact visual representation */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-[#7C3AED] to-purple-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider uppercase mb-6 border border-white/10">
            <Gift size={12} className="text-amber-300" /> Exclusive Invitation
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
            Refer & Get <span className="text-amber-300">{rewardFormatted}</span> Reward
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base md:text-lg font-medium leading-relaxed mb-6">
            {isBrand
              ? `Invite other brands or creators to join India's most transparent influencer marketplace. When they complete their first campaign, both of you get ${rewardFormatted} platform credit!`
              : `Grow the ecosystem with us. Refer brands or creators to YBEX. You get ${rewardFormatted} cash reward paid directly to your bank account once your referral completes their first deal.`}
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-xs font-semibold bg-black/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Commissions Saved: 100%</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold bg-black/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/5">
              <span>Real-Time Tracking Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link & Sharing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
              <Share2 size={18} className="text-[#7C3AED]" /> Your Referral Link
            </h2>
            <p className="text-gray-500 text-xs mb-6">
              Copy your unique link or share it directly via social media channels to start tracking your referral bonuses.
            </p>
            
            {/* Copyable Box */}
            <div className="flex items-center gap-2 bg-[#F9F9FB] border border-gray-200 rounded-xl p-2.5 mb-6 pl-4 select-all">
              <span className="text-xs font-mono font-medium text-gray-700 truncate flex-1">{referralLink}</span>
              <button
                onClick={copyToClipboard}
                className={`p-2.5 rounded-lg border flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                  copied
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-white text-gray-700 border-gray-200 hover:border-indigo-200 hover:text-[#7C3AED]"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Quick Share Options</span>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={shareViaWhatsApp}
                className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/20 text-[#0A0A0A] transition-all cursor-pointer font-semibold text-xs text-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.533-18.423a12.016 12.016 0 0 0-8.529-3.535C5.86 0 .822 5.04.821 11.237c0 1.996.52 3.937 1.51 5.65L0 24l7.288-1.913a11.956 11.956 0 0 0 5.673 1.423h.005c6.195 0 11.233-5.04 11.236-11.237a11.986 11.986 0 0 0-3.52-8.49" fill="#25D366" />
                </svg>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={shareViaTwitter}
                className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 hover:border-sky-200 hover:bg-sky-50/20 text-[#0A0A0A] transition-all cursor-pointer font-semibold text-xs text-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000000" />
                </svg>
                <span>X / Twitter</span>
              </button>
              <button
                onClick={shareViaEmail}
                className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-[#0A0A0A] transition-all cursor-pointer font-semibold text-xs text-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.859 4.5h18.282A1.859 1.859 0 0 1 23 6.359v11.282A1.859 1.859 0 0 1 21.141 19.5H2.859A1.859 1.859 0 0 1 1 17.641V6.359A1.859 1.859 0 0 1 2.859 4.5" fill="#EA4335" />
                  <path d="M11.996 12.75 1.135 5.86a1.85 1.85 0 0 1 1.724-.36l9.137 5.795 9.141-5.794a1.85 1.85 0 0 1 1.723.359z" fill="#D93025" />
                </svg>
                <span>Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats and Mechanics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Award size={18} className="text-amber-500" /> Your Referral Stats
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-3.5 bg-[#F9F9FB] rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Total Referred</span>
                </div>
                <span className="text-sm font-bold text-[#0A0A0A]">
                  {loadingStats ? <Loader2 size={14} className="animate-spin text-gray-400" /> : stats.total_referred}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-[#F9F9FB] rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <Gift size={16} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Rewards Earned</span>
                </div>
                <span className="text-sm font-bold text-[#0A0A0A]">
                  {loadingStats ? <Loader2 size={14} className="animate-spin text-gray-400" /> : `₹${formatAmount(stats.rewards_earned)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
              Transparency Guarantee
            </h3>
            <p className="text-[11px] text-amber-700/90 leading-normal">
              YBEX has zero hidden agent cuts or platform overhead. Referral rewards are funded entirely from our platform operations budget to accelerate India's direct creator-to-brand marketplace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
