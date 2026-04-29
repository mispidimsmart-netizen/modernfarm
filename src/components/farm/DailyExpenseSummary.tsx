import { useAuth } from '@/context/AuthContext';
import { useExpenses, useIncome } from '@/hooks/useFarmManagement';
import { useActiveBatchStart } from '@/hooks/useActiveBatchStart';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useMemo } from 'react';

export function DailyExpenseSummary() {
  const { language } = useAuth();
  const { data: expenses } = useExpenses(7);
  const { data: income } = useIncome(7);
  const batchStart = useActiveBatchStart();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId: string | null = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;
  const financeScope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart };

  const today = new Date().toISOString().split('T')[0];
  const showData = !batchStart || today >= batchStart;

  const todayExpenses = useMemo(() => {
    if (!showData) return [];
    return (expenses ?? []).filter((e: any) => {
      if (e.expense_date !== today) return false;
      return matchesActiveFinanceScope(e, 'expense', financeScope);
    });
  }, [expenses, today, showData, financeScope]);

  const todayIncome = useMemo(() => {
    if (!showData) return [];
    return (income ?? []).filter((i: any) => {
      if (i.income_date !== today) return false;
      return matchesActiveFinanceScope(i, 'income', financeScope);
    });
  }, [income, today, showData, financeScope]);

  const totalExpense = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = todayIncome.reduce((s, i) => s + Number(i.amount), 0);
  const netProfit = totalIncome - totalExpense;

  // Group expenses by category
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    todayExpenses.forEach(e => {
      const cat = e.category || 'other';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries());
  }, [todayExpenses]);

  const categoryLabels: Record<string, { bn: string; en: string }> = {
    feed: { bn: '🌾 খাদ্য', en: '🌾 Feed' },
    medicine: { bn: '💊 ওষুধ', en: '💊 Medicine' },
    electricity: { bn: '⚡ বিদ্যুৎ', en: '⚡ Electricity' },
    labor: { bn: '👷 শ্রমিক', en: '👷 Labor' },
    transport: { bn: '🚛 পরিবহন', en: '🚛 Transport' },
    other: { bn: '📦 অন্যান্য', en: '📦 Other' },
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Wallet className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-sm font-semibold">
            {language === 'bn' ? 'আজকের আর্থিক সারাংশ' : "Today's Financial Summary"}
          </p>
        </div>

        {/* Income / Expense / Net */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-2 text-center">
            <ArrowUpRight className="h-3 w-3 mx-auto text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'আয়' : 'Income'}</p>
            <p className="text-sm font-bold text-emerald-600">৳{totalIncome.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-2 text-center">
            <ArrowDownRight className="h-3 w-3 mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'ব্যয়' : 'Expense'}</p>
            <p className="text-sm font-bold text-destructive">৳{totalExpense.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</p>
          </div>
          <div className={`rounded-xl p-2 text-center ${netProfit >= 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-destructive/5 border border-destructive/20'}`}>
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'নেট' : 'Net'}</p>
            <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {netProfit >= 0 ? '+' : ''}৳{netProfit.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {language === 'bn' ? 'খরচের বিভাজন:' : 'Expense breakdown:'}
            </p>
            <div className="space-y-1">
              {categories.map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-1.5">
                  <span>{categoryLabels[cat]?.[language] ?? cat}</span>
                  <span className="font-medium">৳{amount.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {categories.length === 0 && totalIncome === 0 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            {language === 'bn' ? 'আজ কোনো লেনদেন নেই' : 'No transactions today'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
