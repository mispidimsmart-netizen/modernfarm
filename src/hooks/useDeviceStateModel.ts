/**
 * Device State Model Hook
 * 
 * Exposes the three-layer state model:
 * - desired_state: what cloud/user wants (set by app)
 * - actual_state: what device reports (set by ESP32)
 * - safety_override: device-side safety override (device wins)
 * 
 * Rule: If mismatch → device wins. Cloud never directly controls relays.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from './useSheds';

export interface DeviceStateLayer {
  fan_on: boolean;
  light_on: boolean;
  alarm_on: boolean;
  heater_on: boolean;
  fogger_on: boolean;
  circulation_fan_on: boolean;
  manual_override: boolean;
  fan_speed: string;
}

export interface EnvironmentTarget {
  target_temperature: number | null;
  target_humidity: number | null;
  target_air_quality: number | null;
  age_profile_days: number | null;
}

export interface DeviceStateModel {
  desired: DeviceStateLayer;
  actual: DeviceStateLayer;
  environment: EnvironmentTarget;
  safety_override: boolean;
  safety_override_reason: string | null;
  safety_override_at: string | null;
  state_mismatch: boolean;
  last_device_ack_at: string | null;
  mismatches: string[]; // list of fields that differ
}

export function useDeviceStateModel() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();

  return useQuery({
    queryKey: ['device-state-model', user?.id, selectedShedId],
    queryFn: async (): Promise<DeviceStateModel | null> => {
      if (!user) return null;

      let query = supabase
        .from('device_status')
        .select('*')
        .eq('user_id', user.id);

      if (selectedShedId) {
        query = query.eq('shed_id', selectedShedId);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const actual: DeviceStateLayer = {
        fan_on: data.fan_on ?? false,
        light_on: data.light_on ?? false,
        alarm_on: data.alarm_on ?? false,
        heater_on: data.heater_on ?? false,
        fogger_on: data.fogger_on ?? false,
        circulation_fan_on: data.circulation_fan_on ?? false,
        manual_override: data.manual_override ?? false,
        fan_speed: data.fan_speed ?? 'OFF',
      };

      const desired: DeviceStateLayer = {
        fan_on: (data as any).desired_fan_on ?? false,
        light_on: (data as any).desired_light_on ?? false,
        alarm_on: (data as any).desired_alarm_on ?? false,
        heater_on: (data as any).desired_heater_on ?? false,
        fogger_on: (data as any).desired_fogger_on ?? false,
        circulation_fan_on: (data as any).desired_circulation_fan_on ?? false,
        manual_override: (data as any).desired_manual_override ?? false,
        fan_speed: (data as any).desired_fan_speed ?? 'OFF',
      };

      // Calculate mismatches
      const mismatches: string[] = [];
      const keys: (keyof DeviceStateLayer)[] = [
        'fan_on', 'light_on', 'alarm_on', 'heater_on',
        'fogger_on', 'circulation_fan_on',
      ];
      for (const key of keys) {
        if (desired[key] !== actual[key]) {
          mismatches.push(key);
        }
      }

      const environment: EnvironmentTarget = {
        target_temperature: (data as any).target_temperature ?? null,
        target_humidity: (data as any).target_humidity ?? null,
        target_air_quality: (data as any).target_air_quality ?? null,
        age_profile_days: (data as any).age_profile_days ?? null,
      };

      return {
        desired,
        actual,
        environment,
        safety_override: (data as any).safety_override ?? false,
        safety_override_reason: (data as any).safety_override_reason ?? null,
        safety_override_at: (data as any).safety_override_at ?? null,
        state_mismatch: (data as any).state_mismatch ?? mismatches.length > 0,
        last_device_ack_at: (data as any).last_device_ack_at ?? null,
        mismatches,
      };
    },
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
