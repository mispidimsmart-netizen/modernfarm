import { useMemo } from 'react';
import { SensorData, DeviceStatus, StatusLevel } from '@/lib/types';
import { useFarmSettings, useDeviceStatus, useUpdateDeviceStatus } from './useFarmData';
import { useAutomationMode } from './useAutomationMode';
import { useRealtimeSensorData } from './useRealtimeSensorData';
import { computeSensorStatusLevels } from '@/lib/sensorStatusLevels';


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
    const tMax = Number(settings.temperature_max);
    const tMin = Number(settings.temperature_min);
    const t = Number(sensorData.temperature);
    if (t > tMax + 5) return 'danger';
    if (t > tMax || t < tMin) return 'warning';
    return 'normal';
  }, [sensorData.temperature, settings]);

  const getHumidityStatus = useCallback((): StatusLevel => {
    if (!settings) return 'normal';
    const hMax = Number(settings.humidity_max);
    const hMin = Number(settings.humidity_min);
    const h = Number(sensorData.humidity);
    if (h > hMax + 10 || h < hMin - 10) return 'danger';
    if (h > hMax || h < hMin) return 'warning';
    return 'normal';
  }, [sensorData.humidity, settings]);

  const getAmmoniaStatus = useCallback((): StatusLevel => {
    if (!settings) return 'normal';
    const aMax = Number(settings.ammonia_max);
    const a = Number(sensorData.ammonia);
    if (a > aMax + 10) return 'danger';
    if (a > aMax) return 'warning';
    return 'normal';
  }, [sensorData.ammonia, settings]);

  const getWaterStatus = useCallback((): StatusLevel => {
    const w = Number(sensorData.waterUsage);
    if (w < 10) return 'danger';
    if (w < 20) return 'warning';
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

  const { data: automationMode } = useAutomationMode();

  // Manual mode is authoritative from farm_settings; fall back to device_status flags
  // so the UI stays consistent before realtime catches up.
  const isManualMode =
    automationMode === 'MANUAL' ||
    deviceStatus?.desired_manual_override ||
    deviceStatus?.manual_override ||
    false;

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
    // CRITICAL: In manual mode the cloud must NEVER write actual_state columns
    // (fan_on, heater_on, etc.) — those belong to the ESP32 (Hardware-as-Source-of-Truth).
    // Instead, mirror the user intent into desired_* so the switch reflects immediately
    // and useDeviceCommands has already enqueued the device_commands row.
    // Hardware-as-Source-of-Truth: cloud writes ONLY desired_* columns.
    // The ESP32 reads desired_* and updates actual fan_on/heater_on/etc.
    // This applies in BOTH auto and manual mode — never overwrite hardware truth.
    const updateData: Record<string, boolean | null> = {};
    if (newStatus.power !== undefined) updateData.power_on = newStatus.power;
    if (newStatus.fan !== undefined) updateData.desired_fan_on = newStatus.fan;
    if (newStatus.light !== undefined) updateData.desired_light_on = newStatus.light;
    if (newStatus.alarm !== undefined) updateData.desired_alarm_on = newStatus.alarm;
    if (newStatus.heater !== undefined) updateData.desired_heater_on = newStatus.heater;
    if (newStatus.circulation_fan !== undefined) updateData.desired_circulation_fan_on = newStatus.circulation_fan;
    if (newStatus.fogger !== undefined) updateData.desired_fogger_on = newStatus.fogger;
    if (newStatus.ceilingFan !== undefined) updateData.desired_ceiling_fan_on = newStatus.ceilingFan;
    if (newStatus.ceiling_fan !== undefined) updateData.desired_ceiling_fan_on = newStatus.ceiling_fan;
    if (newStatus.sprinkler !== undefined) updateData.desired_sprinkler_on = newStatus.sprinkler;

    updateMutation.mutate(updateData as any);
  }, [updateMutation]);

  const setManualOverride = useCallback((override: boolean) => {
    // Write desired_manual_override; ESP32 mirrors it into manual_override.
    updateMutation.mutate({ desired_manual_override: override } as any);
  }, [updateMutation]);

  return {
    status,
    manualOverride,
    isLoading,
    setDeviceStatus,
    setManualOverride,
  };
}
