import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Thermometer, Wind, Bird, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useSensorHistory } from '@/hooks/useSensorHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatusLevel = 'normal' | 'warning' | 'low' | 'high';

interface SummaryItem {
  icon: React.ElementType;
  label: { bn: string; en: string };
  status: { bn: string; en: string };
  statusLevel: StatusLevel;
  trend?: 'up' | 'down' | 'stable';
}

export function TodayReadableSummary() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { data: history } = useSensorHistory();

  const summaryItems = useMemo((): SummaryItem[] => {
    // Calculate trends from history
    const recentHistory = history?.slice(-12) || []; // Last 2 hours (10-min intervals)
    
    // Temperature analysis
    let tempTrend: 'up' | 'down' | 'stable' = 'stable';
    let tempStatus: StatusLevel = 'normal';
    let tempStatusText = { bn: 'স্থিতিশীল', en: 'Stable' };
    
    if (recentHistory.length >= 2) {
      const tempDiff = sensorData.temperature - recentHistory[0].temperature;
      if (tempDiff > 2) tempTrend = 'up';
      else if (tempDiff < -2) tempTrend = 'down';
      
      // Check fluctuation
      const temps = recentHistory.map(h => h.temperature);
      const maxTemp = Math.max(...temps, sensorData.temperature);
      const minTemp = Math.min(...temps, sensorData.temperature);
      if (maxTemp - minTemp > 5) {
        tempStatus = 'warning';
        tempStatusText = { bn: 'অস্থির', en: 'Fluctuating' };
      }
    }
    
    if (sensorData.temperature > 35) {
      tempStatus = 'high';
      tempStatusText = { bn: 'অতি গরম', en: 'Too Hot' };
    } else if (sensorData.temperature < 18) {
      tempStatus = 'low';
      tempStatusText = { bn: 'অতি ঠান্ডা', en: 'Too Cold' };
    }

    // Water analysis
    let waterStatus: StatusLevel = 'normal';
    let waterStatusText = { bn: 'স্বাভাবিক', en: 'Normal' };
    
    if (sensorData.waterUsage < 50) {
      waterStatus = 'low';
      waterStatusText = { bn: 'কম', en: 'Low' };
    } else if (sensorData.waterUsage > 200) {
      waterStatus = 'high';
      waterStatusText = { bn: 'বেশি', en: 'High' };
    }

    // Ventilation analysis (based on ammonia and humidity)
    let ventStatus: StatusLevel = 'normal';
    let ventStatusText = { bn: 'পর্যাপ্ত', en: 'Adequate' };
    
    if (sensorData.ammonia > 20 || sensorData.humidity > 80) {
      ventStatus = 'warning';
      ventStatusText = { bn: 'অপর্যাপ্ত', en: 'Insufficient' };
    }

    // Bird activity (inferred from water and environmental stress)
    let birdStatus: StatusLevel = 'normal';
    let birdStatusText = { bn: 'স্বাভাবিক', en: 'Normal' };
    
    if (sensorData.temperature > 35 || sensorData.ammonia > 25) {
      birdStatus = 'warning';
      birdStatusText = { bn: 'চাপে আছে', en: 'Stressed' };
    } else if (waterStatus === 'low') {
      birdStatus = 'warning';
      birdStatusText = { bn: 'কম সক্রিয়', en: 'Reduced' };
    }

    return [
      {
        icon: Droplets,
        label: { bn: 'পানি', en: 'Water' },
        status: waterStatusText,
        statusLevel: waterStatus,
      },
      {
        icon: Thermometer,
        label: { bn: 'তাপমাত্রা', en: 'Temperature' },
        status: tempStatusText,
        statusLevel: tempStatus,
        trend: tempTrend,
      },
      {
        icon: Wind,
        label: { bn: 'বায়ুচলাচল', en: 'Ventilation' },
        status: ventStatusText,
        statusLevel: ventStatus,
      },
      {
        icon: Bird,
        label: { bn: 'পাখির অবস্থা', en: 'Bird Activity' },
        status: birdStatusText,
        statusLevel: birdStatus,
      },
    ];
  }, [sensorData, history]);

  const getStatusColor = (level: StatusLevel) => {
    switch (level) {
      case 'normal': return 'text-emerald-600 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      case 'high': return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusBg = (level: StatusLevel) => {
    switch (level) {
      case 'normal': return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
      case 'warning': return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
      case 'low': return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800';
      case 'high': return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
    }
  };

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
    if (!trend || trend === 'stable') return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-destructive" />;
    return <TrendingDown className="h-3 w-3 text-primary" />;
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-lg">📋</span>
          {language === 'bn' ? 'আজকের সারাংশ' : "Today's Summary"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {summaryItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label.en}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl p-3 border ${getStatusBg(item.statusLevel)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${getStatusColor(item.statusLevel)}`} />
                    <span className="text-xs text-muted-foreground font-medium">
                      {item.label[language]}
                    </span>
                  </div>
                  {item.trend && <TrendIcon trend={item.trend} />}
                </div>
                <p className={`text-sm font-bold ${getStatusColor(item.statusLevel)}`}>
                  {item.status[language]}
                </p>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
