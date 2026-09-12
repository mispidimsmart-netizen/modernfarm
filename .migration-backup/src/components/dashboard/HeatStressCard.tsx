import { motion } from 'framer-motion';
import { Thermometer, Wind, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HeatStressResult, getHSIColor, getHSIBgColor, getHSILabel } from '@/lib/heatStressIndex';

interface HeatStressCardProps {
  hsiResult: HeatStressResult | null;
  temperature: number | null;
  humidity: number | null;
}

export function HeatStressCard({ hsiResult, temperature, humidity }: HeatStressCardProps) {
  const { language } = useAuth();

  if (!hsiResult || temperature === null || humidity === null) {
    return null;
  }

  const isHighRisk = hsiResult.level === 'severe' || hsiResult.level === 'emergency';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-4 ${getHSIBgColor(hsiResult.level)}`}
    >
      {/* Animated background for high risk */}
      {isHighRisk && (
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-red-500/10"
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${isHighRisk ? 'bg-red-500/20' : 'bg-primary/10'}`}>
              <Thermometer className={`h-5 w-5 ${isHighRisk ? 'text-red-500' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {language === 'bn' ? 'হিট স্ট্রেস ইনডেক্স' : 'Heat Stress Index'}
              </h3>
              <p className="text-xs text-muted-foreground">
                HSI = f(T, H)
              </p>
            </div>
          </div>

          {hsiResult.shouldActivateFan && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="rounded-full bg-primary/20 p-2"
            >
              <Wind className="h-4 w-4 text-primary" />
            </motion.div>
          )}
        </div>

        {/* HSI Value */}
        <div className="mb-3 flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${getHSIColor(hsiResult.level)}`}>
            {hsiResult.index}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getHSIBgColor(hsiResult.level)} ${getHSIColor(hsiResult.level)}`}>
            {getHSILabel(hsiResult.level, language)}
          </span>
        </div>

        {/* Input values */}
        <div className="mb-3 flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {language === 'bn' ? 'তাপমাত্রা:' : 'Temp:'}
            </span>
            <span className="font-medium">{temperature}°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {language === 'bn' ? 'আর্দ্রতা:' : 'Humidity:'}
            </span>
            <span className="font-medium">{humidity}%</span>
          </div>
        </div>

        {/* Status message */}
        <div className={`flex items-start gap-2 rounded-lg p-2 ${isHighRisk ? 'bg-red-500/10' : 'bg-background/50'}`}>
          {isHighRisk && (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          )}
          <p className={`text-sm ${isHighRisk ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            {hsiResult.message[language]}
          </p>
        </div>

        {/* Action indicator */}
        {hsiResult.shouldActivateFan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 text-xs text-primary"
          >
            <Wind className="h-3.5 w-3.5" />
            <span>
              {language === 'bn' ? 'ফ্যান স্বয়ংক্রিয়ভাবে চালু' : 'Fan automatically ON'}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
