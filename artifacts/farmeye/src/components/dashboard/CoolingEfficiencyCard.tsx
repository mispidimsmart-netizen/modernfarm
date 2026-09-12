import { Card, CardContent } from '@/components/ui/card';
import { Droplets, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CoolingEfficiencyResult } from '@/hooks/useCoolingEfficiency';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CoolingEfficiencyCardProps {
  result: CoolingEfficiencyResult | null;
}

export function CoolingEfficiencyCard({ result }: CoolingEfficiencyCardProps) {
  const { language } = useAuth();

  // Don't show if cooling is off or no result
  if (!result || (result.coolingActiveMinutes === 0 && !result.isInefficient)) {
    return null;
  }

  const getBgColor = () => {
    if (result.isInefficient) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    if (result.tempChangePercent > 0) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
  };

  const getTextColor = () => {
    if (result.isInefficient) return 'text-amber-600 dark:text-amber-400';
    if (result.tempChangePercent > 0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getIconBgColor = () => {
    if (result.isInefficient) return 'bg-amber-100 dark:bg-amber-900/50';
    if (result.tempChangePercent > 0) return 'bg-emerald-100 dark:bg-emerald-900/50';
    return 'bg-blue-100 dark:bg-blue-900/50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className={cn('overflow-hidden border', getBgColor())}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <motion.div
              animate={result.isInefficient ? { scale: [1, 1.1, 1] } : {}}
              transition={result.isInefficient ? { repeat: Infinity, duration: 1.5 } : {}}
              className={cn('flex h-10 w-10 items-center justify-center rounded-xl', getIconBgColor())}
            >
              {result.isInefficient ? (
                <AlertTriangle className={cn('h-5 w-5', getTextColor())} />
              ) : result.tempChangePercent > 0 ? (
                <CheckCircle className={cn('h-5 w-5', getTextColor())} />
              ) : (
                <Droplets className={cn('h-5 w-5', getTextColor())} />
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'কুলিং দক্ষতা' : 'Cooling Efficiency'}
              </p>
              <p className={cn('font-medium', getTextColor())}>
                {result.message[language]}
              </p>
              
              {/* Temperature change display */}
              {result.startTemp !== null && result.currentTemp !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {result.startTemp.toFixed(1)}°C → {result.currentTemp.toFixed(1)}°C
                </p>
              )}
            </div>

            <div className="text-right">
              <span className={cn('text-lg font-bold', getTextColor())}>
                {result.coolingActiveMinutes}
              </span>
              <span className="text-xs text-muted-foreground ml-0.5">
                {language === 'bn' ? 'মিনিট' : 'min'}
              </span>
            </div>
          </div>

          {/* Advisory box when inefficient */}
          {result.isInefficient && result.advisory && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2"
            >
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {result.advisory[language]}
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
