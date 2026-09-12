import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Wifi,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { bn } from 'date-fns/locale';

type Window = '1d' | '7d' | '30d';

interface Row {
  id: string;
  command_id: string;
  command_type: string;
  device_name: string;
  status: string;
  source: string | null;
  retry_count: number;
  error_message: string | null;
  user_id: string;
  farm_id: string | null;
  shed_id: string | null;
  created_at: string;
  acked_at: string | null;
  sent_at: string | null;
  expired_at: string | null;
}

const sinceFor = (w: Window) => subDays(new Date(), w === '1d' ? 1 : w === '7d' ? 7 : 30).toISOString();

export function AdminCommandDeliveryPanel() {
  const [windowSel, setWindowSel] = useState<Window>('7d');

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-cmd-delivery', windowSel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_command_log')
        .select('*')
        .gte('created_at', sinceFor(windowSel))
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as Row[];
    },
    refetchInterval: 30_000,
  });

  // Resolve farm names
  const farmIds = useMemo(
    () => Array.from(new Set(rows.map(r => r.farm_id).filter(Boolean))) as string[],
    [rows],
  );
  const { data: farmsMap = {} } = useQuery({
    queryKey: ['admin-cmd-delivery-farms', farmIds.join(',')],
    queryFn: async () => {
      if (farmIds.length === 0) return {};
      const { data, error } = await supabase
        .from('farms')
        .select('id,name')
        .in('id', farmIds);
      if (error) throw error;
      const m: Record<string, string> = {};
      (data || []).forEach((f: any) => (m[f.id] = f.name));
      return m;
    },
    enabled: farmIds.length > 0,
  });

  const stats = useMemo(() => {
    const s = { total: rows.length, acked: 0, expired: 0, failed: 0, pending: 0, sent: 0 };
    rows.forEach(r => {
      if (r.status === 'acked') s.acked++;
      else if (r.status === 'expired') s.expired++;
      else if (r.status === 'failed') s.failed++;
      else if (r.status === 'sent') s.sent++;
      else s.pending++;
    });
    return s;
  }, [rows]);

  const successRate = stats.total > 0 ? Math.round((stats.acked / stats.total) * 100) : 0;

  // Per-farm aggregation
  const perFarm = useMemo(() => {
    const map = new Map<string, { farmId: string; total: number; acked: number; expired: number; failed: number; lastError?: string; lastAt?: string }>();
    rows.forEach(r => {
      const key = r.farm_id || 'unknown';
      const e = map.get(key) || { farmId: key, total: 0, acked: 0, expired: 0, failed: 0 };
      e.total++;
      if (r.status === 'acked') e.acked++;
      else if (r.status === 'expired') e.expired++;
      else if (r.status === 'failed') e.failed++;
      if ((r.status === 'expired' || r.status === 'failed') && !e.lastError) {
        e.lastError = r.error_message || r.status;
        e.lastAt = r.created_at;
      }
      map.set(key, e);
    });
    return Array.from(map.values())
      .map(e => ({ ...e, successPct: e.total > 0 ? Math.round((e.acked / e.total) * 100) : 0 }))
      .sort((a, b) => a.successPct - b.successPct); // worst first
  }, [rows]);

  const recentFailures = useMemo(
    () => rows.filter(r => r.status === 'expired' || r.status === 'failed').slice(0, 30),
    [rows],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
            ডিভাইস কমান্ড ডেলিভারি (ফ্লিট-ওয়াইড)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={windowSel} onValueChange={v => setWindowSel(v as Window)}>
            <SelectTrigger className="h-9 w-32 bg-slate-800/80 border-cyan-500/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">গত ২৪ ঘণ্টা</SelectItem>
              <SelectItem value="7d">গত ৭ দিন</SelectItem>
              <SelectItem value="30d">গত ৩০ দিন</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-slate-800/80 border-cyan-500/20 text-cyan-200 hover:bg-cyan-500/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatTile label="মোট কমান্ড" value={stats.total} icon={Activity} color="from-slate-600 to-slate-800" />
        <StatTile label="সাফল্য %" value={`${successRate}%`} icon={CheckCircle2} color="from-emerald-600 to-teal-700" />
        <StatTile label="সম্পন্ন" value={stats.acked} icon={CheckCircle2} color="from-green-600 to-emerald-700" />
        <StatTile label="অপেক্ষায়" value={stats.pending + stats.sent} icon={Clock} color="from-amber-500 to-yellow-600" />
        <StatTile label="মেয়াদোত্তীর্ণ" value={stats.expired} icon={Wifi} color="from-orange-600 to-rose-700" />
        <StatTile label="ব্যর্থ" value={stats.failed} icon={XCircle} color="from-rose-600 to-red-700" />
      </div>

      {/* Per-farm leaderboard (worst delivery) */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            খামার-ভিত্তিক ডেলিভারি (সবচেয়ে দুর্বল প্রথমে)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 bg-slate-700/40" />)}
            </div>
          ) : perFarm.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">কোনো ডেটা নেই</p>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {perFarm.map(f => {
                  const farmName = f.farmId === 'unknown' ? '— অজানা খামার —' : (farmsMap[f.farmId] || f.farmId.slice(0, 8));
                  const tone =
                    f.successPct >= 90 ? 'border-emerald-500/40 text-emerald-300' :
                    f.successPct >= 70 ? 'border-amber-500/40 text-amber-300' :
                    'border-rose-500/40 text-rose-300';
                  return (
                    <div key={f.farmId} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">🏠 {farmName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          মোট {f.total} • সম্পন্ন {f.acked} • মেয়াদোত্তীর্ণ {f.expired} • ব্যর্থ {f.failed}
                        </p>
                        {f.lastError && (
                          <p className="text-[10px] text-rose-300/80 mt-0.5 truncate">
                            ⚠ {f.lastError}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={`ml-3 ${tone} text-base font-bold px-3 py-1`}>
                        {f.successPct}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recent failures stream */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-rose-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            সাম্প্রতিক ব্যর্থতা ({recentFailures.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFailures.length === 0 ? (
            <p className="text-sm text-emerald-300 text-center py-6">✅ কোনো ব্যর্থতা নেই</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {recentFailures.map(r => {
                  const isOffline = r.status === 'expired';
                  const farmName = r.farm_id ? (farmsMap[r.farm_id] || r.farm_id.slice(0, 8)) : '—';
                  return (
                    <div key={r.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={isOffline ? 'border-orange-500/40 text-orange-300' : 'border-rose-500/40 text-rose-300'}>
                          {isOffline ? '📡 অফলাইন' : '⚠ ব্যর্থ'}
                        </Badge>
                        <span className="text-sm text-white font-medium">{r.command_type}</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-300 text-[10px]">
                          {r.device_name}
                        </Badge>
                        <span className="text-xs text-slate-400">🏠 {farmName}</span>
                        <span className="text-xs text-slate-500 ml-auto">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: bn })}
                        </span>
                      </div>
                      {r.error_message && (
                        <p className="text-xs text-rose-300/80 mt-1">{r.error_message}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className={`bg-gradient-to-br ${color} border border-white/10 text-white`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/70">{label}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
          </div>
          <Icon className="w-5 h-5 text-white/60" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminCommandDeliveryPanel;
