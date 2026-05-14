/**
 * Safety Status Display Hook — READ ONLY
 * 
 * Subscribes to the safety_status table via realtime.
 * All safety decisions are made by firmware + backend safety-engine.
 * This hook provides display-only data to the frontend.
 * 
 * If the browser is closed, safety behavior is IDENTICAL
 * because no safety logic runs here.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed } from './useSheds';
import { useFarmContext } from '@/context/FarmContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type SystemState = 'NORMAL' | 'WARNING' | 'DANGER' | 'EMERGENCY' | 'SURVIVAL' | 'SENSOR_FAIL';
export type EmergencyPriority = 'INFO' | 'WARNING' | 'CRITICAL' | 'LIFE_THREATENING';

export interface SafetyStatus {
  id: string;
  system_state: SystemState;

  // Sensor
  sensor_state: Record<string, string>;
  sensor_issues: Array<{ sensor: string; type: string; message: string }>;
  sensor_drift_detected: boolean;
  sensor_drift_reason: string | null;

  // Airflow
  airflow_verified: boolean;
  airflow_ineffective: boolean;
  airflow_fail_reason: string | null;
  airflow_consecutive_failures: number;
  airflow_last_verified_at: string | null;

  // Relay
  stuck_relay_detected: string | null;
  locked_relays: string[];
  relay_violations: number;
  heater_runtime_ms: number;
  motor_runtime_ms: number;

  // Heater-vent interlock
  heater_allowed: boolean;
  heater_blocked_reason: string | null;
  mandatory_fan_pulse_active: boolean;
  rapid_temp_rise_detected: boolean;
  force_ventilation: boolean;
  min_vent_duty_required: boolean;
  current_temp_rate: number;

  // Emergency
  emergency_priority: EmergencyPriority | null;
  emergency_active: boolean;

  // Override
  override_active: boolean;
  override_reason: string | null;
  override_remaining_seconds: number | null;
  override_out_of_bio_range: boolean;

  // Survival
  survival_mode: boolean;
  survival_fan_on: boolean;
  survival_heater_on: boolean;

  // Safe mode
  safe_mode_active: boolean;
  safe_mode_until: string | null;

  // Plausibility
  plausibility_degraded: boolean;
  heater_authority_percent: number;
  plausibility_reason: string | null;

  // HSI
  hsi_value: number | null;
  hsi_level: string | null;
  hsi_fan_activated: boolean;

  // Meta
  last_updated_by: string;
  updated_at: string;
}

const DEFAULT_SAFETY: Omit<SafetyStatus, 'id' | 'updated_at'> = {
  system_state: 'NORMAL',
  sensor_state: { temperature: 'VALID', humidity: 'VALID', ammonia: 'VALID', water: 'VALID' },
  sensor_issues: [],
  sensor_drift_detected: false,
  sensor_drift_reason: null,
  airflow_verified: true,
  airflow_ineffective: false,
  airflow_fail_reason: null,
  airflow_consecutive_failures: 0,
  airflow_last_verified_at: null,
  stuck_relay_detected: null,
  locked_relays: [],
  relay_violations: 0,
  heater_runtime_ms: 0,
  motor_runtime_ms: 0,
  heater_allowed: true,
  heater_blocked_reason: null,
  mandatory_fan_pulse_active: false,
  rapid_temp_rise_detected: false,
  force_ventilation: false,
  min_vent_duty_required: false,
  current_temp_rate: 0,
  emergency_priority: null,
  emergency_active: false,
  override_active: false,
  override_reason: null,
  override_remaining_seconds: null,
  override_out_of_bio_range: false,
  survival_mode: false,
  survival_fan_on: false,
  survival_heater_on: false,
  safe_mode_active: false,
  safe_mode_until: null,
  plausibility_degraded: false,
  heater_authority_percent: 100,
  plausibility_reason: null,
  hsi_value: null,
  hsi_level: null,
  hsi_fan_activated: false,
  last_updated_by: 'system',
};

export function useSafetyStatus() {
  const { user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  let selectedFarmId: string | null = null;
  try { selectedFarmId = useFarmContext().selectedFarmId; } catch { /* outside provider */ }
  const queryClient = useQueryClient();

  // Fetch current safety status (RLS enforces farm membership)
  const { data: safetyStatus, isLoading } = useQuery({
    queryKey: ['safety-status', user?.id, selectedFarmId, selectedShedId],
    queryFn: async () => {
      if (!user) return null;
      const query = (supabase.from('safety_status') as any).select('*');

      if (selectedFarmId) {
        query.eq('farm_id', selectedFarmId);
      } else {
        query.eq('user_id', user.id);
      }
      if (selectedShedId) {
        query.eq('shed_id', selectedShedId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) {
        console.error('[SafetyStatus] Fetch error:', error);
        return null;
      }
      return data as SafetyStatus | null;
    },
    enabled: !!user,
    refetchInterval: 10000, // fallback poll every 10s
  });

  // Subscribe to realtime updates (filter by farm if available, else user)
  useEffect(() => {
    if (!user?.id) return;

    const channelKey = selectedFarmId ?? user.id;
    const filter = selectedFarmId
      ? `farm_id=eq.${selectedFarmId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`safety_status_${channelKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'safety_status',
        filter,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['safety-status'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, selectedFarmId, queryClient]);

  const status = safetyStatus || { id: '', updated_at: new Date().toISOString(), ...DEFAULT_SAFETY };

  return {
    // Full status object
    status: status as SafetyStatus,
    isLoading,

    // === Convenience accessors (display-only) ===

    // System state
    systemState: status.system_state as SystemState,
    isNormal: status.system_state === 'NORMAL',
    isWarning: status.system_state === 'WARNING',
    isDanger: status.system_state === 'DANGER',
    isEmergency: status.system_state === 'EMERGENCY' || status.system_state === 'SURVIVAL' || status.system_state === 'SENSOR_FAIL',

    // Sensor
    sensorStates: status.sensor_state as Record<string, string>,
    sensorIssues: status.sensor_issues as Array<{ sensor: string; type: string; message: string }>,
    sensorDriftDetected: status.sensor_drift_detected,
    tempSensorCritical: status.sensor_state?.temperature === 'FAILED' || status.sensor_state?.temperature === 'PHYSICALLY_IMPOSSIBLE',

    // Airflow
    airflowVerified: status.airflow_verified,
    airflowIneffective: status.airflow_ineffective,

    // Relay
    stuckRelayDetected: status.stuck_relay_detected,

    // Interlock
    heaterAllowed: status.heater_allowed,
    heaterBlockedReason: status.heater_blocked_reason,
    forceVentilation: status.force_ventilation,

    // Emergency
    emergencyPriority: status.emergency_priority as EmergencyPriority | null,
    emergencyActive: status.emergency_active,

    // Override
    overrideActive: status.override_active,
    overrideRemainingSeconds: status.override_remaining_seconds,

    // Survival
    survivalMode: status.survival_mode,

    // Plausibility
    plausibilityDegraded: status.plausibility_degraded,
    heaterAuthorityPercent: status.heater_authority_percent,

    // HSI
    hsiValue: status.hsi_value,
    hsiLevel: status.hsi_level,
    hsiFanActivated: status.hsi_fan_activated,

    // Safe mode
    safeModeActive: status.safe_mode_active,
  };
}
