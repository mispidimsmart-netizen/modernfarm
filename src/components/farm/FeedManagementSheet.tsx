import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Wheat, Plus, Package, TrendingDown, Pencil, Trash2, Coins } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useFeedInventory,
  useFeedConsumption,
  useAddFeedInventory,
  useAddFeedConsumption,
  useUpdateFeedInventory,
  useDeleteFeedInventory,
  useUpdateFeedConsumption,
  useDeleteFeedConsumption,
  type FeedInventory,
  type FeedConsumption,
} from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FeedManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'layer' (default) or 'broiler' — controls default feed-type list & default selection */
  mode?: 'layer' | 'broiler';
}

const LAYER_FEED_TYPES = [
  { value: 'layer_feed', bn: 'লেয়ার ফিড', en: 'Layer Feed' },
  { value: 'pre_layer', bn: 'প্রি-লেয়ার', en: 'Pre-Layer' },
  { value: 'starter', bn: 'স্টার্টার', en: 'Starter' },
  { value: 'grower', bn: 'গ্রোয়ার', en: 'Grower' },
];

const BROILER_FEED_TYPES = [
  { value: 'pre_starter', bn: 'প্রি-স্টার্টার', en: 'Pre-Starter' },
  { value: 'starter', bn: 'স্টার্টার', en: 'Starter' },
  { value: 'grower', bn: 'গ্রোয়ার', en: 'Grower' },
  { value: 'finisher', bn: 'ফিনিশার', en: 'Finisher' },
];

export function FeedManagementSheet({ open, onOpenChange, mode = 'layer' }: FeedManagementSheetProps) {
  const FEED_TYPES = mode === 'broiler' ? BROILER_FEED_TYPES : LAYER_FEED_TYPES;
  const defaultFeedType = FEED_TYPES[0].value;

  function feedLabel(value: string, lang: 'bn' | 'en') {
    return FEED_TYPES.find((f) => f.value === value)?.[lang] ?? value;
  }

  const { language } = useAuth();
  const { data: inventory } = useFeedInventory();
  const { data: consumption } = useFeedConsumption();
  const addInventory = useAddFeedInventory();
  const addConsumption = useAddFeedConsumption();
  const updateInventory = useUpdateFeedInventory();
  const deleteInventory = useDeleteFeedInventory();
  const updateConsumption = useUpdateFeedConsumption();
  const deleteConsumption = useDeleteFeedConsumption();

  const [activeTab, setActiveTab] = useState('stock');
  const [stockForm, setStockForm] = useState({
    feed_type: defaultFeedType,
    quantity_kg: 0,
    unit_price: 0,
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    notes: '',
  });
  const [usageForm, setUsageForm] = useState({
    feed_type: defaultFeedType,
    quantity_kg: 0,
    consumption_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Edit/delete dialog state
  const [editStock, setEditStock] = useState<FeedInventory | null>(null);
  const [deleteStockId, setDeleteStockId] = useState<string | null>(null);
  const [editUsage, setEditUsage] = useState<FeedConsumption | null>(null);
  const [deleteUsageId, setDeleteUsageId] = useState<string | null>(null);

  const t = {
    title: { bn: 'খাদ্য ব্যবস্থাপনা', en: 'Feed Management' },
    addStock: { bn: 'স্টক যোগ', en: 'Add Stock' },
    dailyUsage: { bn: 'দৈনিক ব্যবহার', en: 'Daily Usage' },
    history: { bn: 'ইতিহাস', en: 'History' },
    feedType: { bn: 'খাদ্যের ধরণ', en: 'Feed Type' },
    quantity: { bn: 'পরিমাণ (কেজি)', en: 'Quantity (kg)' },
    unitPrice: { bn: 'দাম/কেজি', en: 'Price/kg' },
    date: { bn: 'তারিখ', en: 'Date' },
    supplier: { bn: 'সরবরাহকারী', en: 'Supplier' },
    notes: { bn: 'নোট', en: 'Notes' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    update: { bn: 'আপডেট', en: 'Update' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    delete: { bn: 'মুছুন', en: 'Delete' },
    confirmDelete: { bn: 'নিশ্চিতভাবে মুছবেন?', en: 'Confirm delete?' },
    confirmDeleteDesc: { bn: 'এই এন্ট্রি স্থায়ীভাবে মুছে যাবে।', en: 'This entry will be permanently removed.' },
    totalStock: { bn: 'মোট স্টক', en: 'Total Stock' },
    avgCost: { bn: 'গড় ৳/কেজি', en: 'Avg ৳/kg' },
    todayCost: { bn: 'আজকের খাদ্য খরচ', en: "Today's Feed Cost" },
    kg: { bn: 'কেজি', en: 'kg' },
    noData: { bn: 'কোনো ডেটা নেই', en: 'No data' },
    stockList: { bn: 'স্টক ইতিহাস', en: 'Stock History' },
    usageList: { bn: 'ব্যবহার ইতিহাস', en: 'Usage History' },
    editStock: { bn: 'স্টক এডিট', en: 'Edit Stock' },
    editUsage: { bn: 'ব্যবহার এডিট', en: 'Edit Usage' },
    note: {
      bn: '💡 স্টক যোগ করলে শুধু ইনভেন্টরিতে জমা হবে। দৈনিক "ব্যবহার" এন্ট্রি করলে স্টকের গড় ৳/কেজি অনুযায়ী খরচ স্বয়ংক্রিয় হিসাব হবে।',
      en: '💡 Adding stock only updates inventory. When you enter daily "Usage", cost is auto-calculated using weighted-avg ৳/kg from stock.',
    },
  };

  // Aggregate per feed_type for weighted avg
  const avgByType = useMemo(() => {
    const map: Record<string, { qty: number; cost: number }> = {};
    (inventory ?? []).forEach((it) => {
      const k = it.feed_type;
      if (!map[k]) map[k] = { qty: 0, cost: 0 };
      map[k].qty += Number(it.quantity_kg || 0);
      map[k].cost += Number(it.quantity_kg || 0) * Number(it.unit_price || 0);
    });
    const out: Record<string, number> = {};
    Object.entries(map).forEach(([k, v]) => { out[k] = v.qty > 0 ? v.cost / v.qty : 0; });
    return out;
  }, [inventory]);

  const totalStock = inventory?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) ?? 0;
  const totalUsed = consumption?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) ?? 0;

  // Today's feed cost = sum of (today's usage × avg cost of its feed type)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCost = useMemo(() => {
    return (consumption ?? [])
      .filter((c) => c.consumption_date === todayStr)
      .reduce((sum, c) => sum + Number(c.quantity_kg || 0) * (avgByType[c.feed_type] ?? 0), 0);
  }, [consumption, avgByType, todayStr]);

  // Overall weighted avg across all feed (for the summary card)
  const overallAvg = useMemo(() => {
    let qty = 0; let cost = 0;
    (inventory ?? []).forEach((i) => {
      qty += Number(i.quantity_kg || 0);
      cost += Number(i.quantity_kg || 0) * Number(i.unit_price || 0);
    });
    return qty > 0 ? cost / qty : 0;
  }, [inventory]);

  const handleAddStock = () => {
    addInventory.mutate({
      ...stockForm,
      supplier: stockForm.supplier || null,
      notes: stockForm.notes || null,
    } as any);
  };

  const handleAddUsage = () => {
    addConsumption.mutate({
      ...usageForm,
      notes: usageForm.notes || null,
    } as any);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-emerald-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {/* Summary */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card className="bg-emerald-500/10">
            <CardContent className="p-2.5 text-center">
              <Package className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
              <p className="text-[10px] text-muted-foreground">{t.totalStock[language]}</p>
              <p className="text-base font-bold text-emerald-600">{totalStock.toFixed(0)} {t.kg[language]}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10">
            <CardContent className="p-2.5 text-center">
              <Coins className="mx-auto mb-1 h-4 w-4 text-blue-600" />
              <p className="text-[10px] text-muted-foreground">{t.avgCost[language]}</p>
              <p className="text-base font-bold text-blue-600">৳{overallAvg.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10">
            <CardContent className="p-2.5 text-center">
              <TrendingDown className="mx-auto mb-1 h-4 w-4 text-orange-600" />
              <p className="text-[10px] text-muted-foreground">{language === 'bn' ? '৩০ দিন ব্যবহার' : '30d Used'}</p>
              <p className="text-base font-bold text-orange-600">{totalUsed.toFixed(0)} {t.kg[language]}</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-500/10">
            <CardContent className="p-2.5 text-center">
              <Coins className="mx-auto mb-1 h-4 w-4 text-rose-600" />
              <p className="text-[10px] text-muted-foreground">{t.todayCost[language]}</p>
              <p className="text-base font-bold text-rose-600">৳{todayCost.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock">{t.addStock[language]}</TabsTrigger>
            <TabsTrigger value="usage">{t.dailyUsage[language]}</TabsTrigger>
            <TabsTrigger value="history">{t.history[language]}</TabsTrigger>
          </TabsList>

          {/* Add Stock */}
          <TabsContent value="stock" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.feedType[language]}</Label>
              <Select value={stockForm.feed_type} onValueChange={(v) => setStockForm((p) => ({ ...p, feed_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEED_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.quantity[language]}</Label>
                <Input type="number" min="0" value={stockForm.quantity_kg || ''}
                  onChange={(e) => setStockForm((p) => ({ ...p, quantity_kg: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>{t.unitPrice[language]}</Label>
                <Input type="number" min="0" value={stockForm.unit_price || ''}
                  onChange={(e) => setStockForm((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.date[language]}</Label>
              <SmartDatePicker value={stockForm.purchase_date || null}
                onChange={(iso) => setStockForm((p) => ({ ...p, purchase_date: iso }))} disableFuture />
            </div>
            <div className="space-y-2">
              <Label>{t.supplier[language]}</Label>
              <Input value={stockForm.supplier} onChange={(e) => setStockForm((p) => ({ ...p, supplier: e.target.value }))}
                placeholder={language === 'bn' ? 'সরবরাহকারীর নাম...' : 'Supplier name...'} />
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5 text-xs text-blue-700 dark:text-blue-300">
              {t.note[language]}
            </div>
            <Button onClick={handleAddStock} className="w-full" disabled={addInventory.isPending}>
              <Plus className="mr-2 h-4 w-4" />{t.save[language]}
            </Button>

            {/* Stock list with edit/delete */}
            <div className="pt-4">
              <h4 className="mb-2 text-sm font-semibold">{t.stockList[language]}</h4>
              {inventory && inventory.length > 0 ? (
                <div className="space-y-2">
                  {inventory.slice(0, 20).map((item) => (
                    <Card key={item.id}>
                      <CardContent className="flex items-center justify-between gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{feedLabel(item.feed_type, language)}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.purchase_date), 'dd MMM', { locale: language === 'bn' ? bn : enUS })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity_kg} {t.kg[language]} × ৳{item.unit_price} = <strong>৳{(Number(item.quantity_kg) * Number(item.unit_price)).toFixed(0)}</strong>
                            {item.supplier ? ` • ${item.supplier}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditStock(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteStockId(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">{t.noData[language]}</p>
              )}
            </div>
          </TabsContent>

          {/* Daily usage */}
          <TabsContent value="usage" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.feedType[language]}</Label>
              <Select value={usageForm.feed_type} onValueChange={(v) => setUsageForm((p) => ({ ...p, feed_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEED_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.quantity[language]}</Label>
              <Input type="number" min="0" value={usageForm.quantity_kg || ''}
                onChange={(e) => setUsageForm((p) => ({ ...p, quantity_kg: parseFloat(e.target.value) || 0 }))} />
            </div>
            {/* Live cost preview */}
            {usageForm.quantity_kg > 0 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs">
                {language === 'bn' ? 'আনুমানিক খরচ' : 'Estimated cost'}:{' '}
                <strong>৳{(usageForm.quantity_kg * (avgByType[usageForm.feed_type] ?? 0)).toFixed(2)}</strong>{' '}
                <span className="text-muted-foreground">
                  ({usageForm.quantity_kg} kg × ৳{(avgByType[usageForm.feed_type] ?? 0).toFixed(2)}/kg)
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.date[language]}</Label>
              <SmartDatePicker value={usageForm.consumption_date || null}
                onChange={(iso) => setUsageForm((p) => ({ ...p, consumption_date: iso }))} disableFuture />
            </div>
            <Button onClick={handleAddUsage} className="w-full" disabled={addConsumption.isPending}>
              <Plus className="mr-2 h-4 w-4" />{t.save[language]}
            </Button>
          </TabsContent>

          {/* Usage history */}
          <TabsContent value="history" className="pt-4">
            {consumption && consumption.length > 0 ? (
              <div className="space-y-2">
                {consumption.map((entry) => {
                  const cost = Number(entry.quantity_kg || 0) * (avgByType[entry.feed_type] ?? 0);
                  return (
                    <Card key={entry.id}>
                      <CardContent className="flex items-center justify-between gap-2 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{feedLabel(entry.feed_type, language)}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.consumption_date), 'dd MMM', { locale: language === 'bn' ? bn : enUS })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.quantity_kg} {t.kg[language]} • <strong>৳{cost.toFixed(0)}</strong>
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditUsage(entry)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteUsageId(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wheat className="mb-2 h-12 w-12 opacity-20" />
                <p>{t.noData[language]}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Stock Dialog */}
        <Dialog open={!!editStock} onOpenChange={(o) => !o && setEditStock(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.editStock[language]}</DialogTitle></DialogHeader>
            {editStock && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.quantity[language]}</Label>
                    <Input type="number" value={editStock.quantity_kg}
                      onChange={(e) => setEditStock({ ...editStock, quantity_kg: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.unitPrice[language]}</Label>
                    <Input type="number" value={editStock.unit_price}
                      onChange={(e) => setEditStock({ ...editStock, unit_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.supplier[language]}</Label>
                  <Input value={editStock.supplier ?? ''}
                    onChange={(e) => setEditStock({ ...editStock, supplier: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditStock(null)}>{t.cancel[language]}</Button>
              <Button onClick={() => {
                if (editStock) {
                  updateInventory.mutate({
                    id: editStock.id,
                    quantity_kg: editStock.quantity_kg,
                    unit_price: editStock.unit_price,
                    supplier: editStock.supplier,
                  }, { onSuccess: () => setEditStock(null) });
                }
              }}>{t.update[language]}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Stock Confirm */}
        <AlertDialog open={!!deleteStockId} onOpenChange={(o) => !o && setDeleteStockId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete[language]}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDeleteDesc[language]}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (deleteStockId) deleteInventory.mutate(deleteStockId);
                setDeleteStockId(null);
              }}>{t.delete[language]}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Usage Dialog */}
        <Dialog open={!!editUsage} onOpenChange={(o) => !o && setEditUsage(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.editUsage[language]}</DialogTitle></DialogHeader>
            {editUsage && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t.quantity[language]}</Label>
                  <Input type="number" value={editUsage.quantity_kg}
                    onChange={(e) => setEditUsage({ ...editUsage, quantity_kg: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUsage(null)}>{t.cancel[language]}</Button>
              <Button onClick={() => {
                if (editUsage) {
                  updateConsumption.mutate({
                    id: editUsage.id,
                    quantity_kg: editUsage.quantity_kg,
                  }, { onSuccess: () => setEditUsage(null) });
                }
              }}>{t.update[language]}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Usage Confirm */}
        <AlertDialog open={!!deleteUsageId} onOpenChange={(o) => !o && setDeleteUsageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmDelete[language]}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDeleteDesc[language]}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (deleteUsageId) deleteConsumption.mutate(deleteUsageId);
                setDeleteUsageId(null);
              }}>{t.delete[language]}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
