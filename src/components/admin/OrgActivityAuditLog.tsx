import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { History, Download, Search, Filter, X } from 'lucide-react';

interface AuditRow {
  id: string;
  changed_at: string;
  action_type: 'insert' | 'update' | 'delete';
  entity_type: 'organization' | 'member';
  entity_id: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  changed_fields: string[] | null;
  before: any;
  after: any;
}

const entityLabel: Record<string, string> = {
  organization: 'অর্গানাইজেশন',
  member: 'সদস্য',
};
const actionLabel: Record<string, string> = {
  insert: 'যোগ',
  update: 'পরিবর্তন',
  delete: 'মুছে ফেলা',
};
const fieldLabel: Record<string, string> = {
  name: 'নাম',
  license_type: 'লাইসেন্স টাইপ',
  license_expires_at: 'মেয়াদ',
  max_farms: 'ফার্ম সীমা',
  max_users: 'ইউজার সীমা',
  owner_user_id: 'মালিক',
  role: 'রোল',
};
const actionColor: Record<string, string> = {
  insert: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  update: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  delete: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
}

function summarizeRow(r: AuditRow): string {
  if (r.action_type === 'update' && r.changed_fields?.length) {
    return r.changed_fields
      .map((f) => {
        const before = r.before?.[f];
        const after = r.after?.[f];
        const lbl = fieldLabel[f] || f;
        return `${lbl}: ${before ?? '—'} → ${after ?? '—'}`;
      })
      .join(' • ');
  }
  if (r.action_type === 'insert') {
    return r.entity_type === 'member'
      ? `নতুন রোল: ${r.after?.role ?? '—'}`
      : `নাম: ${r.after?.name ?? '—'}`;
  }
  if (r.action_type === 'delete') {
    return r.entity_type === 'member'
      ? `সরানো রোল: ${r.before?.role ?? '—'}`
      : `নাম: ${r.before?.name ?? '—'}`;
  }
  return '';
}

function toCsv(rows: AuditRow[]): string {
  const headers = ['সময়', 'এনটিটি', 'অ্যাকশন', 'কে করেছে', 'ইমেইল', 'বিবরণ', 'changed_fields'];
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      fmtDate(r.changed_at),
      entityLabel[r.entity_type] || r.entity_type,
      actionLabel[r.action_type] || r.action_type,
      r.actor_name || '—',
      r.actor_email || '—',
      summarizeRow(r),
      (r.changed_fields || []).join('|'),
    ].map(escape).join(','));
  }
  return lines.join('\n');
}

export function OrgActivityAuditLog({ orgId }: { orgId: string }) {
  const [entity, setEntity] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['org_activity_audit', orgId, entity, action, search, from, to],
    enabled: !!orgId,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.rpc('get_org_activity_audit' as any, {
        _org_id: orgId,
        _from: from ? new Date(from).toISOString() : null,
        _to: to ? new Date(to + 'T23:59:59').toISOString() : null,
        _entity_type: entity === 'all' ? null : entity,
        _action_type: action === 'all' ? null : action,
        _actor: null,
        _search: search || null,
        _limit: 500,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const hasFilter = useMemo(
    () => entity !== 'all' || action !== 'all' || !!search || !!from || !!to,
    [entity, action, search, from, to],
  );

  const downloadCsv = () => {
    const csv = '\uFEFF' + toCsv(data); // BOM for Excel Bengali
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setEntity('all'); setAction('all'); setSearch(''); setFrom(''); setTo('');
  };

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" /> অর্গ ও সদস্য পরিবর্তনের অডিট
          </span>
          <Button size="sm" variant="outline" onClick={downloadCsv} disabled={!data.length}>
            <Download className="w-4 h-4 mr-1" /> CSV ডাউনলোড
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="h-9"><SelectValue placeholder="এনটিটি" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব এনটিটি</SelectItem>
              <SelectItem value="organization">অর্গানাইজেশন</SelectItem>
              <SelectItem value="member">সদস্য</SelectItem>
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9"><SelectValue placeholder="অ্যাকশন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব অ্যাকশন</SelectItem>
              <SelectItem value="insert">যোগ</SelectItem>
              <SelectItem value="update">পরিবর্তন</SelectItem>
              <SelectItem value="delete">মুছে ফেলা</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          <div className="relative col-span-2">
            <Search className="w-4 h-4 absolute left-2 top-2.5 opacity-50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="নাম / ইমেইল / ফিল্ড দিয়ে খুঁজুন"
              className="h-9 pl-8"
            />
          </div>
        </div>
        {hasFilter && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3 h-3" />
            <span className="opacity-70">{data.length} টি ফলাফল</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={reset}>
              <X className="w-3 h-3 mr-1" /> ফিল্টার মুছুন
            </Button>
          </div>
        )}

        <ScrollArea className="h-[420px] pr-2">
          {isLoading && <div className="text-sm opacity-70 p-4">লোড হচ্ছে…</div>}
          {!isLoading && data.length === 0 && (
            <div className="text-sm opacity-60 p-4 text-center">কোনো অডিট রেকর্ড নেই</div>
          )}
          <ul className="space-y-2">
            {data.map((r) => (
              <li key={r.id} className="rounded border border-white/10 bg-slate-950/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={actionColor[r.action_type]}>
                      {actionLabel[r.action_type]}
                    </Badge>
                    <Badge variant="outline">{entityLabel[r.entity_type]}</Badge>
                    <span className="opacity-70 text-xs">{fmtDate(r.changed_at)}</span>
                  </div>
                  <div className="text-xs opacity-70 text-right shrink-0">
                    {r.actor_name || 'সিস্টেম'}
                    {r.actor_email && <div className="opacity-60">{r.actor_email}</div>}
                  </div>
                </div>
                <div className="text-xs opacity-90">{summarizeRow(r) || '—'}</div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
