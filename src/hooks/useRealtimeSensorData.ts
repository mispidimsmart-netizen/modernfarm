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
import { useFarmContext } from '@/context/FarmContext';

// Helper: prefer farm-scoped realtime filter when a farm is selected, else
// fall back to user-scoped (legacy / no-farm-context callers).
function safeSelectedFarmId(): string | null {
  try { return useFarmContext().selectedFarmId; } catch { return null; }
}

// Realtime sensor data with Supabase subscriptions + offline cache fallback
export function useRealtimeSensorData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const browserOnline = useBrowserOnline();
  const selectedFarmId = safeSelectedFarmId();

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

    // Fetch initial latest sensor reading (farm-scoped if available)
    const fetchLatest = async () => {
      let q = supabase
        .from('sensor_readings')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      else q = q.eq('user_id', user.id);
      const { data } = await q.maybeSingle();

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

    // Subscribe to realtime sensor updates — farm-scoped when a farm is selected
    // so multi-farm users only get events for the active farm (less noise).
    const channelKey = selectedFarmId ?? user.id;
    const filter = selectedFarmId
      ? `farm_id=eq.${selectedFarmId}`
      : `user_id=eq.${user.id}`;
    const channel = supabase
      .channel(`sensor_readings_${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter,
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
  }, [user?.id, selectedFarmId, applyReading]);

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
// Adds an `isDeviceOnline` flag derived from `updated_at` freshness so that
// UI consumers can show a single, consistent "অফলাইন" fallback for ALL relays
// when the ESP32 hasn't reported in (Hardware-as-Source-of-Truth: if the
// device is silent, cloud-side relay flags cannot be trusted).
export function useRealtimeDeviceStatus() {
  const { user } = useAuth();
  const { data: initialStatus, isLoading } = useDeviceStatus();
  const queryClient = useQueryClient();
  const browserOnline = useBrowserOnline();
  const selectedFarmId = safeSelectedFarmId();

  // Tick every 15s so `ageMs`/`isDeviceOnline` recompute and the UI flips
  // from "অফলাইন" → "লাইভ" (or vice-versa) automatically as time passes,
  // even without any new realtime event.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => (n + 1) % 1_000_000), 15_000);
    return () => clearInterval(t);
  }, []);

  // Helper: force a fresh fetch of device_status (used on reconnect / focus)
  const refreshDeviceStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['device_status'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to device_status changes (ESP32 heartbeat / relay updates)
    // AND to sensor_readings INSERTs — when the device wakes up the FIRST
    // signal is usually a new sensor row, which should immediately re-pull
    // device_status so the UI flips back to live.
    const channelKey = selectedFarmId ?? user.id;
    const dsFilter = selectedFarmId
      ? `farm_id=eq.${selectedFarmId}`
      : `user_id=eq.${user.id}`;
    const channel = supabase
      .channel(`device_status_${channelKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status',
          filter: dsFilter,
        },
        () => refreshDeviceStatus()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: dsFilter,
        },
        () => refreshDeviceStatus()
      )
      .subscribe((status) => {
        // When realtime (re)connects after a drop, refetch immediately so
        // we don't keep showing stale "offline" data.
        if (status === 'SUBSCRIBED') {
          refreshDeviceStatus();
        }
      });

    // Browser-level recovery: tab regains focus, network comes back, or
    // the page becomes visible → re-poll once. Cheap and catches every
    // case Supabase realtime might miss (laptop wake, mobile resume, etc.)
    const onFocus = () => refreshDeviceStatus();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshDeviceStatus();
    };
    const onOnline = () => refreshDeviceStatus();

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, selectedFarmId, refreshDeviceStatus]);

  // When the browser flips back to "online", also force a refetch (covers
  // the case where the listener above mounted while already offline).
  useEffect(() => {
    if (browserOnline) refreshDeviceStatus();
  }, [browserOnline, refreshDeviceStatus]);

  // ── Online/offline detection ──
  // Prefer `last_device_ack_at` (set by ESP32 heartbeat) and fall back to
  // `updated_at`. Anything older than 3 minutes is treated as offline.
  const DEVICE_FRESH_WINDOW_MS = 3 * 60 * 1000;
  const ackRaw =
    (initialStatus as any)?.last_device_ack_at ??
    (initialStatus as any)?.updated_at ??
    null;
  const lastAckAt = ackRaw ? new Date(ackRaw) : null;
  const ageMs = lastAckAt ? Date.now() - lastAckAt.getTime() : null;
  const isDeviceOnline =
    !!initialStatus && ageMs !== null && ageMs < DEVICE_FRESH_WINDOW_MS;

  // In MANUAL mode, show desired_* states (what user commanded) when explicitly set
  // In AUTO mode, show actual states from ESP32
  const isManualMode = initialStatus?.desired_manual_override || initialStatus?.manual_override;

  const resolveState = (actual: boolean, desired: boolean | null | undefined): boolean => {
    // Device offline → cannot trust ANY relay state. Force OFF/false so UI
    // never shows misleading "চালু" while ESP32 is silent.
    if (!isDeviceOnline) return false;
    if (isManualMode && desired !== null && desired !== undefined) {
      return desired;
    }
    return actual;
  };

  const status: DeviceStatus = initialStatus ? {
    power: isDeviceOnline ? initialStatus.power_on : false,
    fan: resolveState(initialStatus.fan_on, initialStatus.desired_fan_on),
    light: resolveState(initialStatus.light_on, initialStatus.desired_light_on),
    alarm: resolveState(initialStatus.alarm_on, initialStatus.desired_alarm_on),
    heater: resolveState(initialStatus.heater_on ?? false, initialStatus.desired_heater_on),
    circulation_fan: resolveState(initialStatus.circulation_fan_on ?? false, initialStatus.desired_circulation_fan_on),
    fogger: resolveState(initialStatus.fogger_on ?? false, initialStatus.desired_fogger_on),
    ceilingFan: resolveState(initialStatus.ceiling_fan_on ?? false, initialStatus.desired_ceiling_fan_on),
    sprinkler: resolveState(initialStatus.sprinkler_on ?? false, initialStatus.desired_sprinkler_on),
  } : {
    power: false,
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

  return {
    status,
    manualOverride,
    isLoading,
    isDeviceOnline,
    lastAckAt,
    ageMs,
    refreshDeviceStatus,
  };
}

// Realtime alerts subscription with sound support
export function useRealtimeAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const lastAlertIdRef = useRef<string | null>(null);
  const selectedFarmId = safeSelectedFarmId();

  useEffect(() => {
    if (!user?.id) return;

    const channelKey = selectedFarmId ?? user.id;
    const aFilter = selectedFarmId
      ? `farm_id=eq.${selectedFarmId}`
      : `user_id=eq.${user.id}`;
    const channel = supabase
      .channel(`alerts_${channelKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: aFilter },
        (payload) => {
          const newAlert = payload.new as { id: string; severity: string };
          if (newAlert.id !== lastAlertIdRef.current && areSoundsEnabled()) {
            lastAlertIdRef.current = newAlert.id;
            if (newAlert.severity === 'danger') playSound('danger');
            else playSound('warning');
          }
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts', filter: aFilter },
        () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'alerts', filter: aFilter },
        () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedFarmId, queryClient, playSound]);
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
