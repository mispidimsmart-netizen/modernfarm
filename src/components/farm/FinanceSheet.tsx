import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, BarChart3, Egg } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses, useIncome, useAddExpense, useAddIncome, useEggProduction } from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FinanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'feed', bn: 'খাদ্য', en: 'Feed' },
  { value: 'medicine', bn: 'ওষুধ', en: 'Medicine' },
  { value: 'electricity', bn: 'বিদ্যুৎ', en: 'Electricity' },
  { value: 'labor', bn: 'শ্রমিক', en: 'Labor' },
  { value: 'maintenance', bn: 'মেরামত', en: 'Maintenance' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const INCOME_CATEGORIES = [
  { value: 'eggs', bn: 'ডিম বিক্রি', en: 'Egg Sales' },
  { value: 'culled_birds', bn: 'মুরগি বিক্রি', en: 'Culled Birds' },
  { value: 'manure', bn: 'সার বিক্রি', en: 'Manure Sales' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export function FinanceSheet({ open, onOpenChange }: FinanceSheetProps) {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { data: expenses } = useExpenses();
  const { data: income } = useIncome();
  const { data: eggProduction } = useEggProduction(60);
  const addExpense = useAddExpense();
  const addIncome = useAddIncome();

  // Calculate available egg stock = total produced (last 60d) - total sold via income(category=eggs).
  // Broken eggs are subtracted as they're not sellable.
  const totalEggsProduced = (eggProduction ?? []).reduce(
    (sum, e) => sum + (e.total_eggs || 0) - (e.broken || 0),
    0
  );
  const totalEggsSold = (income ?? [])
    .filter((i) => i.category === 'eggs')
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const availableEggStock = Math.max(0, totalEggsProduced - totalEggsSold);
  
  const [activeTab, setActiveTab] = useState('summary');
  const [expenseForm, setExpenseForm] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'feed',
    amount: 0,
    description: '',
  });
  
  const [incomeForm, setIncomeForm] = useState({
    income_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'eggs',
    amount: 0,
    quantity: 0,
    unit_price: 0,
    description: '',
  });

  const t = {
    title: { bn: 'আয়-ব্যয় হিসাব', en: 'Finance' },
    summary: { bn: 'সারাংশ', en: 'Summary' },
    addExpense: { bn: 'খরচ যোগ', en: 'Add Expense' },
    addIncome: { bn: 'আয় যোগ', en: 'Add Income' },
    totalIncome: { bn: 'মোট আয়', en: 'Total Income' },
    totalExpense: { bn: 'মোট খরচ', en: 'Total Expense' },
    profit: { bn: 'লাভ', en: 'Profit' },
    loss: { bn: 'ক্ষতি', en: 'Loss' },
    category: { bn: 'ক্যাটাগরি', en: 'Category' },
    amount: { bn: 'টাকা', en: 'Amount' },
    date: { bn: 'তারিখ', en: 'Date' },
    description: { bn: 'বিবরণ', en: 'Description' },
    quantity: { bn: 'পরিমাণ', en: 'Quantity' },
    unitPrice: { bn: 'একক দাম', en: 'Unit Price' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    taka: { bn: '৳', en: '৳' },
    last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
  };

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalIncome = income?.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;
  const profit = totalIncome - totalExpenses;

  const handleAddExpense = () => {
    addExpense.mutate({
      ...expenseForm,
      description: expenseForm.description || null,
    });
  };

  const handleAddIncome = () => {
    addIncome.mutate({
      ...incomeForm,
      quantity: incomeForm.quantity || null,
      unit_price: incomeForm.unit_price || null,
      description: incomeForm.description || null,
    });
  };

  const updateIncomeAmount = (field: 'quantity' | 'unit_price', value: number) => {
    setIncomeForm(prev => {
      const updated = { ...prev, [field]: value };
      if (updated.quantity && updated.unit_price) {
        updated.amount = updated.quantity * updated.unit_price;
      }
      return updated;
    });
  };

  // Combine and sort all transactions
  const allTransactions = [
    ...(expenses?.map(e => ({ ...e, type: 'expense' as const, date: e.expense_date })) ?? []),
    ...(income?.map(i => ({ ...i, type: 'income' as const, date: i.income_date })) ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">{t.summary[language]}</TabsTrigger>
            <TabsTrigger value="expense">{t.addExpense[language]}</TabsTrigger>
            <TabsTrigger value="income">{t.addIncome[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 pt-4">
            {/* Summary Cards */}
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

            {/* Profit/Loss */}
            <Card className={profit >= 0 ? 'bg-green-100' : 'bg-red-100'}>
              <CardContent className="flex items-center justify-between p-4">
                <span className="font-medium">
                  {profit >= 0 ? t.profit[language] : t.loss[language]}
                </span>
                <span className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.taka[language]}{Math.abs(profit).toLocaleString()}
                </span>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                navigate('/finance-report');
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              পূর্ণ আয়-ব্যয় রিপোর্ট দেখুন
            </Button>

            {/* Recent Transactions */}
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {allTransactions.slice(0, 20).map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {tx.type === 'income' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {tx.type === 'income' 
                            ? INCOME_CATEGORIES.find(c => c.value === tx.category)?.[language]
                            : EXPENSE_CATEGORIES.find(c => c.value === tx.category)?.[language]
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), 'dd MMM', { 
                            locale: language === 'bn' ? bn : enUS 
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{t.taka[language]}{Number(tx.amount).toLocaleString()}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="expense" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.category[language]}</Label>
              <Select 
                value={expenseForm.category} 
                onValueChange={(v) => setExpenseForm(p => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.amount[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.date[language]}</Label>
                <SmartDatePicker
                  value={expenseForm.expense_date || null}
                  onChange={(iso) => setExpenseForm(p => ({ ...p, expense_date: iso }))}
                  disableFuture
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.description[language]}</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                placeholder={language === 'bn' ? 'বিবরণ লিখুন...' : 'Enter description...'}
              />
            </div>

            <Button 
              onClick={handleAddExpense} 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={addExpense.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>

          <TabsContent value="income" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.category[language]}</Label>
              <Select 
                value={incomeForm.category} 
                onValueChange={(v) => setIncomeForm(p => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {incomeForm.category === 'eggs' && (
              <>
                {/* Egg stock hint — small, non-intrusive */}
                <div
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                    availableEggStock > 0
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Egg className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-tight">
                    {language === 'bn'
                      ? <>স্টকে আছে: <span className="font-semibold">{availableEggStock.toLocaleString('bn-BD')}</span> টি ডিম <span className="opacity-70">(গত ৬০ দিন)</span></>
                      : <>In stock: <span className="font-semibold">{availableEggStock.toLocaleString()}</span> eggs <span className="opacity-70">(last 60d)</span></>}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.quantity[language]}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={incomeForm.quantity || ''}
                      onChange={(e) => updateIncomeAmount('quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.unitPrice[language]}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={incomeForm.unit_price || ''}
                      onChange={(e) => updateIncomeAmount('unit_price', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.amount[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={incomeForm.amount || ''}
                  onChange={(e) => setIncomeForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.date[language]}</Label>
                <SmartDatePicker
                  value={incomeForm.income_date || null}
                  onChange={(iso) => setIncomeForm(p => ({ ...p, income_date: iso }))}
                  disableFuture
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.description[language]}</Label>
              <Input
                value={incomeForm.description}
                onChange={(e) => setIncomeForm(p => ({ ...p, description: e.target.value }))}
                placeholder={language === 'bn' ? 'বিবরণ লিখুন...' : 'Enter description...'}
              />
            </div>

            <Button 
              onClick={handleAddIncome} 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={addIncome.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
