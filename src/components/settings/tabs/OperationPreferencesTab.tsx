import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wind, Shield, Heart, Thermometer, Zap, 
  Leaf, Activity, Droplets, Flame, Sun,
  RotateCcw, Minus, Plus, Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAutomationMode } from '@/hooks/useAutomationMode';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useWeatherCache } from '@/hooks/useWeather';
import { useAdvancedAutomationSettings } from '@/hooks/useAdvancedAutomation';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch } from '@/hooks/useBroilerData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HapticSettingsCard } from '@/components/settings/HapticSettingsCard';
import { AutomationModeCard } from '@/components/settings/AutomationModeCard';
import { differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ControlLevel = 'low' | 'auto' | 'high';

interface ControlSetting {
  id: string;
  icon: React.ElementType;
  title: { bn: string; en: string };
  description: { bn: string; en: string };
  levels: {
    low: { bn: string; en: string };
    auto: { bn: string; en: string };
    high: { bn: string; en: string };
  };
  color: string;
}

const CONTROL_SETTINGS: ControlSetting[] = [
  {
    id: 'ventilation',
    icon: Wind,
    title: { bn: 'বায়ু চলাচল', en: 'Ventilation' },
    description: { bn: 'ফ্যান কতটা জোরে চলবে', en: 'Fan strength control' },
    levels: {
      low: { bn: '🌿 কম', en: '🌿 Low' },
      auto: { bn: '🤖 অটো', en: '🤖 Auto' },
      high: { bn: '💨 শক্তিশালী', en: '💨 Strong' },
    },
    color: 'text-blue-500',
  },
  {
    id: 'heating',
    icon: Flame,
    title: { bn: 'হিটিং', en: 'Heating' },
    description: { bn: 'হিটার নিয়ন্ত্রণ', en: 'Heater control' },
    levels: {
      low: { bn: '❄️ কম', en: '❄️ Low' },
      auto: { bn: '🤖 অটো', en: '🤖 Auto' },
      high: { bn: '🔥 বেশি', en: '🔥 High' },
    },
    color: 'text-orange-500',
  },
  {
    id: 'cooling',
    icon: Droplets,
    title: { bn: 'কুলিং', en: 'Cooling' },
    description: { bn: 'ফগার ও কুলিং সিস্টেম', en: 'Fogger & cooling system' },
    levels: {
      low: { bn: '💧 কম', en: '💧 Low' },
      auto: { bn: '🤖 অটো', en: '🤖 Auto' },
      high: { bn: '🌊 বেশি', en: '🌊 High' },
    },
    color: 'text-cyan-500',
  },
  {
    id: 'comfort',
    icon: Heart,
    title: { bn: 'আরাম অগ্রাধিকার', en: 'Comfort Priority' },
    description: { bn: 'পাখির আরাম বনাম বিদ্যুৎ সাশ্রয়', en: 'Bird comfort vs power saving' },
    levels: {
      low: { bn: '⚡ সাশ্রয়ী', en: '⚡ Economy' },
      auto: { bn: '🤖 অটো', en: '🤖 Auto' },
      high: { bn: '🐔 আরাম', en: '🐔 Comfort' },
    },
    color: 'text-pink-500',
  },
  {
    id: 'protection',
    icon: Shield,
    title: { bn: 'সুরক্ষা স্তর', en: 'Protection Level' },
    description: { bn: 'নিরাপত্তা অগ্রাধিকার', en: 'Safety priority' },
    levels: {
      low: { bn: '💡 সাধারণ', en: '💡 Standard' },
      auto: { bn: '🤖 অটো', en: '🤖 Auto' },
      high: { bn: '🛡️ সর্বোচ্চ', en: '🛡️ Maximum' },
    },
    color: 'text-green-500',
  },
];

export function OperationPreferencesTab() {
  const { language } = useAuth();
  const { data: automationMode } = useAutomationMode();
  const { sensorData } = useRealtimeSensorData();
  const { data: weatherData } = useWeatherCache();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const { toast } = useToast();

  // State for each control - default to 'auto'
  const [controls, setControls] = useState<Record<string, ControlLevel>>({
    ventilation: 'auto',
    heating: 'auto',
    cooling: 'auto',
    comfort: 'auto',
    protection: 'auto',
  });

  // Calculate batch age in days
  const batchAgeDays = useMemo(() => {
    if (!activeBatch?.start_date) return 0;
    return differenceInDays(new Date(), parseISO(activeBatch.start_date));
  }, [activeBatch]);

  // Check if any control is not on auto
  const hasManualOverride = useMemo(() => {
    return Object.values(controls).some(v => v !== 'auto');
  }, [controls]);

  // Get auto-calculated value for a control based on sensor data
  const getAutoValue = (controlId: string): string => {
    const temp = sensorData?.temperature ?? null;
    const humidity = sensorData?.humidity ?? null;
    const ammonia = sensorData?.ammonia ?? null;

    switch (controlId) {
      case 'ventilation':
        if (ammonia !== null && ammonia > 25) return language === 'bn' ? 'শক্তিশালী (গ্যাস)' : 'High (Gas)';
        if (temp !== null && temp > 32) return language === 'bn' ? 'শক্তিশালী (তাপ)' : 'High (Heat)';
        if (ammonia !== null && ammonia > 15) return language === 'bn' ? 'মাঝারি' : 'Medium';
        return language === 'bn' ? 'স্বাভাবিক' : 'Normal';

      case 'heating':
        if (isBroiler && batchAgeDays > 0) {
          const targetTemp = getTargetTempForAge(batchAgeDays);
          if (temp !== null && temp < targetTemp - 1) return language === 'bn' ? `চালু (${targetTemp}°সে)` : `On (${targetTemp}°C)`;
        }
        if (temp !== null && temp < 18) return language === 'bn' ? 'চালু' : 'On';
        return language === 'bn' ? 'বন্ধ' : 'Off';

      case 'cooling':
        if (temp !== null && humidity !== null) {
          if (temp >= 32 && humidity < 85) return language === 'bn' ? 'ফগার চালু' : 'Fogger On';
          if (temp >= 30) return language === 'bn' ? 'প্রস্তুত' : 'Standby';
        }
        return language === 'bn' ? 'বন্ধ' : 'Off';

      case 'comfort':
        if (temp !== null && humidity !== null) {
          const hsi = 0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4;
          if (hsi > 40) return language === 'bn' ? 'পাখি অগ্রাধিকার' : 'Bird Priority';
          if (hsi < 30) return language === 'bn' ? 'আদর্শ' : 'Optimal';
        }
        return language === 'bn' ? 'ভারসাম্য' : 'Balanced';

      case 'protection':
        if (ammonia !== null && ammonia > 20) return language === 'bn' ? 'সর্বোচ্চ' : 'Maximum';
        if (temp !== null && (temp > 35 || temp < 15)) return language === 'bn' ? 'বর্ধিত' : 'Enhanced';
        return language === 'bn' ? 'সাধারণ' : 'Standard';

      default:
        return language === 'bn' ? 'স্বাভাবিক' : 'Normal';
    }
  };

  // Handle control change
  const handleControlChange = (controlId: string, direction: 'decrease' | 'increase') => {
    setControls(prev => {
      const current = prev[controlId];
      let newValue: ControlLevel;
      
      if (direction === 'decrease') {
        newValue = current === 'high' ? 'auto' : current === 'auto' ? 'low' : 'low';
      } else {
        newValue = current === 'low' ? 'auto' : current === 'auto' ? 'high' : 'high';
      }
      
      return { ...prev, [controlId]: newValue };
    });

    toast({
      title: language === 'bn' ? 'সেটিং পরিবর্তিত' : 'Setting changed',
      description: language === 'bn' 
        ? 'পরিবর্তন সংরক্ষিত হয়েছে' 
        : 'Change has been saved',
    });
  };

  // Reset all to auto
  const handleResetAll = () => {
    setControls({
      ventilation: 'auto',
      heating: 'auto',
      cooling: 'auto',
      comfort: 'auto',
      protection: 'auto',
    });

    toast({
      title: language === 'bn' ? '🔄 রিসেট সম্পন্ন' : '🔄 Reset Complete',
      description: language === 'bn' 
        ? 'সব কিছু অটো মোডে ফিরে গেছে' 
        : 'All settings returned to auto mode',
    });
  };

  // Reset single control to auto
  const handleResetSingle = (controlId: string) => {
    setControls(prev => ({ ...prev, [controlId]: 'auto' }));
  };

  // Get level color
  const getLevelColor = (level: ControlLevel) => {
    switch (level) {
      case 'low': return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
      case 'auto': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'high': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    }
  };

  // Get current mode summary
  const currentModeSummary = useMemo(() => {
    const manualCount = Object.values(controls).filter(v => v !== 'auto').length;
    
    if (manualCount === 0) {
      return {
        mode: language === 'bn' ? '🤖 সম্পূর্ণ অটো মোড' : '🤖 Full Auto Mode',
        description: language === 'bn' 
          ? 'সব কিছু সেন্সর থেকে স্বয়ংক্রিয়' 
          : 'Everything automatic from sensors',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      };
    } else {
      return {
        mode: language === 'bn' ? `✋ ${manualCount}টি ম্যানুয়াল` : `✋ ${manualCount} Manual`,
        description: language === 'bn' 
          ? 'কিছু সেটিং ম্যানুয়ালি নির্ধারিত' 
          : 'Some settings manually adjusted',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      };
    }
  }, [controls, language]);

  const isManualMode = automationMode === 'MANUAL';

  return (
    <div className="space-y-6">
      {/* ====== Dual Mode Switch (TOP) ====== */}
      <AutomationModeCard />

      {/* Header with Mode Badge */}
      <div className={`text-center ${isManualMode ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {language === 'bn' ? 'পরিচালনা নিয়ন্ত্রণ' : 'Operation Control'}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {isManualMode
            ? (language === 'bn' ? '⚠️ ম্যানুয়াল মোডে এই সেটিংস নিষ্ক্রিয়' : '⚠️ These settings are inactive in Manual mode')
            : (language === 'bn' ? 'ডিফল্টে অটো, প্রয়োজনে ম্যানুয়াল অ্যাডজাস্ট করুন' : 'Auto by default, manually adjust if needed')
          }
        </p>
      </div>

      {/* Current Mode Summary */}
      <div className={isManualMode ? 'opacity-40 pointer-events-none select-none' : ''}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between py-4 px-4 rounded-xl ${currentModeSummary.color}`}
      >
        <div>
          <p className="text-lg font-semibold">{currentModeSummary.mode}</p>
          <p className="text-sm opacity-80">{currentModeSummary.description}</p>
        </div>
        {hasManualOverride && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleResetAll}
            className="gap-1.5 bg-background/50"
          >
            <RotateCcw className="h-4 w-4" />
            {language === 'bn' ? 'রিসেট' : 'Reset'}
          </Button>
        )}
      </motion.div>

      {/* Control Cards */}
      <div className="space-y-3">
        {CONTROL_SETTINGS.map((setting, index) => {
          const Icon = setting.icon;
          const currentLevel = controls[setting.id];
          const isAuto = currentLevel === 'auto';
          
          return (
            <motion.div
              key={setting.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border ${getLevelColor(currentLevel)}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ${setting.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium truncate">{setting.title[language]}</p>
                        {!isAuto && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetSingle(setting.id)}
                            className="h-6 px-2 text-xs gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            {language === 'bn' ? 'অটো' : 'Auto'}
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {setting.description[language]}
                      </p>

                      {/* Control Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => handleControlChange(setting.id, 'decrease')}
                          disabled={currentLevel === 'low'}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <div className="flex-1 text-center">
                          <Badge 
                            variant={isAuto ? 'default' : 'secondary'}
                            className={`min-w-[100px] justify-center ${isAuto ? 'bg-primary' : ''}`}
                          >
                            {setting.levels[currentLevel][language]}
                          </Badge>
                          {isAuto && (
                            <p className="text-xs text-muted-foreground mt-1">
                              → {getAutoValue(setting.id)}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => handleControlChange(setting.id, 'increase')}
                          disabled={currentLevel === 'high'}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Level Indicator */}
                      <div className="flex justify-between text-xs mt-2 px-1">
                        <span className={currentLevel === 'low' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                          {setting.levels.low[language]}
                        </span>
                        <span className={currentLevel === 'auto' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                          {setting.levels.auto[language]}
                        </span>
                        <span className={currentLevel === 'high' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                          {setting.levels.high[language]}
                        </span>
                      </div>
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
              ? 'অটো মোডে এই ডেটা থেকে সেটিংস নির্ধারিত হয়' 
              : 'Auto mode settings are based on this data'}
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
