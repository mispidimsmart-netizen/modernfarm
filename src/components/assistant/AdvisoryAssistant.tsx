import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, ChevronRight, ThermometerSun, Wind, Droplets, 
  AlertTriangle, Leaf, Stethoscope, X, Sparkles, Bird, Unplug, AlertOctagon,
  DoorOpen, Snowflake
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { useWaterAnomalyDetection } from '@/hooks/useWaterAnomalyDetection';
import { useAmmoniaTrendDetection } from '@/hooks/useAmmoniaTrendDetection';
import { useSensorValidation } from '@/hooks/useSensorValidation';
import { useWeatherCache } from '@/hooks/useWeather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Advisory {
  id: string;
  icon: React.ElementType;
  title: { bn: string; en: string };
  message: { bn: string; en: string };
  priority: 'high' | 'medium' | 'low';
  actionLabel?: { bn: string; en: string };
  category: 'health' | 'environment' | 'production' | 'tip';
}

export function AdvisoryAssistant() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const batchStats = useBatchStats(activeBatch?.id);
  const waterAnomaly = useWaterAnomalyDetection(sensorData.waterUsage);
  const ammoniaTrend = useAmmoniaTrendDetection(sensorData.ammonia);
  const { issues: sensorIssues } = useSensorValidation(sensorData);
  const { data: weather } = useWeatherCache();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate advisories based on current conditions
  const advisories = useMemo((): Advisory[] => {
    const result: Advisory[] = [];
    const temp = sensorData.temperature;
    const humidity = sensorData.humidity;
    const ammonia = sensorData.ammonia;
    const currentHour = new Date().getHours();
    const outsideTemp = weather?.temperature ?? null;

    // 0. Sensor Validation Issues (highest priority)
    sensorIssues.forEach(issue => {
      const iconMap = {
        stuck: AlertOctagon,
        spike: AlertTriangle,
        disconnected: Unplug,
        invalid: AlertTriangle,
      };
      result.push({
        id: `sensor-${issue.sensor}-${issue.type}`,
        icon: iconMap[issue.type],
        title: { 
          bn: issue.type === 'disconnected' ? 'সেন্সর বিচ্ছিন্ন' : 'সেন্সর সমস্যা', 
          en: issue.type === 'disconnected' ? 'Sensor Disconnected' : 'Sensor Issue' 
        },
        message: issue.message,
        priority: 'high',
        actionLabel: { bn: 'সেন্সর চেক করুন', en: 'Check sensor' },
        category: 'health',
      });
    });

    // 0.5 Curtain/Cooling Advisory based on indoor vs outdoor temp
    if (outsideTemp !== null && temp >= 28) {
      const tempDiff = temp - outsideTemp;
      
      // Inside 28°C + Outside cooler (e.g. 18°C) → Open curtain for natural ventilation
      if (outsideTemp < temp - 5) {
        result.push({
          id: 'curtain-open',
          icon: DoorOpen,
          title: { bn: 'পর্দা খুলুন', en: 'Open Curtain' },
          message: { 
            bn: `ভিতরে ${temp.toFixed(0)}°C, বাইরে ${outsideTemp.toFixed(0)}°C - প্রাকৃতিক বায়ু প্রবেশ করান`, 
            en: `Inside ${temp.toFixed(0)}°C, Outside ${outsideTemp.toFixed(0)}°C - Use natural ventilation` 
          },
          priority: 'medium',
          actionLabel: { bn: 'পর্দা খুলুন', en: 'Open curtain' },
          category: 'environment',
        });
      }
      // Inside 28°C + Outside hotter (e.g. 36°C) → Need mechanical cooling
      else if (outsideTemp >= temp) {
        result.push({
          id: 'cooling-mode',
          icon: Snowflake,
          title: { bn: 'কুলিং মোড দরকার', en: 'Cooling Mode Needed' },
          message: { 
            bn: `বাইরে ${outsideTemp.toFixed(0)}°C - ফগার/ফ্যান চালু করুন, পর্দা বন্ধ রাখুন`, 
            en: `Outside ${outsideTemp.toFixed(0)}°C - Use fogger/fans, keep curtains closed` 
          },
          priority: temp > 32 ? 'high' : 'medium',
          actionLabel: { bn: 'কুলিং চালু', en: 'Activate cooling' },
          category: 'environment',
        });
      }
    }

    // 1. High Ammonia Warning
    if (ammonia > 15) {
      result.push({
        id: 'high-ammonia',
        icon: Wind,
        title: { bn: 'অ্যামোনিয়া বেশি', en: 'High Ammonia' },
        message: { 
          bn: 'লিটার শুকনো রাখুন ও বায়ু চলাচল বাড়ান', 
          en: 'Keep litter dry and increase ventilation' 
        },
        priority: ammonia > 25 ? 'high' : 'medium',
        actionLabel: { bn: 'লিটার পরিবর্তন করুন', en: 'Change litter' },
        category: 'environment',
      });
    }

    // 2. High Temperature Warning
    if (temp > 32) {
      result.push({
        id: 'high-temp',
        icon: ThermometerSun,
        title: { bn: 'তাপমাত্রা বেশি', en: 'High Temperature' },
        message: { 
          bn: 'পানির ব্যবস্থা নিশ্চিত করুন, পর্দা খুলুন', 
          en: 'Ensure water supply, open curtains slightly' 
        },
        priority: temp > 35 ? 'high' : 'medium',
        actionLabel: { bn: 'পর্দা খুলুন', en: 'Open curtain' },
        category: 'environment',
      });
    }

    // 3. Low Temperature Warning (especially for broilers)
    if (isBroiler && batchStats && temp < 26) {
      const targetTemp = batchStats.ageDays <= 7 ? 32 : batchStats.ageDays <= 14 ? 29 : 26;
      if (temp < targetTemp - 2) {
        result.push({
          id: 'low-temp-broiler',
          icon: ThermometerSun,
          title: { bn: 'তাপমাত্রা কম', en: 'Low Temperature' },
          message: { 
            bn: `বাচ্চাদের জন্য ${targetTemp}°C প্রয়োজন`, 
            en: `Chicks need ${targetTemp}°C` 
          },
          priority: 'high',
          actionLabel: { bn: 'হিটার চেক করুন', en: 'Check heater' },
          category: 'health',
        });
      }
    }

    // 4. Water Anomaly
    if (waterAnomaly?.isAnomaly) {
      result.push({
        id: 'water-anomaly',
        icon: Droplets,
        title: { bn: 'পানি কম খাচ্ছে', en: 'Low Water Intake' },
        message: { 
          bn: 'মুরগি স্বাভাবিকের চেয়ে কম পানি খাচ্ছে', 
          en: 'Birds drinking less than normal' 
        },
        priority: 'medium',
        actionLabel: { bn: 'পানির লাইন চেক করুন', en: 'Check water line' },
        category: 'health',
      });
    }

    // 5. Ammonia Trend Rising
    if (ammoniaTrend?.isRising) {
      result.push({
        id: 'ammonia-trend',
        icon: AlertTriangle,
        title: { bn: 'অ্যামোনিয়া বাড়ছে', en: 'Ammonia Rising' },
        message: { 
          bn: 'আগামী কয়েক ঘন্টায় সমস্যা হতে পারে', 
          en: 'May cause issues in next few hours' 
        },
        priority: 'medium',
        actionLabel: { bn: 'তাজা লিটার দিন', en: 'Add fresh litter' },
        category: 'environment',
      });
    }

    // 6. High Humidity
    if (humidity > 80) {
      result.push({
        id: 'high-humidity',
        icon: Droplets,
        title: { bn: 'আর্দ্রতা বেশি', en: 'High Humidity' },
        message: { 
          bn: 'ফ্যান বাড়ান, পর্দা সামান্য খুলুন', 
          en: 'Increase fan, open curtains slightly' 
        },
        priority: 'medium',
        category: 'environment',
      });
    }

    // 7. General Tips (low priority, time-based)
    if (result.length < 2) {
      if (currentHour >= 10 && currentHour <= 14 && temp > 28) {
        result.push({
          id: 'midday-tip',
          icon: Lightbulb,
          title: { bn: 'দুপুরের টিপস', en: 'Midday Tips' },
          message: { 
            bn: 'ঠান্ডা পানি দিন, ফিড কমিয়ে দিন', 
            en: 'Provide cool water, reduce feeding' 
          },
          priority: 'low',
          category: 'tip',
        });
      }

      if (currentHour >= 5 && currentHour <= 7) {
        result.push({
          id: 'morning-tip',
          icon: Sparkles,
          title: { bn: 'সকালের কাজ', en: 'Morning Tasks' },
          message: { 
            bn: 'মরা মুরগি সরান, পানি পরিবর্তন করুন', 
            en: 'Remove dead birds, change water' 
          },
          priority: 'low',
          category: 'tip',
        });
      }
    }

    // 8. Broiler weight check reminder
    if (isBroiler && batchStats && batchStats.ageDays % 7 === 0 && batchStats.ageDays > 0) {
      result.push({
        id: 'weight-check',
        icon: Bird,
        title: { bn: 'ওজন মাপুন', en: 'Weight Check' },
        message: { 
          bn: `আজ সপ্তাহ ${batchStats.ageWeeks} - ওজন রেকর্ড করুন`, 
          en: `Week ${batchStats.ageWeeks} - Record weights today` 
        },
        priority: 'low',
        category: 'production',
      });
    }

    // Sort by priority
    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [sensorData, weather, waterAnomaly, ammoniaTrend, sensorIssues, isBroiler, batchStats]);

  // Filter out dismissed advisories
  const activeAdvisories = advisories.filter(a => !dismissedIds.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const getPriorityColor = (priority: Advisory['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30';
      case 'medium': return 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30';
      case 'low': return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30';
    }
  };

  const getPriorityBadge = (priority: Advisory['priority']) => {
    switch (priority) {
      case 'high': return { label: { bn: 'জরুরি', en: 'Urgent' }, color: 'bg-red-500' };
      case 'medium': return { label: { bn: 'গুরুত্বপূর্ণ', en: 'Important' }, color: 'bg-amber-500' };
      case 'low': return { label: { bn: 'টিপস', en: 'Tip' }, color: 'bg-emerald-500' };
    }
  };

  if (activeAdvisories.length === 0) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/30">
        <CardContent className="p-4 text-center">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 mb-3">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {language === 'bn' ? '✨ সব ঠিক আছে!' : '✨ All Good!'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'bn' ? 'এই মুহূর্তে কোনো পরামর্শ নেই' : 'No advisories at this time'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          {language === 'bn' ? 'পরামর্শ' : 'Advisory'}
          <Badge variant="secondary" className="ml-auto text-xs">
            {activeAdvisories.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <AnimatePresence>
          {activeAdvisories.slice(0, 4).map((advisory, index) => {
            const Icon = advisory.icon;
            const badge = getPriorityBadge(advisory.priority);
            
            return (
              <motion.div
                key={advisory.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative rounded-xl p-3 border ${getPriorityColor(advisory.priority)}`}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(advisory.id)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>

                <div className="flex items-start gap-3 pr-6">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badge.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold">
                        {advisory.title[language]}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {advisory.message[language]}
                    </p>
                    
                    {advisory.actionLabel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 mt-2 text-xs text-primary hover:text-primary/80"
                      >
                        {advisory.actionLabel[language]}
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {activeAdvisories.length > 4 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            +{activeAdvisories.length - 4} {language === 'bn' ? 'আরও পরামর্শ' : 'more advisories'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
