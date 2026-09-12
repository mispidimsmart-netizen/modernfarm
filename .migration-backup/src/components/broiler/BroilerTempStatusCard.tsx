import { motion } from 'framer-motion';
import { Thermometer, Fan, Flame, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Local type for the component
export interface BroilerTempResult {
  currentTemp: number;
  targetMin: number;
  targetMax: number;
  ageWeeks: number;
  ageDays: number;
  level: 'normal' | 'low_temp' | 'high_temp' | 'critical';
  deviation: number;
  shouldActivateFan: boolean;
  shouldActivateHeater: boolean;
  shouldAlert: boolean;
  message: { bn: string; en: string };
}

// Helper functions
export function getBroilerTempColor(level: BroilerTempResult['level']): string {
  switch (level) {
    case 'normal':
      return 'text-green-600';
    case 'low_temp':
      return 'text-blue-600';
    case 'high_temp':
      return 'text-orange-500';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

export function getBroilerTempBgColor(level: BroilerTempResult['level']): string {
  switch (level) {
    case 'normal':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'low_temp':
      return 'bg-blue-100 dark:bg-blue-900/30';
    case 'high_temp':
      return 'bg-orange-100 dark:bg-orange-900/30';
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-muted';
  }
}

interface BroilerTempStatusCardProps {
  tempResult: BroilerTempResult | null;
  isLoading?: boolean;
}

export function BroilerTempStatusCard({ tempResult, isLoading }: BroilerTempStatusCardProps) {
  const { language } = useAuth();

  if (isLoading || !tempResult) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  const { 
    currentTemp, 
    targetMin, 
    targetMax, 
    ageWeeks, 
    ageDays, 
    level, 
    deviation,
    shouldActivateFan,
    shouldActivateHeater,
    message 
  } = tempResult;

  // Calculate position in range (0-100)
  const range = targetMax - targetMin;
  const idealMin = targetMin - 3;
  const idealMax = targetMax + 3;
  const totalRange = idealMax - idealMin;
  const position = Math.min(100, Math.max(0, ((currentTemp - idealMin) / totalRange) * 100));

  const levelIcons = {
    normal: CheckCircle,
    low_temp: Flame,
    high_temp: Fan,
    critical: AlertTriangle,
  };

  const LevelIcon = levelIcons[level];

  const levelLabels = {
    normal: { bn: 'স্বাভাবিক', en: 'Normal' },
    low_temp: { bn: 'ঠান্ডা', en: 'Cold' },
    high_temp: { bn: 'গরম', en: 'Hot' },
    critical: { bn: 'গুরুতর', en: 'Critical' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'border-2 transition-colors',
        level === 'critical' ? 'border-destructive' : 
        level === 'normal' ? 'border-green-500/30' : 'border-amber-500/30'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-primary" />
              {language === 'bn' ? 'ব্রয়লার তাপমাত্রা' : 'Broiler Temperature'}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {language === 'bn' ? `${ageWeeks} সপ্তাহ (${ageDays} দিন)` : `${ageWeeks}w (${ageDays}d)`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Temperature Display */}
          <div className="flex items-center justify-between">
            <div>
              <p className={cn('text-3xl font-bold', getBroilerTempColor(level))}>
                {currentTemp.toFixed(1)}°C
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? `আদর্শ: ${targetMin}-${targetMax}°C` : `Target: ${targetMin}-${targetMax}°C`}
              </p>
            </div>
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center',
              getBroilerTempBgColor(level)
            )}>
              <LevelIcon className={cn('h-6 w-6', getBroilerTempColor(level))} />
            </div>
          </div>

          {/* Temperature Range Visualization */}
          <div className="space-y-1">
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              {/* Ideal zone (green) */}
              <div 
                className="absolute h-full bg-green-500/30"
                style={{
                  left: `${((targetMin - idealMin) / totalRange) * 100}%`,
                  width: `${(range / totalRange) * 100}%`,
                }}
              />
              {/* Current temp indicator */}
              <div 
                className={cn(
                  'absolute w-3 h-3 rounded-full -translate-x-1/2 transition-all',
                  level === 'normal' ? 'bg-green-500' :
                  level === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                )}
                style={{ left: `${position}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{idealMin}°C</span>
              <span className="text-green-600 font-medium">
                {targetMin}-{targetMax}°C
              </span>
              <span>{idealMax}°C</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg p-2',
            getBroilerTempBgColor(level)
          )}>
            <LevelIcon className={cn('h-4 w-4', getBroilerTempColor(level))} />
            <span className={cn('text-sm font-medium', getBroilerTempColor(level))}>
              {levelLabels[level][language]}
            </span>
            {shouldActivateFan && (
              <Badge variant="outline" className="ml-auto text-xs">
                <Fan className="h-3 w-3 mr-1" />
                {language === 'bn' ? 'ফ্যান' : 'Fan'}
              </Badge>
            )}
            {shouldActivateHeater && (
              <Badge variant="outline" className="ml-auto text-xs">
                <Flame className="h-3 w-3 mr-1" />
                {language === 'bn' ? 'হিটার' : 'Heater'}
              </Badge>
            )}
          </div>

          {/* Message */}
          <p className="text-xs text-muted-foreground">
            {message[language]}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
