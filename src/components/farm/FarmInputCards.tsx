import { motion } from 'framer-motion';
import { Egg, Wheat, Skull, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { Card, CardContent } from '@/components/ui/card';

interface FarmInputCardsProps {
  onCardClick: (type: 'egg' | 'feed' | 'mortality' | 'finance') => void;
}

export function FarmInputCards({ onCardClick }: FarmInputCardsProps) {
  const { language } = useAuth();
  const { data: summary } = useTodaySummary();

  const items = [
    {
      key: 'egg' as const,
      icon: Egg,
      title: language === 'bn' ? '🥚 ডিম উৎপাদন' : '🥚 Egg Production',
      subtitle: language === 'bn' ? 'আজকের ডিম সংখ্যা লিখুন' : "Enter today's egg count",
      todayValue: summary?.todayEggs ?? 0,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      key: 'feed' as const,
      icon: Wheat,
      title: language === 'bn' ? '🌾 খাদ্য ব্যবস্থাপনা' : '🌾 Feed Management',
      subtitle: language === 'bn' ? 'খাদ্য খরচ ও স্টক' : 'Feed usage & stock',
      todayValue: null,
      gradient: 'from-emerald-500/20 via-green-500/10 to-transparent',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
    {
      key: 'mortality' as const,
      icon: Skull,
      title: language === 'bn' ? '💀 মৃত্যু রেকর্ড' : '💀 Mortality Record',
      subtitle: language === 'bn' ? 'মৃত মুরগি রেকর্ড করুন' : 'Record bird deaths',
      todayValue: summary?.todayMortality ?? 0,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      gradient: 'from-red-500/20 via-rose-500/10 to-transparent',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-500/30',
    },
    {
      key: 'finance' as const,
      icon: Wallet,
      title: language === 'bn' ? '💰 আয়-ব্যয় হিসাব' : '💰 Income & Expenses',
      subtitle: language === 'bn' ? 'আর্থিক লেনদেন রেকর্ড' : 'Financial transactions',
      todayValue: summary ? summary.todayIncome - summary.todayExpenses : null,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-500/30',
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <Card 
            className={`cursor-pointer transition-all active:scale-[0.98] hover:shadow-md overflow-hidden border ${item.borderColor}`}
            onClick={() => onCardClick(item.key)}
          >
            <CardContent className="p-0">
              <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} pointer-events-none`} />
              <div className="relative flex items-center gap-4 p-4">
                {/* Icon */}
                <div className={`h-12 w-12 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                
                {/* Today's value */}
                {item.todayValue !== null && (
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${
                      item.key === 'finance' 
                        ? (item.todayValue >= 0 ? 'text-green-600' : 'text-red-600')
                        : item.iconColor
                    }`}>
                      {item.key === 'finance' ? '৳' : ''}
                      {Math.abs(item.todayValue).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.todayLabel}</p>
                  </div>
                )}
                
                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
