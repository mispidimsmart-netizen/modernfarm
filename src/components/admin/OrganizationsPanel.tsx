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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Plus, UserPlus, Trash2, Search, Crown, Shield, KeyRound, Warehouse, Pencil, AlertTriangle } from 'lucide-react';
import {
  Org, MemberRow, OrgRole, LicenseType,
  roleLabel, licenseLabel, isPersonalOrgSlug,
} from './organizations/types';
import { EditOrgDialog, CreateOrgDialog, AddMemberDialog } from './organizations/OrgCreateEditDialogs';
import { LicenseDialog, EditMemberRoleDialog } from './organizations/OrgLicenseMemberDialogs';
import { AddFarmToOrgDialog } from './organizations/AddFarmToOrgDialog';


export function OrganizationsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<Org | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<MemberRow | null>(null);
  const [editMemberTarget, setEditMemberTarget] = useState<MemberRow | null>(null);
  const [addFarmOpen, setAddFarmOpen] = useState(false);
  const [confirmRemoveFarm, setConfirmRemoveFarm] = useState<{ id: string; name: string } | null>(null);

  const orgsKey = ['admin_organizations'] as const;

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: orgsKey,
    queryFn: async (): Promise<Org[]> => {
      // Server-side: exclude auto-created personal orgs via case-insensitive LIKE.
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .not('slug', 'ilike', 'personal-%')
        .not('slug', 'ilike', '/personal-%')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Client-side belt-and-suspenders: any slug that *contains* "personal-" is excluded.
      return ((data || []) as Org[]).filter(o => !isPersonalOrgSlug(o.slug));
    },
  });

  const deleteOrg = useMutation({
    mutationFn: async (org_id: string) => {
      const { error } = await supabase.rpc('super_admin_delete_organization' as any, { _org_id: org_id });
      if (error) throw error;
      return org_id;
    },
    onMutate: async (org_id) => {
      await qc.cancelQueries({ queryKey: orgsKey });
      const previous = qc.getQueryData<Org[]>(orgsKey);
      if (previous) {
        qc.setQueryData<Org[]>(orgsKey, previous.filter(o => o.id !== org_id));
      }
      return { previous };
    },
    onError: (e: any, _org_id, ctx) => {
      if (ctx?.previous) qc.setQueryData(orgsKey, ctx.previous);
      toast({ title: 'মুছে ফেলা যায়নি', description: e.message, variant: 'destructive' });
    },
    onSuccess: (org_id) => {
      toast({ title: 'অর্গানাইজেশন মুছে ফেলা হয়েছে' });
      if (selectedOrgId === org_id) setSelectedOrgId(null);
      setDeleteOrgTarget(null);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: orgsKey, refetchType: 'active' });
      qc.invalidateQueries({ queryKey: ['platform_role'] });
    },
  });

  // Counts for the delete-org confirmation dialog
  const { data: deleteOrgCounts } = useQuery({
    queryKey: ['admin_org_delete_counts', deleteOrgTarget?.id],
    enabled: !!deleteOrgTarget,
    queryFn: async () => {
      const [farms, members] = await Promise.all([
        supabase.from('farms').select('id', { count: 'exact', head: true }).eq('organization_id', deleteOrgTarget!.id),
        supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', deleteOrgTarget!.id),
      ]);
      return { farms: farms.count ?? 0, members: members.count ?? 0 };
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

  const { data: farmOwners = [] } = useQuery({
    queryKey: ['admin_org_farm_owners', selectedOrgId, orgFarms.map(f => f.owner_id).join(',')],
    enabled: orgFarms.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(orgFarms.map(f => f.owner_id)));
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone')
        .in('id', ids);
      if (error) throw error;
      return (data || []) as Array<{ id: string; user_name: string | null; phone: string | null }>;
    },
  });
  const ownerMap = new Map(farmOwners.map(o => [o.id, o]));


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
    mutationFn: async ({ user_id, role }: { user_id: string; role: OrgRole }): Promise<MemberRow> => {
      const { data, error } = await supabase.rpc('super_admin_set_org_member_role' as any, {
        _org_id: selectedOrgId, _user_id: user_id, _role: role,
      });
      if (error) throw error;
      if (!data) throw new Error('সার্ভার থেকে আপডেটেড সদস্য ডেটা পাওয়া যায়নি');
      return data as MemberRow;
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
    onSuccess: (updated) => {
      // Use the canonical row returned by the server to update the cache —
      // no extra fetch needed.
      qc.setQueryData<MemberRow[]>(membersKey, (prev) =>
        (prev || []).map(m => (m.user_id === updated.user_id ? { ...m, ...updated } : m)),
      );
      // Refresh role history for this member so the new entry shows immediately.
      qc.invalidateQueries({ queryKey: ['member_role_history', updated.id] });
      toast({ title: 'রোল আপডেট হয়েছে' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['admin_organizations'] });
    },
  });

  const orgFarmsKey = ['admin_org_farms', selectedOrgId] as const;

  const reassignFarm = useMutation({
    mutationFn: async ({ farmId, newOrgId }: { farmId: string; newOrgId: string | null }) => {
      const { error } = await supabase.rpc('super_admin_set_farm_organization' as any, {
        _farm_id: farmId, _org_id: newOrgId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: orgFarmsKey, refetchType: 'all' }),
        qc.invalidateQueries({ queryKey: ['admin_all_farms'], refetchType: 'all' }),
        qc.invalidateQueries({ queryKey: ['admin_available_farms'], refetchType: 'all' }),
      ]);
      toast({ title: 'ফার্মের অর্গানাইজেশন আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const removeFarmFromOrg = useMutation({
    mutationFn: async (farmId: string) => {
      const { error } = await supabase.rpc('super_admin_set_farm_organization' as any, {
        _farm_id: farmId, _org_id: null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: orgFarmsKey, refetchType: 'all' }),
        qc.invalidateQueries({ queryKey: ['admin_all_farms'], refetchType: 'all' }),
      ]);
      toast({ title: 'ফার্ম এই অর্গ থেকে সরানো হয়েছে' });
      setConfirmRemoveFarm(null);
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Orgs list — always visible */}
      {(
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
                <div
                  key={o.id}
                  onClick={() => setSelectedOrgId(o.id)}
                  className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                    selectedOrgId === o.id
                      ? 'bg-emerald-500/10 border-emerald-400/50'
                      : 'bg-slate-800/50 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white truncate">{o.name}</div>
                      <div className="text-xs text-slate-400 truncate">{o.name_en} · /{o.slug}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px]">
                        {licenseLabel[o.license_type]}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-300 hover:bg-slate-700/40"
                        onClick={(e) => { e.stopPropagation(); setEditOrg(o); }}
                        title="এডিট"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-400 hover:bg-rose-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteOrgTarget(o);
                        }}
                        title="ডিলিট"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>সর্বোচ্চ ফার্ম: {o.max_farms} · ইউজার: {o.max_users}</span>
                    {o.license_expires_at && (
                      <span className="text-amber-300/80">
                        মেয়াদ: {new Date(o.license_expires_at).toLocaleDateString('bn-BD')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      )}

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
                    <Badge
                      variant="outline"
                      className={
                        m.role === 'org_owner'
                          ? 'border-amber-400/40 text-amber-300'
                          : m.role === 'org_admin'
                            ? 'border-emerald-400/40 text-emerald-300'
                            : 'border-slate-400/30 text-slate-300'
                      }
                    >
                      {roleLabel[m.role]}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-300 hover:bg-slate-700/40"
                      onClick={() => setEditMemberTarget(m)}
                      title="রোল এডিট করুন"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => setRemoveMemberTarget(m)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Farms under this organization */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-cyan-400" />
                    <span className="text-white text-sm font-medium">আওতাভুক্ত ফার্ম</span>
                    <Badge variant="outline" className="border-cyan-400/40 text-cyan-300 text-[10px]">
                      {orgFarms.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setAddFarmOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> ফার্ম যোগ
                  </Button>
                </div>
                {farmsLoading ? (
                  <p className="text-slate-400 text-xs">লোড হচ্ছে...</p>
                ) : orgFarms.length === 0 ? (
                  <p className="text-slate-400 text-xs">এই অর্গানাইজেশনের অধীনে কোনো ফার্ম নেই — "ফার্ম যোগ" চাপুন।</p>
                ) : (
                  <div className="space-y-2">
                    {orgFarms.map(f => {
                      const owner = ownerMap.get(f.owner_id);
                      return (
                        <div key={f.id} className="p-2.5 rounded-md bg-slate-800/40 border border-white/5 flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-white text-sm truncate">{f.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">
                              মালিক: {owner?.user_name || owner?.phone || f.owner_id.slice(0, 8)}
                            </div>
                          </div>
                          <Select
                            value={selectedOrgId!}
                            onValueChange={(v) => {
                              if (v === selectedOrgId) return;
                              reassignFarm.mutate({ farmId: f.id, newOrgId: v });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[150px] bg-slate-900 border-white/10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {orgs.map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                            title="এই অর্গ থেকে সরান"
                            onClick={() => setConfirmRemoveFarm({ id: f.id, name: f.name })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit org dialog */}
      <Dialog open={!!editOrg} onOpenChange={(o) => !o && setEditOrg(null)}>
        {editOrg && (
          <EditOrgDialog
            org={editOrg}
            onSaved={() => {
              setEditOrg(null);
              qc.invalidateQueries({ queryKey: ['admin_organizations'] });
            }}
          />
        )}
      </Dialog>

      {/* Delete organization confirmation */}
      <AlertDialog
        open={!!deleteOrgTarget}
        onOpenChange={(o) => !o && !deleteOrg.isPending && setDeleteOrgTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-rose-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              অর্গানাইজেশন মুছে ফেলতে চান?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 space-y-2">
              <span className="block">
                আপনি <strong className="text-white">"{deleteOrgTarget?.name}"</strong> মুছে ফেলতে যাচ্ছেন।
              </span>
              {deleteOrgCounts && (
                <span className="block rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200 text-xs">
                  এই অর্গানাইজেশনে <strong>{deleteOrgCounts.members}</strong> জন সদস্য এবং <strong>{deleteOrgCounts.farms}</strong>টি ফার্ম রয়েছে।
                  {deleteOrgCounts.farms > 0 && (
                    <> ফার্ম থাকা অবস্থায় মুছে ফেলা যাবে না — আগে ফার্মগুলো অন্যত্র সরান।</>
                  )}
                </span>
              )}
              <span className="block text-rose-300 text-xs">এই কাজ আর ফেরানো যাবে না।</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrg.isPending}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteOrg.isPending || (deleteOrgCounts?.farms ?? 0) > 0}
              onClick={(e) => {
                e.preventDefault();
                if (deleteOrgTarget) deleteOrg.mutate(deleteOrgTarget.id);
              }}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            >
              {deleteOrg.isPending ? 'মুছছে...' : 'মুছে ফেলুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit member role */}
      <Dialog
        open={!!editMemberTarget}
        onOpenChange={(o) => !o && !setRole.isPending && setEditMemberTarget(null)}
      >
        {editMemberTarget && (
          <EditMemberRoleDialog
            member={editMemberTarget}
            isPending={setRole.isPending}
            onSave={(role) => {
              setRole.mutate(
                { user_id: editMemberTarget.user_id, role },
                { onSuccess: () => setEditMemberTarget(null) },
              );
            }}
            onClose={() => setEditMemberTarget(null)}
          />
        )}
      </Dialog>

      {/* Remove member confirmation */}
      <AlertDialog
        open={!!removeMemberTarget}
        onOpenChange={(o) => !o && !removeMember.isPending && setRemoveMemberTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-rose-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              সদস্য সরাতে চান?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 space-y-2">
              <span className="block">
                <strong className="text-white">
                  {removeMemberTarget?.profile?.user_name || removeMemberTarget?.profile?.phone || removeMemberTarget?.user_id.slice(0, 8)}
                </strong>{' '}
                কে এই অর্গানাইজেশন থেকে সরিয়ে দেওয়া হবে।
              </span>
              {removeMemberTarget?.role === 'org_owner' && (
                <span className="block rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200 text-xs">
                  সতর্কতা: এই ব্যবহারকারী মালিক — সরালে অর্গানাইজেশন মালিকবিহীন হয়ে যেতে পারে।
                </span>
              )}
              <span className="block text-slate-400 text-xs">তাদের ফার্ম অ্যাসাইনমেন্টও বাতিল হতে পারে।</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMember.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (removeMemberTarget) {
                  removeMember.mutate(
                    { user_id: removeMemberTarget.user_id },
                    { onSettled: () => setRemoveMemberTarget(null) },
                  );
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
            >
              {removeMember.isPending ? 'সরানো হচ্ছে...' : 'সরিয়ে দিন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add existing farm to this org */}
      {selectedOrgId && (
        <Dialog open={addFarmOpen} onOpenChange={setAddFarmOpen}>
          <AddFarmToOrgDialog
            orgId={selectedOrgId}
            currentOrgName={selectedOrg?.name || ''}
            onAssigned={(farmId) => {
              reassignFarm.mutate(
                { farmId, newOrgId: selectedOrgId },
                { onSuccess: () => setAddFarmOpen(false) },
              );
            }}
            isPending={reassignFarm.isPending}
          />
        </Dialog>
      )}

      {/* Remove farm from org confirmation */}
      <AlertDialog
        open={!!confirmRemoveFarm}
        onOpenChange={(o) => !o && !removeFarmFromOrg.isPending && setConfirmRemoveFarm(null)}
      >
        <AlertDialogContent className="bg-slate-900 border-amber-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              ফার্ম এই অর্গ থেকে সরাবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              <strong className="text-white">"{confirmRemoveFarm?.name}"</strong> এই অর্গানাইজেশন থেকে সরিয়ে unassigned করা হবে। ফার্ম মুছবে না — পরে অন্য অর্গে যোগ করা যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeFarmFromOrg.isPending}>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeFarmFromOrg.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmRemoveFarm) removeFarmFromOrg.mutate(confirmRemoveFarm.id);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {removeFarmFromOrg.isPending ? 'সরানো হচ্ছে...' : 'সরিয়ে দিন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
