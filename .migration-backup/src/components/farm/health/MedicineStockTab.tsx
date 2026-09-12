import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
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
  useMedicineInventory,
  useAddMedicineInventory,
  useDeleteMedicineInventory,
  useMedicineStockSummary,
  type MedicineType,
  type MedicineUnit,
} from '@/hooks/useMedicine';
import {
  MED_TYPES,
  MED_UNITS,
  HEALTH_LABELS as t,
  optionLabel,
  stockTone,
  type Lang,
} from '@/lib/healthOptions';

const TONE_CLASS: Record<ReturnType<typeof stockTone>, string> = {
  out: 'text-destructive',
  low: 'text-amber-600',
  ok: 'text-green-600',
};

export function MedicineStockTab({
  language,
  canLogDailyData,
}: {
  language: Lang;
  canLogDailyData: boolean;
}) {
  const { data: medInventory } = useMedicineInventory();
  const addMedInv = useAddMedicineInventory();
  const deleteMedInv = useDeleteMedicineInventory();
  const stockSummary = useMedicineStockSummary();

  const [stockForm, setStockForm] = useState({
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    medicine_name: '',
    medicine_type: 'medicine' as MedicineType,
    quantity: 0,
    unit: 'ml' as MedicineUnit,
    unit_price: 0,
    supplier: '',
    expiry_date: '',
    notes: '',
  });

  const stockTotalCost = Number(stockForm.quantity || 0) * Number(stockForm.unit_price || 0);

  const handleAddStock = () => {
    addMedInv.mutate(
      {
        purchase_date: stockForm.purchase_date,
        medicine_name: stockForm.medicine_name,
        medicine_type: stockForm.medicine_type,
        quantity: stockForm.quantity,
        unit: stockForm.unit,
        unit_price: stockForm.unit_price,
        supplier: stockForm.supplier || null,
        expiry_date: stockForm.expiry_date || null,
        notes: stockForm.notes || null,
      } as never,
      {
        onSuccess: () =>
          setStockForm({
            purchase_date: format(new Date(), 'yyyy-MM-dd'),
            medicine_name: '',
            medicine_type: 'medicine',
            quantity: 0,
            unit: 'ml',
            unit_price: 0,
            supplier: '',
            expiry_date: '',
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
          value={stockForm.medicine_name}
          onChange={(e) => setStockForm((p) => ({ ...p, medicine_name: e.target.value }))}
          placeholder={language === 'bn' ? 'যেমনঃ Amoxicillin' : 'e.g. Amoxicillin'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.medType[language]}</Label>
          <Select
            value={stockForm.medicine_type}
            onValueChange={(v) => setStockForm((p) => ({ ...p, medicine_type: v as MedicineType }))}
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
            value={stockForm.purchase_date || null}
            onChange={(iso) => setStockForm((p) => ({ ...p, purchase_date: iso || '' }))}
            disableFuture
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.quantity[language]}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={stockForm.quantity || ''}
            onChange={(e) =>
              setStockForm((p) => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.unit[language]}</Label>
          <Select
            value={stockForm.unit}
            onValueChange={(v) => setStockForm((p) => ({ ...p, unit: v as MedicineUnit }))}
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
        <div className="space-y-1.5">
          <Label className="text-xs">{t.unitPrice[language]}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={stockForm.unit_price || ''}
            onChange={(e) =>
              setStockForm((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))
            }
          />
        </div>
      </div>

      {stockTotalCost > 0 && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2.5 text-sm flex items-center justify-between">
          <span className="text-blue-700 dark:text-blue-300">{t.totalCost[language]}</span>
          <span className="font-bold text-blue-700 dark:text-blue-300">
            ৳{stockTotalCost.toLocaleString()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.supplier[language]}</Label>
          <Input
            value={stockForm.supplier}
            onChange={(e) => setStockForm((p) => ({ ...p, supplier: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.expiry[language]}</Label>
          <SmartDatePicker
            value={stockForm.expiry_date || null}
            onChange={(iso) => setStockForm((p) => ({ ...p, expiry_date: iso || '' }))}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">{t.autoExpense[language]}</p>

      <Button
        onClick={handleAddStock}
        className="w-full h-12"
        disabled={addMedInv.isPending || !stockForm.medicine_name || !canLogDailyData}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t.save[language]}
      </Button>

      <div>
        <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-4 mb-2 px-1">
          {t.remaining[language]} ({language === 'bn' ? 'অনুমান' : 'estimated'})
        </p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {stockSummary.items.length > 0 ? (
            stockSummary.items.map((it) => (
              <Card key={`${it.name}-${it.unit}`}>
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{it.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {optionLabel(MED_TYPES, it.type, language)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          TONE_CLASS[stockTone(it.remaining, it.purchased)]
                        }`}
                      >
                        {it.remaining.toLocaleString()} {it.unit}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {it.purchased} - {it.used}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-xs text-muted-foreground py-4">{t.noStock[language]}</p>
          )}
        </div>

        {(medInventory?.length ?? 0) > 0 && (
          <>
            <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-4 mb-2 px-1">
              {language === 'bn' ? 'সাম্প্রতিক ক্রয়' : 'Recent Purchases'}
            </p>
            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {(medInventory ?? []).slice(0, 8).map((it) => (
                <Card key={it.id}>
                  <CardContent className="flex items-center justify-between p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{it.medicine_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(it.purchase_date), 'dd MMM', {
                          locale: language === 'bn' ? bn : enUS,
                        })}
                        {' • '}
                        {it.quantity} {it.unit}
                        {' • '}৳{Number(it.total_cost).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => deleteMedInv.mutate(it.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
