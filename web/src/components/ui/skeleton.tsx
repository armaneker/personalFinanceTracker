import { cn } from "@/lib/utils";

type SkeletonBaseProps = {
  className?: string;
};

/**
 * Base skeleton component with pulse animation.
 */
function SkeletonBase({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-700",
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for metric/stat cards (rounded box with pulse animation).
 * Matches the hero metrics card design.
 */
export function SkeletonCard({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      <SkeletonBase className="mb-3 h-4 w-24" />
      <SkeletonBase className="h-8 w-32" />
      <SkeletonBase className="mt-2 h-3 w-16" />
    </div>
  );
}

/**
 * Skeleton for chart areas.
 * Displays a larger rectangle mimicking a chart container.
 */
export function SkeletonChart({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      <SkeletonBase className="mb-4 h-5 w-40" />
      <SkeletonBase className="h-64 w-full rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for table/list rows.
 * Displays multiple horizontal bars mimicking a table row.
 */
export function SkeletonRow({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 py-3",
        className
      )}
      aria-hidden="true"
    >
      <SkeletonBase className="h-4 w-20" />
      <SkeletonBase className="h-4 w-32 flex-1" />
      <SkeletonBase className="h-4 w-16" />
      <SkeletonBase className="h-4 w-20" />
    </div>
  );
}

/**
 * Skeleton for text lines.
 * Variable widths for natural text appearance.
 */
type SkeletonTextProps = SkeletonBaseProps & {
  lines?: number;
};

export function SkeletonText({ className, lines = 1 }: SkeletonTextProps) {
  const widths = ["w-full", "w-3/4", "w-5/6", "w-2/3", "w-4/5"];

  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={cn("h-4", widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton wrapper for loading states with smooth fade transition.
 */
type SkeletonContainerProps = {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
};

export function SkeletonContainer({
  isLoading,
  skeleton,
  children,
}: SkeletonContainerProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  );
}

/**
 * Dashboard-specific skeleton: Hero metrics grid.
 */
export function SkeletonHeroMetrics({ className }: SkeletonBaseProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)} aria-hidden="true">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

/**
 * Dashboard-specific skeleton: Category list items.
 */
export function SkeletonCategoryList({ className, count = 5 }: SkeletonBaseProps & { count?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-3",
        className
      )}
      aria-hidden="true"
    >
      <SkeletonBase className="mb-4 h-5 w-32" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBase className="h-4 w-4 rounded-full" />
          <SkeletonBase className="h-4 flex-1" />
          <SkeletonBase className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Transactions-specific skeleton: Transaction rows in a card.
 */
export function SkeletonTransactionCard({ className, rowCount = 5 }: SkeletonBaseProps & { rowCount?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-3">
        <div>
          <SkeletonBase className="h-5 w-32 mb-1" />
          <SkeletonBase className="h-3 w-20" />
        </div>
        <div className="text-right">
          <SkeletonBase className="h-4 w-24 mb-1" />
          <SkeletonBase className="h-4 w-20" />
        </div>
      </div>
      {/* Transaction rows */}
      <div className="space-y-1">
        {Array.from({ length: rowCount }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Import-specific skeleton: Pending/history cards.
 */
export function SkeletonImportCard({ className }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4",
        className
      )}
      aria-hidden="true"
    >
      {/* Header row */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <SkeletonBase className="h-4 w-16 mb-1" />
          <SkeletonBase className="h-5 w-48" />
        </div>
        <div>
          <SkeletonBase className="h-4 w-32 mb-1" />
          <SkeletonBase className="h-4 w-40" />
        </div>
      </div>
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-4">
            <SkeletonBase className="h-3 w-20 mb-2" />
            <SkeletonBase className="h-6 w-16" />
            <SkeletonBase className="h-3 w-12 mt-1" />
          </div>
        ))}
      </div>
      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <SkeletonBase className="h-10 w-32 rounded-md" />
        <SkeletonBase className="h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

export { SkeletonBase as Skeleton };
