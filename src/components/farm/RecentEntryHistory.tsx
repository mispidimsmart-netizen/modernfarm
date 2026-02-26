import { useAuth } from '@/context/AuthContext';
import { useEggProduction, useExpenses, useMortalityRecords } from '@/hooks/useFarmManagement';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Egg, Skull, Wallet } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

export function RecentEntryHistory() {
  const { language } = useAuth();
  const { data: eggs } = useEggProduction(7);
  const { data: expenses } = useExpenses(7);
  const { data: mortality } = useMortalityRecords(7);

  const today = new Date().toISOString().split('T')[0];

  const hasTodayEggs = eggs?.some(e => e.production_date === today);
  const hasTodayExpense = expenses?.some(e => e.expense_date === today);

  // Build recent entries list (last 5)
  const recentEntries = [
    ...(eggs?.slice(0, 3).map(e => ({
      type: 'egg' as const,
      date: e.production_date,
      label: language === 'bn' ? `🥚 ডিম: ${e.total_eggs}টি` : `🥚 Eggs: ${e.total_eggs}`,
      icon: Egg,
    })) ?? []),
    ...(mortality?.slice(0, 2).map(m => ({
      type: 'mortality' as const,
      date: m.record_date,
      label: language === 'bn' ? `💀 মৃত্যু: ${m.count}টি` : `💀 Deaths: ${m.count}`,
      icon: Skull,
    })) ?? []),
    ...(expenses?.slice(0, 2).map(e => ({
      type: 'expense' as const,
      date: e.expense_date,
      label: language === 'bn' ? `💰 খরচ: ৳${Number(e.amount).toLocaleString('bn-BD')}` : `💰 Expense: ৳${Number(e.amount).toLocaleString()}`,
      icon: Wallet,
    })) ?? []),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const missingEntries = !hasTodayEggs;

  return (
    <div className="space-y-3">
      {/* Missing Entry Reminder */}
      {missingEntries && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {language === 'bn' ? '⚠️ আজ এন্ট্রি হয়নি!' : '⚠️ No entry today!'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn'
                  ? 'ডিম উৎপাদন এন্ট্রি দিন যাতে রিপোর্ট সঠিক থাকে'
                  : 'Enter egg production to keep reports accurate'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!missingEntries && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {language === 'bn' ? '✅ আজকের এন্ট্রি সম্পন্ন' : '✅ Today\'s entry complete'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {language === 'bn' ? '📋 সাম্প্রতিক এন্ট্রি' : '📋 Recent Entries'}
          </p>
          <div className="space-y-1.5">
            {recentEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/40 px-3 py-2">
                <span className="flex-1">{entry.label}</span>
                <span className="text-muted-foreground">
                  {isToday(parseISO(entry.date))
                    ? (language === 'bn' ? 'আজ' : 'Today')
                    : format(parseISO(entry.date), 'dd MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
