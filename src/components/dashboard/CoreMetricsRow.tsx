import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Wind, Fan } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useAutomationMode } from '@/hooks/useAutomationMode';

export function CoreMetricsRow() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: automationMode } = useAutomationMode();
  const isManualMode = automationMode === 'MANUAL';

  // Temperature status
  const tempStatus = useMemo(() => {
    const t = sensorData.temperature;
    if (t > 38) return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-800' };
    if (t > 32) return { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800' };
    if (t < 18) return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800' };
    return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  }, [sensorData.temperature]);

  // Ventilation stage
  const ventStage = useMemo(() => {
    // Manual mode: just show ON/OFF
    if (isManualMode) {
      if (!deviceStatus.fan) {
        return { 
          stage: 0,
          label: { bn: 'বন্ধ', en: 'OFF' }, 
          desc: { bn: 'আপনি বন্ধ রেখেছেন', en: 'You kept it off' },
          color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border' 
        };
      }
      return { 
        stage: 1,
        label: { bn: 'চালু', en: 'ON' }, 
        desc: { bn: 'আপনি চালু করেছেন', en: 'You turned it on' },
        color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' 
      };
    }

    // Auto mode logic
    if (!deviceStatus.fan) {
      return { 
        stage: 0,
        label: { bn: 'বন্ধ', en: 'OFF' }, 
        desc: { bn: 'খুব কম বাতাস (শুধু শ্বাসের জন্য)', en: 'Minimal air (breathing only)' },
        color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border' 
      };
    }
    if (sensorData.temperature > 38 || sensorData.ammonia > 25) {
      return { 
        stage: 3,
        label: { bn: 'স্টেজ ৩', en: 'Stage 3' }, 
        desc: { bn: 'বেশি গরম — পূর্ণ বাতাস', en: 'Too hot — Full ventilation' },
        color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-800' 
      };
    }
    if (sensorData.temperature > 32) {
      return { 
        stage: 2,
        label: { bn: 'স্টেজ ২', en: 'Stage 2' }, 
        desc: { bn: 'ঠান্ডা করা হচ্ছে', en: 'Cooling active' },
        color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800' 
      };
    }
    return { 
      stage: 1,
      label: { bn: 'স্টেজ ১', en: 'Stage 1' }, 
      desc: { bn: 'স্বাভাবিক বাতাস', en: 'Normal airflow' },
      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' 
    };
  }, [deviceStatus.fan, sensorData.temperature, sensorData.ammonia, isManualMode]);

  // Gas status
  const gasStatus = useMemo(() => {
    const a = sensorData.ammonia;
    if (a > 25) return { label: { bn: 'বিপদ', en: 'DANGER' }, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-800' };
    if (a > 15) return { label: { bn: 'মাঝারি', en: 'MODERATE' }, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
    return { label: { bn: 'নিরাপদ', en: 'SAFE' }, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  }, [sensorData.ammonia]);

  const metrics = [
    {
      icon: Thermometer,
      label: { bn: 'ঘরের তাপমাত্রা', en: 'Temperature' },
      value: `${sensorData.temperature.toFixed(1)}°`,
      subtitle: null as string | null,
      ...tempStatus,
    },
    {
      icon: Fan,
      label: { bn: 'বাতাসের স্তর', en: 'Ventilation' },
      value: ventStage.label[language],
      subtitle: ventStage.desc[language],
      ...ventStage,
    },
    {
      icon: Wind,
      label: { bn: 'গ্যাসের অবস্থা', en: 'Gas Level' },
      value: gasStatus.label[language],
      subtitle: null as string | null,
      ...gasStatus,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-3 gap-2"
    >
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div
            key={i}
            className={`rounded-2xl border p-3 ${m.bg} ${m.border} text-center`}
          >
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <Icon className={`h-4 w-4 ${m.color}`} />
            </div>
            <p className={`text-xl font-bold ${m.color} leading-none mb-0.5`}>
              {m.value}
            </p>
            {m.subtitle && (
              <p className={`text-[9px] font-medium ${m.color} opacity-80 mb-0.5`}>
                {m.subtitle}
              </p>
            )}
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {m.label[language]}
            </p>
          </div>
        );
      })}
    </motion.div>
  );
}
