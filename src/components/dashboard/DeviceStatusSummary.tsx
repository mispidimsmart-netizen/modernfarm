import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Fan, Lightbulb, Bell, Flame, Droplets, Wind, Power,
  CircleDot, CircleOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { Skeleton } from '@/components/ui/skeleton';

interface DeviceItem {
  key: string;
  icon: React.ElementType;
  label: { bn: string; en: string };
  isOn: boolean;
}

export const DeviceStatusSummary = memo(function DeviceStatusSummary() {
  const { language } = useAuth();
  const { status, isLoading, isDeviceOnline } = useRealtimeDeviceStatus();

  const devices: DeviceItem[] = [
    { key: 'fan', icon: Fan, label: { bn: 'ফ্যান', en: 'Fan' }, isOn: status.fan },
    { key: 'heater', icon: Flame, label: { bn: 'হিটার', en: 'Heater' }, isOn: status.heater },
    { key: 'light', icon: Lightbulb, label: { bn: 'আলো', en: 'Light' }, isOn: status.light },
    { key: 'alarm', icon: Bell, label: { bn: 'অ্যালার্ম', en: 'Alarm' }, isOn: status.alarm },
    { key: 'circulation_fan', icon: Wind, label: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation' }, isOn: status.circulation_fan },
    { key: 'fogger', icon: Droplets, label: { bn: 'ফগার', en: 'Fogger' }, isOn: status.fogger },
  ];

  const title = language === 'bn' ? 'ডিভাইস অবস্থা' : 'Device Status';
  const offlineLabel = language === 'bn' ? 'অফলাইন' : 'Offline';

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card border border-border/50">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
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
                <div className="flex items-center gap-1 text-[11px] font-semibold">
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
