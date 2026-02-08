import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Wind, Shield, Heart, Thermometer, Zap, 
  Leaf, Activity, Droplets, Flame, Sun
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useWeatherCache } from '@/hooks/useWeather';
import { useAdvancedAutomationSettings } from '@/hooks/useAdvancedAutomation';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HapticSettingsCard } from '@/components/settings/HapticSettingsCard';
import { differenceInDays, parseISO } from 'date-fns';

interface AutoStatus {
  id: string;
  icon: React.ElementType;
  title: { bn: string; en: string };
  value: string;
  valueBn: string;
  status: 'optimal' | 'active' | 'warning' | 'off';
  source: { bn: string; en: string };
  color: string;
}

export function OperationPreferencesTab() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { data: weatherData } = useWeatherCache();
  const { data: automationSettings } = useAdvancedAutomationSettings();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();

  // Calculate batch age in days
  const batchAgeDays = useMemo(() => {
    if (!activeBatch?.start_date) return 0;
    return differenceInDays(new Date(), parseISO(activeBatch.start_date));
  }, [activeBatch]);

  // Calculate automation statuses based on sensor data
  const autoStatuses = useMemo((): AutoStatus[] => {
    const temp = sensorData?.temperature ?? null;
    const humidity = sensorData?.humidity ?? null;
    const ammonia = sensorData?.ammonia ?? null;
    const outsideTemp = weatherData?.temperature ?? null;

    const statuses: AutoStatus[] = [];

    // 1. Ventilation Status
    let ventStatus: 'optimal' | 'active' | 'warning' | 'off' = 'optimal';
    let ventValue = 'Normal';
    let ventValueBn = 'স্বাভাবিক';
    
    if (ammonia !== null && ammonia > 25) {
      ventStatus = 'active';
      ventValue = 'High (Gas Purge)';
      ventValueBn = 'শক্তিশালী (গ্যাস পরিষ্কার)';
    } else if (temp !== null && temp > 32) {
      ventStatus = 'active';
      ventValue = 'High (Cooling)';
      ventValueBn = 'শক্তিশালী (কুলিং)';
    } else if (ammonia !== null && ammonia > 15) {
      ventStatus = 'warning';
      ventValue = 'Medium';
      ventValueBn = 'মাঝারি';
    }

    statuses.push({
      id: 'ventilation',
      icon: Wind,
      title: { bn: 'বায়ু চলাচল', en: 'Ventilation' },
      value: ventValue,
      valueBn: ventValueBn,
      status: ventStatus,
      source: { bn: '🤖 সেন্সর থেকে স্বয়ংক্রিয়', en: '🤖 Auto from sensors' },
      color: 'text-blue-500',
    });

    // 2. Heating Status
    let heatStatus: 'optimal' | 'active' | 'warning' | 'off' = 'off';
    let heatValue = 'Off';
    let heatValueBn = 'বন্ধ';
    
    if (isBroiler && batchAgeDays > 0) {
      const targetTemp = getTargetTempForAge(batchAgeDays);
      if (temp !== null && temp < targetTemp - 1) {
        heatStatus = 'active';
        heatValue = `On (Target: ${targetTemp}°C)`;
        heatValueBn = `চালু (লক্ষ্য: ${targetTemp}°সে)`;
      } else if (temp !== null && temp >= targetTemp - 1 && temp <= targetTemp + 1) {
        heatStatus = 'optimal';
        heatValue = 'Optimal';
        heatValueBn = 'আদর্শ';
      }
    } else if (isLayer) {
      if (temp !== null && temp < 18) {
        heatStatus = 'active';
        heatValue = 'On';
        heatValueBn = 'চালু';
      } else if (temp !== null && temp >= 18 && temp <= 28) {
        heatStatus = 'optimal';
        heatValue = 'Not needed';
        heatValueBn = 'প্রয়োজন নেই';
      }
    }

    statuses.push({
      id: 'heating',
      icon: Flame,
      title: { bn: 'হিটিং', en: 'Heating' },
      value: heatValue,
      valueBn: heatValueBn,
      status: heatStatus,
      source: { 
        bn: isBroiler ? '🤖 বয়স-ভিত্তিক কার্ভ' : '🤖 তাপমাত্রা থেকে', 
        en: isBroiler ? '🤖 Age-based curve' : '🤖 From temperature' 
      },
      color: 'text-orange-500',
    });

    // 3. Cooling Status
    let coolStatus: 'optimal' | 'active' | 'warning' | 'off' = 'off';
    let coolValue = 'Off';
    let coolValueBn = 'বন্ধ';
    
    if (temp !== null && humidity !== null) {
      if (temp >= 32 && humidity < 85) {
        coolStatus = 'active';
        coolValue = 'Fogger Active';
        coolValueBn = 'ফগার চালু';
      } else if (temp >= 30) {
        coolStatus = 'warning';
        coolValue = 'Standby';
        coolValueBn = 'প্রস্তুত';
      } else {
        coolStatus = 'optimal';
        coolValue = 'Not needed';
        coolValueBn = 'প্রয়োজন নেই';
      }
    }

    statuses.push({
      id: 'cooling',
      icon: Droplets,
      title: { bn: 'কুলিং', en: 'Cooling' },
      value: coolValue,
      valueBn: coolValueBn,
      status: coolStatus,
      source: { bn: '🤖 তাপমাত্রা ও আর্দ্রতা থেকে', en: '🤖 From temp & humidity' },
      color: 'text-cyan-500',
    });

    // 4. Comfort Priority
    let comfortStatus: 'optimal' | 'active' | 'warning' | 'off' = 'optimal';
    let comfortValue = 'Balanced';
    let comfortValueBn = 'ভারসাম্য';
    
    if (temp !== null && humidity !== null) {
      const hsi = 0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4;
      if (hsi > 40) {
        comfortStatus = 'warning';
        comfortValue = 'Bird Comfort Priority';
        comfortValueBn = 'পাখির আরাম অগ্রাধিকার';
      } else if (hsi < 30) {
        comfortStatus = 'optimal';
        comfortValue = 'Optimal';
        comfortValueBn = 'আদর্শ';
      }
    }

    statuses.push({
      id: 'comfort',
      icon: Heart,
      title: { bn: 'আরাম অগ্রাধিকার', en: 'Comfort Priority' },
      value: comfortValue,
      valueBn: comfortValueBn,
      status: comfortStatus,
      source: { bn: '🤖 HSI থেকে স্বয়ংক্রিয়', en: '🤖 Auto from HSI' },
      color: 'text-pink-500',
    });

    // 5. Protection Level
    let protectStatus: 'optimal' | 'active' | 'warning' | 'off' = 'optimal';
    let protectValue = 'Standard';
    let protectValueBn = 'সাধারণ';
    
    if (ammonia !== null && ammonia > 20) {
      protectStatus = 'active';
      protectValue = 'Maximum Safety';
      protectValueBn = 'সর্বোচ্চ সুরক্ষা';
    } else if (temp !== null && (temp > 35 || temp < 15)) {
      protectStatus = 'warning';
      protectValue = 'Enhanced';
      protectValueBn = 'বর্ধিত';
    }

    statuses.push({
      id: 'protection',
      icon: Shield,
      title: { bn: 'সুরক্ষা স্তর', en: 'Protection Level' },
      value: protectValue,
      valueBn: protectValueBn,
      status: protectStatus,
      source: { bn: '🤖 গ্যাস ও তাপমাত্রা থেকে', en: '🤖 From gas & temp' },
      color: 'text-green-500',
    });

    // 6. Lighting (for Layer farms)
    if (isLayer) {
      const now = new Date();
      const hour = now.getHours();
      const isLightingHours = hour >= 5 && hour < 19;
      
      statuses.push({
        id: 'lighting',
        icon: Sun,
        title: { bn: 'আলো', en: 'Lighting' },
        value: isLightingHours ? 'On (05:00-19:00)' : 'Off (Night rest)',
        valueBn: isLightingHours ? 'চালু (০৫:০০-১৯:০০)' : 'বন্ধ (রাতের বিশ্রাম)',
        status: isLightingHours ? 'active' : 'off',
        source: { bn: '🤖 শিডিউল থেকে স্বয়ংক্রিয়', en: '🤖 Auto from schedule' },
        color: 'text-yellow-500',
      });
    }

    return statuses;
  }, [sensorData, weatherData, isBroiler, isLayer, batchAgeDays]);

  // Get current mode summary
  const currentModeSummary = useMemo(() => {
    const activeCount = autoStatuses.filter(s => s.status === 'active').length;
    const warningCount = autoStatuses.filter(s => s.status === 'warning').length;
    
    if (warningCount > 0) {
      return {
        mode: language === 'bn' ? '⚠️ সতর্ক মোড' : '⚠️ Alert Mode',
        description: language === 'bn' 
          ? 'কিছু সিস্টেম সতর্কতায় আছে' 
          : 'Some systems on alert',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      };
    } else if (activeCount > 2) {
      return {
        mode: language === 'bn' ? '🔄 সক্রিয় মোড' : '🔄 Active Mode',
        description: language === 'bn' 
          ? 'একাধিক সিস্টেম চলমান' 
          : 'Multiple systems running',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      };
    } else {
      return {
        mode: language === 'bn' ? '✅ স্বাভাবিক মোড' : '✅ Normal Mode',
        description: language === 'bn' 
          ? 'সব কিছু স্বয়ংক্রিয়ভাবে চলছে' 
          : 'Everything running automatically',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      };
    }
  }, [autoStatuses, language]);

  const getStatusColor = (status: AutoStatus['status']) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'active': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'off': return 'bg-muted/50 border-muted';
    }
  };

  const getStatusBadge = (status: AutoStatus['status']) => {
    switch (status) {
      case 'optimal': return { text: language === 'bn' ? 'আদর্শ' : 'Optimal', variant: 'default' as const };
      case 'active': return { text: language === 'bn' ? 'সক্রিয়' : 'Active', variant: 'secondary' as const };
      case 'warning': return { text: language === 'bn' ? 'সতর্ক' : 'Alert', variant: 'destructive' as const };
      case 'off': return { text: language === 'bn' ? 'বন্ধ' : 'Off', variant: 'outline' as const };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Auto Badge */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {language === 'bn' ? 'স্বয়ংক্রিয় নিয়ন্ত্রণ' : 'Automatic Control'}
          </h3>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {language === 'bn' ? '🤖 অটো' : '🤖 AUTO'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'সেন্সর এবং অটোমেশন ইঞ্জিন থেকে সব কিছু স্বয়ংক্রিয়ভাবে নিয়ন্ত্রিত' 
            : 'Everything controlled automatically from sensors and automation engine'}
        </p>
      </div>

      {/* Current Mode Summary */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center py-4 rounded-xl ${currentModeSummary.color}`}
      >
        <p className="text-lg font-semibold">{currentModeSummary.mode}</p>
        <p className="text-sm opacity-80">{currentModeSummary.description}</p>
      </motion.div>

      {/* Auto Status Cards */}
      <div className="space-y-3">
        {autoStatuses.map((status, index) => {
          const Icon = status.icon;
          const badge = getStatusBadge(status.status);
          
          return (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border ${getStatusColor(status.status)}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ${status.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{status.title[language]}</p>
                        <Badge variant={badge.variant} className="shrink-0">
                          {badge.text}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-primary mt-0.5">
                        {language === 'bn' ? status.valueBn : status.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {status.source[language]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Live Sensor Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'বর্তমান সেন্সর ডেটা' : 'Current Sensor Data'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'এই ডেটার ওপর ভিত্তি করে উপরের সেটিংস নির্ধারিত' 
              : 'Above settings are determined from this data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background rounded-lg p-3 text-center">
              <Thermometer className="h-5 w-5 mx-auto mb-1 text-destructive" />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'তাপমাত্রা' : 'Temperature'}
              </p>
              <p className="text-lg font-bold">
                {sensorData?.temperature?.toFixed(1) ?? '--'}°C
              </p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <Droplets className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}
              </p>
              <p className="text-lg font-bold">
                {sensorData?.humidity?.toFixed(0) ?? '--'}%
              </p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <Wind className="h-5 w-5 mx-auto mb-1 text-secondary-foreground" />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'অ্যামোনিয়া' : 'Ammonia'}
              </p>
              <p className="text-lg font-bold">
                {sensorData?.ammonia?.toFixed(0) ?? '--'} ppm
              </p>
            </div>
            <div className="bg-background rounded-lg p-3 text-center">
              <Leaf className="h-5 w-5 mx-auto mb-1 text-accent-foreground" />
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বাইরের তাপ' : 'Outside Temp'}
              </p>
              <p className="text-lg font-bold">
                {weatherData?.temperature?.toFixed(1) ?? '--'}°C
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Haptic Feedback Settings */}
      <HapticSettingsCard />
    </div>
  );
}

// Helper function for broiler temperature curve
function getTargetTempForAge(ageDays: number): number {
  if (ageDays <= 3) return 33;
  if (ageDays <= 7) return 31;
  if (ageDays <= 14) return 29;
  if (ageDays <= 21) return 27;
  if (ageDays <= 28) return 25;
  return 23;
}
