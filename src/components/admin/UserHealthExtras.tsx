import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, Wind, Gauge, Activity, Zap, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  language: 'bn' | 'en';
  userId: string; // 'all' or a real user id
}

// Tiny inline sparkline as SVG
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="text-[10px] text-slate-500">—</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function UserHealthExtras({ language, userId }: Props) {
  // Sensor sparkline data (last 24h, only when single user selected)
  const { data: sensorTrend, isLoading: loadingSensor } = useQuery({
    queryKey: ['user-health-sensor-trend', userId],
    queryFn: async () => {
      if (userId === 'all') return null;
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, recorded_at')
        .eq('user_id', userId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(120);
      if (error) return null;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Automation activity (24h)
  const { data: automation, isLoading: loadingAuto } = useQuery({
    queryKey: ['user-health-automation', userId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      let query = supabase
        .from('device_commands')
        .select('command_type, executed, created_at')
        .gte('created_at', since)
        .limit(500);
      if (userId !== 'all') query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) return null;
      const byType: Record<string, number> = {};
      let executed = 0;
      (data || []).forEach(c => {
        byType[c.command_type] = (byType[c.command_type] || 0) + 1;
        if (c.executed) executed++;
      });
      return { total: data?.length || 0, executed, byType };
    },
    refetchInterval: 60000,
  });

  // Data freshness score
  const { data: freshness, isLoading: loadingFresh } = useQuery({
    queryKey: ['user-health-freshness', userId],
    queryFn: async () => {
      if (userId === 'all') return null;
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const dayAgo = new Date(Date.now() - 86400_000).toISOString();

      const [sensorRes, deviceRes, autoRes] = await Promise.all([
        supabase.from('sensor_readings').select('recorded_at', { count: 'exact', head: true })
          .eq('user_id', userId).gte('recorded_at', hourAgo),
        supabase.from('device_health').select('is_online, last_seen_at')
          .eq('user_id', userId).order('last_seen_at', { ascending: false }).limit(5),
        supabase.from('device_commands').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).gte('created_at', dayAgo),
      ]);

      const sensorScore = Math.min(50, ((sensorRes.count || 0) / 12) * 50); // 12 readings/h = full
      const onlineDevices = (deviceRes.data || []).filter(d => d.is_online).length;
      const totalDevices = (deviceRes.data || []).length || 1;
      const deviceScore = (onlineDevices / totalDevices) * 30;
      const autoScore = Math.min(20, ((autoRes.count || 0) / 20) * 20);

      const score = Math.round(sensorScore + deviceScore + autoScore);
      return { score, sensorReadings: sensorRes.count || 0, onlineDevices, totalDevices, autoRuns: autoRes.count || 0 };
    },
    refetchInterval: 60000,
  });

  // Edge function health (from edge_logs analytics — best-effort, may be empty if no logs)
  const { data: edgeHealth } = useQuery({
    queryKey: ['user-health-edge'],
    queryFn: async () => {
      // Query recent alerts as proxy for backend health since edge logs need analytics access
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { data: dh } = await supabase
        .from('device_health')
        .select('last_cloud_sync_at, last_seen_at')
        .gte('last_seen_at', since)
        .limit(50);
      const totalSyncs = (dh || []).filter(d => d.last_cloud_sync_at &&
        new Date(d.last_cloud_sync_at).getTime() > Date.now() - 3600_000).length;
      return {
        recentSyncs: totalSyncs,
        activeDevices: (dh || []).length,
      };
    },
    refetchInterval: 60000,
  });

  const tempVals = (sensorTrend || []).map(r => r.temperature).filter(v => v != null) as number[];
  const humVals = (sensorTrend || []).map(r => r.humidity).filter(v => v != null) as number[];
  const ammVals = (sensorTrend || []).map(r => r.ammonia).filter(v => v != null) as number[];

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-emerald-300' : s >= 50 ? 'text-amber-300' : 'text-red-300';
  const scoreBg = (s: number) =>
    s >= 80 ? 'from-emerald-500/20 to-green-600/10 border-emerald-500/30' :
      s >= 50 ? 'from-amber-500/20 to-yellow-600/10 border-amber-500/30' :
        'from-red-500/20 to-rose-600/10 border-red-500/30';

  return (
    <div className="space-y-3">
      {/* Data Freshness Score - per user */}
      {userId !== 'all' && (
        <Card className={`p-4 bg-gradient-to-br text-primary ${freshness ? scoreBg(freshness.score) : 'from-slate-800/50 to-slate-900/50 border-slate-700/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">
                {language === 'bn' ? 'ডেটা ফ্রেশনেস স্কোর' : 'Data Freshness Score'}
              </span>
            </div>
            {loadingFresh ? (
              <Skeleton className="h-8 w-16 bg-slate-700" />
            ) : freshness ? (
              <span className={`text-3xl font-bold ${scoreColor(freshness.score)}`}>
                {freshness.score}<span className="text-base text-slate-400">/100</span>
              </span>
            ) : null}
          </div>
          {freshness && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900/40 rounded px-2 py-1">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'সেন্সর/ঘ' : 'Sensor/h'}</p>
                <p className="text-slate-200 font-medium">{freshness.sensorReadings}</p>
              </div>
              <div className="bg-slate-900/40 rounded px-2 py-1">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'অনলাইন' : 'Online'}</p>
                <p className="text-slate-200 font-medium">{freshness.onlineDevices}/{freshness.totalDevices}</p>
              </div>
              <div className="bg-slate-900/40 rounded px-2 py-1">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'অটো (২৪ঘ)' : 'Auto (24h)'}</p>
                <p className="text-slate-200 font-medium">{freshness.autoRuns}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Sparklines - per user */}
      {userId !== 'all' && (
        <Card className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/30 text-primary">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">
              {language === 'bn' ? 'সেন্সর ট্রেন্ড (২৪ ঘণ্টা)' : 'Sensor Trend (24h)'}
            </span>
          </div>
          {loadingSensor ? (
            <Skeleton className="h-20 bg-slate-700/50" />
          ) : (
            <div className="space-y-2">
              {[
                { icon: Thermometer, label: language === 'bn' ? 'তাপমাত্রা' : 'Temp', color: '#f97316', vals: tempVals, unit: '°C' },
                { icon: Droplets, label: language === 'bn' ? 'আর্দ্রতা' : 'Humidity', color: '#3b82f6', vals: humVals, unit: '%' },
                { icon: Wind, label: language === 'bn' ? 'অ্যামোনিয়া' : 'Ammonia', color: '#10b981', vals: ammVals, unit: 'ppm' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <row.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" style={{ color: row.color }} />
                  <span className="text-xs text-slate-300 w-16">{row.label}</span>
                  <div className="flex-1"><Sparkline values={row.vals} color={row.color} /></div>
                  <span className="text-xs text-slate-200 font-mono w-14 text-right">
                    {row.vals.length > 0 ? `${row.vals[row.vals.length - 1].toFixed(1)}${row.unit}` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Automation Activity */}
      <Card className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/30 text-primary">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">
              {language === 'bn' ? 'অটোমেশন (২৪ঘ)' : 'Automation (24h)'}
            </span>
          </div>
          {loadingAuto ? (
            <Skeleton className="h-6 w-12 bg-slate-700" />
          ) : automation ? (
            <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30">
              {automation.executed}/{automation.total}
            </Badge>
          ) : null}
        </div>
        {automation && automation.total > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(automation.byType).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-[10px] text-slate-300 border-slate-600">
                {type}: {count}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {language === 'bn' ? 'কোনো অটোমেশন কমান্ড নেই' : 'No automation commands'}
          </p>
        )}
      </Card>

      {/* Edge Function Health */}
      <Card className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">
              {language === 'bn' ? 'ব্যাকএন্ড সিঙ্ক হেলথ' : 'Backend Sync Health'}
            </span>
          </div>
          {edgeHealth && (
            <Badge className={`${edgeHealth.recentSyncs > 0 ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
              {edgeHealth.recentSyncs} / {edgeHealth.activeDevices}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          {language === 'bn'
            ? 'সক্রিয় ডিভাইস যারা শেষ ১ ঘণ্টায় ক্লাউডে সিঙ্ক করেছে'
            : 'Active devices that synced to cloud in last hour'}
        </p>
      </Card>
    </div>
  );
}
