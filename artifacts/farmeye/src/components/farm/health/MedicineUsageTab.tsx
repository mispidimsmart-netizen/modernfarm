import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Plus, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMedicineUsage,
  useAddMedicineUsage,
  useMedicineStockSummary,
  type MedicineType,
  type MedicineUnit,
} from '@/hooks/useMedicine';
import {
  MED_TYPES,
  MED_UNITS,
  REASONS,
  HEALTH_LABELS as t,
  optionLabel,
  type Lang,
} from '@/lib/healthOptions';

export function MedicineUsageTab({
  language,
  canLogDailyData,
}: {
  language: Lang;
  canLogDailyData: boolean;
}) {
  const { data: medUsages } = useMedicineUsage();
  const addMedUsage = useAddMedicineUsage();
  const stockSummary = useMedicineStockSummary();

  const [usageForm, setUsageForm] = useState({
    usage_date: format(new Date(), 'yyyy-MM-dd'),
    medicine_name: '',
    medicine_type: 'medicine' as MedicineType,
    quantity_used: 0,
    unit: 'ml' as MedicineUnit,
    reason: 'preventive',
    birds_treated: 0,
    notes: '',
  });

  const handleAddUsage = () => {
    addMedUsage.mutate(
      {
        usage_date: usageForm.usage_date,
        medicine_name: usageForm.medicine_name,
        medicine_type: usageForm.medicine_type,
        quantity_used: usageForm.quantity_used,
        unit: usageForm.unit,
        reason: usageForm.reason,
        birds_treated: usageForm.birds_treated || 0,
        notes: usageForm.notes || null,
        shed_id: null,
        batch_id: null,
        inventory_id: null,
      },
      {
        onSuccess: () =>
          setUsageForm({
            usage_date: format(new Date(), 'yyyy-MM-dd'),
            medicine_name: '',
            medicine_type: 'medicine',
            quantity_used: 0,
            unit: 'ml',
            reason: 'preventive',
            birds_treated: 0,
            notes: '',
          }),
      }
    );
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{t.medName[language]}</Label>
        <Input
          value={usageForm.medicine_name}
          onChange={(e) => setUsageForm((p) => ({ ...p, medicine_name: e.target.value }))}
          placeholder={language === 'bn' ? 'যেমনঃ Amoxicillin' : 'e.g. Amoxicillin'}
          list="med-names"
        />
        <datalist id="med-names">
          {stockSummary.items.map((it) => (
            <option key={it.name} value={it.name} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.medType[language]}</Label>
          <Select
            value={usageForm.medicine_type}
            onValueChange={(v) => setUsageForm((p) => ({ ...p, medicine_type: v as MedicineType }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MED_TYPES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.date[language]}</Label>
          <SmartDatePicker
            value={usageForm.usage_date || null}
            onChange={(iso) => setUsageForm((p) => ({ ...p, usage_date: iso || '' }))}
            disableFuture
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.quantityUsed[language]}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={usageForm.quantity_used || ''}
            onChange={(e) =>
              setUsageForm((p) => ({ ...p, quantity_used: parseFloat(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.unit[language]}</Label>
          <Select
            value={usageForm.unit}
            onValueChange={(v) => setUsageForm((p) => ({ ...p, unit: v as MedicineUnit }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MED_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.reason[language]}</Label>
          <Select
            value={usageForm.reason}
            onValueChange={(v) => setUsageForm((p) => ({ ...p, reason: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.birdsTreated[language]}</Label>
          <Input
            type="number"
            min="0"
            value={usageForm.birds_treated || ''}
            onChange={(e) =>
              setUsageForm((p) => ({ ...p, birds_treated: parseInt(e.target.value) || 0 }))
            }
          />
        </div>
      </div>

      <Button
        onClick={handleAddUsage}
        className="w-full h-12"
        disabled={addMedUsage.isPending || !usageForm.medicine_name || !canLogDailyData}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t.save[language]}
      </Button>

      <div>
        <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-4 mb-2 px-1">
          {t.history[language]}
        </p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {(medUsages ?? []).slice(0, 10).map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Pill className="h-4 w-4 text-pink-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.medicine_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(u.usage_date), 'dd MMM', {
                        locale: language === 'bn' ? bn : enUS,
                      })}
                      {' • '}
                      {optionLabel(REASONS, u.reason, language)}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold shrink-0 ml-2">
                  {u.quantity_used} {u.unit}
                </p>
              </CardContent>
            </Card>
          ))}
          {!medUsages?.length && (
            <p className="text-center text-xs text-muted-foreground py-4">{t.noUsage[language]}</p>
          )}
        </div>
      </div>
    </div>
  );
}
