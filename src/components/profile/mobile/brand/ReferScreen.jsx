import React, { useState, useEffect } from "react";
import { Copy, Share2, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import { MobileScreen, Section, Card, Pill } from "./brandMobileUi";

// Screen 1j — refer & earn.
//
// The invite code and the share/copy actions are real: the code is derived the same
// way Refer.jsx derives it, and the link points at the real signup route.
//
// The counters are a different story. GET referral/stats does not exist in the
// backend (only /admin/referrals does), so the desktop page's fetch fails silently
// and renders zeros. This screen calls the same endpoint, shows real figures if it
// ever starts answering, and otherwise says the tracking isn't live — rather than
// printing the mockup's sample "3 invited / ₹1,000 earned" as if it were data.

export default function ReferScreen({ onBack }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsAvailable, setStatsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isBrand = user?.role === "brand";
  const rewardAmount = stats?.reward_amount || (isBrand ? 1000 : 500);
  const rewardText = `₹${rewardAmount.toLocaleString("en-IN")}`;

  const codeName = (user?.name || "YBEX").replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const codeTail = String(user?.user_id || user?.id || "YBEX").slice(0, 4).toUpperCase();
  const referralCode = `${codeName}${codeTail}`;
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("referral/stats");
        if (!cancelled && data) {
          setStats(data);
          setStatsAvailable(true);
        }
      } catch (err) {
        if (!cancelled) setStatsAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Invite link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const shareText = `I'm hiring creators on Ybex — zero hidden commission. Sign up with my link and we both get ${rewardText} in platform credit: ${referralLink}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on Ybex", text: shareText, url: referralLink });
      } else {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Couldn't open the share sheet.");
    }
  };

  const referrals = Array.isArray(stats?.referrals) ? stats.referrals : [];

  return (
    <MobileScreen title="Refer & earn" onBack={onBack}>
      <Section>
        <div className="rounded-2xl bg-violet-600 text-white p-5">
          <div className="text-2xl">🎁</div>
          <h2 className="text-lg font-bold mt-2">Get {rewardText} per brand</h2>
          <p className="text-xs text-white/85 mt-2 leading-relaxed">
            Credited to your escrow wallet when the brand you invite completes its first
            campaign. They get ₹500 off too.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="text-xs font-bold text-gray-600 mb-2">Your invite code</div>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono font-bold text-base text-gray-900 tracking-wide truncate">
              {referralCode}
            </div>
            <button
              onClick={copy}
              className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-900 flex items-center gap-1.5 hover:bg-gray-50"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={share}
              className="flex-1 h-11 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 size={14} /> Share invite
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent("Join me on Ybex")}&body=${encodeURIComponent(shareText)}`}
              className="h-11 px-4 rounded-xl border border-gray-200 text-gray-900 font-semibold text-sm flex items-center gap-2"
            >
              <Mail size={14} /> Email
            </a>
          </div>
        </Card>
      </Section>

      <Section className="pt-0">
        {loading ? (
          <div className="h-20 rounded-2xl bg-gray-50 animate-pulse" />
        ) : statsAvailable ? (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3.5">
              <div className="text-xs text-gray-500">Invited</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{stats.total_referred || 0}</div>
            </Card>
            <Card className="p-3.5">
              <div className="text-xs text-gray-500">Earned</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                ₹{Number(stats.rewards_earned || 0).toLocaleString("en-IN")}
              </div>
            </Card>
            <Card className="p-3.5">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                ₹{Number(stats.rewards_pending || 0).toLocaleString("en-IN")}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-4 border-dashed">
            <div className="flex items-center gap-2">
              <Pill tone="amber">Tracking not live</Pill>
            </div>
            <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
              Your invite link works and referrals are recorded at signup, but the dashboard that
              counts them isn't running yet. Rewards are still credited once an invited brand
              completes its first campaign.
            </p>
          </Card>
        )}
      </Section>

      {referrals.length > 0 && (
        <Section className="pt-0">
          <div className="text-xs font-bold text-gray-600 mb-2">Referrals</div>
          <Card>
            {referrals.map((r, idx) => (
              <div
                key={r.id || idx}
                className={`px-4 py-3 flex items-center gap-3 ${idx !== referrals.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-700 flex-shrink-0">
                  {String(r.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{r.name || "Invited brand"}</div>
                  <div className="text-xs text-gray-500 truncate">{r.status_label || r.status || "Invited"}</div>
                </div>
                {r.reward_amount
                  ? <span className="text-xs font-bold text-emerald-600">+₹{Number(r.reward_amount).toLocaleString("en-IN")}</span>
                  : <Pill tone="gray">{r.status || "Invited"}</Pill>}
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Section className="pt-0 pb-8">
        <p className="text-xs text-gray-500 leading-relaxed">
          Rewards can be used for escrow top-ups, not withdrawn. One reward per brand, and
          self-referrals are rejected at KYC.
        </p>
      </Section>
    </MobileScreen>
  );
}
