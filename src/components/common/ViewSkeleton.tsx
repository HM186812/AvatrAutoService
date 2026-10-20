import React from 'react';

export const ViewSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 pb-12 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-3 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-9 w-24 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>

      {/* KPI Cards Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800" />
            </div>
            <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-2.5 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
        ))}
      </div>

      {/* Content Canvas / Table Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-850">
          <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-800 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-7 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
