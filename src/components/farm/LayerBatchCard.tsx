import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Calendar,
  Bird,
  TrendingUp,
  Egg,
  Skull,
  Wheat,
  Plus,
  CheckCircle2,
  History,
  ChevronDown,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useActiveLayerBatch,
  useLayerBatches,
  useCreateLayerBatch,
  useCloseLayerBatch,
  useDeleteLayerBatch,
  type LayerBatch,
} from '@/hooks/useLayerBatch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BreedCombobox } from '@/components/farm/BreedCombobox';
import { useDailyTick } from '@/hooks/useDailyTick';
import { LAYER_BREEDS } from '@/data/layerBreeds';
import { formatDateBn, ageWeeksFromBatch } from '@/lib/layerBatch';
import { Stat } from '@/components/farm/batch/BatchStats';
import { PastBatchRow } from '@/components/farm/batch/PastBatchRow';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { EditCompletedBatchDialog } from '@/components/farm/EditCompletedBatchDialog';



export function LayerBatchCard() {
  const { language } = useAuth();
  const today = useDailyTick(); // re-renders on midnight & tab refocus
  const { data: activeBatch, isLoading } = useActiveLayerBatch();
  const { data: allBatches = [] } = useLayerBatches();
  const createBatch = useCreateLayerBatch();
  const closeBatch = useCloseLayerBatch();
  const deleteBatch = useDeleteLayerBatch();

  const [openNew, setOpenNew] = useState(false);
  const [openClose, setOpenClose] = useState(false);
  const [openEditActive, setOpenEditActive] = useState(false);
  const [openDeleteActive, setOpenDeleteActive] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const completed = allBatches.filter((b) => b.status === 'completed');

  // New batch form
  const [newForm, setNewForm] = useState({
    batch_name_bn: '',
    breed: 'Hy-Line Brown',
    start_date: new Date().toISOString().split('T')[0],
    initial_bird_count: 0,
    age_at_start_weeks: 0,
    chick_cost_per_bird: 0,
    notes: '',
  });

  // Close form
  const [closeForm, setCloseForm] = useState({
    end_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const t = {
    title: { bn: 'লেয়ার ব্যাচ', en: 'Layer Batch' },
    active: { bn: 'সক্রিয় ব্যাচ', en: 'Active Batch' },
    noBatch: { bn: 'কোনো সক্রিয় ব্যাচ নেই', en: 'No active batch' },
    startNew: { bn: 'নতুন ব্যাচ শুরু করুন', en: 'Start New Batch' },
    endBatch: { bn: 'ব্যাচ শেষ করুন', en: 'Close Batch' },
    history: { bn: 'পূর্ববর্তী ব্যাচ', en: 'Past Batches' },
    name: { bn: 'ব্যাচের নাম', en: 'Batch Name' },
    breed: { bn: 'জাত', en: 'Breed' },
    startDate: { bn: 'শুরুর তারিখ', en: 'Start Date' },
    endDate: { bn: 'শেষের তারিখ', en: 'End Date' },
    birds: { bn: 'পাখির সংখ্যা', en: 'Bird Count' },
    ageStart: { bn: 'শুরুর বয়স (সপ্তাহ)', en: 'Age at Start (weeks)' },
    chickCost: { bn: 'প্রতি পাখির দাম (৳)', en: 'Cost per Bird (৳)' },
    notes: { bn: 'নোট', en: 'Notes' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    confirmClose: {
      bn: 'এই ব্যাচ শেষ করলে সারাংশ (ডিম, মৃত্যু, FCR) সংরক্ষিত হবে এবং নতুন ব্যাচ শুরু করতে পারবেন।',
      en: 'Closing this batch will save final summary (eggs, mortality, FCR) and allow starting a new batch.',
    },
    age: { bn: 'বয়স', en: 'Age' },
    weeks: { bn: 'সপ্তাহ', en: 'weeks' },
    duration: { bn: 'মেয়াদ', en: 'Duration' },
    days: { bn: 'দিন', en: 'days' },
  };

  const handleCreate = () => {
    createBatch.mutate(
      {
        batch_name: newForm.batch_name_bn || `Batch ${allBatches.length + 1}`,
        batch_name_bn: newForm.batch_name_bn || `ব্যাচ ${allBatches.length + 1}`,
        breed: newForm.breed,
        start_date: newForm.start_date,
        initial_bird_count: newForm.initial_bird_count,
        age_at_start_weeks: newForm.age_at_start_weeks,
        chick_cost_per_bird: newForm.chick_cost_per_bird,
        notes: newForm.notes,
      },
      {
        onSuccess: () => {
          setOpenNew(false);
          setNewForm({
            batch_name_bn: '',
            breed: 'Hy-Line Brown',
            start_date: new Date().toISOString().split('T')[0],
            initial_bird_count: 0,
            age_at_start_weeks: 0,
            chick_cost_per_bird: 0,
            notes: '',
          });
        },
      }
    );
  };

  const handleClose = () => {
    if (!activeBatch) return;
    closeBatch.mutate(
      {
        batchId: activeBatch.id,
        endDate: closeForm.end_date,
        notes: closeForm.notes,
      },
      { onSuccess: () => setOpenClose(false) }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-primary/30 shadow-sm scroll-mt-4">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {t.title[language]}
            </span>
            {activeBatch ? (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20 text-[11px]">
                {t.active[language]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          <AnimatePresence mode="wait">
            {activeBatch ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="rounded-lg bg-primary/5 p-3">
                  <div className="text-base font-semibold text-foreground">
                    {activeBatch.batch_name_bn || activeBatch.batch_name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {activeBatch.breed}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    icon={<Calendar className="h-4 w-4" />}
                    label={t.startDate[language]}
                    value={formatDateBn(activeBatch.start_date)}
                  />
                  <Stat
                    icon={<TrendingUp className="h-4 w-4" />}
                    label={t.age[language]}
                    value={`${ageWeeksFromBatch(activeBatch, today)} ${t.weeks[language]}`}
                  />
                  <Stat
                    icon={<Bird className="h-4 w-4" />}
                    label={t.birds[language]}
                    value={`${activeBatch.current_bird_count} / ${activeBatch.initial_bird_count}`}
                  />
                  <Stat
                    icon={<Skull className="h-4 w-4" />}
                    label={language === 'bn' ? 'মৃত্যু' : 'Mortality'}
                    value={`${activeBatch.initial_bird_count - activeBatch.current_bird_count}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 text-sm font-medium"
                    onClick={() => setOpenEditActive(true)}
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 text-sm font-medium border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setOpenDeleteActive(true)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {language === 'bn' ? 'মুছুন' : 'Delete'}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setOpenClose(true)}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {t.endBatch[language]}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 py-2 text-center"
              >
                <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  {t.noBatch[language]}
                </div>
                <Button
                  onClick={() => setOpenNew(true)}
                  className="w-full h-14 text-base font-semibold shadow-md"
                  size="lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t.startNew[language]}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {completed.length > 0 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full h-11 justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {t.history[language]} ({completed.length})
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      historyOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {completed.map((b) => (
                  <PastBatchRow key={b.id} batch={b} language={language} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* New batch dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.startNew[language]}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.name[language]}</Label>
              <Input
                value={newForm.batch_name_bn}
                onChange={(e) => setNewForm((p) => ({ ...p, batch_name_bn: e.target.value }))}
                placeholder={`ব্যাচ ${allBatches.length + 1}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.breed[language]}</Label>
              <BreedCombobox
                options={LAYER_BREEDS}
                value={newForm.breed}
                onChange={(v) => setNewForm((p) => ({ ...p, breed: v }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.startDate[language]}</Label>
              <SmartDatePicker
                value={newForm.start_date}
                onChange={(iso) => setNewForm((p) => ({ ...p, start_date: iso || '' }))}
                disableFuture
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.birds[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={newForm.initial_bird_count || ''}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, initial_bird_count: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.ageStart[language]}</Label>
                <Input
                  type="number"
                  min="0"
                  value={newForm.age_at_start_weeks || ''}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, age_at_start_weeks: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.chickCost[language]}</Label>
              <Input
                type="number"
                min="0"
                value={newForm.chick_cost_per_bird || ''}
                onChange={(e) =>
                  setNewForm((p) => ({ ...p, chick_cost_per_bird: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.notes[language]}</Label>
              <Textarea
                value={newForm.notes}
                onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="h-12 w-full sm:w-auto" onClick={() => setOpenNew(false)}>
              {t.cancel[language]}
            </Button>
            <Button className="h-12 w-full sm:w-auto text-base font-semibold" onClick={handleCreate} disabled={createBatch.isPending}>
              {t.save[language]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close batch dialog */}
      <Dialog open={openClose} onOpenChange={setOpenClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.endBatch[language]}</DialogTitle>
            <DialogDescription>{t.confirmClose[language]}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.endDate[language]}</Label>
              <SmartDatePicker
                value={closeForm.end_date}
                onChange={(iso) => setCloseForm((p) => ({ ...p, end_date: iso || '' }))}
                disableFuture
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.notes[language]}</Label>
              <Textarea
                value={closeForm.notes}
                onChange={(e) => setCloseForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="h-12 w-full sm:w-auto" onClick={() => setOpenClose(false)}>
              {t.cancel[language]}
            </Button>
            <Button
              variant="destructive"
              className="h-12 w-full sm:w-auto text-base font-semibold"
              onClick={handleClose}
              disabled={closeBatch.isPending}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {t.endBatch[language]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit ACTIVE batch — reuses EditCompletedBatchDialog */}
      {activeBatch && (
        <EditCompletedBatchDialog
          batch={activeBatch}
          open={openEditActive}
          onOpenChange={setOpenEditActive}
        />
      )}

      {/* Delete ACTIVE batch confirmation */}
      <Dialog open={openDeleteActive} onOpenChange={setOpenDeleteActive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {language === 'bn' ? 'ব্যাচ মুছে ফেলবেন?' : 'Delete batch?'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই ব্যাচের সকল তথ্য (সারাংশ সহ) স্থায়ীভাবে মুছে যাবে। ডিম, খাদ্য বা মৃত্যু রেকর্ড মুছবে না — শুধু ব্যাচ মেটাডেটা।'
                : 'This batch and its summary will be permanently removed. Egg/feed/mortality records are NOT deleted — only the batch metadata.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" className="h-12 w-full sm:w-auto" onClick={() => setOpenDeleteActive(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              className="h-12 w-full sm:w-auto text-base font-semibold"
              disabled={deleteBatch.isPending}
              onClick={() => {
                if (!activeBatch) return;
                deleteBatch.mutate(activeBatch.id, {
                  onSuccess: () => setOpenDeleteActive(false),
                });
              }}
            >
              <Trash2 className="mr-2 h-5 w-5" />
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

