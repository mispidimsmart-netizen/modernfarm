import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Fan, Lightbulb, Bell, RefreshCcw, ShieldAlert, Flame, Zap, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeviceControl } from '@/hooks/useSensorData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useUserRole } from '@/hooks/useUserRole';
import { translations } from '@/lib/translations';
import { ControlButton } from '@/components/ControlButton';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ManualControlTimerDialog } from '@/components/assistant/ManualControlTimerDialog';
import { useToast } from '@/hooks/use-toast';

export function ControlPage() {
  const { language } = useAuth();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl();
  const sendCommand = useSendDeviceCommand();
  const { data: userRole } = useUserRole();
  const isOwner = userRole?.role === 'owner';
  const { toast } = useToast();

  // Timer state for manual control
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [pendingDevice, setPendingDevice] = useState<{
    device: 'fan' | 'light' | 'alarm' | 'heater';
    currentState: boolean;
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
            sendCommand.mutate({ commandType: cmdType, commandValue: false });
            setDeviceStatus({ [deviceKey]: false });
            delete updated[deviceKey];
            hasChanges = true;
            
            toast({
              title: language === 'bn' ? '⏰ টাইমার শেষ' : '⏰ Timer Expired',
              description: language === 'bn' 
                ? `${deviceKey} বন্ধ হয়ে অটো মোডে ফিরে গেছে` 
                : `${deviceKey} turned off, back to AUTO mode`,
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

  // Handle toggle with timer prompt
  const handleToggle = (device: 'fan' | 'light' | 'alarm' | 'heater', currentState: boolean) => {
    if (!currentState) {
      // Turning ON - show timer dialog
      const deviceNames = {
        fan: language === 'bn' ? 'ফ্যান' : 'Fan',
        light: language === 'bn' ? 'লাইট' : 'Light',
        alarm: language === 'bn' ? 'অ্যালার্ম' : 'Alarm',
        heater: language === 'bn' ? 'হিটার' : 'Heater',
      };
      const icons = {
        fan: <Fan className="h-6 w-6" />,
        light: <Lightbulb className="h-6 w-6" />,
        alarm: <Bell className="h-6 w-6" />,
        heater: <Flame className="h-6 w-6" />,
      };
      
      setPendingDevice({
        device,
        currentState,
        icon: icons[device],
        name: deviceNames[device],
      });
      setTimerDialogOpen(true);
    } else {
      // Turning OFF - immediate action
      sendCommand.mutate({ commandType: device, commandValue: false });
      setDeviceStatus({ [device]: false });
      
      // Clear any active timer
      setActiveTimers(prev => {
        const updated = { ...prev };
        delete updated[device];
        return updated;
      });
    }
  };

  // Handle timer confirmation
  const handleTimerConfirm = (durationMinutes: number) => {
    if (!pendingDevice) return;
    
    // Turn on the device
    sendCommand.mutate({ commandType: pendingDevice.device, commandValue: true });
    setDeviceStatus({ [pendingDevice.device]: true });
    
    // Set timer
    setActiveTimers(prev => ({
      ...prev,
      [pendingDevice.device]: {
        endTime: Date.now() + durationMinutes * 60000,
        duration: durationMinutes,
      },
    }));
    
    toast({
      title: language === 'bn' ? '✅ টাইমার সেট হয়েছে' : '✅ Timer Set',
      description: language === 'bn' 
        ? `${pendingDevice.name} ${durationMinutes} মিনিট চলবে` 
        : `${pendingDevice.name} will run for ${durationMinutes} minutes`,
    });
    
    setPendingDevice(null);
  };

  // Handle timer cancel
  const handleTimerCancel = () => {
    setPendingDevice(null);
  };

  const handleManualOverrideToggle = (checked: boolean) => {
    sendCommand.mutate({ commandType: 'manual_override', commandValue: checked });
    setManualOverride(checked);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">{translations.controls.title[language]}</h2>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3 text-green-500" />
              {language === 'bn' ? 'রিয়েল-টাইম' : 'Real-time'}
            </Badge>
          </div>

          {/* Worker restriction notice */}
          {!isOwner && (
            <Card className="mb-6 border-status-warning/30 bg-status-warning/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-status-warning" />
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

          {/* Real-time info card */}
          <Card className="mb-4 border-green-500/30 bg-green-500/5">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">
                {language === 'bn' 
                  ? '⚡ কমান্ড পাঠানোর সাথে সাথে ESP32 ৫ সেকেন্ডের মধ্যে রিলে চালু/বন্ধ করবে'
                  : '⚡ Commands will reach ESP32 within 5 seconds for instant relay control'}
              </p>
            </CardContent>
          </Card>

          {/* Manual Override Toggle */}
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                manualOverride ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                <RefreshCcw size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {translations.controls.manualOverride[language]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {manualOverride 
                    ? translations.controls.overrideActive[language]
                    : translations.controls.autoMode[language]
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={manualOverride}
              onCheckedChange={handleManualOverrideToggle}
              disabled={!isOwner || sendCommand.isPending}
            />
          </div>

          {/* Control Buttons Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { device: 'fan' as const, icon: Fan, label: translations.sensors.fan[language] },
              { device: 'light' as const, icon: Lightbulb, label: translations.sensors.light[language] },
              { device: 'alarm' as const, icon: Bell, label: translations.sensors.alarm[language] },
              { device: 'heater' as const, icon: Flame, label: language === 'bn' ? 'হিটার' : 'Heater' },
            ].map(({ device, icon: Icon, label }) => {
              const remainingTime = getRemainingTime(device);
              const isActive = status[device];
              
              return (
                <div key={device} className="relative">
                  <ControlButton
                    icon={Icon}
                    label={label}
                    isOn={isActive}
                    onToggle={() => handleToggle(device, isActive)}
                    disabled={!manualOverride || !isOwner || sendCommand.isPending}
                  />
                  {/* Timer badge */}
                  {remainingTime && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-lg"
                    >
                      <Timer className="h-3 w-3" />
                      {remainingTime}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {!manualOverride && isOwner && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center text-sm text-muted-foreground"
            >
              {language === 'bn' 
                ? 'ম্যানুয়াল কন্ট্রোল ব্যবহার করতে উপরে ম্যানুয়াল ওভাররাইড চালু করুন'
                : 'Enable Manual Override above to use manual controls'}
            </motion.p>
          )}

          {/* Active Timers Info */}
          {Object.keys(activeTimers).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {language === 'bn' 
                        ? `${Object.keys(activeTimers).length}টি ডিভাইসে টাইমার সক্রিয়` 
                        : `${Object.keys(activeTimers).length} device(s) with active timer`}
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
        </motion.div>
      </main>

      {/* Timer Dialog */}
      <ManualControlTimerDialog
        open={timerDialogOpen}
        onOpenChange={setTimerDialogOpen}
        deviceName={pendingDevice?.name || ''}
        deviceIcon={pendingDevice?.icon || null}
        onConfirm={handleTimerConfirm}
        onCancel={handleTimerCancel}
      />

      <BottomNav />
    </div>
  );
}
