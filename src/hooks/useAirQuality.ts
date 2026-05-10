import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarm } from '@/context/FarmContext';

export interface BestSensorReading {
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  light_lux: number | null;
  co2: number | null;
  pm25: number | null;
  pm10: number | null;
  source: Record<string, string> | null;
  recorded_at: string | null;
}

/**
 * Returns latest reading using best-available sensor (precise > legacy fallback).
 * Phase 9: prefers SHT31/BH1750/ZE03/SCD41/PMS5003 values when present.
 */
export function useBestSensorReading(shedId?: string | null) {
  const { activeFarmId } = useFarm();

  return useQuery({
    queryKey: ['best-sensor-reading', activeFarmId, shedId],
    enabled: !!activeFarmId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<BestSensorReading | null> => {
      const { data, error } = await supabase.rpc('get_best_sensor_reading', {
        p_farm_id: activeFarmId!,
        p_shed_id: shedId ?? null,
      });
      if (error) throw error;
      return (data?.[0] as BestSensorReading) ?? null;
    },
  });
}

export interface SensorUpgradeSummary {
  total_devices: number;
  sht31_count: number;
  bh1750_count: number;
  ze03_count: number;
  scd41_count: number;
  pms5003_count: number;
  tier1_devices: number;
  tier2_devices: number;
  tier3_devices: number;
}

export function useSensorUpgradeSummary() {
  const { activeFarmId } = useFarm();
  return useQuery({
    queryKey: ['sensor-upgrade-summary', activeFarmId],
    refetchInterval: 60_000,
    queryFn: async (): Promise<SensorUpgradeSummary> => {
      const { data, error } = await supabase.rpc('get_sensor_upgrade_summary', {
        p_farm_id: activeFarmId ?? null,
      });
      if (error) throw error;
      return data as unknown as SensorUpgradeSummary;
    },
  });
}

export interface DeviceSensorInventoryRow {
  id: string;
  device_id: string;
  farm_id: string;
  sensor_type: string;
  sensor_model: string;
  is_active: boolean;
  detected_at: string;
  last_seen_at: string;
  calibration_offset: number;
  notes: string | null;
}

export function useDeviceSensorInventory() {
  const { activeFarmId } = useFarm();
  return useQuery({
    queryKey: ['device-sensor-inventory', activeFarmId],
    enabled: !!activeFarmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_sensor_inventory')
        .select('*')
        .eq('farm_id', activeFarmId!)
        .order('sensor_type', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeviceSensorInventoryRow[];
    },
  });
}

export interface AirQualityAlertRow {
  id: string;
  farm_id: string;
  shed_id: string | null;
  alert_type: 'co2_high' | 'pm25_high' | 'pm10_high' | 'nh3_high';
  measured_value: number;
  threshold_value: number;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  triggered_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

export function useAirQualityAlerts(limit = 20) {
  const { activeFarmId } = useFarm();
  return useQuery({
    queryKey: ['air-quality-alerts', activeFarmId, limit],
    enabled: !!activeFarmId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('air_quality_alerts')
        .select('*')
        .eq('farm_id', activeFarmId!)
        .order('triggered_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AirQualityAlertRow[];
    },
  });
}
