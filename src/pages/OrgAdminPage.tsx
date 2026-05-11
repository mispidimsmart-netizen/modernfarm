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
import { Building2, Crown, Shield, UserPlus, Trash2, Tractor, Users, Calendar, Mail, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

type OrgRole = 'org_owner' | 'org_admin' | 'member';
type LicenseType = 'trial' | 'lifetime' | 'subscription' | 'suspended';

interface MyOrg {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  license_type: LicenseType;
  license_expires_at: string | null;
  max_farms: number;
  max_users: number;
  my_role: OrgRole;
  farm_count: number;
  member_count: number;
  license_valid: boolean;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}

interface FarmRow {
  id: string;
  name: string;
  name_en: string | null;
  owner_id: string;
  created_at: string;
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

export default function OrgAdminPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['my_organizations'],
    queryFn: async (): Promise<MyOrg[]> => {
      const { data, error } = await supabase.rpc('get_my_organizations' as any);
      if (error) throw error;
      return (data || []) as MyOrg[];
    },
  });

  const selected = orgs.find(o => o.id === selectedId) || orgs[0];
  const activeId = selected?.id || null;

  const { data: members = [] } = useQuery({
    queryKey: ['org_members', activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', activeId!);
      if (error) throw error;
      const rows = (data || []) as MemberRow[];
      if (rows.length === 0) return rows;
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .in('id', rows.map(r => r.user_id));
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      return rows.map(r => ({ ...r, profile: map.get(r.user_id) as any }));
    },
  });

  const { data: farms = [] } = useQuery({
    queryKey: ['org_farms', activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<FarmRow[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, name_en, owner_id, created_at')
        .eq('organization_id', activeId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as FarmRow[];
    },
  });

  const removeMember = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.rpc('org_admin_remove_member' as any, {
        _org_id: activeId, _user_id: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_members', activeId] });
      toast({ title: 'সদস্য সরানো হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const setRole = useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: OrgRole }) => {
      const { error } = await supabase.rpc('org_admin_set_member_role' as any, {
        _org_id: activeId, _user_id: uid, _role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_members', activeId] });
      toast({ title: 'রোল আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">লোড হচ্ছে...</div>;
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <Card className="bg-slate-900/80 border-white/10 max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-slate-500" />
            <h2 className="text-xl font-bold">কোনো অর্গানাইজেশন পাওয়া যায়নি</h2>
            <p className="text-sm text-slate-400">
              আপনি কোনো কোম্পানির মালিক বা অ্যাডমিন নন। সাহায্যের জন্য Nexiot Labs টিমের সাথে যোগাযোগ করুন।
            </p>
            <Button asChild variant="outline"><Link to="/">ড্যাশবোর্ডে ফিরুন</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              আমার কোম্পানি
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              আপনার অর্গানাইজেশনের ফার্ম ও সদস্য পরিচালনা
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/10">
            <Link to="/">← ড্যাশবোর্ড</Link>
          </Button>
        </div>

        {/* Org tabs (if multiple) */}
        {orgs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {orgs.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  activeId === o.id
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            {/* License status banner */}
            <Card className={`border ${selected.license_valid ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/40'}`}>
              <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  {selected.my_role === 'org_owner'
                    ? <Crown className="w-5 h-5 text-amber-400" />
                    : <Shield className="w-5 h-5 text-emerald-400" />}
                  <div>
                    <div className="font-semibold">{selected.name}</div>
                    <div className="text-xs text-slate-400">{selected.name_en} · /{selected.slug} · {roleLabel[selected.my_role]}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={selected.license_valid ? 'border-emerald-400/40 text-emerald-300' : 'border-rose-400/40 text-rose-300'}>
                    {licenseLabel[selected.license_type]}
                  </Badge>
                  {selected.license_expires_at && (
                    <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(selected.license_expires_at).toLocaleDateString('bn-BD')}
                    </Badge>
                  )}
                  {!selected.license_valid && (
                    <span className="text-xs text-rose-300">⚠ লাইসেন্স অবৈধ — অ্যাকসেস বন্ধ</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="bg-slate-900/80 border-white/10">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-400 flex items-center gap-1"><Tractor className="w-3.5 h-3.5" />ফার্ম</div>
                  <div className="text-2xl font-bold mt-1">{selected.farm_count} <span className="text-sm text-slate-500">/ {selected.max_farms}</span></div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/80 border-white/10">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />সদস্য</div>
                  <div className="text-2xl font-bold mt-1">{selected.member_count} <span className="text-sm text-slate-500">/ {selected.max_users}</span></div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/80 border-white/10">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-400">আপনার রোল</div>
                  <div className="text-lg font-bold mt-1">{roleLabel[selected.my_role]}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Farms */}
              <Card className="bg-slate-900/80 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tractor className="w-4 h-4 text-emerald-400" /> ফার্মসমূহ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[360px] pr-2">
                    {farms.length === 0 ? (
                      <p className="text-sm text-slate-400">কোনো ফার্ম নেই।</p>
                    ) : (
                      <div className="space-y-2">
                        {farms.map(f => (
                          <div key={f.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                            <div className="font-medium">{f.name}</div>
                            <div className="text-[11px] text-slate-400">{f.name_en} · {new Date(f.created_at).toLocaleDateString('bn-BD')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Members */}
              <Card className="bg-slate-900/80 border-white/10">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" /> সদস্য
                  </CardTitle>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                        <UserPlus className="w-4 h-4 mr-1" /> যোগ
                      </Button>
                    </DialogTrigger>
                    {activeId && (
                      <AddMemberDialog
                        orgId={activeId}
                        onAdded={() => {
                          setAddOpen(false);
                          qc.invalidateQueries({ queryKey: ['org_members', activeId] });
                          qc.invalidateQueries({ queryKey: ['my_organizations'] });
                        }}
                      />
                    )}
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[360px] pr-2">
                    <div className="space-y-2">
                      {members.map(m => (
                        <div key={m.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm flex items-center gap-2">
                              {m.role === 'org_owner' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {m.profile?.user_name || m.profile?.phone || m.user_id.slice(0, 8)}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {m.profile?.phone || ''} {m.profile?.email ? `· ${m.profile.email}` : ''}
                            </div>
                          </div>
                          {m.role === 'org_owner' ? (
                            <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px]">
                              {roleLabel.org_owner}
                            </Badge>
                          ) : (
                            <>
                              <Select
                                value={m.role}
                                onValueChange={(v: OrgRole) => setRole.mutate({ uid: m.user_id, role: v })}
                              >
                                <SelectTrigger className="h-8 w-[110px] bg-slate-900 border-white/10 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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
                                    removeMember.mutate(m.user_id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddMemberDialog({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<OrgRole>('member');

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('org_admin_create_invitation' as any, {
        _org_id: orgId, _identifier: identifier.trim(), _role: role, _expires_days: 14,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'আমন্ত্রণ পাঠানো হয়েছে', description: 'ব্যবহারকারী লগইন করলে গ্রহণ/প্রত্যাখ্যান করতে পারবেন।' });
      onAdded();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>সদস্য আমন্ত্রণ পাঠান</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>ফোন বা ইমেইল</Label>
          <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="01700000000 বা user@example.com" />
          <p className="text-[11px] text-slate-500 mt-1">আমন্ত্রণ ১৪ দিনের জন্য বৈধ থাকবে।</p>
        </div>
        <div>
          <Label>রোল</Label>
          <Select value={role} onValueChange={(v: OrgRole) => setRole(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="org_admin">{roleLabel.org_admin}</SelectItem>
              <SelectItem value="member">{roleLabel.member}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-500 mt-1">মালিক (Owner) শুধু সুপার অ্যাডমিন সেট করতে পারেন।</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => add.mutate()}
          disabled={!identifier || add.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {add.isPending ? 'পাঠানো হচ্ছে...' : 'আমন্ত্রণ পাঠান'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
