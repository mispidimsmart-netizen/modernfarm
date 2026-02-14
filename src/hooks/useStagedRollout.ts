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
 * Post-update verification (3-minute soak):
 *   Each device must report for 3 consecutive minutes:
 *     - temperature reading valid
 *     - relay response valid
 *     - no survival mode triggered
 *   A per-device health score (0–100) is computed.
 *   If average batch health < 97% → pause rollout and notify admin.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth } from './useDeviceHealth';
import { toast } from 'sonner';

// === ROLLOUT CONSTANTS ===
const ROLLOUT_PHASES = [
  { phase: 1, percent: 5, label: '5% Canary' },
  { phase: 2, percent: 25, label: '25% Early' },
  { phase: 3, percent: 100, label: '100% Full' },
] as const;

const PHASE_WAIT_MS = 30 * 60 * 1000;       // 30 minutes between phases
const FAILURE_THRESHOLD_PERCENT = 3;          // >3% failure → abort
const HEALTH_CHECK_INTERVAL_MS = 60 * 1000;   // Check every 60s
const SOAK_DURATION_MS = 3 * 60 * 1000;       // 3-minute post-update soak
const SOAK_CHECK_INTERVAL_MS = 30 * 1000;     // Check soak every 30s
const BATCH_HEALTH_THRESHOLD = 97;             // <97% average → pause

export type RolloutPhase = 1 | 2 | 3;
export type RolloutStatus = 'idle' | 'rolling' | 'soaking' | 'waiting' | 'aborted' | 'complete';

// Per-device soak health tracking
export interface DeviceSoakHealth {
  deviceId: string;
  soakStartedAt: number;
  tempReadingsValid: number;   // count of valid temp checks
  tempReadingsTotal: number;
  relayResponseValid: number;  // count of valid relay checks
  relayResponseTotal: number;
  survivalTriggered: boolean;
  healthScore: number;         // 0–100
  passed: boolean;
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
  // Soak verification
  soakResults: DeviceSoakHealth[];
  averageBatchHealth: number;
  soakPassed: boolean | null;
}

export function useStagedRollout() {
  const { user, language } = useAuth();
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
    soakResults: [],
    averageBatchHealth: 100,
    soakPassed: null,
  });

  const rolloutActiveRef = useRef(false);
  const targetDevicesRef = useRef<string[]>([]);
  const phaseDevicesRef = useRef<string[]>([]);
  const soakMapRef = useRef<Map<string, DeviceSoakHealth>>(new Map());
  const soakStartRef = useRef<number>(0);

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
    soakMapRef.current.clear();

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
      soakResults: [],
      averageBatchHealth: 100,
      soakPassed: null,
    });

    // Log rollout start
    await logAudit('firmware_rollout_started', 'info', {
      firmware_id: firmwareId,
      firmware_version: firmwareVersion,
      total_devices: totalDevices,
      phase_1_count: phase1Count,
      soak_duration_minutes: 3,
      batch_health_threshold: BATCH_HEALTH_THRESHOLD,
    });

    await dispatchOTAToDevices(phaseDevicesRef.current, firmwareVersion);
    console.log(`[StagedRollout] Phase 1 started: ${phase1Count}/${totalDevices} devices`);
  }, [user, deviceHealthList]);

  /**
   * Dispatch OTA command to specific devices.
   */
  const dispatchOTAToDevices = useCallback(async (deviceIds: string[], firmwareVersion: string) => {
    if (!user) return;
    for (const deviceId of deviceIds) {
      await supabase.from('device_health').update({
        ota_status: 'pending',
        ota_version_available: firmwareVersion,
      } as any).eq('device_token_id', deviceId);
    }
  }, [user]);

  /**
   * Log to audit trail.
   */
  const logAudit = useCallback(async (
    actionType: string,
    severity: string,
    metadata: Record<string, unknown>,
  ) => {
    if (!user) return;
    await (supabase.from('farm_audit_logs') as any).insert({
      user_id: user.id,
      user_email: user.email || '',
      action_type: actionType,
      action_category: 'system',
      severity,
      source: 'staged_rollout',
      metadata: JSON.parse(JSON.stringify(metadata)),
    });
  }, [user]);

  /**
   * Begin 3-minute soak verification for current phase devices.
   */
  const startSoakVerification = useCallback(() => {
    const now = Date.now();
    soakStartRef.current = now;
    soakMapRef.current.clear();

    for (const deviceId of phaseDevicesRef.current) {
      soakMapRef.current.set(deviceId, {
        deviceId,
        soakStartedAt: now,
        tempReadingsValid: 0,
        tempReadingsTotal: 0,
        relayResponseValid: 0,
        relayResponseTotal: 0,
        survivalTriggered: false,
        healthScore: 0,
        passed: false,
      });
    }

    setState(prev => ({
      ...prev,
      status: 'soaking',
      soakResults: [],
      soakPassed: null,
    }));

    console.log(`[StagedRollout] Soak verification started for ${phaseDevicesRef.current.length} devices (3 min)`);
  }, []);

  /**
   * Sample device health during soak period.
   */
  const sampleSoakHealth = useCallback(() => {
    if (!deviceHealthList) return;

    const phaseSet = new Set(phaseDevicesRef.current);

    for (const device of deviceHealthList) {
      if (!phaseSet.has(device.device_token_id)) continue;
      const entry = soakMapRef.current.get(device.device_token_id);
      if (!entry) continue;

      // Temperature reading check: online + no sensor errors
      entry.tempReadingsTotal++;
      const isOnline = device.is_online ?? false;
      const noSensorError = (device.error_count ?? 0) === 0;
      const firmwareMatch = device.firmware_version === state.firmwareVersion;
      if (isOnline && noSensorError && firmwareMatch) {
        entry.tempReadingsValid++;
      }

      // Relay response check: no errors (proxy for stuck relays / relay failures)
      entry.relayResponseTotal++;
      const noRelayError = (device.error_count ?? 0) === 0;
      if (noRelayError) {
        entry.relayResponseValid++;
      }

      // Survival mode check
      if (device.failsafe_mode) {
        entry.survivalTriggered = true;
      }

      soakMapRef.current.set(device.device_token_id, entry);
    }
  }, [deviceHealthList, state.firmwareVersion]);

  /**
   * Finalize soak: compute per-device health scores and batch average.
   */
  const finalizeSoak = useCallback(async (): Promise<boolean> => {
    const results: DeviceSoakHealth[] = [];

    for (const entry of soakMapRef.current.values()) {
      // Score components (each worth 33.3 points)
      const tempScore = entry.tempReadingsTotal > 0
        ? (entry.tempReadingsValid / entry.tempReadingsTotal) * 33.33
        : 0;
      const relayScore = entry.relayResponseTotal > 0
        ? (entry.relayResponseValid / entry.relayResponseTotal) * 33.33
        : 0;
      const survivalScore = entry.survivalTriggered ? 0 : 33.34;

      const healthScore = Math.round(tempScore + relayScore + survivalScore);
      const passed = healthScore >= 90 && !entry.survivalTriggered;

      results.push({ ...entry, healthScore, passed });
    }

    const avgHealth = results.length > 0
      ? results.reduce((sum, r) => sum + r.healthScore, 0) / results.length
      : 0;

    const batchPassed = avgHealth >= BATCH_HEALTH_THRESHOLD;

    setState(prev => ({
      ...prev,
      soakResults: results,
      averageBatchHealth: Math.round(avgHealth * 10) / 10,
      soakPassed: batchPassed,
    }));

    // Log soak results
    await logAudit(
      batchPassed ? 'firmware_soak_passed' : 'firmware_soak_failed',
      batchPassed ? 'info' : 'critical',
      {
        phase: state.currentPhase,
        firmware_version: state.firmwareVersion,
        average_health: avgHealth,
        threshold: BATCH_HEALTH_THRESHOLD,
        device_count: results.length,
        devices_passed: results.filter(r => r.passed).length,
        devices_failed: results.filter(r => !r.passed).length,
        per_device: results.map(r => ({
          id: r.deviceId,
          score: r.healthScore,
          survival: r.survivalTriggered,
        })),
      },
    );

    if (!batchPassed) {
      toast.error(
        language === 'bn'
          ? `🚨 ফার্মওয়্যার সোক টেস্ট ব্যর্থ — ব্যাচ হেলথ ${avgHealth.toFixed(1)}% (সর্বনিম্ন ${BATCH_HEALTH_THRESHOLD}% প্রয়োজন)`
          : `🚨 Firmware soak test failed — batch health ${avgHealth.toFixed(1)}% (min ${BATCH_HEALTH_THRESHOLD}% required)`,
      );
    }

    return batchPassed;
  }, [state.currentPhase, state.firmwareVersion, logAudit, language]);

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

    await logAudit('firmware_rollout_aborted', 'critical', {
      firmware_id: state.firmwareId,
      firmware_version: state.firmwareVersion,
      phase: state.currentPhase,
      reason,
      devices_healthy: state.devicesHealthy,
      devices_failed: state.devicesFailed,
      failure_percent: state.failurePercent,
      average_batch_health: state.averageBatchHealth,
    });

    toast.error(
      language === 'bn'
        ? `🛑 ফার্মওয়্যার রোলআউট বন্ধ — ${reason}`
        : `🛑 Firmware rollout aborted — ${reason}`,
    );

    console.error(`[StagedRollout] ABORTED at phase ${state.currentPhase}: ${reason}`);
  }, [user, state, logAudit, language]);

  /**
   * Advance to next rollout phase.
   */
  const advancePhase = useCallback(async () => {
    if (!rolloutActiveRef.current || !user) return;

    const nextPhaseIndex = state.currentPhase; // 1-indexed, so this gives next 0-indexed
    if (nextPhaseIndex >= ROLLOUT_PHASES.length) {
      // All phases complete
      rolloutActiveRef.current = false;
      setState(prev => ({ ...prev, status: 'complete' }));

      await logAudit('firmware_rollout_complete', 'info', {
        firmware_id: state.firmwareId,
        firmware_version: state.firmwareVersion,
        total_devices: state.totalDevices,
        final_batch_health: state.averageBatchHealth,
      });

      toast.success(
        language === 'bn'
          ? '✅ ফার্মওয়্যার রোলআউট সম্পন্ন — সব ডিভাইস সুস্থ'
          : '✅ Firmware rollout complete — all devices healthy',
      );

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
      soakResults: [],
      soakPassed: null,
    }));

    await dispatchOTAToDevices(phaseDevicesRef.current, state.firmwareVersion!);
    console.log(`[StagedRollout] Phase ${phaseConfig.phase} started: ${deviceCount} devices (${phaseConfig.percent}%)`);
  }, [user, state, dispatchOTAToDevices, logAudit, language]);

  /**
   * Evaluate pre-soak phase health (basic online/firmware check).
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

  // === MAIN HEALTH CHECK & SOAK LOOP ===
  useEffect(() => {
    if (!rolloutActiveRef.current) return;
    if (state.status === 'idle' || state.status === 'aborted' || state.status === 'complete') return;

    const interval = setInterval(async () => {
      const now = Date.now();

      if (state.status === 'rolling') {
        // Wait 30 min then start soak verification
        if (state.phaseStartedAt && now - state.phaseStartedAt >= PHASE_WAIT_MS) {
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
            // Pre-check passed → begin 3-minute soak verification
            startSoakVerification();
          }
        }
      }

      if (state.status === 'soaking') {
        // Sample health during soak
        sampleSoakHealth();

        // After 3 minutes, finalize
        if (now - soakStartRef.current >= SOAK_DURATION_MS) {
          const soakPassed = await finalizeSoak();

          if (!soakPassed) {
            abortRollout(
              `Soak verification failed: batch health ${state.averageBatchHealth}% < ${BATCH_HEALTH_THRESHOLD}% threshold`
            );
          } else {
            // Soak passed → advance to next phase
            console.log(`[StagedRollout] Phase ${state.currentPhase} soak PASSED (${state.averageBatchHealth}%)`);
            advancePhase();
          }
        }
      }
    }, SOAK_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state.status, state.phaseStartedAt, state.currentPhase, state.averageBatchHealth, evaluatePhaseHealth, abortRollout, advancePhase, startSoakVerification, sampleSoakHealth, finalizeSoak]);

  return {
    state,
    startRollout,
    abortRollout,
    phases: ROLLOUT_PHASES,
    isActive: rolloutActiveRef.current,
    BATCH_HEALTH_THRESHOLD,
  };
}
