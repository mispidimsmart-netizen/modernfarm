import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useSheds } from '@/hooks/useSheds';
import {
  useDeviceCommandLog,
  useDeviceCommandDevices,
  type DeviceCommandLogFilters,
  type CommandLogStatus,
} from '@/hooks/useDeviceCommandLog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import {
  Search,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExportLogButton } from '@/components/audit/ExportLogButton';

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; en: string; bn: string; cls: string }
> = {
  pending: {
    icon: Clock,
    en: 'Pending',
    bn: 'অপেক্ষমাণ',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  sent: {
    icon: Send,
    en: 'Sent',
    bn: 'প্রেরিত',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  acked: {
    icon: CheckCircle2,
    en: 'Executed',
    bn: 'সম্পন্ন',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  failed: {
    icon: XCircle,
    en: 'Failed',
    bn: 'ব্যর্থ',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  expired: {
    icon: AlertTriangle,
    en: 'Expired',
    bn: 'মেয়াদোত্তীর্ণ',
    cls: 'bg-muted text-muted-foreground',
  },
};

export function DeviceCommandLogTab() {
  const { language } = useAuth();
  const isBn = language === 'bn';

  let farmCtx: ReturnType<typeof useFarmContext> | null = null;
  try {
    farmCtx = useFarmContext();
  } catch {
    // FarmProvider not available — show all farms accessible to the user
  }

  const farms = farmCtx?.farms ?? [];
  const defaultFarmId = farmCtx?.selectedFarmId ?? undefined;

  const [filters, setFilters] = useState<DeviceCommandLogFilters>({
    farmId: defaultFarmId,
  });

  const { data: logs, isLoading, refetch, isFetching } = useDeviceCommandLog(filters);
  const { data: deviceNames } = useDeviceCommandDevices(filters.farmId);
  const { data: sheds = [] } = useSheds();

  const stats = useMemo(() => {
    if (!logs) return { total: 0, acked: 0, sent: 0, pending: 0, expired: 0, failed: 0 };
    return {
      total: logs.length,
      acked: logs.filter(l => l.status === 'acked').length,
      sent: logs.filter(l => l.status === 'sent').length,
      pending: logs.filter(l => l.status === 'pending').length,
      expired: logs.filter(l => l.status === 'expired').length,
      failed: logs.filter(l => l.status === 'failed').length,
    };
  }, [logs]);

  const updateFilter = <K extends keyof DeviceCommandLogFilters>(
    key: K,
    value: DeviceCommandLogFilters[K],
  ) => setFilters(f => ({ ...f, [key]: value }));

  const clearFilters = () =>
    setFilters({ farmId: defaultFarmId });

  return (
    <div className="space-y-4">
      {/* Header / refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {isBn ? '🧰 ডিভাইস কমান্ড লগ' : '🧰 Device Command Log'}
        </h2>
        <div className="flex items-center gap-2">
          <ExportLogButton source="device-commands" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats — clickable status filters */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([
          { key: 'all', label: isBn ? 'মোট' : 'Total', value: stats.total, color: 'text-foreground' },
          { key: 'acked', label: isBn ? 'সম্পন্ন' : 'Executed', value: stats.acked, color: 'text-emerald-600' },
          { key: 'sent', label: isBn ? 'প্রেরিত' : 'Sent', value: stats.sent, color: 'text-blue-600' },
          { key: 'pending', label: isBn ? 'অপেক্ষায়' : 'Pending', value: stats.pending, color: 'text-amber-600' },
          { key: 'expired', label: isBn ? 'মেয়াদোত্তীর্ণ' : 'Expired', value: stats.expired, color: 'text-muted-foreground' },
          { key: 'failed', label: isBn ? 'ব্যর্থ' : 'Failed', value: stats.failed, color: 'text-destructive' },
        ] as const).map(s => {
          const active =
            (s.key === 'all' && (!filters.status || filters.status === 'all')) ||
            filters.status === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                updateFilter('status', s.key === 'all' ? 'all' : (s.key as CommandLogStatus))
              }
              className={`rounded-xl border bg-card p-2 text-center transition-all hover:shadow-md ${
                active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent shadow-sm'
              }`}
            >
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder={
                isBn
                  ? 'কমান্ড টাইপ, ডিভাইস, command id খুঁজুন...'
                  : 'Search command type, device, command id...'
              }
              className="pl-9 h-9"
              value={filters.searchQuery || ''}
              onChange={e =>
                updateFilter('searchQuery', e.target.value || undefined)
              }
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Farm */}
            {farms.length > 0 && (
              <Select
                value={filters.farmId || 'all'}
                onValueChange={v => updateFilter('farmId', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-9 flex-1 min-w-[140px]">
                  <SelectValue placeholder={isBn ? 'খামার' : 'Farm'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব খামার' : 'All farms'}</SelectItem>
                  {farms.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Device */}
            <Select
              value={filters.deviceName || 'all'}
              onValueChange={v =>
                updateFilter('deviceName', v === 'all' ? undefined : v)
              }
            >
              <SelectTrigger className="h-9 flex-1 min-w-[140px]">
                <SelectValue placeholder={isBn ? 'ডিভাইস' : 'Device'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সব ডিভাইস' : 'All devices'}</SelectItem>
                {(deviceNames || []).map(d => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Shed */}
            {sheds.length > 0 && (
              <Select
                value={filters.shedId || 'all'}
                onValueChange={v => updateFilter('shedId', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-9 flex-1 min-w-[140px]">
                  <SelectValue placeholder={isBn ? 'শেড' : 'Shed'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব শেড' : 'All sheds'}</SelectItem>
                  {sheds.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {isBn ? s.name : s.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status */}
            <Select
              value={filters.status || 'all'}
              onValueChange={v =>
                updateFilter('status', v === 'all' ? 'all' : (v as CommandLogStatus))
              }
            >
              <SelectTrigger className="h-9 flex-1 min-w-[120px]">
                <SelectValue placeholder={isBn ? 'অবস্থা' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? 'সব' : 'All'}</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {isBn ? cfg.bn : cfg.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <SmartDatePicker
              value={filters.dateFrom || null}
              onChange={iso => updateFilter('dateFrom', iso || undefined)}
              placeholder={isBn ? 'শুরু তারিখ' : 'From'}
              className="flex-1"
              disableFuture
            />
            <SmartDatePicker
              value={filters.dateTo || null}
              onChange={iso => updateFilter('dateTo', iso || undefined)}
              placeholder={isBn ? 'শেষ তারিখ' : 'To'}
              className="flex-1"
              disableFuture
            />
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {isBn ? 'রিসেট' : 'Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <ScrollArea className="h-[calc(100vh-460px)] min-h-[300px]">
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !logs?.length ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-muted-foreground">
                {isBn ? 'কোনো কমান্ড লগ পাওয়া যায়নি' : 'No command logs found'}
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence initial={false}>
              {logs.map(log => {
                const cfg = statusConfig[log.status] || statusConfig.pending;
                const Icon = cfg.icon;
                const farmName =
                  farms.find(f => f.id === log.farm_id)?.name || null;
                const ackLatency =
                  log.acked_at && log.sent_at
                    ? Math.round(
                        (new Date(log.acked_at).getTime() -
                          new Date(log.sent_at).getTime()) /
                          1000,
                      )
                    : null;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2 ${cfg.cls}`}>
                            <Icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-foreground">
                                {log.command_type}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {log.command_value ? 'ON' : 'OFF'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${cfg.cls}`}
                              >
                                {isBn ? cfg.bn : cfg.en}
                              </Badge>
                              {log.retry_count > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  ↻ {log.retry_count}/{log.max_retries}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <Cpu size={12} /> {log.device_name}
                              </span>
                              {farmName && <span>🏠 {farmName}</span>}
                              <span>
                                {format(new Date(log.created_at), 'dd MMM, HH:mm:ss', {
                                  locale: isBn ? bn : undefined,
                                })}
                              </span>
                              <span>
                                ({formatDistanceToNow(new Date(log.created_at), {
                                  addSuffix: true,
                                  locale: isBn ? bn : undefined,
                                })})
                              </span>
                              {ackLatency !== null && (
                                <span>⚡ {ackLatency}s</span>
                              )}
                              {log.source && (
                                <span className="opacity-70">· {log.source}</span>
                              )}
                            </div>

                            {log.error_message && (
                              <p className="mt-1 text-xs text-destructive break-words">
                                ⚠ {log.error_message}
                              </p>
                            )}

                            <p className="mt-1 text-[10px] font-mono text-muted-foreground/70 truncate">
                              {log.command_id}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default DeviceCommandLogTab;
