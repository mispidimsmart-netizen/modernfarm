import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Droplets, Wind, AlertTriangle, CheckCircle, ThermometerSun, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HeatStressRiskResult } from '@/hooks/useHeatStressRiskPrediction';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface HeatStressRiskCardProps {
  result: HeatStressRiskResult | null;
}

export function HeatStressRiskCard({ result }: HeatStressRiskCardProps) {
  const { language } = useAuth();

  if (!result) {
    return (
      <Card className="overflow-hidden bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'আগামীকালের পূর্বাভাস' : 'Tomorrow\'s Forecast'}
              </p>
              <p className="text-lg font-medium text-muted-foreground">
                {language === 'bn' ? 'আবহাওয়া ডেটা লোড হচ্ছে...' : 'Loading weather data...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBgColor = () => {
    switch (result.riskLevel) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-800';
      case 'moderate':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800';
      default:
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-800';
    }
  };

  const getTextColor = () => {
    switch (result.riskLevel) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'moderate':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  const getProgressColor = () => {
    switch (result.riskLevel) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'moderate':
        return 'bg-yellow-500';
      default:
        return 'bg-emerald-500';
    }
  };

  const isCritical = result.riskLevel === 'critical' || result.riskLevel === 'high';

  return (
    <Card className={cn('overflow-hidden border', getBgColor())}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5" />
          {language === 'bn' ? 'আগামীকালের তাপ চাপ ঝুঁকি' : 'Tomorrow\'s Heat Stress Risk'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Risk Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCritical ? (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <AlertTriangle className={cn('h-5 w-5', getTextColor())} />
                </motion.div>
              ) : (
                <CheckCircle className={cn('h-5 w-5', getTextColor())} />
              )}
              <span className={cn('text-2xl font-bold', getTextColor())}>
                {result.riskScore}%
              </span>
            </div>
            <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getBgColor(), getTextColor())}>
              {result.riskLevel === 'critical' && (language === 'bn' ? 'গুরুতর' : 'Critical')}
              {result.riskLevel === 'high' && (language === 'bn' ? 'উচ্চ' : 'High')}
              {result.riskLevel === 'moderate' && (language === 'bn' ? 'মাঝারি' : 'Moderate')}
              {result.riskLevel === 'low' && (language === 'bn' ? 'নিম্ন' : 'Low')}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${result.riskScore}%` }}
              transition={{ duration: 0.5 }}
              className={cn('h-full rounded-full', getProgressColor())}
            />
          </div>
        </div>

        {/* Tomorrow's forecast */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <ThermometerSun className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'আগামী সর্বোচ্চ' : 'Tomorrow Max'}
              </p>
              <p className="font-semibold">
                {result.tomorrowForecast.maxTemp ?? '--'}°C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Droplets className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}
              </p>
              <p className="font-semibold">
                {result.tomorrowForecast.avgHumidity ?? '--'}%
              </p>
            </div>
          </div>
        </div>

        {/* Current factors */}
        <div className="flex flex-wrap gap-2 mb-4">
          {result.factors.weatherHot && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              <Sun className="h-3 w-3" />
              {language === 'bn' ? 'গরম' : 'Hot'}
            </span>
          )}
          {result.factors.humidityHigh && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <Droplets className="h-3 w-3" />
              {language === 'bn' ? 'আর্দ্র' : 'Humid'}
            </span>
          )}
          {result.factors.fanRunningLong && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              <Wind className="h-3 w-3" />
              {language === 'bn' ? `ফ্যান ${result.factors.fanRunningHours}h+` : `Fan ${result.factors.fanRunningHours}h+`}
            </span>
          )}
        </div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'rounded-lg p-3 mb-3',
            isCritical ? 'bg-red-100 dark:bg-red-900/30' : 'bg-background/50'
          )}
        >
          <p className={cn(
            'text-sm font-medium',
            isCritical ? 'text-red-700 dark:text-red-300' : 'text-foreground'
          )}>
            {result.message[language]}
          </p>
        </motion.div>

        {/* Recommendations */}
        {isCritical && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'পরামর্শ:' : 'Recommendations:'}
            </p>
            <ul className="space-y-1">
              {result.recommendations[language].slice(0, 3).map((rec, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <span className={cn('mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0', getProgressColor())} />
                  {rec}
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
