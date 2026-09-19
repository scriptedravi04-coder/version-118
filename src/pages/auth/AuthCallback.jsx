import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent re-processing in React StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const session_id = params.get("session_id");
    if (!session_id) { 
      if (window.opener) {
        window.opener.postMessage({ type: "OAUTH_FAILURE" }, window.location.origin);
        window.close();
      } else {
        navigate("/");
      }
      return; 
    }

    api.post("auth/session", { session_id })
      .then(async ({ data }) => {
        const user = await refreshUser();
        // Clear hash
        window.history.replaceState(null, "", window.location.pathname);
        if (window.opener) {
          window.opener.postMessage({ type: "OAUTH_SUCCESS" }, window.location.origin);
          window.close();
        } else {
          if (user && !(user.onboarded || user.onboarding_completed || user.onboarding_complete)) navigate("/onboarding", { replace: true });
          else navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => {
        if (window.opener) {
          window.opener.postMessage({ type: "OAUTH_FAILURE" }, window.location.origin);
          window.close();
        } else {
          navigate("/login", { replace: true });
        }
      });
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-card)]/5" data-testid="auth-callback">
      <div className="text-center">
        <div className="font-display text-3xl">Signing you in...</div>
        <div className="mt-3 text-[var(--text-secondary)] text-sm">Establishing secure session</div>
      </div>
    </div>
  );
}
