import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wind, Shield, Heart, Thermometer, Zap, Scale,
  Leaf, Battery, Bird
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings, useUpdateFarmSettings } from '@/hooks/useFarmData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type SliderLevel = 'low' | 'normal' | 'high';

interface PreferenceSlider {
  id: string;
  icon: React.ElementType;
  title: { bn: string; en: string };
  description: { bn: string; en: string };
  levels: { low: { bn: string; en: string }; normal: { bn: string; en: string }; high: { bn: string; en: string } };
  color: string;
}

const PREFERENCES: PreferenceSlider[] = [
  {
    id: 'ventilation',
    icon: Wind,
    title: { bn: 'বায়ু চলাচল', en: 'Ventilation Strength' },
    description: { bn: 'ফ্যান কতটা জোরে চলবে', en: 'How strong the fans run' },
    levels: {
      low: { bn: 'কম', en: 'Low' },
      normal: { bn: 'স্বাভাবিক', en: 'Normal' },
      high: { bn: 'শক্তিশালী', en: 'Strong' },
    },
    color: 'text-blue-500',
  },
  {
    id: 'protection',
    icon: Shield,
    title: { bn: 'সুরক্ষা স্তর', en: 'Protection Level' },
    description: { bn: 'কতটা সতর্কভাবে পরিচালনা হবে', en: 'How cautiously the system operates' },
    levels: {
      low: { bn: 'সাশ্রয়ী', en: 'Energy Saving' },
      normal: { bn: 'ভারসাম্য', en: 'Balanced' },
      high: { bn: 'সর্বোচ্চ সুরক্ষা', en: 'Maximum Safety' },
    },
    color: 'text-green-500',
  },
  {
    id: 'comfort',
    icon: Heart,
    title: { bn: 'আরাম অগ্রাধিকার', en: 'Comfort Priority' },
    description: { bn: 'পাখির আরাম বনাম বিদ্যুৎ সাশ্রয়', en: 'Bird comfort vs electricity saving' },
    levels: {
      low: { bn: 'বিদ্যুৎ সাশ্রয়', en: 'Power Saving' },
      normal: { bn: 'স্বাভাবিক', en: 'Normal' },
      high: { bn: 'পাখির আরাম', en: 'Bird Comfort' },
    },
    color: 'text-pink-500',
  },
];

function levelToValue(level: SliderLevel): number {
  return level === 'low' ? 0 : level === 'normal' ? 50 : 100;
}

function valueToLevel(value: number): SliderLevel {
  if (value <= 25) return 'low';
  if (value <= 75) return 'normal';
  return 'high';
}

export function OperationPreferencesTab() {
  const { language } = useAuth();
  const { data: settings } = useFarmSettings();
  const updateSettings = useUpdateFarmSettings();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<Record<string, number>>({
    ventilation: 50,
    protection: 50,
    comfort: 50,
  });

  const [outsideTemp, setOutsideTemp] = useState<string>('');

  // Load settings
  useEffect(() => {
    if (settings) {
      // Map settings to slider values (you can customize this mapping)
      setPreferences({
        ventilation: 50,
        protection: 50,
        comfort: 50,
      });
    }
  }, [settings]);

  const handleSliderChange = (id: string, value: number[]) => {
    setPreferences(prev => ({ ...prev, [id]: value[0] }));
    
    // Apply settings based on slider
    const level = valueToLevel(value[0]);
    
    // Here you would map the preference to actual settings
    // For now, show a toast
    toast({
      title: language === 'bn' ? 'সেটিং আপডেট হয়েছে' : 'Setting updated',
      description: `${PREFERENCES.find(p => p.id === id)?.title[language]} → ${PREFERENCES.find(p => p.id === id)?.levels[level][language]}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {language === 'bn' ? '⚡ সহজ নিয়ন্ত্রণ' : '⚡ Simple Controls'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' 
            ? 'স্লাইডার দিয়ে সহজেই সেটিংস পরিবর্তন করুন' 
            : 'Adjust settings easily with sliders'}
        </p>
      </div>

      {/* Preference Sliders */}
      {PREFERENCES.map((pref) => {
        const Icon = pref.icon;
        const currentValue = preferences[pref.id];
        const currentLevel = valueToLevel(currentValue);
        
        return (
          <Card key={pref.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-muted ${pref.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{pref.title[language]}</p>
                  <p className="text-xs text-muted-foreground">{pref.description[language]}</p>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-4">
                <Slider
                  value={[currentValue]}
                  onValueChange={(v) => handleSliderChange(pref.id, v)}
                  max={100}
                  step={1}
                  className="w-full"
                />

                {/* Level Labels */}
                <div className="flex justify-between text-xs">
                  <span className={currentLevel === 'low' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                    {pref.levels.low[language]}
                  </span>
                  <span className={currentLevel === 'normal' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                    {pref.levels.normal[language]}
                  </span>
                  <span className={currentLevel === 'high' ? 'font-bold text-primary' : 'text-muted-foreground'}>
                    {pref.levels.high[language]}
                  </span>
                </div>

                {/* Current Selection Indicator */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={currentLevel}
                  className={`text-center py-2 rounded-lg ${
                    currentLevel === 'low' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : currentLevel === 'normal'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  <p className="text-sm font-medium">
                    {currentLevel === 'low' && (pref.id === 'ventilation' 
                      ? (language === 'bn' ? '🌿 কম বিদ্যুৎ খরচ' : '🌿 Lower power usage')
                      : pref.id === 'protection'
                        ? (language === 'bn' ? '💡 সাশ্রয়ী মোড' : '💡 Economy mode')
                        : (language === 'bn' ? '⚡ বিদ্যুৎ সাশ্রয়' : '⚡ Power saving'))}
                    {currentLevel === 'normal' && (language === 'bn' ? '✅ সুপারিশকৃত' : '✅ Recommended')}
                    {currentLevel === 'high' && (pref.id === 'ventilation' 
                      ? (language === 'bn' ? '💨 সর্বোচ্চ বায়ু প্রবাহ' : '💨 Maximum airflow')
                      : pref.id === 'protection'
                        ? (language === 'bn' ? '🛡️ সর্বোচ্চ সুরক্ষা' : '🛡️ Maximum safety')
                        : (language === 'bn' ? '🐔 পাখির আরাম অগ্রাধিকার' : '🐔 Bird comfort priority'))}
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Outside Temperature (Optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-orange-500" />
            {language === 'bn' ? 'বাইরের তাপমাত্রা' : 'Outside Temperature'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'ঐচ্ছিক - স্বয়ংক্রিয় নিয়ন্ত্রণে সাহায্য করে' 
              : 'Optional - helps with automatic control'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={language === 'bn' ? 'তাপমাত্রা লিখুন' : 'Enter temperature'}
                value={outsideTemp}
                onChange={(e) => setOutsideTemp(e.target.value)}
                className="h-12 text-center text-lg"
              />
            </div>
            <span className="text-xl font-bold text-muted-foreground">°C</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {language === 'bn' 
              ? '💡 আবহাওয়া সেন্সর না থাকলে এখানে লিখুন' 
              : '💡 Enter if you don\'t have a weather sensor'}
          </p>
        </CardContent>
      </Card>

      {/* Quick Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বর্তমান মোড' : 'Current Mode'}
            </span>
            <span className="font-semibold text-primary">
              {preferences.comfort > 75 
                ? (language === 'bn' ? '🐔 পাখি-কেন্দ্রিক' : '🐔 Bird-Centric')
                : preferences.protection > 75
                  ? (language === 'bn' ? '🛡️ সুরক্ষা-কেন্দ্রিক' : '🛡️ Safety-Focused')
                  : preferences.ventilation < 25 && preferences.comfort < 25
                    ? (language === 'bn' ? '⚡ সাশ্রয়ী' : '⚡ Economy')
                    : (language === 'bn' ? '⚖️ ভারসাম্য' : '⚖️ Balanced')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-muted/50 rounded-lg p-2">
              <Wind className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <span>{PREFERENCES[0].levels[valueToLevel(preferences.ventilation)][language]}</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <Shield className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <span>{PREFERENCES[1].levels[valueToLevel(preferences.protection)][language]}</span>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <Heart className="h-4 w-4 mx-auto mb-1 text-pink-500" />
              <span>{PREFERENCES[2].levels[valueToLevel(preferences.comfort)][language]}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
