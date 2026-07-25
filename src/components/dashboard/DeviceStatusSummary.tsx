import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Fan, Lightbulb, Flame, Droplets, Wind, CloudRain, Power,
  CircleDot, CircleOff, RotateCw, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useDeviceStatus } from '@/hooks/useFarmData';
import { useSelectedShed } from '@/hooks/useSheds';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface DeviceItem {
  key: string;
  icon: React.ElementType;
  label: { bn: string; en: string };
  description: { bn: string; en: string };
  isOn: boolean;
  /** Soft device-specific tint used when the relay is OFF (ON always uses status-normal). */
  tint: { bg: string; text: string; border: string; iconBg: string };
}

function formatTimeAgo(date: Date | null, language: 'bn' | 'en'): string {
  if (!date) return language === 'bn' ? 'অজানা' : 'Unknown';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return language === 'bn' ? 'এইমাত্র' : 'Just now';
  if (seconds < 60) return language === 'bn' ? `${seconds} সেকেন্ড আগে` : `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return language === 'bn' ? `${minutes} মিনিট আগে` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return language === 'bn' ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
}

export const DeviceStatusSummary = memo(function DeviceStatusSummary() {
  const { language } = useAuth();
  // Match ControlPage: scope to the currently selected shed so the summary
  // reflects the exact same device_status row the control page reads from.
  const { selectedShedId } = useSelectedShed();
  const { isLoading, isDeviceOnline, lastAckAt, refreshDeviceStatus } = useRealtimeDeviceStatus();
  const { data: rawDeviceStatus } = useDeviceStatus(selectedShedId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshDeviceStatus();
    // Keep spinner visible briefly so the user perceives the action.
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshDeviceStatus]);

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
      tint: { bg: 'bg-primary/10', text: 'text-primary/80', border: 'border-primary/20', iconBg: 'bg-primary/15' },
    },
    {
      key: 'ceiling_fan',
      icon: Wind,
      label: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
      description: { bn: 'তাপমাত্রা বেশি হলে বাড়তি বায়ু প্রবাহ', en: 'Extra airflow when hot' },
      isOn: actual('ceiling_fan_on'),
      tint: { bg: 'bg-secondary/10', text: 'text-secondary/80', border: 'border-secondary/20', iconBg: 'bg-secondary/15' },
    },
    {
      key: 'circulation_fan',
      icon: RotateCw,
      label: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
      description: { bn: 'অভ্যন্তরীণ বায়ু সঞ্চালন', en: 'Internal air circulation' },
      isOn: actual('circulation_fan_on'),
      tint: { bg: 'bg-accent/50', text: 'text-accent-foreground/80', border: 'border-accent/30', iconBg: 'bg-accent/60' },
    },
    {
      key: 'heater',
      icon: Flame,
      label: { bn: 'হিটার', en: 'Heater' },
      description: { bn: 'শীতে তাপ দেয়', en: 'Provides heat in cold' },
      isOn: actual('heater_on'),
      tint: { bg: 'bg-status-warning/10', text: 'text-status-warning/80', border: 'border-status-warning/20', iconBg: 'bg-status-warning/15' },
    },
    {
      key: 'fogger',
      icon: Droplets,
      label: { bn: 'ফগার', en: 'Fogger' },
      description: { bn: 'পরিবেশ ঠাণ্ডা রাখে', en: 'Keeps environment cool' },
      isOn: actual('fogger_on'),
      tint: { bg: 'bg-sensor-water/10', text: 'text-sensor-water/80', border: 'border-sensor-water/20', iconBg: 'bg-sensor-water/15' },
    },
    {
      key: 'sprinkler',
      icon: CloudRain,
      label: { bn: 'ছাদ স্প্রিংকলার', en: 'Ceiling Sprinkler' },
      description: { bn: 'HSI নিয়ন্ত্রিত স্প্রিংকলার', en: 'HSI-controlled sprinkler' },
      isOn: actual('sprinkler_on'),
      tint: { bg: 'bg-sensor-humidity/10', text: 'text-sensor-humidity/80', border: 'border-sensor-humidity/20', iconBg: 'bg-sensor-humidity/15' },
    },
    {
      key: 'light',
      icon: Lightbulb,
      label: { bn: 'লাইট', en: 'Light' },
      description: { bn: 'তীব্র উপশমে সহায়ক', en: 'Aids intense relief' },
      isOn: actual('light_on'),
      tint: { bg: 'bg-muted/40', text: 'text-muted-foreground/90', border: 'border-muted/30', iconBg: 'bg-muted/50' },
    },
  ];

  const title = language === 'bn' ? 'ডিভাইস অবস্থা' : 'Device Status';
  const offlineLabel = language === 'bn' ? 'অফলাইন' : 'Offline';
  const liveLabel = language === 'bn' ? 'লাইভ' : 'Live';
  const lastUpdatedLabel = language === 'bn' ? 'সর্বশেষ আপডেট' : 'Last updated';

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card border border-border/50">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
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
        <div className="flex items-center gap-2">
          {isDeviceOnline ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              {liveLabel}
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {offlineLabel}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
            title={language === 'bn' ? 'ডিভাইস ডেটা রিফ্রেশ করুন' : 'Refresh device data'}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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
                  ? 'bg-status-normal border-status-normal shadow-sm'
                  : `${device.tint.bg} ${device.tint.border}`
              } ${dim ? 'opacity-70' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isOn ? 'bg-primary-foreground/20 text-primary-foreground' : `${device.tint.iconBg} ${device.tint.text}`
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${isOn ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {device.label[language]}
                </p>
                <p className={`text-[10px] truncate leading-tight ${isOn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {device.description[language]}
                </p>
                <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
                  {isOn ? (
                    <>
                      <CircleDot className="h-2.5 w-2.5 text-primary-foreground" />
                      <span className="text-primary-foreground">
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

      <div className="flex items-center justify-end mt-2.5">
        <p className="text-[10px] text-muted-foreground">
          {lastUpdatedLabel}: {formatTimeAgo(lastAckAt, language)}
        </p>
      </div>
    </motion.div>
  );
});
