import { useState } from 'react';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { Plus, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CAUSES, HEALTH_LABELS as t, optionLabel, type Lang } from '@/lib/healthOptions';
import { useMortalityRecords, useAddMortalityRecord, useFlockInfo } from '@/hooks/useFarmManagement';

export function MortalityTab({
  language,
  canLogDailyData,
}: {
  language: Lang;
  canLogDailyData: boolean;
}) {
  const { data: mortRecords } = useMortalityRecords();
  const { data: flockInfo } = useFlockInfo();
  const addMortality = useAddMortalityRecord();

  const [mortForm, setMortForm] = useState({
    record_date: format(new Date(), 'yyyy-MM-dd'),
    count: 1,
    cause: 'unknown',
    notes: '',
  });

  const handleAddMortality = () => {
    addMortality.mutate(
      {
        record_date: mortForm.record_date,
        count: mortForm.count,
        cause: mortForm.cause,
        age_weeks: flockInfo?.age_weeks ?? null,
        notes: mortForm.notes || null,
      } as never,
      {
        onSuccess: () =>
          setMortForm({
            record_date: format(new Date(), 'yyyy-MM-dd'),
            count: 1,
            cause: 'unknown',
            notes: '',
          }),
      }
    );
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t.date[language]}</Label>
          <SmartDatePicker
            value={mortForm.record_date || null}
            onChange={(iso) => setMortForm((p) => ({ ...p, record_date: iso || '' }))}
            disableFuture
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t.count[language]}</Label>
          <Input
            type="number"
            min="1"
            value={mortForm.count}
            onChange={(e) => setMortForm((p) => ({ ...p, count: parseInt(e.target.value) || 1 }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t.cause[language]}</Label>
        <Select
          value={mortForm.cause}
          onValueChange={(v) => setMortForm((p) => ({ ...p, cause: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAUSES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c[language]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t.notes[language]}</Label>
        <Input
          value={mortForm.notes}
          onChange={(e) => setMortForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder={language === 'bn' ? 'বিস্তারিত (ঐচ্ছিক)' : 'Details (optional)'}
        />
      </div>

      <Button
        onClick={handleAddMortality}
        className="w-full h-12 bg-destructive hover:bg-destructive/90"
        disabled={addMortality.isPending || !canLogDailyData}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t.save[language]}
      </Button>

      <div>
        <p className="text-[11px] uppercase font-semibold text-muted-foreground mt-4 mb-2 px-1">
          {t.history[language]}
        </p>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {(mortRecords ?? []).slice(0, 10).map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2">
                  <Skull className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-xs">
                      {format(new Date(r.record_date), 'dd MMM', {
                        locale: language === 'bn' ? bn : enUS,
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {optionLabel(CAUSES, r.cause, language)}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-destructive text-sm">{r.count}</p>
              </CardContent>
            </Card>
          ))}
          {!mortRecords?.length && (
            <p className="text-center text-xs text-muted-foreground py-4">
              {language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
