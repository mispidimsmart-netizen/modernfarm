import { Card, CardContent } from '@/components/ui/card';
import { Droplets, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { WaterAnomalyResult } from '@/hooks/useWaterAnomalyDetection';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface WaterAnomalyCardProps {
  result: WaterAnomalyResult | null;
}

export function WaterAnomalyCard({ result }: WaterAnomalyCardProps) {
  const { language } = useAuth();

  if (!result) {
    return (
      <Card className="overflow-hidden bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Droplets className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'পানি ব্যবহার বিশ্লেষণ' : 'Water Usage Analysis'}
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

  const isNegativeChange = result.percentChange < 0;
  const TrendIcon = isNegativeChange ? TrendingDown : TrendingUp;
  
  const getBgColor = () => {
    if (result.isAnomaly) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    if (result.percentChange < -5) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-blue-50 dark:bg-blue-900/20';
  };

  const getTextColor = () => {
    if (result.isAnomaly) return 'text-orange-600 dark:text-orange-400';
    if (isNegativeChange) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <Card className={cn('overflow-hidden border', getBgColor())}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={result.isAnomaly ? { scale: [1, 1.1, 1] } : {}}
              transition={result.isAnomaly ? { repeat: Infinity, duration: 1.5 } : {}}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                result.isAnomaly 
                  ? 'bg-orange-100 dark:bg-orange-900/50' 
                  : 'bg-blue-100 dark:bg-blue-900/50'
              )}
            >
              {result.isAnomaly ? (
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              ) : (
                <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'পানি ব্যবহার' : 'Water Usage'}
              </p>
              <div className="flex items-center gap-2">
                <p className={cn('text-2xl font-bold', getTextColor())}>
                  {result.todayUsage.toFixed(1)}
                </p>
                <span className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'লি/ঘ' : 'L/h'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={cn('flex items-center gap-1', getTextColor())}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-lg font-semibold">
                {result.percentChange > 0 ? '+' : ''}{result.percentChange.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? '৩ দিনের গড়' : '3-day avg'}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {result.last3DaysAvg.toFixed(1)} {language === 'bn' ? 'লি/ঘ' : 'L/h'}
            </p>
          </div>
        </div>

        {result.isAnomaly && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2"
          >
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {result.message[language]}
            </p>
          </motion.div>
        )}

        {!result.isAnomaly && (
          <p className="mt-2 text-xs text-muted-foreground">
            {result.message[language]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
