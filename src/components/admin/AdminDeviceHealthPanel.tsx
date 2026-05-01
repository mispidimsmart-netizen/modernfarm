import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Wifi, WifiOff, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RestartHistorySheet } from '@/components/device/RestartHistorySheet';

interface Props {
  language: 'bn' | 'en';
}

interface DeviceRow {
  id: string;
  device_token_id: string;
  farm_id: string | null;
  is_online: boolean;
  last_seen_at: string;
  uptime_seconds: number | null;
  wifi_signal_strength: number | null;
  restart_count: number | null;
  last_restart_at: string | null;
  restart_reason: string | null;
  firmware_version: string | null;
  error_count: number | null;
  last_error_message: string | null;
  farm_name?: string;
  device_name?: string;
}

export function AdminDeviceHealthPanel({ language }: Props) {
  const [historyDeviceId, setHistoryDeviceId] = useState<string | null>(null);

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

  const onlineCount = data?.filter(d => d.is_online).length ?? 0;
  const totalCount = data?.length ?? 0;
  const offlineCount = totalCount - onlineCount;

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
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent font-semibold">
                {language === 'bn' ? 'সব ডিভাইস হেলথ (সব ফার্ম)' : 'All Device Health (Cross-tenant)'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                  ✅ {onlineCount} {language === 'bn' ? 'অনলাইন' : 'online'}
                </Badge>
                <Badge variant="outline" className="text-red-400 border-red-500/30 text-xs">
                  ❌ {offlineCount} {language === 'bn' ? 'অফলাইন' : 'offline'}
                </Badge>
              </div>
            </div>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-20 bg-slate-800/50" />
            <Skeleton className="h-20 bg-slate-800/50" />
          </>
        )}
        {!isLoading && totalCount === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            {language === 'bn' ? 'কোনো ডিভাইস পাওয়া যায়নি' : 'No devices found'}
          </p>
        )}
        {data?.map(device => (
          <div
            key={device.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {device.is_online ? (
                    <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-white truncate">
                    {device.farm_name || (language === 'bn' ? 'অজানা ফার্ম' : 'Unknown farm')}
                  </p>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {device.device_name || device.device_token_id.slice(0, 8)}
                  {device.firmware_version && ` • v${device.firmware_version}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setHistoryDeviceId(device.device_token_id)}
                className="text-xs text-cyan-400 hover:text-cyan-300 shrink-0"
              >
                <Clock className="w-3 h-3 mr-1" />
                {language === 'bn' ? 'রিস্টার্ট' : 'Restarts'}
              </Button>
            </div>
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
