import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Egg, Scale, Bird } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveBatch, useBatchWeights, useBatchFeed } from '@/hooks/useBroilerData';
import { Card, CardContent } from '@/components/ui/card';

interface FarmStatsHeaderProps {
  onFlockClick: () => void;
}

interface StatItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
  isCurrency?: boolean;
}

export function FarmStatsHeader({ onFlockClick }: FarmStatsHeaderProps) {
  const { language } = useAuth();
  const summary = useFarmSummary();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  const { data: weights } = useBatchWeights(activeBatch?.id);
  const { data: feedRecords } = useBatchFeed(activeBatch?.id);

  // Get latest weight
  const latestWeight = weights?.length ? weights[weights.length - 1] : null;

  // Calculate FCR for broiler
  const calculateBroilerFCR = () => {
    if (!activeBatch || !latestWeight || !feedRecords?.length) return 0;
    const totalFeedKg = feedRecords.reduce((sum, f) => sum + Number(f.quantity_kg), 0);
    const avgWeightKg = latestWeight.average_weight_grams / 1000;
    const totalBirds = activeBatch.current_bird_count;
    const totalWeightGainKg = (avgWeightKg - 0.042) * totalBirds; // 42g is chick starting weight
    if (totalWeightGainKg <= 0) return 0;
    return totalFeedKg / totalWeightGainKg;
  };

  // Layer stats
  const layerStats: StatItem[] = [
    {
      key: 'birds',
      icon: Users,
      value: summary.flockInfo?.total_birds ?? 0,
      label: language === 'bn' ? 'মোট মুরগি' : 'Total Birds',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      onClick: onFlockClick,
    },
    {
      key: 'eggs',
      icon: Egg,
      value: summary.totalEggs,
      label: language === 'bn' ? 'মোট ডিম (৩০দিন)' : 'Eggs (30d)',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      key: 'profit',
      icon: summary.profit >= 0 ? TrendingUp : TrendingDown,
      value: summary.profit,
      label: summary.profit >= 0 
        ? (language === 'bn' ? 'লাভ' : 'Profit')
        : (language === 'bn' ? 'ক্ষতি' : 'Loss'),
      color: summary.profit >= 0 ? 'text-green-600' : 'text-destructive',
      bgColor: summary.profit >= 0 ? 'bg-green-500/10' : 'bg-destructive/10',
      isCurrency: true,
    },
  ];

  // Broiler stats
  const currentFCR = calculateBroilerFCR();
  
  const broilerStats: StatItem[] = [
    {
      key: 'birds',
      icon: Bird,
      value: activeBatch?.current_bird_count ?? 0,
      label: language === 'bn' ? 'বর্তমান মুরগি' : 'Current Birds',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      key: 'weight',
      icon: Scale,
      value: latestWeight?.average_weight_grams ?? 0,
      label: language === 'bn' ? 'গড় ওজন (গ্রাম)' : 'Avg Weight (g)',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      key: 'fcr',
      icon: currentFCR > 0 && currentFCR < 2 ? TrendingUp : TrendingDown,
      value: currentFCR > 0 ? currentFCR.toFixed(2) : '--',
      label: 'FCR',
      color: currentFCR > 0 && currentFCR < 2 ? 'text-green-600' : 'text-amber-600',
      bgColor: currentFCR > 0 && currentFCR < 2 ? 'bg-green-500/10' : 'bg-amber-500/10',
    },
  ];

  const stats = isBroiler ? broilerStats : layerStats;

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className={`${stat.onClick ? 'cursor-pointer active:scale-[0.98]' : ''} transition-transform`}
            onClick={stat.onClick}
          >
            <CardContent className="p-3 text-center">
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${stat.bgColor} mb-1`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-base font-bold ${stat.color}`}>
                {stat.isCurrency ? '৳' : ''}
                {typeof stat.value === 'number' 
                  ? Math.abs(stat.value).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')
                  : stat.value
                }
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
