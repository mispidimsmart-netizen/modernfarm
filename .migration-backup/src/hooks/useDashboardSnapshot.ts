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
    light_on: boolean;
    alarm_on: boolean;
    circulation_fan_on: boolean;
    fogger_on: boolean;
    ceiling_fan_on: boolean;
    sprinkler_on: boolean;
    mode: string | null;
    safety_override: boolean | null;
    state_mismatch: boolean | null;
    last_cloud_sync: string | null;
    last_device_ack_at: string | null;
    updated_at: string | null;
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
      if (error) {
        console.warn('Dashboard snapshot unavailable; continuing with live dashboard queries.', error.message);
        return null;
      }
      return data as unknown as DashboardSnapshot;
    },
  });
}
