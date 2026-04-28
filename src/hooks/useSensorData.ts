import { useState, useEffect, useCallback } from 'react';
import { SensorData, DeviceStatus, StatusLevel } from '@/lib/types';
import { useFarmSettings, useDeviceStatus, useUpdateDeviceStatus } from './useFarmData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Live sensor data from database — REAL ESP32 readings only, NO simulation
export function useLiveSensorData() {
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    ammonia: 0,
    waterUsage: 0,
    timestamp: new Date(),
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('temperature, humidity, ammonia, water_usage, recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setSensorData({
        temperature: Number(data.temperature) || 0,
        humidity: Number(data.humidity) || 0,
        ammonia: Number(data.ammonia) || 0,
        waterUsage: Number(data.water_usage) || 0,
        timestamp: new Date(data.recorded_at),
      });
    };

    fetchLatest();

    const channel = supabase
      .channel(`sensor_readings_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const r: any = payload.new;
          setSensorData({
            temperature: Number(r.temperature) || 0,
            humidity: Number(r.humidity) || 0,
            ammonia: Number(r.ammonia) || 0,
            waterUsage: Number(r.water_usage) || 0,
            timestamp: new Date(r.recorded_at),
          });
        }
      )
      .subscribe();

    const interval = setInterval(fetchLatest, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return sensorData;
}

// Get status levels based on farm settings
export function useStatusLevels(sensorData: SensorData) {
  const { data: settings } = useFarmSettings();

  const getTemperatureStatus = useCallback((): StatusLevel => {
    if (!settings) return 'normal';
    if (sensorData.temperature > settings.temperature_max + 5) return 'danger';
    if (sensorData.temperature > Number(settings.temperature_max) || sensorData.temperature < Number(settings.temperature_min)) return 'warning';
    return 'normal';
  }, [sensorData.temperature, settings]);

  const getHumidityStatus = useCallback((): StatusLevel => {
    if (!settings) return 'normal';
    if (sensorData.humidity > Number(settings.humidity_max) + 10 || sensorData.humidity < Number(settings.humidity_min) - 10) return 'danger';
    if (sensorData.humidity > Number(settings.humidity_max) || sensorData.humidity < Number(settings.humidity_min)) return 'warning';
    return 'normal';
  }, [sensorData.humidity, settings]);

  const getAmmoniaStatus = useCallback((): StatusLevel => {
    if (!settings) return 'normal';
    if (sensorData.ammonia > Number(settings.ammonia_max) + 10) return 'danger';
    if (sensorData.ammonia > Number(settings.ammonia_max)) return 'warning';
    return 'normal';
  }, [sensorData.ammonia, settings]);

  const getWaterStatus = useCallback((): StatusLevel => {
    if (sensorData.waterUsage < 10) return 'danger';
    if (sensorData.waterUsage < 20) return 'warning';
    return 'normal';
  }, [sensorData.waterUsage]);

  return {
    temperature: getTemperatureStatus(),
    humidity: getHumidityStatus(),
    ammonia: getAmmoniaStatus(),
    water: getWaterStatus(),
  };
}

// Combined device control hook
export function useDeviceControl(shedId?: string | null) {
  const { data: deviceStatus, isLoading } = useDeviceStatus(shedId);
  const updateMutation = useUpdateDeviceStatus(shedId);

  const isManualMode = deviceStatus?.desired_manual_override || deviceStatus?.manual_override || false;

  const resolveState = (actual: boolean, desired: boolean | null | undefined) => {
    if (isManualMode && desired !== null && desired !== undefined) {
      return desired;
    }
    return actual;
  };

  const status: DeviceStatus = deviceStatus ? {
    power: deviceStatus.power_on,
    fan: resolveState(deviceStatus.fan_on, deviceStatus.desired_fan_on),
    light: resolveState(deviceStatus.light_on, deviceStatus.desired_light_on),
    alarm: resolveState(deviceStatus.alarm_on, deviceStatus.desired_alarm_on),
    heater: resolveState(deviceStatus.heater_on ?? false, deviceStatus.desired_heater_on),
    circulation_fan: resolveState(deviceStatus.circulation_fan_on ?? false, deviceStatus.desired_circulation_fan_on),
    fogger: resolveState(deviceStatus.fogger_on ?? false, deviceStatus.desired_fogger_on),
    ceilingFan: resolveState(deviceStatus.ceiling_fan_on ?? false, deviceStatus.desired_ceiling_fan_on),
    sprinkler: resolveState(deviceStatus.sprinkler_on ?? false, deviceStatus.desired_sprinkler_on),
  } : {
    power: true,
    fan: false,
    light: false,
    alarm: false,
    heater: false,
    circulation_fan: false,
    fogger: false,
    ceilingFan: false,
    sprinkler: false,
  };

  const manualOverride = isManualMode;

  const setDeviceStatus = useCallback((newStatus: Partial<DeviceStatus> & Record<string, any>) => {
    const updateData: Record<string, boolean> = {};
    if (newStatus.power !== undefined) updateData.power_on = newStatus.power;
    if (newStatus.fan !== undefined) updateData.fan_on = newStatus.fan;
    if (newStatus.light !== undefined) updateData.light_on = newStatus.light;
    if (newStatus.alarm !== undefined) updateData.alarm_on = newStatus.alarm;
    if (newStatus.heater !== undefined) updateData.heater_on = newStatus.heater;
    if (newStatus.circulation_fan !== undefined) updateData.circulation_fan_on = newStatus.circulation_fan;
    if (newStatus.fogger !== undefined) updateData.fogger_on = newStatus.fogger;
    if (newStatus.ceilingFan !== undefined) updateData.ceiling_fan_on = newStatus.ceilingFan;
    if (newStatus.ceiling_fan !== undefined) updateData.ceiling_fan_on = newStatus.ceiling_fan;
    if (newStatus.sprinkler !== undefined) updateData.sprinkler_on = newStatus.sprinkler;
    
    updateMutation.mutate(updateData);
  }, [updateMutation]);

  const setManualOverride = useCallback((override: boolean) => {
    updateMutation.mutate({ manual_override: override });
  }, [updateMutation]);

  return {
    status,
    manualOverride,
    isLoading,
    setDeviceStatus,
    setManualOverride,
  };
}
