import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DeviceHealth {
  id: string;
  device_token_id: string;
  user_id: string;
  shed_id: string | null;
  wifi_signal_strength: number | null;
  uptime_seconds: number | null;
  free_memory_bytes: number | null;
  cpu_temperature: number | null;
  power_source: string;
  battery_percentage: number | null;
  battery_capacity_wh: number | null;
  power_consumption_w: number | null;
  firmware_version: string | null;
  last_restart_at: string | null;
  error_count: number;
  last_error_message: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  // Fail-safe mode fields
  failsafe_mode: boolean;
  failsafe_activated_at: string | null;
  last_cloud_sync_at: string | null;
  cached_settings_version: number;
  // Production reliability fields v6.0
  restart_reason: string | null;
  restart_count: number | null;
  last_power_event_at: string | null;
  power_event_type: string | null;
  safe_mode_until: string | null;
  gas_sensor_warmup_done: boolean | null;
  gas_sensor_warmup_start: string | null;
  last_age_sync_at: string | null;
  offline_buffer_count: number | null;
  ota_status: string | null;
  ota_progress: number | null;
  ota_version_available: string | null;
  ota_last_check_at: string | null;
  online_duration_seconds: number | null;
  offline_duration_seconds: number | null;
  total_restarts: number | null;
  ammonia_avg_10: number | null;
  power_voltage_rms: number | null;
  consecutive_high_ammonia: number | null;
  // Broiler age source tracking
  broiler_age_source: string | null;
  last_server_age_sync_at: string | null;
  // Water monitoring fields
  water_anomaly_consecutive_count: number | null;
  water_last_2h_avg: number | null;
  water_24h_rolling_avg: number | null;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  device_name: string;
  shed_id: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

// Fetch all device tokens for a user
export function useDeviceTokens() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['device_tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DeviceToken[];
    },
    enabled: !!user,
  });
}

// Fetch device health for all devices
export function useAllDeviceHealth() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['device_health', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('device_health')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });
      if (error) throw error;
      return data as DeviceHealth[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime updates (throttled to prevent UI freezes on bursty updates)
  useEffect(() => {
    if (!user?.id) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;
    const MIN_INTERVAL = 1500; // ms
    const TRAIL_DELAY = 400;   // ms

    const scheduleInvalidate = () => {
      const now = Date.now();
      const sinceLast = now - lastRun;
      const wait = Math.max(TRAIL_DELAY, MIN_INTERVAL - sinceLast);
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        queryClient.invalidateQueries({
          queryKey: ['device_health'],
          refetchType: 'active',
        });
      }, wait);
    };

    const channel = supabase
      .channel(`device_health_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_health',
          filter: `user_id=eq.${user.id}`,
        },
        scheduleInvalidate,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

// Fetch device health for a specific shed
export function useDeviceHealthByShed(shedId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['device_health', 'shed', shedId],
    queryFn: async () => {
      if (!user || !shedId) return [];
      const { data, error } = await supabase
        .from('device_health')
        .select('*')
        .eq('user_id', user.id)
        .eq('shed_id', shedId);
      if (error) throw error;
      return data as DeviceHealth[];
    },
    enabled: !!user && !!shedId,
  });
}

// Add a new device token
export function useAddDeviceToken() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (device: { device_name: string; shed_id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Generate a unique token
      const token = `ESP32_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
      
      const { data, error } = await supabase
        .from('device_tokens')
        .insert({ 
          token,
          device_name: device.device_name,
          shed_id: device.shed_id || null,
          user_id: user.id 
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
    },
  });
}

// Update device token (e.g., assign to shed)
export function useUpdateDeviceToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeviceToken> & { id: string }) => {
      const { error } = await supabase
        .from('device_tokens')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
    },
  });
}

// Delete device token
export function useDeleteDeviceToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
      queryClient.invalidateQueries({ queryKey: ['device_health'] });
    },
  });
}

// Pure helpers live in @/lib/deviceHealthStatus; re-exported for backward compatibility
export {
  getSignalStrengthLabel,
  formatUptime,
  formatDuration,
  getRestartReasonLabel,
  getOTAStatusLabel,
  isDeviceOffline,
} from '@/lib/deviceHealthStatus';
