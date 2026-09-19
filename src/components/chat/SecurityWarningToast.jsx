import React from "react";
import { XOctagon } from "lucide-react";
import { toast } from "sonner";

export const showSecurityWarning = (message = "Platform rules violation — personal contact sharing not allowed.") => {
  toast.custom((t) => (
    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex gap-3 shadow-xl backdrop-blur-md items-start max-w-sm">
      <XOctagon className="text-red-500 shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <h4 className="text-red-500 font-bold text-sm mb-1">Security Warning</h4>
        <p className="text-red-400/90 text-xs leading-relaxed">
          {message}
        </p>
      </div>
      <button onClick={() => toast.dismiss(t)} className="text-red-400/50 hover:text-red-400 transition-colors p-1">
        <span className="sr-only">Close</span>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  ), { duration: 5000 });
};
