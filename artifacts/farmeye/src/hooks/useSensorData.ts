import { useCallback, useMemo } from 'react';
import { SensorData, DeviceStatus, StatusLevel } from '@/lib/types';
import { useFarmSettings, useDeviceStatus, useUpdateDeviceStatus } from './useFarmData';
import { useAutomationMode } from './useAutomationMode';
import { useRealtimeSensorData } from './useRealtimeSensorData';
import { computeSensorStatusLevels } from '@/lib/sensorStatusLevels';


/**
 * Live sensor data — REAL ESP32 readings only, NO simulation.
 *
 * Thin adapter over `useRealtimeSensorData()` (the canonical realtime source:
 * farm-scoped subscription + offline cache). Kept for the existing callers that
 * only need the raw `SensorData` value.
 */
export function useLiveSensorData(): SensorData {
  const { sensorData } = useRealtimeSensorData();
  return sensorData;
}

/** Status levels derived from farm thresholds (shared pure logic). */
export function useStatusLevels(sensorData: SensorData) {
  const { data: settings } = useFarmSettings();
  return useMemo(
    () => computeSensorStatusLevels(sensorData, settings),
    [sensorData.temperature, sensorData.humidity, sensorData.ammonia, sensorData.waterUsage, settings]
  );
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
