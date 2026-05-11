import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Crown, User, ArrowRight, Calendar } from 'lucide-react';

type LicenseType = 'trial' | 'lifetime' | 'subscription' | 'suspended';

const licenseLabel: Record<string, string> = {
  trial: 'ট্রায়াল',
  lifetime: 'লাইফটাইম',
  subscription: 'সাবস্ক্রিপশন',
  suspended: 'স্থগিত',
};

interface AuditRow {
  id: string;
  changed_at: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  is_super_admin: boolean;
  old_license_type: string | null;
  new_license_type: string | null;
  old_expires_at: string | null;
  new_expires_at: string | null;
  max_farms: number | null;
  max_users: number | null;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function fmtExpiry(d: string | null) {
  if (!d) return '∞';
  return new Date(d).toLocaleDateString('bn-BD');
}

export function LicenseAuditLog({ orgId }: { orgId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['org_license_audit', orgId],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase.rpc('get_org_license_audit' as any, {
        _org_id: orgId,
        _limit: 50,
      });
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" /> লাইসেন্স পরিবর্তনের ইতিহাস
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-2">
          {isLoading ? (
            <p className="text-sm text-slate-400">লোড হচ্ছে...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-400">এখনো কোনো লাইসেন্স পরিবর্তন হয়নি।</p>
          ) : (
            <div className="space-y-3">
              {data.map((row) => {
                const typeChanged =
                  row.old_license_type && row.new_license_type &&
                  row.old_license_type !== row.new_license_type;
                const expiryChanged =
                  (row.old_expires_at || '') !== (row.new_expires_at || '');
                return (
                  <div
                    key={row.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-white/5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        {row.is_super_admin ? (
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="font-medium">
                          {row.changed_by_name || row.changed_by_email || 'অজানা ইউজার'}
                        </span>
                        {row.is_super_admin && (
                          <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px] py-0 px-1.5">
                            সুপার অ্যাডমিন
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {fmtDate(row.changed_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {typeChanged ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="border-rose-400/40 text-rose-300">
                            {licenseLabel[row.old_license_type!] || row.old_license_type}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">
                            {licenseLabel[row.new_license_type!] || row.new_license_type}
                          </Badge>
                        </div>
                      ) : row.new_license_type && (
                        <Badge variant="outline" className="border-slate-400/40 text-slate-300">
                          {licenseLabel[row.new_license_type] || row.new_license_type}
                        </Badge>
                      )}

                      {expiryChanged && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{fmtExpiry(row.old_expires_at)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-amber-300">{fmtExpiry(row.new_expires_at)}</span>
                        </div>
                      )}

                      {(row.max_farms != null || row.max_users != null) && (
                        <span className="text-slate-500">
                          · ফার্ম: {row.max_farms ?? '—'} · ইউজার: {row.max_users ?? '—'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
