import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useExpenses, useIncome } from '@/hooks/useFarmManagement';
import { useActiveBatchStart } from '@/hooks/useActiveBatchStart';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';
import { FinanceExportButton } from '@/components/farm/FinanceExportButton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';

type Bucket = { key: string; label: string; income: number; expense: number; net: number };

function formatBDT(n: number) {
  return new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(n) + ' ৳';
}

function bucketize(
  income: { amount: number; income_date: string }[] = [],
  expenses: { amount: number; expense_date: string }[] = [],
  mode: 'daily' | 'monthly',
): Bucket[] {
  const map = new Map<string, Bucket>();

  const keyOf = (d: string) => (mode === 'daily' ? d : d.slice(0, 7));
  const labelOf = (key: string) => {
    if (mode === 'daily') {
      const dt = new Date(key);
      return dt.toLocaleDateString('bn-BD', { day: '2-digit', month: 'short' });
    }
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('bn-BD', {
      month: 'short',
      year: 'numeric',
    });
  };

  for (const i of income) {
    const k = keyOf(i.income_date);
    const b = map.get(k) ?? { key: k, label: labelOf(k), income: 0, expense: 0, net: 0 };
    b.income += Number(i.amount) || 0;
    map.set(k, b);
  }
  for (const e of expenses) {
    const k = keyOf(e.expense_date);
    const b = map.get(k) ?? { key: k, label: labelOf(k), income: 0, expense: 0, net: 0 };
    b.expense += Number(e.amount) || 0;
    map.set(k, b);
  }
  return Array.from(map.values())
    .map((b) => ({ ...b, net: b.income - b.expense }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export default function FinanceReportPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const days = mode === 'daily' ? 30 : 365;

  // Optional custom date range — overrides the default `days` window.
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pull a wide window so custom ranges still resolve.
  const fetchDays = startDate ? 365 : days;

  const { data: expenses = [] } = useExpenses(fetchDays);
  const { data: income = [] } = useIncome(fetchDays);
  const batchStart = useActiveBatchStart();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const activeBatchId = isLayer
    ? activeLayerBatch?.id ?? null
    : isBroiler
      ? (activeBroilerBatch as any)?.id ?? null
      : null;

  const inDateRange = (date: string | undefined): boolean => {
    if (!date) return false;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  };

  const scopedExpenses = useMemo(() => {
    const scope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart };
    return expenses.filter((row: any) =>
      matchesActiveFinanceScope(row, 'expense', scope) &&
      (!startDate && !endDate ? true : inDateRange(row.expense_date)),
    );
  }, [expenses, isLayer, isBroiler, activeBatchId, batchStart, startDate, endDate]);

  const scopedIncome = useMemo(() => {
    const scope = { mode: getFinanceMode(isLayer, isBroiler), activeBatchId, batchStart };
    return income.filter((row: any) =>
      matchesActiveFinanceScope(row, 'income', scope) &&
      (!startDate && !endDate ? true : inDateRange(row.income_date)),
    );
  }, [income, isLayer, isBroiler, activeBatchId, batchStart, startDate, endDate]);

  const buckets = useMemo(
    () => bucketize(scopedIncome as any, scopedExpenses as any, mode),
    [scopedIncome, scopedExpenses, mode],
  );

  const rangeLabel = startDate || endDate
    ? `${startDate || '…'} → ${endDate || '…'}`
    : mode === 'daily' ? 'গত ৩০ দিন' : 'গত ১২ মাস';

  const financeMode = getFinanceMode(isLayer, isBroiler);

  const totals = useMemo(() => {
    const totalIncome = scopedIncome.reduce((s, r: any) => s + Number(r.amount || 0), 0);
    const totalExpense = scopedExpenses.reduce((s, r: any) => s + Number(r.amount || 0), 0);
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [scopedIncome, scopedExpenses]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container mx-auto px-4 py-4 max-w-5xl space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/farm')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">📊 আয়-ব্যয় সারাংশ রিপোর্ট</h1>
            <p className="text-sm text-muted-foreground">দৈনিক ও মাসিক হিসাব এবং নেট ব্যালেন্স</p>
          </div>
          <FinanceExportButton
            income={scopedIncome}
            expenses={scopedExpenses}
            mode={financeMode}
            rangeLabel={rangeLabel}
            startDate={startDate || null}
            endDate={endDate || null}
          />
        </motion.div>

        {/* Date range filter — applied to both income & expense before export */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <Label htmlFor="from-date" className="text-xs text-muted-foreground">
                শুরুর তারিখ
              </Label>
              <SmartDatePicker
                value={startDate || null}
                onChange={(iso) => setStartDate(iso || '')}
                disableFuture
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label htmlFor="to-date" className="text-xs text-muted-foreground">
                শেষ তারিখ
              </Label>
              <SmartDatePicker
                value={endDate || null}
                onChange={(iso) => setEndDate(iso || '')}
                disableFuture
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(''); setEndDate(''); }}
              >
                রিসেট
              </Button>
            )}
            <p className="text-xs text-muted-foreground basis-full">
              📌 ফিল্টার অনুযায়ী সব আয়-ব্যয় এক্সপোর্ট হবে ({financeMode === 'layer' ? 'লেয়ার' : financeMode === 'broiler' ? 'ব্রয়লার' : 'মিশ্র'} মোড)
            </p>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-status-normal">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">মোট আয়</p>
                <p className="text-xl font-bold text-status-normal">
                  {formatBDT(totals.totalIncome)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-status-normal/70" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-status-danger">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">মোট ব্যয়</p>
                <p className="text-xl font-bold text-status-danger">
                  {formatBDT(totals.totalExpense)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-status-danger/70" />
            </CardContent>
          </Card>
          <Card
            className={`border-l-4 ${totals.net >= 0 ? 'border-l-primary' : 'border-l-status-warning'}`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">নেট ব্যালেন্স</p>
                <p
                  className={`text-xl font-bold ${
                    totals.net >= 0 ? 'text-primary' : 'text-status-warning'
                  }`}
                >
                  {formatBDT(totals.net)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-primary/70" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs daily / monthly */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'daily' | 'monthly')}>
          <TabsList className="grid grid-cols-2 w-full md:w-64">
            <TabsTrigger value="daily">📅 দৈনিক (৩০ দিন)</TabsTrigger>
            <TabsTrigger value="monthly">🗓️ মাসিক (১২ মাস)</TabsTrigger>
          </TabsList>

          <TabsContent value={mode} className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  আয় বনাম ব্যয় ({mode === 'daily' ? 'দৈনিক' : 'মাসিক'})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {buckets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    কোনো ডেটা পাওয়া যায়নি
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={buckets}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: any) => formatBDT(Number(v))}
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="আয়" fill="hsl(var(--status-normal))" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="expense"
                        name="ব্যয়"
                        fill="hsl(var(--status-danger))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        name="নেট"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">বিস্তারিত তালিকা</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">{mode === 'daily' ? 'তারিখ' : 'মাস'}</th>
                      <th className="py-2 pr-2 text-right">আয়</th>
                      <th className="py-2 pr-2 text-right">ব্যয়</th>
                      <th className="py-2 text-right">নেট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets
                      .slice()
                      .reverse()
                      .map((b) => (
                        <tr key={b.key} className="border-b last:border-0">
                          <td className="py-2 pr-2">{b.label}</td>
                          <td className="py-2 pr-2 text-right text-status-normal">
                            {formatBDT(b.income)}
                          </td>
                          <td className="py-2 pr-2 text-right text-status-danger">
                            {formatBDT(b.expense)}
                          </td>
                          <td
                            className={`py-2 text-right font-semibold ${
                              b.net >= 0 ? 'text-primary' : 'text-status-warning'
                            }`}
                          >
                            {formatBDT(b.net)}
                          </td>
                        </tr>
                      ))}
                    {buckets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          কোনো এন্ট্রি নেই
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
