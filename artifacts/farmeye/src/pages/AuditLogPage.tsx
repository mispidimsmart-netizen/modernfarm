import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAuditLogs, AuditLogFilters, AuditCategory, AuditSeverity } from '@/hooks/useAuditLog';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SmartDatePicker } from '@/components/ui/smart-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  Search, Filter, Shield, Settings, Zap, Terminal, 
  Cpu, User, ChevronDown, ChevronUp, RefreshCw, ListChecks,
  AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceCommandLogTab } from '@/components/audit/DeviceCommandLogTab';
import { TroubleshootingTips, getTroubleshootingKey } from '@/components/audit/TroubleshootingTips';
import { ExportLogButton } from '@/components/audit/ExportLogButton';

const categoryConfig: Record<string, { icon: typeof Shield; label: string; labelBn: string; color: string }> = {
  settings: { icon: Settings, label: 'Settings', labelBn: 'সেটিংস', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  automation: { icon: Zap, label: 'Automation', labelBn: 'অটোমেশন', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  control: { icon: Terminal, label: 'Control', labelBn: 'কন্ট্রোল', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  safety: { icon: Shield, label: 'Safety', labelBn: 'সেফটি', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  firmware: { icon: Cpu, label: 'Firmware', labelBn: 'ফার্মওয়্যার', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  auth: { icon: User, label: 'Auth', labelBn: 'অথ', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  farm: { icon: Settings, label: 'Farm', labelBn: 'খামার', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  general: { icon: Filter, label: 'General', labelBn: 'সাধারণ', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

const severityStyles: Record<string, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const actionLabels: Record<string, { en: string; bn: string }> = {
  settings_changed: { en: 'Settings Changed', bn: 'সেটিংস পরিবর্তন' },
  automation_enabled: { en: 'Automation Enabled', bn: 'অটোমেশন চালু' },
  automation_disabled: { en: 'Automation Disabled', bn: 'অটোমেশন বন্ধ' },
  manual_control: { en: 'Manual Control', bn: 'ম্যানুয়াল কন্ট্রোল' },
  safety_override: { en: 'Safety Override', bn: 'সেফটি ওভাররাইড' },
  firmware_update: { en: 'Firmware Update', bn: 'ফার্মওয়্যার আপডেট' },
  safety_engine_sensor_fail: { en: 'Sensor Fail', bn: 'সেন্সর ফেল' },
  safety_engine_stuck_relay: { en: 'Stuck Relay', bn: 'রিলে আটকে গেছে' },
  safety_engine_airflow_ineffective: { en: 'Airflow Ineffective', bn: 'বাতাস অকার্যকর' },
  safety_engine_sensor_drift: { en: 'Sensor Drift', bn: 'সেন্সর ড্রিফট' },
  safety_engine_emergency: { en: 'Emergency', bn: 'জরুরি অবস্থা' },
  safety_engine_survival: { en: 'Survival Mode', bn: 'সারভাইভাল মোড' },
  power_fail: { en: 'Power Fail', bn: 'পাওয়ার ফেল' },
  power_restored: { en: 'Power Restored', bn: 'পাওয়ার ফিরেছে' },
};

// Quick-pick incident types (most common safety/power events)
const INCIDENT_QUICK_PICKS: { key: string; bn: string; en: string; emoji: string }[] = [
  { key: 'safety_engine_sensor_fail', bn: 'সেন্সর ফেল', en: 'Sensor Fail', emoji: '🌡️' },
  { key: 'safety_engine_stuck_relay', bn: 'রিলে আটকে', en: 'Stuck Relay', emoji: '🔌' },
  { key: 'safety_engine_emergency', bn: 'জরুরি', en: 'Emergency', emoji: '🚨' },
  { key: 'safety_engine_survival', bn: 'সারভাইভাল', en: 'Survival', emoji: '🛡️' },
  { key: 'safety_engine_airflow_ineffective', bn: 'বাতাস অকার্যকর', en: 'No Airflow', emoji: '💨' },
  { key: 'safety_engine_sensor_drift', bn: 'সেন্সর ড্রিফট', en: 'Sensor Drift', emoji: '📊' },
  { key: 'power_fail', bn: 'পাওয়ার ফেল', en: 'Power Fail', emoji: '⚡' },
  { key: 'safety_override', bn: 'সেফটি ওভাররাইড', en: 'Safety Override', emoji: '⚠️' },
];

const DATE_PRESETS: { key: string; bn: string; en: string; days: number }[] = [
  { key: 'today', bn: 'আজ', en: 'Today', days: 0 },
  { key: '7d', bn: '৭ দিন', en: '7 days', days: 7 },
  { key: '30d', bn: '৩০ দিন', en: '30 days', days: 30 },
];

export function AuditLogPage() {
  const { language } = useAuth();
  const isBn = language === 'bn';

  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch, isFetching } = useAuditLogs(filters);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, critical: 0, warning: 0, today: 0 };
    const today = new Date().toISOString().split('T')[0];
    return {
      total: logs.length,
      critical: logs.filter(l => l.severity === 'critical').length,
      warning: logs.filter(l => l.severity === 'warning').length,
      today: logs.filter(l => l.created_at?.startsWith(today)).length,
    };
  }, [logs]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {isBn ? '📋 অডিট লগ' : '📋 Audit Log'}
          </h1>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="gap-1.5">
              <Filter size={14} />
              {isBn ? 'সাধারণ' : 'General'}
            </TabsTrigger>
            <TabsTrigger value="commands" className="gap-1.5">
              <ListChecks size={14} />
              {isBn ? 'ডিভাইস কমান্ড' : 'Device Commands'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-4">
            <div className="flex justify-end gap-2">
              <ExportLogButton source="audit" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                {isBn ? 'রিফ্রেশ' : 'Refresh'}
              </Button>
            </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: isBn ? 'মোট' : 'Total', value: stats.total, color: 'text-foreground' },
            { label: isBn ? 'আজ' : 'Today', value: stats.today, color: 'text-primary' },
            { label: isBn ? 'সতর্কতা' : 'Warning', value: stats.warning, color: 'text-amber-600' },
            { label: isBn ? 'জরুরি' : 'Critical', value: stats.critical, color: 'text-destructive' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder={isBn ? 'অ্যাকশন, ডিভাইস খুঁজুন...' : 'Search actions, devices...'}
                className="pl-9 h-9"
                value={filters.searchQuery || ''}
                onChange={e => setFilters(f => ({ ...f, searchQuery: e.target.value || undefined }))}
              />
            </div>

            <div className="flex gap-2">
              {/* Category filter */}
              <Select
                value={filters.category || 'all'}
                onValueChange={v => setFilters(f => ({ ...f, category: v === 'all' ? undefined : v as AuditCategory }))}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder={isBn ? 'ক্যাটাগরি' : 'Category'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব' : 'All'}</SelectItem>
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{isBn ? cfg.labelBn : cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Severity filter */}
              <Select
                value={filters.severity || 'all'}
                onValueChange={v => setFilters(f => ({ ...f, severity: v === 'all' ? undefined : v as AuditSeverity }))}
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder={isBn ? 'তীব্রতা' : 'Severity'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব' : 'All'}</SelectItem>
                  <SelectItem value="info">{isBn ? 'তথ্য' : 'Info'}</SelectItem>
                  <SelectItem value="warning">{isBn ? 'সতর্কতা' : 'Warning'}</SelectItem>
                  <SelectItem value="critical">{isBn ? 'জরুরি' : 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range presets */}
            <div className="flex gap-1.5 flex-wrap">
              {DATE_PRESETS.map(p => {
                const from = format(startOfDay(subDays(new Date(), p.days)), 'yyyy-MM-dd');
                const to = format(endOfDay(new Date()), 'yyyy-MM-dd');
                const active = filters.dateFrom === from && filters.dateTo === to;
                return (
                  <Button
                    key={p.key}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-[11px]"
                    onClick={() => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
                  >
                    {isBn ? p.bn : p.en}
                  </Button>
                );
              })}
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setFilters(f => ({ ...f, dateFrom: undefined, dateTo: undefined }))}
                >
                  <X size={12} className="mr-1" />
                  {isBn ? 'সব সময়' : 'All time'}
                </Button>
              )}
            </div>

            {/* Date range custom */}
            <div className="flex gap-2">
              <SmartDatePicker
                value={filters.dateFrom || null}
                onChange={(iso) => setFilters(f => ({ ...f, dateFrom: iso || undefined }))}
                placeholder={isBn ? 'শুরু তারিখ' : 'From'}
                className="flex-1"
                disableFuture
              />
              <SmartDatePicker
                value={filters.dateTo || null}
                onChange={(iso) => setFilters(f => ({ ...f, dateTo: iso || undefined }))}
                placeholder={isBn ? 'শেষ তারিখ' : 'To'}
                className="flex-1"
                disableFuture
              />
            </div>

            {/* Quick incident pickers */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle size={12} />
                <span>{isBn ? 'দ্রুত ঘটনা ফিল্টার:' : 'Quick incident filter:'}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {INCIDENT_QUICK_PICKS.map(p => {
                  const active = filters.actionType === p.key;
                  return (
                    <Button
                      key={p.key}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => setFilters(f => ({
                        ...f,
                        actionType: active ? undefined : p.key,
                      }))}
                    >
                      <span>{p.emoji}</span>
                      <span>{isBn ? p.bn : p.en}</span>
                    </Button>
                  );
                })}
                {filters.actionType && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setFilters(f => ({ ...f, actionType: undefined }))}
                  >
                    <X size={12} className="mr-1" />
                    {isBn ? 'মুছুন' : 'Clear'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log entries */}
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : !logs?.length ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-muted-foreground">
                  {isBn ? 'কোনো লগ পাওয়া যায়নি' : 'No audit logs found'}
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map((log) => {
                  const cat = categoryConfig[log.action_category] || categoryConfig.general;
                  const CatIcon = cat.icon;
                  const isExpanded = expandedId === log.id;
                  const actionLabel = actionLabels[log.action_type];

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card
                        className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {/* Category icon */}
                            <div className={`rounded-lg p-2 ${cat.color}`}>
                              <CatIcon size={16} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-foreground">
                                  {actionLabel 
                                    ? (isBn ? actionLabel.bn : actionLabel.en) 
                                    : log.action_type}
                                </span>
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${severityStyles[log.severity || 'info']}`}>
                                  {log.severity}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                {log.device_name && <span>🔧 {log.device_name}</span>}
                                {log.target_entity && <span>📌 {log.target_entity}</span>}
                                <span>
                                  {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: isBn ? bn : undefined })}
                                </span>
                              </div>
                            </div>

                            {/* Expand arrow */}
                            {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="mt-3 pt-3 border-t border-border space-y-2 text-xs"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground">{isBn ? 'ইউজার:' : 'User:'}</span>
                                  <p className="font-mono text-foreground truncate">{log.user_email || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{isBn ? 'সোর্স:' : 'Source:'}</span>
                                  <p className="text-foreground">{log.source || 'app'}</p>
                                </div>
                              </div>

                              {log.old_value && (
                                <div>
                                  <span className="text-muted-foreground">{isBn ? 'আগের মান:' : 'Old Value:'}</span>
                                  <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.new_value && (
                                <div>
                                  <span className="text-muted-foreground">{isBn ? 'নতুন মান:' : 'New Value:'}</span>
                                  <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground">{isBn ? 'অতিরিক্ত তথ্য:' : 'Metadata:'}</span>
                                  <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {(() => {
                                const tipKey = getTroubleshootingKey(log.action_type);
                                return tipKey ? (
                                  <TroubleshootingTips tipKey={tipKey} logId={log.id} isBn={isBn} />
                                ) : null;
                              })()}
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
          </TabsContent>

          <TabsContent value="commands" className="mt-4">
            <DeviceCommandLogTab />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}

export default AuditLogPage;
