import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
import { useFarmSettings, useDeviceStatus } from '@/hooks/useFarmData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useBoundedOverride } from '@/hooks/useBoundedOverride';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { useSelectedShed } from '@/hooks/useSheds';
import { useAutomationMode, useSetAutomationMode } from '@/hooks/useAutomationMode';
import { useToast } from '@/hooks/use-toast';
import { evaluateSafetyLock } from '@/lib/deviceSafetyLock';
import { DEFAULT_SAFETY_PROTECTIONS, type DeviceMode } from '@/components/control';
import { BROILER_DEVICES, LAYER_DEVICES } from '@/data/controlDevices';
import {
  DESIRED_COL_MAP,
  EXPIRES_COL_MAP,
  readActualStatus,
  restoreTimersFromRow,
  formatRemaining,
} from '@/lib/deviceColumns';

type CommandType =
  | 'fan' | 'light' | 'alarm' | 'heater'
  | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';

/**
 * All ControlPage state, effects and command handlers.
 * Extracted verbatim from ControlPage.tsx — behaviour must stay identical.
 */
export function useControlPageState() {
  const { language, user } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { selectedFarmId, farms, isLoading: farmsLoading } = useFarmContext();
  const { status, setDeviceStatus } = useDeviceControl(selectedShedId);
  const { data: rawDeviceStatus } = useDeviceStatus(selectedShedId);

  const sendCommand = useSendDeviceCommand();
  const boundedOverride = useBoundedOverride();
  const farmNotReady = !selectedFarmId;

  const perms = usePermissions();
  const { sensorData } = useRealtimeSensorData();
  const { isBroiler } = useFarmType();
  const { data: automationMode } = useAutomationMode();
  const setAutomationMode = useSetAutomationMode();
  const { data: farmSettings } = useFarmSettings();

  // FIX #1 (split-brain): mirror useDeviceControl's manual-mode logic so the
  // banner and the underlying resolveState agree.
  const rawStatus = rawDeviceStatus as Record<string, unknown> | undefined;
  const isManualMode =
    automationMode === 'MANUAL' ||
    !!rawStatus?.desired_manual_override ||
    !!rawStatus?.manual_override;

  const DEVICES = isBroiler ? BROILER_DEVICES : LAYER_DEVICES;

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

  const getActualStatus = useCallback(
    (deviceKey: string): boolean =>
      readActualStatus(rawDeviceStatus as Record<string, unknown> | undefined, deviceKey),
    [rawDeviceStatus],
  );

  // Clear a device's desired_* column (null-out) + expires_at.
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
  useEffect(() => {
    if (!rawDeviceStatus) return;
    const r = rawDeviceStatus as Record<string, unknown>;
    const restored = restoreTimersFromRow(r);

    setActiveTimers((prev) => {
      const next = { ...prev, ...restored };
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
      const expired = Object.entries(activeTimers)
        .filter(([, timer]) => timer.endTime <= now)
        .map(([deviceKey]) => deviceKey);

      if (expired.length === 0) return;

      const engineEnabled = (farmSettings as any)?.safety_engine_enabled !== false;
      const heatActive = engineEnabled && sensorData.temperature > Number(farmSettings?.temperature_max ?? 32);
      const gasActive = engineEnabled && sensorData.ammonia > Number(farmSettings?.ammonia_max ?? 25);
      const coolingDevices = ['fan', 'circulation_fan', 'ceiling_fan', 'fogger', 'sprinkler'];

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

      setActiveTimers((prev) => {
        const updated = { ...prev };
        expired.forEach((k) => delete updated[k]);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers, language, clearDesiredColumn, setDeviceStatus, toast, sensorData.temperature, sensorData.ammonia, farmSettings?.temperature_max, farmSettings?.ammonia_max, farmSettings]);

  // Reconcile: when ESP32 reports actual == desired, clear the pending spinner.
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

  // Timeout: silently clear the spinner after PENDING_TIMEOUT_MS.
  useEffect(() => {
    if (Object.keys(pendingCommands).length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const timedOut = Object.entries(pendingCommands)
        .filter(([, p]) => now - p.startedAt > PENDING_TIMEOUT_MS)
        .map(([k]) => k);
      if (timedOut.length === 0) return;
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
    if (isManualMode) return 'temporary';
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
  // Fully manual: no automation runs. Safety Engine ON still enforces the
  // hard protections (heat/gas) — OFF gives raw, unrestricted control.
  const handleManualToggle = (deviceKey: string, newValue: boolean) => {
    if (!requireFarmSelected()) return;
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

    if (!newValue) {
      const { isSafetyLocked, reason } = evaluateSafetyLock({
        deviceKey,
        temperature: sensorData.temperature,
        ammonia: sensorData.ammonia,
        tempMax: Number(farmSettings?.temperature_max ?? 32),
        ammoniaMax: Number(farmSettings?.ammonia_max ?? 25),
        engineEnabled: (farmSettings as any)?.safety_engine_enabled,
      });
      if (isSafetyLocked) {
        toast({
          title: language === 'bn' ? '🛡️ সেফটি ইঞ্জিন সক্রিয়' : '🛡️ Safety Engine active',
          description: reason ? reason[language] : undefined,
          variant: 'destructive',
        });
        return;
      }
    }

    const cmdType = deviceKey as CommandType;
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
    const cmdType = pendingDevice.device as CommandType;
    const targetValue = pendingDevice.intent === 'on';

    const endTime = Date.now() + durationMinutes * 60000;
    const desiredCol = DESIRED_COL_MAP[pendingDevice.device];
    const expCol = EXPIRES_COL_MAP[pendingDevice.device];

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
    if (!requireFarmSelected()) return;
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
      const currentTemp = sensorData.temperature;
      const isOutOfRange = !boundedOverride.isWithinBioLimits(currentTemp);
      boundedOverride.startOverride(
        { reason: reason || 'No reason provided', targetTemp: currentTemp },
        isOutOfRange,
      );
      setActiveTimers({});
    } else {
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

  return {
    language,
    farms,
    farmsLoading,
    farmNotReady,
    isManualMode,
    isViewer,
    canFullControl,
    canTemporaryControl,
    DEVICES,
    sensorData,
    farmSettings,
    tempMax,
    ammoniaMax,
    safetyProtections,
    activeTimers,
    hasTemporaryOverrides,
    pendingCommands,
    timerDialogOpen,
    setTimerDialogOpen,
    pendingDevice,
    setPendingDevice,
    isDeviceActive,
    getDeviceMode,
    getRemainingTime,
    handleManualToggle,
    handleRunTemporarily,
    handleStopTemporarily,
    handleCancelOverride,
    handleTimerConfirm,
    handleAutomationToggle,
  };
}
