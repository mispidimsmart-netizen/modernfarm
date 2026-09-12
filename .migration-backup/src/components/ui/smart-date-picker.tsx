import * as React from 'react';
import { format, differenceInDays, isToday, isYesterday } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { CalendarIcon, RotateCcw, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

export interface SmartDatePickerProps {
  value: string | null | undefined; // ISO yyyy-MM-dd
  onChange: (iso: string) => void;
  /** Show "X days ago / today" + age preview under the input */
  showAgePreview?: boolean;
  /** Label shown inside the trigger when no date is set */
  placeholder?: string;
  /** Disallow future dates (default: true) */
  disableFuture?: boolean;
  /** Disable dates older than N days ago */
  maxDaysAgo?: number;
  className?: string;
  /** Quick presets shown as chips above the calendar */
  presets?: Array<{
    labelBn: string;
    labelEn: string;
    daysAgo: number;
  }>;
}

const DEFAULT_PRESETS = [
  { labelBn: 'আজ', labelEn: 'Today', daysAgo: 0 },
  { labelBn: '৩ দিন আগে', labelEn: '3 days ago', daysAgo: 3 },
  { labelBn: '১ সপ্তাহ আগে', labelEn: '1 week ago', daysAgo: 7 },
  { labelBn: '২ সপ্তাহ আগে', labelEn: '2 weeks ago', daysAgo: 14 },
  { labelBn: '৩ সপ্তাহ আগে', labelEn: '3 weeks ago', daysAgo: 21 },
];

/**
 * Smart, Bengali-friendly date picker.
 * - Native popover calendar (no jumpy native browser widget)
 * - Quick "X days ago" presets
 * - Live "bird age" preview below the input
 * - Bengali month names when language === 'bn'
 */
export function SmartDatePicker({
  value,
  onChange,
  showAgePreview = false,
  placeholder,
  disableFuture = true,
  maxDaysAgo,
  className,
  presets = DEFAULT_PRESETS,
}: SmartDatePickerProps) {
  const { language } = useAuth();
  const [open, setOpen] = React.useState(false);

  const date = value ? new Date(value + 'T00:00:00') : undefined;
  const locale = language === 'bn' ? bnLocale : undefined;

  const handlePick = (d: Date | undefined) => {
    if (!d) return;
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handlePreset = (daysAgo: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  // Display label
  const displayLabel = (() => {
    if (!date) return placeholder ?? (language === 'bn' ? 'তারিখ বেছে নিন' : 'Pick a date');
    if (isToday(date)) return language === 'bn' ? `আজ • ${format(date, 'd MMM yyyy', { locale })}` : `Today • ${format(date, 'PPP')}`;
    if (isYesterday(date)) return language === 'bn' ? `গতকাল • ${format(date, 'd MMM yyyy', { locale })}` : `Yesterday • ${format(date, 'PPP')}`;
    return format(date, language === 'bn' ? 'd MMMM yyyy' : 'PPP', { locale });
  })();

  // Age preview
  const ageDays = date ? Math.max(0, differenceInDays(new Date(), date)) : null;
  const ageWeeks = ageDays !== null ? Math.floor(ageDays / 7) : null;
  const remainderDays = ageDays !== null ? ageDays % 7 : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-11 w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">

          <Calendar
            mode="single"
            selected={date}
            onSelect={handlePick}
            locale={locale}
            disabled={(d) => {
              if (disableFuture && d > today) return true;
              if (maxDaysAgo !== undefined) {
                const min = new Date();
                min.setHours(0, 0, 0, 0);
                min.setDate(min.getDate() - maxDaysAgo);
                if (d < min) return true;
              }
              return false;
            }}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />

          {/* Footer: clear / today */}
          <div className="flex items-center justify-between border-t p-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={() => handlePreset(0)}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {language === 'bn' ? 'আজকের তারিখ' : 'Today'}
            </Button>
            {date && (
              <span className="px-2 text-[11px] text-muted-foreground">
                {format(date, language === 'bn' ? 'd MMM yyyy' : 'PPP', { locale })}
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Live age preview */}
      {showAgePreview && ageDays !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            {language === 'bn' ? 'গণনাকৃত বয়স:' : 'Computed age:'}
          </span>
          <Badge variant="default" className="h-5 gap-0.5 px-1.5 text-[11px] font-bold">
            {ageDays} {language === 'bn' ? 'দিন' : 'days'}
          </Badge>
          {ageWeeks !== null && ageWeeks > 0 && (
            <span className="text-[11px] text-muted-foreground">
              (~{ageWeeks}{language === 'bn' ? ' সপ্তাহ' : 'w'}
              {remainderDays! > 0 ? ` ${remainderDays}${language === 'bn' ? 'দি' : 'd'}` : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
