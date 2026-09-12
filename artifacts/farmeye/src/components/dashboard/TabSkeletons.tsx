import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';

function LoadingHint({ bn, en }: { bn: string; en: string }) {
  const { language } = useAuth();
  return (
    <p className="text-center text-xs text-muted-foreground animate-pulse mt-1">
      {language === 'bn' ? bn : en}
    </p>
  );
}

/** 🏠 সারসংক্ষেপ — connection banner, hero, comfort, weather, summary */
export function SummaryTabSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <Skeleton className="h-12 w-full rounded-xl bg-muted/60" />
      <Skeleton className="h-36 w-full rounded-2xl bg-muted/60" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-20 rounded-xl bg-muted/60" />
        <Skeleton className="h-20 rounded-xl bg-muted/60" />
        <Skeleton className="h-20 rounded-xl bg-muted/60" />
      </div>
      <Skeleton className="h-4 w-24 rounded-md bg-muted/60" />
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-32 w-full rounded-2xl bg-muted/60" />
      <LoadingHint bn="সারসংক্ষেপ লোড হচ্ছে…" en="Loading summary…" />
    </div>
  );
}

/** 🌡️ পরিবেশ — weather/forecast + comfort + air quality + light sensor */
export function EnvironmentTabSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md bg-muted/60" />
        <Skeleton className="h-5 w-20 rounded-full bg-muted/60" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-24 rounded-2xl bg-muted/60" />
        <Skeleton className="h-24 rounded-2xl bg-muted/60" />
        <Skeleton className="h-24 rounded-2xl bg-muted/60" />
        <Skeleton className="h-24 rounded-2xl bg-muted/60" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/60" />
      <LoadingHint bn="সেন্সর ও পরিবেশ ডেটা লোড হচ্ছে…" en="Loading environment data…" />
    </div>
  );
}

/** ⚡ নিয়ন্ত্রণ — action panels + automation/safety */
export function ControlTabSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-2xl bg-muted/60" />
        <Skeleton className="h-32 rounded-2xl bg-muted/60" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-20 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-4 w-40 rounded-md bg-muted/60" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl bg-muted/60" />
        <Skeleton className="h-28 rounded-2xl bg-muted/60" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-10 w-full rounded-xl bg-muted/60" />
      <LoadingHint bn="নিয়ন্ত্রণ ও অটোমেশন স্ট্যাটাস লোড হচ্ছে…" en="Loading controls & automation…" />
    </div>
  );
}

/** ⚙️ System Status grid — heat stress + system mode + automation + broiler cards */
export function SystemStatusCardsSkeleton({
  showHeatStress = true,
  showAutomation = true,
  showBroiler = false,
  showFanSpeed = false,
}: {
  showHeatStress?: boolean;
  showAutomation?: boolean;
  showBroiler?: boolean;
  showFanSpeed?: boolean;
}) {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {showHeatStress && (
          <Skeleton className="h-32 rounded-2xl bg-muted/60 min-w-0" />
        )}
        <Skeleton className="h-32 rounded-2xl bg-muted/60 min-w-0" />
      </div>
      {showAutomation && (
        <Skeleton className="h-24 w-full rounded-2xl bg-muted/60" />
      )}
      {showBroiler && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl bg-muted/60" />
          <Skeleton className="h-28 w-full rounded-2xl bg-muted/60" />
          <Skeleton className="h-32 w-full rounded-2xl bg-muted/60" />
        </div>
      )}
      {showFanSpeed && (
        <Skeleton className="h-24 w-full rounded-2xl bg-muted/60" />
      )}
      <LoadingHint bn="সিস্টেম স্ট্যাটাস আপডেট হচ্ছে…" en="Updating system status…" />
    </div>
  );
}

/** 🐔 ফ্লক — activity + batch widget */
export function FlockTabSkeleton() {
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <Skeleton className="h-4 w-32 rounded-md bg-muted/60" />
      <Skeleton className="h-24 w-full rounded-2xl bg-muted/60" />
      <Skeleton className="h-40 w-full rounded-2xl bg-muted/60" />
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-20 rounded-xl bg-muted/60" />
        <Skeleton className="h-20 rounded-xl bg-muted/60" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/60" />
      <LoadingHint bn="ব্যাচ ও ফ্লক তথ্য লোড হচ্ছে…" en="Loading flock & batch info…" />
    </div>
  );
}
