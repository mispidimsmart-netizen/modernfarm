import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAuditLogs, AuditLogFilters, AuditCategory, AuditSeverity } from '@/hooks/useAuditLog';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { 
  Search, Filter, Shield, Settings, Zap, Terminal, 
  Cpu, User, ChevronDown, ChevronUp, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
};

export function AuditLogPage() {
  const { language } = useAuth();
  const isBn = language === 'bn';

  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useAuditLogs(filters);

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
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw size={18} />
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

            {/* Date range */}
            <div className="flex gap-2">
              <Input
                type="date"
                className="h-9 flex-1"
                value={filters.dateFrom || ''}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
              />
              <Input
                type="date"
                className="h-9 flex-1"
                value={filters.dateTo || ''}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))}
              />
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
      </main>

      <BottomNav />
    </div>
  );
}

export default AuditLogPage;
