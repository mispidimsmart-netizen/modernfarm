import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Tractor, Users, Calendar, Wallet, BarChart3 } from 'lucide-react';

interface Series {
  day: string;
  new_farms: number;
  new_members: number;
  cumulative_farms: number;
  cumulative_members: number;
}
interface Summary {
  organization_id: string;
  name: string;
  license_type: string;
  license_expires_at: string | null;
  days_remaining: number | null;
  max_farms: number;
  max_users: number;
  current_farms: number;
  current_users: number;
  farms_pct: number;
  users_pct: number;
}
interface Payment { month: string; amount: number; count: number; }
interface Analytics { summary: Summary; series: Series[]; payments: Payment[]; }

const formatBnDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};

export function OrgUsageAnalytics({ orgId }: { orgId: string }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data, isLoading } = useQuery({
    queryKey: ['org_usage_analytics', orgId, days],
    queryFn: async (): Promise<Analytics> => {
      const { data, error } = await supabase.rpc('get_org_usage_analytics' as any, {
        _organization_id: orgId,
        _days: days,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!orgId,
  });

  if (isLoading || !data) {
    return (
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader><CardTitle className="text-base">📊 ব্যবহার বিশ্লেষণ</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-400">লোড হচ্ছে...</p></CardContent>
      </Card>
    );
  }

  const { summary, series, payments } = data;
  const chartData = series.map(s => ({ ...s, day: formatBnDate(s.day) }));
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> ব্যবহার বিশ্লেষণ
          </span>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map(d => (
              <Button
                key={d} size="sm" variant={days === d ? 'default' : 'outline'}
                className={`h-7 px-2 text-xs ${days === d ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-white/10'}`}
                onClick={() => setDays(d)}
              >{d} দিন</Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiBlock
            icon={<Tractor className="w-3.5 h-3.5" />}
            label="ফার্ম ব্যবহার"
            value={`${summary.current_farms} / ${summary.max_farms}`}
            pct={summary.farms_pct ?? 0}
          />
          <KpiBlock
            icon={<Users className="w-3.5 h-3.5" />}
            label="ইউজার ব্যবহার"
            value={`${summary.current_users} / ${summary.max_users}`}
            pct={summary.users_pct ?? 0}
          />
          <KpiBlock
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="মেয়াদ"
            value={summary.days_remaining !== null
              ? `${summary.days_remaining} দিন`
              : (summary.license_type === 'lifetime' ? '∞' : '—')}
            pct={summary.days_remaining !== null ? Math.min(100, (summary.days_remaining / 30) * 100) : 100}
            danger={summary.days_remaining !== null && summary.days_remaining < 7}
          />
          <KpiBlock
            icon={<Wallet className="w-3.5 h-3.5" />}
            label="মোট পেমেন্ট (১২ মাস)"
            value={`৳${totalPayments.toLocaleString('bn-BD')}`}
            pct={null}
          />
        </div>

        {/* Cumulative growth */}
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> মোট ফার্ম ও ইউজার (সঞ্চিত)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gFarms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMembers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="cumulative_farms" name="ফার্ম" stroke="#10b981" fill="url(#gFarms)" strokeWidth={2} />
              <Area type="monotone" dataKey="cumulative_members" name="ইউজার" stroke="#8b5cf6" fill="url(#gMembers)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New per day */}
        <div>
          <div className="text-xs text-slate-400 mb-1">প্রতিদিন নতুন যোগ</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="new_farms" name="নতুন ফার্ম" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="new_members" name="নতুন ইউজার" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payments per month */}
        {payments.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-1">মাসিক অনুমোদিত পেমেন্ট</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={payments}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(v: any) => [`৳${Number(v).toLocaleString('bn-BD')}`, 'পরিমাণ']}
                />
                <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiBlock({ icon, label, value, pct, danger }: {
  icon: React.ReactNode; label: string; value: string; pct: number | null; danger?: boolean;
}) {
  const color = danger ? 'text-rose-300' : pct !== null && pct >= 90 ? 'text-amber-300' : 'text-emerald-300';
  return (
    <div className="p-2.5 rounded-lg bg-slate-800/50 border border-white/5">
      <div className="text-[10px] text-slate-400 flex items-center gap-1">{icon} {label}</div>
      <div className={`text-base font-bold mt-0.5 ${color}`}>{value}</div>
      {pct !== null && (
        <Progress
          value={pct}
          className={`h-1 mt-1 ${danger ? '[&>div]:bg-rose-500' : pct >= 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
        />
      )}
    </div>
  );
}
