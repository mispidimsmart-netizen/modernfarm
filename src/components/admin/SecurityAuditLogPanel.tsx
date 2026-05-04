import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, RefreshCw, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';

type AuditRow = {
  id: string;
  event_type: string;
  user_id: string | null;
  farm_id: string | null;
  device_token_id: string | null;
  success: boolean;
  details: any;
  created_at: string;
};

type FarmOpt = { id: string; name: string };

const EVENT_TYPES = [
  'login_success',
  'login_failure',
  'invite_redeem_success',
  'invite_redeem_failure',
  'device_auth_failure',
];

const RANGES: Record<string, number> = {
  '1h': 1,
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  'all': 0,
};

const labelsBn: Record<string, string> = {
  login_success: 'লগইন সফল',
  login_failure: 'লগইন ব্যর্থ',
  invite_redeem_success: 'ইনভাইট সফল',
  invite_redeem_failure: 'ইনভাইট ব্যর্থ',
  device_auth_failure: 'ডিভাইস auth ব্যর্থ',
};

export const SecurityAuditLogPanel = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [farms, setFarms] = useState<FarmOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<string>('all');
  const [farmId, setFarmId] = useState<string>('all');
  const [range, setRange] = useState<string>('24h');
  const [search, setSearch] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('security_audit_log')
      .select('*').order('created_at', { ascending: false }).limit(500);
    if (eventType !== 'all') q = q.eq('event_type', eventType);
    if (farmId !== 'all') q = q.eq('farm_id', farmId);
    const hours = RANGES[range];
    if (hours > 0) {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      q = q.gte('created_at', since);
    }
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventType, farmId, range]);

  useEffect(() => {
    supabase.from('farms').select('id, name').order('name').then(({ data }) => {
      setFarms((data || []) as FarmOpt[]);
    });
  }, []);

  // Realtime subscription — new audit events stream in live
  useEffect(() => {
    const channel = supabase
      .channel('security-audit-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_audit_log' },
        (payload) => {
          const row = payload.new as AuditRow;
          // Apply current filters client-side before prepending
          if (eventType !== 'all' && row.event_type !== eventType) return;
          if (farmId !== 'all' && row.farm_id !== farmId) return;
          const hours = RANGES[range];
          if (hours > 0) {
            const sinceMs = Date.now() - hours * 3600 * 1000;
            if (new Date(row.created_at).getTime() < sinceMs) return;
          }
          setRows((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            return [row, ...prev].slice(0, 500);
          });
          setLiveCount((c) => c + 1);
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventType, farmId, range]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r =>
      r.event_type.toLowerCase().includes(s) ||
      JSON.stringify(r.details || {}).toLowerCase().includes(s) ||
      (r.user_id || '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const fails = rows.filter(r => !r.success).length;
    return { total, fails, success: total - fails };
  }, [rows]);

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-emerald-500/20 shadow-xl">
      <CardHeader className="border-b border-emerald-500/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            সিকিউরিটি অডিট লগ
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`border-white/10 ${isLive ? 'text-emerald-300' : 'text-slate-400'}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isLive ? 'লাইভ' : 'অফলাইন'}
              {liveCount > 0 && <span className="ml-1.5 text-emerald-400">+{liveCount}</span>}
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
              মোট: {stats.total}
            </Badge>
            <Badge variant="outline" className="border-red-500/30 text-red-300">
              ব্যর্থ: {stats.fails}
            </Badge>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}
              className="bg-slate-800/50 border-white/10 text-white hover:bg-slate-700">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1">
              <Filter className="w-3 h-3" /> ইভেন্ট টাইপ
            </label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="bg-slate-800/60 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="all">সব ইভেন্ট</SelectItem>
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{labelsBn[t] || t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">ফার্ম</label>
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="bg-slate-800/60 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white max-h-72">
                <SelectItem value="all">সব ফার্ম</SelectItem>
                {farms.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">সময়সীমা</label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="bg-slate-800/60 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="1h">শেষ ১ ঘন্টা</SelectItem>
                <SelectItem value="24h">শেষ ২৪ ঘন্টা</SelectItem>
                <SelectItem value="7d">শেষ ৭ দিন</SelectItem>
                <SelectItem value="30d">শেষ ৩০ দিন</SelectItem>
                <SelectItem value="all">সব</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">সার্চ</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="reason, user id, ..."
              className="bg-slate-800/60 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[520px] rounded-lg border border-white/10">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 bg-slate-800/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">কোনো লগ পাওয়া যায়নি</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 sticky top-0">
                <tr className="text-left text-slate-400">
                  <th className="p-3">সময়</th>
                  <th className="p-3">ইভেন্ট</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3">ইউজার</th>
                  <th className="p-3">বিস্তারিত</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {format(new Date(r.created_at), 'dd/MM HH:mm:ss')}
                    </td>
                    <td className="p-3 text-white">
                      {labelsBn[r.event_type] || r.event_type}
                    </td>
                    <td className="p-3">
                      {r.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> সফল
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle className="w-4 h-4" /> ব্যর্থ
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-xs">
                      {r.user_id ? r.user_id.slice(0, 8) : '—'}
                    </td>
                    <td className="p-3 text-slate-300 max-w-md">
                      <code className="text-xs text-slate-400 break-all">
                        {r.details && Object.keys(r.details).length
                          ? JSON.stringify(r.details)
                          : '—'}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SecurityAuditLogPanel;
