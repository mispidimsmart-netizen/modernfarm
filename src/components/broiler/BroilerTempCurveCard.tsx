import { motion } from 'framer-motion';
import { Thermometer, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBroilerTempCurveDisplayData } from '@/hooks/useBroilerEnvironment';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { cn } from '@/lib/utils';

interface BroilerTempCurveCardProps {
  currentTemp?: number;
}

export function BroilerTempCurveCard({ currentTemp }: BroilerTempCurveCardProps) {
  const { language } = useAuth();
  const { data: activeBatch } = useActiveBatch();
  
  const curveData = getBroilerTempCurveDisplayData();
  
  // Calculate current age in days
  const currentDays = activeBatch 
    ? Math.floor((Date.now() - new Date(activeBatch.start_date).getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 1;
  
  // Find current curve index
  const currentCurveIndex = curveData.findIndex((point, index) => {
    const [minDays, maxDays] = point.days.split('-').map(d => d === '∞' ? 999 : parseInt(d));
    return currentDays >= minDays && currentDays <= maxDays;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              {language === 'bn' ? 'বয়স-ভিত্তিক তাপমাত্রা কার্ভ' : 'Age-Based Temp Curve'}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' 
              ? 'ব্রয়লার বয়স বাড়ার সাথে আদর্শ তাপমাত্রা কমতে থাকে'
              : 'Ideal temperature decreases as broilers age'
            }
          </p>
        </CardHeader>
        <CardContent>
          {/* Temperature Curve Visualization */}
          <div className="space-y-2">
            {curveData.map((point, index) => {
              const isCurrent = index === currentCurveIndex;
              
              return (
                <div 
                  key={point.days}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isCurrent ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Days label */}
                  <div className={cn(
                    'w-20 text-xs font-medium',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {language === 'bn' ? point.labelBn : point.label}
                  </div>
                  
                  {/* Temperature bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 bg-muted rounded-lg relative overflow-hidden">
                      {/* Temperature range bar */}
                      <div 
                        className={cn(
                          'absolute h-full rounded-lg',
                          isCurrent 
                            ? 'bg-gradient-to-r from-primary/60 to-primary/40' 
                            : 'bg-gradient-to-r from-amber-500/40 to-red-500/30'
                        )}
                        style={{
                          left: `${(point.minTemp / 40) * 100}%`,
                          width: `${(Math.max(1, point.maxTemp - point.minTemp) / 40) * 100}%`,
                        }}
                      />
                      
                      {/* Current temp indicator (if current period) */}
                      {isCurrent && currentTemp && (
                        <div 
                          className="absolute w-1 h-full bg-primary"
                          style={{
                            left: `${Math.min(100, Math.max(0, (currentTemp / 40) * 100))}%`,
                          }}
                        />
                      )}
                    </div>
                    
                    {/* Temperature values */}
                    <div className={cn(
                      'text-xs whitespace-nowrap',
                      isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
                    )}>
                      {point.minTemp === point.maxTemp 
                        ? `${point.minTemp}°C` 
                        : `${point.minTemp}-${point.maxTemp}°C`
                      }
                    </div>
                  </div>
                  
                  {/* Current indicator */}
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] px-1.5">
                      {language === 'bn' ? 'বর্তমান' : 'Now'}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3" />
              {language === 'bn' ? 'আদর্শ রেঞ্জ' : 'Ideal Range'}
            </div>
            {currentTemp && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full" />
                {language === 'bn' ? `বর্তমান: ${currentTemp}°C` : `Current: ${currentTemp}°C`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
