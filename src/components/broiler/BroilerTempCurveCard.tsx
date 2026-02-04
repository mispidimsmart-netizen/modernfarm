import { motion } from 'framer-motion';
import { Thermometer, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBroilerTempCurveData } from '@/hooks/useBroilerAutomation';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { cn } from '@/lib/utils';

interface BroilerTempCurveCardProps {
  currentTemp?: number;
}

export function BroilerTempCurveCard({ currentTemp }: BroilerTempCurveCardProps) {
  const { language } = useAuth();
  const { data: activeBatch } = useActiveBatch();
  
  const curveData = getBroilerTempCurveData();
  
  // Calculate current age
  const currentWeek = activeBatch 
    ? Math.floor((Date.now() - new Date(activeBatch.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

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
              const isCurrentWeek = index === Math.min(currentWeek, curveData.length - 1);
              
              return (
                <div 
                  key={point.week}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isCurrentWeek ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Week label */}
                  <div className={cn(
                    'w-16 text-xs font-medium',
                    isCurrentWeek ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {language === 'bn' 
                      ? (index === 0 ? '১-৭ দিন' : `সপ্তাহ ${index}`)
                      : point.label
                    }
                  </div>
                  
                  {/* Temperature bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 bg-muted rounded-lg relative overflow-hidden">
                      {/* Temperature range bar */}
                      <div 
                        className={cn(
                          'absolute h-full rounded-lg',
                          isCurrentWeek 
                            ? 'bg-gradient-to-r from-primary/60 to-primary/40' 
                            : 'bg-gradient-to-r from-amber-500/40 to-red-500/30'
                        )}
                        style={{
                          left: `${(point.minTemp / 40) * 100}%`,
                          width: `${((point.maxTemp - point.minTemp) / 40) * 100}%`,
                        }}
                      />
                      
                      {/* Current temp indicator (if current week) */}
                      {isCurrentWeek && currentTemp && (
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
                      isCurrentWeek ? 'text-primary font-semibold' : 'text-muted-foreground'
                    )}>
                      {point.minTemp}-{point.maxTemp}°C
                    </div>
                  </div>
                  
                  {/* Current indicator */}
                  {isCurrentWeek && (
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
