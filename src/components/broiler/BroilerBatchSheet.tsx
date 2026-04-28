import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bird, Plus, Check, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSheds } from '@/hooks/useSheds';
import { useCreateBatch, useUpdateBatch, useDeleteBatch, useBroilerBatches, BroilerBatch } from '@/hooks/useBroilerData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BroilerBatchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  batch_name: '',
  batch_name_bn: '',
  shed_id: '',
  start_date: new Date().toISOString().split('T')[0],
  initial_bird_count: '',
  current_bird_count: '',
  chick_cost_per_bird: '',
  target_weight_grams: '2200',
  breed: 'Cobb 500',
};

export function BroilerBatchSheet({ open, onOpenChange }: BroilerBatchSheetProps) {
  const { language } = useAuth();
  const { data: sheds } = useSheds();
  const { data: batches } = useBroilerBatches();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BroilerBatch | null>(null);
  const [form, setForm] = useState(emptyForm);

  const activeBatches = batches?.filter(b => b.status === 'active') || [];
  const completedBatches = batches?.filter(b => b.status === 'completed') || [];

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!form.batch_name || !form.initial_bird_count) return;

    if (editingId) {
      await updateBatch.mutateAsync({
        id: editingId,
        batch_name: form.batch_name,
        batch_name_bn: form.batch_name_bn || form.batch_name,
        shed_id: form.shed_id || null,
        start_date: form.start_date,
        initial_bird_count: parseInt(form.initial_bird_count),
        current_bird_count: parseInt(form.current_bird_count) || parseInt(form.initial_bird_count),
        chick_cost_per_bird: parseFloat(form.chick_cost_per_bird) || 0,
        target_weight_grams: parseInt(form.target_weight_grams) || 2200,
        breed: form.breed,
      });
    } else {
      await createBatch.mutateAsync({
        batch_name: form.batch_name,
        batch_name_bn: form.batch_name_bn || form.batch_name,
        shed_id: form.shed_id || null,
        start_date: form.start_date,
        initial_bird_count: parseInt(form.initial_bird_count),
        chick_cost_per_bird: parseFloat(form.chick_cost_per_bird) || 0,
        target_weight_grams: parseInt(form.target_weight_grams) || 2200,
        breed: form.breed,
      });
    }

    resetForm();
    setTab('list');
  };

  const handleEdit = (batch: BroilerBatch) => {
    setEditingId(batch.id);
    setForm({
      batch_name: batch.batch_name,
      batch_name_bn: batch.batch_name_bn || '',
      shed_id: batch.shed_id || '',
      start_date: batch.start_date,
      initial_bird_count: String(batch.initial_bird_count),
      current_bird_count: String(batch.current_bird_count),
      chick_cost_per_bird: String(batch.chick_cost_per_bird || ''),
      target_weight_grams: String(batch.target_weight_grams || 2200),
      breed: batch.breed || 'Cobb 500',
    });
    setTab('new');
  };

  const handleCompleteBatch = async (batch: BroilerBatch) => {
    await updateBatch.mutateAsync({
      id: batch.id,
      status: 'completed',
      actual_end_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleReactivate = async (batch: BroilerBatch) => {
    await updateBatch.mutateAsync({
      id: batch.id,
      status: 'active',
      actual_end_date: null,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBatch.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getAgeDays = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const t = {
    title: { bn: '🐔 ব্যাচ ম্যানেজমেন্ট', en: '🐔 Batch Management' },
    list: { bn: 'ব্যাচ তালিকা', en: 'Batch List' },
    new: { bn: '+ নতুন ব্যাচ', en: '+ New Batch' },
    edit: { bn: '✏️ এডিট', en: '✏️ Edit' },
    active: { bn: 'সক্রিয়', en: 'Active' },
    completed: { bn: 'সম্পন্ন', en: 'Completed' },
    noBatches: { bn: 'কোনো ব্যাচ নেই', en: 'No batches found' },
    batchName: { bn: 'ব্যাচের নাম', en: 'Batch Name' },
    batchNameBn: { bn: 'বাংলা নাম', en: 'Bengali Name' },
    startDate: { bn: 'শুরুর তারিখ', en: 'Start Date' },
    birdCount: { bn: 'মুরগির সংখ্যা', en: 'Bird Count' },
    currentCount: { bn: 'বর্তমান সংখ্যা', en: 'Current Count' },
    chickCost: { bn: 'প্রতি বাচ্চার দাম (৳)', en: 'Cost per Chick (৳)' },
    targetWeight: { bn: 'টার্গেট ওজন (গ্রাম)', en: 'Target Weight (g)' },
    breed: { bn: 'জাত', en: 'Breed' },
    shed: { bn: 'শেড', en: 'Shed' },
    create: { bn: 'ব্যাচ তৈরি করুন', en: 'Create Batch' },
    save: { bn: 'পরিবর্তন সংরক্ষণ করুন', en: 'Save Changes' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    days: { bn: 'দিন', en: 'days' },
    birds: { bn: 'মুরগি', en: 'birds' },
    complete: { bn: 'সম্পন্ন', en: 'Complete' },
    reactivate: { bn: 'পুনরায় চালু', en: 'Reactivate' },
    delete: { bn: 'মুছুন', en: 'Delete' },
    deleteConfirmTitle: { bn: 'ব্যাচ মুছবেন?', en: 'Delete this batch?' },
    deleteConfirmDesc: {
      bn: 'এই ব্যাচের সাথে সব ওজন, খাদ্য, মৃত্যু ও বিক্রয়ের রেকর্ডও মুছে যাবে। এটি ফিরিয়ে আনা যাবে না।',
      en: 'All weight, feed, mortality and sales records linked to this batch will also be deleted. This cannot be undone.',
    },
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl">{t.title[language]}</SheetTitle>
          </SheetHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'list' | 'new')} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl bg-muted/50 p-1 mb-4">
              <TabsTrigger value="list" className="rounded-lg text-xs">
                {t.list[language]}
              </TabsTrigger>
              <TabsTrigger value="new" className="rounded-lg text-xs">
                {editingId ? t.edit[language] : t.new[language]}
              </TabsTrigger>
            </TabsList>

            {/* Batch List Tab */}
            <TabsContent value="list" className="space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Active Batches */}
              {activeBatches.length > 0 && (
                <div className="space-y-3">
                  <Badge variant="default" className="bg-green-500">
                    {t.active[language]}
                  </Badge>
                  {activeBatches.map((batch) => (
                    <Card key={batch.id} className="border-green-500/30 bg-green-500/5">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Bird className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{language === 'bn' ? batch.batch_name_bn : batch.batch_name}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                              <span>📅 {getAgeDays(batch.start_date)} {t.days[language]}</span>
                              <span>•</span>
                              <span>🐔 {batch.current_bird_count.toLocaleString()} {t.birds[language]}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{batch.breed}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(batch)} className="text-xs">
                            <Pencil className="h-3 w-3 mr-1" />
                            {t.edit[language]}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteBatch(batch)}
                            disabled={updateBatch.isPending}
                            className="text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            {t.complete[language]}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(batch)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t.delete[language]}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Completed Batches */}
              {completedBatches.length > 0 && (
                <div className="space-y-3">
                  <Badge variant="secondary">{t.completed[language]}</Badge>
                  {completedBatches.slice(0, 10).map((batch) => (
                    <Card key={batch.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                            <Bird className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{language === 'bn' ? batch.batch_name_bn : batch.batch_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {batch.start_date} → {batch.actual_end_date || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(batch)} className="text-xs">
                            <Pencil className="h-3 w-3 mr-1" />
                            {t.edit[language]}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReactivate(batch)}
                            disabled={updateBatch.isPending}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t.reactivate[language]}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(batch)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t.delete[language]}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* No Batches */}
              {batches?.length === 0 && (
                <div className="text-center py-12">
                  <Bird className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">{t.noBatches[language]}</p>
                  <Button className="mt-4" onClick={() => setTab('new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.new[language]}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* New / Edit Batch Tab */}
            <TabsContent value="new" className="space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.batchName[language]}</Label>
                    <Input
                      value={form.batch_name}
                      onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                      placeholder="Batch 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.batchNameBn[language]}</Label>
                    <Input
                      value={form.batch_name_bn}
                      onChange={(e) => setForm({ ...form, batch_name_bn: e.target.value })}
                      placeholder="ব্যাচ ১"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.shed[language]}</Label>
                    <Select value={form.shed_id} onValueChange={(v) => setForm({ ...form, shed_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'bn' ? 'শেড নির্বাচন' : 'Select shed'} />
                      </SelectTrigger>
                      <SelectContent>
                        {sheds?.map((shed) => (
                          <SelectItem key={shed.id} value={shed.id}>
                            {language === 'bn' ? shed.name : shed.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      {t.startDate[language]}
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
                        {language === 'bn' ? '🐔 পাখির বয়সের উৎস' : '🐔 Bird age source'}
                      </span>
                    </Label>
                    <SmartDatePicker
                      value={form.start_date}
                      onChange={(iso) => setForm({ ...form, start_date: iso })}
                      showAgePreview
                      maxDaysAgo={90}
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {language === 'bn'
                        ? 'এই তারিখ থেকে পাখির বয়স স্বয়ংক্রিয়ভাবে গণনা হয়। পরে Settings → Lighting/Farm Setup এর "পাখির বয়স" কার্ড থেকেও সংশোধন করা যাবে।'
                        : 'Bird age is auto-calculated from this date. You can also adjust it later from the "Bird Age" card in Settings → Lighting/Farm Setup.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.birdCount[language]} *</Label>
                    <Input
                      type="number"
                      value={form.initial_bird_count}
                      onChange={(e) => setForm({ ...form, initial_bird_count: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                  {editingId ? (
                    <div className="space-y-2">
                      <Label>{t.currentCount[language]}</Label>
                      <Input
                        type="number"
                        value={form.current_bird_count}
                        onChange={(e) => setForm({ ...form, current_bird_count: e.target.value })}
                        placeholder="1000"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>{t.chickCost[language]}</Label>
                      <Input
                        type="number"
                        value={form.chick_cost_per_bird}
                        onChange={(e) => setForm({ ...form, chick_cost_per_bird: e.target.value })}
                        placeholder="45"
                      />
                    </div>
                  )}
                </div>

                {editingId && (
                  <div className="space-y-2">
                    <Label>{t.chickCost[language]}</Label>
                    <Input
                      type="number"
                      value={form.chick_cost_per_bird}
                      onChange={(e) => setForm({ ...form, chick_cost_per_bird: e.target.value })}
                      placeholder="45"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t.targetWeight[language]}</Label>
                    <Input
                      type="number"
                      value={form.target_weight_grams}
                      onChange={(e) => setForm({ ...form, target_weight_grams: e.target.value })}
                      placeholder="2200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.breed[language]}</Label>
                    <Select value={form.breed} onValueChange={(v) => setForm({ ...form, breed: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cobb 500">Cobb 500 (কব ৫০০)</SelectItem>
                        <SelectItem value="Ross 308">Ross 308 (রস ৩০৮)</SelectItem>
                        <SelectItem value="Hubbard Classic">Hubbard Classic (হাবার্ড ক্লাসিক)</SelectItem>
                        <SelectItem value="Arbor Acres Plus">Arbor Acres Plus (আরবর একর্স প্লাস)</SelectItem>
                        <SelectItem value="Indian River">Indian River (ইন্ডিয়ান রিভার)</SelectItem>
                        <SelectItem value="Sonali">Sonali (সোনালী)</SelectItem>
                        <SelectItem value="Cobb 700">Cobb 700 (কব ৭০০)</SelectItem>
                        <SelectItem value="Local">দেশি (Local)</SelectItem>
                        <SelectItem value="Other">অন্যান্য (Other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingId && (
                    <Button
                      variant="outline"
                      className="flex-1 h-12"
                      onClick={() => { resetForm(); setTab('list'); }}
                    >
                      {t.cancel[language]}
                    </Button>
                  )}
                  <Button
                    className="flex-1 h-12 text-base"
                    onClick={handleSubmit}
                    disabled={createBatch.isPending || updateBatch.isPending || !form.batch_name || !form.initial_bird_count}
                  >
                    {(createBatch.isPending || updateBatch.isPending) ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Bird className="h-5 w-5" />
                        </motion.div>
                        {language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}
                      </span>
                    ) : (
                      <>
                        {editingId ? <Check className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                        {editingId ? t.save[language] : t.create[language]}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteConfirmTitle[language]}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{language === 'bn' ? deleteTarget?.batch_name_bn : deleteTarget?.batch_name}</strong>
              <br />
              {t.deleteConfirmDesc[language]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.delete[language]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
