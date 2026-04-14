import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SensorData, DeviceStatus, StatusLevel } from '@/lib/types';
import { useFarmSettings, useDeviceStatus } from './useFarmData';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationSound } from './useNotificationSound';
import { areSoundsEnabled } from '@/components/settings/NotificationSoundCard';

// Realtime sensor data with Supabase subscriptions
export function useRealtimeSensorData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 28.5,
    humidity: 65,
    ammonia: 12,
    waterUsage: 45,
    timestamp: new Date(),
  });
  const [isConnected, setIsConnected] = useState(false);

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
        .single();

      if (data) {
        setSensorData({
          temperature: Number(data.temperature),
          humidity: Number(data.humidity),
          ammonia: Number(data.ammonia),
          waterUsage: Number(data.water_usage),
          timestamp: new Date(data.recorded_at),
        });
      }
    };

    fetchLatest();

    // Subscribe to realtime sensor updates
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
          setSensorData({
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
  }, [user?.id]);

  return { sensorData, isConnected };
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
