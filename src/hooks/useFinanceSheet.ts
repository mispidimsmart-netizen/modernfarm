import { useState } from 'react';
import { format } from 'date-fns';
import {
  useExpenses,
  useIncome,
  useAddExpense,
  useAddIncome,
  useEggProduction,
  useUpdateExpense,
  useDeleteExpense,
  useUpdateIncome,
  useDeleteIncome,
  type Expense,
  type Income,
} from '@/hooks/useFarmManagement';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { useFarmType } from '@/hooks/useFarmType';
import { getFinanceMode, matchesActiveFinanceScope } from '@/lib/financeScope';

/**
 * Central state + derived data for the FinanceSheet.
 * Behaviour is identical to the previous inline implementation.
 */
export function useFinanceSheet() {
  const { data: expenses } = useExpenses();
  const { data: income } = useIncome();
  const { data: eggProduction } = useEggProduction(60);
  const addExpense = useAddExpense();
  const addIncome = useAddIncome();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const updateIncome = useUpdateIncome();
  const deleteIncome = useDeleteIncome();

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editIncome, setEditIncome] = useState<Income | null>(null);
  const [deleteTx, setDeleteTx] = useState<{ id: string; type: 'expense' | 'income' } | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();

  const activeBatchId: string | null = isLayer
    ? (activeLayerBatch?.id ?? null)
    : isBroiler
      ? ((activeBroilerBatch as any)?.id ?? null)
      : null;

  const farmMode = getFinanceMode(isLayer, isBroiler);
  const financeScope = { mode: farmMode, activeBatchId, batchStart: null };

  const totalEggsProduced = (eggProduction ?? []).reduce(
    (sum, e) => sum + (e.total_eggs || 0) - (e.broken || 0),
    0
  );
  const totalEggsSold = (income ?? [])
    .filter((i) => i.category === 'eggs')
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const availableEggStock = Math.max(0, totalEggsProduced - totalEggsSold);

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

  const scopedExpenses = (expenses ?? []).filter((e: any) =>
    matchesActiveFinanceScope(e, 'expense', financeScope)
  );
  const scopedIncome = (income ?? []).filter((i: any) =>
    matchesActiveFinanceScope(i, 'income', financeScope)
  );
  const totalExpenses = scopedExpenses.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalIncome = scopedIncome.reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;
  const profit = totalIncome - totalExpenses;

  const allTransactions = [
    ...scopedExpenses.map((e) => ({ ...e, type: 'expense' as const, date: e.expense_date })),
    ...scopedIncome.map((i) => ({ ...i, type: 'income' as const, date: i.income_date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddExpense = () => {
    addExpense.mutate({
      ...expenseForm,
      description: expenseForm.description || null,
      batch_id: activeBatchId,
      farm_mode: farmMode,
    });
  };

  const handleAddIncome = () => {
    addIncome.mutate({
      ...incomeForm,
      quantity: incomeForm.quantity || null,
      unit_price: incomeForm.unit_price || null,
      description: incomeForm.description || null,
      batch_id: activeBatchId,
      farm_mode: farmMode,
    });
  };

  const updateIncomeAmount = (field: 'quantity' | 'unit_price', value: number) => {
    setIncomeForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (updated.quantity && updated.unit_price) {
        updated.amount = updated.quantity * updated.unit_price;
      }
      return updated;
    });
  };

  return {
    isLayer,
    isBroiler,
    activeTab,
    setActiveTab,
    expenseForm,
    setExpenseForm,
    incomeForm,
    setIncomeForm,
    availableEggStock,
    totalExpenses,
    totalIncome,
    profit,
    allTransactions,
    handleAddExpense,
    handleAddIncome,
    updateIncomeAmount,
    addExpense,
    addIncome,
    editExpense,
    setEditExpense,
    editIncome,
    setEditIncome,
    deleteTx,
    setDeleteTx,
    updateExpense,
    updateIncome,
    deleteExpense,
    deleteIncome,
  };
}
