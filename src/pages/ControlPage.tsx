import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Fan, Lightbulb, Bell, Flame, Wind, Droplets,
  ShieldAlert, Timer, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
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
import { LiveEnvironmentPanel } from '@/components/control/LiveEnvironmentPanel';
import { AutomationDecisionLog } from '@/components/control/AutomationDecisionLog';
import { FarmerSensorHealth } from '@/components/control/FarmerSensorHealth';
import { DeviceLiveTelemetry } from '@/components/device/DeviceLiveTelemetry';

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
    key: 'circulation_fan',
    icon: Wind,
    name: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
    description: { bn: 'বাতাস সমভাবে ছড়িয়ে দেয়', en: 'Distributes air evenly' },
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
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'ডিম উৎপাদনে সহায়ক', en: 'Supports egg production' },
  },
];

export function ControlPage() {
  const { language } = useAuth();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl();
  const sendCommand = useSendDeviceCommand();
  const { data: userRole } = useUserRole();
  const { data: permissions } = useUserPermissions();
  const { sensorData } = useRealtimeSensorData();
  const { isBroiler } = useFarmType();
  
  const DEVICES = isBroiler ? BROILER_DEVICES : LAYER_DEVICES;
  
  const canTemporaryControl = permissions?.canTemporaryControl ?? false;
  const canFullControl = permissions?.canFullControl ?? false;
  const canDisableAutomation = permissions?.canDisableAutomation ?? false;
  const isViewer = permissions?.role === 'viewer';
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
      setActiveTimers(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([deviceKey, timer]) => {
          if (timer.endTime <= now) {
            const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger';
            sendCommand.mutate({ commandType: cmdType, commandValue: false });
            setDeviceStatus({ [deviceKey]: false });
            delete updated[deviceKey];
            hasChanges = true;
            
            toast({
              title: language === 'bn' ? '⏰ টাইমার শেষ' : '⏰ Timer Expired',
              description: language === 'bn' 
                ? `ডিভাইস বন্ধ হয়ে অটো মোডে ফিরে গেছে` 
                : `Device turned off, back to AUTO mode`,
            });
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [language, sendCommand, setDeviceStatus, toast]);

  const getRemainingTime = useCallback((device: string) => {
    const timer = activeTimers[device];
    if (!timer) return null;
    const remaining = Math.max(0, timer.endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [activeTimers]);

  const getDeviceMode = useCallback((deviceKey: string): DeviceMode => {
    if (activeTimers[deviceKey]) return 'temporary';
    return 'auto';
  }, [activeTimers]);

  const isDeviceActive = useCallback((deviceKey: string) => {
    switch (deviceKey) {
      case 'fan': return status.fan;
      case 'light': return status.light;
      case 'heater': return status.heater ?? false;
      case 'circulation_fan': return status.circulation_fan ?? false;
      case 'fogger': return status.fogger ?? false;
      default: return false;
    }
  }, [status]);

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
    const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger';
    sendCommand.mutate({ commandType: cmdType, commandValue: false });
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
    const cmdType = pendingDevice.device as 'fan' | 'light' | 'alarm' | 'heater' | 'circulation_fan' | 'fogger';
    sendCommand.mutate({ commandType: cmdType, commandValue: true });
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

  const handleAutomationToggle = (enabled: boolean) => {
    sendCommand.mutate({ commandType: 'manual_override', commandValue: !enabled });
    setManualOverride(!enabled);
    toast({
      title: enabled 
        ? (language === 'bn' ? '🟢 অটোমেশন চালু' : '🟢 Automation Enabled')
        : (language === 'bn' ? '🔴 অটোমেশন বন্ধ' : '🔴 Automation Disabled'),
      description: enabled
        ? (language === 'bn' ? 'সিস্টেম স্বয়ংক্রিয়ভাবে পাখির সুরক্ষা দিচ্ছে' : 'System is automatically protecting birds')
        : (language === 'bn' ? 'সতর্কতা: আপনি ম্যানুয়াল কন্ট্রোলে আছেন' : 'Warning: You are in manual control'),
    });
  };

  const hasTemporaryOverrides = Object.keys(activeTimers).length > 0;

  const safetyProtections = DEFAULT_SAFETY_PROTECTIONS.map(p => ({
    ...p,
    isActive: p.key === 'heat_stress' 
      ? sensorData.temperature > 32 
      : p.key === 'gas_purge'
        ? sensorData.ammonia > 25
        : true,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4 space-y-4">
        {/* ===== 1. STATE EXPLANATION HEADER ===== */}
        <StateExplanationHeader />

        {/* ===== 2. WHY FAN IS RUNNING ===== */}
        <WhyFanRunning />

        {/* ===== 3. LIVE ENVIRONMENT PANEL ===== */}
        <LiveEnvironmentPanel />

        {/* ===== 4. AUTOMATION DECISION LOG ===== */}
        <AutomationDecisionLog />

        {/* ===== 5. LIVE TELEMETRY ===== */}
        <DeviceLiveTelemetry />

        {/* ===== 6. SENSOR HEALTH ===== */}
        <FarmerSensorHealth />

        {/* ===== 6. MANUAL CONTROL PROTECTION ===== */}
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 text-center">
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
          />

          {/* Viewer restriction */}
          {isViewer && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-500" />
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

        {/* ===== 7. FARM SAFETY FOOTER ===== */}
        <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {language === 'bn' 
              ? '🛡️ নেট না থাকলেও খামার চলবে'
              : '🛡️ Farm will run even without internet'}
          </p>
        </div>

        {/* Auto-expire feedback */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">
              {language === 'bn' 
                ? 'সমস্ত ম্যানুয়াল অ্যাকশন স্বয়ংক্রিয়ভাবে মেয়াদ শেষ হয়'
                : 'All manual actions expire automatically'}
            </span>
          </div>
        </motion.div>
      </main>

      {/* Timer Dialog */}
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
