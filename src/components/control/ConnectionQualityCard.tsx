import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useFarmDeviceMetrics24h } from '@/hooks/useEdgeFunctionMetrics';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Quality = 'excellent' | 'fair' | 'poor' | 'unknown';

function bn(n: number | string, lang: string) {
  if (lang !== 'bn') return String(n);
  const map: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return String(n).replace(/[0-9]/g, (d) => map[d] ?? d);
}

export function ConnectionQualityCard() {
  const { language } = useAuth();
  const { currentFarm } = useFarm();
  const { data: devices } = useDeviceHealth();
  const { data: metrics } = useFarmDeviceMetrics24h(currentFarm?.id);
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const list = devices || [];
    if (list.length === 0) return { quality: 'unknown' as Quality, lastSyncMs: null as number | null, errorRate: 0, avgLatency: 0, totalSync: 0 };

    let lastSyncMs: number | null = null;
    list.forEach((d) => {
      if (d.last_seen_at) {
        const diff = Date.now() - new Date(d.last_seen_at).getTime();
        if (lastSyncMs === null || diff < lastSyncMs) lastSyncMs = diff;
      }
    });

    const m = metrics || [];
    const totalSync = m.reduce((s, r) => s + (r.sync_count || 0), 0);
    const totalErr = m.reduce((s, r) => s + (r.error_count || 0) + (r.signature_failures || 0), 0);
    const totalLat = m.reduce((s, r) => s + (r.total_latency_ms || 0), 0);
    const errorRate = totalSync > 0 ? (totalErr / totalSync) * 100 : 0;
    const avgLatency = totalSync > 0 ? totalLat / totalSync : 0;

    let quality: Quality = 'excellent';
    if (lastSyncMs === null || lastSyncMs > 5 * 60_000 || errorRate > 5) quality = 'poor';
    else if (lastSyncMs > 2 * 60_000 || errorRate > 1 || avgLatency > 1500) quality = 'fair';

    return { quality, lastSyncMs, errorRate, avgLatency, totalSync };
  }, [devices, metrics]);

  const config = {
    excellent: {
      icon: CheckCircle2,
      color: 'text-status-normal',
      bg: 'border-status-normal/30 bg-status-normal/5',
      label: { bn: 'সংযোগ চমৎকার', en: 'Connection Excellent' },
    },
    fair: {
      icon: AlertTriangle,
      color: 'text-status-warning',
      bg: 'border-status-warning/30 bg-status-warning/5',
      label: { bn: 'সংযোগ ধীর', en: 'Connection Fair' },
    },
    poor: {
      icon: XCircle,
      color: 'text-status-danger',
      bg: 'border-status-danger/30 bg-status-danger/5',
      label: { bn: 'সংযোগ সমস্যা', en: 'Connection Issue' },
    },
    unknown: {
      icon: Activity,
      color: 'text-muted-foreground',
      bg: 'border-border bg-muted/30',
      label: { bn: 'কোনো ডিভাইস নেই', en: 'No devices' },
    },
  } as const;

  const c = config[summary.quality];
  const Icon = c.icon;

  const lastSyncText = summary.lastSyncMs === null
    ? (language === 'bn' ? '—' : '—')
    : summary.lastSyncMs < 60_000
      ? (language === 'bn' ? 'এইমাত্র' : 'just now')
      : summary.lastSyncMs < 3600_000
        ? `${bn(Math.floor(summary.lastSyncMs / 60_000), language)}${language === 'bn' ? ' মি আগে' : 'm ago'}`
        : `${bn(Math.floor(summary.lastSyncMs / 3600_000), language)}${language === 'bn' ? ' ঘ আগে' : 'h ago'}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full rounded-xl border ${c.bg} px-4 py-3 text-left transition-shadow hover:shadow-md`}
          aria-label={c.label[language]}
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Icon className={`h-5 w-5 ${c.color}`} />
              {summary.quality === 'excellent' && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-normal animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${c.color}`}>{c.label[language]}</p>
              <p className="text-[11px] text-muted-foreground">
                {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last sync:'} {lastSyncText}
                {summary.totalSync > 0 && ` · ${language === 'bn' ? 'ত্রুটি' : 'err'} ${bn(summary.errorRate.toFixed(1), language)}%`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </motion.button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${c.color}`} />
            {language === 'bn' ? 'সংযোগ মান (২৪ ঘন্টা)' : 'Connection Quality (24h)'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={language === 'bn' ? 'মোট সিঙ্ক' : 'Total syncs'} value={bn(summary.totalSync, language)} />
            <Stat label={language === 'bn' ? 'গড় লেটেন্সি' : 'Avg latency'} value={`${bn(Math.round(summary.avgLatency), language)} ms`} />
            <Stat label={language === 'bn' ? 'ত্রুটির হার' : 'Error rate'} value={`${bn(summary.errorRate.toFixed(2), language)}%`} />
            <Stat label={language === 'bn' ? 'শেষ সিঙ্ক' : 'Last sync'} value={lastSyncText} />
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {language === 'bn' ? 'প্রতি ঘন্টা' : 'Per hour'}
            </p>
            <AnimatePresence>
              {(metrics || []).slice(-12).reverse().map((row) => (
                <div key={row.bucket_hour} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground">
                    {new Date(row.bucket_hour).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{bn(row.sync_count, language)} {language === 'bn' ? 'সিঙ্ক' : 'sync'}</span>
                    {row.error_count > 0 && (
                      <span className="text-status-danger">{bn(row.error_count, language)} {language === 'bn' ? 'ত্রুটি' : 'err'}</span>
                    )}
                    <span className="text-muted-foreground">
                      {row.sync_count > 0 ? bn(Math.round(row.total_latency_ms / row.sync_count), language) : '—'} ms
                    </span>
                  </div>
                </div>
              ))}
              {(!metrics || metrics.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {language === 'bn' ? 'এখনো কোনো ডেটা নেই' : 'No data yet'}
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-bold mt-0.5">{value}</p>
    </div>
  );
}
