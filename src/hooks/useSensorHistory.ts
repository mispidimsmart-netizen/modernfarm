import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface SensorHistoryPoint {
  time: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage: number;
}

export function useSensorHistory(hours: number = 24) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sensor_history', user?.id, hours],
    queryFn: async (): Promise<SensorHistoryPoint[]> => {
      if (!user) return [];

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, water_usage, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      return (data || []).map(reading => ({
        time: new Date(reading.recorded_at).toLocaleTimeString('bn-BD', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        temperature: Number(reading.temperature),
        humidity: Number(reading.humidity),
        ammonia: Number(reading.ammonia),
        water_usage: Number(reading.water_usage),
      }));
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
}
