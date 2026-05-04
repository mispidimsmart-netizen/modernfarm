import { motion } from 'framer-motion';
import { Thermometer, Wind, AlertTriangle, Egg, Heart, ThermometerSun, Cloud, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useFarmType } from '@/hooks/useFarmType';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useSelectedShed } from '@/hooks/useSheds';
import { useMemo } from 'react';

type ComfortLevel = 'good' | 'cold' | 'hot' | 'danger';
type AirQuality = 'safe' | 'moderate' | 'bad';
type StressRisk = 'low' | 'medium' | 'high';
type ProductionRisk = 'normal' | 'warning';

interface Indicator {
  id: string;
  label: { bn: string; en: string };
  value: { bn: string; en: string };
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function ComfortIndicators() {
  const { language } = useAuth();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const { data: settings } = useFarmSettings();
  const { isLayer, isBroiler } = useFarmType();
  const { selectedShedId } = useSelectedShed();
  
  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  if (!hasRealData) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          📡 {language === 'bn' ? 'সেন্সর ডেটা নেই' : 'No sensor data'}
        </p>
        <p className="text-xs text-muted-foreground/80">
          {language === 'bn' ? 'ESP32 কানেক্ট হলে আরাম/বায়ু/চাপ/উৎপাদন দেখানো হবে' : 'Comfort indicators will appear when ESP32 connects'}
        </p>
      </div>
    );
  }

  const indicators = useMemo((): Indicator[] => {
    const temp = sensorData.temperature;
    const humidity = sensorData.humidity;
    const ammonia = sensorData.ammonia;
    const hsi = hsiResult?.index || 0;

    // 1. Comfort Level
    let comfortLevel: ComfortLevel = 'good';
    let comfortValue = { bn: '✅ ভালো', en: '✅ GOOD' };
    let comfortColor = 'text-emerald-600 dark:text-emerald-400';
    let comfortBg = 'bg-emerald-50 dark:bg-emerald-950/50';
    let comfortBorder = 'border-emerald-200 dark:border-emerald-800';

    if (temp > 35 || hsi > 80) {
      comfortLevel = 'danger';
      comfortValue = { bn: '🔴 বিপদ', en: '🔴 DANGER' };
      comfortColor = 'text-red-600 dark:text-red-400';
      comfortBg = 'bg-red-50 dark:bg-red-950/50';
      comfortBorder = 'border-red-200 dark:border-red-800';
    } else if (temp > 32 || hsi > 70) {
      comfortLevel = 'hot';
      comfortValue = { bn: '🟠 গরম', en: '🟠 HOT' };
      comfortColor = 'text-orange-600 dark:text-orange-400';
      comfortBg = 'bg-orange-50 dark:bg-orange-950/50';
      comfortBorder = 'border-orange-200 dark:border-orange-800';
    } else if (temp < 18) {
      comfortLevel = 'cold';
      comfortValue = { bn: '🔵 ঠান্ডা', en: '🔵 COLD' };
      comfortColor = 'text-blue-600 dark:text-blue-400';
      comfortBg = 'bg-blue-50 dark:bg-blue-950/50';
      comfortBorder = 'border-blue-200 dark:border-blue-800';
    }

    // 2. Air Quality
    let airQuality: AirQuality = 'safe';
    let airValue = { bn: '✅ নিরাপদ', en: '✅ SAFE' };
    let airColor = 'text-emerald-600 dark:text-emerald-400';
    let airBg = 'bg-emerald-50 dark:bg-emerald-950/50';
    let airBorder = 'border-emerald-200 dark:border-emerald-800';

    if (ammonia > 25) {
      airQuality = 'bad';
      airValue = { bn: '🔴 খারাপ', en: '🔴 BAD' };
      airColor = 'text-red-600 dark:text-red-400';
      airBg = 'bg-red-50 dark:bg-red-950/50';
      airBorder = 'border-red-200 dark:border-red-800';
    } else if (ammonia > 15) {
      airQuality = 'moderate';
      airValue = { bn: '🟡 মাঝারি', en: '🟡 MODERATE' };
      airColor = 'text-amber-600 dark:text-amber-400';
      airBg = 'bg-amber-50 dark:bg-amber-950/50';
      airBorder = 'border-amber-200 dark:border-amber-800';
    }

    // 3. Stress Risk
    let stressRisk: StressRisk = 'low';
    let stressValue = { bn: '🟢 কম', en: '🟢 LOW' };
    let stressColor = 'text-emerald-600 dark:text-emerald-400';
    let stressBg = 'bg-emerald-50 dark:bg-emerald-950/50';
    let stressBorder = 'border-emerald-200 dark:border-emerald-800';

    if (hsi > 80 || (temp > 35 && humidity > 80)) {
      stressRisk = 'high';
      stressValue = { bn: '🔴 বেশি', en: '🔴 HIGH' };
      stressColor = 'text-red-600 dark:text-red-400';
      stressBg = 'bg-red-50 dark:bg-red-950/50';
      stressBorder = 'border-red-200 dark:border-red-800';
    } else if (hsi > 70 || temp > 32) {
      stressRisk = 'medium';
      stressValue = { bn: '🟠 মাঝারি', en: '🟠 MEDIUM' };
      stressColor = 'text-orange-600 dark:text-orange-400';
      stressBg = 'bg-orange-50 dark:bg-orange-950/50';
      stressBorder = 'border-orange-200 dark:border-orange-800';
    }

    // 4. Production Risk (based on environmental factors)
    let prodRisk: ProductionRisk = 'normal';
    let prodValue = { bn: '✅ স্বাভাবিক', en: '✅ NORMAL' };
    let prodColor = 'text-emerald-600 dark:text-emerald-400';
    let prodBg = 'bg-emerald-50 dark:bg-emerald-950/50';
    let prodBorder = 'border-emerald-200 dark:border-emerald-800';

    // Production affected by temp extremes, high ammonia, or stress
    if (temp > 35 || temp < 15 || ammonia > 20 || hsi > 75) {
      prodRisk = 'warning';
      prodValue = { bn: '⚠️ সতর্কতা', en: '⚠️ WARNING' };
      prodColor = 'text-amber-600 dark:text-amber-400';
      prodBg = 'bg-amber-50 dark:bg-amber-950/50';
      prodBorder = 'border-amber-200 dark:border-amber-800';
    }

    return [
      {
        id: 'comfort',
        label: { bn: 'আরাম', en: 'Comfort' },
        value: comfortValue,
        icon: ThermometerSun,
        color: comfortColor,
        bgColor: comfortBg,
        borderColor: comfortBorder,
      },
      {
        id: 'air',
        label: { bn: 'বায়ু', en: 'Air Quality' },
        value: airValue,
        icon: Wind,
        color: airColor,
        bgColor: airBg,
        borderColor: airBorder,
      },
      {
        id: 'stress',
        label: { bn: 'চাপ', en: 'Stress Risk' },
        value: stressValue,
        icon: Heart,
        color: stressColor,
        bgColor: stressBg,
        borderColor: stressBorder,
      },
      {
        id: 'production',
        label: { bn: 'উৎপাদন', en: 'Production' },
        value: prodValue,
        icon: isLayer ? Egg : Activity,
        color: prodColor,
        bgColor: prodBg,
        borderColor: prodBorder,
      },
    ];
  }, [sensorData, hsiResult, isLayer]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {indicators.map((indicator, index) => {
        const Icon = indicator.icon;
        return (
          <motion.div
            key={indicator.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`rounded-xl p-3 border ${indicator.bgColor} ${indicator.borderColor} transition-all`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${indicator.color}`} />
              <span className="text-xs text-muted-foreground font-medium">
                {indicator.label[language]}
              </span>
            </div>
            <p className={`text-sm font-bold ${indicator.color}`}>
              {indicator.value[language]}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
