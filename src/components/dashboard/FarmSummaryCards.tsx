import { motion } from 'framer-motion';
import { Egg, TrendingUp, TrendingDown, Skull, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function FarmSummaryCards() {
  const { language } = useAuth();
  const { data: summary, isLoading } = useTodaySummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: 'eggs',
      icon: Egg,
      label: language === 'bn' ? 'আজকের ডিম' : "Today's Eggs",
      value: summary?.todayEggs ?? 0,
      subLabel: language === 'bn' 
        ? `A: ${summary?.todayGradeA ?? 0} | B: ${summary?.todayGradeB ?? 0}` 
        : `A: ${summary?.todayGradeA ?? 0} | B: ${summary?.todayGradeB ?? 0}`,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/20',
    },
    {
      id: 'profit',
      icon: (summary?.todayProfit ?? 0) >= 0 ? TrendingUp : TrendingDown,
      label: language === 'bn' ? 'আজকের লাভ/ক্ষতি' : "Today's P/L",
      value: `৳${Math.abs(summary?.todayProfit ?? 0).toLocaleString('bn-BD')}`,
      subLabel: (summary?.todayProfit ?? 0) >= 0 
        ? (language === 'bn' ? 'লাভ' : 'Profit')
        : (language === 'bn' ? 'ক্ষতি' : 'Loss'),
      color: (summary?.todayProfit ?? 0) >= 0 
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-red-500/10 text-red-600 dark:text-red-400',
      iconBg: (summary?.todayProfit ?? 0) >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20',
    },
    {
      id: 'income',
      icon: TrendingUp,
      label: language === 'bn' ? 'আজকের আয়' : "Today's Income",
      value: `৳${(summary?.todayIncome ?? 0).toLocaleString('bn-BD')}`,
      subLabel: language === 'bn' ? 'মোট আয়' : 'Total Income',
      color: 'bg-green-500/10 text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/20',
    },
    {
      id: 'expenses',
      icon: TrendingDown,
      label: language === 'bn' ? 'আজকের খরচ' : "Today's Expenses",
      value: `৳${(summary?.todayExpenses ?? 0).toLocaleString('bn-BD')}`,
      subLabel: language === 'bn' ? 'মোট ব্যয়' : 'Total Expenses',
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-500/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">
          {language === 'bn' ? 'আজকের সামারি' : "Today's Summary"}
        </h2>
        <Link 
          to="/farm" 
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {language === 'bn' ? 'বিস্তারিত' : 'Details'}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className={cn(
              'rounded-2xl p-4 shadow-card transition-all',
              'bg-card hover:shadow-lg'
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn('rounded-xl p-2', card.iconBg)}>
                <card.icon className={cn('h-5 w-5', card.color.split(' ')[1])} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
              <p className={cn('text-xs mt-1 font-medium', card.color.split(' ')[1])}>
                {card.subLabel}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Mortality Alert - Only show if there's mortality today */}
      {(summary?.todayMortality ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl bg-destructive/10 p-3 border border-destructive/20"
        >
          <div className="rounded-lg bg-destructive/20 p-2">
            <Skull className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {language === 'bn' 
                ? `আজ ${summary?.todayMortality}টি মুরগি মারা গেছে` 
                : `${summary?.todayMortality} birds died today`}
            </p>
          </div>
          <Link 
            to="/farm" 
            className="text-xs text-destructive hover:underline font-medium"
          >
            {language === 'bn' ? 'দেখুন' : 'View'}
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
