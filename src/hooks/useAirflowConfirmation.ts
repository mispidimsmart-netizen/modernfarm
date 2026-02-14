/**
 * Airflow Confirmation Safety Check
 * 
 * After fan runs for 90 seconds continuously:
 *   - Temperature must drop at least 0.5°C
 *   - If not → ventilation is ineffective → block automation + CRITICAL alert
 * 
 * This catches:
 *   - Fan wired to wrong relay
 *   - Fan running backwards
 *   - Fan physically broken
 *   - Duct obstruction
 */

import { useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const AIRFLOW_CHECK_DURATION_MS = 90 * 1000; // 90 seconds
const EXPECTED_TEMP_DROP = 0.5;               // minimum °C drop

export interface AirflowCheckResult {
  status: 'idle' | 'checking' | 'passed' | 'failed';
  tempAtStart: number | null;
  tempNow: number | null;
  elapsedMs: number;
  tempDrop: number;
}

export function useAirflowConfirmation() {
  const { user } = useAuth();
  const fanOnSince = useRef<number | null>(null);
  const tempAtFanStart = useRef<number | null>(null);
  const checkCompleted = useRef(false);
  const [result, setResult] = useState<AirflowCheckResult>({
    status: 'idle',
    tempAtStart: null,
    tempNow: null,
    elapsedMs: 0,
    tempDrop: 0,
  });

  /**
   * Call every sensor tick with current fan state and temperature.
   * Returns true if airflow is confirmed or still checking, false if FAILED.
   */
  const checkAirflow = useCallback((fanOn: boolean, currentTemp: number): boolean => {
    if (checkCompleted.current) return result.status !== 'failed';

    if (!fanOn) {
      // Fan off — reset
      fanOnSince.current = null;
      tempAtFanStart.current = null;
      setResult(prev => prev.status === 'idle' ? prev : {
        status: 'idle', tempAtStart: null, tempNow: null, elapsedMs: 0, tempDrop: 0,
      });
      return true;
    }

    const now = Date.now();

    // Fan just turned on
    if (fanOnSince.current === null) {
      fanOnSince.current = now;
      tempAtFanStart.current = currentTemp;
      setResult({
        status: 'checking',
        tempAtStart: currentTemp,
        tempNow: currentTemp,
        elapsedMs: 0,
        tempDrop: 0,
      });
      return true;
    }

    const elapsed = now - fanOnSince.current;
    const tempDrop = (tempAtFanStart.current ?? currentTemp) - currentTemp;

    if (elapsed >= AIRFLOW_CHECK_DURATION_MS) {
      checkCompleted.current = true;

      if (tempDrop >= EXPECTED_TEMP_DROP) {
        // PASSED
        setResult({
          status: 'passed',
          tempAtStart: tempAtFanStart.current,
          tempNow: currentTemp,
          elapsedMs: elapsed,
          tempDrop,
        });
        console.log(`[AirflowCheck] PASSED: temp dropped ${tempDrop.toFixed(1)}°C in ${(elapsed / 1000).toFixed(0)}s`);
        return true;
      } else {
        // FAILED — ventilation ineffective
        setResult({
          status: 'failed',
          tempAtStart: tempAtFanStart.current,
          tempNow: currentTemp,
          elapsedMs: elapsed,
          tempDrop,
        });
        console.error(`[AirflowCheck] FAILED: temp only dropped ${tempDrop.toFixed(1)}°C in 90s (need ≥${EXPECTED_TEMP_DROP}°C)`);

        // Log CRITICAL alert
        if (user) {
          (supabase.from('farm_audit_logs') as any).insert({
            user_id: user.id,
            user_email: user.email || '',
            action_type: 'airflow_check_failed',
            action_category: 'safety',
            severity: 'critical',
            source: 'airflow_confirmation',
            metadata: {
              temp_at_start: tempAtFanStart.current,
              temp_at_end: currentTemp,
              temp_drop: tempDrop,
              expected_drop: EXPECTED_TEMP_DROP,
              duration_ms: elapsed,
              action: 'automation_blocked',
            },
          }).then(() => console.log('[AirflowCheck] Failure logged'));

          (supabase.from('alerts') as any).insert({
            user_id: user.id,
            alert_type: 'system',
            severity: 'critical',
            message: `🚨 Airflow check FAILED: Fan ran 90s but temp only dropped ${tempDrop.toFixed(1)}°C. Automation blocked.`,
            message_bn: `🚨 এয়ারফ্লো চেক ব্যর্থ: ফ্যান ৯০সে. চলেছে কিন্তু তাপমাত্রা মাত্র ${tempDrop.toFixed(1)}°সি কমেছে। অটোমেশন ব্লক করা হয়েছে।`,
          });
        }
        return false;
      }
    }

    // Still checking
    setResult({
      status: 'checking',
      tempAtStart: tempAtFanStart.current,
      tempNow: currentTemp,
      elapsedMs: elapsed,
      tempDrop,
    });
    return true;
  }, [user, result.status]);

  /** Reset to allow re-checking (e.g., after installation fix) */
  const resetCheck = useCallback(() => {
    fanOnSince.current = null;
    tempAtFanStart.current = null;
    checkCompleted.current = false;
    setResult({
      status: 'idle', tempAtStart: null, tempNow: null, elapsedMs: 0, tempDrop: 0,
    });
  }, []);

  return {
    checkAirflow,
    resetCheck,
    result,
    airflowConfirmed: result.status === 'passed',
    airflowFailed: result.status === 'failed',
  };
}
