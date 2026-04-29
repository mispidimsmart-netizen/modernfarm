import { motion } from 'framer-motion';
import { Egg, Wheat, Skull, Wallet, Scale, Pill, Package } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { Card, CardContent } from '@/components/ui/card';

export type EntryActionKey =
  | 'egg'
  | 'feed'
  | 'mortality'
  | 'finance'
  | 'weight'
  | 'broiler-feed'
  | 'medicine'
  | 'feed-stock'
  | 'schedule'
  | 'batch';

interface FarmInputCardsProps {
  onCardClick: (type: EntryActionKey) => void;
  /** Filter the cards rendered (defaults: all four legacy keys for backward compat). */
  show?: EntryActionKey[];
  /** Render in grouped sections instead of a flat list. */
  grouped?: boolean;
  /** Show broiler-specific cards in the production group. */
  isBroiler?: boolean;
}

interface ItemDef {
  key: EntryActionKey;
  icon: typeof Egg;
  title: { bn: string; en: string };
  todayValue: number | null;
  iconBg: string;
  iconColor: string;
  isFinance?: boolean;
}

export function FarmInputCards({
  onCardClick,
  show,
  grouped = false,
  isBroiler = false,
}: FarmInputCardsProps) {
  const { language } = useAuth();
  const { data: summary } = useTodaySummary();

  const allItems: ItemDef[] = [
    {
      key: 'egg',
      icon: Egg,
      title: { bn: '🥚 ডিম', en: '🥚 Eggs' },
      todayValue: summary?.todayEggs ?? 0,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      key: 'weight',
      icon: Scale,
      title: { bn: '⚖️ ওজন', en: '⚖️ Weight' },
      todayValue: null,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'broiler-feed',
      icon: Wheat,
      title: { bn: '🌾 খাদ্য', en: '🌾 Feed' },
      todayValue: null,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'feed',
      icon: Wheat,
      title: { bn: '🌾 খাদ্য', en: '🌾 Feed' },
      todayValue: null,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      key: 'mortality',
      icon: Skull,
      title: { bn: '💀 মৃত্যু', en: '💀 Mortality' },
      todayValue: summary?.todayMortality ?? 0,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
    {
      key: 'medicine',
      icon: Pill,
      title: { bn: '💊 ওষুধ', en: '💊 Medicine' },
      todayValue: null,
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
    {
      key: 'finance',
      icon: Wallet,
      title: { bn: '💰 আয়-ব্যয়', en: '💰 Finance' },
      todayValue: summary ? summary.todayIncome - summary.todayExpenses : null,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      isFinance: true,
    },
    {
      key: 'feed-stock',
      icon: Package,
      title: { bn: '📦 ফিড স্টক', en: '📦 Feed Stock' },
      todayValue: null,
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  const renderCard = (item: ItemDef, index: number) => (
    <motion.div
      key={item.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onCardClick(item.key)}
      className="cursor-pointer"
    >
      <Card className="h-full transition-all active:scale-[0.97] hover:shadow-md">
        <CardContent className="p-3">
          <div className="flex flex-col items-center text-center gap-1.5">
            <div
              className={`h-11 w-11 rounded-xl ${item.iconBg} flex items-center justify-center`}
            >
              <item.icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
            <p className="font-semibold text-sm leading-tight">{item.title[language]}</p>
            {item.todayValue !== null && (
              <p
                className={`text-base font-bold ${
                  item.isFinance
                    ? item.todayValue >= 0
                      ? 'text-green-600'
                      : 'text-destructive'
                    : item.iconColor
                }`}
              >
                {item.isFinance ? '৳' : ''}
                {Math.abs(item.todayValue).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Legacy flat list mode (kept for backward compatibility)
  if (!grouped) {
    const items = show
      ? allItems.filter((i) => show.includes(i.key))
      : allItems.filter((i) => ['egg', 'feed', 'mortality', 'finance'].includes(i.key));
    return (
      <div className="grid grid-cols-2 gap-3">{items.map((it, i) => renderCard(it, i))}</div>
    );
  }

  // Grouped mode
  const productionKeys: EntryActionKey[] = isBroiler
    ? ['weight', 'broiler-feed']
    : ['egg', 'feed'];
  const healthKeys: EntryActionKey[] = ['mortality', 'medicine'];
  const financeKeys: EntryActionKey[] = ['finance', 'feed-stock'];

  const filterAndOrder = (keys: EntryActionKey[]) =>
    keys
      .filter((k) => !show || show.includes(k))
      .map((k) => allItems.find((i) => i.key === k)!)
      .filter(Boolean);

  const Section = ({
    titleBn,
    titleEn,
    items,
  }: {
    titleBn: string;
    titleEn: string;
    items: ItemDef[];
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {language === 'bn' ? titleBn : titleEn}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, i) => renderCard(it, i))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Section
        titleBn="📈 দৈনিক উৎপাদন"
        titleEn="📈 Daily Production"
        items={filterAndOrder(productionKeys)}
      />
      <Section
        titleBn="🏥 স্বাস্থ্য ও ক্ষতি"
        titleEn="🏥 Health & Loss"
        items={filterAndOrder(healthKeys)}
      />
      <Section
        titleBn="💼 আর্থিক"
        titleEn="💼 Financial"
        items={filterAndOrder(financeKeys)}
      />
    </div>
  );
}
