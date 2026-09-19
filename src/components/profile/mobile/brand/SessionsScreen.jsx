import React, { useState, useEffect, useCallback } from "react";
import { Smartphone, Monitor, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import { MobileScreen, Section, Card, Loader, Pill, EmptyState } from "./brandMobileUi";

// Screen 1i — devices & sessions. GET sessions, POST sessions/logout/:token and
// POST sessions/logout-others are the same three calls the desktop settings tab makes.

function relativeTime(iso) {
  if (!iso) return "Unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 2) return "Active now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SessionsScreen({ onBack }) {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get("sessions", { bypassCache: true }).catch(() => ({ data: null }));
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to load sessions:", e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const logoutSession = async (token) => {
    setBusy(token);
    try {
      await api.post(`sessions/logout/${token}`);
      toast.success("Signed out of that device.");
      await fetchSessions();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Couldn't end that session.");
    } finally {
      setBusy(null);
    }
  };

  const logoutOthers = async () => {
    setBusy("others");
    try {
      await api.post("sessions/logout-others");
      toast.success("Signed out everywhere else.");
      await fetchSessions();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Couldn't end the other sessions.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <MobileScreen title="Devices & sessions" onBack={onBack}>
        <Loader label="Checking where you're signed in…" />
      </MobileScreen>
    );
  }

  const current = sessions.find((s) => s.isCurrent || s.is_current);
  const others = sessions.filter((s) => !(s.isCurrent || s.is_current));

  const nameOf = (s) => s.device_name || s.device || s.user_agent || "Unknown device";
  const placeOf = (s) => s.location || s.city || "Location unknown";

  return (
    <MobileScreen title="Devices & sessions" onBack={onBack}>
      <Section hint={
        sessions.length
          ? `Signed in on ${sessions.length} device${sessions.length === 1 ? "" : "s"}. Signing out of this device signs you out of the app.`
          : undefined
      }>
        {sessions.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={Smartphone}
              title="No sessions found"
              body="We couldn't read your active sessions right now. Pull back and try again in a moment."
            />
          </Card>
        ) : (
          <>
            {current && (
              <>
                <div className="text-xs font-bold text-gray-600 mb-2">This device</div>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Smartphone size={18} className="text-gray-900 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">{nameOf(current)}</span>
                        <Pill tone="green">Active now</Pill>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{placeOf(current)}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="mt-3 w-full h-11 rounded-xl border border-gray-200 text-gray-900 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <LogOut size={14} /> Log out of this device
                  </button>
                </Card>
              </>
            )}

            {others.length > 0 && (
              <>
                <div className="text-xs font-bold text-gray-600 mt-5 mb-2">Other sessions</div>
                <Card>
                  {others.map((s, idx) => (
                    <div
                      key={s.session_token || idx}
                      className={`px-4 py-3.5 flex items-center gap-3 ${idx !== others.length - 1 ? "border-b border-gray-100" : ""}`}
                    >
                      <Monitor size={17} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{nameOf(s)}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {placeOf(s)} · {relativeTime(s.last_active_at || s.updated_at || s.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => logoutSession(s.session_token)}
                        disabled={busy === s.session_token || !s.session_token}
                        className="text-xs font-bold text-red-600 flex-shrink-0 disabled:opacity-50"
                      >
                        {busy === s.session_token ? "…" : "Log out"}
                      </button>
                    </div>
                  ))}
                </Card>

                <button
                  onClick={logoutOthers}
                  disabled={busy === "others"}
                  className="mt-4 w-full h-12 rounded-xl bg-red-50 text-red-700 font-bold text-sm disabled:opacity-50"
                >
                  {busy === "others" ? "Signing out…" : "Log out of all other devices"}
                </button>
              </>
            )}
          </>
        )}
      </Section>
    </MobileScreen>
  );
}
