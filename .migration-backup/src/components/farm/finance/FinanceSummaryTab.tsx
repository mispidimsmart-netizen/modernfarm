import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, BarChart3, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, FINANCE_LABELS as t, type Lang } from './financeConstants';

interface Props {
  language: Lang;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  allTransactions: any[];
  onViewReport: () => void;
  onEditExpense: (tx: any) => void;
  onEditIncome: (tx: any) => void;
  onDelete: (tx: { id: string; type: 'expense' | 'income' }) => void;
}

export function FinanceSummaryTab({
  language,
  totalIncome,
  totalExpenses,
  profit,
  allTransactions,
  onViewReport,
  onEditExpense,
  onEditIncome,
  onDelete,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-500/10">
          <CardContent className="p-3 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-600" />
            <p className="text-xs text-muted-foreground">{t.totalIncome[language]}</p>
            <p className="text-lg font-bold text-green-600">
              {t.taka[language]}{totalIncome.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10">
          <CardContent className="p-3 text-center">
            <TrendingDown className="mx-auto mb-1 h-5 w-5 text-red-600" />
            <p className="text-xs text-muted-foreground">{t.totalExpense[language]}</p>
            <p className="text-lg font-bold text-red-600">
              {t.taka[language]}{totalExpenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className={profit >= 0 ? 'bg-green-100' : 'bg-red-100'}>
        <CardContent className="flex items-center justify-between p-4">
          <span className="font-medium">{profit >= 0 ? t.profit[language] : t.loss[language]}</span>
          <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {t.taka[language]}{Math.abs(profit).toLocaleString()}
          </span>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onViewReport}>
        <BarChart3 className="mr-2 h-4 w-4" />
        পূর্ণ আয়-ব্যয় রিপোর্ট দেখুন
      </Button>

      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {allTransactions.slice(0, 20).map((tx) => (
          <Card key={`${tx.type}-${tx.id}`}>
            <CardContent className="flex items-center justify-between gap-2 p-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {tx.type === 'income' ? (
                  <ArrowUpCircle className="h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {tx.type === 'income'
                      ? INCOME_CATEGORIES.find((c) => c.value === tx.category)?.[language]
                      : EXPENSE_CATEGORIES.find((c) => c.value === tx.category)?.[language]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), 'dd MMM', { locale: language === 'bn' ? bn : enUS })}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'income' ? '+' : '-'}{t.taka[language]}{Number(tx.amount).toLocaleString()}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => (tx.type === 'expense' ? onEditExpense(tx) : onEditIncome(tx))}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onDelete({ id: tx.id, type: tx.type })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
