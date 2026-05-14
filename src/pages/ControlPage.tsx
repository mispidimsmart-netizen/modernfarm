import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Fan, Lightbulb, Bell, Flame, Wind, Droplets,
  ShieldAlert, Timer, CloudDrizzle, CircleDot,
  Hand, Bot, Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
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
  RealtimeLatencyBadge,
  RealtimeLatencyTester,
  type DeviceMode 
} from '@/components/control';

// New industrial components
import { StateExplanationHeader } from '@/components/control/StateExplanationHeader';
import { WhyFanRunning } from '@/components/control/WhyFanRunning';
import { LiveEnvironmentPanel } from '@/components/control/LiveEnvironmentPanel';
import { AutomationDecisionLog } from '@/components/control/AutomationDecisionLog';
import { LightStatusPanel } from '@/components/lighting/LightStatusPanel';

// Broiler-specific devices (heater is more important)
const BROILER_DEVICES = [
  {
    key: 'heater',
    icon: Flame,
    name: { bn: 'হিটার', en: 'Heater' },
    description: { bn: 'বাচ্চার তাপমাত্রা বজায় রাখে', en: 'Maintains chick temperature' },
    priority: true,
  },
  {
    key: 'fan',
    icon: Fan,
    name: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
    description: { bn: 'অ্যামোনিয়া ও আর্দ্রতা দূর করে', en: 'Removes ammonia and moisture' },
  },
  {
    key: 'ceiling_fan',
    icon: CircleDot,
    name: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
    description: { bn: 'ঘরের ভেতর বাতাস চলাচল', en: 'Indoor air circulation' },
  },
  {
    key: 'circulation_fan',
    icon: Wind,
    name: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
    description: { bn: 'বাতাস সমভাবে ছড়িয়ে দেয়', en: 'Distributes air evenly' },
  },
  {
    key: 'fogger',
    icon: Droplets,
    name: { bn: 'ফগার', en: 'Fogger' },
    description: { bn: 'গরমে হিট স্ট্রেস কমায়', en: 'Reduces heat stress' },
  },
  {
    key: 'sprinkler',
    icon: CloudDrizzle,
    name: { bn: 'ছাদ স্প্রিংকলার', en: 'Roof Sprinkler' },
    description: { bn: 'ছাদ ঠান্ডা রাখে (HSI ভিত্তিক)', en: 'Cools roof (HSI based)' },
  },
  {
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'আলো নিয়ন্ত্রণ', en: 'Light control' },
  },
];

// Layer-specific devices
const LAYER_DEVICES = [
  {
    key: 'fan',
    icon: Fan,
    name: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
    description: { bn: 'অ্যামোনিয়া ও আর্দ্রতা দূর করে', en: 'Removes ammonia and moisture' },
  },
  {
    key: 'ceiling_fan',
    icon: CircleDot,
    name: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
    description: { bn: 'ঘরের ভেতর বাতাস চলাচল (≥25°C)', en: 'Indoor air circulation (≥25°C)' },
  },
  {
    key: 'heater',
    icon: Flame,
    name: { bn: 'হিটার', en: 'Heater' },
    description: { bn: 'শীতে তাপ দেয়', en: 'Provides heat in winter' },
  },
  {
    key: 'fogger',
    icon: Droplets,
    name: { bn: 'ফগার', en: 'Fogger' },
    description: { bn: 'গরমে হিট স্ট্রেস কমায়', en: 'Reduces heat stress' },
  },
  {
    key: 'sprinkler',
    icon: CloudDrizzle,
    name: { bn: 'ছাদ স্প্রিংকলার', en: 'Roof Sprinkler' },
    description: { bn: 'ছাদ ঠান্ডা রাখে (HSI ভিত্তিক)', en: 'Cools roof (HSI based)' },
  },
  {
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'ডিম উৎপাদনে সহায়ক', en: 'Supports egg production' },
  },
];

export function ControlPage() {
  const { language } = useAuth();
  const { selectedShedId } = useSelectedShed();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl(selectedShedId);
  const sendCommand = useSendDeviceCommand();
  const boundedOverride = useBoundedOverride();
  // Canonical 4-role permissions (workers blocked from hardware/automation)
  const perms = usePermissions();
  const { sensorData } = useRealtimeSensorData();
  const { isBroiler } = useFarmType();
  const { data: automationMode } = useAutomationMode();
  const setAutomationMode = useSetAutomationMode();
  const isManualMode = automationMode === 'MANUAL';

  const DEVICES = isBroiler ? BROILER_DEVICES : LAYER_DEVICES;

  // Capability mapping: workers get temp override only; hardware/automation toggles
  // require canChangeHardware (farm_owner / org_owner / super_admin).
  const canTemporaryControl = perms.canTempOverride;
  const canFullControl = perms.canChangeHardware;
  const canDisableAutomation = perms.canChangeHardware;
  const isViewer = perms.role === 'guest';
  const { toast } = useToast();

  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<{
    device: string;
    icon: React.ReactNode;
    name: string;
  } | null>(null);
  const [activeTimers, setActiveTimers] = useState<Record<string, { endTime: number; duration: number }>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Find expired timers without mutating state inside setter
      const expired = Object.entries(activeTimers)
        .filter(([, timer]) => timer.endTime <= now)
        .map(([deviceKey]) => deviceKey);

      if (expired.length === 0) return;

      // Side effects: turn devices off + notify
      expired.forEach((deviceKey) => {
        const cmdType = deviceKey as
          | 'fan' | 'light' | 'alarm' | 'heater'
          | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
        sendCommand.mutate({
          commandType: cmdType,
          commandValue: false,
          shedId: selectedShedId || undefined,
        });
        setDeviceStatus({ [deviceKey]: false });
        toast({
          title: language === 'bn' ? '⏰ টাইমার শেষ' : '⏰ Timer Expired',
          description: language === 'bn'
            ? 'ডিভাইস বন্ধ হয়ে অটো মোডে ফিরে গেছে'
            : 'Device turned off, back to AUTO mode',
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
  }, [activeTimers, language, sendCommand, setDeviceStatus, toast, selectedShedId]);

  const getRemainingTime = useCallback((device: string) => {
    const timer = activeTimers[device];
    if (!timer) return null;
    const remaining = Math.max(0, timer.endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [activeTimers]);

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

  // ===== MANUAL MODE: Direct ON/OFF toggle =====
  const handleManualToggle = (deviceKey: string, newValue: boolean) => {
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
    toast({
      title: newValue
        ? (language === 'bn' ? '✅ চালু হয়েছে' : '✅ Turned On')
        : (language === 'bn' ? '⏹️ বন্ধ হয়েছে' : '⏹️ Turned Off'),
    });
  };

  // ===== AUTO MODE: Timer-based temporary control =====
  const handleRunTemporarily = (deviceKey: string, deviceName: { bn: string; en: string }, icon: React.ElementType) => {
    const IconComponent = icon;
    setPendingDevice({
      device: deviceKey,
      icon: <IconComponent className="h-6 w-6" />,
      name: deviceName[language],
    });
    setTimerDialogOpen(true);
  };

  const handleStop = (deviceKey: string) => {
    const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
    sendCommand.mutate({ commandType: cmdType, commandValue: false, shedId: selectedShedId || undefined });
    setDeviceStatus({ [deviceKey]: false });
    setActiveTimers(prev => {
      const updated = { ...prev };
      delete updated[deviceKey];
      return updated;
    });
    toast({
      title: language === 'bn' ? '✅ বন্ধ হয়েছে' : '✅ Stopped',
      description: language === 'bn' ? 'ডিভাইস অটো মোডে ফিরে গেছে' : 'Device returned to AUTO mode',
    });
  };

  const handleTimerConfirm = (durationMinutes: number) => {
    if (!pendingDevice) return;
    const cmdType = pendingDevice.device as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
    sendCommand.mutate({ commandType: cmdType, commandValue: true, shedId: selectedShedId || undefined });
    setDeviceStatus({ [pendingDevice.device]: true });
    setActiveTimers(prev => ({
      ...prev,
      [pendingDevice.device]: {
        endTime: Date.now() + durationMinutes * 60000,
        duration: durationMinutes,
      },
    }));
    toast({
      title: language === 'bn' ? '✅ সাময়িক চালু' : '✅ Temporarily Started',
      description: language === 'bn' 
        ? `${pendingDevice.name} ${durationMinutes} মিনিট চলবে, তারপর অটো মোডে ফিরে যাবে` 
        : `${pendingDevice.name} will run for ${durationMinutes} minutes then return to auto`,
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
      // Switching to MANUAL mode
      const currentTemp = sensorData.temperature;
      const isOutOfRange = !boundedOverride.isWithinBioLimits(currentTemp);
      boundedOverride.startOverride(
        { reason: reason || 'No reason provided', targetTemp: currentTemp },
        isOutOfRange,
      );
    } else {
      // Switching to AUTO mode — clear all timers and send device OFF commands
      boundedOverride.endOverride();
      const timerDevices = Object.keys(activeTimers);
      timerDevices.forEach((deviceKey) => {
        const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger' | 'ceiling_fan' | 'sprinkler';
        sendCommand.mutate({ commandType: cmdType, commandValue: false, shedId: selectedShedId || undefined });
        setDeviceStatus({ [deviceKey]: false });
      });
      setActiveTimers({});
    }

    const newMode = enabled ? 'AUTO' : 'MANUAL';
    setAutomationMode.mutate(newMode);

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

      <main className="page-container px-4 space-y-4">
        {/* ===== MODE INDICATOR BANNER ===== */}
        <div className={`rounded-2xl border-2 p-3 flex items-center justify-between ${
          isManualMode
            ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-amber-600/5'
            : 'border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isManualMode ? 'bg-amber-500/20 text-amber-600' : 'bg-primary/15 text-primary'
            }`}>
              {isManualMode ? <Hand className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">
                  {isManualMode
                    ? (language === 'bn' ? '✋ ম্যানুয়াল মোড' : '✋ Manual Mode')
                    : (language === 'bn' ? '🤖 অটো মোড' : '🤖 Auto Mode')
                  }
                </p>
                <Badge variant="secondary" className={`text-[10px] ${
                  isManualMode
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-primary/20 text-primary'
                }`}>
                  {isManualMode
                    ? (language === 'bn' ? 'সরাসরি কন্ট্রোল' : 'Direct Control')
                    : (language === 'bn' ? 'টাইমার কন্ট্রোল' : 'Timer Control')
                  }
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isManualMode
                  ? (language === 'bn' ? 'আপনি সরাসরি ON/OFF করতে পারবেন' : 'You can directly toggle ON/OFF')
                  : (language === 'bn' ? 'সাময়িক কন্ট্রোল — টাইমার শেষে অটো ফিরবে' : 'Temporary control — returns to auto after timer')
                }
              </p>
            </div>
          </div>
          <Link to="/settings" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* ===== 1. STATE EXPLANATION HEADER ===== */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StateExplanationHeader />
          <RealtimeLatencyBadge />
        </div>

        {/* Latency tester (manual mode only) */}
        {isManualMode && <RealtimeLatencyTester />}

        {/* ===== 2. WHY FAN IS RUNNING (only in AUTO mode) ===== */}
        {!isManualMode && <WhyFanRunning />}

        {/* ===== 3. LIVE ENVIRONMENT + SENSOR HEALTH (always shown) ===== */}
        <LiveEnvironmentPanel />

        {/* ===== 💡 Light Status (single compact panel) ===== */}
        <LightStatusPanel />

        {/* ===== 4. DEVICE CONTROL PANEL ===== */}
        {isManualMode ? (
          /* ========== MANUAL MODE: Direct ON/OFF Controls ========== */
          <div className="space-y-3">
            {/* Safety reminder */}
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-400">
                  {language === 'bn'
                    ? '🛡️ সেফটি সিস্টেম (INV-1 থেকে INV-8) সবসময় সক্রিয় — জরুরি অবস্থায় সিস্টেম হস্তক্ষেপ করবে'
                    : '🛡️ Safety system (INV-1 to INV-8) always active — system will intervene in emergencies'}
                </p>
              </div>
            </div>

            {/* Viewer restriction */}
            {isViewer && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">
                        {language === 'bn' ? 'শুধুমাত্র দেখার অনুমতি' : 'View Only Access'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'bn' 
                          ? 'আপনি ভিউয়ার হিসেবে কোনো পরিবর্তন করতে পারবেন না'
                          : 'As a viewer, you cannot make any changes'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Direct Device Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEVICES.map((device, index) => {
                const active = isDeviceActive(device.key);
                const Icon = device.icon;
                return (
                  <motion.div
                    key={device.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border-2 transition-all duration-300 ${
                      active
                        ? 'border-emerald-500/60 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-md shadow-emerald-500/10'
                        : 'border-border/50 hover:border-border'
                    }`}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                              active
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <Icon className={`h-5 w-5 ${active ? 'animate-pulse' : ''}`} />
                              {active && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{device.name[language]}</p>
                              <p className="text-[11px] text-muted-foreground leading-tight">{device.description[language]}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <Switch
                              checked={active}
                              onCheckedChange={(val) => handleManualToggle(device.key, val)}
                              disabled={isViewer || !canFullControl || sendCommand.isPending}
                              className={`scale-110 ${active ? 'data-[state=checked]:bg-emerald-500' : ''}`}
                            />
                            <span className={`text-[10px] font-bold tracking-wider ${
                              active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                            }`}>
                              {active ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========== AUTO MODE: Timer-based Temporary Control ========== */
          <div className="rounded-2xl border-2 border-status-warning/40 bg-status-warning/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-status-warning text-center">
              {language === 'bn' 
                ? '⚠️ সতর্কতা: অটোমেশন বন্ধ করলে মুরগির ক্ষতি হতে পারে'
                : '⚠️ Warning: Disabling automation may harm birds'}
            </p>

            {/* Automation Master Status */}
            <AutomationStatusBanner
              automationEnabled={!manualOverride}
              hasTemporaryOverrides={hasTemporaryOverrides}
              onToggleAutomation={handleAutomationToggle}
              canToggle={canDisableAutomation}
              overrideRemainingSeconds={boundedOverride.remainingSeconds}
              isOutOfBioRange={boundedOverride.isOutOfBioRange}
            />

            {/* Viewer restriction */}
            {isViewer && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">
                        {language === 'bn' ? 'শুধুমাত্র দেখার অনুমতি' : 'View Only Access'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'bn' 
                          ? 'আপনি ভিউয়ার হিসেবে কোনো পরিবর্তন করতে পারবেন না'
                          : 'As a viewer, you cannot make any changes'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Farmer (temporary only) notice */}
            {canTemporaryControl && !canFullControl && !isViewer && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-foreground">
                        {language === 'bn' ? 'সাময়িক কন্ট্রোল' : 'Temporary Control Only'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'bn' 
                          ? 'আপনি শুধুমাত্র সাময়িক কন্ট্রোল করতে পারবেন, স্থায়ী পরিবর্তন নয়'
                          : 'You can only make temporary changes, not permanent ones'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Safety Locked Devices */}
            <SafetyLockedDevices protections={safetyProtections} />

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

            {/* Device Control Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEVICES.map((device) => (
                <SafeDeviceCard
                  key={device.key}
                  deviceKey={device.key}
                  icon={device.icon}
                  name={device.name}
                  description={device.description}
                  isActive={isDeviceActive(device.key)}
                  mode={getDeviceMode(device.key)}
                  remainingTime={getRemainingTime(device.key)}
                  onRunTemporarily={() => handleRunTemporarily(device.key, device.name, device.icon)}
                  onStopTemporarily={() => handleStop(device.key)}
                  disabled={!canTemporaryControl || sendCommand.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* ===== 5. AUTOMATION DECISION LOG (only in AUTO mode) ===== */}
        {!isManualMode && <AutomationDecisionLog />}

        {/* ===== 6. SAFETY FOOTER ===== */}
        <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            🛡️ {language === 'bn' 
              ? 'নেট না থাকলেও খামার চলবে • সমস্ত ম্যানুয়াল অ্যাকশন স্বয়ংক্রিয়ভাবে মেয়াদ শেষ হয়'
              : 'Farm runs without internet • All manual actions expire automatically'}
          </p>
        </div>
      </main>

      {/* Timer Dialog (only used in AUTO mode) */}
      <ManualControlTimerDialog
        open={timerDialogOpen}
        onOpenChange={setTimerDialogOpen}
        deviceName={pendingDevice?.name || ''}
        deviceIcon={pendingDevice?.icon || null}
        onConfirm={handleTimerConfirm}
        onCancel={() => setPendingDevice(null)}
      />

      <BottomNav />
    </div>
  );
}
