import ErrorBoundary from "@/components/ErrorBoundary";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

if (typeof window !== "undefined") {
  const handleChunkError = (errMessage) => {
    const msg = String(errMessage || "").toLowerCase();
    if (
      msg.includes("failed to fetch dynamically imported module") ||
      msg.includes("importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("chunkloaderror")
    ) {
      const lastReload = parseInt(sessionStorage.getItem("last_chunk_reload_ts") || "0", 10);
      const now = Date.now();
      if (now - lastReload > 15000) {
        sessionStorage.setItem("last_chunk_reload_ts", String(now));
        window.location.reload();
        return true;
      }
    }
    return false;
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    handleChunkError("failed to fetch dynamically imported module");
  });

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    if (handleChunkError(msg || error?.message)) {
      return true;
    }
    if (
      msg === "Script error." ||
      (typeof msg === "string" && (msg.includes("ResizeObserver") || msg.includes("Script error")))
    ) {
      console.warn("Suppressed cross-origin / harmless script event:", msg);
      return true;
    }
    return false;
  };

  window.addEventListener("error", (event) => {
    if (handleChunkError(event.message || event.error?.message)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return;
    }
    if (
      event.message === "Script error." ||
      event.message?.includes("ResizeObserver loop") ||
      event.message?.includes("Script error")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      console.warn("Handled cross-origin script / layout event:", event.message);
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (handleChunkError(event.reason?.message || String(event.reason || ""))) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return;
    }
    if (
      event.reason?.message?.includes?.("ResizeObserver") ||
      event.reason?.message?.includes?.("Script error")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary><App /></ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
