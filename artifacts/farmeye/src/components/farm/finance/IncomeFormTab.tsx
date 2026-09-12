import { Plus, Egg } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCOME_CATEGORIES, FINANCE_LABELS as t, type Lang } from './financeConstants';

interface IncomeForm {
  income_date: string;
  category: string;
  amount: number;
  quantity: number;
  unit_price: number;
  description: string;
}

interface Props {
  language: Lang;
  form: IncomeForm;
  setForm: React.Dispatch<React.SetStateAction<IncomeForm>>;
  isLayer: boolean;
  isBroiler: boolean;
  availableEggStock: number;
  onAmountFieldChange: (field: 'quantity' | 'unit_price', value: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function IncomeFormTab({
  language,
  form,
  setForm,
  isLayer,
  isBroiler,
  availableEggStock,
  onAmountFieldChange,
  onSubmit,
  disabled,
}: Props) {
  const mode: 'layer' | 'broiler' | null = isLayer ? 'layer' : isBroiler ? 'broiler' : null;
  const visibleIncomeCategories = INCOME_CATEGORIES.filter(
    (c) => c.mode === 'both' || !mode || c.mode === mode
  );

  // Auto-correct invalid default for current mode
  if (mode && !visibleIncomeCategories.some((c) => c.value === form.category)) {
    const fallback = visibleIncomeCategories[0]?.value ?? 'other';
    if (form.category !== fallback) {
      queueMicrotask(() => setForm((p) => ({ ...p, category: fallback })));
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label>{t.category[language]}</Label>
        <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {visibleIncomeCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat[language]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.category === 'eggs' && (
        <>
          <div
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
              availableEggStock > 0
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            <Egg className="h-3.5 w-3.5 shrink-0" />
            <span className="leading-tight">
              {language === 'bn' ? (
                <>স্টকে আছে: <span className="font-semibold">{availableEggStock.toLocaleString('bn-BD')}</span> টি ডিম <span className="opacity-70">(গত ৬০ দিন)</span></>
              ) : (
                <>In stock: <span className="font-semibold">{availableEggStock.toLocaleString()}</span> eggs <span className="opacity-70">(last 60d)</span></>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.quantity[language]}</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity || ''}
                onChange={(e) => onAmountFieldChange('quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.unitPrice[language]}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price || ''}
                onChange={(e) => onAmountFieldChange('unit_price', parseFloat(e.target.value) || 0)}
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
            value={form.amount || ''}
            onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.date[language]}</Label>
          <SmartDatePicker
            value={form.income_date || null}
            onChange={(iso) => setForm((p) => ({ ...p, income_date: iso }))}
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

      <Button onClick={onSubmit} className="w-full bg-green-600 hover:bg-green-700" disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        {t.save[language]}
      </Button>
    </>
  );
}
