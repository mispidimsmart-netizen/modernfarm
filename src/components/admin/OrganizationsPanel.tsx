import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, UserPlus, Trash2, Search, Crown, Shield, KeyRound, Warehouse } from 'lucide-react';

type OrgRole = 'org_owner' | 'org_admin' | 'member';
type LicenseType = 'trial' | 'lifetime' | 'subscription' | 'suspended';

interface Org {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  owner_user_id: string;
  license_type: LicenseType;
  max_farms: number;
  max_users: number;
  license_expires_at: string | null;
  notes: string | null;
  created_at: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}

interface UserSearchRow {
  id: string;
  user_name: string | null;
  phone: string | null;
  email: string | null;
  farm_name: string | null;
}

const roleLabel: Record<OrgRole, string> = {
  org_owner: 'মালিক',
  org_admin: 'অ্যাডমিন',
  member: 'সদস্য',
};

const licenseLabel: Record<LicenseType, string> = {
  trial: 'ট্রায়াল',
  lifetime: 'লাইফটাইম',
  subscription: 'সাবস্ক্রিপশন',
  suspended: 'স্থগিত',
};

export function OrganizationsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin_organizations'],
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Org[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['admin_org_members', selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role, created_at')
        .eq('organization_id', selectedOrgId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as MemberRow[];
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

  const { data: orgFarms = [], isLoading: farmsLoading } = useQuery({
    queryKey: ['admin_org_farms', selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, owner_id, created_at')
        .eq('organization_id', selectedOrgId!)
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; owner_id: string; created_at: string }>;
    },
  });

  const membersKey = ['admin_org_members', selectedOrgId] as const;

  const removeMember = useMutation({
    mutationFn: async ({ user_id }: { user_id: string }) => {
      const { error } = await supabase.rpc('super_admin_remove_org_member' as any, {
        _org_id: selectedOrgId, _user_id: user_id,
      });
      if (error) throw error;
    },
    onMutate: async ({ user_id }) => {
      await qc.cancelQueries({ queryKey: membersKey });
      const previous = qc.getQueryData<MemberRow[]>(membersKey);
      if (previous) {
        qc.setQueryData<MemberRow[]>(membersKey, previous.filter(m => m.user_id !== user_id));
      }
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(membersKey, ctx.previous);
      toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'সদস্য সরানো হয়েছে' });
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: membersKey, refetchType: 'active' });
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['admin_organizations'] });
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: OrgRole }) => {
      const { error } = await supabase.rpc('super_admin_set_org_member_role' as any, {
        _org_id: selectedOrgId, _user_id: user_id, _role: role,
      });
      if (error) throw error;
    },
    onMutate: async ({ user_id, role }) => {
      await qc.cancelQueries({ queryKey: membersKey });
      const previous = qc.getQueryData<MemberRow[]>(membersKey);
      if (previous) {
        qc.setQueryData<MemberRow[]>(
          membersKey,
          previous.map(m => (m.user_id === user_id ? { ...m, role } : m)),
        );
      }
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(membersKey, ctx.previous);
      toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'রোল আপডেট হয়েছে' });
    },
    onSettled: async () => {
      // Force a fresh fetch from the server so the canonical role is shown,
      // and refresh anything else that depends on org membership/roles.
      await qc.invalidateQueries({ queryKey: membersKey, refetchType: 'active' });
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['admin_organizations'] });
    },
  });

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Orgs list */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            কোম্পানি/অর্গানাইজেশন
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> নতুন
              </Button>
            </DialogTrigger>
            <CreateOrgDialog
              onCreated={() => {
                setCreateOpen(false);
                qc.invalidateQueries({ queryKey: ['admin_organizations'] });
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px] pr-2">
            {isLoading && <p className="text-slate-400 text-sm">লোড হচ্ছে...</p>}
            {!isLoading && orgs.length === 0 && (
              <p className="text-slate-400 text-sm">কোনো অর্গানাইজেশন নেই — "নতুন" চাপুন।</p>
            )}
            <div className="space-y-2">
              {orgs.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrgId(o.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedOrgId === o.id
                      ? 'bg-emerald-500/10 border-emerald-400/50'
                      : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">{o.name}</div>
                      <div className="text-xs text-slate-400">{o.name_en} · /{o.slug}</div>
                    </div>
                    <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">
                      {licenseLabel[o.license_type]}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>সর্বোচ্চ ফার্ম: {o.max_farms} · ইউজার: {o.max_users}</span>
                    {o.license_expires_at && (
                      <span className="text-amber-300/80">
                        মেয়াদ: {new Date(o.license_expires_at).toLocaleDateString('bn-BD')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Members panel */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            সদস্য {selectedOrg ? `· ${selectedOrg.name}` : ''}
          </CardTitle>
          {selectedOrg && (
            <div className="flex gap-2">
              <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10">
                    <KeyRound className="w-4 h-4 mr-1" /> লাইসেন্স
                  </Button>
                </DialogTrigger>
                <LicenseDialog
                  org={selectedOrg}
                  onSaved={() => {
                    setLicenseOpen(false);
                    qc.invalidateQueries({ queryKey: ['admin_organizations'] });
                  }}
                />
              </Dialog>
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <UserPlus className="w-4 h-4 mr-1" /> যোগ করুন
                  </Button>
                </DialogTrigger>
                <AddMemberDialog
                  orgId={selectedOrg.id}
                  onAdded={() => {
                    setAddMemberOpen(false);
                    qc.invalidateQueries({ queryKey: ['admin_org_members', selectedOrg.id] });
                  }}
                />
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!selectedOrg ? (
            <p className="text-slate-400 text-sm">বাঁদিক থেকে একটি অর্গানাইজেশন বেছে নিন।</p>
          ) : (
            <ScrollArea className="h-[480px] pr-2">
              <div className="space-y-2">
                {members.length === 0 && (
                  <p className="text-slate-400 text-sm">কোনো সদস্য নেই।</p>
                )}
                {members.map(m => (
                  <div key={m.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm truncate flex items-center gap-2">
                        {m.role === 'org_owner' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                      </div>
                    </div>
                    <Select
                      value={m.role}
                      onValueChange={(v: OrgRole) => setRole.mutate({ user_id: m.user_id, role: v })}
                    >
                      <SelectTrigger className="h-8 w-[120px] bg-slate-900 border-white/10 text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org_owner">{roleLabel.org_owner}</SelectItem>
                        <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
                        <SelectItem value="member">{roleLabel.member}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm('এই সদস্যকে সরাতে চান?')) {
                          removeMember.mutate({ user_id: m.user_id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Create Org Dialog ---------------- */

function CreateOrgDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [license, setLicense] = useState<LicenseType>('trial');
  const [maxFarms, setMaxFarms] = useState(1);
  const [maxUsers, setMaxUsers] = useState(5);
  const [search, setSearch] = useState('');

  const { data: results = [] } = useQuery({
    queryKey: ['admin_user_search', search],
    enabled: search.length > 1,
    queryFn: async (): Promise<UserSearchRow[]> => {
      const { data, error } = await supabase.rpc('admin_search_users' as any, { _q: search });
      if (error) throw error;
      return (data || []) as UserSearchRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_create_organization' as any, {
        _name: name,
        _name_en: nameEn || name,
        _slug: slug,
        _owner_user_id: ownerId,
        _license_type: license,
        _max_farms: maxFarms,
        _max_users: maxUsers,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'অর্গানাইজেশন তৈরি হয়েছে' });
      onCreated();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>নতুন অর্গানাইজেশন</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>নাম (বাংলা)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Name (English)</Label>
            <Input value={nameEn} onChange={e => setNameEn(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Slug (URL)</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="acme-poultry" />
        </div>

        <div>
          <Label>Owner খুঁজুন (ফোন/ইমেইল/নাম)</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input className="pl-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="01700000000" />
          </div>
          {search.length > 1 && (
            <div className="mt-2 max-h-40 overflow-auto border border-white/10 rounded-md">
              {results.map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => { setOwnerId(r.id); setSearch(r.user_name || r.phone || r.email || r.id); }}
                  className={`block w-full text-left p-2 text-sm hover:bg-slate-700/40 ${ownerId === r.id ? 'bg-emerald-500/10' : ''}`}
                >
                  <div className="text-white">{r.user_name || '—'}</div>
                  <div className="text-[11px] text-slate-400">{r.phone} {r.email && `· ${r.email}`}</div>
                </button>
              ))}
              {results.length === 0 && <div className="p-2 text-xs text-slate-500">কেউ পাওয়া যায়নি</div>}
            </div>
          )}
          {ownerId && <div className="text-[11px] text-emerald-400 mt-1">নির্বাচিত: {ownerId.slice(0, 8)}…</div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>লাইসেন্স</Label>
            <Select value={license} onValueChange={(v: LicenseType) => setLicense(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">ট্রায়াল</SelectItem>
                <SelectItem value="lifetime">লাইফটাইম</SelectItem>
                <SelectItem value="subscription">সাবস্ক্রিপশন</SelectItem>
                <SelectItem value="suspended">স্থগিত</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Max Farms</Label>
            <Input type="number" min={1} value={maxFarms} onChange={e => setMaxFarms(+e.target.value || 1)} />
          </div>
          <div>
            <Label>Max Users</Label>
            <Input type="number" min={1} value={maxUsers} onChange={e => setMaxUsers(+e.target.value || 1)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => create.mutate()}
          disabled={!name || !nameEn || !slug || !ownerId || create.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {create.isPending ? 'তৈরি হচ্ছে...' : 'তৈরি করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- Add Member Dialog ---------------- */

function AddMemberDialog({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<OrgRole>('member');

  const { data: results = [] } = useQuery({
    queryKey: ['admin_user_search_member', search],
    enabled: search.length > 1,
    queryFn: async (): Promise<UserSearchRow[]> => {
      const { data, error } = await supabase.rpc('admin_search_users' as any, { _q: search });
      if (error) throw error;
      return (data || []) as UserSearchRow[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('super_admin_add_org_member' as any, {
        _org_id: orgId, _identifier: identifier, _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'সদস্য যোগ হয়েছে' });
      onAdded();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>সদস্য যোগ করুন</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>ইউজার খুঁজুন</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              className="pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setIdentifier(e.target.value); }}
              placeholder="ফোন / ইমেইল / নাম"
            />
          </div>
          {search.length > 1 && (
            <div className="mt-2 max-h-48 overflow-auto border border-white/10 rounded-md">
              {results.map(r => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => { setIdentifier(r.id); setSearch(r.user_name || r.phone || r.email || r.id); }}
                  className="block w-full text-left p-2 text-sm hover:bg-slate-700/40"
                >
                  <div className="text-white">{r.user_name || '—'}</div>
                  <div className="text-[11px] text-slate-400">{r.phone} {r.email && `· ${r.email}`}</div>
                </button>
              ))}
              {results.length === 0 && <div className="p-2 text-xs text-slate-500">কেউ পাওয়া যায়নি</div>}
            </div>
          )}
        </div>
        <div>
          <Label>রোল</Label>
          <Select value={role} onValueChange={(v: OrgRole) => setRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="org_owner">{roleLabel.org_owner}</SelectItem>
              <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
              <SelectItem value="member">{roleLabel.member}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => add.mutate()}
          disabled={!identifier || add.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {add.isPending ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ---------------- License Dialog ---------------- */

function LicenseDialog({ org, onSaved }: { org: Org; onSaved: () => void }) {
  const { toast } = useToast();
  const [license, setLicense] = useState<LicenseType>(org.license_type);
  const [expiresAt, setExpiresAt] = useState<string>(
    org.license_expires_at ? org.license_expires_at.slice(0, 10) : ''
  );
  const [maxFarms, setMaxFarms] = useState(org.max_farms);
  const [maxUsers, setMaxUsers] = useState(org.max_users);
  const [notes, setNotes] = useState(org.notes || '');

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('super_admin_update_organization_license' as any, {
        _org_id: org.id,
        _license_type: license,
        _license_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        _max_farms: maxFarms,
        _max_users: maxUsers,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'লাইসেন্স আপডেট হয়েছে' });
      onSaved();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>লাইসেন্স — {org.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>লাইসেন্স টাইপ</Label>
          <Select value={license} onValueChange={(v: LicenseType) => setLicense(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">ট্রায়াল</SelectItem>
              <SelectItem value="lifetime">লাইফটাইম</SelectItem>
              <SelectItem value="subscription">সাবস্ক্রিপশন</SelectItem>
              <SelectItem value="suspended">স্থগিত</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(license === 'trial' || license === 'subscription') && (
          <div>
            <Label>মেয়াদ শেষ</Label>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1">লাইফটাইমের জন্য প্রযোজ্য নয়।</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Max Farms</Label>
            <Input type="number" min={1} value={maxFarms} onChange={e => setMaxFarms(+e.target.value || 1)} />
          </div>
          <div>
            <Label>Max Users</Label>
            <Input type="number" min={1} value={maxUsers} onChange={e => setMaxUsers(+e.target.value || 1)} />
          </div>
        </div>
        <div>
          <Label>নোট (অভ্যন্তরীণ)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="যেমন: ২০২৬ চুক্তি, paid 50k" />
        </div>
        {license === 'suspended' && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded p-2">
            ⚠ স্থগিত করলে এই কোম্পানির সব ইউজার তাদের ফার্ম এক্সেস হারাবে।
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {save.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
