/**
 * Sensor Validation — DISPLAY ONLY
 * 
 * All safety decisions (drift detection, airflow verification, survival mode,
 * plausibility checks) are now handled by the backend safety-engine and ESP32 firmware.
 * 
 * This hook reads the safety_status table and provides display-compatible interfaces
 * to existing UI components. If the browser is closed, safety is unaffected.
 */

import { useMemo } from 'react';
import { SensorData } from '@/lib/types';
import { useSafetyStatus } from './useSafetyStatus';

export type SensorState = 'VALID' | 'UNSTABLE' | 'FAILED' | 'PHYSICALLY_IMPOSSIBLE';

export interface SensorStateInfo {
  state: SensorState;
  reason: string | null;
  since: Date | null;
  heaterAuthorityBlocked: boolean;
  forcePeriodicVent: boolean;
}

export interface SensorIssue {
  sensor: 'temperature' | 'humidity' | 'ammonia' | 'water';
  type: 'stuck' | 'spike' | 'disconnected' | 'invalid' | 'out_of_range' | 'physically_impossible';
  severity: 'info' | 'warning' | 'danger';
  message: { bn: string; en: string };
  detectedAt: Date;
  shouldIgnoreSensor: boolean;
}

export interface AirflowVerificationStatus {
  verified: boolean;
  ineffective: boolean;
  heatingBlocked: boolean;
  forcePeriodicVent: boolean;
  lastVerifiedAt: Date | null;
  failReason: string | null;
  consecutiveFailures: number;
}

export interface PlausibilityStatus {
  isDegraded: boolean;
  heaterAuthorityPercent: number;
  expectedTempChange: number;
  actualTempChange: number;
  degradedSince: Date | null;
  reason: string | null;
}

export interface SensorValidationOptions {
  devicesRunning?: boolean;
  heaterOn?: boolean;
  fanOn?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useSensorValidation(_sensorData: SensorData, _options?: SensorValidationOptions) {
  const safety = useSafetyStatus();

  // Map backend safety_status to the display interfaces expected by UI components
  const issues = useMemo((): SensorIssue[] => {
    return (safety.sensorIssues || []).map((issue) => ({
      sensor: issue.sensor as SensorIssue['sensor'],
      type: (issue.type || 'invalid') as SensorIssue['type'],
      severity: 'danger' as const,
      message: { bn: issue.message, en: issue.message },
      detectedAt: new Date(),
      shouldIgnoreSensor: true,
    }));
  }, [safety.sensorIssues]);

  const ignoredSensors = useMemo(() => {
    const set = new Set<string>();
    for (const issue of issues) {
      if (issue.shouldIgnoreSensor) set.add(issue.sensor);
    }
    return set;
  }, [issues]);

  const sensorStates = useMemo((): Record<string, SensorStateInfo> => {
    const states: Record<string, SensorStateInfo> = {};
    for (const sensor of ['temperature', 'humidity', 'ammonia', 'water']) {
      const backendState = safety.sensorStates?.[sensor] || 'VALID';
      const isCritical = backendState === 'FAILED' || backendState === 'PHYSICALLY_IMPOSSIBLE';
      states[sensor] = {
        state: backendState as SensorState,
        reason: null,
        since: null,
        heaterAuthorityBlocked: isCritical,
        forcePeriodicVent: isCritical,
      };
    }
    return states;
  }, [safety.sensorStates]);

  const airflowVerification = useMemo((): AirflowVerificationStatus => ({
    verified: safety.airflowVerified,
    ineffective: safety.airflowIneffective,
    heatingBlocked: safety.airflowIneffective,
    forcePeriodicVent: safety.airflowIneffective,
    lastVerifiedAt: safety.status.airflow_last_verified_at ? new Date(safety.status.airflow_last_verified_at) : null,
    failReason: safety.status.airflow_fail_reason,
    consecutiveFailures: safety.status.airflow_consecutive_failures,
  }), [safety]);

  const plausibility = useMemo((): PlausibilityStatus => ({
    isDegraded: safety.plausibilityDegraded,
    heaterAuthorityPercent: safety.heaterAuthorityPercent,
    expectedTempChange: 0,
    actualTempChange: 0,
    degradedSince: null,
    reason: safety.status.plausibility_reason,
  }), [safety]);

  return {
    issues,
    hasIssues: issues.length > 0,
    ignoredSensors,
    safeModeActive: safety.safeModeActive,
    safeModeUntil: safety.status.safe_mode_until ? new Date(safety.status.safe_mode_until) : null,
    survivalMode: safety.survivalMode,
    survivalFanOn: safety.status.survival_fan_on,
    survivalHeaterOn: safety.status.survival_heater_on,
    plausibility,
    airflowVerification,
    sensorStates,
    tempSensorCritical: safety.tempSensorCritical,
    shouldIgnoreSensor: (sensor: string) => ignoredSensors.has(sensor),
    getIssuesBySensor: (sensor: SensorIssue['sensor']) => issues.filter(i => i.sensor === sensor),
    getValidSensorData: () => ({
      temperature: ignoredSensors.has('temperature') ? null : _sensorData.temperature,
      humidity: ignoredSensors.has('humidity') ? null : _sensorData.humidity,
      ammonia: ignoredSensors.has('ammonia') ? null : _sensorData.ammonia,
      waterUsage: ignoredSensors.has('water') ? null : _sensorData.waterUsage,
    }),
  };
}
