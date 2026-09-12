import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toSensorHistoryPoints, type SensorHistoryPoint } from '@/lib/sensorHistory';

export type { SensorHistoryPoint };

export function useSensorHistory(hours: number = 24) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sensor_history', user?.id, hours],
    queryFn: async (): Promise<SensorHistoryPoint[]> => {
      if (!user) return [];

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      // Most recent 100 records (DESC); the transform reverses for chart display
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, water_usage, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return toSensorHistoryPoints(data);
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
}
