import React from "react";

export default function PageSkeleton() {
  return (
    <div className="w-full min-w-full flex-1 flex flex-col max-w-none px-4 md:px-8 py-6 md:py-8 space-y-6 select-none pointer-events-none">
      {/* Top Header Breadcrumb & Title */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200/70 rounded-md animate-pulse"></div>
          <div className="h-8 w-56 md:w-72 bg-slate-200/90 rounded-xl animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-24 bg-slate-200/70 rounded-xl animate-pulse"></div>
          <div className="h-10 w-32 bg-[var(--violet-border)]/50 rounded-xl animate-pulse"></div>
        </div>
      </div>

      {/* 4 Stat / Metric Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-full bg-white rounded-2xl p-5 border border-slate-200/70 shadow-2xs space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200/70 rounded-md animate-pulse"></div>
              <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse"></div>
            </div>
            <div className="h-7 w-32 bg-slate-200/90 rounded-lg animate-pulse"></div>
            <div className="h-3.5 w-20 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Tab Filter Row */}
      <div className="flex items-center gap-2.5 overflow-hidden py-1">
        <div className="h-9 w-24 bg-slate-200/90 rounded-xl animate-pulse"></div>
        <div className="h-9 w-28 bg-slate-200/60 rounded-xl animate-pulse"></div>
        <div className="h-9 w-24 bg-slate-200/60 rounded-xl animate-pulse"></div>
        <div className="h-9 w-32 bg-slate-200/60 rounded-xl animate-pulse hidden sm:block"></div>
      </div>

      {/* Main Content Area: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Primary Section (2 Columns) */}
        <div className="lg:col-span-2 w-full bg-white rounded-2xl p-6 border border-slate-200/70 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="h-5 w-36 bg-slate-200/80 rounded-lg animate-pulse"></div>
            <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>

          <div className="space-y-3.5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-200/80 shrink-0 animate-pulse"></div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="h-4 w-36 md:w-48 bg-slate-200/80 rounded animate-pulse"></div>
                    <div className="h-3 w-24 bg-slate-200/50 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200/70 rounded-full animate-pulse shrink-0"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Secondary Section (1 Column) */}
        <div className="w-full bg-white rounded-2xl p-6 border border-slate-200/70 shadow-2xs space-y-5">
          <div className="h-5 w-32 bg-slate-200/80 rounded-lg animate-pulse"></div>
          <div className="w-full h-44 rounded-xl bg-slate-100 animate-pulse flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-slate-200/70 animate-pulse"></div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-4 w-full bg-slate-200/70 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-slate-200/50 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
