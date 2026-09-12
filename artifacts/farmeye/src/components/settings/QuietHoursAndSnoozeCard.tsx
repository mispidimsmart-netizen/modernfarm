import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Moon, BellOff, Clock, ShieldAlert } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';

export function QuietHoursAndSnoozeCard({ farmId }: { farmId?: string | null }) {
  const { prefs, loading, saving, save, snooze, isSnoozed } = useNotificationPreferences(farmId);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  if (loading || !prefs) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const currStart = start || prefs.quiet_hours_start || '';
  const currEnd = end || prefs.quiet_hours_end || '';

  const applyHours = async () => {
    if (!currStart || !currEnd) {
      toast.error('শুরু ও শেষ সময় দিন');
      return;
    }
    const { error } = (await save({ quiet_hours_start: currStart, quiet_hours_end: currEnd })) ?? {};
    if (error) toast.error('সংরক্ষণ ব্যর্থ');
    else toast.success('নীরব সময় সংরক্ষিত');
  };

  const clearHours = async () => {
    setStart(''); setEnd('');
    await save({ quiet_hours_start: null, quiet_hours_end: null });
    toast.success('নীরব সময় মুছে ফেলা হয়েছে');
  };

  const doSnooze = async (minutes: number) => {
    const { error } = await snooze(minutes);
    if (error) toast.error('Snooze ব্যর্থ');
    else if (minutes === 0) toast.success('Snooze বন্ধ');
    else toast.success(`${minutes >= 60 ? minutes / 60 + ' ঘণ্টা' : minutes + ' মিনিট'} snooze চালু`);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="w-4 h-4 text-primary" />
          নীরব সময় ও Snooze
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Snooze status */}
        {isSnoozed && prefs.snooze_until && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-sm">
              <BellOff className="w-4 h-4 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-300">
                Snooze: আর {formatDistanceToNow(new Date(prefs.snooze_until), { locale: bn })}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => doSnooze(0)}>বন্ধ করুন</Button>
          </div>
        )}

        {/* Snooze quick buttons */}
        <div>
          <Label className="text-xs text-muted-foreground">দ্রুত Snooze</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => doSnooze(60)}>১ ঘণ্টা</Button>
            <Button size="sm" variant="outline" onClick={() => doSnooze(240)}>৪ ঘণ্টা</Button>
            <Button size="sm" variant="outline" onClick={() => doSnooze(480)}>৮ ঘণ্টা</Button>
          </div>
        </div>

        {/* Quiet hours */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" /> দৈনিক নীরব সময়
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">শুরু</Label>
              <Input type="time" value={currStart} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">শেষ</Label>
              <Input type="time" value={currEnd} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyHours} disabled={saving}>সংরক্ষণ</Button>
            {(prefs.quiet_hours_start || prefs.quiet_hours_end) && (
              <Button size="sm" variant="ghost" onClick={clearHours} disabled={saving}>মুছুন</Button>
            )}
            {prefs.quiet_hours_start && prefs.quiet_hours_end && (
              <Badge variant="secondary" className="ml-auto">
                {prefs.quiet_hours_start} – {prefs.quiet_hours_end}
              </Badge>
            )}
          </div>
        </div>

        {/* Critical bypass */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium">জরুরি সতর্কতা সবসময় আসবে</p>
              <p className="text-xs text-muted-foreground">
                Snooze বা নীরব সময় থাকলেও Critical alert পাবেন
              </p>
            </div>
          </div>
          <Switch
            checked={prefs.critical_bypass_quiet_hours}
            onCheckedChange={(v) => save({ critical_bypass_quiet_hours: v })}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
