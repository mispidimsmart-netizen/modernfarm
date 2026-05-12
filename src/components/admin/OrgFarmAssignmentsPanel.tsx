import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Tractor, Users, UserPlus, Trash2, Crown } from 'lucide-react';

type FarmRole = 'manager' | 'member' | 'viewer';

interface Org { id: string; name: string; name_en: string; }
interface Farm { id: string; name: string; name_en: string; owner_id: string; location: string | null; }
interface OrgMember {
  user_id: string;
  role: 'org_owner' | 'org_admin' | 'member';
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}
interface FarmMember {
  id: string;
  farm_id: string;
  user_id: string;
  role: string;
}

const farmRoleLabel: Record<FarmRole, string> = {
  manager: 'ম্যানেজার',
  member: 'সদস্য',
  viewer: 'ভিউয়ার',
};

export function OrgFarmAssignmentsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [farmId, setFarmId] = useState<string | null>(null);

  const { data: orgs = [] } = useQuery({
    queryKey: ['admin_organizations_min'],
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, name_en')
        .order('name');
      if (error) throw error;
      return (data || []) as Org[];
    },
  });

  const { data: farms = [] } = useQuery({
    queryKey: ['admin_org_farms', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Farm[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, name_en, owner_id, location')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return (data || []) as Farm[];
    },
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['admin_org_members_full', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OrgMember[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId!);
      if (error) throw error;
      const rows = (data || []) as OrgMember[];
      if (!rows.length) return rows;
      const ids = rows.map(r => r.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .in('id', ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      return rows.map(r => ({ ...r, profile: map.get(r.user_id) as any }));
    },
  });

  const { data: farmMembers = [] } = useQuery({
    queryKey: ['admin_farm_members', farmId],
    enabled: !!farmId,
    queryFn: async (): Promise<FarmMember[]> => {
      const { data, error } = await supabase
        .from('farm_members')
        .select('id, farm_id, user_id, role')
        .eq('farm_id', farmId!);
      if (error) throw error;
      return (data || []) as FarmMember[];
    },
  });

  const assignedMap = useMemo(() => {
    const m = new Map<string, FarmMember>();
    farmMembers.forEach(fm => m.set(fm.user_id, fm));
    return m;
  }, [farmMembers]);

  const selectedFarm = farms.find(f => f.id === farmId);

  const assign = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: FarmRole }) => {
      const { error } = await supabase
        .from('farm_members')
        .upsert(
          { farm_id: farmId!, user_id, role },
          { onConflict: 'farm_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'অ্যাসাইন করা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: FarmRole }) => {
      const { error } = await supabase
        .from('farm_members')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'রোল আপডেট' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const unassign = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('farm_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'সরানো হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      {/* Org picker */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-emerald-400" />
            অর্গানাইজেশন বেছে নিন
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={orgId ?? undefined} onValueChange={(v) => { setOrgId(v); setFarmId(null); }}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue placeholder="অর্গানাইজেশন..." />
            </SelectTrigger>
            <SelectContent>
              {orgs.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name} <span className="opacity-60">· {o.name_en}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {orgId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Farms list */}
          <Card className="bg-slate-900/80 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Tractor className="w-5 h-5 text-cyan-400" />
                ফার্ম তালিকা ({farms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[460px] pr-2">
                {farms.length === 0 && (
                  <p className="text-slate-400 text-sm">এই অর্গানাইজেশনে কোনো ফার্ম নেই।</p>
                )}
                <div className="space-y-2">
                  {farms.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFarmId(f.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        farmId === f.id
                          ? 'bg-cyan-500/10 border-cyan-400/50'
                          : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="font-semibold text-white">{f.name}</div>
                      <div className="text-xs text-slate-400">{f.name_en}{f.location ? ` · ${f.location}` : ''}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">মালিক: {f.owner_id.slice(0, 8)}…</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Members assignment */}
          <Card className="bg-slate-900/80 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-amber-400" />
                ইউজার অ্যাসাইনমেন্ট {selectedFarm ? `· ${selectedFarm.name}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedFarm ? (
                <p className="text-slate-400 text-sm">বাঁদিক থেকে একটি ফার্ম বেছে নিন।</p>
              ) : (
                <ScrollArea className="h-[460px] pr-2">
                  {orgMembers.length === 0 && (
                    <p className="text-slate-400 text-sm">এই অর্গানাইজেশনে কোনো সদস্য নেই — কোম্পানি ট্যাব থেকে সদস্য যোগ করুন।</p>
                  )}
                  <div className="space-y-2">
                    {orgMembers.map(m => {
                      const assigned = assignedMap.get(m.user_id);
                      const isOwner = selectedFarm.owner_id === m.user_id;
                      return (
                        <div
                          key={m.user_id}
                          className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-white text-sm truncate flex items-center gap-2">
                              {m.role === 'org_owner' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                              {isOwner && (
                                <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">
                                  মালিক
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                            </div>
                          </div>

                          {assigned ? (
                            <>
                              <Select
                                value={assigned.role}
                                onValueChange={(v: FarmRole) => updateRole.mutate({ id: assigned.id, role: v })}
                              >
                                <SelectTrigger className="h-8 w-[110px] bg-slate-900 border-white/10 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manager">{farmRoleLabel.manager}</SelectItem>
                                  <SelectItem value="member">{farmRoleLabel.member}</SelectItem>
                                  <SelectItem value="viewer">{farmRoleLabel.viewer}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={isOwner}
                                title={isOwner ? 'ফার্ম মালিককে সরানো যাবে না' : 'অ্যাসাইনমেন্ট সরান'}
                                className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                                onClick={() => {
                                  if (confirm('এই ইউজারকে ফার্ম থেকে সরাতে চান?')) {
                                    unassign.mutate({ id: assigned.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              onClick={() => assign.mutate({ user_id: m.user_id, role: 'member' })}
                              disabled={assign.isPending}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1" /> অ্যাসাইন
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
