import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Plus, TrendingUp, TrendingDown, Target, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useActiveBatch, useAddWeight, useBatchWeights, useBatchStats, useUpdateWeight, useDeleteWeight, type BroilerWeight } from '@/hooks/useBroilerData';
import { getBroilerTargetWeight } from '@/hooks/useFarmType';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface BroilerWeightSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroilerWeightSheet({ open, onOpenChange }: BroilerWeightSheetProps) {
  const { language } = useAuth();
  const { data: batch } = useActiveBatch();
  const { data: weights } = useBatchWeights(batch?.id);
  const stats = useBatchStats(batch?.id);
  const addWeight = useAddWeight();
  const updateWeight = useUpdateWeight();
  const deleteWeight = useDeleteWeight();
  const [editEntry, setEditEntry] = useState<BroilerWeight | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    average_weight_grams: '',
    sample_count: '10',
    min_weight_grams: '',
    max_weight_grams: '',
  });

  const handleSubmit = async () => {
    if (!batch || !form.average_weight_grams) return;

    await addWeight.mutateAsync({
      batch_id: batch.id,
      average_weight_grams: parseInt(form.average_weight_grams),
      sample_count: parseInt(form.sample_count) || 10,
      min_weight_grams: form.min_weight_grams ? parseInt(form.min_weight_grams) : null,
      max_weight_grams: form.max_weight_grams ? parseInt(form.max_weight_grams) : null,
    });

    setForm({
      average_weight_grams: '',
      sample_count: '10',
      min_weight_grams: '',
      max_weight_grams: '',
    });
  };

  const getWeightStatus = () => {
    if (stats.weightProgress >= 100) return { color: 'text-green-600', bg: 'bg-green-500', label: { bn: 'টার্গেটে পৌঁছেছে!', en: 'On target!' } };
    if (stats.weightProgress >= 90) return { color: 'text-green-600', bg: 'bg-green-500', label: { bn: 'ভালো', en: 'Good' } };
    if (stats.weightProgress >= 80) return { color: 'text-amber-600', bg: 'bg-amber-500', label: { bn: 'গ্রহণযোগ্য', en: 'Acceptable' } };
    return { color: 'text-red-600', bg: 'bg-red-500', label: { bn: 'পিছিয়ে', en: 'Behind' } };
  };

  const status = getWeightStatus();

  const t = {
    title: { bn: '⚖️ ওজন ট্র্যাকার', en: '⚖️ Weight Tracker' },
    currentWeight: { bn: 'বর্তমান গড় ওজন', en: 'Current Avg Weight' },
    targetWeight: { bn: 'টার্গেট ওজন', en: 'Target Weight' },
    progress: { bn: 'অগ্রগতি', en: 'Progress' },
    addWeight: { bn: 'ওজন যোগ করুন', en: 'Add Weight' },
    avgWeight: { bn: 'গড় ওজন (গ্রাম) *', en: 'Avg Weight (g) *' },
    sampleCount: { bn: 'স্যাম্পল সংখ্যা', en: 'Sample Count' },
    minWeight: { bn: 'সর্বনিম্ন (গ্রাম)', en: 'Min Weight (g)' },
    maxWeight: { bn: 'সর্বোচ্চ (গ্রাম)', en: 'Max Weight (g)' },
    save: { bn: 'সংরক্ষণ করুন', en: 'Save' },
    history: { bn: 'ওজন ইতিহাস', en: 'Weight History' },
    noBatch: { bn: 'কোনো সক্রিয় ব্যাচ নেই', en: 'No active batch' },
    grams: { bn: 'গ্রাম', en: 'g' },
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
          {/* Current Weight Status */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t.currentWeight[language]}</p>
                  <p className="text-3xl font-bold">
                    {stats.currentWeight.toLocaleString()} <span className="text-lg text-muted-foreground">{t.grams[language]}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t.targetWeight[language]}</p>
                  <p className="text-xl font-semibold text-muted-foreground">
                    {stats.targetWeight.toLocaleString()} {t.grams[language]}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.progress[language]}</span>
                  <span className={`font-medium ${status.color}`}>
                    {stats.weightProgress.toFixed(0)}% - {status.label[language]}
                  </span>
                </div>
                <Progress value={Math.min(stats.weightProgress, 100)} className="h-3" />
              </div>

              {/* Age Info */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="px-2 py-1 rounded-full bg-muted">
                  📅 {stats.ageDays} {language === 'bn' ? 'দিন' : 'days'}
                </span>
                <span className="px-2 py-1 rounded-full bg-muted">
                  🗓️ {stats.ageWeeks} {language === 'bn' ? 'সপ্তাহ' : 'weeks'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Weight Form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="font-semibold">{t.addWeight[language]}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.avgWeight[language]}</Label>
                  <Input
                    type="number"
                    value={form.average_weight_grams}
                    onChange={(e) => setForm({ ...form, average_weight_grams: e.target.value })}
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.sampleCount[language]}</Label>
                  <Input
                    type="number"
                    value={form.sample_count}
                    onChange={(e) => setForm({ ...form, sample_count: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.minWeight[language]}</Label>
                  <Input
                    type="number"
                    value={form.min_weight_grams}
                    onChange={(e) => setForm({ ...form, min_weight_grams: e.target.value })}
                    placeholder="1200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.maxWeight[language]}</Label>
                  <Input
                    type="number"
                    value={form.max_weight_grams}
                    onChange={(e) => setForm({ ...form, max_weight_grams: e.target.value })}
                    placeholder="1800"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={addWeight.isPending || !form.average_weight_grams}
              >
                {addWeight.isPending ? (
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

          {/* Weight History */}
          {weights && weights.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold mb-3">{t.history[language]}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {weights.slice().reverse().map((w, index) => {
                    const prevWeight = weights[weights.length - index - 2]?.average_weight_grams;
                    const change = prevWeight ? w.average_weight_grams - prevWeight : 0;
                    
                    return (
                      <div key={w.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{w.record_date}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{w.average_weight_grams.toLocaleString()}g</span>
                          {change !== 0 && (
                            <span className={`text-xs flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {change > 0 ? '+' : ''}{change}g
                            </span>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditEntry(w)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(w.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{language === 'bn' ? '✏️ ওজন এডিট' : '✏️ Edit Weight'}</DialogTitle></DialogHeader>
            {editEntry && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">{language === 'bn' ? 'তারিখ' : 'Date'}</Label>
                  <Input type="date" value={editEntry.record_date}
                    onChange={(e) => setEditEntry({ ...editEntry, record_date: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.avgWeight[language]}</Label>
                    <Input type="number" value={editEntry.average_weight_grams}
                      onChange={(e) => setEditEntry({ ...editEntry, average_weight_grams: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.sampleCount[language]}</Label>
                    <Input type="number" value={editEntry.sample_count}
                      onChange={(e) => setEditEntry({ ...editEntry, sample_count: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.minWeight[language]}</Label>
                    <Input type="number" value={editEntry.min_weight_grams ?? ''}
                      onChange={(e) => setEditEntry({ ...editEntry, min_weight_grams: e.target.value ? parseInt(e.target.value) : null })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.maxWeight[language]}</Label>
                    <Input type="number" value={editEntry.max_weight_grams ?? ''}
                      onChange={(e) => setEditEntry({ ...editEntry, max_weight_grams: e.target.value ? parseInt(e.target.value) : null })} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEntry(null)}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => {
                if (editEntry) updateWeight.mutate({
                  id: editEntry.id,
                  batch_id: editEntry.batch_id,
                  record_date: editEntry.record_date,
                  average_weight_grams: editEntry.average_weight_grams,
                  sample_count: editEntry.sample_count,
                  min_weight_grams: editEntry.min_weight_grams,
                  max_weight_grams: editEntry.max_weight_grams,
                }, { onSuccess: () => setEditEntry(null) });
              }}>{language === 'bn' ? 'আপডেট' : 'Update'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{language === 'bn' ? 'এই রেকর্ড মুছবেন?' : 'Delete this record?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'bn' ? 'ওজন রেকর্ড স্থায়ীভাবে মুছে যাবে।' : 'Weight record will be permanently deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (deleteId) deleteWeight.mutate({ id: deleteId, batch_id: batch?.id });
                setDeleteId(null);
              }}>{language === 'bn' ? 'মুছুন' : 'Delete'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
