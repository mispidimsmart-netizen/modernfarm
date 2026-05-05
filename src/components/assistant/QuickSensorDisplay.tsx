import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';

/**
 * Animated number that counts up smoothly to the target value.
 */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [value, decimals, motionVal]);

  return <>{display}</>;
}

interface TempStatus {
  label: { bn: string; en: string };
  glow: string;
  ring: string;
  text: string;
  bgGradient: string;
}

function getTempStatus(temp: number): TempStatus {
  if (temp >= 38) return {
    label: { bn: 'অতিরিক্ত গরম', en: 'Critical Heat' },
    glow: 'shadow-[0_0_60px_-10px_rgba(239,68,68,0.55)]',
    ring: 'ring-red-500/30',
    text: 'text-red-600 dark:text-red-400',
    bgGradient: 'from-red-500/10 via-rose-500/5 to-transparent',
  };
  if (temp >= 32) return {
    label: { bn: 'গরম', en: 'Warm' },
    glow: 'shadow-[0_0_55px_-12px_rgba(249,115,22,0.45)]',
    ring: 'ring-orange-500/25',
    text: 'text-orange-600 dark:text-orange-400',
    bgGradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
  };
  if (temp >= 20) return {
    label: { bn: 'আরামদায়ক', en: 'Comfortable' },
    glow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.4)]',
    ring: 'ring-emerald-500/25',
    text: 'text-emerald-600 dark:text-emerald-400',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
  };
  return {
    label: { bn: 'ঠান্ডা', en: 'Cold' },
    glow: 'shadow-[0_0_50px_-12px_rgba(59,130,246,0.4)]',
    ring: 'ring-blue-500/25',
    text: 'text-blue-600 dark:text-blue-400',
    bgGradient: 'from-blue-500/10 via-sky-500/5 to-transparent',
  };
}

export function QuickSensorDisplay() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();

  const tempStatus = getTempStatus(sensorData.temperature);

  // Ammonia status pill
  const ammoniaPill = (() => {
    const v = sensorData.ammonia;
    if (v > 25) return { text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
    if (v > 15) return { text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
    return { text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' };
  })();

  if (!hasRealData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center"
      >
        <Thermometer className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
        <p className="text-sm font-semibold text-muted-foreground">
          {language === 'bn' ? 'সেন্সর ডেটার অপেক্ষায়...' : 'Waiting for sensor data...'}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          {language === 'bn' ? 'ESP32 কানেক্ট হলে এখানে দেখাবে' : 'Will appear once ESP32 connects'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border bg-card ring-1 ${tempStatus.ring} ${tempStatus.glow} transition-shadow`}
    >
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tempStatus.bgGradient}`}
      />

      <div className="relative flex items-stretch gap-2 p-2.5 sm:gap-3 sm:p-3.5">
        {/* HERO: Temperature */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Thermometer className={`h-3.5 w-3.5 ${tempStatus.text}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {language === 'bn' ? 'ঘরের তাপমাত্রা' : 'Temperature'}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-[36px] sm:text-[40px] lg:text-[44px] font-bold leading-none tracking-tight tabular-nums ${tempStatus.text}`}>
              <AnimatedNumber value={sensorData.temperature} decimals={1} />
            </span>
            <span className={`text-lg font-semibold ${tempStatus.text}/80`}>°C</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`h-1.5 w-1.5 rounded-full ${tempStatus.text.replace('text', 'bg')}`}
            />
            <span className={`text-[11px] font-semibold ${tempStatus.text}`}>
              {tempStatus.label[language]}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border/60 self-stretch" />

        {/* Secondary metrics stack */}
        <div className="flex flex-col justify-between gap-2 w-[112px] shrink-0">
          {/* Humidity */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
                {language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}
              </p>
              <p className="text-base font-bold tabular-nums text-foreground leading-tight">
                <AnimatedNumber value={sensorData.humidity} />
                <span className="text-xs font-semibold text-muted-foreground">%</span>
              </p>
            </div>
          </motion.div>

          {/* Ammonia */}
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Wind className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-none flex items-center gap-1">
                {language === 'bn' ? 'গ্যাস' : 'Ammonia'}
                <span className={`h-1 w-1 rounded-full ${ammoniaPill.dot}`} />
              </p>
              <p className={`text-base font-bold tabular-nums leading-tight ${ammoniaPill.text}`}>
                <AnimatedNumber value={sensorData.ammonia} />
                <span className="text-[10px] font-semibold ml-0.5">ppm</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
