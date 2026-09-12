import { useQuery } from '@tanstack/react-query';
import { History, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface AuditRow {
  id: string;
  enabled: boolean;
  previous_enabled: boolean | null;
  source: string;
  note: string | null;
  changed_at: string;
  changed_by: string | null;
}

/**
 * Shows audit history of Safety Engine ON/OFF changes for the current farm.
 * Source of truth: public.safety_engine_audit_log (auto-populated by DB trigger
 * on every farm_settings.safety_engine_enabled change).
 */
export function SafetyEngineHistoryCard() {
  const { language } = useAuth();
  const { selectedFarmId } = useFarmContext();

  const { data, isLoading } = useQuery({
    queryKey: ['safety-engine-audit', selectedFarmId],
    enabled: !!selectedFarmId,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await (supabase as any)
        .from('safety_engine_audit_log')
        .select('id, enabled, previous_enabled, source, note, changed_at, changed_by')
        .eq('farm_id', selectedFarmId)
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const isBn = language === 'bn';
  const locale = isBn ? bn : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          {isBn ? 'সেফটি ইঞ্জিন হিস্ট্রি' : 'Safety Engine History'}
        </CardTitle>
        <CardDescription className="text-xs">
          {isBn
            ? 'কখন কে চালু/বন্ধ করেছেন তার সম্পূর্ণ লগ (সর্বশেষ ৫০টি)'
            : 'Full ON/OFF audit trail (latest 50 entries)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isBn ? 'এখনো কোনো পরিবর্তন রেকর্ড হয়নি।' : 'No changes recorded yet.'}
          </p>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <ul className="space-y-2">
              {data.map((row) => {
                const Icon = row.enabled ? ShieldCheck : ShieldAlert;
                const tone = row.enabled
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-amber-500/40 bg-amber-500/5';
                const iconTone = row.enabled ? 'text-green-600' : 'text-amber-600';
                const dt = new Date(row.changed_at);
                return (
                  <li
                    key={row.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${tone}`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconTone}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {row.enabled
                            ? (isBn ? 'চালু করা হয়েছে' : 'Turned ON')
                            : (isBn ? 'বন্ধ করা হয়েছে' : 'Turned OFF')}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {row.source === 'manual'
                            ? (isBn ? 'ম্যানুয়াল' : 'manual')
                            : row.source === 'system'
                              ? (isBn ? 'সিস্টেম' : 'system')
                              : row.source}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(dt, 'PPp', { locale })}
                        {' • '}
                        {formatDistanceToNow(dt, { addSuffix: true, locale })}
                      </p>
                      {row.note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {row.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
