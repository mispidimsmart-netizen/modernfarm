import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Fan, 
  Lightbulb, 
  Bell, 
  Flame, 
  Wind, 
  Droplets,
  ShieldAlert,
  Timer,
  Thermometer,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useUserRole } from '@/hooks/useUserRole';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
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

// Device definitions with descriptions
const DEVICES = [
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
    description: { bn: 'পাখির শরীরের তাপমাত্রা বজায় রাখে', en: 'Maintains bird body temperature' },
  },
  {
    key: 'fogger',
    icon: Droplets,
    name: { bn: 'ফগার', en: 'Fogger' },
    description: { bn: 'গরমে হিট স্ট্রেস কমায়', en: 'Reduces heat stress in hot weather' },
  },
  {
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'দৈনিক আলোক সময়সূচী নিয়ন্ত্রণ', en: 'Controls daily lighting schedule' },
  },
];

export function ControlPage() {
  const { language } = useAuth();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl();
  const sendCommand = useSendDeviceCommand();
  const { data: userRole } = useUserRole();
  const { sensorData } = useRealtimeSensorData();
  const isOwner = userRole?.role === 'owner';
  const { toast } = useToast();

  // Timer state for manual control
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<{
    device: string;
    icon: React.ReactNode;
    name: string;
  } | null>(null);
  const [activeTimers, setActiveTimers] = useState<Record<string, { endTime: number; duration: number }>>({});

  // Check and clear expired timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveTimers(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.entries(updated).forEach(([deviceKey, timer]) => {
          if (timer.endTime <= now) {
            // Timer expired - turn off device and return to auto mode
            const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater';
            if (['fan', 'light', 'alarm', 'heater'].includes(deviceKey)) {
              sendCommand.mutate({ commandType: cmdType, commandValue: false });
              setDeviceStatus({ [deviceKey]: false });
            }
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

  // Get remaining time for a device timer
  const getRemainingTime = useCallback((device: string) => {
    const timer = activeTimers[device];
    if (!timer) return null;
    
    const remaining = Math.max(0, timer.endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [activeTimers]);

  // Get device mode
  const getDeviceMode = useCallback((deviceKey: string): DeviceMode => {
    if (activeTimers[deviceKey]) return 'temporary';
    return 'auto';
  }, [activeTimers]);

  // Check if device is active
  const isDeviceActive = useCallback((deviceKey: string) => {
    switch (deviceKey) {
      case 'fan': return status.fan;
      case 'light': return status.light;
      case 'heater': return status.heater ?? false;
      case 'circulation_fan': return false; // Add to status if needed
      case 'fogger': return false; // Add to status if needed
      default: return false;
    }
  }, [status]);

  // Handle run temporarily
  const handleRunTemporarily = (deviceKey: string, deviceName: { bn: string; en: string }, icon: React.ElementType) => {
    const IconComponent = icon;
    setPendingDevice({
      device: deviceKey,
      icon: <IconComponent className="h-6 w-6" />,
      name: deviceName[language],
    });
    setTimerDialogOpen(true);
  };

  // Handle stop
  const handleStop = (deviceKey: string) => {
    const cmdType = deviceKey as 'fan' | 'light' | 'alarm' | 'heater';
    if (['fan', 'light', 'alarm', 'heater'].includes(deviceKey)) {
      sendCommand.mutate({ commandType: cmdType, commandValue: false });
      setDeviceStatus({ [deviceKey]: false });
    }
    
    // Clear timer
    setActiveTimers(prev => {
      const updated = { ...prev };
      delete updated[deviceKey];
      return updated;
    });

    toast({
      title: language === 'bn' ? '✅ বন্ধ হয়েছে' : '✅ Stopped',
      description: language === 'bn' 
        ? 'ডিভাইস অটো মোডে ফিরে গেছে' 
        : 'Device returned to AUTO mode',
    });
  };

  // Handle timer confirmation
  const handleTimerConfirm = (durationMinutes: number) => {
    if (!pendingDevice) return;
    
    const cmdType = pendingDevice.device as 'fan' | 'light' | 'alarm' | 'heater';
    if (['fan', 'light', 'alarm', 'heater'].includes(pendingDevice.device)) {
      sendCommand.mutate({ commandType: cmdType, commandValue: true });
      setDeviceStatus({ [pendingDevice.device]: true });
    }
    
    // Set timer
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

  // Handle automation toggle
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

  // Dynamic safety protections based on sensor data
  const safetyProtections = DEFAULT_SAFETY_PROTECTIONS.map(p => ({
    ...p,
    isActive: p.key === 'heat_stress' 
      ? sensorData.temperature > 32 
      : p.key === 'gas_purge'
        ? sensorData.ammonia > 25
        : true, // min_ventilation always active
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4 space-y-4">
        {/* SECTION 1: Automation Master Status */}
        <AutomationStatusBanner
          automationEnabled={!manualOverride}
          hasTemporaryOverrides={hasTemporaryOverrides}
          onToggleAutomation={handleAutomationToggle}
        />

        {/* Worker restriction notice */}
        {!isOwner && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">
                    {language === 'bn' ? 'শুধুমাত্র দেখার অনুমতি' : 'View Only Access'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' 
                      ? 'আপনি কর্মী হিসেবে ডিভাইস নিয়ন্ত্রণ করতে পারবেন না'
                      : 'As a worker, you cannot control devices'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 4: Safety Locked Devices */}
        <SafetyLockedDevices protections={safetyProtections} />

        {/* Active Timers Summary */}
        {hasTemporaryOverrides && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
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

        {/* SECTION 2 & 3: Device Control Cards */}
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
              disabled={!isOwner || sendCommand.isPending}
            />
          ))}
        </div>

        {/* Success feedback area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
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
