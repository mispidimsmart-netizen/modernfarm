import { motion } from 'framer-motion';
import { Thermometer, Droplets, AlertTriangle, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { HeatStressResult } from '@/lib/heatStressIndex';

interface HeatStressStatusCardProps {
  hsiResult: HeatStressResult | null;
  temperature: number;
  humidity: number;
}

export function HeatStressStatusCard({ hsiResult, temperature, humidity }: HeatStressStatusCardProps) {
  const { language } = useAuth();
  const { hasRealData } = useRealtimeSensorData();

  if (!hasRealData) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-4 text-center">
        <Flame className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
        <p className="text-sm font-medium text-muted-foreground">
          {language === 'bn' ? 'হিট স্ট্রেস — সেন্সর ডেটা নেই' : 'Heat Stress — No sensor data'}
        </p>
      </div>
    );
  }

  const getStatusConfig = (level: string | undefined) => {
    switch (level) {
      case 'normal':
        return {
          gradient: 'from-emerald-500 to-green-600',
          bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-green-500/10 dark:from-emerald-950/50 dark:via-emerald-900/30 dark:to-green-950/50',
          borderColor: 'border-emerald-500/30',
          glowColor: 'shadow-emerald-500/20',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          label: { bn: 'স্বাভাবিক', en: 'Normal' },
          icon: '✅',
        };
      case 'mild':
        return {
          gradient: 'from-yellow-500 to-amber-600',
          bgGradient: 'from-yellow-500/10 via-yellow-500/5 to-amber-500/10 dark:from-yellow-950/50 dark:via-yellow-900/30 dark:to-amber-950/50',
          borderColor: 'border-yellow-500/30',
          glowColor: 'shadow-yellow-500/20',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          label: { bn: 'হালকা চাপ', en: 'Mild Stress' },
          icon: '🟡',
        };
      case 'moderate':
        return {
          gradient: 'from-orange-500 to-amber-600',
          bgGradient: 'from-orange-500/10 via-orange-500/5 to-amber-500/10 dark:from-orange-950/50 dark:via-orange-900/30 dark:to-amber-950/50',
          borderColor: 'border-orange-500/30',
          glowColor: 'shadow-orange-500/20',
          textColor: 'text-orange-600 dark:text-orange-400',
          label: { bn: 'মাঝারি চাপ', en: 'Moderate' },
          icon: '🟠',
        };
      case 'severe':
        return {
          gradient: 'from-red-500 to-rose-600',
          bgGradient: 'from-red-500/10 via-red-500/5 to-rose-500/10 dark:from-red-950/50 dark:via-red-900/30 dark:to-rose-950/50',
          borderColor: 'border-red-500/30',
          glowColor: 'shadow-red-500/30',
          textColor: 'text-red-600 dark:text-red-400',
          label: { bn: 'তীব্র চাপ', en: 'Severe' },
          icon: '🔴',
        };
      case 'emergency':
        return {
          gradient: 'from-red-600 to-pink-700',
          bgGradient: 'from-red-600/15 via-red-500/10 to-pink-600/15 dark:from-red-950/60 dark:via-red-900/40 dark:to-pink-950/60',
          borderColor: 'border-red-500/50',
          glowColor: 'shadow-red-500/40',
          textColor: 'text-red-700 dark:text-red-400',
          label: { bn: 'জরুরি!', en: 'DANGER!' },
          icon: '🚨',
        };
      default:
        return {
          gradient: 'from-gray-500 to-slate-600',
          bgGradient: 'from-gray-500/10 to-slate-500/10',
          borderColor: 'border-border',
          glowColor: '',
          textColor: 'text-muted-foreground',
          label: { bn: 'লোড হচ্ছে...', en: 'Loading...' },
          icon: '⏳',
        };
    }
  };

  const status = getStatusConfig(hsiResult?.level);
  const hsi = hsiResult?.index ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl p-4 shadow-lg ${status.glowColor} bg-gradient-to-br ${status.bgGradient} border ${status.borderColor}`}
    >
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${status.gradient} opacity-20 blur-xl`} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${status.gradient} flex items-center justify-center shadow-lg ${status.glowColor}`}>
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {language === 'bn' ? 'হিট স্ট্রেস' : 'Heat Stress'}
              </h3>
              <p className={`text-xs font-bold ${status.textColor}`}>
                {status.label[language]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-black ${status.textColor}`}>
              {hsi.toFixed(0)}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">HSI</p>
          </div>
        </div>

        {/* Current Values */}
        <div className="flex items-center gap-3 text-xs mb-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 backdrop-blur-sm">
            <Thermometer className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold">{temperature.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 backdrop-blur-sm">
            <Droplets className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold">{humidity.toFixed(0)}%</span>
          </div>
          {hsiResult?.shouldAlert && (
            <div className="flex items-center gap-1 ml-auto px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              <span className="text-red-500 font-bold text-[10px]">
                {language === 'bn' ? 'সতর্ক' : 'Alert'}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-2.5 bg-background/50 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((hsi / 100) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${status.gradient} rounded-full shadow-lg`}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[8px] text-muted-foreground font-medium">
            <span>0</span>
            <span className="text-yellow-500">70</span>
            <span className="text-orange-500">80</span>
            <span className="text-red-500">85</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
