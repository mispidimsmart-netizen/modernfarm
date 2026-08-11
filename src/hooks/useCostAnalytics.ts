import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEggProduction, useFeedConsumption, useFeedInventory, useExpenses } from './useFarmManagement';
import { buildCostAnalytics, DEFAULT_RATES, type CostAnalytics } from '@/lib/costAnalytics';

// Pure maths live in src/lib/costAnalytics.ts (SSOT). Re-exported for compatibility.
export type { CostAnalytics };

/**
 * Layer cost analytics — data fetching only; all calculations are delegated
 * to the pure helpers in `@/lib/costAnalytics`.
 */
export function useCostAnalytics(days: number = 30): CostAnalytics {
  const { user } = useAuth();
  const { data: eggProduction } = useEggProduction(days);
  const { data: feedConsumption } = useFeedConsumption(days);
  const { data: feedInventory } = useFeedInventory();
  const { data: expenses } = useExpenses(days);

  // Sensor readings power both water usage and fan runtime estimates
  const { data: sensorLogs } = useQuery({
    queryKey: ['sensor-logs-analytics', user?.id, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('recorded_at, water_usage')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Current device status for fan speed
  const { data: deviceStatus } = useQuery({
    queryKey: ['device-status-current', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('device_status')
        .select('fan_on, fan_speed, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return buildCostAnalytics({
    sensorLogs: sensorLogs ?? undefined,
    deviceStatus,
    eggProduction,
    feedConsumption,
    feedInventory,
    expenses,
    days,
  });
}
