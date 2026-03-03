import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wind, Flame, Fan, Zap, ShieldCheck, Moon, Droplets, ArrowUpFromDot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { Card, CardContent } from '@/components/ui/card';

interface ActionInfo {
  icon: React.ElementType;
  text: { bn: string; en: string };
  color: string;
  iconColor: string;
}

export function CurrentActionPanel() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();

  const currentAction = useMemo((): ActionInfo => {
    // Emergency / high heat
    if (sensorData.temperature > 38 || sensorData.ammonia > 25) {
      return {
        icon: Wind,
        text: { bn: 'প্রাণ বাঁচাতে সর্বোচ্চ বাতাস দেওয়া হচ্ছে', en: 'Maximum ventilation for bird safety' },
        color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
        iconColor: 'text-red-600 dark:text-red-400',
      };
    }

    // Sprinkler on (HSI-based emergency cooling)
    if (deviceStatus.sprinkler) {
      return {
        icon: ArrowUpFromDot,
        text: { bn: 'ছাদে পানি দিয়ে তাপ কমানো হচ্ছে', en: 'Roof sprinkler cooling active' },
        color: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
        iconColor: 'text-sky-600 dark:text-sky-400',
      };
    }

    // Heater on
    if (deviceStatus.heater) {
      return {
        icon: Flame,
        text: { bn: 'তাপমাত্রা বাড়ানো হচ্ছে', en: 'Heating in progress' },
        color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
        iconColor: 'text-orange-600 dark:text-orange-400',
      };
    }

    // Fan on with ammonia
    if (deviceStatus.fan && sensorData.ammonia > 15) {
      return {
        icon: Wind,
        text: { bn: 'গ্যাস বের করা হচ্ছে', en: 'Exhausting gas' },
        color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
        iconColor: 'text-purple-600 dark:text-purple-400',
      };
    }

    // Fan on with high temp
    if (deviceStatus.fan && sensorData.temperature > 32) {
      return {
        icon: Wind,
        text: { bn: 'গরম কমানো হচ্ছে', en: 'Reducing heat' },
        color: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
      };
    }

    // Ceiling fan on
    if (deviceStatus.ceilingFan) {
      return {
        icon: Fan,
        text: { bn: 'সিলিং ফ্যানে বাতাস চলছে', en: 'Ceiling fan air circulation' },
        color: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
        iconColor: 'text-violet-600 dark:text-violet-400',
      };
    }

    // Fan on (general ventilation)
    if (deviceStatus.fan) {
      return {
        icon: Fan,
        text: { bn: 'তাজা বাতাস দেওয়া হচ্ছে', en: 'Fresh air circulation' },
        color: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
        iconColor: 'text-teal-600 dark:text-teal-400',
      };
    }

    // Night
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      return {
        icon: Moon,
        text: { bn: 'রাত্রি বিশ্রাম — খামার নিরাপদ', en: 'Night rest — Farm is safe' },
        color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
      };
    }

    // All good
    return {
      icon: ShieldCheck,
      text: { bn: 'সবকিছু স্বাভাবিক — কোন কাজ চলছে না', en: 'All normal — No action needed' },
      color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    };
  }, [sensorData, deviceStatus]);

  const Icon = currentAction.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className={`border ${currentAction.color} shadow-sm`}>
        <CardContent className="pt-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {language === 'bn' ? 'বর্তমান কাজ' : 'Current Action'}
          </p>
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-black/20 shadow-sm ${currentAction.iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <p className={`text-base font-semibold ${currentAction.iconColor}`}>
              {currentAction.text[language]}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
