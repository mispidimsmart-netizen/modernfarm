import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type ServiceState = 'operational' | 'degraded' | 'down' | 'checking';

type Service = {
  name: string;
  endpoint: string;
  state: ServiceState;
  latencyMs?: number;
};

const SERVICES: Omit<Service, 'state'>[] = [
  { name: 'API (esp32-api)', endpoint: 'esp32-api' },
  { name: 'Automation Engine', endpoint: 'automation-engine' },
  { name: 'AI Forecast', endpoint: 'ai-forecast' },
  { name: 'Alert Dispatcher', endpoint: 'alert-dispatcher' },
  { name: 'Weather Service', endpoint: 'fetch-weather' },
];

async function ping(endpoint: string): Promise<{ state: ServiceState; latencyMs: number }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { method: 'OPTIONS' });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok || res.status < 500) {
      return { state: latencyMs > 2000 ? 'degraded' : 'operational', latencyMs };
    }
    return { state: 'down', latencyMs };
  } catch {
    return { state: 'down', latencyMs: Math.round(performance.now() - start) };
  }
}

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>(
    SERVICES.map((s) => ({ ...s, state: 'checking' as ServiceState }))
  );
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [dbState, setDbState] = useState<ServiceState>('checking');

  const runChecks = async () => {
    const results = await Promise.all(
      SERVICES.map(async (s) => ({ ...s, ...(await ping(s.endpoint)) }))
    );
    setServices(results);

    const dbStart = performance.now();
    const { error } = await supabase.from('farms').select('id').limit(1);
    // RLS-empty result is still a 200 — only network error counts as down
    setDbState(error && error.message?.includes('Failed') ? 'down' : 'operational');
    setLastCheck(new Date());
  };

  useEffect(() => {
    runChecks();
    const t = setInterval(runChecks, 60_000);
    return () => clearInterval(t);
  }, []);

  const overall: ServiceState = services.some((s) => s.state === 'down') || dbState === 'down'
    ? 'down'
    : services.some((s) => s.state === 'degraded')
    ? 'degraded'
    : services.every((s) => s.state === 'operational') && dbState === 'operational'
    ? 'operational'
    : 'checking';

  const StatusIcon = ({ s }: { s: ServiceState }) =>
    s === 'operational' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
    s === 'degraded' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
    s === 'down' ? <XCircle className="w-5 h-5 text-red-400" /> :
    <Activity className="w-5 h-5 text-slate-400 animate-pulse" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">FarmEye System Status</h1>
          <p className="text-slate-400">রিয়েল-টাইম সার্ভিস স্ট্যাটাস ও আপটাইম</p>
        </header>

        <Card className={`border-2 ${
          overall === 'operational' ? 'border-emerald-500/40 bg-emerald-950/20' :
          overall === 'degraded' ? 'border-amber-500/40 bg-amber-950/20' :
          overall === 'down' ? 'border-red-500/40 bg-red-950/20' :
          'border-slate-500/30 bg-slate-900/50'
        }`}>
          <CardContent className="p-6 flex items-center gap-4">
            <StatusIcon s={overall} />
            <div className="flex-1">
              <p className="text-xl font-bold">
                {overall === 'operational' && 'সকল সার্ভিস চালু আছে'}
                {overall === 'degraded' && 'কিছু সার্ভিসে ধীরগতি'}
                {overall === 'down' && 'সার্ভিস বিঘ্ন'}
                {overall === 'checking' && 'যাচাই করা হচ্ছে...'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {lastCheck ? `সর্বশেষ যাচাই: ${lastCheck.toLocaleTimeString('bn-BD')}` : '...'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-white/10">
          <CardHeader>
            <CardTitle>সার্ভিসসমূহ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-white/5">
              <div className="flex items-center gap-3">
                <StatusIcon s={dbState} />
                <span>Database</span>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {dbState === 'operational' ? 'OK' : dbState === 'down' ? 'Down' : '...'}
              </Badge>
            </div>
            {services.map((s) => (
              <div key={s.endpoint} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-3">
                  <StatusIcon s={s.state} />
                  <span>{s.name}</span>
                </div>
                <Badge variant="outline" className="border-white/10 text-slate-300">
                  {s.latencyMs ? `${s.latencyMs}ms` : '...'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-white/10">
          <CardHeader>
            <CardTitle>SLA অঙ্গীকার</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">99.5%</p>
              <p className="text-xs text-slate-400">আপটাইম লক্ষ্য</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">&lt;500ms</p>
              <p className="text-xs text-slate-400">API লেটেন্সি (p95)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">24/7</p>
              <p className="text-xs text-slate-400">মনিটরিং</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500">
          © 2026 Nexiot Labs · প্রতি ৬০ সেকেন্ডে স্বয়ংক্রিয় হালনাগাদ
        </p>
      </div>
    </div>
  );
}
