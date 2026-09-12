import { supabase } from '@/integrations/supabase/client';

const SAMPLE_RATE = 0.05; // 5%
const queue: Array<{
  metric_type: 'page_load' | 'rpc_call' | 'query' | 'render';
  route?: string;
  label?: string;
  duration_ms: number;
  meta?: Record<string, unknown>;
}> = [];
let flushTimer: number | null = null;

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from('performance_metrics') as any).insert(
      batch.map((m) => ({ ...m, user_id: user?.id ?? null })),
    );
  } catch {
    /* fire-and-forget */
  }
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 5_000);
}

/** Sampled (5%) fire-and-forget perf recorder. Safe to call from anywhere. */
export function recordPerf(metric: {
  metric_type: 'page_load' | 'rpc_call' | 'query' | 'render';
  route?: string;
  label?: string;
  duration_ms: number;
  meta?: Record<string, unknown>;
}) {
  if (Math.random() > SAMPLE_RATE) return;
  if (metric.duration_ms < 0 || metric.duration_ms > 60_000) return;
  queue.push(metric);
  scheduleFlush();
}

/** Auto-record initial page load via Navigation Timing. */
export function initPagePerfTracking() {
  if (typeof window === 'undefined' || !('performance' in window)) return;
  const onLoad = () => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return;
      const duration = Math.round(nav.loadEventEnd - nav.startTime);
      if (duration > 0) {
        recordPerf({
          metric_type: 'page_load',
          route: window.location.pathname,
          duration_ms: duration,
          meta: {
            dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
            ttfb: Math.round(nav.responseStart - nav.requestStart),
            dom: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          },
        });
      }
    } catch { /* noop */ }
  };
  if (document.readyState === 'complete') onLoad();
  else window.addEventListener('load', onLoad, { once: true });

  // Flush remaining samples before tab close
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}
