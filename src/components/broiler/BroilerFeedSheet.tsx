import { useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Plus, Package, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useActiveBatch, useAddFeed, useBatchFeed, useUpdateFeed, useDeleteFeed, type BroilerFeed } from '@/hooks/useBroilerData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BroilerFeedSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroilerFeedSheet({ open, onOpenChange }: BroilerFeedSheetProps) {
  const { language } = useAuth();
  const { data: batch } = useActiveBatch();
  const { data: feedRecords } = useBatchFeed(batch?.id);
  const addFeed = useAddFeed();

  const [form, setForm] = useState({
    quantity_kg: '',
    feed_type: 'starter' as 'pre-starter' | 'starter' | 'grower' | 'finisher',
    cost_per_kg: '',
  });

  const feedTypes = [
    { id: 'pre-starter', bn: 'প্রি-স্টার্টার', en: 'Pre-Starter' },
    { id: 'starter', bn: 'স্টার্টার', en: 'Starter' },
    { id: 'grower', bn: 'গ্রোয়ার', en: 'Grower' },
    { id: 'finisher', bn: 'ফিনিশার', en: 'Finisher' },
  ];

  const handleSubmit = async () => {
    if (!batch || !form.quantity_kg) return;

    await addFeed.mutateAsync({
      batch_id: batch.id,
      quantity_kg: parseFloat(form.quantity_kg),
      feed_type: form.feed_type,
      cost_per_kg: parseFloat(form.cost_per_kg) || 0,
    });

    setForm({
      quantity_kg: '',
      feed_type: 'starter',
      cost_per_kg: '',
    });
  };

  const totalFeed = feedRecords?.reduce((sum, f) => sum + Number(f.quantity_kg), 0) || 0;
  const totalCost = feedRecords?.reduce((sum, f) => sum + (Number(f.quantity_kg) * Number(f.cost_per_kg)), 0) || 0;

  const t = {
    title: { bn: '🍽️ খাদ্য ট্র্যাকার', en: '🍽️ Feed Tracker' },
    addFeed: { bn: 'খাদ্য যোগ করুন', en: 'Add Feed' },
    quantity: { bn: 'পরিমাণ (কেজি) *', en: 'Quantity (kg) *' },
    type: { bn: 'খাদ্যের ধরণ', en: 'Feed Type' },
    costPerKg: { bn: 'প্রতি কেজি দাম (৳)', en: 'Cost per kg (৳)' },
    save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
    totalFeed: { bn: 'মোট খাদ্য', en: 'Total Feed' },
    totalCost: { bn: 'মোট খরচ', en: 'Total Cost' },
    history: { bn: 'খাদ্য ইতিহাস', en: 'Feed History' },
    noBatch: { bn: 'কোনো সক্রিয় ব্যাচ নেই', en: 'No active batch' },
    kg: { bn: 'কেজি', en: 'kg' },
  };

  if (!batch) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl">
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t.noBatch[language]}</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">{t.title[language]}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-600">{totalFeed.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{t.totalFeed[language]} ({t.kg[language]})</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <span className="text-2xl">৳</span>
                <p className="text-2xl font-bold text-purple-600">{totalCost.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t.totalCost[language]}</p>
              </CardContent>
            </Card>
          </div>

          {/* Add Feed Form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="font-semibold">{t.addFeed[language]}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.quantity[language]}</Label>
                  <Input
                    type="number"
                    value={form.quantity_kg}
                    onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.type[language]}</Label>
                  <Select 
                    value={form.feed_type} 
                    onValueChange={(v) => setForm({ ...form, feed_type: v as typeof form.feed_type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {feedTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.costPerKg[language]}</Label>
                <Input
                  type="number"
                  value={form.cost_per_kg}
                  onChange={(e) => setForm({ ...form, cost_per_kg: e.target.value })}
                  placeholder="65"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={addFeed.isPending || !form.quantity_kg}
              >
                {addFeed.isPending ? (
                  language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.save[language]}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Feed History */}
          {feedRecords && feedRecords.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-3">{t.history[language]}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {feedRecords.slice().reverse().map((f) => {
                    const typeLabel = feedTypes.find(t => t.id === f.feed_type)?.[language] || f.feed_type;
                    
                    return (
                      <div key={f.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm">{f.feed_date}</span>
                            <span className="text-xs text-muted-foreground ml-2">({typeLabel})</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{Number(f.quantity_kg).toFixed(1)} kg</span>
                          {Number(f.cost_per_kg) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ৳{(Number(f.quantity_kg) * Number(f.cost_per_kg)).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
