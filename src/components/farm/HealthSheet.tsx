import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { HeartPulse, Plus, Skull, Pill, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmType } from '@/hooks/useFarmType';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/farm/ReadOnlyBanner';
import {
  useMortalityRecords,
  useAddMortalityRecord,
  useFlockInfo,
} from '@/hooks/useFarmManagement';
import {
  useMedicineInventory,
  useAddMedicineInventory,
  useDeleteMedicineInventory,
  useMedicineUsage,
  useAddMedicineUsage,
  useMedicineStockSummary,
  type MedicineType,
  type MedicineUnit,
} from '@/hooks/useMedicine';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HealthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CAUSES = [
  { value: 'disease', bn: 'রোগ', en: 'Disease' },
  { value: 'heat_stress', bn: 'গরম', en: 'Heat Stress' },
  { value: 'suffocation', bn: 'দম বন্ধ', en: 'Suffocation' },
  { value: 'injury', bn: 'আঘাত', en: 'Injury' },
  { value: 'predator', bn: 'শিকারি', en: 'Predator' },
  { value: 'unknown', bn: 'অজানা', en: 'Unknown' },
];

const MED_TYPES: { value: MedicineType; bn: string; en: string }[] = [
  { value: 'medicine', bn: 'ওষুধ', en: 'Medicine' },
  { value: 'vaccine', bn: 'টিকা', en: 'Vaccine' },
  { value: 'vitamin', bn: 'ভিটামিন', en: 'Vitamin' },
  { value: 'supplement', bn: 'সাপ্লিমেন্ট', en: 'Supplement' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

const MED_UNITS: { value: MedicineUnit; bn: string; en: string }[] = [
  { value: 'ml', bn: 'মিলি', en: 'ml' },
  { value: 'gm', bn: 'গ্রাম', en: 'gm' },
  { value: 'piece', bn: 'পিস', en: 'piece' },
  { value: 'dose', bn: 'ডোজ', en: 'dose' },
  { value: 'bottle', bn: 'বোতল', en: 'bottle' },
  { value: 'gallon', bn: 'গ্যালন', en: 'gallon' },
];

const REASONS = [
  { value: 'preventive', bn: 'প্রতিরোধমূলক', en: 'Preventive' },
  { value: 'disease', bn: 'রোগের চিকিৎসা', en: 'Disease Treatment' },
  { value: 'vaccination_schedule', bn: 'টিকাদান শিডিউল', en: 'Vaccination Schedule' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export function HealthSheet({ open, onOpenChange }: HealthSheetProps) {
  const { language } = useAuth();
  const { isBroiler } = useFarmType();
  void isBroiler;
  const { canLogDailyData } = usePermissions();

  // Mortality
  const { data: mortRecords } = useMortalityRecords();
  const { data: flockInfo } = useFlockInfo();
  const addMortality = useAddMortalityRecord();

  // Medicine
  const { data: medInventory } = useMedicineInventory();
  const { data: medUsages } = useMedicineUsage();
  const stockSummary = useMedicineStockSummary();
  const addMedInv = useAddMedicineInventory();
  const addMedUsage = useAddMedicineUsage();
  const deleteMedInv = useDeleteMedicineInventory();

  const [activeTab, setActiveTab] = useState<'mortality' | 'usage' | 'stock'>('mortality');

  // Mortality form
  const [mortForm, setMortForm] = useState({
    record_date: format(new Date(), 'yyyy-MM-dd'),
    count: 1,
    cause: 'unknown',
    notes: '',
  });

  // Usage form
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

  // Stock purchase form
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

  const totalMortality = mortRecords?.reduce((s, r) => s + r.count, 0) ?? 0;
  const mortalityRate = flockInfo?.total_birds
    ? ((totalMortality / flockInfo.total_birds) * 100).toFixed(2)
    : '0';

  const t = {
    title: { bn: '🏥 স্বাস্থ্য ও ক্ষতি', en: '🏥 Health & Loss' },
    mortality: { bn: 'মৃত্যু', en: 'Mortality' },
    usage: { bn: 'ওষুধ প্রয়োগ', en: 'Medicine Use' },
    stock: { bn: 'ওষুধ স্টক', en: 'Medicine Stock' },
    date: { bn: 'তারিখ', en: 'Date' },
    count: { bn: 'সংখ্যা', en: 'Count' },
    cause: { bn: 'কারণ', en: 'Cause' },
    notes: { bn: 'নোট', en: 'Notes' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    medName: { bn: 'ওষুধের নাম', en: 'Medicine Name' },
    medType: { bn: 'ধরণ', en: 'Type' },
    quantity: { bn: 'পরিমাণ', en: 'Quantity' },
    unit: { bn: 'একক', en: 'Unit' },
    unitPrice: { bn: 'একক দাম (৳)', en: 'Unit Price (৳)' },
    totalCost: { bn: 'মোট খরচ', en: 'Total Cost' },
    supplier: { bn: 'সরবরাহকারী', en: 'Supplier' },
    expiry: { bn: 'মেয়াদ উত্তীর্ণ', en: 'Expiry' },
    reason: { bn: 'কারণ', en: 'Reason' },
    birdsTreated: { bn: 'পাখির সংখ্যা', en: 'Birds Treated' },
    quantityUsed: { bn: 'ব্যবহার্য পরিমাণ', en: 'Quantity Used' },
    mortalityRate: { bn: 'মৃত্যুর হার', en: 'Mortality Rate' },
    last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
    remaining: { bn: 'অবশিষ্ট', en: 'Remaining' },
    purchased: { bn: 'কিনেছেন', en: 'Purchased' },
    used: { bn: 'ব্যবহার', en: 'Used' },
    noStock: { bn: 'কোনো ওষুধ স্টকে নেই', en: 'No medicine in stock' },
    noUsage: { bn: 'কোনো ব্যবহার রেকর্ড নেই', en: 'No usage records' },
    autoExpense: {
      bn: '💡 ওষুধ কিনলে স্বয়ংক্রিয়ভাবে খরচে যুক্ত হবে',
      en: '💡 Purchasing medicine auto-adds to expenses',
    },
    history: { bn: 'ইতিহাস', en: 'History' },
    birds: { bn: 'টি', en: '' },
  };

  const handleAddMortality = () => {
    addMortality.mutate(
      {
        record_date: mortForm.record_date,
        count: mortForm.count,
        cause: mortForm.cause,
        age_weeks: flockInfo?.age_weeks ?? null,
        notes: mortForm.notes || null,
      } as any,
      {
        onSuccess: () =>
          setMortForm({
            record_date: format(new Date(), 'yyyy-MM-dd'),
            count: 1,
            cause: 'unknown',
            notes: '',
          }),
      }
    );
  };

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
      } as any,
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

  const stockTotalCost = Number(stockForm.quantity || 0) * Number(stockForm.unit_price || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-destructive" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {!canLogDailyData && <div className="mb-3"><ReadOnlyBanner /></div>}

        {/* Top summary */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t.mortalityRate[language]}</p>
                  <p className="text-[9px] text-muted-foreground">{t.last30Days[language]}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Number(mortalityRate) > 2 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-lg font-bold text-destructive">{mortalityRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/10 border-pink-500/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">{t.stock[language]}</p>
              <p className="text-lg font-bold text-pink-600">
                {stockSummary.items.length} {language === 'bn' ? 'ধরণ' : 'types'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mortality">
              <Skull className="h-3.5 w-3.5 mr-1" />
              {t.mortality[language]}
            </TabsTrigger>
            <TabsTrigger value="usage">
              <Pill className="h-3.5 w-3.5 mr-1" />
              {t.usage[language]}
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Package className="h-3.5 w-3.5 mr-1" />
              {t.stock[language]}
            </TabsTrigger>
          </TabsList>

          {/* MORTALITY */}
          <TabsContent value="mortality" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.date[language]}</Label>
                <SmartDatePicker
                  value={mortForm.record_date || null}
                  onChange={(iso) => setMortForm((p) => ({ ...p, record_date: iso || '' }))}
                  disableFuture
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.count[language]}</Label>
                <Input
                  type="number"
                  min="1"
                  value={mortForm.count}
                  onChange={(e) =>
                    setMortForm((p) => ({ ...p, count: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.cause[language]}</Label>
              <Select
                value={mortForm.cause}
                onValueChange={(v) => setMortForm((p) => ({ ...p, cause: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAUSES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.notes[language]}</Label>
              <Input
                value={mortForm.notes}
                onChange={(e) => setMortForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder={language === 'bn' ? 'বিস্তারিত (ঐচ্ছিক)' : 'Details (optional)'}
              />
            </div>

            <Button
              onClick={handleAddMortality}
              className="w-full h-12 bg-destructive hover:bg-destructive/90"
              disabled={addMortality.isPending || !canLogDailyData}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>

            {/* Recent mortality history */}
            <div>
              <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-4 mb-2 px-1">
                {t.history[language]}
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {(mortRecords ?? []).slice(0, 10).map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2">
                        <Skull className="h-4 w-4 text-destructive" />
                        <div>
                          <p className="text-xs">
                            {format(new Date(r.record_date), 'dd MMM', {
                              locale: language === 'bn' ? bn : enUS,
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {CAUSES.find((c) => c.value === r.cause)?.[language] ?? r.cause}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-destructive text-sm">{r.count}</p>
                    </CardContent>
                  </Card>
                ))}
                {!mortRecords?.length && (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    {language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* MEDICINE USAGE */}
          <TabsContent value="usage" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.medName[language]}</Label>
              <Input
                value={usageForm.medicine_name}
                onChange={(e) =>
                  setUsageForm((p) => ({ ...p, medicine_name: e.target.value }))
                }
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
                  onValueChange={(v) =>
                    setUsageForm((p) => ({ ...p, medicine_type: v as MedicineType }))
                  }
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
                    setUsageForm((p) => ({
                      ...p,
                      quantity_used: parseFloat(e.target.value) || 0,
                    }))
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
                    setUsageForm((p) => ({
                      ...p,
                      birds_treated: parseInt(e.target.value) || 0,
                    }))
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

            {/* Usage history */}
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
                            {REASONS.find((r) => r.value === u.reason)?.[language] ?? u.reason}
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
          </TabsContent>

          {/* STOCK */}
          <TabsContent value="stock" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.medName[language]}</Label>
              <Input
                value={stockForm.medicine_name}
                onChange={(e) =>
                  setStockForm((p) => ({ ...p, medicine_name: e.target.value }))
                }
                placeholder={language === 'bn' ? 'যেমনঃ Amoxicillin' : 'e.g. Amoxicillin'}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.medType[language]}</Label>
                <Select
                  value={stockForm.medicine_type}
                  onValueChange={(v) =>
                    setStockForm((p) => ({ ...p, medicine_type: v as MedicineType }))
                  }
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
                  onChange={(e) =>
                    setStockForm((p) => ({ ...p, supplier: e.target.value }))
                  }
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
              disabled={addMedInv.isPending || !stockForm.medicine_name}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>

            {/* Stock summary */}
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
                              {MED_TYPES.find((m) => m.value === it.type)?.[language] ?? it.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-bold ${
                                it.remaining <= 0
                                  ? 'text-destructive'
                                  : it.remaining < it.purchased * 0.2
                                  ? 'text-amber-600'
                                  : 'text-green-600'
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

              {/* Recent purchases (with delete) */}
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
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
