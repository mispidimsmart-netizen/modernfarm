/**
 * Bounded Override — DISPLAY ONLY
 * 
 * Override time limits and bio-range enforcement run on
 * ESP32 firmware and backend safety-engine.
 * This hook reads safety_status and provides display + command interface.
 * 
 * startOverride/endOverride still write to device_status (user intent),
 * but the ENFORCEMENT (auto-revert, bio limits) is firmware-side.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSafetyStatus } from './useSafetyStatus';
import { useSelectedShed } from './useSheds';
import { toast } from 'sonner';

const BIO_TEMP_MIN = 26;
const BIO_TEMP_MAX = 35;

export interface OverrideRequest {
  reason: string;
  targetTemp?: number;
}

export interface BoundedOverrideState {
  isOverrideActive: boolean;
  overrideStartTime: number | null;
  overrideReason: string | null;
  isOutOfBioRange: boolean;
  remainingSeconds: number | null;
}

export function useBoundedOverride() {
  const { user, language } = useAuth();
  const safety = useSafetyStatus();
  const { selectedShedId } = useSelectedShed();

  const isWithinBioLimits = useCallback((temp: number) => {
    return temp >= BIO_TEMP_MIN && temp <= BIO_TEMP_MAX;
  }, []);

  // Send override request to device_status — firmware enforces limits
  const startOverride = useCallback(async (request: OverrideRequest, _isOutOfRange: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from('device_status')
        .update({
          manual_override: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('shed_id', selectedShedId || '');

      // Log override intent
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        action_type: 'override_requested',
        action_category: 'safety_override',
        severity: _isOutOfRange ? 'critical' : 'warning',
        source: 'app',
        metadata: {
          override_reason: request.reason,
          target_temp: request.targetTemp,
          is_out_of_range: _isOutOfRange,
        },
      });

      toast.info(
        language === 'bn' ? '⏱️ ম্যানুয়াল ওভাররাইড সক্রিয়' : '⏱️ Manual override activated',
        { description: language === 'bn' ? 'ফার্মওয়্যার সময়সীমা প্রয়োগ করবে' : 'Firmware will enforce time limits' }
      );
    } catch (err) {
      console.error('Failed to start override:', err);
    }
  }, [user, selectedShedId, language]);

  // Send end-override request
  const endOverride = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('device_status')
        .update({
          manual_override: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('shed_id', selectedShedId || '');

      toast.success(
        language === 'bn' ? '✅ অটো মোডে ফিরে এসেছে' : '✅ Returned to AUTO mode'
      );
    } catch (err) {
      console.error('Failed to end override:', err);
    }
  }, [user, selectedShedId, language]);

  // Read state from safety_status (display-only)
  const state: BoundedOverrideState = {
    isOverrideActive: safety.overrideActive,
    overrideStartTime: null,
    overrideReason: safety.status.override_reason,
    isOutOfBioRange: safety.status.override_out_of_bio_range,
    remainingSeconds: safety.overrideRemainingSeconds,
  };

  return {
    ...state,
    startOverride,
    endOverride,
    isWithinBioLimits,
    BIO_TEMP_MIN,
    BIO_TEMP_MAX,
  };
}
