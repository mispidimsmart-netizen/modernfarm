import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, AlertTriangle, Clock, Zap } from 'lucide-react';
import { useEdgeFunctionStats1h, useRecentEdgeErrors } from '@/hooks/useEdgeFunctionMetrics';
import { formatDistanceToNow } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';

interface Props {
  language: 'bn' | 'en';
}

export function ObservabilityDashboard({ language }: Props) {
  const { data: stats, isLoading } = useEdgeFunctionStats1h();
  const { data: errors } = useRecentEdgeErrors(50);

  const totalReq = (stats || []).reduce((s, r) => s + (r.request_count || 0), 0);
  const totalErr = (stats || []).reduce((s, r) => s + (r.error_5xx || 0) + (r.error_4xx || 0), 0);
  const errRate = totalReq > 0 ? (totalErr / totalReq) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Activity} label={language === 'bn' ? 'অনুরোধ (১ ঘ)' : 'Requests (1h)'} value={totalReq.toLocaleString()} color="cyan" />
        <KPI icon={AlertTriangle} label={language === 'bn' ? 'ত্রুটির হার' : 'Error rate'} value={`${errRate.toFixed(2)}%`} color={errRate > 5 ? 'rose' : errRate > 1 ? 'amber' : 'emerald'} />
        <KPI icon={Clock} label="p95 latency" value={`${Math.round(Math.max(0, ...(stats || []).map((s) => s.p95_ms || 0)))} ms`} color="indigo" />
        <KPI icon={Zap} label={language === 'bn' ? 'ফাংশন' : 'Functions'} value={(stats?.length || 0).toString()} color="violet" />
      </div>

      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20">
        <CardHeader className="pb-3 border-b border-cyan-500/10">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            {language === 'bn' ? 'প্রতি ফাংশন (১ ঘন্টা)' : 'Per Function (last 1h)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <p className="text-slate-400 text-sm">{language === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}</p>
          ) : (stats || []).length === 0 ? (
            <p className="text-slate-400 text-sm">{language === 'bn' ? 'এখনো কোনো ডেটা নেই' : 'No data yet'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-200">
                <thead className="text-slate-400 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left py-2 px-2">Function</th>
                    <th className="text-right py-2 px-2">Req</th>
                    <th className="text-right py-2 px-2">5xx</th>
                    <th className="text-right py-2 px-2">4xx</th>
                    <th className="text-right py-2 px-2">p50</th>
                    <th className="text-right py-2 px-2">p95</th>
                    <th className="text-right py-2 px-2">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats || []).sort((a, b) => (b.request_count || 0) - (a.request_count || 0)).map((s) => (
                    <tr key={s.function_name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-2 px-2 font-medium">{s.function_name}</td>
                      <td className="text-right py-2 px-2">{s.request_count}</td>
                      <td className={`text-right py-2 px-2 ${s.error_5xx > 0 ? 'text-rose-400 font-bold' : ''}`}>{s.error_5xx}</td>
                      <td className={`text-right py-2 px-2 ${s.error_4xx > 0 ? 'text-amber-400' : ''}`}>{s.error_4xx}</td>
                      <td className="text-right py-2 px-2">{Math.round(s.p50_ms || 0)}</td>
                      <td className="text-right py-2 px-2">{Math.round(s.p95_ms || 0)}</td>
                      <td className="text-right py-2 px-2">{Math.round(s.p99_ms || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-rose-500/20">
        <CardHeader className="pb-3 border-b border-rose-500/10">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            {language === 'bn' ? 'সাম্প্রতিক ত্রুটি' : 'Recent Errors'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <ScrollArea className="h-[360px]">
            {(errors || []).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                {language === 'bn' ? '✅ কোনো ত্রুটি নেই' : '✅ No errors'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {errors!.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs p-2 rounded bg-slate-800/40 border border-slate-700/30">
                    <Badge variant="outline" className={`shrink-0 ${e.status_code >= 500 ? 'border-rose-500/40 text-rose-400' : 'border-amber-500/40 text-amber-400'}`}>
                      {e.status_code}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200">{e.function_name}</span>
                        <span className="text-slate-500">{e.path}</span>
                        <span className="text-slate-500 ml-auto">{e.duration_ms}ms</span>
                      </div>
                      {e.error_message && (
                        <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{e.error_message}</p>
                      )}
                      <p className="text-slate-600 text-[10px] mt-0.5">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: language === 'bn' ? bnLocale : undefined })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-600 to-blue-700 border-cyan-400/30',
    rose: 'from-rose-600 to-red-700 border-rose-400/30',
    amber: 'from-amber-600 to-orange-700 border-amber-400/30',
    emerald: 'from-emerald-600 to-teal-700 border-emerald-400/30',
    indigo: 'from-indigo-600 to-blue-700 border-indigo-400/30',
    violet: 'from-violet-600 to-purple-700 border-violet-400/30',
  };
  return (
    <Card className={`bg-gradient-to-br ${colorMap[color]} text-white shadow-xl`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-white/80 text-[11px] font-medium truncate">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          </div>
          <Icon className="w-7 h-7 text-white/70 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
