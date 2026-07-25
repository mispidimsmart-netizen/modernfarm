import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Fan, Lightbulb, Flame, Droplets, Wind, CloudRain, Power,
  CircleDot, CircleOff, RotateCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useDeviceStatus } from '@/hooks/useFarmData';
import { useSelectedShed } from '@/hooks/useSheds';
import { Skeleton } from '@/components/ui/skeleton';

interface DeviceItem {
  key: string;
  icon: React.ElementType;
  label: { bn: string; en: string };
  description: { bn: string; en: string };
  isOn: boolean;
}

export const DeviceStatusSummary = memo(function DeviceStatusSummary() {
  const { language } = useAuth();
  // Match ControlPage: scope to the currently selected shed so the summary
  // reflects the exact same device_status row the control page reads from.
  const { selectedShedId } = useSelectedShed();
  const { isLoading, isDeviceOnline } = useRealtimeDeviceStatus();
  const { data: rawDeviceStatus } = useDeviceStatus(selectedShedId);

  // ACTUAL hardware columns (what ESP32 reports the relay is doing right now).
  // Hardware-as-Source-of-Truth: we deliberately ignore desired_* here so the
  // summary shows the *real* on/off state of each relay, not the pending
  // command. When offline we fall back to false (cannot trust stale flags).
  const r = (rawDeviceStatus ?? {}) as Record<string, unknown>;
  const actual = (col: string) => isDeviceOnline && !!r[col];

  const devices: DeviceItem[] = [
    {
      key: 'fan',
      icon: Fan,
      label: { bn: 'এক্সহস্ট ফ্যান', en: 'Exhaust Fan' },
      description: { bn: 'অটোমেশন ও অভ্যন্তরীণ বায়ু চলাচল', en: 'Automation & ventilation' },
      isOn: actual('fan_on'),
    },
    {
      key: 'ceiling_fan',
      icon: Wind,
      label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
      description: { bn: 'তাপমাত্রা বেশি হলে বাড়তি বায়ু প্রবাহ', en: 'Extra airflow when hot' },
      isOn: actual('ceiling_fan_on'),
    },
    {
      key: 'circulation_fan',
      icon: RotateCw,
      label: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
      description: { bn: 'অভ্যন্তরীণ বায়ু সঞ্চালন', en: 'Internal air circulation' },
      isOn: actual('circulation_fan_on'),
    },
    {
      key: 'heater',
      icon: Flame,
      label: { bn: 'হিটার', en: 'Heater' },
      description: { bn: 'শীতে তাপ দেয়', en: 'Provides heat in cold' },
      isOn: actual('heater_on'),
    },
    {
      key: 'fogger',
      icon: Droplets,
      label: { bn: 'ফগার', en: 'Fogger' },
      description: { bn: 'পরিবেশ ঠাণ্ডা রাখে', en: 'Keeps environment cool' },
      isOn: actual('fogger_on'),
    },
    {
      key: 'sprinkler',
      icon: CloudRain,
      label: { bn: 'ছাদ স্প্রিংকলার', en: 'Ceiling Sprinkler' },
      description: { bn: 'HSI নিয়ন্ত্রিত স্প্রিংকলার', en: 'HSI-controlled sprinkler' },
      isOn: actual('sprinkler_on'),
    },
    {
      key: 'light',
      icon: Lightbulb,
      label: { bn: 'লাইট', en: 'Light' },
      description: { bn: 'তীব্র উপশমে সহায়ক', en: 'Aids intense relief' },
      isOn: actual('light_on'),
    },
  ];

  const title = language === 'bn' ? 'ডিভাইস অবস্থা' : 'Device Status';
  const offlineLabel = language === 'bn' ? 'অফলাইন' : 'Offline';

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card border border-border/50">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-4 shadow-card border border-border/50"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Power className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {!isDeviceOnline && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {offlineLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {devices.map((device, idx) => {
          const Icon = device.icon;
          const isOn = isDeviceOnline && device.isOn;
          const dim = !isDeviceOnline;
          return (
            <motion.div
              key={device.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                isOn
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-muted/40 border-border/50'
              } ${dim ? 'opacity-70' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isOn ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {device.label[language]}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {device.description[language]}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
                  {isOn ? (
                    <>
                      <CircleDot className="h-2.5 w-2.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {language === 'bn' ? 'চালু' : 'ON'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CircleOff className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {dim
                          ? (language === 'bn' ? '—' : '—')
                          : (language === 'bn' ? 'বন্ধ' : 'OFF')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});
