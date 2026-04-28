import { motion } from 'framer-motion';
import { Egg, Wheat, Skull, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { Card, CardContent } from '@/components/ui/card';

interface FarmInputCardsProps {
  onCardClick: (type: 'egg' | 'feed' | 'mortality' | 'finance') => void;
  /**
   * Cards to show. Defaults to all four (Layer mode).
   * For Broiler mode, pass ['mortality', 'finance'] since egg/feed are handled in Batch tab.
   */
  show?: Array<'egg' | 'feed' | 'mortality' | 'finance'>;
}

export function FarmInputCards({ onCardClick, show }: FarmInputCardsProps) {
  const { language } = useAuth();
  const { data: summary } = useTodaySummary();

  const allItems = [
    {
      key: 'egg' as const,
      icon: Egg,
      title: language === 'bn' ? '🥚 ডিম উৎপাদন' : '🥚 Egg Production',
      subtitle: language === 'bn' ? 'আজকের ডিম সংখ্যা লিখুন' : "Enter today's egg count",
      todayValue: summary?.todayEggs ?? 0,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      key: 'feed' as const,
      icon: Wheat,
      title: language === 'bn' ? '🌾 খাদ্য ব্যবস্থাপনা' : '🌾 Feed Management',
      subtitle: language === 'bn' ? 'খাদ্য খরচ ও স্টক' : 'Feed usage & stock',
      todayValue: null,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'mortality' as const,
      icon: Skull,
      title: language === 'bn' ? '💀 মৃত্যু রেকর্ড' : '💀 Mortality Record',
      subtitle: language === 'bn' ? 'মৃত মুরগি রেকর্ড করুন' : 'Record bird deaths',
      todayValue: summary?.todayMortality ?? 0,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      key: 'finance' as const,
      icon: Wallet,
      title: language === 'bn' ? '💰 আয়-ব্যয় হিসাব' : '💰 Income & Expenses',
      subtitle: language === 'bn' ? 'আর্থিক লেনদেন রেকর্ড' : 'Financial transactions',
      todayValue: summary ? summary.todayIncome - summary.todayExpenses : null,
      todayLabel: language === 'bn' ? 'আজ' : 'Today',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ];

  const items = show ? allItems.filter(i => show.includes(i.key)) : allItems;

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.08 }}
          onClick={() => onCardClick(item.key)}
          className="cursor-pointer"
        >
          <Card 
            className="transition-all active:scale-[0.98] hover:shadow-md"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
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
                        ? (item.todayValue >= 0 ? 'text-green-600' : 'text-destructive')
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
