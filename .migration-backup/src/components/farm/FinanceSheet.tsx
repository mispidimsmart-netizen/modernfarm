import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/farm/ReadOnlyBanner';
import { useFinanceSheet } from '@/hooks/useFinanceSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FINANCE_LABELS as t } from './finance/financeConstants';
import { FinanceSummaryTab } from './finance/FinanceSummaryTab';
import { ExpenseFormTab } from './finance/ExpenseFormTab';
import { IncomeFormTab } from './finance/IncomeFormTab';
import { FinanceEditDialogs } from './finance/FinanceEditDialogs';

interface FinanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinanceSheet({ open, onOpenChange }: FinanceSheetProps) {
  const { language } = useAuth();
  const { canEditFinance } = usePermissions();
  const navigate = useNavigate();
  const f = useFinanceSheet();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {!canEditFinance && <div className="mb-3"><ReadOnlyBanner /></div>}

        <Tabs value={f.activeTab} onValueChange={f.setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">{t.summary[language]}</TabsTrigger>
            <TabsTrigger value="expense">{t.addExpense[language]}</TabsTrigger>
            <TabsTrigger value="income">{t.addIncome[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 pt-4">
            <FinanceSummaryTab
              language={language}
              totalIncome={f.totalIncome}
              totalExpenses={f.totalExpenses}
              profit={f.profit}
              allTransactions={f.allTransactions}
              onViewReport={() => {
                onOpenChange(false);
                navigate('/finance-report');
              }}
              onEditExpense={(tx) => f.setEditExpense(tx)}
              onEditIncome={(tx) => f.setEditIncome(tx)}
              onDelete={(d) => f.setDeleteTx(d)}
            />
          </TabsContent>

          <TabsContent value="expense" className="space-y-4 pt-4">
            <ExpenseFormTab
              language={language}
              form={f.expenseForm}
              setForm={f.setExpenseForm}
              onSubmit={f.handleAddExpense}
              disabled={f.addExpense.isPending || !canEditFinance}
            />
          </TabsContent>

          <TabsContent value="income" className="space-y-4 pt-4">
            <IncomeFormTab
              language={language}
              form={f.incomeForm}
              setForm={f.setIncomeForm}
              isLayer={f.isLayer}
              isBroiler={f.isBroiler}
              availableEggStock={f.availableEggStock}
              onAmountFieldChange={f.updateIncomeAmount}
              onSubmit={f.handleAddIncome}
              disabled={f.addIncome.isPending || !canEditFinance}
            />
          </TabsContent>
        </Tabs>

        <FinanceEditDialogs
          language={language}
          editExpense={f.editExpense}
          setEditExpense={f.setEditExpense}
          editIncome={f.editIncome}
          setEditIncome={f.setEditIncome}
          deleteTx={f.deleteTx}
          setDeleteTx={f.setDeleteTx}
          onUpdateExpense={(e) =>
            f.updateExpense.mutate(
              {
                id: e.id,
                amount: Number(e.amount),
                category: e.category,
                description: e.description,
                expense_date: e.expense_date,
              },
              { onSuccess: () => f.setEditExpense(null) }
            )
          }
          onUpdateIncome={(i) =>
            f.updateIncome.mutate(
              {
                id: i.id,
                amount: Number(i.amount),
                category: i.category,
                description: i.description,
                income_date: i.income_date,
                quantity: i.quantity ?? null,
                unit_price: i.unit_price ?? null,
              },
              { onSuccess: () => f.setEditIncome(null) }
            )
          }
          onConfirmDelete={(d) => {
            if (d.type === 'expense') f.deleteExpense.mutate(d.id);
            else f.deleteIncome.mutate(d.id);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
