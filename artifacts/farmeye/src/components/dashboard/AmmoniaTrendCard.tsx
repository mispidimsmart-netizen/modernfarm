import { Card, CardContent } from '@/components/ui/card';
import { Wind, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AmmoniaTrendResult } from '@/hooks/useAmmoniaTrendDetection';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AmmoniaTrendCardProps {
  result: AmmoniaTrendResult | null;
}

export function AmmoniaTrendCard({ result }: AmmoniaTrendCardProps) {
  const { language } = useAuth();

  if (!result) {
    return (
      <Card className="overflow-hidden bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Wind className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'অ্যামোনিয়া ট্রেন্ড' : 'Ammonia Trend'}
              </p>
              <p className="text-lg font-medium text-muted-foreground">
                {language === 'bn' ? 'ডেটা সংগ্রহ করা হচ্ছে...' : 'Collecting data...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getBgColor = () => {
    if (result.isRising) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (result.earlyWarning) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
  };

  const getTextColor = () => {
    if (result.isRising) return 'text-red-600 dark:text-red-400';
    if (result.earlyWarning) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getIconBgColor = () => {
    if (result.isRising) return 'bg-red-100 dark:bg-red-900/50';
    if (result.earlyWarning) return 'bg-amber-100 dark:bg-amber-900/50';
    return 'bg-emerald-100 dark:bg-emerald-900/50';
  };

  const getBarColor = () => {
    if (result.isRising) return 'bg-red-400 dark:bg-red-500';
    if (result.earlyWarning) return 'bg-amber-400 dark:bg-amber-500';
    return 'bg-emerald-400 dark:bg-emerald-500';
  };

  return (
    <Card className={cn('overflow-hidden border', getBgColor())}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={(result.isRising || result.earlyWarning) ? { scale: [1, 1.1, 1] } : {}}
              transition={(result.isRising || result.earlyWarning) ? { repeat: Infinity, duration: 1.5 } : {}}
              className={cn('flex h-12 w-12 items-center justify-center rounded-xl', getIconBgColor())}
            >
              {result.isRising ? (
                <AlertTriangle className={cn('h-6 w-6', getTextColor())} />
              ) : result.earlyWarning ? (
                <Info className={cn('h-6 w-6', getTextColor())} />
              ) : (
                <CheckCircle className={cn('h-6 w-6', getTextColor())} />
              )}
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'অ্যামোনিয়া ট্রেন্ড' : 'Ammonia Trend'}
              </p>
              <div className="flex items-center gap-2">
                <p className={cn('text-2xl font-bold', getTextColor())}>
                  {result.currentLevel.toFixed(1)}
                </p>
                <span className="text-sm text-muted-foreground">ppm</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={cn('flex items-center justify-end gap-1', getTextColor())}>
              {(result.isRising || result.earlyWarning) ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-lg font-semibold">
                {result.isRising 
                  ? `${result.risingHours}h` 
                  : result.earlyWarning 
                    ? `${result.risingMinutes}m`
                    : '--'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'ট্রেন্ড সময়' : 'Trend duration'}
            </p>
            {result.percentIncrease !== 0 && (
              <p className={cn('text-sm font-medium', getTextColor())}>
                {result.percentIncrease > 0 ? '+' : ''}{result.percentIncrease.toFixed(0)}%
              </p>
            )}
          </div>
        </div>

        {/* Hourly trend visualization */}
        {result.hourlyReadings.length > 0 && (
          <div className="mt-3 flex items-end gap-1 h-8">
            {result.hourlyReadings.slice(0, 4).reverse().map((reading, idx) => {
              const maxReading = Math.max(...result.hourlyReadings.map(r => r.avg), 1);
              const height = Math.max((reading.avg / maxReading) * 100, 10);
              return (
                <motion.div
                  key={idx}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn('flex-1 rounded-t', getBarColor())}
                  title={`${reading.avg.toFixed(1)} ppm (${reading.hour}h ago)`}
                />
              );
            })}
          </div>
        )}

        {/* Danger alert - red */}
        {result.isRising && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg bg-red-100 dark:bg-red-900/30 p-2"
          >
            <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {result.message[language]}
            </p>
          </motion.div>
        )}

        {/* Early warning - amber */}
        {result.earlyWarning && !result.isRising && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2"
          >
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Info className="h-3 w-3" />
              {result.message[language]}
            </p>
          </motion.div>
        )}

        {/* Stable - no alert box, just text */}
        {!result.isRising && !result.earlyWarning && (
          <p className="mt-2 text-xs text-muted-foreground">
            {result.message[language]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
