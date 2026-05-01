import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Wifi, WifiOff, AlertTriangle, Clock, RefreshCw,
  Cpu, MemoryStick, Battery, ShieldAlert, Power, Download,
  Bell, Search, ArrowUpDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RestartHistorySheet } from '@/components/device/RestartHistorySheet';
import { toast } from 'sonner';

interface Props {
  language: 'bn' | 'en';
}

interface DeviceRow {
  id: string;
  device_token_id: string;
  user_id: string;
  farm_id: string | null;
  is_online: boolean;
  last_seen_at: string;
  uptime_seconds: number | null;
  wifi_signal_strength: number | null;
  restart_count: number | null;
  total_restarts: number | null;
  last_restart_at: string | null;
  restart_reason: string | null;
  firmware_version: string | null;
  error_count: number | null;
  last_error_message: string | null;
  cpu_temperature: number | null;
  free_memory_bytes: number | null;
  power_source: string | null;
  battery_percentage: number | null;
  failsafe_mode: boolean | null;
  farm_name?: string;
  device_name?: string;
}

type SortKey = 'last_seen' | 'uptime' | 'restarts' | 'wifi';
type FilterKey = 'all' | 'online' | 'offline' | 'failsafe';

export function AdminDeviceHealthPanel({ language }: Props) {
  const [historyDeviceId, setHistoryDeviceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('last_seen');
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-all-device-health'],
    queryFn: async () => {
      const { data: health, error } = await supabase
        .from('device_health')
        .select('*')
        .order('last_seen_at', { ascending: false });
      if (error) throw error;

      const farmIds = Array.from(new Set((health || []).map(h => h.farm_id).filter(Boolean) as string[]));
      const tokenIds = Array.from(new Set((health || []).map(h => h.device_token_id).filter(Boolean) as string[]));

      const [{ data: farms }, { data: tokens }] = await Promise.all([
        farmIds.length
          ? supabase.from('farms').select('id, name').in('id', farmIds)
          : Promise.resolve({ data: [] as any[] }),
        tokenIds.length
          ? supabase.from('device_tokens').select('id, device_name').in('id', tokenIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const farmMap = new Map((farms || []).map((f: any) => [f.id, f.name]));
      const tokenMap = new Map((tokens || []).map((t: any) => [t.id, t.device_name]));

      return (health || []).map(h => ({
        ...h,
        farm_name: h.farm_id ? farmMap.get(h.farm_id) : undefined,
        device_name: tokenMap.get(h.device_token_id),
      })) as DeviceRow[];
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-device-health-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_health' },
        () => queryClient.invalidateQueries({ queryKey: ['admin-all-device-health'] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (!data) return [] as DeviceRow[];
    let list = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.farm_name || '').toLowerCase().includes(q) ||
        (d.device_name || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'online') list = list.filter(d => d.is_online);
    else if (filter === 'offline') list = list.filter(d => !d.is_online);
    else if (filter === 'failsafe') list = list.filter(d => d.failsafe_mode);

    const sorted = [...list];
    if (sort === 'last_seen') {
      sorted.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    } else if (sort === 'uptime') {
      sorted.sort((a, b) => (b.uptime_seconds ?? 0) - (a.uptime_seconds ?? 0));
    } else if (sort === 'restarts') {
      sorted.sort((a, b) => (b.restart_count ?? 0) - (a.restart_count ?? 0));
    } else if (sort === 'wifi') {
      sorted.sort((a, b) => (b.wifi_signal_strength ?? -999) - (a.wifi_signal_strength ?? -999));
    }
    return sorted;
  }, [data, search, filter, sort]);

  // Fleet summary
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return { avgUptimeH: 0, totalRestarts24h: 0, fwVersions: {} as Record<string, number>, avgWifi: 0, online: 0, offline: 0, failsafe: 0 };
    }
    const onlineList = data.filter(d => d.is_online);
    const avgUptimeH = onlineList.length
      ? Math.round(onlineList.reduce((s, d) => s + (d.uptime_seconds ?? 0), 0) / onlineList.length / 3600)
      : 0;
    const wifiList = data.filter(d => d.wifi_signal_strength != null);
    const avgWifi = wifiList.length
      ? Math.round(wifiList.reduce((s, d) => s + (d.wifi_signal_strength ?? 0), 0) / wifiList.length)
      : 0;
    const dayAgo = Date.now() - 86400_000;
    const totalRestarts24h = data.filter(d => d.last_restart_at && new Date(d.last_restart_at).getTime() > dayAgo).length;
    const fwVersions: Record<string, number> = {};
    data.forEach(d => {
      const v = d.firmware_version || (language === 'bn' ? 'অজানা' : 'Unknown');
      fwVersions[v] = (fwVersions[v] || 0) + 1;
    });
    return {
      avgUptimeH, totalRestarts24h, fwVersions, avgWifi,
      online: onlineList.length,
      offline: data.length - onlineList.length,
      failsafe: data.filter(d => d.failsafe_mode).length,
    };
  }, [data, language]);

  // Critical devices for alert strip
  const criticalDevices = useMemo(() => {
    if (!data) return [] as DeviceRow[];
    const dayAgo = Date.now() - 86400_000;
    const hourAgo = Date.now() - 3600_000;
    return data.filter(d => {
      const lastSeen = new Date(d.last_seen_at).getTime();
      const isOldOffline = !d.is_online && lastSeen < hourAgo;
      const inFailsafe = !!d.failsafe_mode;
      const manyRestarts = !!d.last_restart_at && new Date(d.last_restart_at).getTime() > dayAgo && (d.restart_count ?? 0) >= 5;
      return isOldOffline || inFailsafe || manyRestarts;
    });
  }, [data]);

  const restartMutation = useMutation({
    mutationFn: async (device: DeviceRow) => {
      if (!device.device_name || !device.farm_id) throw new Error('Missing device_name or farm_id');
      const { error } = await supabase.from('device_commands').insert({
        user_id: device.user_id,
        farm_id: device.farm_id,
        device_name: device.device_name,
        command_type: 'restart',
        command_value: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'bn' ? 'রিস্টার্ট কমান্ড পাঠানো হয়েছে' : 'Restart command sent');
      setRestartingId(null);
    },
    onError: (e: any) => {
      toast.error((language === 'bn' ? 'ব্যর্থ: ' : 'Failed: ') + e.message);
      setRestartingId(null);
    },
  });

  const handleRestart = (device: DeviceRow) => {
    if (!confirm(language === 'bn'
      ? `"${device.farm_name}" এর ESP32 রিস্টার্ট করতে চান?`
      : `Restart ESP32 for "${device.farm_name}"?`)) return;
    setRestartingId(device.id);
    restartMutation.mutate(device);
  };

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ['Farm', 'Device', 'Online', 'LastSeen', 'UptimeH', 'WiFi_dBm', 'Restarts', 'CPU_C', 'FreeMem_KB', 'Power', 'Battery_%', 'Failsafe', 'Firmware', 'LastError'];
    const rows = data.map(d => [
      d.farm_name || '', d.device_name || '', d.is_online ? 'yes' : 'no',
      d.last_seen_at,
      d.uptime_seconds ? Math.round(d.uptime_seconds / 3600) : '',
      d.wifi_signal_strength ?? '',
      d.restart_count ?? 0,
      d.cpu_temperature ?? '',
      d.free_memory_bytes ? Math.round(d.free_memory_bytes / 1024) : '',
      d.power_source || '',
      d.battery_percentage ?? '',
      d.failsafe_mode ? 'yes' : 'no',
      d.firmware_version || '',
      (d.last_error_message || '').replace(/[\r\n,]/g, ' '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device-health-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkNotifyOffline = useMutation({
    mutationFn: async () => {
      const offline = (data || []).filter(d => !d.is_online);
      if (offline.length === 0) throw new Error(language === 'bn' ? 'কোনো অফলাইন ডিভাইস নেই' : 'No offline devices');
      const userIds = Array.from(new Set(offline.map(d => d.user_id)));
      const rows = userIds.map(uid => ({
        user_id: uid,
        alert_type: 'device' as const,
        severity: 'warning' as const,
        message: 'Your ESP32 device appears offline. Please check power and WiFi.',
        message_bn: 'আপনার ESP32 ডিভাইস অফলাইন দেখাচ্ছে। অনুগ্রহ করে পাওয়ার ও WiFi চেক করুন।',
      }));
      const { error } = await supabase.from('alerts').insert(rows);
      if (error) throw error;
      return userIds.length;
    },
    onSuccess: (count) => {
      toast.success(language === 'bn' ? `${count} জন ইউজারকে নোটিফাই করা হয়েছে` : `Notified ${count} users`);
    },
    onError: (e: any) => toast.error((language === 'bn' ? 'ব্যর্থ: ' : 'Failed: ') + e.message),
  });

  const formatUptime = (s: number | null) => {
    if (!s) return '—';
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    if (days > 0) return language === 'bn' ? `${days}দিন ${hours}ঘ` : `${days}d ${hours}h`;
    const mins = Math.floor((s % 3600) / 60);
    return language === 'bn' ? `${hours}ঘ ${mins}মি` : `${hours}h ${mins}m`;
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
      <CardHeader className="border-b border-emerald-500/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent font-semibold">
                {language === 'bn' ? 'সব ডিভাইস হেলথ (সব ফার্ম)' : 'All Device Health (Cross-tenant)'}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                  ✅ {summary.online} {language === 'bn' ? 'অনলাইন' : 'online'}
                </Badge>
                <Badge variant="outline" className="text-red-400 border-red-500/30 text-xs">
                  ❌ {summary.offline} {language === 'bn' ? 'অফলাইন' : 'offline'}
                </Badge>
                {summary.failsafe > 0 && (
                  <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {summary.failsafe} failsafe
                  </Badge>
                )}
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={exportCSV} className="text-slate-400 hover:text-white" title="CSV">
              <Download className="w-4 h-4" />
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => bulkNotifyOffline.mutate()}
              disabled={bulkNotifyOffline.isPending || summary.offline === 0}
              className="text-slate-400 hover:text-white"
              title={language === 'bn' ? 'অফলাইন ইউজারদের নোটিফাই' : 'Notify offline users'}
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="text-slate-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Fleet Summary Strip */}
        {!isLoading && data && data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase">{language === 'bn' ? 'গড় আপটাইম' : 'Avg Uptime'}</p>
              <p className="text-sm font-bold text-emerald-300">{summary.avgUptimeH}h</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase">{language === 'bn' ? 'রিস্টার্ট (২৪ঘ)' : 'Restarts (24h)'}</p>
              <p className="text-sm font-bold text-amber-300">{summary.totalRestarts24h}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase">{language === 'bn' ? 'গড় WiFi' : 'Avg WiFi'}</p>
              <p className="text-sm font-bold text-cyan-300">{summary.avgWifi} dBm</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase">{language === 'bn' ? 'ফার্মওয়্যার' : 'Firmware'}</p>
              <p className="text-xs font-medium text-slate-200 truncate">
                {Object.entries(summary.fwVersions).map(([v, c]) => `${v}(${c})`).join(', ') || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Critical Strip */}
        {criticalDevices.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/40 to-rose-950/30 px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-200 flex-1">
              <span className="font-bold">{criticalDevices.length}</span>{' '}
              {language === 'bn'
                ? 'ডিভাইস critical: >১ঘ অফলাইন / failsafe / ৫+ রিস্টার্ট'
                : 'devices critical: >1h offline / failsafe / 5+ restarts'}
            </p>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-red-300 hover:text-red-100" onClick={() => setFilter('offline')}>
              {language === 'bn' ? 'দেখুন' : 'View'}
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'bn' ? 'ফার্ম / ডিভাইস খুঁজুন' : 'Search farm / device'}
              className="pl-8 h-8 text-xs bg-slate-800/50 border-slate-700/50 text-white"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="h-8 w-[110px] text-xs bg-slate-800/50 border-slate-700/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব' : 'All'}</SelectItem>
              <SelectItem value="online">{language === 'bn' ? 'অনলাইন' : 'Online'}</SelectItem>
              <SelectItem value="offline">{language === 'bn' ? 'অফলাইন' : 'Offline'}</SelectItem>
              <SelectItem value="failsafe">Failsafe</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-slate-800/50 border-slate-700/50 text-white">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_seen">{language === 'bn' ? 'শেষ দেখা' : 'Last seen'}</SelectItem>
              <SelectItem value="uptime">{language === 'bn' ? 'আপটাইম' : 'Uptime'}</SelectItem>
              <SelectItem value="restarts">{language === 'bn' ? 'রিস্টার্ট' : 'Restarts'}</SelectItem>
              <SelectItem value="wifi">WiFi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading && (
          <>
            <Skeleton className="h-24 bg-slate-800/50" />
            <Skeleton className="h-24 bg-slate-800/50" />
          </>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            {language === 'bn' ? 'কোনো ডিভাইস পাওয়া যায়নি' : 'No devices found'}
          </p>
        )}
        {filtered.map(device => (
          <div
            key={device.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {device.is_online ? (
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-white truncate">
                    {device.farm_name || (language === 'bn' ? 'অজানা ফার্ম' : 'Unknown farm')}
                  </p>
                  {device.failsafe_mode && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                      <ShieldAlert className="w-2.5 h-2.5 mr-0.5" />Failsafe
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {device.device_name || device.device_token_id.slice(0, 8)}
                  {device.firmware_version && ` • v${device.firmware_version}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => handleRestart(device)}
                  disabled={restartingId === device.id || !device.farm_id}
                  className="text-xs text-orange-400 hover:text-orange-300 h-7 px-2"
                  title={language === 'bn' ? 'রিমোট রিস্টার্ট' : 'Remote restart'}
                >
                  <Power className={`w-3 h-3 ${restartingId === device.id ? 'animate-pulse' : ''}`} />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setHistoryDeviceId(device.device_token_id)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 h-7 px-2"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {language === 'bn' ? 'লগ' : 'Log'}
                </Button>
              </div>
            </div>

            {/* Primary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-900/50 rounded-lg px-2 py-1.5">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'আপটাইম' : 'Uptime'}</p>
                <p className="text-slate-200 font-medium">{formatUptime(device.uptime_seconds)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-2 py-1.5">
                <p className="text-slate-500 text-[10px]">WiFi</p>
                <p className="text-slate-200 font-medium">
                  {device.wifi_signal_strength ? `${device.wifi_signal_strength} dBm` : '—'}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-2 py-1.5">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'রিস্টার্ট' : 'Restarts'}</p>
                <p className="text-slate-200 font-medium">{device.restart_count ?? 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg px-2 py-1.5">
                <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'শেষ দেখা' : 'Last seen'}</p>
                <p className="text-slate-200 font-medium truncate">
                  {formatDistanceToNow(new Date(device.last_seen_at), {
                    addSuffix: true,
                    locale: language === 'bn' ? bn : undefined,
                  })}
                </p>
              </div>
            </div>

            {/* Hardware metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
              <div className="bg-slate-900/30 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 text-[10px]">CPU °C</p>
                  <p className={`font-medium ${(device.cpu_temperature ?? 0) > 70 ? 'text-red-300' : 'text-slate-200'}`}>
                    {device.cpu_temperature != null ? `${device.cpu_temperature.toFixed(0)}°` : '—'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900/30 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <MemoryStick className="w-3 h-3 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'ফ্রি মেম' : 'Free Mem'}</p>
                  <p className="text-slate-200 font-medium">
                    {device.free_memory_bytes ? `${Math.round(device.free_memory_bytes / 1024)}KB` : '—'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900/30 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <Power className="w-3 h-3 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'পাওয়ার' : 'Power'}</p>
                  <p className="text-slate-200 font-medium truncate capitalize">{device.power_source || '—'}</p>
                </div>
              </div>
              <div className="bg-slate-900/30 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                <Battery className="w-3 h-3 text-yellow-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-500 text-[10px]">{language === 'bn' ? 'ব্যাটারি' : 'Battery'}</p>
                  <p className="text-slate-200 font-medium">
                    {device.battery_percentage != null ? `${device.battery_percentage}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {device.last_error_message && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="truncate">{device.last_error_message}</span>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      {historyDeviceId && (
        <RestartHistorySheet
          open={!!historyDeviceId}
          onOpenChange={(open) => !open && setHistoryDeviceId(null)}
          deviceTokenId={historyDeviceId}
        />
      )}
    </Card>
  );
}
