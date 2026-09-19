import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // Check if error is a dynamic import or chunk loading error
    const errorMsg = (error?.message || String(error || "")).toLowerCase();
    const isChunkError =
      errorMsg.includes("failed to fetch dynamically imported module") ||
      errorMsg.includes("importing a module script failed") ||
      errorMsg.includes("error loading dynamically imported module") ||
      errorMsg.includes("chunkloaderror") ||
      error?.name === "ChunkLoadError";

    if (isChunkError) {
      const lastReload = parseInt(sessionStorage.getItem("last_chunk_reload_ts") || "0", 10);
      const now = Date.now();
      if (now - lastReload > 15000) {
        sessionStorage.setItem("last_chunk_reload_ts", String(now));
        window.location.reload();
        return;
      }
    }
  }

  handleReset = () => {
    sessionStorage.removeItem("chunk-error-reloaded");
    sessionStorage.removeItem("vite-chunk-reload");
    sessionStorage.removeItem("last_chunk_reload_ts");
    window.location.href = "/";
  };

  handleReload = () => {
    sessionStorage.removeItem("chunk-error-reloaded");
    sessionStorage.removeItem("vite-chunk-reload");
    sessionStorage.removeItem("last_chunk_reload_ts");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = (this.state.error?.message || String(this.state.error || "")).toLowerCase();
      const isDynamicChunkError =
        errorMsg.includes("failed to fetch dynamically imported module") ||
        errorMsg.includes("importing a module script failed") ||
        errorMsg.includes("error loading dynamically imported module") ||
        errorMsg.includes("chunkloaderror") ||
        this.state.error?.name === "ChunkLoadError";

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full p-8 overflow-hidden">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDynamicChunkError ? 'bg-violet-100 text-violet-600' : 'bg-rose-100 text-rose-600'}`}>
                {isDynamicChunkError ? <RefreshCcw size={24} className="animate-spin duration-1000" /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {isDynamicChunkError ? "App Update Detected" : "Application Notice"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isDynamicChunkError
                    ? "A new version of the app has been published. Please reload to sync the latest modules."
                    : "Something went wrong while loading this page."}
                </p>
              </div>
            </div>

            {isDynamicChunkError ? (
              <div className="bg-violet-50/70 border border-violet-100 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Ybex has been updated with new improvements and fresh assets.
                  Please reload to continue using the latest version seamlessly.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl p-4 overflow-auto max-h-[220px] mb-6">
                <h3 className="text-rose-400 font-mono text-xs mb-2 font-bold">
                  {this.state.error && this.state.error.toString()}
                </h3>
                <pre className="text-slate-400 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home size={14} />
                Return Home
              </button>
              <button
                onClick={this.handleReload}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCcw size={14} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
