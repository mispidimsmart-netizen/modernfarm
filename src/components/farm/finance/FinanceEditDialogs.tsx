import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Expense, Income } from '@/hooks/useFarmManagement';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, FINANCE_LABELS as t, type Lang } from './financeConstants';

interface Props {
  language: Lang;
  editExpense: Expense | null;
  setEditExpense: (e: Expense | null) => void;
  editIncome: Income | null;
  setEditIncome: (i: Income | null) => void;
  deleteTx: { id: string; type: 'expense' | 'income' } | null;
  setDeleteTx: (d: { id: string; type: 'expense' | 'income' } | null) => void;
  onUpdateExpense: (e: Expense) => void;
  onUpdateIncome: (i: Income) => void;
  onConfirmDelete: (d: { id: string; type: 'expense' | 'income' }) => void;
}

export function FinanceEditDialogs({
  language,
  editExpense,
  setEditExpense,
  editIncome,
  setEditIncome,
  deleteTx,
  setDeleteTx,
  onUpdateExpense,
  onUpdateIncome,
  onConfirmDelete,
}: Props) {
  return (
    <>
      {/* Edit Expense */}
      <Dialog open={!!editExpense} onOpenChange={(o) => !o && setEditExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'bn' ? '✏️ খরচ এডিট' : '✏️ Edit Expense'}</DialogTitle>
          </DialogHeader>
          {editExpense && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.category[language]}</Label>
                <Select
                  value={editExpense.category}
                  onValueChange={(v) => setEditExpense({ ...editExpense, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c[language]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t.amount[language]}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={Number(editExpense.amount)}
                    onChange={(e) => setEditExpense({ ...editExpense, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.date[language]}</Label>
                  <SmartDatePicker
                    value={editExpense.expense_date}
                    onChange={(iso) => setEditExpense({ ...editExpense, expense_date: iso })}
                    disableFuture
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.description[language]}</Label>
                <Input
                  value={editExpense.description ?? ''}
                  onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExpense(null)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => editExpense && onUpdateExpense(editExpense)}>
              {language === 'bn' ? 'আপডেট' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Income */}
      <Dialog open={!!editIncome} onOpenChange={(o) => !o && setEditIncome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'bn' ? '✏️ আয় এডিট' : '✏️ Edit Income'}</DialogTitle>
          </DialogHeader>
          {editIncome && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.category[language]}</Label>
                <Select
                  value={editIncome.category}
                  onValueChange={(v) => setEditIncome({ ...editIncome, category: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c[language]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t.amount[language]}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={Number(editIncome.amount)}
                    onChange={(e) => setEditIncome({ ...editIncome, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.date[language]}</Label>
                  <SmartDatePicker
                    value={editIncome.income_date}
                    onChange={(iso) => setEditIncome({ ...editIncome, income_date: iso })}
                    disableFuture
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t.quantity[language]}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={Number(editIncome.quantity ?? 0)}
                    onChange={(e) => setEditIncome({ ...editIncome, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.unitPrice[language]}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={Number(editIncome.unit_price ?? 0)}
                    onChange={(e) => setEditIncome({ ...editIncome, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.description[language]}</Label>
                <Input
                  value={editIncome.description ?? ''}
                  onChange={(e) => setEditIncome({ ...editIncome, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIncome(null)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => editIncome && onUpdateIncome(editIncome)}>
              {language === 'bn' ? 'আপডেট' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTx} onOpenChange={(o) => !o && setDeleteTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'bn' ? 'এই এন্ট্রি মুছবেন?' : 'Delete this entry?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? 'এই লেনদেন স্থায়ীভাবে মুছে যাবে।'
                : 'This transaction will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTx) onConfirmDelete(deleteTx);
                setDeleteTx(null);
              }}
            >
              {language === 'bn' ? 'মুছুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
