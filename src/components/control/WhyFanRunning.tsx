import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Fan, Thermometer, Wind, Moon, Zap, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { Card, CardContent } from '@/components/ui/card';

interface Reason {
  icon: React.ElementType;
  text: { bn: string; en: string };
  color: string;
}

export function WhyFanRunning() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();

  const anyRelayOn = deviceStatus.fan || deviceStatus.heater || deviceStatus.fogger || deviceStatus.circulation_fan;

  const reasons = useMemo((): Reason[] => {
    const list: Reason[] = [];

    if (sensorData.temperature > 38 || sensorData.ammonia > 25) {
      list.push({
        icon: Shield,
        text: { bn: 'সেফটি মোড — প্রাণ বাঁচাতে বাতাস', en: 'Safety mode — emergency ventilation' },
        color: 'text-red-600 dark:text-red-400',
      });
    }

    if (deviceStatus.fan && sensorData.temperature > 32) {
      list.push({
        icon: Thermometer,
        text: { bn: 'তাপমাত্রা বেশি', en: 'Temperature high' },
        color: 'text-orange-600 dark:text-orange-400',
      });
    }

    if (deviceStatus.fan && sensorData.ammonia > 15) {
      list.push({
        icon: Wind,
        text: { bn: 'গ্যাস বেশি', en: 'Gas level high' },
        color: 'text-purple-600 dark:text-purple-400',
      });
    }

    const hour = new Date().getHours();
    if (deviceStatus.fan && (hour >= 22 || hour < 5) && list.length === 0) {
      list.push({
        icon: Moon,
        text: { bn: 'রাতের বাতাস', en: 'Night ventilation' },
        color: 'text-indigo-600 dark:text-indigo-400',
      });
    }

    if (list.length === 0 && deviceStatus.fan) {
      list.push({
        icon: Fan,
        text: { bn: 'তাজা বাতাস দেওয়া হচ্ছে', en: 'Fresh air circulation' },
        color: 'text-teal-600 dark:text-teal-400',
      });
    }

    return list;
  }, [sensorData, deviceStatus]);

  if (!anyRelayOn) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {language === 'bn' ? 'ফ্যান কেন চলছে?' : 'Why is the fan running?'}
          </p>
          <div className="space-y-2">
            {reasons.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 ${r.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className={`text-sm font-medium ${r.color}`}>{r.text[language]}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
