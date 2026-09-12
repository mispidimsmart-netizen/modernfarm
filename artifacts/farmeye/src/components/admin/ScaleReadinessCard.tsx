import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Server, Gauge, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ScaleSummary {
  generated_at: string;
  connections: { total: number; active: number; idle: number; idle_in_tx: number };
  tables: Array<{ table: string; rows: number; size_bytes: number; size_pretty: string }>;
  sensor_partitions: { expected_months: number; present_months: number; partitions: string[] };
  edge_1h: {
    window_minutes: number;
    request_count: number;
    error_5xx: number;
    rate_limited: number;
    p95_ms_max: number;
    p99_ms_max: number;
  };
  edge_24h: { requests: number; errors_5xx: number };
  capacity: { farms: number; devices: number; devices_per_farm: number };
}

function Stat({
  label, value, tone = 'default', icon, hint,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  icon?: React.ReactNode;
  hint?: string;
}) {
  const cls =
    tone === 'good' ? 'bg-primary/10 text-primary border-primary/20'
    : tone === 'warn' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    : tone === 'bad' ? 'bg-destructive/10 text-destructive border-destructive/20'
    : 'bg-muted text-foreground border-border';
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs flex items-center gap-1 opacity-80">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] opacity-70 mt-0.5">{hint}</div>}
    </div>
  );
}

export function ScaleReadinessCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scale_readiness_summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('scale_readiness_summary');
      if (error) throw error;
      return data as ScaleSummary;
    },
    refetchInterval: 60_000,
  });

  const { data: runs } = useQuery({
    queryKey: ['load_test_runs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('load_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; scenario: string; target_vus: number; duration_seconds: number;
        total_requests: number; error_rate_pct: number;
        p50_ms: number | null; p95_ms: number | null; p99_ms: number | null;
        created_at: string;
      }>;
    },
  });

  if (isLoading) {
    return (
      <Card><CardHeader><CardTitle>স্কেল রেডিনেস</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">লোড হচ্ছে…</CardContent></Card>
    );
  }
  if (error || !data) {
    return (
      <Card><CardHeader><CardTitle>স্কেল রেডিনেস</CardTitle></CardHeader>
        <CardContent className="text-sm text-destructive">ডেটা আনতে ব্যর্থ — সুপার-অ্যাডমিন প্রয়োজন।</CardContent></Card>
    );
  }

  const partitionsOk = data.sensor_partitions.present_months >= 3;
  const connectionsOk = data.connections.total < 60;
  const errorRate24h = data.edge_24h.requests > 0
    ? (data.edge_24h.errors_5xx / data.edge_24h.requests) * 100
    : 0;
  const errorOk = errorRate24h < 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Gauge className="h-5 w-5" />স্কেল রেডিনেস (Phase 7)</span>
          <Badge variant="outline" className="text-[10px]">
            {new Date(data.generated_at).toLocaleTimeString('bn-BD')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            icon={<Database className="h-3 w-3" />}
            label="DB কানেকশন"
            value={data.connections.total}
            tone={connectionsOk ? 'good' : 'warn'}
            hint={`${data.connections.active} active`}
          />
          <Stat
            icon={<Activity className="h-3 w-3" />}
            label="Edge 1h রিকোয়েস্ট"
            value={data.edge_1h.request_count.toLocaleString('bn-BD')}
            hint={`p99 ${Math.round(data.edge_1h.p99_ms_max)}ms`}
          />
          <Stat
            icon={<Server className="h-3 w-3" />}
            label="ত্রুটি ২৪ঘ"
            value={`${errorRate24h.toFixed(2)}%`}
            tone={errorOk ? 'good' : 'bad'}
            hint={`${data.edge_24h.errors_5xx} / ${data.edge_24h.requests}`}
          />
          <Stat
            icon={<Layers className="h-3 w-3" />}
            label="পার্টিশন (মাস)"
            value={`${data.sensor_partitions.present_months}/6`}
            tone={partitionsOk ? 'good' : 'warn'}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat label="ফার্ম সংখ্যা" value={data.capacity.farms} />
          <Stat label="ডিভাইস সংখ্যা" value={data.capacity.devices} />
          <Stat label="গড় ডিভাইস/ফার্ম" value={data.capacity.devices_per_farm} />
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">শীর্ষ ৫ টেবিল আকার</div>
          <div className="space-y-1">
            {data.tables.slice(0, 5).map((t) => (
              <div key={t.table} className="flex items-center justify-between text-xs border-b border-border/50 py-1">
                <span className="font-mono truncate">{t.table}</span>
                <span className="text-muted-foreground">
                  {t.rows.toLocaleString('bn-BD')} সারি · {t.size_pretty}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">সাম্প্রতিক লোড টেস্ট</div>
          {!runs || runs.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              কোনো লোড টেস্ট রেকর্ড নেই। স্ক্রিপ্ট: <code className="font-mono">docs/load-testing/k6-esp32-sync.js</code>
            </div>
          ) : (
            <div className="space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs border-b border-border/50 py-1">
                  <span>{r.scenario} · {r.target_vus} VUs</span>
                  <span className="text-muted-foreground">
                    p95 {r.p95_ms}ms · err {r.error_rate_pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground border-t pt-2 space-y-0.5">
          <div>• Multi-region edge / PgBouncer / CDN — Lovable Cloud দ্বারা পরিচালিত</div>
          <div>• ক্যাপাসিটি বাড়াতে: Backend → Lovable Cloud → Advanced → Upgrade instance</div>
        </div>
      </CardContent>
    </Card>
  );
}
