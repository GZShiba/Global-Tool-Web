/**
 * Reusable skeleton placeholders for CMS-driven public sections.
 *
 * Shown ONLY while Firestore data is loading — never as a substitute for
 * content, never mixed with fake data. Dimensions mirror the final sections
 * closely enough to avoid layout shift. Loading, empty and error remain
 * distinct states in every consuming component.
 */

/** Single shimmer block. */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-inset animate-pulse rounded-xl ${className}`} />;
}

/** Home hero carousel — matched to the real hero height and content layout. */
export function HeroSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-5 sm:mt-6 lg:mt-8" aria-busy="true" role="status" aria-label="Loading featured tools">
      <div className="relative h-[380px] sm:h-[420px] md:h-[460px] lg:h-[500px] rounded-[28px] sm:rounded-[32px] bg-[#0b0b0d] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-20">
          <div className="max-w-lg md:max-w-xl space-y-4">
            <SkeletonBlock className="h-2.5 w-40 rounded-full opacity-70" />
            <SkeletonBlock className="h-8 sm:h-10 w-full max-w-md opacity-80" />
            <SkeletonBlock className="h-8 sm:h-10 w-2/3 opacity-60" />
            <div className="space-y-2 pt-1">
              <SkeletonBlock className="h-3 w-full max-w-sm opacity-50" />
              <SkeletonBlock className="h-3 w-5/6 max-w-sm opacity-50" />
              <SkeletonBlock className="h-3 w-3/4 max-w-sm opacity-50" />
            </div>
            <div className="flex gap-3 pt-3">
              <SkeletonBlock className="h-11 w-36 rounded-xl opacity-90" />
              <SkeletonBlock className="h-11 w-36 rounded-xl opacity-50" />
            </div>
          </div>
        </div>
        {/* carousel controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
          <SkeletonBlock className="w-9 h-9 rounded-full opacity-40" />
          <SkeletonBlock className="w-9 h-9 rounded-full opacity-40" />
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <SkeletonBlock className="w-1.5 h-1.5 rounded-full opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Individual tool card placeholder — mirrors ToolCard proportions. */
export function ToolCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden transition-colors w-full bg-card border border-subtle rounded-[20px] p-3.5 sm:p-4 flex flex-col gap-3"
      style={{ minHeight: 196 }}
    >
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-12 h-12 rounded-xl opacity-90" />
        <div className="flex-1 min-w-0 space-y-2">
          <SkeletonBlock className="h-2 w-14 rounded-full opacity-60" />
          <SkeletonBlock className="h-4 w-2/3 opacity-90" />
        </div>
      </div>
      <SkeletonBlock className="h-2.5 w-full opacity-50" />
      <SkeletonBlock className="h-2.5 w-3/4 opacity-50" />
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <SkeletonBlock className="h-9 w-24 rounded-xl opacity-90" />
        <SkeletonBlock className="w-9 h-9 rounded-lg opacity-40" />
      </div>
    </div>
  );
}

/** Grid of tool-card placeholders matching the Featured/Noteworthy grid. */
export function ToolCardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 justify-items-stretch"
      aria-busy="true"
      role="status"
      aria-label="Loading tools"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <ToolCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/**
 * Grid of tool-card placeholders matching the All Tools browser grid
 * (2 → xl:3 columns).
 */
export function ToolsBrowserGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 justify-items-stretch"
      aria-busy="true"
      role="status"
      aria-label="Loading tools"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <ToolCardSkeleton />
        </div>
      ))}
    </div>
  );
}

/** Home "Browse Categories" placeholders — mirrors the category cards. */
export function CategoryCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5"
      aria-busy="true"
      role="status"
      aria-label="Loading categories"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div aria-hidden="true" className="bg-card border-2 border-neutral-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
              <SkeletonBlock className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl opacity-90" />
              <div className="space-y-2 min-w-0">
                <SkeletonBlock className="h-4 w-24 opacity-90" />
                <SkeletonBlock className="h-2.5 w-36 opacity-50" />
                <SkeletonBlock className="h-4 w-14 rounded-full opacity-40" />
              </div>
            </div>
            <SkeletonBlock className="w-8 h-8 sm:w-10 sm:h-10 rounded-full opacity-40 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact inline note for list/section errors (distinct from empty states). */
export function CmsErrorNote({ message, onRetry, className = '' }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={`bg-card border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 ${className}`} role="alert">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-amber-700 dark:text-amber-400">Content could not be loaded</p>
        <p className="text-xs text-secondary font-normal mt-0.5 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-2 border border-subtle bg-card px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-neutral-900 dark:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-all active:scale-95"
        >
          Retry
        </button>
      )}
    </div>
  );
}
