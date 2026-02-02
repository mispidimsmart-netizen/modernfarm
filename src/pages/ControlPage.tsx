import { motion } from 'framer-motion';
import { Fan, Lightbulb, Bell, RefreshCcw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { translations } from '@/lib/translations';
import { ControlButton } from '@/components/ControlButton';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';

export function ControlPage() {
  const { 
    language, 
    deviceStatus, 
    setDeviceStatus, 
    manualOverride, 
    setManualOverride 
  } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">{translations.controls.title[language]}</h2>

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
              onCheckedChange={setManualOverride}
            />
          </div>

          {/* Control Buttons Grid */}
          <div className="grid grid-cols-2 gap-4">
            <ControlButton
              icon={Fan}
              label={translations.sensors.fan[language]}
              isOn={deviceStatus.fan}
              onToggle={() => setDeviceStatus({ fan: !deviceStatus.fan })}
              disabled={!manualOverride}
            />
            <ControlButton
              icon={Lightbulb}
              label={translations.sensors.light[language]}
              isOn={deviceStatus.light}
              onToggle={() => setDeviceStatus({ light: !deviceStatus.light })}
              disabled={!manualOverride}
            />
            <ControlButton
              icon={Bell}
              label={translations.sensors.alarm[language]}
              isOn={deviceStatus.alarm}
              onToggle={() => setDeviceStatus({ alarm: !deviceStatus.alarm })}
              disabled={!manualOverride}
            />
          </div>

          {!manualOverride && (
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
