import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Search, Crown, Building2, Tractor, HardHat, UserCog, Plus, Trash2, Loader2 } from 'lucide-react';

interface ProfileRow {
  id: string;
  user_name: string | null;
  phone: string | null;
  email: string | null;
}

interface RoleSummary {
  is_super_admin: boolean;
  orgs: { organization_id: string; org_name: string; org_slug: string; role: string }[];
  owned_farms: { farm_id: string; farm_name: string; organization_id: string | null }[];
  farm_memberships: { farm_id: string; farm_name: string; organization_id: string | null; role: string }[];
}

interface OrgOpt { id: string; name: string; slug: string | null; }
interface FarmOpt { id: string; name: string; organization_id: string | null; }

const ORG_ROLES = [
  { value: 'org_owner', label: 'অর্গ মালিক' },
  { value: 'org_admin', label: 'অর্গ এডমিন' },
  { value: 'member', label: 'সাধারণ সদস্য' },
];
const FARM_ROLES = [
  { value: 'manager', label: 'ম্যানেজার' },
  { value: 'member', label: 'সদস্য' },
  { value: 'worker', label: 'ওয়ার্কার' },
  { value: 'viewer', label: 'ভিউয়ার' },
];

export function UnifiedRoleEditorPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_all_profiles_for_roles'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .order('user_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.user_name || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const openUser = users.find(u => u.id === openUserId) || null;

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-violet-400" />
            ইউনিফাইড রোল এডিটর
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-400/40">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="নাম/ফোন/ইমেইল খুঁজুন..."
              className="pl-9 bg-slate-800 border-white/10 text-white w-full sm:w-72"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          এক জায়গা থেকে যেকোনো ইউজারের সুপার এডমিন, অর্গ, ফার্ম ও ওয়ার্কার রোল একসাথে দেখুন ও বদলান।
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[560px] pr-2">
          {isLoading && <p className="text-slate-400 text-sm py-6">লোড হচ্ছে...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center">কোনো ইউজার পাওয়া যায়নি</p>
          )}
          <div className="space-y-2">
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => setOpenUserId(u.id)}
                className="w-full text-left p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-violet-400/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold truncate">
                    {u.user_name || '— নাম নেই —'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {u.phone || ''} {u.email ? `· ${u.email}` : ''}
                  </div>
                </div>
                <Badge variant="outline" className="border-violet-400/40 text-violet-300 text-xs shrink-0">
                  রোল এডিট
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      {openUser && (
        <UserRoleDialog
          user={openUser}
          onClose={() => setOpenUserId(null)}
        />
      )}
    </Card>
  );
}

function UserRoleDialog({ user, onClose }: { user: ProfileRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['user_role_summary', user.id],
    queryFn: async (): Promise<RoleSummary> => {
      const { data, error } = await supabase.rpc(
        'super_admin_get_user_role_summary' as any,
        { _user_id: user.id }
      );
      if (error) throw error;
      return data as unknown as RoleSummary;
    },
  });

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['admin_orgs_for_unified'],
    queryFn: async (): Promise<OrgOpt[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name');
      if (error) throw error;
      return (data || []) as OrgOpt[];
    },
  });
  const realOrgs = useMemo(
    () => allOrgs.filter(o => !(o.slug || '').startsWith('personal-')),
    [allOrgs]
  );

  const { data: allFarms = [] } = useQuery({
    queryKey: ['admin_farms_for_unified'],
    queryFn: async (): Promise<FarmOpt[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, organization_id')
        .order('name');
      if (error) throw error;
      return (data || []) as FarmOpt[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['user_role_summary', user.id] });
    qc.invalidateQueries({ queryKey: ['admin_all_farms'] });
    qc.invalidateQueries({ queryKey: ['admin_organizations'] });
    refetch();
  };

  const handleErr = (e: any) =>
    toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' });

  const setSuperAdmin = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.rpc(
        'super_admin_set_super_admin' as any,
        { _user_id: user.id, _enabled: enabled }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'সুপার এডমিন স্ট্যাটাস আপডেট' }); },
    onError: handleErr,
  });

  const setOrgRole = useMutation({
    mutationFn: async ({ orgId, role }: { orgId: string; role: string }) => {
      const { error } = await supabase.rpc(
        'super_admin_set_org_member_role' as any,
        { _organization_id: orgId, _user_id: user.id, _role: role }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'অর্গ রোল আপডেট' }); },
    onError: handleErr,
  });

  const addOrgMember = useMutation({
    mutationFn: async ({ orgId, role }: { orgId: string; role: string }) => {
      const { error } = await supabase.rpc(
        'super_admin_add_org_member' as any,
        { _organization_id: orgId, _user_id: user.id, _role: role }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'অর্গে যোগ করা হয়েছে' }); },
    onError: handleErr,
  });

  const removeOrgMember = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc(
        'super_admin_remove_org_member' as any,
        { _organization_id: orgId, _user_id: user.id }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'অর্গ থেকে সরানো হয়েছে' }); },
    onError: handleErr,
  });

  const setFarmMemberRole = useMutation({
    mutationFn: async ({ farmId, role }: { farmId: string; role: string }) => {
      const { error } = await supabase.rpc(
        'super_admin_set_farm_member_role' as any,
        { _farm_id: farmId, _user_id: user.id, _role: role }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'ফার্ম রোল আপডেট' }); },
    onError: handleErr,
  });

  const repairRoles = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        'super_admin_repair_user_roles' as any,
        { _user_id: user.id }
      );
      if (error) throw error;
      return data as unknown as { inserted: number; deleted: number };
    },
    onSuccess: (r) => {
      invalidate();
      toast({
        title: 'রোল রিপেয়ার সম্পন্ন',
        description: `যোগ: ${r.inserted}, সরানো: ${r.deleted}`,
      });
    },
    onError: handleErr,
  });

  // Add new org/farm pickers
  const [newOrgId, setNewOrgId] = useState<string>('');
  const [newOrgRole, setNewOrgRole] = useState<string>('member');
  const [newFarmId, setNewFarmId] = useState<string>('');
  const [newFarmRole, setNewFarmRole] = useState<string>('member');

  const availableOrgs = useMemo(() => {
    const taken = new Set((summary?.orgs || []).map(o => o.organization_id));
    return realOrgs.filter(o => !taken.has(o.id));
  }, [realOrgs, summary]);

  const availableFarms = useMemo(() => {
    const taken = new Set((summary?.farm_memberships || []).map(f => f.farm_id));
    return allFarms.filter(f => !taken.has(f.id));
  }, [allFarms, summary]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-violet-400" />
            {user.user_name || user.phone || 'ইউজার'} — রোল এডিটর
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {user.phone} {user.email ? `· ${user.email}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !summary ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-5 py-2">
              {/* Super Admin */}
              <section className="p-3 rounded-lg bg-amber-500/5 border border-amber-400/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-amber-200">সুপার এডমিন</span>
                  </div>
                  <Switch
                    checked={summary.is_super_admin}
                    disabled={setSuperAdmin.isPending}
                    onCheckedChange={(v) => setSuperAdmin.mutate(v)}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">পুরো সিস্টেমের সম্পূর্ণ এডমিন অ্যাক্সেস।</p>
              </section>

              {/* Organizations */}
              <section className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-200">অর্গানাইজেশন রোল</span>
                </div>
                {summary.orgs.length === 0 && (
                  <p className="text-xs text-slate-400">কোনো অর্গে সদস্য না।</p>
                )}
                {summary.orgs.map(o => (
                  <div key={o.organization_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{o.org_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{o.org_slug}</div>
                    </div>
                    <Select
                      value={o.role}
                      onValueChange={(v) => setOrgRole.mutate({ orgId: o.organization_id, role: v })}
                    >
                      <SelectTrigger className="h-8 w-[140px] bg-slate-900 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm('এই অর্গ থেকে সরাতে চান?')) {
                          removeOrgMember.mutate(o.organization_id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {availableOrgs.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select value={newOrgId} onValueChange={setNewOrgId}>
                      <SelectTrigger className="h-8 flex-1 bg-slate-900 border-white/10 text-xs">
                        <SelectValue placeholder="অর্গ বেছে নিন..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOrgs.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newOrgRole} onValueChange={setNewOrgRole}>
                      <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORG_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!newOrgId || addOrgMember.isPending}
                      onClick={() => {
                        addOrgMember.mutate({ orgId: newOrgId, role: newOrgRole });
                        setNewOrgId('');
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </section>

              {/* Owned Farms (read-only summary) */}
              <section className="p-3 rounded-lg bg-green-500/5 border border-green-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <Tractor className="w-4 h-4 text-green-400" />
                  <span className="font-semibold text-green-200">মালিকানাধীন ফার্ম</span>
                </div>
                {summary.owned_farms.length === 0 ? (
                  <p className="text-xs text-slate-400">কোনো ফার্মের মালিক নয়।</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {summary.owned_farms.map(f => (
                      <Badge key={f.farm_id} variant="outline" className="border-green-400/40 text-green-300 text-[11px]">
                        {f.farm_name}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">
                  মালিকানা বদলাতে "ফার্ম" ট্যাব ব্যবহার করুন।
                </p>
              </section>

              {/* Farm Memberships (worker / member / manager / viewer) */}
              <section className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-400/20 space-y-2">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-cyan-200">ফার্ম মেম্বারশিপ (ওয়ার্কার/ম্যানেজার)</span>
                </div>
                {summary.farm_memberships.length === 0 && (
                  <p className="text-xs text-slate-400">কোনো ফার্মে সদস্য না।</p>
                )}
                {summary.farm_memberships.map(f => (
                  <div key={f.farm_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
                    <div className="flex-1 min-w-0 text-sm text-white truncate">{f.farm_name}</div>
                    <Select
                      value={f.role}
                      onValueChange={(v) => setFarmMemberRole.mutate({ farmId: f.farm_id, role: v })}
                    >
                      <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FARM_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm('এই ফার্ম থেকে সরাতে চান?')) {
                          setFarmMemberRole.mutate({ farmId: f.farm_id, role: 'none' });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {availableFarms.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select value={newFarmId} onValueChange={setNewFarmId}>
                      <SelectTrigger className="h-8 flex-1 bg-slate-900 border-white/10 text-xs">
                        <SelectValue placeholder="ফার্ম বেছে নিন..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFarms.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newFarmRole} onValueChange={setNewFarmRole}>
                      <SelectTrigger className="h-8 w-[130px] bg-slate-900 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FARM_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-700"
                      disabled={!newFarmId || setFarmMemberRole.isPending}
                      onClick={() => {
                        setFarmMemberRole.mutate({ farmId: newFarmId, role: newFarmRole });
                        setNewFarmId('');
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        )}
        <div className="border-t border-white/10 pt-3 mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            সব পরিবর্তন স্বয়ংক্রিয়ভাবে legacy worker টেবিলে sync হয় (transactional triggers)।
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-violet-400/40 text-violet-300 hover:bg-violet-500/10"
            disabled={repairRoles.isPending}
            onClick={() => repairRoles.mutate()}
          >
            {repairRoles.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'রোল রিপেয়ার'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
