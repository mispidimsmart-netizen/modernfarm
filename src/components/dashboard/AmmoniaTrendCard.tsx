import { Card, CardContent } from '@/components/ui/card';
import { Wind, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
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
    if (result.isRising) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
  };

  const getTextColor = () => {
    if (result.isRising) return 'text-orange-600 dark:text-orange-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getIconBgColor = () => {
    if (result.isRising) return 'bg-orange-100 dark:bg-orange-900/50';
    return 'bg-emerald-100 dark:bg-emerald-900/50';
  };

  return (
    <Card className={cn('overflow-hidden border', getBgColor())}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={result.isRising ? { scale: [1, 1.1, 1] } : {}}
              transition={result.isRising ? { repeat: Infinity, duration: 1.5 } : {}}
              className={cn('flex h-12 w-12 items-center justify-center rounded-xl', getIconBgColor())}
            >
              {result.isRising ? (
                <AlertTriangle className={cn('h-6 w-6', getTextColor())} />
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
              {result.isRising ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-lg font-semibold">
                {result.risingHours > 0 ? `${result.risingHours}h` : '--'}
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
                  className={cn(
                    'flex-1 rounded-t',
                    result.isRising 
                      ? 'bg-orange-400 dark:bg-orange-500' 
                      : 'bg-emerald-400 dark:bg-emerald-500'
                  )}
                  title={`${reading.avg.toFixed(1)} ppm (${reading.hour}h ago)`}
                />
              );
            })}
          </div>
        )}

        {result.isRising && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2"
          >
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {result.message[language]}
            </p>
          </motion.div>
        )}

        {!result.isRising && (
          <p className="mt-2 text-xs text-muted-foreground">
            {result.message[language]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
