import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

interface SystemHealthCardProps {
  language?: 'bn' | 'en';
}

const t = {
  bn: {
    systemHealth: 'সিস্টেম হেলথ',
    database: 'ডেটাবেজ',
    connected: 'সংযুক্ত',
    disconnected: 'বিচ্ছিন্ন',
    recentActivity: 'সাম্প্রতিক কার্যকলাপ',
    noActivity: 'কোনো কার্যকলাপ নেই',
    deviceStatus: 'ডিভাইস স্ট্যাটাস',
    online: 'অনলাইন',
    offline: 'অফলাইন',
    lastSeen: 'শেষ দেখা',
    sensorLogs: 'সেন্সর লগ (আজ)',
    automationRuns: 'অটোমেশন রান',
    powerOutages: 'বিদ্যুৎ বিভ্রাট',
    errorLogs: 'এরর লগ',
    noErrors: 'কোনো এরর নেই',
    systemOk: 'সিস্টেম স্বাভাবিক',
  },
  en: {
    systemHealth: 'System Health',
    database: 'Database',
    connected: 'Connected',
    disconnected: 'Disconnected',
    recentActivity: 'Recent Activity',
    noActivity: 'No activity',
    deviceStatus: 'Device Status',
    online: 'Online',
    offline: 'Offline',
    lastSeen: 'Last seen',
    sensorLogs: 'Sensor Logs (Today)',
    automationRuns: 'Automation Runs',
    powerOutages: 'Power Outages',
    errorLogs: 'Error Logs',
    noErrors: 'No errors',
    systemOk: 'System OK',
  },
};

export function SystemHealthCard({ language = 'bn' }: SystemHealthCardProps) {
  const labels = t[language];

  // Check database connection
  const { data: dbStatus, isLoading: loadingDb } = useQuery({
    queryKey: ['admin-db-status'],
    queryFn: async () => {
      const start = Date.now();
      try {
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const latency = Date.now() - start;
        return { connected: !error, latency, error: error?.message };
      } catch (e) {
        return { connected: false, latency: 0, error: String(e) };
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Get today's activity stats
  const { data: activityStats, isLoading: loadingActivity } = useQuery({
    queryKey: ['admin-activity-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Sensor logs today
      const { count: sensorLogsCount } = await supabase
        .from('sensor_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', todayStr);

      // Power outages (ongoing)
      const { count: ongoingOutages } = await supabase
        .from('power_outages')
        .select('*', { count: 'exact', head: true })
        .eq('is_ongoing', true);

      // Device health
      const { data: devices } = await supabase
        .from('device_health')
        .select('is_online, last_seen_at, failsafe_mode')
        .order('last_seen_at', { ascending: false })
        .limit(20);

      const onlineDevices = devices?.filter(d => d.is_online).length || 0;
      const totalDevices = devices?.length || 0;
      const failsafeDevices = devices?.filter(d => d.failsafe_mode).length || 0;

      return {
        sensorLogsToday: sensorLogsCount || 0,
        ongoingOutages: ongoingOutages || 0,
        onlineDevices,
        totalDevices,
        failsafeDevices,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Get recent device activity
  const { data: recentDevices, isLoading: loadingDevices } = useQuery({
    queryKey: ['admin-recent-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_health')
        .select(`
          id,
          is_online,
          last_seen_at,
          failsafe_mode,
          mode,
          wifi_signal_strength,
          battery_percentage,
          device_token_id,
          device_tokens!inner(device_name)
        `)
        .order('last_seen_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Get recent errors/alerts
  const { data: recentErrors, isLoading: loadingErrors } = useQuery({
    queryKey: ['admin-recent-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, message, message_bn, severity, alert_type, created_at')
        .eq('severity', 'danger')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 60000,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* System Status Card */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-cyan-400" />
            {labels.systemHealth}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Database Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="text-white">{labels.database}</span>
            </div>
            {loadingDb ? (
              <Skeleton className="h-6 w-20 bg-slate-600" />
            ) : (
              <div className="flex items-center gap-2">
                {dbStatus?.connected ? (
                  <>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {labels.connected}
                    </Badge>
                    <span className="text-xs text-gray-400">{dbStatus.latency}ms</span>
                  </>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    {labels.disconnected}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-700/30 text-center">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">
                {loadingActivity ? '-' : activityStats?.sensorLogsToday || 0}
              </p>
              <p className="text-xs text-gray-400">{labels.sensorLogs}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/30 text-center">
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${activityStats?.ongoingOutages ? 'text-red-400' : 'text-green-400'}`} />
              <p className="text-2xl font-bold text-white">
                {loadingActivity ? '-' : activityStats?.ongoingOutages || 0}
              </p>
              <p className="text-xs text-gray-400">{labels.powerOutages}</p>
            </div>
          </div>

          {/* Device Summary */}
          <div className="p-3 rounded-lg bg-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{labels.deviceStatus}</span>
              <div className="flex items-center gap-2">
                {activityStats?.failsafeDevices ? (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                    {activityStats.failsafeDevices} Failsafe
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium">
                  {loadingActivity ? '-' : activityStats?.onlineDevices || 0}
                </span>
                <span className="text-gray-400 text-sm">{labels.online}</span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-white font-medium">
                  {loadingActivity ? '-' : (activityStats?.totalDevices || 0) - (activityStats?.onlineDevices || 0)}
                </span>
                <span className="text-gray-400 text-sm">{labels.offline}</span>
              </div>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`p-3 rounded-lg text-center ${
            dbStatus?.connected && !activityStats?.ongoingOutages 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-orange-500/10 border border-orange-500/30'
          }`}>
            {dbStatus?.connected && !activityStats?.ongoingOutages ? (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">{labels.systemOk}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Attention Required</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Devices & Errors */}
      <Card className="bg-slate-800/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Server className="w-5 h-5 text-purple-400" />
            {labels.recentActivity}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px]">
            {/* Recent Devices */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.deviceStatus}</p>
              {loadingDevices ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full bg-slate-700/50" />
                  ))}
                </div>
              ) : recentDevices && recentDevices.length > 0 ? (
                <div className="space-y-2">
                  {recentDevices.map((device: any) => (
                    <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
                      <div className="flex items-center gap-2">
                        {device.is_online ? (
                          <Wifi className="w-4 h-4 text-green-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                        <div>
                          <p className="text-sm text-white">{device.device_tokens?.device_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">
                            {device.mode} {device.failsafe_mode && '⚠️ Failsafe'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {device.wifi_signal_strength && (
                          <p className="text-xs text-gray-400">{device.wifi_signal_strength}dBm</p>
                        )}
                        {device.last_seen_at && (
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true, locale: bn })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">{labels.noActivity}</p>
              )}
            </div>

            {/* Recent Errors */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{labels.errorLogs}</p>
              {loadingErrors ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-10 w-full bg-slate-700/50" />
                  ))}
                </div>
              ) : recentErrors && recentErrors.length > 0 ? (
                <div className="space-y-2">
                  {recentErrors.map((error: any) => (
                    <div key={error.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-red-300 truncate">
                          {language === 'bn' ? error.message_bn : error.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-red-500/30 text-red-400">
                            {error.alert_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(error.created_at), { addSuffix: true, locale: bn })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-green-400 text-sm">{labels.noErrors}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
