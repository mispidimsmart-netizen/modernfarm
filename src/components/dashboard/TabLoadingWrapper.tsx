import { ReactNode } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';

interface TabLoadingWrapperProps {
  queryKeys: string[];
  isEmpty?: boolean;
  emptyIcon?: string;
  emptyTitle?: { bn: string; en: string };
  emptyHint?: { bn: string; en: string };
  children: ReactNode;
  skeletonRows?: number;
  /** Optional custom skeleton matching the tab's actual layout */
  skeleton?: ReactNode;
  /** Optional custom loading hint text */
  loadingHint?: { bn: string; en: string };
}

/**
 * Wraps tab content. Shows Skeletons while any matching query is fetching
 * (e.g., right after tab switch when caches are invalidated). When data has
 * loaded but `isEmpty` is true, shows a clear placeholder UI.
 */
export function TabLoadingWrapper({
  queryKeys,
  isEmpty = false,
  emptyIcon = '📭',
  emptyTitle,
  emptyHint,
  children,
  skeletonRows = 3,
  skeleton,
  loadingHint,
}: TabLoadingWrapperProps) {
  const { language } = useAuth();
  const fetchingCount = useIsFetching({
    predicate: (q) => {
      const k = q.queryKey?.[0];
      return typeof k === 'string' && queryKeys.includes(k);
    },
  });

  if (fetchingCount > 0) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <div className="space-y-3 animate-in fade-in duration-200">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-24 w-full rounded-2xl bg-muted/60"
          />
        ))}
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          {loadingHint
            ? loadingHint[language]
            : language === 'bn'
            ? 'লোড হচ্ছে…'
            : 'Loading…'}
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="text-3xl mb-2">{emptyIcon}</div>
        <p className="text-sm font-semibold text-foreground mb-1">
          {emptyTitle
            ? emptyTitle[language]
            : language === 'bn'
            ? 'কোনো ডেটা পাওয়া যায়নি'
            : 'No data available'}
        </p>
        {emptyHint && (
          <p className="text-xs text-muted-foreground/80">
            {emptyHint[language]}
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
