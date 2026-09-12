import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ThermometerSun, Droplets, Wind, AlertTriangle, 
  TrendingUp, TrendingDown, Heart, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';

interface DailySummary {
  id: string;
  summary_date: string;
  avg_temperature: number | null;
  avg_humidity: number | null;
  total_water_usage: number | null;
  total_eggs: number | null;
  mortality_count: number | null;
  alerts_count: number | null;
  health_score: number;
}

export function DailyReportCard() {
  const { user, language } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Fetch today's and yesterday's summary
  const { data: summaries } = useQuery({
    queryKey: ['daily-summary', user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .eq('user_id', user.id)
        .in('summary_date', [today, yesterday])
        .order('summary_date', { ascending: false });
      
      if (error) throw error;
      return data as DailySummary[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's sensor readings for min/max
  const { data: sensorStats } = useQuery({
    queryKey: ['sensor-stats-today', user?.id, today],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('temperature, humidity, water_usage')
        .eq('user_id', user.id)
        .gte('recorded_at', `${today}T00:00:00Z`)
        .lte('recorded_at', `${today}T23:59:59Z`);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const temps = data.map(s => Number(s.temperature)).filter(t => t > 0 && t < 60);
      const humidities = data.map(s => Number(s.humidity)).filter(h => h > 0 && h <= 100);
      const waterTotal = data.reduce((sum, s) => sum + Number(s.water_usage || 0), 0);
      
      return {
        maxTemp: temps.length > 0 ? Math.max(...temps) : null,
        minTemp: temps.length > 0 ? Math.min(...temps) : null,
        avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
        avgHumidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : null,
        totalWater: waterTotal,
        readingsCount: data.length,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const todaySummary = summaries?.find(s => s.summary_date === today);
  const yesterdaySummary = summaries?.find(s => s.summary_date === yesterday);

  // Calculate water change %
  const waterChangePercent = useMemo(() => {
    if (!sensorStats?.totalWater || !yesterdaySummary?.total_water_usage) return null;
    if (yesterdaySummary.total_water_usage === 0) return null;
    return ((sensorStats.totalWater - Number(yesterdaySummary.total_water_usage)) / Number(yesterdaySummary.total_water_usage)) * 100;
  }, [sensorStats, yesterdaySummary]);

  const healthScore = todaySummary?.health_score ?? 85;
  const alertsCount = todaySummary?.alerts_count ?? 0;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 50) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { bn: '✅ সব ঠিক আছে', en: '✅ All Good' };
    if (score >= 50) return { bn: '🔶 কিছু সমস্যা', en: '🔶 Minor Issues' };
    return { bn: '⚠️ মনোযোগ দিন', en: '⚠️ Needs Attention' };
  };

  if (!sensorStats && !todaySummary) {
    return null; // No data to show
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'আজকের রিপোর্ট' : "Today's Report"}
          </CardTitle>
          <Badge className={getHealthColor(healthScore)}>
            <Heart className="h-3 w-3 mr-1" />
            {healthScore}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {getHealthStatus(healthScore)[language]}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Temperature Range */}
          <div className="rounded-lg bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <ThermometerSun className="h-3.5 w-3.5" />
              {language === 'bn' ? 'তাপমাত্রা' : 'Temperature'}
            </div>
            <div className="font-semibold">
              {sensorStats?.minTemp !== null && sensorStats?.maxTemp !== null
                ? `${sensorStats.minTemp.toFixed(0)}° - ${sensorStats.maxTemp.toFixed(0)}°C`
                : 'N/A'
              }
            </div>
          </div>

          {/* Fan Runtime (estimated) */}
          <div className="rounded-lg bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wind className="h-3.5 w-3.5" />
              {language === 'bn' ? 'ফ্যান চালু' : 'Fan Runtime'}
            </div>
            <div className="font-semibold">
              {sensorStats?.readingsCount && sensorStats.avgTemp
                ? `~${Math.round((sensorStats.readingsCount / 12) * (sensorStats.avgTemp > 28 ? 0.8 : 0.3))}${language === 'bn' ? ' ঘন্টা' : 'h'}`
                : 'N/A'
              }
            </div>
          </div>

          {/* Water Change */}
          <div className="rounded-lg bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Droplets className="h-3.5 w-3.5" />
              {language === 'bn' ? 'পানি পরিবর্তন' : 'Water Change'}
            </div>
            <div className="flex items-center gap-1 font-semibold">
              {waterChangePercent !== null ? (
                <>
                  {waterChangePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={waterChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {waterChangePercent >= 0 ? '+' : ''}{waterChangePercent.toFixed(0)}%
                  </span>
                </>
              ) : (
                'N/A'
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-lg bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {language === 'bn' ? 'এলার্ট' : 'Alerts'}
            </div>
            <div className="font-semibold">
              <span className={alertsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {alertsCount} {language === 'bn' ? 'টি' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* View Details Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails 
            ? (language === 'bn' ? 'কম দেখুন' : 'Show Less')
            : (language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details')
          }
          <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </Button>

        {/* Expanded Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 pt-2 border-t"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'bn' ? 'গড় তাপমাত্রা' : 'Avg Temp'}
                  </span>
                  <span className="font-medium">
                    {sensorStats?.avgTemp?.toFixed(1) ?? 'N/A'}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'bn' ? 'গড় আর্দ্রতা' : 'Avg Humidity'}
                  </span>
                  <span className="font-medium">
                    {sensorStats?.avgHumidity?.toFixed(0) ?? 'N/A'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'bn' ? 'রিডিং সংখ্যা' : 'Readings'}
                  </span>
                  <span className="font-medium">
                    {sensorStats?.readingsCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'bn' ? 'মৃত্যু' : 'Mortality'}
                  </span>
                  <span className="font-medium">
                    {todaySummary?.mortality_count ?? 0}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
