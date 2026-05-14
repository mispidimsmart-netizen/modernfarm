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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Crown, Building2, Tractor, HardHat, UserCog, Plus, Trash2, Loader2 } from 'lucide-react';
import { translatePgError } from '@/lib/translatePgError';

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
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runIntegrationTests = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.rpc('test_role_sync_invariants' as any);
      if (error) throw error;
      const r = data as any as { passed: number; failed: number; total: number; tests: { name: string; pass: boolean; detail?: string }[] };
      const failedItems = (r.tests || []).filter(t => !t.pass);
      toast({
        title: r.failed === 0 ? `সব ${r.total}টি ইন্টিগ্রেশন টেস্ট পাস ✅` : `${r.failed}/${r.total} টেস্ট ফেইল ❌`,
        description: r.failed === 0
          ? 'farm_members ↔ user_roles ↔ farms.owner_id সিঙ্ক ঠিক আছে।'
          : failedItems.map(t => `${t.name}${t.detail ? ` (${t.detail})` : ''}`).join(' • '),
        variant: r.failed === 0 ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'টেস্ট রান ব্যর্থ', description: translatePgError(e), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };


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
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              className="h-9 border-violet-400/40 text-violet-300 hover:bg-violet-500/10"
              disabled={testing}
              onClick={runIntegrationTests}
              title="রোল সিঙ্ক ইন্টিগ্রেশন টেস্ট চালান"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              টেস্ট চালান
            </Button>
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

interface DraftOrg { organization_id: string; role: string; org_name: string; org_slug: string; }
interface DraftFarm { farm_id: string; role: string; farm_name: string; }

function UserRoleDialog({ user, onClose }: { user: ProfileRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: summary, isLoading } = useQuery({
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

  // Local draft state
  const [draftSuper, setDraftSuper] = useState<boolean>(false);
  const [draftOrgs, setDraftOrgs] = useState<DraftOrg[]>([]);
  const [draftFarms, setDraftFarms] = useState<DraftFarm[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate draft from summary once
  useMemo(() => {
    if (summary && !hydrated) {
      setDraftSuper(summary.is_super_admin);
      setDraftOrgs(summary.orgs.map(o => ({
        organization_id: o.organization_id,
        role: o.role,
        org_name: o.org_name,
        org_slug: o.org_slug,
      })));
      setDraftFarms(summary.farm_memberships.map(f => ({
        farm_id: f.farm_id,
        role: f.role,
        farm_name: f.farm_name,
      })));
      setHydrated(true);
    }
  }, [summary, hydrated]);

  // Single Save mutation — one transaction, all scopes
  const apply = useMutation({
    mutationFn: async () => {
      const payload = {
        is_super_admin: draftSuper,
        orgs: draftOrgs.map(o => ({ organization_id: o.organization_id, role: o.role })),
        farm_memberships: draftFarms.map(f => ({ farm_id: f.farm_id, role: f.role })),
      };
      const { data, error } = await supabase.rpc(
        'super_admin_apply_user_roles' as any,
        { _user_id: user.id, _payload: payload as any }
      );
      if (error) throw error;
      return data as unknown as {
        orgs: { added: number; updated: number; removed: number };
        farms: { added: number; updated: number; removed: number };
      };
    },
    onSuccess: async (r) => {
      // 1. Invalidate everything access-dependent so any open view of this
      //    user's farms/devices/permissions refetches immediately.
      const accessKeys = [
        ['user_role_summary', user.id],
        ['admin_all_farms'],
        ['admin_deleted_farms'],
        ['admin_organizations'],
        ['admin_orgs_for_farms'],
        ['admin_orgs_for_unified'],
        ['admin_farms_for_unified'],
        ['admin_all_profiles_for_roles'],
        ['v_user_canonical_roles'],
        // Per-user cached queries
        ['user-farms', user.id],
        ['user-farms'],
        ['farm-members'],
        ['perm_farm_checks', user.id],
        ['perm_farm_checks'],
        // Device & dashboard caches that depend on farm access
        ['device_tokens', user.id],
        ['device_tokens'],
        ['device_health', user.id],
        ['device_health'],
        ['device_status'],
        ['device_commands'],
        ['device-command-log'],
        ['device-command-log-devices'],
        ['dashboard-snapshot'],
      ] as const;
      await Promise.all(
        accessKeys.map(k => qc.invalidateQueries({ queryKey: k as any, refetchType: 'all' }))
      );

      // 2. Broadcast over Supabase Realtime so the affected user's other
      //    open sessions/tabs also refresh access without waiting for reload.
      try {
        const ch = supabase.channel(`role-updates:${user.id}`);
        await ch.send({
          type: 'broadcast',
          event: 'roles_changed',
          payload: { user_id: user.id, at: new Date().toISOString() },
        });
        supabase.removeChannel(ch);
      } catch {
        // best-effort; ignore broadcast failure
      }

      toast({
        title: 'রোল আপডেট সম্পন্ন',
        description: `অর্গ: +${r.orgs.added}/~${r.orgs.updated}/−${r.orgs.removed} • ফার্ম: +${r.farms.added}/~${r.farms.updated}/−${r.farms.removed}`,
      });
      onClose();
    },
    onError: (e: any) => toast({ title: 'সেভ ব্যর্থ', description: translatePgError(e), variant: 'destructive' }),
  });

  // AlertDialog state for unsaved-changes confirmation
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  // Add/edit/remove draft helpers
  const [newOrgId, setNewOrgId] = useState<string>('');
  const [newOrgRole, setNewOrgRole] = useState<string>('member');
  const [newFarmId, setNewFarmId] = useState<string>('');
  const [newFarmRole, setNewFarmRole] = useState<string>('member');

  const availableOrgs = useMemo(() => {
    const taken = new Set(draftOrgs.map(o => o.organization_id));
    return realOrgs.filter(o => !taken.has(o.id));
  }, [realOrgs, draftOrgs]);

  const availableFarms = useMemo(() => {
    const taken = new Set(draftFarms.map(f => f.farm_id));
    return allFarms.filter(f => !taken.has(f.id));
  }, [allFarms, draftFarms]);

  // Detect dirty state
  const dirty = useMemo(() => {
    if (!summary || !hydrated) return false;
    if (draftSuper !== summary.is_super_admin) return true;
    const orgKey = (xs: { organization_id: string; role: string }[]) =>
      xs.map(x => `${x.organization_id}:${x.role}`).sort().join('|');
    if (orgKey(draftOrgs) !== orgKey(summary.orgs)) return true;
    const fKey = (xs: { farm_id: string; role: string }[]) =>
      xs.map(x => `${x.farm_id}:${x.role}`).sort().join('|');
    if (fKey(draftFarms) !== fKey(summary.farm_memberships)) return true;
    return false;
  }, [summary, hydrated, draftSuper, draftOrgs, draftFarms]);

  return (
    <>
    <Dialog open onOpenChange={(o) => { if (!o) { if (dirty) setConfirmDiscardOpen(true); else onClose(); } }}>
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
                    checked={draftSuper}
                    onCheckedChange={(v) => setDraftSuper(v)}
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
                {draftOrgs.length === 0 && (
                  <p className="text-xs text-slate-400">কোনো অর্গে সদস্য না।</p>
                )}
                {draftOrgs.map(o => (
                  <div key={o.organization_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{o.org_name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{o.org_slug}</div>
                    </div>
                    <Select
                      value={o.role}
                      onValueChange={(v) => setDraftOrgs(prev =>
                        prev.map(x => x.organization_id === o.organization_id ? { ...x, role: v } : x)
                      )}
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
                      onClick={() => setDraftOrgs(prev => prev.filter(x => x.organization_id !== o.organization_id))}
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
                      disabled={!newOrgId}
                      onClick={() => {
                        const org = realOrgs.find(o => o.id === newOrgId);
                        if (!org) return;
                        setDraftOrgs(prev => [...prev, {
                          organization_id: org.id,
                          role: newOrgRole,
                          org_name: org.name,
                          org_slug: org.slug || '',
                        }]);
                        setNewOrgId('');
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </section>

              {/* Owned Farms (read-only) */}
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

              {/* Farm Memberships */}
              <section className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-400/20 space-y-2">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-cyan-200">ফার্ম মেম্বারশিপ (ওয়ার্কার/ম্যানেজার)</span>
                </div>
                {draftFarms.length === 0 && (
                  <p className="text-xs text-slate-400">কোনো ফার্মে সদস্য না।</p>
                )}
                {draftFarms.map(f => (
                  <div key={f.farm_id} className="flex items-center gap-2 p-2 rounded bg-slate-800/60">
                    <div className="flex-1 min-w-0 text-sm text-white truncate">{f.farm_name}</div>
                    <Select
                      value={f.role}
                      onValueChange={(v) => setDraftFarms(prev =>
                        prev.map(x => x.farm_id === f.farm_id ? { ...x, role: v } : x)
                      )}
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
                      onClick={() => setDraftFarms(prev => prev.filter(x => x.farm_id !== f.farm_id))}
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
                      disabled={!newFarmId}
                      onClick={() => {
                        const farm = allFarms.find(x => x.id === newFarmId);
                        if (!farm) return;
                        setDraftFarms(prev => [...prev, {
                          farm_id: farm.id,
                          role: newFarmRole,
                          farm_name: farm.name,
                        }]);
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
            সব পরিবর্তন একটি transaction-এ সেভ হবে; legacy worker টেবিল triggers দিয়ে auto-sync।
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 border-white/10 text-slate-300 hover:bg-slate-800"
              onClick={() => {
                if (dirty) setConfirmDiscardOpen(true); else onClose();
              }}
              disabled={apply.isPending}
            >
              বাতিল
            </Button>
            <Button
              size="sm"
              className="h-8 bg-violet-600 hover:bg-violet-700"
              disabled={!dirty || apply.isPending || isLoading}
              onClick={() => apply.mutate()}
            >
              {apply.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              সেভ করুন
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

