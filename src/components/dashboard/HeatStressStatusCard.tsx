import { motion } from 'framer-motion';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HeatStressResult } from '@/lib/heatStressIndex';

interface HeatStressStatusCardProps {
  hsiResult: HeatStressResult | null;
  temperature: number;
  humidity: number;
}

export function HeatStressStatusCard({ hsiResult, temperature, humidity }: HeatStressStatusCardProps) {
  const { language } = useAuth();

  const getStatusConfig = (level: string | undefined) => {
    switch (level) {
      case 'normal':
        return {
          color: 'bg-status-normal',
          textColor: 'text-status-normal',
          bgColor: 'bg-status-normal/10',
          label: { bn: 'স্বাভাবিক', en: 'Normal' },
          icon: '🟢',
        };
      case 'mild':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          bgColor: 'bg-yellow-500/10',
          label: { bn: 'হালকা চাপ', en: 'Mild Stress' },
          icon: '🟡',
        };
      case 'moderate':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-600',
          bgColor: 'bg-orange-500/10',
          label: { bn: 'মাঝারি চাপ', en: 'Moderate' },
          icon: '🟠',
        };
      case 'severe':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-600',
          bgColor: 'bg-red-500/10',
          label: { bn: 'তীব্র চাপ', en: 'Severe' },
          icon: '🔴',
        };
      case 'emergency':
        return {
          color: 'bg-red-700',
          textColor: 'text-red-700',
          bgColor: 'bg-red-700/10',
          label: { bn: 'জরুরি!', en: 'DANGER!' },
          icon: '🚨',
        };
      default:
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
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
      className={`rounded-2xl p-4 shadow-card ${status.bgColor} border border-border/50`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{status.icon}</span>
          <div>
            <h3 className="font-semibold text-sm">
              {language === 'bn' ? 'হিট স্ট্রেস' : 'Heat Stress'}
            </h3>
            <p className={`text-xs font-medium ${status.textColor}`}>
              {status.label[language]}
            </p>
          </div>
        </div>
        <div className={`text-right`}>
          <p className={`text-2xl font-bold ${status.textColor}`}>
            {hsi.toFixed(0)}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">HSI</p>
        </div>
      </div>

      {/* Current Values */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Thermometer className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-medium">{temperature.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-medium">{humidity.toFixed(0)}%</span>
        </div>
        {hsiResult?.shouldAlert && (
          <div className="flex items-center gap-1 ml-auto">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
            <span className="text-red-500 font-medium">
              {language === 'bn' ? 'সতর্ক' : 'Alert'}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((hsi / 100) * 100, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${status.color} rounded-full`}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
          <span>0</span>
          <span>30</span>
          <span>70</span>
          <span>85</span>
          <span>100</span>
        </div>
      </div>
    </motion.div>
  );
}
