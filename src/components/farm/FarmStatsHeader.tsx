import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Egg } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
import { Card, CardContent } from '@/components/ui/card';

interface FarmStatsHeaderProps {
  onFlockClick: () => void;
}

export function FarmStatsHeader({ onFlockClick }: FarmStatsHeaderProps) {
  const { language } = useAuth();
  const summary = useFarmSummary();

  const stats = [
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
                {Math.abs(stat.value).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
              <p className="text-[9px] text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
