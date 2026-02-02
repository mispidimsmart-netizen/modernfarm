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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['device_health'] });
        }
      )
      .subscribe();

    return () => {
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

// Helper to get signal strength label
export function getSignalStrengthLabel(rssi: number | null): { label: string; labelBn: string; level: 'excellent' | 'good' | 'fair' | 'weak' } {
  if (rssi === null) return { label: 'Unknown', labelBn: 'অজানা', level: 'weak' };
  if (rssi >= -50) return { label: 'Excellent', labelBn: 'চমৎকার', level: 'excellent' };
  if (rssi >= -60) return { label: 'Good', labelBn: 'ভালো', level: 'good' };
  if (rssi >= -70) return { label: 'Fair', labelBn: 'মধ্যম', level: 'fair' };
  return { label: 'Weak', labelBn: 'দুর্বল', level: 'weak' };
}

// Helper to format uptime
export function formatUptime(seconds: number | null): string {
  if (seconds === null) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper to check if device is offline
export function isDeviceOffline(lastSeenAt: string | null, thresholdMinutes: number = 5): boolean {
  if (!lastSeenAt) return true;
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  return diffMs > thresholdMinutes * 60 * 1000;
}
