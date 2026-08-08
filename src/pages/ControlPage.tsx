import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Fan, Lightbulb, Bell, Flame, Wind, Droplets,
  ShieldAlert, Timer, CloudDrizzle, CircleDot,
  Hand, Bot, Settings, AlertTriangle, Loader2,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';

import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
import { useFarmSettings, useDeviceStatus } from '@/hooks/useFarmData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useBoundedOverride } from '@/hooks/useBoundedOverride';
// Migrated from legacy useUserPermissions to canonical 4-role usePermissions
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { useSelectedShed } from '@/hooks/useSheds';
import { useAutomationMode, useSetAutomationMode } from '@/hooks/useAutomationMode';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ManualControlTimerDialog } from '@/components/assistant/ManualControlTimerDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  AutomationStatusBanner, 
  SafeDeviceCard, 
  SafetyLockedDevices,
  DEFAULT_SAFETY_PROTECTIONS,
  type DeviceMode 
} from '@/components/control';

// New industrial components
import { StateExplanationHeader } from '@/components/control/StateExplanationHeader';
import { WhyFanRunning } from '@/components/control/WhyFanRunning';
import { AutomationDecisionLog } from '@/components/control/AutomationDecisionLog';

import { BROILER_DEVICES, LAYER_DEVICES } from '@/data/controlDevices';
import {
  DESIRED_COL_MAP,
  EXPIRES_COL_MAP,
  readActualStatus,
  restoreTimersFromRow,
  formatRemaining,
} from '@/lib/deviceColumns';


export function ControlPage() {
  const { language, user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { selectedFarmId, farms, isLoading: farmsLoading } = useFarmContext();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl(selectedShedId);
  const { data: rawDeviceStatus } = useDeviceStatus(selectedShedId);

  const sendCommand = useSendDeviceCommand();
  const boundedOverride = useBoundedOverride();
  const farmNotReady = !selectedFarmId;

  // Canonical 4-role permissions (workers blocked from hardware/automation)
  const perms = usePermissions();
  const { sensorData } = useRealtimeSensorData();
  const { isBroiler } = useFarmType();
  const { data: automationMode } = useAutomationMode();
  const setAutomationMode = useSetAutomationMode();
  const { data: farmSettings } = useFarmSettings();
  // FIX #1 (split-brain): mirror useDeviceControl's manual-mode logic so the
  // banner and the underlying resolveState agree. If ESP32 forced FAIL_SAFE
  // (sets manual_override=true) the banner must show Manual too — otherwise
  // switches show desired_* while banner claims Auto.
  const rawStatus = rawDeviceStatus as Record<string, unknown> | undefined;
  const isManualMode =
    automationMode === 'MANUAL' ||
    !!rawStatus?.desired_manual_override ||
    !!rawStatus?.manual_override;

  const DEVICES = isBroiler ? BROILER_DEVICES : LAYER_DEVICES;

  // Capability mapping: workers get temp override only; hardware/automation toggles
  // require canChangeHardware (farm_owner / org_owner / super_admin).
  // Device ON/OFF is a hardware command even when it is temporary; keep the
  // UI aligned with backend command RLS so workers/members do not hit a false
  // "command failed" state.
  const canTemporaryControl = perms.canChangeHardware;
  const canFullControl = perms.canChangeHardware;
  const canDisableAutomation = perms.canChangeHardware;
  const isViewer = perms.role === 'guest';
  const { toast } = useToast();

  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<{
    device: string;
    icon: React.ReactNode;
    name: string;
    intent: 'on' | 'off';
  } | null>(null);

  const [activeTimers, setActiveTimers] = useState<Record<string, { endTime: number; duration: number }>>({});

  // ===== HARDWARE-CONFIRMATION PENDING STATE =====
  // Visual-only "pending" spinner. The authoritative ACK/timeout toasts are
  // emitted by useSendDeviceCommand (12s poller). We match its window here so
  // the spinner clears at the same time the hook resolves — no duplicate toasts,
  // no premature "no confirmation" flicker.
  const PENDING_TIMEOUT_MS = 12000;
  const [pendingCommands, setPendingCommands] = useState<
    Record<string, { desired: boolean; startedAt: number }>
  >({});

  const markPending = useCallback((deviceKey: string, desired: boolean) => {
    setPendingCommands((prev) => ({
      ...prev,
      [deviceKey]: { desired, startedAt: Date.now() },
    }));
  }, []);

  // Read ACTUAL hardware state (fan_on, heater_on, ...) — NOT the resolved
  // `status` (which in manual mode already reflects desired_*). Pending is only
  // cleared when ESP32 writes back the real actual_* column.
  const getActualStatus = useCallback(
    (deviceKey: string): boolean =>
      readActualStatus(rawDeviceStatus as Record<string, unknown> | undefined, deviceKey),
    [rawDeviceStatus],
  );

  // Helper: clear a device's desired_* column (null-out) + expires_at so
  // automation resumes AND the server-side cron won't re-fire on stale timestamps.
  const clearDesiredColumn = useCallback(async (deviceKey: string) => {
    const col = DESIRED_COL_MAP[deviceKey as keyof typeof DESIRED_COL_MAP];
    const expCol = EXPIRES_COL_MAP[deviceKey as keyof typeof EXPIRES_COL_MAP];
    if (!col || !user) return;
    let q = supabase
      .from('device_status')
      .update({ [col]: null, [expCol]: null, updated_at: new Date().toISOString() } as any)
      .eq('user_id', user.id);
    if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
    if (selectedShedId) q = q.eq('shed_id', selectedShedId);
    await q;
  }, [user, selectedFarmId, selectedShedId]);

  // ===== HYDRATE activeTimers FROM DB =====
  // Persistent-timer safety: after a refresh / new tab, restore the countdown
  // from device_status.desired_*_expires_at so the UI reflects the true
  // remaining override window (server cron will null-out on expiry regardless).
  useEffect(() => {
    if (!rawDeviceStatus) return;
    const r = rawDeviceStatus as Record<string, unknown>;
    const restored = restoreTimersFromRow(r);

    setActiveTimers((prev) => {
      // Merge: keep any local timers not yet flushed to DB, overwrite the rest
      // from the authoritative server value.
      const next = { ...prev, ...restored };
      // Drop local-only entries whose DB row has no expires_at anymore (cleared elsewhere)
      Object.keys(next).forEach((k) => {
        const colName = EXPIRES_COL_MAP[k as keyof typeof EXPIRES_COL_MAP];
        if (colName && !r[colName] && !restored[k]) delete next[k];
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawDeviceStatus]);


  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Find expired timers without mutating state inside setter
      const expired = Object.entries(activeTimers)
        .filter(([, timer]) => timer.endTime <= now)
        .map(([deviceKey]) => deviceKey);

      if (expired.length === 0) return;

      // Safety guard: if a protection is forcing this device ON right now,
      // do NOT try to turn it off — safety engine will re-assert immediately
      // causing relay oscillation. Silently keep the device running.
      const engineEnabled = (farmSettings as any)?.safety_engine_enabled !== false;
      const heatActive = engineEnabled && sensorData.temperature > Number(farmSettings?.temperature_max ?? 32);
      const gasActive = engineEnabled && sensorData.ammonia > Number(farmSettings?.ammonia_max ?? 25);
      const coolingDevices = ['fan', 'circulation_fan', 'ceiling_fan', 'fogger', 'sprinkler'];

      // Side effect: clear desired_* → null so automation resumes.
      // IMPORTANT: do NOT also call setDeviceStatus({[key]: false}) — that
      // writes desired_x = false which races clearDesiredColumn(null) and
      // ends up pinning the device OFF, blocking automation resume.
      expired.forEach((deviceKey) => {
        const safetyLocked =
          (heatActive && coolingDevices.includes(deviceKey)) ||
          (gasActive && (deviceKey === 'fan' || deviceKey === 'circulation_fan'));
        if (safetyLocked) {
          toast({
            title: language === 'bn' ? '🛡️ সেফটি সক্রিয়' : '🛡️ Safety active',
            description: language === 'bn'
              ? 'টাইমার শেষ, তবে সুরক্ষার জন্য ডিভাইস চলবে'
              : 'Timer ended, but device stays ON for safety',
          });
          return;
        }
        void clearDesiredColumn(deviceKey);
        toast({
          title: language === 'bn' ? '⏰ টাইমার শেষ' : '⏰ Timer Expired',
          description: language === 'bn'
            ? 'সাময়িক ওভাররাইড বাতিল — অটোমেশন পুনরায় নিয়ন্ত্রণে'
            : 'Override cleared — automation back in control',
        });
      });

      // Pure state update
      setActiveTimers((prev) => {
        const updated = { ...prev };
        expired.forEach((k) => delete updated[k]);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers, language, clearDesiredColumn, setDeviceStatus, toast, sensorData.temperature, sensorData.ammonia, farmSettings?.temperature_max, farmSettings?.ammonia_max]);

  // Reconcile: when ESP32 reports actual == desired, clear the pending spinner.
  // NO toast here — success is already surfaced by useSendDeviceCommand.
  useEffect(() => {
    const confirmedKeys = Object.entries(pendingCommands)
      .filter(([key, p]) => getActualStatus(key) === p.desired)
      .map(([key]) => key);
    if (confirmedKeys.length === 0) return;
    setPendingCommands((prev) => {
      const next = { ...prev };
      confirmedKeys.forEach((k) => delete next[k]);
      return next;
    });
  }, [pendingCommands, getActualStatus]);

  // Timeout: silently clear the spinner after PENDING_TIMEOUT_MS. The hook
  // already emits an offline / safety-lock / no-ack toast at the same window,
  // so we do not double-toast from here.
  useEffect(() => {
    if (Object.keys(pendingCommands).length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const timedOut = Object.entries(pendingCommands)
        .filter(([, p]) => now - p.startedAt > PENDING_TIMEOUT_MS)
        .map(([k]) => k);
      if (timedOut.length === 0) return;
      // FIX #3: on timeout, clear desired_* → null instead of writing
      // desired_* = actual. Writing actual back into desired persists a
      // stale intent (e.g. desired_fan_on=false) that overrides the user's
      // ON request once ESP32 reconnects. Null-clearing releases the intent
      // cleanly and lets automation / next user action decide.
      timedOut.forEach((k) => {
        void clearDesiredColumn(k);
      });
      setPendingCommands((prev) => {
        const next = { ...prev };
        timedOut.forEach((k) => delete next[k]);
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [pendingCommands, clearDesiredColumn]);



  const getRemainingTime = useCallback(
    (device: string) => formatRemaining(activeTimers[device]?.endTime),
    [activeTimers],
  );


  const getDeviceMode = useCallback((deviceKey: string): DeviceMode => {
    if (isManualMode) return 'temporary'; // In manual mode, all controls are direct
    if (activeTimers[deviceKey]) return 'temporary';
    return 'auto';
  }, [activeTimers, isManualMode]);

  const isDeviceActive = useCallback((deviceKey: string) => {
    switch (deviceKey) {
      case 'fan': return status.fan;
      case 'light': return status.light;
      case 'heater': return status.heater ?? false;
      case 'circulation_fan': return status.circulation_fan ?? false;
      case 'fogger': return status.fogger ?? false;
      case 'ceiling_fan': return status.ceilingFan ?? false;
      case 'sprinkler': return status.sprinkler ?? false;
      default: return false;
    }
  }, [status]);

  const requireFarmSelected = (): boolean => {
    if (!selectedFarmId) {
      toast({
        title: language === 'bn' ? '⚠️ ফার্ম নির্বাচন করুন' : '⚠️ Select a farm first',
        description: language === 'bn'
          ? 'কোনো ফার্ম সিলেক্ট করা নেই — কমান্ড পাঠানো যাবে না। উপরে ডান দিক থেকে ফার্ম বেছে নিন বা সেটিংস → ফার্মে যান।'
          : 'No farm is selected — commands cannot be sent. Pick a farm from the top bar or go to Settings → Farm.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // ===== MANUAL MODE: Direct ON/OFF toggle =====
  const handleManualToggle = (deviceKey: string, newValue: boolean) => {
    if (!requireFarmSelected()) return;
    // Worker / viewer guard — direct hardware toggle requires canChangeHardware
    if (!canFullControl) {
      toast({
        title: language === 'bn' ? 'অনুমতি নেই' : 'Permission denied',
        description: language === 'bn'
          ? 'ম্যানুয়াল মোডে সরাসরি ডিভাইস টগল করার অনুমতি শুধু ফার্ম-ওনার/অ্যাডমিনের'
          : 'Direct device toggle in manual mode is restricted to farm owner/admin',
        variant: 'destructive',
      });
      return;
    }
    const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
    sendCommand.mutate({ commandType: cmdType, commandValue: newValue, shedId: selectedShedId || undefined });

    setDeviceStatus({ [deviceKey]: newValue });
    markPending(deviceKey, newValue);
  };


  // ===== AUTO MODE: Timer-based temporary control =====
  const handleRunTemporarily = (deviceKey: string, deviceName: { bn: string; en: string }, icon: React.ElementType) => {
    if (!requireFarmSelected()) return;
    const IconComponent = icon;
    setPendingDevice({
      device: deviceKey,
      icon: <IconComponent className="h-6 w-6" />,
      name: deviceName[language],
      intent: 'on',
    });
    setTimerDialogOpen(true);
  };

  // AUTO-mode: open the timer dialog to temporarily STOP a device that
  // automation is currently running. Similar to "Run Temp" but writes
  // desired_x=false with an expiry; automation resumes after the timer ends.
  const handleStopTemporarily = (deviceKey: string, deviceName: { bn: string; en: string }, icon: React.ElementType) => {
    if (!requireFarmSelected()) return;
    const IconComponent = icon;
    setPendingDevice({
      device: deviceKey,
      icon: <IconComponent className="h-6 w-6" />,
      name: deviceName[language],
      intent: 'off',
    });
    setTimerDialogOpen(true);
  };

  // AUTO-mode Cancel: cancel the active temporary override by clearing
  // desired_* → null so automation can resume immediately (no timer).
  const handleCancelOverride = async (deviceKey: string) => {
    if (!requireFarmSelected()) return;
    setActiveTimers(prev => {
      const updated = { ...prev };
      delete updated[deviceKey];
      return updated;
    });
    await clearDesiredColumn(deviceKey);
    toast({
      title: language === 'bn' ? '↩️ ওভাররাইড বাতিল' : '↩️ Override Cleared',
      description: language === 'bn'
        ? 'অটোমেশন পরবর্তী চক্রে নিয়ন্ত্রণ নেবে (কয়েক সেকেন্ড লাগতে পারে)'
        : 'Automation will take over on next cycle (may take a few seconds)',
    });
  };

  const handleTimerConfirm = async (durationMinutes: number) => {
    if (!pendingDevice) return;
    if (!requireFarmSelected()) { setPendingDevice(null); setTimerDialogOpen(false); return; }
    const cmdType = pendingDevice.device as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
    const targetValue = pendingDevice.intent === 'on';

    const endTime = Date.now() + durationMinutes * 60000;
    const desiredCol = DESIRED_COL_MAP[pendingDevice.device];
    const expCol = EXPIRES_COL_MAP[pendingDevice.device];

    // Atomic write: desired_x + desired_x_expires_at in one update so pg_cron
    // / automation never sees an inconsistent pair.
    if (desiredCol && expCol && user) {
      let q = supabase
        .from('device_status')
        .update({
          [desiredCol]: targetValue,
          [expCol]: new Date(endTime).toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);
      if (selectedFarmId) q = q.eq('farm_id', selectedFarmId);
      if (selectedShedId) q = q.eq('shed_id', selectedShedId);
      await q;
    }

    // Fire the device_commands row so ESP32 polls it in real-time.
    sendCommand.mutate({ commandType: cmdType, commandValue: targetValue, shedId: selectedShedId || undefined });

    setDeviceStatus({ [pendingDevice.device]: targetValue });
    markPending(pendingDevice.device, targetValue);

    setActiveTimers(prev => ({
      ...prev,
      [pendingDevice.device]: { endTime, duration: durationMinutes },
    }));

    toast({
      title: targetValue
        ? (language === 'bn' ? '✅ সাময়িক চালু' : '✅ Temporarily Started')
        : (language === 'bn' ? '⏸️ সাময়িক বন্ধ' : '⏸️ Temporarily Stopped'),
      description: targetValue
        ? (language === 'bn'
            ? `${pendingDevice.name} ${durationMinutes} মিনিট চলবে, তারপর অটো মোডে ফিরে যাবে`
            : `${pendingDevice.name} will run for ${durationMinutes} minutes then return to auto`)
        : (language === 'bn'
            ? `${pendingDevice.name} ${durationMinutes} মিনিট বন্ধ থাকবে, তারপর অটো মোডে ফিরে যাবে`
            : `${pendingDevice.name} will stay OFF for ${durationMinutes} minutes then return to auto`),
    });
    setPendingDevice(null);
  };



  const handleAutomationToggle = (enabled: boolean, reason?: string) => {
    // Defensive guard — UI gates this via canDisableAutomation, but RPC layer should too
    if (!canDisableAutomation) {
      toast({
        title: language === 'bn' ? 'অনুমতি নেই' : 'Permission denied',
        description: language === 'bn'
          ? 'অটোমেশন চালু/বন্ধ করার অনুমতি শুধু ফার্ম-ওনার/অ্যাডমিনের'
          : 'Only farm owner/admin can toggle automation',
        variant: 'destructive',
      });
      return;
    }
    if (!enabled) {
      // Switching to MANUAL mode — cancel any timers so they don't ghost-fire
      // OFF commands 5 minutes later while user is doing manual work.
      const currentTemp = sensorData.temperature;
      const isOutOfRange = !boundedOverride.isWithinBioLimits(currentTemp);
      boundedOverride.startOverride(
        { reason: reason || 'No reason provided', targetTemp: currentTemp },
        isOutOfRange,
      );
      setActiveTimers({});
    } else {
      // Switching to AUTO mode — cancel timers by clearing desired_* → null.
      // Sending hardware OFF here would race the automation engine.
      boundedOverride.endOverride();
      setActiveTimers({});
    }

    const newMode = enabled ? 'AUTO' : 'MANUAL';
    setAutomationMode.mutate({ mode: newMode, shedId: selectedShedId });

    toast({
      title: enabled 
        ? (language === 'bn' ? '🟢 অটোমেশন চালু' : '🟢 Automation Enabled')
        : (language === 'bn' ? '🔴 অটোমেশন বন্ধ' : '🔴 Automation Disabled'),
      description: enabled
        ? (language === 'bn' ? 'সব ডিভাইস এখন অটোমেশনের নিয়ন্ত্রণে' : 'All devices now under automation control')
        : (language === 'bn' ? 'সতর্কতা: আপনি ম্যানুয়াল কন্ট্রোলে আছেন' : 'Warning: You are in manual control'),
    });
  };

  const hasTemporaryOverrides = Object.keys(activeTimers).length > 0;

  const tempMax = Number(farmSettings?.temperature_max ?? 32);
  const ammoniaMax = Number(farmSettings?.ammonia_max ?? 25);
  const safetyProtections = DEFAULT_SAFETY_PROTECTIONS.map(p => ({
    ...p,
    isActive: p.key === 'heat_stress' 
      ? sensorData.temperature > tempMax 
      : p.key === 'gas_purge'
        ? sensorData.ammonia > ammoniaMax
        : true,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-3 sm:px-4 md:px-6 lg:px-8 space-y-4 max-w-7xl mx-auto">
        {/* ===== FARM-NOT-SELECTED GUARD BANNER ===== */}
        {farmNotReady && (
          <FarmGuardBanner
            language={language}
            farmsLoading={farmsLoading}
            farmCount={farms?.length ?? 0}
          />
        )}

        {/* ===== MODE INDICATOR BANNER ===== */}
        <ControlModeBanner language={language} isManualMode={isManualMode} />

        {/* ===== 1. STATE EXPLANATION HEADER ===== */}
        <div className="w-full">
          <StateExplanationHeader />
        </div>

        {/* ===== 2. WHY FAN IS RUNNING (only in AUTO mode) ===== */}
        {!isManualMode && <WhyFanRunning />}

        {/* ===== 4. DEVICE CONTROL PANEL ===== */}
        {isManualMode ? (
          /* ========== MANUAL MODE: Direct ON/OFF Controls ========== */
          <div className="space-y-3">
            {isViewer && <ViewerRestrictionCard language={language} />}

            <ManualDeviceGrid
              devices={DEVICES}
              language={language}
              isDeviceActive={isDeviceActive}
              pendingCommands={pendingCommands}
              onToggle={handleManualToggle}
              disabled={farmNotReady || isViewer || !canFullControl}
            />
          </div>
        ) : (
          /* ========== AUTO MODE: Timer-based Temporary Control ========== */
          <div className="rounded-2xl border-2 border-status-warning/40 bg-status-warning/10 p-4 space-y-3">
            {isViewer && <ViewerRestrictionCard language={language} />}

            {canTemporaryControl && !canFullControl && !isViewer && (
              <TemporaryControlNoticeCard language={language} />
            )}

            {/* Safety Locked Devices — hidden when Safety Engine is OFF */}
            {(farmSettings as any)?.safety_engine_enabled !== false && (
              <SafetyLockedDevices protections={safetyProtections} />
            )}

            {/* Active Timers Summary */}
            {hasTemporaryOverrides && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {language === 'bn'
                          ? `${Object.keys(activeTimers).length}টি ডিভাইসে সাময়িক কন্ট্রোল সক্রিয়`
                          : `${Object.keys(activeTimers).length} device(s) in temporary control`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'bn'
                        ? 'টাইমার শেষে স্বয়ংক্রিয়ভাবে অটো মোডে ফিরে যাবে'
                        : 'Will return to AUTO mode when timer expires'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <AutoDeviceGrid
              devices={DEVICES}
              isDeviceActive={isDeviceActive}
              getDeviceMode={getDeviceMode}
              getRemainingTime={getRemainingTime}
              activeTimers={activeTimers}
              temperature={sensorData.temperature}
              ammonia={sensorData.ammonia}
              tempMax={tempMax}
              ammoniaMax={ammoniaMax}
              engineEnabled={(farmSettings as any)?.safety_engine_enabled}
              onRunTemporarily={(d) => handleRunTemporarily(d.key, d.name, d.icon)}
              onStopTemporarily={(d) => handleStopTemporarily(d.key, d.name, d.icon)}
              onCancelOverride={handleCancelOverride}
              disabled={farmNotReady || !canTemporaryControl}
            />
          </div>
        )}

        {/* ===== 5. AUTOMATION DECISION LOG (only in AUTO mode) ===== */}
        {!isManualMode && <AutomationDecisionLog />}

        {/* ===== 6. SAFETY FOOTER ===== */}
        <ControlSafetyFooter language={language} />
      </main>

      {/* Timer Dialog (only used in AUTO mode) */}
      <ManualControlTimerDialog
        open={timerDialogOpen}
        onOpenChange={setTimerDialogOpen}
        deviceName={pendingDevice?.name || ''}
        deviceIcon={pendingDevice?.icon || null}
        intent={pendingDevice?.intent || 'on'}
        onConfirm={handleTimerConfirm}
        onCancel={() => setPendingDevice(null)}
      />

      <BottomNav />
    </div>
  );
}

