/**
 * Airflow Confirmation — DISPLAY ONLY
 * 
 * Airflow verification runs on ESP32 firmware (90s check on first fan start)
 * and backend safety-engine (continuous 10-min cycles).
 * This hook reads safety_status for display purposes only.
 */

import { useSafetyStatus } from './useSafetyStatus';

export interface AirflowCheckResult {
  status: 'idle' | 'checking' | 'passed' | 'failed';
  tempAtStart: number | null;
  tempNow: number | null;
  elapsedMs: number;
  tempDrop: number;
}

export function useAirflowConfirmation() {
  const safety = useSafetyStatus();

  const airflowFailed = safety.airflowIneffective;
  const airflowConfirmed = safety.airflowVerified && !airflowFailed;

  const result: AirflowCheckResult = {
    status: airflowFailed ? 'failed' : airflowConfirmed ? 'passed' : 'idle',
    tempAtStart: null,
    tempNow: null,
    elapsedMs: 0,
    tempDrop: 0,
  };

  // Display-only stubs
  const checkAirflow = (_fanOn: boolean, _currentTemp: number): boolean => {
    // Airflow check runs on firmware — always return current status
    return !airflowFailed;
  };

  const resetCheck = () => {
    // Reset is firmware-side
  };

  return {
    checkAirflow,
    resetCheck,
    result,
    airflowConfirmed,
    airflowFailed,
  };
}
