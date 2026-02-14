import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Biological hard limits — birds die outside this range
const BIO_TEMP_MIN = 26; // °C
const BIO_TEMP_MAX = 35; // °C

// Timers
const EXTREME_OVERRIDE_REVERT_MS = 15 * 60 * 1000; // 15 min for out-of-range
const MAX_OVERRIDE_DURATION_MS = 20 * 60 * 1000;   // 20 min absolute max

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
  const [state, setState] = useState<BoundedOverrideState>({
    isOverrideActive: false,
    overrideStartTime: null,
    overrideReason: null,
    isOutOfBioRange: false,
    remainingSeconds: null,
  });

  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    revertTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  // Check if a target temperature is within biological safety
  const isWithinBioLimits = useCallback((temp: number) => {
    return temp >= BIO_TEMP_MIN && temp <= BIO_TEMP_MAX;
  }, []);

  // Log override event to audit log
  const logOverrideEvent = useCallback(async (
    actionType: string,
    reason: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
  ) => {
    if (!user) return;

    try {
      const { data: membership } = await supabase
        .from('farm_members')
        .select('farm_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      await supabase.from('farm_audit_logs').insert([{
        user_id: user.id,
        farm_id: membership?.farm_id ?? null,
        action_type: actionType,
        action_category: 'safety_override',
        severity: actionType === 'override_bio_exceeded' ? 'critical' : 'warning',
        source: 'app',
        metadata: JSON.parse(JSON.stringify({ override_reason: reason })),
        old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      }]);
    } catch (err) {
      console.error('Failed to log override event:', err);
    }
  }, [user]);

  // Auto-revert function
  const autoRevert = useCallback((reason: string) => {
    clearTimers();
    setState({
      isOverrideActive: false,
      overrideStartTime: null,
      overrideReason: null,
      isOutOfBioRange: false,
      remainingSeconds: null,
    });

    logOverrideEvent('override_auto_reverted', reason);

    toast.warning(
      language === 'bn'
        ? '🛡️ সিস্টেম স্বয়ংক্রিয়ভাবে অটো মোডে ফিরে গেছে'
        : '🛡️ System automatically returned to AUTO mode',
      {
        description: language === 'bn'
          ? 'ম্যানুয়াল ওভাররাইডের সময়সীমা শেষ হয়েছে'
          : 'Manual override time limit expired',
      }
    );
  }, [clearTimers, language, logOverrideEvent]);

  // Start bounded override
  const startOverride = useCallback((request: OverrideRequest, isOutOfRange: boolean) => {
    const now = Date.now();
    const revertMs = isOutOfRange ? EXTREME_OVERRIDE_REVERT_MS : MAX_OVERRIDE_DURATION_MS;

    clearTimers();

    setState({
      isOverrideActive: true,
      overrideStartTime: now,
      overrideReason: request.reason,
      isOutOfBioRange: isOutOfRange,
      remainingSeconds: Math.floor(revertMs / 1000),
    });

    // Log the override start
    logOverrideEvent(
      isOutOfRange ? 'override_bio_exceeded' : 'override_started',
      request.reason,
      undefined,
      { target_temp: request.targetTemp, is_out_of_range: isOutOfRange },
    );

    // Set auto-revert timer
    revertTimerRef.current = setTimeout(() => {
      autoRevert(isOutOfRange ? 'bio_limit_timeout_15m' : 'max_duration_timeout_20m');
    }, revertMs);

    // Countdown timer
    const endTime = now + revertMs;
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setState(prev => ({ ...prev, remainingSeconds: remaining }));
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 1000);
  }, [clearTimers, logOverrideEvent, autoRevert]);

  // End override (user manually re-enables automation)
  const endOverride = useCallback(() => {
    clearTimers();
    if (state.isOverrideActive) {
      logOverrideEvent('override_ended_by_user', state.overrideReason ?? 'manual');
    }
    setState({
      isOverrideActive: false,
      overrideStartTime: null,
      overrideReason: null,
      isOutOfBioRange: false,
      remainingSeconds: null,
    });
  }, [clearTimers, logOverrideEvent, state.isOverrideActive, state.overrideReason]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    ...state,
    startOverride,
    endOverride,
    isWithinBioLimits,
    BIO_TEMP_MIN,
    BIO_TEMP_MAX,
  };
}
