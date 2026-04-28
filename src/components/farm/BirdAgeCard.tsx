import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bird, Calendar, Save, Info, Lightbulb, Loader2 } from 'lucide-react';
import { useIsFetching } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useFarmType } from '@/hooks/useFarmType';
import { useBirdAge, useUpdateBirdAge } from '@/hooks/useBirdAge';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { cn } from '@/lib/utils';

/**
 * Single source of truth for bird age — works for both broiler & layer.
 *
 * - Broiler: edits broiler_batches.start_date  → ageDays auto-derived
 * - Layer:   edits flock_info.age_weeks        → ageDays = weeks*7
 *
 * Used everywhere bird age matters (lighting suggestion, broiler temp curve,
 * automation, FCR, etc.). Mounted in:
 *   • Settings → Lighting tab
 *   • Settings → Farm Setup tab
 */
export function BirdAgeCard() {
  const { language } = useAuth();
  const { isBroiler } = useFarmType();
  const { ageDays, ageWeeks, source, startDate, isLoading, hasValue } = useBirdAge();
  const { mutate, isPending } = useUpdateBirdAge();

  // Track fetches on every age-dependent query — shows "Updating…" while
  // lighting / automation / curve thresholds are recomputing.
  const fetchingFlock = useIsFetching({ queryKey: ['flock-info'] });
  const fetchingActiveBatch = useIsFetching({ queryKey: ['broiler-batch-active'] });
  const fetchingBatches = useIsFetching({ queryKey: ['broiler-batches'] });
  const fetchingLightingSchedule = useIsFetching({ queryKey: ['lighting-schedule'] });
  const fetchingLightingCurve = useIsFetching({ queryKey: ['lighting-curve'] });
  const fetchingDailySummary = useIsFetching({ queryKey: ['daily-summary'] });
  const fetchingFarmSettings = useIsFetching({ queryKey: ['farm-settings'] });
  const isRecalculating =
    isPending ||
    fetchingFlock + fetchingActiveBatch + fetchingBatches +
    fetchingLightingSchedule + fetchingLightingCurve +
    fetchingDailySummary + fetchingFarmSettings > 0;

  const [draftDate, setDraftDate] = useState<string>('');
  const [draftWeeks, setDraftWeeks] = useState<string>('');

  useEffect(() => {
    if (startDate) setDraftDate(startDate);
    else if (isBroiler) setDraftDate(new Date().toISOString().split('T')[0]);
  }, [startDate, isBroiler]);

  useEffect(() => {
    if (ageWeeks !== null) setDraftWeeks(String(ageWeeks));
  }, [ageWeeks]);

  const t = {
    title: { bn: 'পাখির বয়স', en: 'Bird Age' },
    subtitle: {
      bn: 'একই বয়স লাইটিং, তাপমাত্রা ও অটোমেশনে ব্যবহৃত হয়',
      en: 'This age is used by lighting, temperature & automation',
    },
    broiler: { bn: 'ব্রয়লার', en: 'Broiler' },
    layer: { bn: 'লেয়ার', en: 'Layer' },
    startDate: { bn: 'ব্যাচ শুরুর তারিখ', en: 'Batch Start Date' },
    ageWeeksLabel: { bn: 'বয়স (সপ্তাহ)', en: 'Age (weeks)' },
    save: { bn: 'সংরক্ষণ', en: 'Save' },
    saving: { bn: 'সংরক্ষণ হচ্ছে...', en: 'Saving...' },
    days: { bn: 'দিন', en: 'days' },
    weeks: { bn: 'সপ্তাহ', en: 'weeks' },
    currentAge: { bn: 'বর্তমান বয়স', en: 'Current age' },
    notSet: { bn: 'এখনো সেট করা হয়নি', en: 'Not set yet' },
    autoNote: {
      bn: 'ব্রয়লারে শুধু শুরুর তারিখ দিন — দিনের হিসাব স্বয়ংক্রিয়।',
      en: 'For broiler just enter start date — days are auto-computed.',
    },
    layerNote: {
      bn: 'লেয়ারে সরাসরি বর্তমান বয়স (সপ্তাহ) লিখুন।',
      en: 'For layer enter current age in weeks directly.',
    },
    usedIn: { bn: 'এখানে ব্যবহৃত হয়:', en: 'Used in:' },
    chips: {
      lighting: { bn: 'লাইটিং সাজেশন', en: 'Lighting suggestion' },
      temp: { bn: 'তাপমাত্রা কার্ভ', en: 'Temp curve' },
      airflow: { bn: 'এয়ারফ্লো', en: 'Airflow' },
      heater: { bn: 'হিটার', en: 'Heater' },
      fcr: { bn: 'FCR রিপোর্ট', en: 'FCR report' },
    },
  };

  const handleSave = () => {
    if (isBroiler) {
      if (!draftDate) return;
      mutate({ startDate: draftDate });
    } else {
      const w = parseInt(draftWeeks, 10);
      if (isNaN(w) || w < 0 || w > 100) return;
      mutate({ ageWeeks: w });
    }
  };

  const usedChips = isBroiler
    ? ['lighting', 'temp', 'airflow', 'heater', 'fcr'] as const
    : ['lighting'] as const;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Bird className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span>{t.title[language]}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {t.subtitle[language]}
              </span>
            </div>
          </CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {isBroiler ? t.broiler[language] : t.layer[language]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current age display */}
        <div className="flex items-center justify-between rounded-lg border bg-card/50 p-3">
          <span className="text-xs font-medium text-muted-foreground">
            {t.currentAge[language]}
          </span>
          {isLoading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          ) : hasValue ? (
            <motion.div
              key={`${ageDays}-${ageWeeks}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-baseline gap-1.5"
            >
              <span className="text-2xl font-bold text-primary tabular-nums">
                {isBroiler ? ageDays : ageWeeks}
              </span>
              <span className="text-xs text-muted-foreground">
                {isBroiler ? t.days[language] : t.weeks[language]}
              </span>
              {isBroiler && ageWeeks !== null && (
                <span className="ml-1 text-[11px] text-muted-foreground">
                  (~{ageWeeks} {t.weeks[language]})
                </span>
              )}
            </motion.div>
          ) : (
            <span className="text-sm italic text-muted-foreground">
              {t.notSet[language]}
            </span>
          )}
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs">
            {isBroiler ? (
              <Calendar className="h-3.5 w-3.5" />
            ) : (
              <Bird className="h-3.5 w-3.5" />
            )}
            {isBroiler ? t.startDate[language] : t.ageWeeksLabel[language]}
          </Label>

          {isBroiler ? (
            <SmartDatePicker
              value={draftDate}
              onChange={setDraftDate}
              showAgePreview
              maxDaysAgo={90}
            />
          ) : (
            <Input
              type="number"
              min={0}
              max={100}
              value={draftWeeks}
              onChange={(e) => setDraftWeeks(e.target.value)}
              placeholder="20"
              className="h-10"
            />
          )}

          <Button
            onClick={handleSave}
            disabled={isPending || (isBroiler ? !draftDate : !draftWeeks)}
            className="w-full"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? t.saving[language] : t.save[language]}
          </Button>
        </div>

        {/* Helper */}
        <Alert className="border-dashed bg-muted/30 py-2">
          <Info className="h-3.5 w-3.5" />
          <AlertDescription className="text-[11px] leading-relaxed">
            {isBroiler ? t.autoNote[language] : t.layerNote[language]}
          </AlertDescription>
        </Alert>

        {/* Where it is used */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            {t.usedIn[language]}
          </p>
          <div className="flex flex-wrap gap-1">
            {usedChips.map((key) => (
              <Badge
                key={key}
                variant="outline"
                className={cn('h-5 px-1.5 text-[10px] font-normal')}
              >
                {t.chips[key][language]}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
