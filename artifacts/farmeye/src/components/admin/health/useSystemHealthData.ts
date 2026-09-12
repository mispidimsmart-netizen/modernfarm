import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { SENSOR_RANGES, buildProblemMap, getSensorStatus } from './healthUtils';

export interface HealthProfile {
  id: string;
  farm_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  farm_type: string;
}

/**
 * All data fetching for the admin System Health slice.
 * Components below stay presentational; this hook owns query keys + polling.
 */
export function useSystemHealthData(selectedUserId: string) {
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-for-health'],
    queryFn: async (): Promise<HealthProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url, farm_type')
        .order('farm_name');
      if (error) throw error;
      return (data || []).map((p: any) => ({ ...p, farm_type: p.farm_type || 'layer' }));
    },
  });

  const problemUsersQuery = useQuery({
    queryKey: ['admin-problem-users'],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const [{ data: offlineDevices }, { data: powerOutages }, { data: criticalAlerts }, { data: recentSensorUsers }] =
        await Promise.all([
          supabase.from('device_health').select('user_id, is_online, last_seen_at').eq('is_online', false),
          supabase.from('power_outages').select('user_id').eq('is_ongoing', true),
          supabase.from('alerts').select('user_id').eq('severity', 'danger').gte('created_at', todayStr),
          supabase.from('sensor_readings').select('user_id').gte('recorded_at', oneHourAgo),
        ]);

      const recentUserIds = new Set((recentSensorUsers || []).map((s: any) => s.user_id));
      const noSensorDataUserIds = (profiles || []).map((p) => p.id).filter((id) => !recentUserIds.has(id));

      return buildProblemMap({
        offlineDevices: offlineDevices as any,
        powerOutages: powerOutages as any,
        criticalAlerts: criticalAlerts as any,
        noSensorDataUserIds,
        formatLastSeen: (iso) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: bn }),
      })
        .map((p) => ({ ...p, profile: profiles?.find((profile) => profile.id === p.userId) }))
        .filter((p) => p.profile);
    },
    enabled: !!profiles && profiles.length > 0,
    refetchInterval: 60000,
  });

  const dbStatusQuery = useQuery({
    queryKey: ['admin-db-status'],
    queryFn: async () => {
      const start = Date.now();
      try {
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        return { connected: !error, latency: Date.now() - start, error: error?.message };
      } catch (e) {
        return { connected: false, latency: 0, error: String(e) };
      }
    },
    refetchInterval: 30000,
  });

  const activityStatsQuery = useQuery({
    queryKey: ['admin-activity-stats', selectedUserId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();
      const scoped = <T extends { eq: (c: string, v: string) => T }>(q: T) =>
        selectedUserId !== 'all' ? q.eq('user_id', selectedUserId) : q;

      const { count: sensorLogsCount } = await scoped(
        supabase.from('sensor_readings').select('*', { count: 'exact', head: true }).gte('recorded_at', todayStr) as any,
      );
      const { count: ongoingOutages } = await scoped(
        supabase.from('power_outages').select('*', { count: 'exact', head: true }).eq('is_ongoing', true) as any,
      );
      const { data: devices } = await scoped(
        supabase
          .from('device_health')
          .select('is_online, last_seen_at, failsafe_mode')
          .order('last_seen_at', { ascending: false })
          .limit(20) as any,
      );
      const { count: alertsCount } = await scoped(
        supabase.from('alerts').select('*', { count: 'exact', head: true }).gte('created_at', todayStr) as any,
      );

      const list = (devices as any[]) || [];
      return {
        sensorLogsToday: sensorLogsCount || 0,
        ongoingOutages: ongoingOutages || 0,
        onlineDevices: list.filter((d) => d.is_online).length,
        totalDevices: list.length,
        failsafeDevices: list.filter((d) => d.failsafe_mode).length,
        alertsToday: alertsCount || 0,
      };
    },
    refetchInterval: 60000,
  });

  const userDeviceHealthQuery = useQuery({
    queryKey: ['admin-user-device-health', selectedUserId],
    queryFn: async () => {
      if (selectedUserId === 'all') return [];
      const { data, error } = await supabase
        .from('device_health')
        .select(
          `id, is_online, last_seen_at, failsafe_mode, mode, wifi_signal_strength, battery_percentage,
           uptime_seconds, firmware_version, last_cloud_sync_at, cpu_temperature, free_memory_bytes,
           power_source, device_token_id, device_tokens!inner(device_name)`,
        )
        .eq('user_id', selectedUserId)
        .order('last_seen_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Error fetching user device health:', error);
        return [];
      }
      return data || [];
    },
    enabled: selectedUserId !== 'all',
    refetchInterval: 30000,
  });

  const recentDevicesQuery = useQuery({
    queryKey: ['admin-recent-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_health')
        .select(
          `id, is_online, last_seen_at, failsafe_mode, mode, wifi_signal_strength,
           battery_percentage, device_token_id, user_id, device_tokens!inner(device_name)`,
        )
        .order('last_seen_at', { ascending: false })
        .limit(5);
      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }
      return data || [];
    },
    enabled: selectedUserId === 'all',
    refetchInterval: 30000,
  });

  const recentErrorsQuery = useQuery({
    queryKey: ['admin-recent-errors', selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('id, message, message_bn, severity, alert_type, created_at, user_id')
        .eq('severity', 'danger')
        .order('created_at', { ascending: false })
        .limit(5);
      if (selectedUserId !== 'all') query = query.eq('user_id', selectedUserId);
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 60000,
  });

  const sensorHealthQuery = useQuery({
    queryKey: ['admin-sensor-health', selectedUserId],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, water_usage, recorded_at')
        .gte('recorded_at', oneHourAgo)
        .order('recorded_at', { ascending: false })
        .limit(10);
      if (selectedUserId !== 'all') query = query.eq('user_id', selectedUserId);

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sensor health:', error);
        return null;
      }

      const empty = { status: 'no_data' as const, value: null, lastReading: null };
      if (!data || data.length === 0) {
        return { temperature: empty, humidity: empty, ammonia: empty, waterFlow: empty };
      }

      const latest = data[0];
      const lastReading = latest.recorded_at;
      return {
        temperature: {
          status: getSensorStatus(latest.temperature, SENSOR_RANGES.temperature),
          value: latest.temperature,
          lastReading,
        },
        humidity: {
          status: getSensorStatus(latest.humidity, SENSOR_RANGES.humidity),
          value: latest.humidity,
          lastReading,
        },
        ammonia: {
          status: getSensorStatus(latest.ammonia, SENSOR_RANGES.ammonia),
          value: latest.ammonia,
          lastReading,
        },
        waterFlow: {
          status: getSensorStatus(latest.water_usage, SENSOR_RANGES.waterFlow),
          value: latest.water_usage,
          lastReading,
        },
      };
    },
    refetchInterval: 30000,
  });

  return {
    profiles,
    problemUsers: problemUsersQuery.data,
    loadingProblems: problemUsersQuery.isLoading,
    dbStatus: dbStatusQuery.data,
    loadingDb: dbStatusQuery.isLoading,
    activityStats: activityStatsQuery.data,
    loadingActivity: activityStatsQuery.isLoading,
    userDeviceHealth: userDeviceHealthQuery.data,
    loadingUserDevice: userDeviceHealthQuery.isLoading,
    recentDevices: recentDevicesQuery.data,
    loadingDevices: recentDevicesQuery.isLoading,
    recentErrors: recentErrorsQuery.data,
    loadingErrors: recentErrorsQuery.isLoading,
    sensorHealth: sensorHealthQuery.data,
    loadingSensorHealth: sensorHealthQuery.isLoading,
  };
}
