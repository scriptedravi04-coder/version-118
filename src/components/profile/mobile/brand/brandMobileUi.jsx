import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Shared chrome for the Brand Profile mobile sub-screens (mockup screens 1b–1k).
// Kept in the mobile tree so no desktop component is touched.

export function MobileScreen({ title, subtitle, onBack, children, footer }) {
  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 z-20 flex items-center gap-2">
        <button
          onClick={onBack}
          type="button"
          aria-label="Back"
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0 cursor-pointer active:scale-95"
        >
          <ChevronLeft size={20} className="text-slate-800" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-black text-slate-900 tracking-tight truncate font-display">{title}</h1>
          {subtitle && <p className="text-[11px] font-bold text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1">{children}</div>

      {footer && (
        <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-3 flex-shrink-0 sticky bottom-0 z-20">{footer}</div>
      )}
    </div>
  );
}

export function Section({ title, hint, children, className = "" }) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      {title && <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">{title}</h2>}
      {hint && <p className="text-xs text-slate-500 mb-3 leading-relaxed font-medium">{hint}</p>}
      {children}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-100 shadow-xs overflow-hidden ${className}`}>{children}</div>
  );
}

// A read-only label/value row, optionally tappable.
export function InfoRow({ label, value, placeholder = "Not provided", onClick, last = false }) {
  const shown = value === null || value === undefined || value === "" ? null : value;
  const body = (
    <>
      <div className="flex-1 min-w-0 text-left">
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className={`text-sm mt-0.5 break-words ${shown ? "font-bold text-slate-900" : "text-slate-400 font-medium"}`}>
          {shown ?? placeholder}
        </div>
      </div>
      {onClick && <ChevronRight size={16} className="text-slate-400 flex-shrink-0 ml-2" />}
    </>
  );

  const cls = `w-full px-4 py-3 flex items-center ${last ? "" : "border-b border-slate-100"}`;
  return onClick ? (
    <button onClick={onClick} className={`${cls} hover:bg-slate-50/80 transition-colors cursor-pointer`}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white transition-all";

export function TextInput(props) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:bg-white resize-none transition-all"
    />
  );
}

export function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        selected
          ? "bg-[#7C3AED] text-white shadow-xs"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-xl bg-[#7C3AED] text-white font-black text-sm disabled:opacity-50 hover:bg-[#6D28D9] disabled:hover:bg-[#7C3AED] shadow-xs active:scale-[0.99] transition-all cursor-pointer"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

const PILL_TONES = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  gray: "bg-gray-100 text-gray-600",
};

export function Pill({ tone = "gray", children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${PILL_TONES[tone] || PILL_TONES.gray}`}>
      {children}
    </span>
  );
}

export function Loader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-9 h-9 rounded-full border-2 border-gray-200 border-t-violet-600 animate-spin" />
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Icon size={22} className="text-gray-400" />
        </div>
      )}
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {body && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Normalises the KYC row from GET verifications/me into a badge.
export function kycBadgeFor(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return { tone: "green", label: "Approved" };
  if (s === "rejected") return { tone: "red", label: "Rejected" };
  if (s === "pending" || s === "under_review" || s === "submitted") return { tone: "amber", label: "Pending" };
  return { tone: "gray", label: "Not started" };
}
