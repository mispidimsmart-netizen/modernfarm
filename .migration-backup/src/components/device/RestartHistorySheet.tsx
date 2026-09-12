import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getRestartReasonLabel, formatUptime } from '@/hooks/useDeviceHealth';
import {
  AlertTriangle,
  Zap,
  RefreshCw,
  Power,
  Wifi,
  Cpu,
  History,
  Inbox,
} from 'lucide-react';

interface RestartLogEntry {
  id: string;
  device_token_id: string;
  restart_reason: string;
  uptime_before_restart_seconds: number | null;
  free_memory_bytes: number | null;
  wifi_signal_strength: number | null;
  error_message: string | null;
  firmware_version: string | null;
  occurred_at: string;
}

interface RestartHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceTokenId?: string;
  deviceName?: string;
}

const severityStyles = {
  normal: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-status-warning/15 text-status-warning border-status-warning/30',
  danger: 'bg-status-danger/15 text-status-danger border-status-danger/30',
};

const reasonIcon = (reason: string) => {
  if (reason === 'BROWNOUT') return Zap;
  if (reason.includes('WDT')) return AlertTriangle;
  if (reason === 'PANIC') return AlertTriangle;
  if (reason === 'POWER_ON') return Power;
  return RefreshCw;
};

export function RestartHistorySheet({
  open,
  onOpenChange,
  deviceTokenId,
  deviceName,
}: RestartHistorySheetProps) {
  const { user, language } = useAuth();
  const dateLocale = language === 'bn' ? bn : enUS;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['device_restart_log', user?.id, deviceTokenId],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from('device_restart_log')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .limit(100);
      if (deviceTokenId) q = q.eq('device_token_id', deviceTokenId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RestartLogEntry[];
    },
    enabled: open && !!user,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'রিস্টার্ট ইতিহাস' : 'Restart History'}
          </SheetTitle>
          <SheetDescription>
            {deviceName
              ? `${deviceName} — ${language === 'bn' ? 'শেষ ৩০ দিন' : 'Last 30 days'}`
              : language === 'bn'
              ? 'ESP32 কন্ট্রোলার রিবুট লগ (শেষ ৩০ দিন)'
              : 'ESP32 controller reboot log (last 30 days)'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(85vh-7rem)] pr-3">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-8 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
              {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'bn'
                  ? 'কোনো রিস্টার্ট রেকর্ড নেই'
                  : 'No restart events recorded'}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground/80">
                {language === 'bn'
                  ? 'হার্ডওয়্যার স্থিতিশীল আছে — কোনো অপ্রত্যাশিত রিবুট ঘটেনি।'
                  : 'Hardware is stable — no unexpected reboots have occurred.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {logs.map((log) => {
                const reason = getRestartReasonLabel(log.restart_reason);
                const Icon = reasonIcon(log.restart_reason);
                const occurred = new Date(log.occurred_at);
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border p-3 ${severityStyles[reason.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded-lg bg-background/60 p-1.5">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {language === 'bn' ? reason.labelBn : reason.label}
                          </p>
                          <p className="mt-0.5 text-[11px] opacity-80">
                            {format(occurred, 'PPp', { locale: dateLocale })}
                          </p>
                          <p className="text-[11px] opacity-70">
                            {formatDistanceToNow(occurred, {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-background/60 text-[10px] uppercase"
                      >
                        {log.restart_reason}
                      </Badge>
                    </div>

                    {(log.uptime_before_restart_seconds ||
                      log.wifi_signal_strength !== null ||
                      log.free_memory_bytes !== null) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-90">
                        {log.uptime_before_restart_seconds ? (
                          <span className="inline-flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            {language === 'bn' ? 'আপটাইম:' : 'Uptime:'}{' '}
                            {formatUptime(log.uptime_before_restart_seconds)}
                          </span>
                        ) : null}
                        {log.wifi_signal_strength !== null && (
                          <span className="inline-flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            {log.wifi_signal_strength} dBm
                          </span>
                        )}
                        {log.free_memory_bytes !== null && (
                          <span className="inline-flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {Math.round(log.free_memory_bytes / 1024)} KB
                          </span>
                        )}
                        {log.firmware_version && (
                          <span className="inline-flex items-center gap-1">
                            v{log.firmware_version}
                          </span>
                        )}
                      </div>
                    )}

                    {log.error_message && (
                      <p className="mt-2 rounded-md bg-background/60 p-2 text-[11px] font-mono opacity-90">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
