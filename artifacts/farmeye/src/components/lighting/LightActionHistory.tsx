import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Lightbulb,
  LightbulbOff,
  Hand,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { cn } from '@/lib/utils';

type LogRow = {
  id: string;
  command_type: string;
  command_value: boolean;
  source: string | null;
  status: string | null;
  created_at: string;
};

type Trigger = 'manual' | 'schedule' | 'automation';

function classify(source: string | null): Trigger {
  // 'cloud' = command came from app UI (user pressed a button) → manual
  // 'schedule' / 'curve' / 'lighting_schedule' → schedule
  // anything else (safety, hsi, automation) → automation
  if (!source || source === 'cloud') return 'manual';
  const s = source.toLowerCase();
  if (s.includes('schedule') || s.includes('curve') || s.includes('light')) return 'schedule';
  return 'automation';
}

const labels = {
  bn: {
    title: 'লাইট অ্যাকশন ইতিহাস',
    subtitle: 'গত ২৪ ঘন্টা',
    on: 'চালু',
    off: 'বন্ধ',
    manual: 'ম্যানুয়াল',
    schedule: 'সময়সূচী',
    automation: 'অটোমেশন',
    empty: 'গত ২৪ ঘন্টায় কোনো লাইট পরিবর্তন হয়নি',
    justNow: 'এইমাত্র',
    minAgo: 'মিনিট আগে',
    hourAgo: 'ঘন্টা আগে',
  },
  en: {
    title: 'Light action history',
    subtitle: 'Last 24 hours',
    on: 'ON',
    off: 'OFF',
    manual: 'Manual',
    schedule: 'Schedule',
    automation: 'Automation',
    empty: 'No light changes in the last 24 hours',
    justNow: 'just now',
    minAgo: 'min ago',
    hourAgo: 'h ago',
  },
};

function formatRelative(iso: string, lang: 'bn' | 'en'): string {
  const t = labels[lang];
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return `${min} ${t.minAgo}`;
  const h = Math.floor(min / 60);
  return `${h} ${t.hourAgo}`;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function LightActionHistory() {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const t = labels[language === 'bn' ? 'bn' : 'en'];
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !selectedFarmId) return;
    let active = true;

    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('device_command_log')
        .select('id, command_type, command_value, source, status, created_at')
        .eq('farm_id', selectedFarmId)
        .eq('command_type', 'light')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!active) return;
      if (!error && data) setRows(data as LogRow[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`light-action-history-${selectedFarmId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_command_log',
          filter: `farm_id=eq.${selectedFarmId}`,
        },
        (payload) => {
          const row = payload.new as LogRow;
          if (row.command_type !== 'light') return;
          setRows((prev) => [row, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, selectedFarmId]);

  return (
    <Card className="border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            {t.title}
          </span>
          <span className="text-xs font-normal text-muted-foreground">{t.subtitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">{t.empty}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[260px] pr-2">
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {rows.map((row) => {
                  const trigger = classify(row.source);
                  const isOn = row.command_value === true;
                  const Icon = isOn ? Lightbulb : LightbulbOff;
                  const TriggerIcon =
                    trigger === 'manual' ? Hand : trigger === 'schedule' ? Clock : AlertCircle;

                  const triggerLabel =
                    trigger === 'manual' ? t.manual : trigger === 'schedule' ? t.schedule : t.automation;

                  // color tokens
                  const triggerColor =
                    trigger === 'manual'
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      : trigger === 'schedule'
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : 'bg-sky-500/15 text-sky-600 border-sky-500/30';

                  const stateColor = isOn
                    ? 'text-amber-500'
                    : 'text-slate-400';

                  return (
                    <motion.li
                      key={row.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 rounded-lg border bg-background/50 px-2.5 py-2"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md',
                          isOn ? 'bg-amber-500/10' : 'bg-muted',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', stateColor)} />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {t.on === 'চালু' ? (isOn ? 'চালু' : 'বন্ধ') : isOn ? 'ON' : 'OFF'}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('h-4 gap-1 px-1.5 text-[10px] font-medium', triggerColor)}
                          >
                            <TriggerIcon className="h-2.5 w-2.5" />
                            {triggerLabel}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelative(row.created_at, language === 'bn' ? 'bn' : 'en')}
                        </span>
                      </div>

                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatClock(row.created_at)}
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
