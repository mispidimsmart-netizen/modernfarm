import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Thermometer, Sun, Wind, Droplets } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInsideOutsideDelta, getVentilationModifier } from '@/hooks/useInsideOutsideDelta';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { cn } from '@/lib/utils';

function InsideOutsideDeltaCardImpl() {
  const { language } = useAuth();
  const delta = useInsideOutsideDelta();
  const { hasRealData } = useRealtimeSensorData();
  
  // Don't show if no live sensor data or no outside temperature
  if (!hasRealData || delta.outsideTemp === null) {
    return null;
  }

  const modifier = getVentilationModifier(delta.delta);
  
  // Determine card styling based on recommendation
  const getCardStyle = () => {
    switch (delta.recommendation.type) {
      case 'open_curtain':
        return 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5';
      case 'prefer_fogger':
        return 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/5';
      default:
        return 'border-border';
    }
  };

  const getDeltaColor = () => {
    if (delta.delta === null) return 'text-muted-foreground';
    if (delta.delta >= 3) return 'text-emerald-500';
    if (delta.delta < 0) return 'text-red-500';
    return 'text-blue-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn('transition-colors', getCardStyle())}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-primary" />
              {language === 'bn' ? 'ভিতর-বাহির তাপমাত্রা' : 'Inside vs Outside Temp'}
            </CardTitle>
            {delta.shouldModifyVentilation && (
              <Badge variant="secondary" className="text-xs">
                {language === 'bn' ? 'সক্রিয়' : 'Active'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Temperature Comparison */}
          <div className="grid grid-cols-3 gap-2">
            {/* Inside Temp */}
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Thermometer className="h-3 w-3" />
                {language === 'bn' ? 'ভিতরে' : 'Inside'}
              </div>
              <p className="text-lg font-bold text-amber-600">
                {delta.insideTemp.toFixed(1)}°C
              </p>
            </div>
            
            {/* Delta */}
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <ArrowDownUp className="h-3 w-3" />
                {language === 'bn' ? 'পার্থক্য' : 'Delta'}
              </div>
              <p className={cn('text-lg font-bold', getDeltaColor())}>
                {delta.delta !== null && (delta.delta > 0 ? '+' : '')}{delta.delta?.toFixed(1)}°C
              </p>
            </div>
            
            {/* Outside Temp */}
            <div className="text-center p-2 rounded-lg bg-sky-500/10">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Sun className="h-3 w-3" />
                {language === 'bn' ? 'বাহিরে' : 'Outside'}
              </div>
              <p className="text-lg font-bold text-sky-600">
                {delta.outsideTemp?.toFixed(1)}°C
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <div className={cn(
            'p-2.5 rounded-lg text-sm',
            delta.recommendation.type === 'open_curtain' && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
            delta.recommendation.type === 'prefer_fogger' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
            delta.recommendation.type === 'normal' && 'bg-muted text-muted-foreground',
          )}>
            {language === 'bn' 
              ? delta.recommendation.message.bn 
              : delta.recommendation.message.en
            }
          </div>

          {/* Modifier Indicators */}
          {delta.shouldModifyVentilation && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Wind className="h-3.5 w-3.5 text-cyan-500" />
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'ফ্যান' : 'Fan'}: 
                </span>
                <span className={cn(
                  'font-medium',
                  modifier.fanMultiplier < 1 ? 'text-amber-500' : 'text-emerald-500'
                )}>
                  {Math.round(modifier.fanMultiplier * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">
                  {language === 'bn' ? 'ফগার' : 'Fogger'}: 
                </span>
                <span className={cn(
                  'font-medium',
                  modifier.foggerMultiplier > 1 ? 'text-blue-500' : modifier.foggerMultiplier < 1 ? 'text-amber-500' : 'text-muted-foreground'
                )}>
                  {Math.round(modifier.foggerMultiplier * 100)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}


export const InsideOutsideDeltaCard = memo(InsideOutsideDeltaCardImpl);
