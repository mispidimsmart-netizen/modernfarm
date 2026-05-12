/**
 * SummaryQuickStats — Summary tab এর ৩টি compact one-liner:
 * 1. আজকের ফ্লক snapshot (egg/mortality বা broiler weight)
 * 2. কাল কী হতে পারে (heat-stress risk preview)
 * 3. গত ২৪ ঘণ্টার alert count
 *
 * ক্লান্তিকর navigation কমাতে home-এ এক ঝলকে দরকারি data দেখায়।
 */
import { useMemo } from 'react';
import { Egg, AlertTriangle, CloudSun, ChevronRight, CheckCircle2, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFarmType } from '@/hooks/useFarmType';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { useHeatStressRiskPrediction } from '@/hooks/useHeatStressRiskPrediction';
import { useAlerts } from '@/hooks/useFarmData';
import { cn } from '@/lib/utils';

const RISK_STYLE: Record<string, { bn: string; en: string; color: string }> = {
  low: { bn: 'কম', en: 'Low', color: 'text-emerald-600 dark:text-emerald-400' },
  moderate: { bn: 'মাঝারি', en: 'Moderate', color: 'text-amber-600 dark:text-amber-400' },
  high: { bn: 'বেশি', en: 'High', color: 'text-orange-600 dark:text-orange-400' },
  critical: { bn: 'অতিরিক্ত', en: 'Critical', color: 'text-red-600 dark:text-red-400' },
};

export function SummaryQuickStats() {
  const { language } = useAuth();
  const { isLayer, isBroiler } = useFarmType();
  const { data: todaySummary } = useTodaySummary();
  const heatRisk = useHeatStressRiskPrediction();
  const { data: alerts } = useAlerts();

  // Last 24h alert count
  const recentAlertCount = useMemo(() => {
    if (!alerts) return 0;
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter((a: any) => {
      const ts = a.created_at ? new Date(a.created_at).getTime() : 0;
      return ts >= since;
    }).length;
  }, [alerts]);

  const t = {
    title: { bn: '⚡ এক ঝলকে', en: '⚡ At a glance' },
    flockLayer: { bn: 'আজকের ডিম', en: "Today's eggs" },
    flockBroiler: { bn: 'আজকের ওজন', en: "Today's weight" },
    flockEmpty: { bn: 'এখনো এন্ট্রি নেই', en: 'No entry yet' },
    mortality: { bn: 'মৃত্যু', en: 'mortality' },
    tomorrow: { bn: 'কাল হিট স্ট্রেস', en: 'Tomorrow heat stress' },
    tomorrowNoData: { bn: 'পূর্বাভাস নেই', en: 'No forecast' },
    alerts24h: { bn: 'গত ২৪ ঘণ্টায় সতর্কতা', en: 'Alerts last 24h' },
    alertsNone: { bn: 'কোনো সতর্কতা নেই', en: 'No alerts' },
    viewAll: { bn: 'সব দেখুন', en: 'View all' },
  };

  // ── Flock row ──
  const flockNode = (() => {
    if (!todaySummary?.hasTodayEntry) {
      return <span className="text-muted-foreground">{t.flockEmpty[language]}</span>;
    }
    if (isLayer) {
      const eggs = todaySummary.todayEggs ?? 0;
      const mort = todaySummary.todayMortality ?? 0;
      return (
        <span className="font-semibold tabular-nums">
          {eggs}
          {mort > 0 && (
            <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
              · {mort} {t.mortality[language]}
            </span>
          )}
        </span>
      );
    }
    if (isBroiler) {
      const w = todaySummary.todayBroilerWeightGrams ?? 0;
      const mort = todaySummary.todayMortality ?? 0;
      return (
        <span className="font-semibold tabular-nums">
          {w > 0 ? `${w}g` : '—'}
          {mort > 0 && (
            <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
              · {mort} {t.mortality[language]}
            </span>
          )}
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  })();

  // ── Tomorrow heat-risk ──
  const riskInfo = RISK_STYLE[heatRisk?.riskLevel ?? 'low'] || RISK_STYLE.low;
  const tomorrowMax = heatRisk?.tomorrowForecast?.maxTemp;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t.title[language]}
        </p>
      </div>
      <div className="divide-y divide-border/40">
        {/* 1️⃣ Flock snapshot */}
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            {isBroiler ? (
              <Scale className="h-4 w-4 text-primary" />
            ) : (
              <Egg className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">
              {isBroiler ? t.flockBroiler[language] : t.flockLayer[language]}
            </p>
            <div className="text-sm leading-tight">{flockNode}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>

        {/* 2️⃣ Tomorrow heat-stress */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
            <CloudSun className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">
              {t.tomorrow[language]}
            </p>
            <div className="text-sm leading-tight">
              {tomorrowMax != null ? (
                <>
                  <span className={cn('font-semibold', riskInfo.color)}>
                    {riskInfo[language]}
                  </span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    · {tomorrowMax.toFixed(0)}°C
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t.tomorrowNoData[language]}</span>
              )}
            </div>
          </div>
        </div>

        {/* 3️⃣ Alerts last 24h */}
        <Link
          to="/alerts"
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
        >
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
              recentAlertCount > 0
                ? 'bg-red-500/10'
                : 'bg-emerald-500/10'
            )}
          >
            {recentAlertCount > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">
              {t.alerts24h[language]}
            </p>
            <div className="text-sm leading-tight">
              {recentAlertCount > 0 ? (
                <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {recentAlertCount}
                </span>
              ) : (
                <span className="text-muted-foreground">{t.alertsNone[language]}</span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </div>
    </div>
  );
}
