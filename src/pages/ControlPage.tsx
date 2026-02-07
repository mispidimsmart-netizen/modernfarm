import { motion } from 'framer-motion';
import { Fan, Lightbulb, Bell, RefreshCcw, ShieldAlert, Flame, Zap } from 'lucide-react';
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

export function ControlPage() {
  const { language } = useAuth();
  const { status, manualOverride, setDeviceStatus, setManualOverride } = useDeviceControl();
  const sendCommand = useSendDeviceCommand();
  const { data: userRole } = useUserRole();
  const isOwner = userRole?.role === 'owner';

  // Use command system for instant control
  const handleToggle = (device: 'fan' | 'light' | 'alarm' | 'heater', currentState: boolean) => {
    // Send command for instant ESP32 response (5 sec polling)
    sendCommand.mutate({ commandType: device, commandValue: !currentState });
    // Also update local state for immediate UI feedback
    setDeviceStatus({ [device]: !currentState });
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
            <ControlButton
              icon={Fan}
              label={translations.sensors.fan[language]}
              isOn={status.fan}
              onToggle={() => handleToggle('fan', status.fan)}
              disabled={!manualOverride || !isOwner || sendCommand.isPending}
            />
            <ControlButton
              icon={Lightbulb}
              label={translations.sensors.light[language]}
              isOn={status.light}
              onToggle={() => handleToggle('light', status.light)}
              disabled={!manualOverride || !isOwner || sendCommand.isPending}
            />
            <ControlButton
              icon={Bell}
              label={translations.sensors.alarm[language]}
              isOn={status.alarm}
              onToggle={() => handleToggle('alarm', status.alarm)}
              disabled={!manualOverride || !isOwner || sendCommand.isPending}
            />
            <ControlButton
              icon={Flame}
              label={language === 'bn' ? 'হিটার' : 'Heater'}
              isOn={status.heater}
              onToggle={() => handleToggle('heater', status.heater)}
              disabled={!manualOverride || !isOwner || sendCommand.isPending}
            />
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
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
