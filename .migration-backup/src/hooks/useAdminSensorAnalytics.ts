import { useQuery } from '@tanstack/react-query';
import { format, subHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { FarmComparison, HourlyData } from '@/data/adminSensorChartLabels';

export interface AdminChartProfile {
  id: string;
  farm_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  farm_type: string;
}

const avg = (nums: number[]) => Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;

/** Loads profiles + last-24h sensor readings and derives chart datasets. */
export function useAdminSensorAnalytics(selectedUserId: string) {
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles-for-charts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, farm_name, phone, avatar_url, farm_type')
        .order('farm_name', { ascending: true });

      if (error) throw error;
      return (data || []).map((p) => ({
        ...p,
        farm_type: (p as any).farm_type || 'layer',
      })) as AdminChartProfile[];
    },
  });

  const { data: sensorData, isLoading } = useQuery({
    queryKey: ['admin-all-sensor-data', selectedUserId],
    queryFn: async () => {
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();

      let query = supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, recorded_at, user_id')
        .gte('recorded_at', twentyFourHoursAgo)
        .order('recorded_at', { ascending: true });

      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Hourly trend aggregation
  const hourlyData: HourlyData[] = (() => {
    if (!sensorData || sensorData.length === 0) return [];

    const hourMap = new Map<string, { temps: number[]; humidities: number[]; ammonias: number[] }>();

    sensorData.forEach((reading) => {
      const hour = format(new Date(reading.recorded_at), 'HH:00');
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { temps: [], humidities: [], ammonias: [] });
      }
      const hourData = hourMap.get(hour)!;
      hourData.temps.push(reading.temperature);
      hourData.humidities.push(reading.humidity);
      hourData.ammonias.push(reading.ammonia);
    });

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        avgTemp: avg(data.temps),
        avgHumidity: avg(data.humidities),
        avgAmmonia: avg(data.ammonias),
        count: data.temps.length,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  })();

  // Farm comparison (only when "all" is selected)
  const farmComparison: FarmComparison[] = (() => {
    if (!sensorData || sensorData.length === 0 || !profiles || selectedUserId !== 'all') return [];

    const farmMap = new Map<string, { temps: number[]; humidities: number[] }>();

    sensorData.forEach((reading) => {
      const userId = reading.user_id;
      if (!farmMap.has(userId)) {
        farmMap.set(userId, { temps: [], humidities: [] });
      }
      const farmData = farmMap.get(userId)!;
      farmData.temps.push(reading.temperature);
      farmData.humidities.push(reading.humidity);
    });

    const profileMap = new Map(profiles.map((p) => [p.id, p.farm_name]));

    return Array.from(farmMap.entries())
      .map(([userId, data]) => ({
        farmName: profileMap.get(userId) || 'Unknown',
        avgTemp: avg(data.temps),
        avgHumidity: avg(data.humidities),
        readings: data.temps.length,
      }))
      .sort((a, b) => b.avgTemp - a.avgTemp);
  })();

  const overallStats = (() => {
    if (!sensorData || sensorData.length === 0) {
      return { avgTemp: 0, avgHumidity: 0, avgAmmonia: 0, totalReadings: 0, farmCount: 0 };
    }

    return {
      avgTemp: avg(sensorData.map((s) => s.temperature)),
      avgHumidity: avg(sensorData.map((s) => s.humidity)),
      avgAmmonia: avg(sensorData.map((s) => s.ammonia)),
      totalReadings: sensorData.length,
      farmCount: new Set(sensorData.map((s) => s.user_id)).size,
    };
  })();

  return {
    profiles,
    sensorData,
    isLoading: isLoading || profilesLoading,
    hourlyData,
    farmComparison,
    overallStats,
    selectedProfile: profiles?.find((p) => p.id === selectedUserId),
  };
}
