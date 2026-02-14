/**
 * Heater-Ventilation Interlock — DISPLAY ONLY
 * 
 * All interlock logic (fan pulse, rapid rise, suffocation prevention)
 * runs on ESP32 firmware and backend safety-engine.
 * This hook reads safety_status for display purposes only.
 */

import { useSafetyStatus } from './useSafetyStatus';

export interface InterlockStatus {
  heaterAllowed: boolean;
  heaterBlockedReason: string | null;
  mandatoryFanPulseActive: boolean;
  rapidRiseDetected: boolean;
  forceVentilation: boolean;
  minVentDutyRequired: boolean;
  currentTempRate: number;
}

interface UseHeaterVentInterlockProps {
  heaterOn: boolean;
  fanOn: boolean;
  fanAvailable: boolean;
  temperature: number | null;
  sensorValid: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useHeaterVentInterlock(_props: UseHeaterVentInterlockProps): InterlockStatus {
  const safety = useSafetyStatus();

  return {
    heaterAllowed: safety.heaterAllowed,
    heaterBlockedReason: safety.heaterBlockedReason,
    mandatoryFanPulseActive: safety.status.mandatory_fan_pulse_active,
    rapidRiseDetected: safety.status.rapid_temp_rise_detected,
    forceVentilation: safety.forceVentilation,
    minVentDutyRequired: safety.status.min_vent_duty_required,
    currentTempRate: safety.status.current_temp_rate,
  };
}
