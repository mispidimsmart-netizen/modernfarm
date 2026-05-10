import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';

export interface DashboardSnapshot {
  latest_sensor: {
    temperature: number | null;
    humidity: number | null;
    ammonia: number | null;
    water_usage: number | null;
    hsi: number | null;
    light_lux: number | null;
    recorded_at: string;
    shed_id: string | null;
  } | null;
  device_status: {
    power_on: boolean;
    fan_on: boolean;
    heater_on: boolean;
    water_pump_on: boolean;
    light_on: boolean;
    safety_status: string | null;
    last_cloud_sync: string | null;
  } | null;
  flock_info: {
    total_birds: number;
    breed: string | null;
    age_weeks: number;
    purchase_date: string | null;
    batch_id: string | null;
  } | null;
  unread_alerts_count: number;
  recent_alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    message_bn: string;
    created_at: string;
  }>;
  snapshot_at: string;
}

/**
 * Phase 6 Step 3: Single-call dashboard snapshot.
 * Replaces 5+ separate queries with ONE RPC for instant dashboard load.
 */
export function useDashboardSnapshot() {
  const { selectedFarmId } = useFarmContext();

  return useQuery({
    queryKey: ['dashboard-snapshot', selectedFarmId],
    enabled: !!selectedFarmId,
    staleTime: 30_000, // 30s — tight for live dashboard
    gcTime: 5 * 60_000,
    refetchInterval: (q) => (document.visibilityState === 'visible' ? 30_000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_farm_dashboard_snapshot' as any, {
        _farm_id: selectedFarmId,
      });
      if (error) throw error;
      return data as unknown as DashboardSnapshot;
    },
  });
}
