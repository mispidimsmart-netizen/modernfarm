import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses, useIncome } from '@/hooks/useFarmManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface FinanceSummaryRangeProps {
  days: number;
}

const categoryLabels: Record<string, { bn: string; en: string }> = {
  feed: { bn: '🌾 খাদ্য', en: '🌾 Feed' },
  medicine: { bn: '💊 ওষুধ', en: '💊 Medicine' },
  electricity: { bn: '⚡ বিদ্যুৎ', en: '⚡ Electricity' },
  labor: { bn: '👷 শ্রমিক', en: '👷 Labor' },
  transport: { bn: '🚛 পরিবহন', en: '🚛 Transport' },
  other: { bn: '📦 অন্যান্য', en: '📦 Other' },
};

const incomeSourceLabels: Record<string, { bn: string; en: string }> = {
  egg_sale: { bn: '🥚 ডিম বিক্রি', en: '🥚 Egg sale' },
  bird_sale: { bn: '🐔 মুরগি বিক্রি', en: '🐔 Bird sale' },
  manure: { bn: '💩 সার বিক্রি', en: '💩 Manure' },
  other: { bn: '📦 অন্যান্য', en: '📦 Other' },
};

export function FinanceSummaryRange({ days }: FinanceSummaryRangeProps) {
  const { language } = useAuth();
  const { data: expenses } = useExpenses(days);
  const { data: income } = useIncome(days);
  const isBn = language === 'bn';
  const locale = isBn ? 'bn-BD' : 'en-US';

  const totals = useMemo(() => {
    const totalExpense = (expenses ?? []).reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalIncome = (income ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const net = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
    return { totalExpense, totalIncome, net, margin };
  }, [expenses, income]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    (expenses ?? []).forEach((e) => {
      const cat = e.category || 'other';
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const incomeBySource = useMemo(() => {
    const map = new Map<string, number>();
    (income ?? []).forEach((i: any) => {
      const src = i.source || 'other';
      map.set(src, (map.get(src) || 0) + Number(i.amount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [income]);

  const fmt = (n: number) => `৳${Math.round(n).toLocaleString(locale)}`;

  const hasAny = totals.totalExpense > 0 || totals.totalIncome > 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-sm font-semibold">
              {isBn ? 'আর্থিক সারাংশ' : 'Financial Summary'}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {isBn ? `গত ${days} দিন` : `Last ${days}d`}
          </span>
        </div>

        {/* Income / Expense / Net */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-2 text-center">
            <ArrowUpRight className="h-3 w-3 mx-auto text-emerald-500 mb-1" />
            <p className="text-[11px] text-muted-foreground">{isBn ? 'আয়' : 'Income'}</p>
            <p className="text-sm font-bold text-emerald-600">{fmt(totals.totalIncome)}</p>
          </div>
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-2 text-center">
            <ArrowDownRight className="h-3 w-3 mx-auto text-destructive mb-1" />
            <p className="text-[11px] text-muted-foreground">{isBn ? 'ব্যয়' : 'Expense'}</p>
            <p className="text-sm font-bold text-destructive">{fmt(totals.totalExpense)}</p>
          </div>
          <div
            className={`rounded-xl p-2 text-center ${
              totals.net >= 0
                ? 'bg-emerald-500/5 border border-emerald-500/20'
                : 'bg-destructive/5 border border-destructive/20'
            }`}
          >
            <p className="text-[11px] text-muted-foreground">{isBn ? 'নেট' : 'Net'}</p>
            <p
              className={`text-sm font-bold ${
                totals.net >= 0 ? 'text-emerald-600' : 'text-destructive'
              }`}
            >
              {totals.net >= 0 ? '+' : ''}
              {fmt(totals.net)}
            </p>
          </div>
        </div>

        {/* Profit margin & avg/day */}
        {hasAny && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {isBn ? 'মুনাফার হার' : 'Margin'}:{' '}
              <span className={totals.margin >= 0 ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                {totals.margin.toFixed(1)}%
              </span>
            </span>
            <span>
              {isBn ? 'দৈনিক গড় ব্যয়' : 'Avg/day'}: {fmt(totals.totalExpense / Math.max(1, days))}
            </span>
          </div>
        )}

        {/* Two-column breakdown */}
        {hasAny && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expenseByCategory.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  {isBn ? 'খরচের বিভাজন:' : 'Expense breakdown:'}
                </p>
                <div className="space-y-1">
                  {expenseByCategory.map(([cat, amount]) => {
                    const pct =
                      totals.totalExpense > 0 ? (amount / totals.totalExpense) * 100 : 0;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-3 py-1.5"
                      >
                        <span>{categoryLabels[cat]?.[language] ?? cat}</span>
                        <span className="font-medium">
                          {fmt(amount)}{' '}
                          <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {incomeBySource.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  {isBn ? 'আয়ের উৎস:' : 'Income sources:'}
                </p>
                <div className="space-y-1">
                  {incomeBySource.map(([src, amount]) => {
                    const pct =
                      totals.totalIncome > 0 ? (amount / totals.totalIncome) * 100 : 0;
                    return (
                      <div
                        key={src}
                        className="flex items-center justify-between text-xs bg-emerald-500/5 rounded-lg px-3 py-1.5"
                      >
                        <span>{incomeSourceLabels[src]?.[language] ?? src}</span>
                        <span className="font-medium">
                          {fmt(amount)}{' '}
                          <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasAny && (
          <p className="text-xs text-center text-muted-foreground py-2">
            {isBn
              ? `গত ${days} দিনে কোনো লেনদেন নেই`
              : `No transactions in the last ${days} days`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
