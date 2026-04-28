import { useEffect, useState } from 'react';
import { Pencil, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  useEditCompletedLayerBatch,
  useLayerBatchSummary,
  type LayerBatch,
} from '@/hooks/useLayerBatch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface EditCompletedBatchDialogProps {
  batch: LayerBatch;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditCompletedBatchDialog({
  batch,
  open,
  onOpenChange,
}: EditCompletedBatchDialogProps) {
  const { language } = useAuth();
  const editBatch = useEditCompletedLayerBatch();
  const { data: summary } = useLayerBatchSummary(batch.id);

  const [form, setForm] = useState({
    start_date: batch.start_date,
    actual_end_date: batch.actual_end_date || new Date().toISOString().split('T')[0],
    initial_bird_count: batch.initial_bird_count,
    current_bird_count: batch.current_bird_count,
    chick_cost_per_bird: batch.chick_cost_per_bird,
    notes: '',
  });

  // Snapshot the batch's updated_at when dialog opens — used for conflict detection
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string>(batch.updated_at);
  const [conflict, setConflict] = useState<{ serverUpdatedAt: string } | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        start_date: batch.start_date,
        actual_end_date: batch.actual_end_date || new Date().toISOString().split('T')[0],
        initial_bird_count: batch.initial_bird_count,
        current_bird_count: batch.current_bird_count,
        chick_cost_per_bird: batch.chick_cost_per_bird,
        notes: '',
      });
      setSnapshotUpdatedAt(batch.updated_at);
      setConflict(null);
    }
  }, [open, batch]);

  const t = {
    title: { bn: 'সমাপ্ত ব্যাচ সম্পাদনা', en: 'Edit Completed Batch' },
    desc: {
      bn: 'তারিখ বা পাখির সংখ্যা পরিবর্তন করলে FCR, মৃত্যুহার, ও মোট হিসাব স্বয়ংক্রিয়ভাবে পুনঃগণনা হবে।',
      en: 'Changing dates or bird count will auto-recalculate FCR, mortality, and totals.',
    },
    startDate: { bn: 'শুরুর তারিখ', en: 'Start Date' },
    endDate: { bn: 'শেষের তারিখ', en: 'End Date' },
    initial: { bn: 'প্রাথমিক পাখি', en: 'Initial Birds' },
    final: { bn: 'চূড়ান্ত পাখি', en: 'Final Birds' },
    chickCost: { bn: 'প্রতি পাখির দাম (৳)', en: 'Cost per Bird (৳)' },
    notes: { bn: 'নোট (ঐচ্ছিক)', en: 'Notes (optional)' },
    save: { bn: 'সংরক্ষণ ও পুনঃগণনা', en: 'Save & Recalculate' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    current: { bn: 'বর্তমান সারাংশ', en: 'Current Summary' },
    eggs: { bn: 'মোট ডিম', en: 'Total Eggs' },
    fcr: { bn: 'FCR', en: 'FCR' },
    mort: { bn: 'মৃত্যুহার', en: 'Mortality' },
    feed: { bn: 'খাদ্য', en: 'Feed' },
    invalid: {
      bn: 'শেষের তারিখ অবশ্যই শুরুর তারিখের পরে হতে হবে',
      en: 'End date must be after start date',
    },
    invalidBirds: {
      bn: 'চূড়ান্ত পাখির সংখ্যা প্রাথমিকের চেয়ে বেশি হতে পারে না',
      en: 'Final birds cannot exceed initial',
    },
    conflictTitle: {
      bn: '⚠️ ব্যাচের তথ্য পরিবর্তিত হয়েছে',
      en: '⚠️ Batch data has changed',
    },
    conflictMsg: {
      bn: 'আপনি ডায়ালগ খোলার পর অন্য কেউ এই ব্যাচ আপডেট করেছে। আপনার পরিবর্তন সংরক্ষণ করলে তাদের পরিবর্তন মুছে যাবে।',
      en: 'Someone else updated this batch after you opened the dialog. Saving will overwrite their changes.',
    },
    overwrite: { bn: 'যাইহোক ওভাররাইট করুন', en: 'Overwrite anyway' },
    reload: { bn: 'নতুন তথ্য লোড করুন', en: 'Reload latest' },
  };

  const dateInvalid = new Date(form.actual_end_date) < new Date(form.start_date);
  const birdsInvalid = form.current_bird_count > form.initial_bird_count;
  const canSave = !dateInvalid && !birdsInvalid && form.initial_bird_count > 0;

  const submit = (force: boolean) => {
    editBatch.mutate(
      {
        batchId: batch.id,
        start_date: form.start_date,
        actual_end_date: form.actual_end_date,
        initial_bird_count: form.initial_bird_count,
        current_bird_count: form.current_bird_count,
        chick_cost_per_bird: form.chick_cost_per_bird,
        notes: form.notes,
        expectedUpdatedAt: snapshotUpdatedAt,
        force,
      },
      {
        onSuccess: () => {
          setConflict(null);
          onOpenChange(false);
        },
        onError: (err: any) => {
          if (err?.code === 'BATCH_CONFLICT') {
            setConflict({ serverUpdatedAt: err.serverUpdatedAt });
          }
        },
      }
    );
  };

  const handleSave = () => submit(false);
  const handleOverwrite = () => submit(true);
  const handleReload = () => {
    // Re-snapshot from latest prop (parent will refetch via query invalidation)
    setForm({
      start_date: batch.start_date,
      actual_end_date: batch.actual_end_date || new Date().toISOString().split('T')[0],
      initial_bird_count: batch.initial_bird_count,
      current_bird_count: batch.current_bird_count,
      chick_cost_per_bird: batch.chick_cost_per_bird,
      notes: '',
    });
    setSnapshotUpdatedAt(batch.updated_at);
    setConflict(null);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            {t.title[language]}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {batch.batch_name_bn || batch.batch_name}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">{t.desc[language]}</DialogDescription>
        </DialogHeader>

        {/* Current summary preview */}
        {summary && (
          <div className="rounded-lg border bg-muted/30 p-2.5">
            <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              {t.current[language]}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <SummaryPill label={t.eggs[language]} value={summary.total_eggs.toLocaleString()} />
              <SummaryPill label={t.fcr[language]} value={summary.fcr.toString()} />
              <SummaryPill
                label={t.mort[language]}
                value={`${summary.mortality_percent}%`}
              />
              <SummaryPill
                label={t.feed[language]}
                value={`${summary.total_feed_kg}kg`}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.startDate[language]}</Label>
              <SmartDatePicker
                value={form.start_date}
                onChange={(iso) => setForm((p) => ({ ...p, start_date: iso || '' }))}
                disableFuture
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.endDate[language]}</Label>
              <SmartDatePicker
                value={form.actual_end_date}
                onChange={(iso) => setForm((p) => ({ ...p, actual_end_date: iso || '' }))}
                disableFuture
              />
            </div>
          </div>

          {dateInvalid && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">{t.invalid[language]}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.initial[language]}</Label>
              <Input
                type="number"
                min="1"
                value={form.initial_bird_count || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    initial_bird_count: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.final[language]}</Label>
              <Input
                type="number"
                min="0"
                value={form.current_bird_count || ''}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    current_bird_count: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {birdsInvalid && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">{t.invalidBirds[language]}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t.chickCost[language]}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={form.chick_cost_per_bird || ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  chick_cost_per_bird: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t.notes[language]}</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder={
                language === 'bn'
                  ? 'কেন আপডেট করছেন?'
                  : 'Reason for the edit?'
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel[language]}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || editBatch.isPending}
            className="gap-1.5"
          >
            {editBatch.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t.save[language]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card p-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}
