import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SensorData, DeviceStatus, StatusLevel } from '@/lib/types';
import { useFarmSettings, useDeviceStatus } from './useFarmData';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationSound } from './useNotificationSound';
import { areSoundsEnabled } from '@/components/settings/NotificationSoundCard';
import {
  readCachedSensorData,
  writeCachedSensorData,
  useBrowserOnline,
} from './useOfflineSensorCache';

// Realtime sensor data with Supabase subscriptions + offline cache fallback
export function useRealtimeSensorData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const browserOnline = useBrowserOnline();

  // Seed initial state from localStorage so the UI shows the last known values
  // immediately on mount — even before the first network round-trip succeeds,
  // and even if the browser is currently offline.
  const [sensorData, setSensorData] = useState<SensorData>(() => {
    const cached = user?.id ? readCachedSensorData(user.id) : null;
    if (cached) {
      return {
        temperature: cached.temperature,
        humidity: cached.humidity,
        ammonia: cached.ammonia,
        waterUsage: cached.waterUsage,
        timestamp: cached.timestamp,
      };
    }
    return {
      temperature: 0,
      humidity: 0,
      ammonia: 0,
      waterUsage: 0,
      timestamp: new Date(0),
    };
  });
  const [isConnected, setIsConnected] = useState(false);

  // Helper: update state AND persist to cache so reloads / offline tabs survive.
  const applyReading = useCallback(
    (data: SensorData) => {
      setSensorData(data);
      if (user?.id) writeCachedSensorData(user.id, data);
    },
    [user?.id]
  );

  // When the browser comes back online after being offline, re-hydrate from
  // cache once (cheap) — the realtime subscription / next fetch will overwrite
  // with fresh data shortly after.
  useEffect(() => {
    if (!user?.id) return;
    if (browserOnline) return;
    const cached = readCachedSensorData(user.id);
    if (cached) {
      setSensorData({
        temperature: cached.temperature,
        humidity: cached.humidity,
        ammonia: cached.ammonia,
        waterUsage: cached.waterUsage,
        timestamp: cached.timestamp,
      });
    }
  }, [user?.id, browserOnline]);

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial latest sensor reading
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        applyReading({
          temperature: Number(data.temperature),
          humidity: Number(data.humidity),
          ammonia: Number(data.ammonia),
          waterUsage: Number(data.water_usage),
          timestamp: new Date(data.recorded_at),
        });
      }
    };

    fetchLatest();

    // Subscribe to realtime sensor updates — when ESP32 reconnects and writes,
    // this auto-syncs the UI with the new value (and updates the cache).
    const channel = supabase
      .channel(`sensor_readings_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new;
          applyReading({
            temperature: Number(data.temperature),
            humidity: Number(data.humidity),
            ammonia: Number(data.ammonia),
            waterUsage: Number(data.water_usage),
            timestamp: new Date(data.recorded_at),
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, applyReading]);

  // hasRealData = a real reading exists AND it is fresh (within last 1 hour).
  // Stale readings (e.g. ESP32 offline for days) must NOT drive UI values or
  // advisories — otherwise farmers see weeks-old "25°C" as if it were live.
  // hasAnyData = ever received a real reading (used to distinguish "never
  // connected" vs "device offline").
  const FRESH_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const ageMs = Date.now() - sensorData.timestamp.getTime();
  const hasAnyData = sensorData.timestamp.getTime() > 0;
  const hasRealData = hasAnyData && ageMs < FRESH_WINDOW_MS;

  return {
    sensorData,
    isConnected,
    hasRealData,
    hasAnyData,
    lastSeenAt: hasAnyData ? sensorData.timestamp : null,
    ageMs: hasAnyData ? ageMs : null,
    browserOnline,
  };
}

// Realtime device status with Supabase subscriptions
export function useRealtimeDeviceStatus() {
  const { user } = useAuth();
  const { data: initialStatus, isLoading } = useDeviceStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to device status changes
    const channel = supabase
      .channel(`device_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_status',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate the query to refetch
          queryClient.invalidateQueries({ queryKey: ['device_status'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // In MANUAL mode, show desired_* states (what user commanded) when explicitly set
  // In AUTO mode, show actual states from ESP32
  const isManualMode = initialStatus?.desired_manual_override || initialStatus?.manual_override;

  const resolveState = (actual: boolean, desired: boolean | null | undefined): boolean => {
    if (isManualMode && desired !== null && desired !== undefined) {
      return desired;
    }
    return actual;
  };

  const status: DeviceStatus = initialStatus ? {
    power: initialStatus.power_on,
    fan: resolveState(initialStatus.fan_on, initialStatus.desired_fan_on),
    light: resolveState(initialStatus.light_on, initialStatus.desired_light_on),
    alarm: resolveState(initialStatus.alarm_on, initialStatus.desired_alarm_on),
    heater: resolveState(initialStatus.heater_on ?? false, initialStatus.desired_heater_on),
    circulation_fan: resolveState(initialStatus.circulation_fan_on ?? false, initialStatus.desired_circulation_fan_on),
    fogger: resolveState(initialStatus.fogger_on ?? false, initialStatus.desired_fogger_on),
    ceilingFan: resolveState(initialStatus.ceiling_fan_on ?? false, initialStatus.desired_ceiling_fan_on),
    sprinkler: resolveState(initialStatus.sprinkler_on ?? false, initialStatus.desired_sprinkler_on),
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

  const manualOverride = initialStatus?.manual_override || initialStatus?.desired_manual_override || false;

  return { status, manualOverride, isLoading };
}

// Realtime alerts subscription with sound support
export function useRealtimeAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const lastAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`alerts_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Play sound for new alerts if enabled
          const newAlert = payload.new as { id: string; severity: string };
          
          // Avoid duplicate sounds for the same alert
          if (newAlert.id !== lastAlertIdRef.current && areSoundsEnabled()) {
            lastAlertIdRef.current = newAlert.id;
            
            // Play appropriate sound based on severity
            if (newAlert.severity === 'danger') {
              playSound('danger');
            } else {
              playSound('warning');
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, playSound]);
}

// Get status levels based on farm settings (same as before)
export function useRealtimeStatusLevels(sensorData: SensorData) {
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
