/**
 * Safe Firmware Staged Rollout Protection
 * 
 * Prevents mass firmware deployment failure across farms.
 * 
 * Rollout phases:
 *   Phase 1: 5% of devices
 *   Phase 2: 25% of devices  
 *   Phase 3: 100% of devices
 * 
 * After each phase, wait 30 minutes and evaluate:
 *   - If >3% devices fail to report healthy heartbeat → auto-stop rollout
 *   - Mark firmware as unstable
 *   - Block further installs
 * 
 * Devices must report: boot_success, sensor_ok, relay_ok
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth } from './useDeviceHealth';

// === ROLLOUT CONSTANTS ===
const ROLLOUT_PHASES = [
  { phase: 1, percent: 5, label: '5% Canary' },
  { phase: 2, percent: 25, label: '25% Early' },
  { phase: 3, percent: 100, label: '100% Full' },
] as const;

const PHASE_WAIT_MS = 30 * 60 * 1000;  // 30 minutes between phases
const FAILURE_THRESHOLD_PERCENT = 3;     // >3% failure → abort
const HEALTH_CHECK_INTERVAL_MS = 60 * 1000; // Check every 60s

export type RolloutPhase = 1 | 2 | 3;
export type RolloutStatus = 'idle' | 'rolling' | 'waiting' | 'aborted' | 'complete';

export interface DeviceRolloutHealth {
  deviceId: string;
  firmwareVersion: string;
  bootSuccess: boolean;
  sensorOk: boolean;
  relayOk: boolean;
  healthy: boolean;
  reportedAt: string | null;
}

export interface RolloutState {
  status: RolloutStatus;
  currentPhase: RolloutPhase;
  firmwareId: string | null;
  firmwareVersion: string | null;
  totalDevices: number;
  devicesInPhase: number;
  devicesUpdated: number;
  devicesHealthy: number;
  devicesFailed: number;
  failurePercent: number;
  phaseStartedAt: number | null;
  waitingUntil: number | null;
  abortReason: string | null;
}

export function useStagedRollout() {
  const { user } = useAuth();
  const { data: deviceHealthList } = useAllDeviceHealth();

  const [state, setState] = useState<RolloutState>({
    status: 'idle',
    currentPhase: 1,
    firmwareId: null,
    firmwareVersion: null,
    totalDevices: 0,
    devicesInPhase: 0,
    devicesUpdated: 0,
    devicesHealthy: 0,
    devicesFailed: 0,
    failurePercent: 0,
    phaseStartedAt: null,
    waitingUntil: null,
    abortReason: null,
  });

  const rolloutActiveRef = useRef(false);
  const targetDevicesRef = useRef<string[]>([]);
  const phaseDevicesRef = useRef<string[]>([]);

  /**
   * Start a staged rollout for a firmware version.
   */
  const startRollout = useCallback(async (firmwareId: string, firmwareVersion: string) => {
    if (!user || !deviceHealthList || deviceHealthList.length === 0) return;

    const totalDevices = deviceHealthList.length;
    const allDeviceIds = deviceHealthList.map(d => d.device_token_id);

    // Shuffle for random canary selection
    const shuffled = [...allDeviceIds].sort(() => Math.random() - 0.5);
    targetDevicesRef.current = shuffled;

    const phase1Count = Math.max(1, Math.ceil(totalDevices * ROLLOUT_PHASES[0].percent / 100));
    phaseDevicesRef.current = shuffled.slice(0, phase1Count);

    rolloutActiveRef.current = true;

    setState({
      status: 'rolling',
      currentPhase: 1,
      firmwareId,
      firmwareVersion,
      totalDevices,
      devicesInPhase: phase1Count,
      devicesUpdated: 0,
      devicesHealthy: 0,
      devicesFailed: 0,
      failurePercent: 0,
      phaseStartedAt: Date.now(),
      waitingUntil: null,
      abortReason: null,
    });

    // Log rollout start
    await (supabase.from('farm_audit_logs') as any).insert({
      user_id: user.id,
      user_email: user.email || '',
      action_type: 'firmware_rollout_started',
      action_category: 'system',
      severity: 'info',
      source: 'staged_rollout',
      metadata: {
        firmware_id: firmwareId,
        firmware_version: firmwareVersion,
        total_devices: totalDevices,
        phase_1_count: phase1Count,
        phases: ROLLOUT_PHASES.map(p => `${p.percent}%`),
      },
    });

    // Dispatch OTA to phase 1 devices
    await dispatchOTAToDevices(phaseDevicesRef.current, firmwareId, firmwareVersion);

    console.log(`[StagedRollout] Phase 1 started: ${phase1Count}/${totalDevices} devices (${ROLLOUT_PHASES[0].percent}%)`);
  }, [user, deviceHealthList]);

  /**
   * Dispatch OTA command to specific devices.
   */
  const dispatchOTAToDevices = useCallback(async (
    deviceIds: string[], 
    firmwareId: string, 
    firmwareVersion: string
  ) => {
    if (!user) return;
    for (const deviceId of deviceIds) {
      await supabase.from('device_health').update({
        ota_status: 'pending',
        ota_version_available: firmwareVersion,
      } as any).eq('device_token_id', deviceId);
    }
  }, [user]);

  /**
   * Evaluate phase health: check if devices reported healthy post-update.
   */
  const evaluatePhaseHealth = useCallback((): { 
    healthy: number; failed: number; failPercent: number; passed: boolean 
  } => {
    if (!deviceHealthList) return { healthy: 0, failed: 0, failPercent: 0, passed: true };

    const phaseDeviceIds = new Set(phaseDevicesRef.current);
    const phaseDevices = deviceHealthList.filter(d => phaseDeviceIds.has(d.device_token_id));

    let healthy = 0;
    let failed = 0;

    for (const device of phaseDevices) {
      const isOnline = device.is_online ?? false;
      const firmwareMatch = device.firmware_version === state.firmwareVersion;
      const sensorOk = (device.error_count ?? 0) === 0;
      const noFailsafe = !(device.failsafe_mode ?? false);

      if (isOnline && firmwareMatch && sensorOk && noFailsafe) {
        healthy++;
      } else {
        failed++;
      }
    }

    const total = phaseDevices.length || 1;
    const failPercent = (failed / total) * 100;
    const passed = failPercent <= FAILURE_THRESHOLD_PERCENT;

    return { healthy, failed, failPercent, passed };
  }, [deviceHealthList, state.firmwareVersion]);

  /**
   * Abort rollout — mark firmware unstable and block installs.
   */
  const abortRollout = useCallback(async (reason: string) => {
    rolloutActiveRef.current = false;

    setState(prev => ({
      ...prev,
      status: 'aborted',
      abortReason: reason,
    }));

    if (!user) return;

    // Mark firmware as unstable (deactivate)
    if (state.firmwareId) {
      await supabase.from('firmware_registry').update({
        is_active: false,
      } as any).eq('id', state.firmwareId);
    }

    // Log abort
    await (supabase.from('farm_audit_logs') as any).insert({
      user_id: user.id,
      user_email: user.email || '',
      action_type: 'firmware_rollout_aborted',
      action_category: 'safety',
      severity: 'critical',
      source: 'staged_rollout',
      metadata: {
        firmware_id: state.firmwareId,
        firmware_version: state.firmwareVersion,
        phase: state.currentPhase,
        reason,
        devices_healthy: state.devicesHealthy,
        devices_failed: state.devicesFailed,
        failure_percent: state.failurePercent,
      },
    });

    console.error(`[StagedRollout] ABORTED at phase ${state.currentPhase}: ${reason}`);
  }, [user, state]);

  /**
   * Advance to next rollout phase.
   */
  const advancePhase = useCallback(async () => {
    if (!rolloutActiveRef.current || !user) return;

    const nextPhaseIndex = state.currentPhase; // currentPhase is 1-indexed, so this gives next 0-indexed
    if (nextPhaseIndex >= ROLLOUT_PHASES.length) {
      // All phases complete
      rolloutActiveRef.current = false;
      setState(prev => ({ ...prev, status: 'complete' }));

      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        action_type: 'firmware_rollout_complete',
        action_category: 'system',
        severity: 'info',
        source: 'staged_rollout',
        metadata: {
          firmware_id: state.firmwareId,
          firmware_version: state.firmwareVersion,
          total_devices: state.totalDevices,
        },
      });

      console.log('[StagedRollout] Rollout COMPLETE — all phases passed');
      return;
    }

    const phaseConfig = ROLLOUT_PHASES[nextPhaseIndex as 0 | 1 | 2];
    const deviceCount = Math.max(1, Math.ceil(state.totalDevices * phaseConfig.percent / 100));
    phaseDevicesRef.current = targetDevicesRef.current.slice(0, deviceCount);

    setState(prev => ({
      ...prev,
      status: 'rolling',
      currentPhase: phaseConfig.phase as RolloutPhase,
      devicesInPhase: deviceCount,
      devicesUpdated: 0,
      devicesHealthy: 0,
      devicesFailed: 0,
      failurePercent: 0,
      phaseStartedAt: Date.now(),
      waitingUntil: null,
    }));

    await dispatchOTAToDevices(phaseDevicesRef.current, state.firmwareId!, state.firmwareVersion!);

    console.log(`[StagedRollout] Phase ${phaseConfig.phase} started: ${deviceCount} devices (${phaseConfig.percent}%)`);
  }, [user, state, dispatchOTAToDevices]);

  // === HEALTH CHECK LOOP ===
  useEffect(() => {
    if (!rolloutActiveRef.current || state.status === 'idle' || state.status === 'aborted' || state.status === 'complete') {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();

      if (state.status === 'rolling') {
        // Check if 30 min have passed since phase start
        if (state.phaseStartedAt && now - state.phaseStartedAt >= PHASE_WAIT_MS) {
          // Evaluate health
          const { healthy, failed, failPercent, passed } = evaluatePhaseHealth();

          setState(prev => ({
            ...prev,
            devicesHealthy: healthy,
            devicesFailed: failed,
            failurePercent: failPercent,
          }));

          if (!passed) {
            abortRollout(
              `Phase ${state.currentPhase} failed: ${failPercent.toFixed(1)}% devices unhealthy (threshold: ${FAILURE_THRESHOLD_PERCENT}%)`
            );
          } else {
            // Phase passed — advance
            console.log(`[StagedRollout] Phase ${state.currentPhase} PASSED: ${healthy} healthy, ${failed} failed (${failPercent.toFixed(1)}%)`);
            advancePhase();
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state.status, state.phaseStartedAt, state.currentPhase, evaluatePhaseHealth, abortRollout, advancePhase]);

  return {
    state,
    startRollout,
    abortRollout,
    phases: ROLLOUT_PHASES,
    isActive: rolloutActiveRef.current,
  };
}
