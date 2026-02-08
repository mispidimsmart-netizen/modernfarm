import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Thermometer, Droplets, Egg, Skull, Zap, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { useFarmType } from '@/hooks/useFarmType';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

export function TodaySummaryCard() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { data: summary, isLoading } = useTodaySummary();
  const { isLayer, isBroiler } = useFarmType();

  const today = new Date();
  const dateStr = format(today, 'EEEE, d MMMM', {
    locale: language === 'bn' ? bn : enUS
  });

  const currentHour = today.getHours();
  const isNight = currentHour >= 20 || currentHour < 6;

  // Calculate quick stats
  const stats = useMemo(() => {
    const baseStats = [
      {
        icon: Thermometer,
        label: { bn: 'তাপমাত্রা', en: 'Temp' },
        value: sensorData.temperature.toFixed(1),
        unit: '°C',
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
      },
      {
        icon: Droplets,
        label: { bn: 'আর্দ্রতা', en: 'Humidity' },
        value: sensorData.humidity.toFixed(0),
        unit: '%',
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10',
      },
    ];

    if (isLayer) {
      baseStats.push({
        icon: Egg,
        label: { bn: 'আজকের ডিম', en: "Today's Eggs" },
        value: summary?.todayEggs?.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') || '0',
        unit: '',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
      });
    }

    baseStats.push({
      icon: Skull,
      label: { bn: 'মৃত্যু', en: 'Mortality' },
      value: summary?.todayMortality?.toString() || '0',
      unit: language === 'bn' ? 'টি' : '',
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    });

    // Add income stat
    baseStats.push({
      icon: Zap,
      label: { bn: 'আয়', en: 'Income' },
      value: `৳${(summary?.todayIncome || 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`,
      unit: '',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    });

    return baseStats;
  }, [summary, sensorData, isLayer, language]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4 h-32" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-0">
        {/* Header with date and time icon */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/10">
          <div className="flex items-center gap-2">
            {isNight ? (
              <Moon className="h-4 w-4 text-indigo-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
            <span className="text-sm font-semibold">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(today, 'h:mm a', { locale: language === 'bn' ? bn : enUS })}
          </div>
        </div>

        {/* Stats grid */}
        <div className="p-3">
          <div className="grid grid-cols-5 gap-2">
            {stats.map(({ icon: Icon, label, value, unit, color, bg }, index) => (
              <motion.div
                key={label.en}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="text-center"
              >
                <div className={`mx-auto w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-1`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-lg font-bold">
                  {value}
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </p>
                <p className="text-[9px] text-muted-foreground line-clamp-1">{label[language]}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick insight */}
        {summary && (
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground">
              {summary.todayProfit >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  💰 {language === 'bn' ? 'আজকের লাভ' : "Today's profit"}: ৳{summary.todayProfit.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  📉 {language === 'bn' ? 'আজকের ক্ষতি' : "Today's loss"}: ৳{Math.abs(summary.todayProfit).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
