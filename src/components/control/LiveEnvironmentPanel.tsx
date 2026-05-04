import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useSensorValidation } from '@/hooks/useSensorValidation';
import { Card, CardContent } from '@/components/ui/card';

export function LiveEnvironmentPanel() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { issues } = useSensorValidation(sensorData);

  const issueMap = useMemo(() => new Map(issues.map((i) => [i.sensor, i])), [issues]);

  if (!hasRealData) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            📡 {language === 'bn' ? 'লাইভ পরিবেশ — সেন্সর ডেটা নেই' : 'Live environment — no sensor data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tempInterpretation = useMemo(() => {
    const t = sensorData.temperature;
    if (t > 38) return { bn: 'অতিরিক্ত গরম', en: 'Extremely hot', color: 'text-red-600 dark:text-red-400' };
    if (t > 32) return { bn: 'বেশি গরম', en: 'Too hot', color: 'text-orange-600 dark:text-orange-400' };
    if (t < 18) return { bn: 'ঠান্ডা', en: 'Cold', color: 'text-blue-600 dark:text-blue-400' };
    return { bn: 'স্বাভাবিক', en: 'Normal', color: 'text-emerald-600 dark:text-emerald-400' };
  }, [sensorData.temperature]);

  const humidityInterpretation = useMemo(() => {
    const h = sensorData.humidity;
    if (h > 85) return { bn: 'বেশি', en: 'High', color: 'text-amber-600 dark:text-amber-400' };
    if (h < 40) return { bn: 'কম', en: 'Low', color: 'text-amber-600 dark:text-amber-400' };
    return { bn: 'স্বাভাবিক', en: 'Normal', color: 'text-emerald-600 dark:text-emerald-400' };
  }, [sensorData.humidity]);

  const gasInterpretation = useMemo(() => {
    const a = sensorData.ammonia;
    if (a > 25) return { bn: 'বেশি', en: 'High', color: 'text-red-600 dark:text-red-400' };
    if (a > 15) return { bn: 'মাঝারি', en: 'Moderate', color: 'text-amber-600 dark:text-amber-400' };
    return { bn: 'কম', en: 'Low', color: 'text-emerald-600 dark:text-emerald-400' };
  }, [sensorData.ammonia]);

  const items = [
    {
      icon: Thermometer,
      label: { bn: 'তাপমাত্রা', en: 'Temperature' },
      value: `${sensorData.temperature.toFixed(1)}°C`,
      interpretation: tempInterpretation,
      sensor: 'temperature' as const,
    },
    {
      icon: Wind,
      label: { bn: 'গ্যাস', en: 'Gas' },
      value: `${sensorData.ammonia.toFixed(0)} ppm`,
      interpretation: gasInterpretation,
      sensor: 'ammonia' as const,
    },
    {
      icon: Droplets,
      label: { bn: 'আর্দ্রতা', en: 'Humidity' },
      value: `${sensorData.humidity.toFixed(0)}%`,
      interpretation: humidityInterpretation,
      sensor: 'humidity' as const,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {language === 'bn' ? 'লাইভ পরিবেশ ও সেন্সর' : 'Live Environment & Sensors'}
          </p>
          <div className="space-y-3">
            {items.map((item, i) => {
              const Icon = item.icon;
              const hasIssue = issueMap.has(item.sensor);
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.label[language]}:</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-muted/50 ${item.interpretation.color}`}>
                      {item.interpretation[language]}
                    </span>
                    {hasIssue ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
