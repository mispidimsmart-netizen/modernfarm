import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ZapOff, 
  Battery, 
  BatteryWarning, 
  BatteryCharging,
  Clock, 
  AlertTriangle,
  History,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  usePowerStats, 
  useOngoingOutages, 
  useBatteryBackupEstimate,
  formatDuration 
} from '@/hooks/usePowerOutages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export function PowerOutageCard() {
  const { language } = useAuth();
  const stats = usePowerStats();
  const { data: ongoingOutages, isLoading } = useOngoingOutages();
  const { data: batteryEstimate } = useBatteryBackupEstimate();
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const t = {
    title: { bn: 'পাওয়ার স্ট্যাটাস', en: 'Power Status' },
    powerOn: { bn: 'বিদ্যুৎ আছে', en: 'Power On' },
    powerOff: { bn: 'বিদ্যুৎ নেই!', en: 'Power Off!' },
    outageActive: { bn: 'বিদ্যুৎ বিভ্রাট চলছে', en: 'Outage Active' },
    duration: { bn: 'সময়কাল', en: 'Duration' },
    batteryBackup: { bn: 'ব্যাটারি ব্যাকআপ', en: 'Battery Backup' },
    estimatedTime: { bn: 'আনুমানিক সময়', en: 'Est. Time' },
    last24h: { bn: 'গত ২৪ ঘণ্টা', en: 'Last 24h' },
    last7d: { bn: 'গত ৭ দিন', en: 'Last 7 days' },
    outages: { bn: 'বিভ্রাট', en: 'outages' },
    avgDuration: { bn: 'গড় সময়', en: 'Avg Duration' },
    totalDowntime: { bn: 'মোট ডাউনটাইম', en: 'Total Downtime' },
    critical: { bn: 'জরুরি!', en: 'Critical!' },
    warning: { bn: 'সতর্কতা', en: 'Warning' },
    noOutages: { bn: 'কোনো বিভ্রাট নেই', en: 'No outages' },
    batteryLow: { bn: 'ব্যাটারি কম', en: 'Low Battery' },
  };

  // Update elapsed time for ongoing outage
  useEffect(() => {
    if (!ongoingOutages?.[0]) {
      setElapsedSeconds(0);
      return;
    }

    const outage = ongoingOutages[0];
    const startTime = new Date(outage.started_at).getTime();
    
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [ongoingOutages]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasOngoingOutage = ongoingOutages && ongoingOutages.length > 0;
  const isCritical = elapsedSeconds > 30 * 60; // > 30 minutes
  const isWarning = elapsedSeconds > 10 * 60; // > 10 minutes
  
  const batteryPercent = batteryEstimate?.avgBatteryPercent || 0;
  const isBatteryLow = batteryPercent < 20;

  return (
    <Card className={hasOngoingOutage ? 'border-red-500/50 bg-red-500/5' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            {hasOngoingOutage ? (
              <ZapOff className="h-5 w-5 text-red-500 animate-pulse" />
            ) : (
              <Zap className="h-5 w-5 text-green-500" />
            )}
            {t.title[language]}
          </span>
          
          {hasOngoingOutage ? (
            <Badge variant="destructive" className="animate-pulse">
              {isCritical ? t.critical[language] : isWarning ? t.warning[language] : t.outageActive[language]}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              {t.powerOn[language]}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ongoing Outage Alert */}
        <AnimatePresence>
          {hasOngoingOutage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-lg p-4 ${
                isCritical 
                  ? 'bg-red-500/20 border border-red-500' 
                  : isWarning 
                    ? 'bg-orange-500/20 border border-orange-500'
                    : 'bg-yellow-500/20 border border-yellow-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-8 w-8 ${isCritical ? 'text-red-500' : 'text-orange-500'}`} />
                  <div>
                    <p className="font-bold text-lg">
                      {t.powerOff[language]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.duration[language]}: <span className="font-mono font-bold">
                        {formatDuration(elapsedSeconds, language)}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="font-mono text-2xl font-bold">
                    {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Battery Backup Estimate */}
        {batteryEstimate && batteryEstimate.totalCapacityWh > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm">
                {isBatteryLow ? (
                  <BatteryWarning className="h-4 w-4 text-orange-500" />
                ) : hasOngoingOutage ? (
                  <Battery className="h-4 w-4 text-yellow-500" />
                ) : (
                  <BatteryCharging className="h-4 w-4 text-green-500" />
                )}
                {t.batteryBackup[language]}
              </span>
              <span className="text-sm font-medium">
                {batteryPercent}%
              </span>
            </div>
            
            <Progress 
              value={batteryPercent} 
              className={`h-2 ${isBatteryLow ? 'bg-orange-200' : ''}`}
            />
            
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.estimatedTime[language]}</span>
              <span className="font-medium">
                {batteryEstimate.backupTimeMinutes > 0 
                  ? formatDuration(batteryEstimate.backupTimeMinutes * 60, language)
                  : language === 'bn' ? 'কনফিগার করুন' : 'Configure'
                }
              </span>
            </div>
          </div>
        )}

        {/* Outage Statistics */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <History className="h-4 w-4" />
                <span className="text-xs">{t.last24h[language]}</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.last24hOutages}
              </p>
              <p className="text-xs text-muted-foreground">{t.outages[language]}</p>
            </div>
            
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">{t.avgDuration[language]}</span>
              </div>
              <p className="text-2xl font-bold">
                {stats.avgOutageDuration > 0 
                  ? formatDuration(Math.round(stats.avgOutageDuration), language)
                  : '-'
                }
              </p>
            </div>
          </div>
        )}

        {/* Total Downtime This Month */}
        {stats && stats.totalDowntimeSeconds > 0 && (
          <div className="flex items-center justify-between text-sm border-t pt-3">
            <span className="text-muted-foreground">{t.totalDowntime[language]} (30d)</span>
            <span className="font-medium">
              {formatDuration(stats.totalDowntimeSeconds, language)}
            </span>
          </div>
        )}

        {/* No Outages Message */}
        {stats && stats.totalOutages === 0 && !hasOngoingOutage && (
          <div className="text-center py-4 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">✨ {t.noOutages[language]}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
