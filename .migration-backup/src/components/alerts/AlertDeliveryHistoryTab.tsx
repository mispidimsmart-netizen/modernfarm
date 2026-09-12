import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { RefreshCcw, CheckCircle2, XCircle, Clock, MoonStar, BellOff, Send, Smartphone, MessageSquare, MessageCircle, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAlertDeliveryHistory, useResendAlert, type HistoryFilters, type DeliveryRow } from '@/hooks/useAlertDeliveryHistory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const channelIcon: Record<string, any> = {
  push: Bell,
  in_app: Smartphone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
};

const statusMeta: Record<string, { color: string; icon: any; label: { bn: string; en: string } }> = {
  sent: { color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300', icon: CheckCircle2, label: { bn: 'পাঠানো', en: 'Sent' } },
  failed: { color: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300', icon: XCircle, label: { bn: 'ব্যর্থ', en: 'Failed' } },
  queued: { color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300', icon: Clock, label: { bn: 'অপেক্ষমাণ', en: 'Queued' } },
  skipped_quiet: { color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: MoonStar, label: { bn: 'শান্ত মোড', en: 'Quiet hrs' } },
  skipped_disabled: { color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: BellOff, label: { bn: 'বন্ধ', en: 'Disabled' } },
  skipped_cooldown: { color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: Clock, label: { bn: 'কুলডাউন', en: 'Cooldown' } },
};

const sevColor: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  low: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
};

function DeliveryBadge({ d, lang }: { d: DeliveryRow; lang: 'bn' | 'en' }) {
  const meta = statusMeta[d.status] ?? statusMeta.queued;
  const Icon = meta.icon;
  const ChIcon = channelIcon[d.channel] ?? Bell;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium', meta.color)}>
            <ChIcon size={10} />
            <span className="uppercase">{d.channel}</span>
            <Icon size={10} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-0.5">
            <div><strong>{d.channel.toUpperCase()}</strong> — {meta.label[lang]}</div>
            {d.recipient && <div className="text-muted-foreground">→ {d.recipient}</div>}
            {d.sent_at && <div className="text-muted-foreground">{new Date(d.sent_at).toLocaleString()}</div>}
            {d.error_message && <div className="text-red-400 break-all">{d.error_message}</div>}
            {d.is_escalation && <div className="text-amber-400">Escalation</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AlertDeliveryHistoryTab() {
  const { language } = useAuth();
  const lang: 'bn' | 'en' = language === 'bn' ? 'bn' : 'en';
  const [filters, setFilters] = useState<HistoryFilters>({
    severity: 'all',
    acknowledged: 'all',
    channelStatus: 'all',
    hours: 168,
  });

  const { data: rows = [], isLoading, refetch } = useAlertDeliveryHistory(filters);
  const resend = useResendAlert();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.severity} onValueChange={(v) => setFilters((f) => ({ ...f, severity: v }))}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lang === 'bn' ? 'সব মাত্রা' : 'All severity'}</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.acknowledged} onValueChange={(v: any) => setFilters((f) => ({ ...f, acknowledged: v }))}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lang === 'bn' ? 'সব অবস্থা' : 'All status'}</SelectItem>
            <SelectItem value="no">{lang === 'bn' ? 'অস্বীকৃত' : 'Unacknowledged'}</SelectItem>
            <SelectItem value="yes">{lang === 'bn' ? 'স্বীকৃত' : 'Acknowledged'}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.channelStatus} onValueChange={(v: any) => setFilters((f) => ({ ...f, channelStatus: v }))}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{lang === 'bn' ? 'সব ডেলিভারি' : 'All deliveries'}</SelectItem>
            <SelectItem value="sent">{lang === 'bn' ? 'সফল' : 'Sent'}</SelectItem>
            <SelectItem value="failed">{lang === 'bn' ? 'ব্যর্থ' : 'Failed'}</SelectItem>
            <SelectItem value="skipped">{lang === 'bn' ? 'এড়ানো' : 'Skipped'}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(filters.hours)} onValueChange={(v) => setFilters((f) => ({ ...f, hours: Number(v) }))}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24">{lang === 'bn' ? '২৪ ঘন্টা' : '24 hours'}</SelectItem>
            <SelectItem value="72">{lang === 'bn' ? '৩ দিন' : '3 days'}</SelectItem>
            <SelectItem value="168">{lang === 'bn' ? '৭ দিন' : '7 days'}</SelectItem>
            <SelectItem value="720">{lang === 'bn' ? '৩০ দিন' : '30 days'}</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCcw size={12} className="mr-1" /> {lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {lang === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {lang === 'bn' ? 'কোনো রেকর্ড পাওয়া যায়নি' : 'No records found'}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const text = lang === 'bn' ? (r.message_bn || r.message) : r.message;
            const ago = formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: lang === 'bn' ? bn : enUS });
            return (
              <div key={r.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', sevColor[r.severity] ?? '')}>
                        {r.severity.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{r.alert_type}</span>
                      <span className="text-[10px] text-muted-foreground">• {ago}</span>
                      {r.acknowledged && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                          <CheckCircle2 size={10} />
                          {lang === 'bn' ? 'স্বীকৃত' : 'Ack'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{text}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.deliveries.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground italic">
                          {lang === 'bn' ? 'কোনো ডেলিভারি লগ নেই' : 'No delivery log yet'}
                        </span>
                      ) : (
                        r.deliveries.map((d) => <DeliveryBadge key={d.id} d={d} lang={lang} />)
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    disabled={resend.isPending}
                    onClick={() => resend.mutate(r.id)}
                  >
                    <Send size={12} className="mr-1" />
                    {lang === 'bn' ? 'পুনরায়' : 'Resend'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
