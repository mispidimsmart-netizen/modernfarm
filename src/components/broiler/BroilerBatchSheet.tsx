import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bird, Calendar, Hash, Target, DollarSign, Plus, Check, X, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSheds } from '@/hooks/useSheds';
import { useCreateBatch, useUpdateBatch, useBroilerBatches, BroilerBatch } from '@/hooks/useBroilerData';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BroilerBatchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroilerBatchSheet({ open, onOpenChange }: BroilerBatchSheetProps) {
  const { language } = useAuth();
  const { data: sheds } = useSheds();
  const { data: batches } = useBroilerBatches();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  const [tab, setTab] = useState<'list' | 'new'>('list');
  const [form, setForm] = useState({
    batch_name: '',
    batch_name_bn: '',
    shed_id: '',
    start_date: new Date().toISOString().split('T')[0],
    initial_bird_count: '',
    chick_cost_per_bird: '',
    target_weight_grams: '2200',
    breed: 'Cobb 500',
  });

  const activeBatches = batches?.filter(b => b.status === 'active') || [];
  const completedBatches = batches?.filter(b => b.status === 'completed') || [];

  const handleSubmit = async () => {
    if (!form.batch_name || !form.initial_bird_count) return;

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

    // Reset form
    setForm({
      batch_name: '',
      batch_name_bn: '',
      shed_id: '',
      start_date: new Date().toISOString().split('T')[0],
      initial_bird_count: '',
      chick_cost_per_bird: '',
      target_weight_grams: '2200',
      breed: 'Cobb 500',
    });
    setTab('list');
  };

  const handleCompleteBatch = async (batch: BroilerBatch) => {
    await updateBatch.mutateAsync({
      id: batch.id,
      status: 'completed',
      actual_end_date: new Date().toISOString().split('T')[0],
    });
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
    active: { bn: 'সক্রিয়', en: 'Active' },
    completed: { bn: 'সম্পন্ন', en: 'Completed' },
    noBatches: { bn: 'কোনো ব্যাচ নেই', en: 'No batches found' },
    batchName: { bn: 'ব্যাচের নাম', en: 'Batch Name' },
    batchNameBn: { bn: 'বাংলা নাম', en: 'Bengali Name' },
    startDate: { bn: 'শুরুর তারিখ', en: 'Start Date' },
    birdCount: { bn: 'মুরগির সংখ্যা', en: 'Bird Count' },
    chickCost: { bn: 'প্রতি বাচ্চার দাম (৳)', en: 'Cost per Chick (৳)' },
    targetWeight: { bn: 'টার্গেট ওজন (গ্রাম)', en: 'Target Weight (g)' },
    breed: { bn: 'জাত', en: 'Breed' },
    shed: { bn: 'শেড', en: 'Shed' },
    create: { bn: 'ব্যাচ তৈরি করুন', en: 'Create Batch' },
    days: { bn: 'দিন', en: 'days' },
    birds: { bn: 'মুরগি', en: 'birds' },
    complete: { bn: 'সম্পন্ন করুন', en: 'Complete' },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
              {t.new[language]}
            </TabsTrigger>
          </TabsList>

          {/* Batch List Tab */}
          <TabsContent value="list" className="space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Active Batches */}
            {activeBatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {t.active[language]}
                  </Badge>
                </div>
                {activeBatches.map((batch) => (
                  <Card key={batch.id} className="border-green-500/30 bg-green-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Bird className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold">{language === 'bn' ? batch.batch_name_bn : batch.batch_name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>📅 {getAgeDays(batch.start_date)} {t.days[language]}</span>
                              <span>•</span>
                              <span>🐔 {batch.current_bird_count.toLocaleString()} {t.birds[language]}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {batch.breed}
                            </p>
                          </div>
                        </div>
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed Batches */}
            {completedBatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {t.completed[language]}
                  </Badge>
                </div>
                {completedBatches.slice(0, 5).map((batch) => (
                  <Card key={batch.id} className="opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                          <Bird className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{language === 'bn' ? batch.batch_name_bn : batch.batch_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {batch.start_date} → {batch.actual_end_date}
                          </p>
                        </div>
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
                <Button
                  className="mt-4"
                  onClick={() => setTab('new')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.new[language]}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* New Batch Tab */}
          <TabsContent value="new" className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {/* Batch Name */}
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

              {/* Shed & Start Date */}
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
                  <Label>{t.startDate[language]}</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Bird Count & Chick Cost */}
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
                <div className="space-y-2">
                  <Label>{t.chickCost[language]}</Label>
                  <Input
                    type="number"
                    value={form.chick_cost_per_bird}
                    onChange={(e) => setForm({ ...form, chick_cost_per_bird: e.target.value })}
                    placeholder="45"
                  />
                </div>
              </div>

              {/* Target Weight & Breed */}
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
                      <SelectItem value="Cobb 500">Cobb 500</SelectItem>
                      <SelectItem value="Ross 308">Ross 308</SelectItem>
                      <SelectItem value="Arbor Acres">Arbor Acres</SelectItem>
                      <SelectItem value="Hubbard">Hubbard</SelectItem>
                      <SelectItem value="Local">Local / দেশি</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full h-12 text-base"
                onClick={handleSubmit}
                disabled={createBatch.isPending || !form.batch_name || !form.initial_bird_count}
              >
                {createBatch.isPending ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Bird className="h-5 w-5" />
                    </motion.div>
                    {language === 'bn' ? 'তৈরি হচ্ছে...' : 'Creating...'}
                  </span>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    {t.create[language]}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
