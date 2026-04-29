import { useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { CalendarIcon, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export type ReportRangePreset = 7 | 14 | 30 | 90;

export interface ReportRangeValue {
  /** Effective number of days the trends should cover (>= 1). */
  days: number;
  /** Optional explicit custom range (when user picked dates manually). */
  custom?: DateRange;
}

interface ReportRangePickerProps {
  value: ReportRangeValue;
  onChange: (value: ReportRangeValue) => void;
}

const PRESETS: ReportRangePreset[] = [7, 14, 30, 90];
const DEFAULT_DAYS: ReportRangePreset = 7;

export function ReportRangePicker({ value, onChange }: ReportRangePickerProps) {
  const { language } = useAuth();
  const [open, setOpen] = useState(false);
  const isBn = language === 'bn';
  const locale = isBn ? bn : enUS;

  const presetLabel = (n: number) => (isBn ? `${n} দিন` : `${n}d`);

  const customLabel = useMemo(() => {
    if (!value.custom?.from) return isBn ? 'কাস্টম' : 'Custom';
    const from = format(value.custom.from, 'dd MMM', { locale });
    const to = value.custom.to
      ? format(value.custom.to, 'dd MMM', { locale })
      : from;
    return `${from} – ${to}`;
  }, [value.custom, isBn, locale]);

  const isCustomActive = !!value.custom?.from;
  const activePreset = !isCustomActive ? value.days : null;

  const handlePresetClick = (n: ReportRangePreset) => {
    onChange({ days: n });
  };

  const handleCustomSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;
    const to = range.to ?? range.from;
    const days = Math.max(1, differenceInCalendarDays(to, range.from) + 1);
    onChange({ days, custom: { from: range.from, to } });
    if (range.to) setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card p-1.5">
      <span className="px-1 text-[11px] text-muted-foreground">
        {isBn ? 'সময়সীমা:' : 'Range:'}
      </span>
      {PRESETS.map((n) => (
        <Button
          key={n}
          size="sm"
          variant={activePreset === n ? 'default' : 'ghost'}
          className={cn('h-7 px-2.5 text-xs')}
          onClick={() => handlePresetClick(n)}
        >
          {presetLabel(n)}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={isCustomActive ? 'default' : 'ghost'}
            className="h-7 gap-1 px-2.5 text-xs"
          >
            <CalendarIcon className="h-3 w-3" />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={value.custom}
            onSelect={handleCustomSelect}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
      {(isCustomActive || value.days !== DEFAULT_DAYS) && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ days: DEFAULT_DAYS })}
          title={isBn ? 'রিসেট' : 'Reset'}
        >
          <RotateCcw className="h-3 w-3" />
          {isBn ? 'রিসেট' : 'Reset'}
        </Button>
      )}
    </div>
  );
}
