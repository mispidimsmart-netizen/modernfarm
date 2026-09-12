import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES, FINANCE_LABELS as t, type Lang } from './financeConstants';

interface Props {
  language: Lang;
  form: { expense_date: string; category: string; amount: number; description: string };
  setForm: React.Dispatch<React.SetStateAction<Props['form']>>;
  onSubmit: () => void;
  disabled: boolean;
}

export function ExpenseFormTab({ language, form, setForm, onSubmit, disabled }: Props) {
  return (
    <>
      <div className="space-y-2">
        <Label>{t.category[language]}</Label>
        <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat[language]}</SelectItem>
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
            value={form.amount || ''}
            onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.date[language]}</Label>
          <SmartDatePicker
            value={form.expense_date || null}
            onChange={(iso) => setForm((p) => ({ ...p, expense_date: iso }))}
            disableFuture
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.description[language]}</Label>
        <Input
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder={language === 'bn' ? 'বিবরণ লিখুন...' : 'Enter description...'}
        />
      </div>

      <Button onClick={onSubmit} className="w-full bg-red-600 hover:bg-red-700" disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        {t.save[language]}
      </Button>
    </>
  );
}
