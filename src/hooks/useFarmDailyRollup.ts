import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';

export interface FarmDailyRollupRow {
  farm_id: string;
  shed_id: string | null;
  day: string;
  avg_temp: number | null;
  min_temp: number | null;
  max_temp: number | null;
  avg_humidity: number | null;
  avg_ammonia: number | null;
  avg_hsi: number | null;
  sensor_samples: number;
  total_eggs: number;
  total_feed_kg: number;
}

/**
 * Phase 6: Pre-aggregated daily rollup served from a materialized view
 * (refreshed every 15 minutes by pg_cron). Use for reports/charts —
 * orders of magnitude faster than scanning sensor_readings.
 */
export function useFarmDailyRollup(days = 30) {
  const { selectedFarmId } = useFarmContext();
  return useQuery({
    queryKey: ['farm-daily-rollup', selectedFarmId, days],
    enabled: !!selectedFarmId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_farm_daily_rollup' as any, {
        _farm_id: selectedFarmId,
        _days: days,
      });
      if (error) throw error;
      return (data ?? []) as FarmDailyRollupRow[];
    },
  });
}
