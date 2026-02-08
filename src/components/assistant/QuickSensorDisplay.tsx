import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';

export function QuickSensorDisplay() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();

  // Determine ammonia status
  const getAmmoniaStatus = (value: number) => {
    if (value > 25) return { 
      label: { bn: '🔴 খারাপ', en: '🔴 BAD' }, 
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-800'
    };
    if (value > 15) return { 
      label: { bn: '🟡 মাঝারি', en: '🟡 MODERATE' }, 
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-800'
    };
    return { 
      label: { bn: '✅ নিরাপদ', en: '✅ SAFE' }, 
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-800'
    };
  };

  const ammoniaStatus = getAmmoniaStatus(sensorData.ammonia);

  const sensors = [
    {
      icon: Thermometer,
      label: { bn: 'তাপমাত্রা', en: 'Temperature' },
      value: `${sensorData.temperature.toFixed(1)}°C`,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      border: 'border-orange-200 dark:border-orange-800',
    },
    {
      icon: Droplets,
      label: { bn: 'আর্দ্রতা', en: 'Humidity' },
      value: `${sensorData.humidity.toFixed(0)}%`,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200 dark:border-blue-800',
    },
    {
      icon: Wind,
      label: { bn: 'অ্যামোনিয়া', en: 'Ammonia' },
      value: `${sensorData.ammonia.toFixed(0)} ppm`,
      subValue: ammoniaStatus.label[language],
      color: ammoniaStatus.color,
      bg: ammoniaStatus.bg,
      border: ammoniaStatus.border,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {sensors.map((sensor, index) => {
        const Icon = sensor.icon;
        return (
          <motion.div
            key={sensor.label.en}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-xl p-3 border ${sensor.bg} ${sensor.border}`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className={`h-4 w-4 ${sensor.color}`} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                {sensor.label[language]}
              </span>
            </div>
            <p className={`text-lg font-bold ${sensor.color}`}>
              {sensor.value}
            </p>
            {sensor.subValue && (
              <p className={`text-[10px] font-medium ${sensor.color}`}>
                {sensor.subValue}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
