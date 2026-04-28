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
} from 'lucide-react';
import { EditCompletedBatchDialog } from '@/components/farm/EditCompletedBatchDialog';
import { useAuth } from '@/context/AuthContext';
import {
  useActiveLayerBatch,
  useLayerBatches,
  useCreateLayerBatch,
  useCloseLayerBatch,
  useLayerBatchSummary,
  useLayerBatchTrend,
  type LayerBatch,
} from '@/hooks/useLayerBatch';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BreedCombobox, type BreedOption } from '@/components/farm/BreedCombobox';

const LAYER_BREEDS: BreedOption[] = [
  { value: 'ISA Brown', label: 'ISA Brown (আইএসএ ব্রাউন)', keywords: 'isa brown আইএসএ' },
  { value: 'Hy-Line Brown', label: 'Hy-Line Brown (হাই-লাইন ব্রাউন)', keywords: 'hyline hy-line brown হাই-লাইন' },
  { value: 'Hy-Line W-36', label: 'Hy-Line W-36 (হাই-লাইন W-36)', keywords: 'hyline w36 হাই-লাইন' },
  { value: 'Lohmann Brown', label: 'Lohmann Brown (লোহম্যান ব্রাউন)', keywords: 'lohmann brown লোহম্যান' },
  { value: 'Lohmann LSL', label: 'Lohmann LSL (লোহম্যান এলএসএল)', keywords: 'lohmann lsl লোহম্যান' },
  { value: 'Bovans Brown', label: 'Bovans Brown (বোভান্স ব্রাউন)', keywords: 'bovans brown বোভান্স' },
  { value: 'Bovans White', label: 'Bovans White (বোভান্স হোয়াইট)', keywords: 'bovans white বোভান্স' },
  { value: 'Hisex Brown', label: 'Hisex Brown (হাইসেক্স ব্রাউন)', keywords: 'hisex brown হাইসেক্স' },
  { value: 'Novogen Brown', label: 'Novogen Brown (নোভোজেন ব্রাউন)', keywords: 'novogen brown নোভোজেন' },
  { value: 'Shaver 579', label: 'Shaver 579 (শেভার ৫৭৯)', keywords: 'shaver 579 শেভার' },
  { value: 'BV-300', label: 'BV-300 (বিভি-৩০০)', keywords: 'bv 300 বিভি' },
  { value: 'Sonali (সোনালী)', label: 'Sonali (সোনালী)', keywords: 'sonali সোনালী' },
  { value: 'Local (দেশি)', label: 'Local (দেশি)', keywords: 'local desi দেশি' },
  { value: 'Other', label: 'Other (অন্যান্য)', keywords: 'other অন্যান্য' },
];
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

function formatDateBn(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ageWeeksFromBatch(b: LayerBatch) {
  const start = new Date(b.start_date);
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return b.age_at_start_weeks + Math.floor(days / 7);
}

export function LayerBatchCard() {
  const { language } = useAuth();
  const { data: activeBatch, isLoading } = useActiveLayerBatch();
  const { data: allBatches = [] } = useLayerBatches();
  const createBatch = useCreateLayerBatch();
  const closeBatch = useCloseLayerBatch();

  const [openNew, setOpenNew] = useState(false);
  const [openClose, setOpenClose] = useState(false);
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
                    value={`${ageWeeksFromBatch(activeBatch)} ${t.weeks[language]}`}
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
              <Select
                value={newForm.breed}
                onValueChange={(v) => setNewForm((p) => ({ ...p, breed: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYER_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function PastBatchRow({ batch, language }: { batch: LayerBatch; language: 'bn' | 'en' }) {
  const { data: summary } = useLayerBatchSummary(batch.id);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-stretch gap-1">
          <CollapsibleTrigger asChild>
            <button className="flex-1 rounded-lg border bg-muted/30 p-2.5 text-left hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {batch.batch_name_bn || batch.batch_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateBn(batch.start_date)} → {formatDateBn(batch.actual_end_date)}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-auto w-9 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
            title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent className="mt-1 grid grid-cols-3 gap-1.5 px-2">
          <MiniStat
            icon={<Egg className="h-3 w-3" />}
            label={language === 'bn' ? 'মোট ডিম' : 'Eggs'}
            value={summary?.total_eggs?.toLocaleString() || '—'}
          />
          <MiniStat
            icon={<TrendingUp className="h-3 w-3" />}
            label={language === 'bn' ? 'পিক %' : 'Peak %'}
            value={summary ? `${summary.peak_production_percent}%` : '—'}
          />
          <MiniStat
            icon={<Skull className="h-3 w-3" />}
            label={language === 'bn' ? 'মৃত্যু %' : 'Mort %'}
            value={summary ? `${summary.mortality_percent}%` : '—'}
          />
          <MiniStat
            icon={<Wheat className="h-3 w-3" />}
            label={language === 'bn' ? 'খাদ্য' : 'Feed'}
            value={summary ? `${summary.total_feed_kg} kg` : '—'}
          />
          <MiniStat
            icon={<TrendingUp className="h-3 w-3" />}
            label="FCR"
            value={summary?.fcr?.toString() || '—'}
          />
          <MiniStat
            icon={<Calendar className="h-3 w-3" />}
            label={language === 'bn' ? 'দিন' : 'Days'}
            value={summary?.duration_days?.toString() || '—'}
          />
        </CollapsibleContent>
        <CollapsibleContent className="mt-2 px-2">
          <BatchTrendChart batch={batch} language={language} />
        </CollapsibleContent>
      </Collapsible>

      <EditCompletedBatchDialog
        batch={batch}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function BatchTrendChart({
  batch,
  language,
}: {
  batch: LayerBatch;
  language: 'bn' | 'en';
}) {
  const { data: trend = [], isLoading } = useLayerBatchTrend(batch);

  const t = {
    title: { bn: 'দৈনিক ট্রেন্ড', en: 'Daily Trend' },
    eggs: { bn: 'ডিম', en: 'Eggs' },
    mortality: { bn: 'মৃত্যু', en: 'Mortality' },
    noData: { bn: 'এই ব্যাচে কোনো দৈনিক রেকর্ড নেই', en: 'No daily records for this batch' },
  };

  if (isLoading) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-lg border bg-card">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (trend.length === 0) {
    return (
      <div className="flex h-[80px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-3 text-center text-xs text-muted-foreground">
        {t.noData[language]}
      </div>
    );
  }

  const chartData = trend.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t.title[language]}
        </span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t.eggs[language]}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            {t.mortality[language]}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 9, fill: 'hsl(var(--destructive))' }}
            tickLine={false}
            axisLine={false}
            width={20}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="eggs"
            name={t.eggs[language]}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Bar
            yAxisId="right"
            dataKey="mortality"
            name={t.mortality[language]}
            fill="hsl(var(--destructive))"
            radius={[2, 2, 0, 0]}
            barSize={6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-card p-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}
