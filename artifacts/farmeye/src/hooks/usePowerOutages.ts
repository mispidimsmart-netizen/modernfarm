import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface PowerOutage {
  id: string;
  user_id: string;
  device_token_id: string | null;
  shed_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  power_source: string;
  battery_level_start: number | null;
  battery_level_end: number | null;
  is_ongoing: boolean;
  alert_sent: boolean;
  critical_alert_sent: boolean;
  notes: string | null;
  created_at: string;
}

export interface PowerStats {
  totalOutages: number;
  totalDowntimeSeconds: number;
  avgOutageDuration: number;
  longestOutage: number;
  ongoingOutage: PowerOutage | null;
  last24hOutages: number;
  last7dOutages: number;
}

// Fetch ongoing power outages
export function useOngoingOutages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['power-outages', 'ongoing', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_ongoing', true)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as PowerOutage[];
    },
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Fetch power outage history
export function usePowerOutageHistory(days: number = 30) {
  const { user } = useAuth();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['power-outages', 'history', user?.id, days],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as PowerOutage[];
    },
    enabled: !!user,
  });
}

// Calculate power statistics
export function usePowerStats() {
  const { data: history } = usePowerOutageHistory(30);
  const { data: ongoing } = useOngoingOutages();

  if (!history) {
    return null;
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completedOutages = history.filter(o => !o.is_ongoing && o.duration_seconds);
  const totalDowntimeSeconds = completedOutages.reduce((sum, o) => sum + (o.duration_seconds || 0), 0);
  const avgOutageDuration = completedOutages.length > 0 
    ? totalDowntimeSeconds / completedOutages.length 
    : 0;
  const longestOutage = Math.max(...completedOutages.map(o => o.duration_seconds || 0), 0);

  const stats: PowerStats = {
    totalOutages: history.length,
    totalDowntimeSeconds,
    avgOutageDuration,
    longestOutage,
    ongoingOutage: ongoing?.[0] || null,
    last24hOutages: history.filter(o => new Date(o.started_at) >= last24h).length,
    last7dOutages: history.filter(o => new Date(o.started_at) >= last7d).length,
  };

  return stats;
}

// Estimate battery backup time
export function useBatteryBackupEstimate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['battery-backup-estimate', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get device health with battery info
      const { data: devices, error } = await supabase
        .from('device_health')
        .select('*')
        .eq('user_id', user.id)
        .not('battery_percentage', 'is', null);
      
      if (error) throw error;
      if (!devices || devices.length === 0) return null;

      // Calculate average battery status
      const avgBattery = devices.reduce((sum, d) => sum + (d.battery_percentage || 0), 0) / devices.length;
      const totalCapacityWh = devices.reduce((sum, d) => sum + (d.battery_capacity_wh || 0), 0);
      const totalConsumptionW = devices.reduce((sum, d) => sum + (d.power_consumption_w || 50), 0);

      // Calculate remaining backup time
      const remainingCapacityWh = (avgBattery / 100) * totalCapacityWh;
      const backupTimeHours = totalConsumptionW > 0 ? remainingCapacityWh / totalConsumptionW : 0;

      return {
        avgBatteryPercent: Math.round(avgBattery),
        totalCapacityWh,
        totalConsumptionW,
        backupTimeHours: Math.round(backupTimeHours * 10) / 10,
        backupTimeMinutes: Math.round(backupTimeHours * 60),
        deviceCount: devices.length,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

// Format duration
export function formatDuration(seconds: number, language: 'bn' | 'en' = 'en'): string {
  if (seconds < 60) {
    return language === 'bn' ? `${seconds} সেকেন্ড` : `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return language === 'bn' ? `${minutes} মিনিট` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return language === 'bn' 
      ? `${hours} ঘণ্টা ${remainingMinutes} মিনিট` 
      : `${hours}h ${remainingMinutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return language === 'bn' 
    ? `${days} দিন ${remainingHours} ঘণ্টা` 
    : `${days}d ${remainingHours}h`;
}
