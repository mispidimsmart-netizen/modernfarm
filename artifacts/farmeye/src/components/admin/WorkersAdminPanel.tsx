import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Trash2, UserPlus, Search, Crown } from 'lucide-react';

type FarmRole = 'owner' | 'manager' | 'member' | 'viewer';
const roleLabel: Record<FarmRole, string> = {
  owner: 'মালিক', manager: 'ম্যানেজার', member: 'সদস্য', viewer: 'ভিউয়ার',
};

interface Farm { id: string; name: string; owner_id: string; organization_id: string | null; }
interface Member { id: string; user_id: string; role: FarmRole; profile?: { user_name: string | null; phone: string | null; email: string | null }; }
interface UserSearchRow { id: string; user_name: string | null; phone: string | null; email: string | null; }

export function WorkersAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [farmId, setFarmId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [addRole, setAddRole] = useState<FarmRole>('member');

  const { data: farms = [] } = useQuery({
    queryKey: ['admin_farms_for_workers'],
    queryFn: async (): Promise<Farm[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, owner_id, organization_id')
        .order('name');
      if (error) throw error;
      return (data || []) as Farm[];
    },
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin_farm_members', farmId],
    enabled: !!farmId,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('farm_members')
        .select('id, user_id, role')
        .eq('farm_id', farmId);
      if (error) throw error;
      const rows = (data || []) as Member[];
      if (rows.length === 0) return rows;
      const ids = rows.map(r => r.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .in('id', ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      return rows.map(r => ({ ...r, profile: map.get(r.user_id) as any }));
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['admin_user_search_workers', addQuery],
    enabled: addQuery.length > 1,
    queryFn: async (): Promise<UserSearchRow[]> => {
      const { data, error } = await supabase.rpc('admin_search_users' as any, { _q: addQuery });
      if (error) throw error;
      return (data || []) as UserSearchRow[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: FarmRole }) => {
      const { error } = await supabase
        .from('farm_members')
        .update({ role })
        .eq('farm_id', farmId)
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'রোল আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const removeMember = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase
        .from('farm_members')
        .delete()
        .eq('farm_id', farmId)
        .eq('user_id', user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'সরানো হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const addMember = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase
        .from('farm_members')
        .upsert({ farm_id: farmId, user_id, role: addRole }, { onConflict: 'farm_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_farm_members', farmId] });
      toast({ title: 'ওয়ার্কার যুক্ত হয়েছে' });
      setAddQuery('');
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const selectedFarm = farms.find(f => f.id === farmId);
  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      (m.profile?.user_name || '').toLowerCase().includes(q) ||
      (m.profile?.phone || '').includes(q) ||
      (m.profile?.email || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Farm picker */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            ফার্ম নির্বাচন
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
              <SelectValue placeholder="একটি ফার্ম বেছে নিন" />
            </SelectTrigger>
            <SelectContent>
              {farms.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFarm && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5 text-sm">
              <div className="text-white font-medium">{selectedFarm.name}</div>
              <div className="text-xs text-slate-400 mt-1">মালিক: {selectedFarm.owner_id.slice(0, 8)}…</div>
            </div>
          )}

          {/* Add worker section */}
          {farmId && (
            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="text-sm font-medium text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" /> নতুন ওয়ার্কার যোগ করুন
              </div>
              <Select value={addRole} onValueChange={(v: FarmRole) => setAddRole(v)}>
                <SelectTrigger className="bg-slate-800 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">{roleLabel.manager}</SelectItem>
                  <SelectItem value="member">{roleLabel.member}</SelectItem>
                  <SelectItem value="viewer">{roleLabel.viewer}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  value={addQuery}
                  onChange={e => setAddQuery(e.target.value)}
                  placeholder="ফোন/ইমেইল/নাম দিয়ে খুঁজুন"
                  className="pl-9 bg-slate-800 border-white/10 text-white"
                />
              </div>
              {addQuery.length > 1 && (
                <div className="max-h-40 overflow-auto border border-white/10 rounded-md bg-slate-900/50">
                  {searchResults.length === 0 && <div className="p-2 text-xs text-slate-500">কেউ পাওয়া যায়নি</div>}
                  {searchResults.map(r => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => addMember.mutate(r.id)}
                      className="block w-full text-left p-2 text-sm hover:bg-slate-700/40"
                    >
                      <div className="text-white">{r.user_name || '—'}</div>
                      <div className="text-[11px] text-slate-400">{r.phone} {r.email && `· ${r.email}`}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="pb-3 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              ওয়ার্কার তালিকা
              {members.length > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40">{members.length}</Badge>
              )}
            </CardTitle>
            {farmId && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="খুঁজুন" className="pl-9 h-9 bg-slate-800 border-white/10 text-white w-44" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!farmId ? (
            <p className="text-slate-400 text-sm py-6 text-center">প্রথমে একটি ফার্ম বেছে নিন</p>
          ) : (
            <ScrollArea className="h-[480px] pr-2">
              {isLoading && <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>}
              <div className="space-y-2">
                {filteredMembers.map(m => {
                  const isOwner = m.role === 'owner';
                  return (
                    <div key={m.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-sm flex items-center gap-2 truncate">
                          {isOwner && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                        </div>
                      </div>
                      {!isOwner && (
                        <>
                          <Select
                            value={m.role}
                            onValueChange={(v: FarmRole) => setRole.mutate({ user_id: m.user_id, role: v })}
                          >
                            <SelectTrigger className="h-8 w-[110px] bg-slate-900 border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">{roleLabel.manager}</SelectItem>
                              <SelectItem value="member">{roleLabel.member}</SelectItem>
                              <SelectItem value="viewer">{roleLabel.viewer}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                            onClick={() => {
                              if (confirm('এই সদস্যকে সরাতে চান?')) removeMember.mutate(m.user_id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {isOwner && (
                        <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px]">মালিক</Badge>
                      )}
                    </div>
                  );
                })}
                {filteredMembers.length === 0 && !isLoading && (
                  <p className="text-slate-400 text-sm py-6 text-center">কোনো সদস্য নেই</p>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
