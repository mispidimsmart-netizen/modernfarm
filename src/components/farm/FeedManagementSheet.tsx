import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Wheat, Plus, Package, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFeedInventory, useFeedConsumption, useAddFeedInventory, useAddFeedConsumption } from '@/hooks/useFarmManagement';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeedManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEED_TYPES = [
  { value: 'layer_feed', bn: 'লেয়ার ফিড', en: 'Layer Feed' },
  { value: 'pre_layer', bn: 'প্রি-লেয়ার', en: 'Pre-Layer' },
  { value: 'starter', bn: 'স্টার্টার', en: 'Starter' },
  { value: 'grower', bn: 'গ্রোয়ার', en: 'Grower' },
];

export function FeedManagementSheet({ open, onOpenChange }: FeedManagementSheetProps) {
  const { language } = useAuth();
  const { data: inventory } = useFeedInventory();
  const { data: consumption } = useFeedConsumption();
  const addInventory = useAddFeedInventory();
  const addConsumption = useAddFeedConsumption();
  
  const [activeTab, setActiveTab] = useState('stock');
  const [stockForm, setStockForm] = useState({
    feed_type: 'layer_feed',
    quantity_kg: 0,
    unit_price: 0,
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    notes: '',
  });
  
  const [usageForm, setUsageForm] = useState({
    feed_type: 'layer_feed',
    quantity_kg: 0,
    consumption_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

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
    totalStock: { bn: 'মোট স্টক', en: 'Total Stock' },
    kg: { bn: 'কেজি', en: 'kg' },
    noData: { bn: 'কোনো ডেটা নেই', en: 'No data' },
  };

  const totalStock = inventory?.reduce((sum, item) => sum + Number(item.quantity_kg), 0) ?? 0;
  const totalUsed = consumption?.reduce((sum, item) => sum + Number(item.quantity_kg), 0) ?? 0;

  const handleAddStock = () => {
    addInventory.mutate({
      ...stockForm,
      supplier: stockForm.supplier || null,
      notes: stockForm.notes || null,
    });
  };

  const handleAddUsage = () => {
    addConsumption.mutate({
      ...usageForm,
      notes: usageForm.notes || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-emerald-500" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {/* Summary */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Card className="bg-emerald-500/10">
            <CardContent className="p-3 text-center">
              <Package className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground">{t.totalStock[language]}</p>
              <p className="text-xl font-bold text-emerald-600">{totalStock} {t.kg[language]}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10">
            <CardContent className="p-3 text-center">
              <TrendingDown className="mx-auto mb-1 h-5 w-5 text-orange-600" />
              <p className="text-xs text-muted-foreground">{language === 'bn' ? 'গত ৩০ দিন ব্যবহার' : 'Used (30 days)'}</p>
              <p className="text-xl font-bold text-orange-600">{totalUsed} {t.kg[language]}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock">{t.addStock[language]}</TabsTrigger>
            <TabsTrigger value="usage">{t.dailyUsage[language]}</TabsTrigger>
            <TabsTrigger value="history">{t.history[language]}</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.feedType[language]}</Label>
              <Select 
                value={stockForm.feed_type} 
                onValueChange={(v) => setStockForm(p => ({ ...p, feed_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEED_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.quantity[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={stockForm.quantity_kg || ''}
                  onChange={(e) => setStockForm(p => ({ ...p, quantity_kg: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.unitPrice[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={stockForm.unit_price || ''}
                  onChange={(e) => setStockForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.date[language]}</Label>
              <SmartDatePicker
                value={stockForm.purchase_date || null}
                onChange={(iso) => setStockForm(p => ({ ...p, purchase_date: iso }))}
                disableFuture
              />
            </div>

            <div className="space-y-2">
              <Label>{t.supplier[language]}</Label>
              <Input
                value={stockForm.supplier}
                onChange={(e) => setStockForm(p => ({ ...p, supplier: e.target.value }))}
                placeholder={language === 'bn' ? 'সরবরাহকারীর নাম...' : 'Supplier name...'}
              />
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5 text-xs text-blue-700 dark:text-blue-300">
              {language === 'bn'
                ? '💡 স্টক সংরক্ষণ করলে স্বয়ংক্রিয়ভাবে আয়-ব্যয় হিসাবে "খাদ্য" বিভাগে খরচ যোগ হবে।'
                : '💡 Saving stock will automatically add the cost to Finance under "Feed" category.'}
            </div>

            <Button onClick={handleAddStock} className="w-full" disabled={addInventory.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t.feedType[language]}</Label>
              <Select 
                value={usageForm.feed_type} 
                onValueChange={(v) => setUsageForm(p => ({ ...p, feed_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEED_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.quantity[language]}</Label>
              <Input
                type="number"
                min="0"
                value={usageForm.quantity_kg || ''}
                onChange={(e) => setUsageForm(p => ({ ...p, quantity_kg: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.date[language]}</Label>
              <SmartDatePicker
                value={usageForm.consumption_date || null}
                onChange={(iso) => setUsageForm(p => ({ ...p, consumption_date: iso }))}
                disableFuture
              />
            </div>

            <Button onClick={handleAddUsage} className="w-full" disabled={addConsumption.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {t.save[language]}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="h-[calc(100%-120px)] overflow-y-auto pt-4">
            {consumption && consumption.length > 0 ? (
              <div className="space-y-2">
                {consumption.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <span className="text-sm">
                          {format(new Date(entry.consumption_date), 'dd MMM', { 
                            locale: language === 'bn' ? bn : enUS 
                          })}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {FEED_TYPES.find(f => f.value === entry.feed_type)?.[language]}
                        </p>
                      </div>
                      <p className="font-semibold">{entry.quantity_kg} {t.kg[language]}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wheat className="mb-2 h-12 w-12 opacity-20" />
                <p>{t.noData[language]}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
