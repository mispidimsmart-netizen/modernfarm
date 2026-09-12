import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import { Activity, RefreshCw, Zap, AlertTriangle, Gauge } from 'lucide-react';

interface PerfRow {
  route: string;
  metric_type: string;
  sample_count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
}

const METRIC_LABELS: Record<string, string> = {
  page_load: 'পেজ লোড',
  rpc_call: 'RPC কল',
  query: 'কোয়েরি',
  render: 'রেন্ডার',
};

function severityColor(p95: number): string {
  if (p95 > 2000) return 'hsl(var(--destructive))';
  if (p95 > 800) return 'hsl(38 92% 50%)';
  return 'hsl(142 71% 45%)';
}

function fmtMs(n?: number) {
  if (n == null) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${Math.round(n)}ms`;
}

export function PerformanceDashboardTab() {
  const [hours, setHours] = useState<number>(24);
  const [metricFilter, setMetricFilter] = useState<string>('all');

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['perf-summary', hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_performance_summary' as any, {
        _hours: hours,
      });
      if (error) throw error;
      return (data ?? []) as PerfRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return metricFilter === 'all' ? data : data.filter((r) => r.metric_type === metricFilter);
  }, [data, metricFilter]);

  const totals = useMemo(() => {
    if (!filtered.length) return { samples: 0, slowRoutes: 0, avgP95: 0, maxP99: 0 };
    const samples = filtered.reduce((a, r) => a + Number(r.sample_count || 0), 0);
    const slowRoutes = filtered.filter((r) => Number(r.p95_ms) > 800).length;
    const avgP95 = filtered.reduce((a, r) => a + Number(r.p95_ms || 0), 0) / filtered.length;
    const maxP99 = Math.max(...filtered.map((r) => Number(r.p99_ms || 0)));
    return { samples, slowRoutes, avgP95, maxP99 };
  }, [filtered]);

  const top10 = useMemo(
    () => [...filtered]
      .sort((a, b) => Number(b.p95_ms) - Number(a.p95_ms))
      .slice(0, 10)
      .map((r) => ({
        ...r,
        label: `${r.route.length > 24 ? r.route.slice(0, 22) + '…' : r.route} · ${METRIC_LABELS[r.metric_type] ?? r.metric_type}`,
        p50: Number(r.p50_ms),
        p95: Number(r.p95_ms),
        p99: Number(r.p99_ms),
      })),
    [filtered],
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-fuchsia-500/20">
        <CardHeader className="pb-3 border-b border-fuchsia-500/10">
          <CardTitle className="text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
                পারফরম্যান্স ড্যাশবোর্ড
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
                <SelectTrigger className="w-[140px] bg-slate-800/60 border-fuchsia-500/20 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">শেষ ১ ঘণ্টা</SelectItem>
                  <SelectItem value="6">শেষ ৬ ঘণ্টা</SelectItem>
                  <SelectItem value="24">শেষ ২৪ ঘণ্টা</SelectItem>
                  <SelectItem value="72">শেষ ৩ দিন</SelectItem>
                  <SelectItem value="168">শেষ ৭ দিন</SelectItem>
                </SelectContent>
              </Select>
              <Select value={metricFilter} onValueChange={setMetricFilter}>
                <SelectTrigger className="w-[140px] bg-slate-800/60 border-fuchsia-500/20 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ধরনের</SelectItem>
                  <SelectItem value="page_load">পেজ লোড</SelectItem>
                  <SelectItem value="rpc_call">RPC কল</SelectItem>
                  <SelectItem value="query">কোয়েরি</SelectItem>
                  <SelectItem value="render">রেন্ডার</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="border-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/10"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile icon={<Activity className="w-4 h-4" />} label="মোট স্যাম্পল"
              value={totals.samples.toLocaleString('bn-BD')} hint={`${hours} ঘণ্টায়`} tone="cyan" />
            <SummaryTile icon={<Zap className="w-4 h-4" />} label="গড় p95"
              value={fmtMs(totals.avgP95)} hint="সব রুট" tone="violet" />
            <SummaryTile icon={<AlertTriangle className="w-4 h-4" />} label="ধীর রুট (p95 > 800ms)"
              value={String(totals.slowRoutes)} hint={`মোট ${filtered.length}টি`}
              tone={totals.slowRoutes > 0 ? 'amber' : 'emerald'} />
            <SummaryTile icon={<Gauge className="w-4 h-4" />} label="সর্বোচ্চ p99"
              value={fmtMs(totals.maxP99)} hint="worst route" tone="rose" />
          </div>
        </CardContent>
      </Card>

      {/* Chart: Top 10 routes by p95 */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-fuchsia-500/20">
        <CardHeader className="pb-3 border-b border-fuchsia-500/10">
          <CardTitle className="text-white text-base">শীর্ষ ১০ ধীরতম রুট (p50 / p95 / p99)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-[420px] w-full bg-slate-800/40" />
          ) : error ? (
            <div className="text-rose-300 text-sm py-8 text-center">
              ডেটা লোড করতে সমস্যা: {(error as Error).message}
            </div>
          ) : top10.length === 0 ? (
            <div className="text-slate-400 text-sm py-12 text-center">
              এই সময়সীমায় কোনো পারফরম্যান্স ডেটা নেই।
            </div>
          ) : (
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} layout="vertical" margin={{ left: 24, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => fmtMs(v)} />
                  <YAxis type="category" dataKey="label" width={220}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmtMs(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="p50" name="p50" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="p95" name="p95" radius={[0, 4, 4, 0]}>
                    {top10.map((r, i) => <Cell key={i} fill={severityColor(r.p95)} />)}
                  </Bar>
                  <Bar dataKey="p99" name="p99" fill="hsl(280 70% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-fuchsia-500/20">
        <CardHeader className="pb-3 border-b border-fuchsia-500/10">
          <CardTitle className="text-white text-base">বিস্তারিত পরিমাপ</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-48 w-full bg-slate-800/40" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/50">
                    <th className="text-left py-2 px-3">রুট</th>
                    <th className="text-left py-2 px-3">ধরন</th>
                    <th className="text-right py-2 px-3">স্যাম্পল</th>
                    <th className="text-right py-2 px-3">p50</th>
                    <th className="text-right py-2 px-3">p95</th>
                    <th className="text-right py-2 px-3">p99</th>
                    <th className="text-right py-2 px-3">max</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-500">কোনো ডেটা নেই</td></tr>
                  )}
                  {filtered
                    .slice()
                    .sort((a, b) => Number(b.p95_ms) - Number(a.p95_ms))
                    .map((r, i) => (
                      <tr key={`${r.route}-${r.metric_type}-${i}`} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                        <td className="py-2 px-3 text-slate-200 font-mono text-xs">{r.route || '—'}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-xs border-fuchsia-500/30 text-fuchsia-200">
                            {METRIC_LABELS[r.metric_type] ?? r.metric_type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">{Number(r.sample_count).toLocaleString('bn-BD')}</td>
                        <td className="py-2 px-3 text-right text-emerald-300">{fmtMs(Number(r.p50_ms))}</td>
                        <td className="py-2 px-3 text-right" style={{ color: severityColor(Number(r.p95_ms)) }}>
                          {fmtMs(Number(r.p95_ms))}
                        </td>
                        <td className="py-2 px-3 text-right text-violet-300">{fmtMs(Number(r.p99_ms))}</td>
                        <td className="py-2 px-3 text-right text-rose-300">{fmtMs(Number(r.max_ms))}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  icon, label, value, hint, tone,
}: { icon: React.ReactNode; label: string; value: string; hint: string; tone: 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose' }) {
  const toneCls: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-blue-500/5 border-cyan-500/20 text-cyan-200',
    violet: 'from-violet-500/10 to-purple-500/5 border-violet-500/20 text-violet-200',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-200',
    emerald: 'from-emerald-500/10 to-green-500/5 border-emerald-500/20 text-emerald-200',
    rose: 'from-rose-500/10 to-pink-500/5 border-rose-500/20 text-rose-200',
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 ${toneCls[tone]}`}>
      <div className="flex items-center gap-2 text-xs opacity-80">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-[11px] opacity-60 mt-0.5">{hint}</div>
    </div>
  );
}
