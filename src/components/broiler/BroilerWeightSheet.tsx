import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Plus, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useActiveBatch, useAddWeight, useBatchWeights, useBatchStats } from '@/hooks/useBroilerData';
import { getBroilerTargetWeight } from '@/hooks/useFarmType';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
                      <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{w.record_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{w.average_weight_grams.toLocaleString()}g</span>
                          {change !== 0 && (
                            <span className={`text-xs flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {change > 0 ? '+' : ''}{change}g
                            </span>
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
