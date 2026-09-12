import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Search, Trash2, MapPin, User, Undo2, Archive, Flame } from 'lucide-react';

interface FarmRow {
  id: string;
  name: string;
  name_en: string;
  location: string | null;
  owner_id: string;
  organization_id: string | null;
  is_active: boolean | null;
  created_at: string;
  deleted_at?: string | null;
}
interface OrgRow { id: string; name: string; name_en: string; slug: string | null; }
interface ProfileRow { id: string; user_name: string | null; phone: string | null; email: string | null; }

type DeleteAction = { farm: FarmRow; mode: 'soft' | 'permanent' };

export function FarmsAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [confirmDelete, setConfirmDelete] = useState<DeleteAction | null>(null);

  // Active farms (deleted_at IS NULL)
  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['admin_all_farms', orgFilter],
    queryFn: async (): Promise<FarmRow[]> => {
      let q = supabase
        .from('farms')
        .select('id, name, name_en, location, owner_id, organization_id, is_active, created_at, deleted_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (orgFilter === 'none') {
        q = q.is('organization_id', null);
      } else if (orgFilter !== 'all') {
        q = q.eq('organization_id', orgFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FarmRow[];
    },
  });

  // Soft-deleted farms (always loaded so the badge count stays live)
  const { data: deletedFarms = [] } = useQuery({
    queryKey: ['admin_deleted_farms'],
    queryFn: async (): Promise<FarmRow[]> => {
      const { data, error } = await supabase.rpc('super_admin_list_deleted_farms' as any);
      if (error) throw error;
      return (data || []) as FarmRow[];
    },
  });

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['admin_orgs_for_farms'],
    queryFn: async (): Promise<OrgRow[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, name_en, slug')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as OrgRow[];
    },
  });
  const orgs = useMemo(
    () => allOrgs.filter(o => !(o.slug || '').startsWith('personal-')),
    [allOrgs]
  );

  const allOwnerIds = useMemo(
    () => Array.from(new Set([...farms, ...deletedFarms].map(f => f.owner_id))),
    [farms, deletedFarms]
  );
  const { data: owners = [] } = useQuery({
    queryKey: ['admin_farm_owners', allOwnerIds.join(',')],
    enabled: allOwnerIds.length > 0,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .in('id', allOwnerIds);
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });
  const ownerMap = useMemo(() => new Map(owners.map(o => [o.id, o])), [owners]);
  const orgMap = useMemo(() => new Map(allOrgs.map(o => [o.id, o])), [allOrgs]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['admin_all_farms'], refetchType: 'all' }),
      qc.invalidateQueries({ queryKey: ['admin_deleted_farms'], refetchType: 'all' }),
      qc.invalidateQueries({ queryKey: ['admin_farm_owners'], refetchType: 'all' }),
      qc.invalidateQueries({ queryKey: ['user-farms'], refetchType: 'all' }),
      qc.invalidateQueries({ queryKey: ['farms'], refetchType: 'all' }),
    ]);
  };

  const setOrg = useMutation({
    mutationFn: async ({ farmId, orgId }: { farmId: string; orgId: string | null }) => {
      const { error } = await supabase.rpc('super_admin_set_farm_organization' as any, {
        _farm_id: farmId, _org_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: 'অর্গানাইজেশন আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const softDelete = useMutation({
    mutationFn: async (farmId: string) => {
      const { error } = await supabase.rpc('super_admin_soft_delete_farm' as any, { _farm_id: farmId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: 'ফার্ম সরানো হয়েছে', description: 'প্রয়োজনে "মুছে ফেলা" ট্যাব থেকে ফেরানো যাবে।' });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const restore = useMutation({
    mutationFn: async (farmId: string) => {
      const { error } = await supabase.rpc('super_admin_restore_farm' as any, { _farm_id: farmId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: 'ফার্ম ফিরিয়ে আনা হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const permanentDelete = useMutation({
    mutationFn: async (farmId: string) => {
      const { error } = await supabase.rpc('super_admin_delete_farm' as any, { _farm_id: farmId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: 'ফার্ম স্থায়ীভাবে মুছে ফেলা হয়েছে' });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const matchesSearch = (f: FarmRow) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const owner = ownerMap.get(f.owner_id);
    return (
      f.name.toLowerCase().includes(q) ||
      (f.name_en || '').toLowerCase().includes(q) ||
      (f.location || '').toLowerCase().includes(q) ||
      (owner?.user_name || '').toLowerCase().includes(q) ||
      (owner?.phone || '').includes(q)
    );
  };
  const filteredActive = farms.filter(matchesSearch);
  const filteredDeleted = deletedFarms.filter(matchesSearch);

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            ফার্ম ব্যবস্থাপনা
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            {tab === 'active' && (
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-full sm:w-56 bg-slate-800 border-white/10 text-white text-sm">
                  <SelectValue placeholder="অর্গানাইজেশন ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব অর্গানাইজেশন</SelectItem>
                  <SelectItem value="none">— কোনো org নেই —</SelectItem>
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ফার্ম/মালিক/ফোন খুঁজুন..."
                className="pl-9 bg-slate-800 border-white/10 text-white w-full sm:w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="bg-slate-800/70 border border-white/10 grid grid-cols-2 mb-3">
            <TabsTrigger value="active" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-1" /> সক্রিয় ফার্ম
              <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{farms.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
              <Archive className="w-4 h-4 mr-1" /> মুছে ফেলা
              <Badge className="ml-2 bg-rose-500/20 text-rose-300 border-rose-400/40">{deletedFarms.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ScrollArea className="h-[520px] pr-2">
              {isLoading && <p className="text-slate-400 text-sm py-6">লোড হচ্ছে...</p>}
              {!isLoading && filteredActive.length === 0 && (
                <p className="text-slate-400 text-sm py-6 text-center">কোনো ফার্ম পাওয়া যায়নি</p>
              )}
              <div className="space-y-2">
                {filteredActive.map(f => {
                  const owner = ownerMap.get(f.owner_id);
                  const org = f.organization_id ? orgMap.get(f.organization_id) : null;
                  return (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{f.name}</div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{owner?.user_name || owner?.phone || f.owner_id.slice(0, 8)}</span>
                          {f.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
                          {org && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px] py-0 px-1.5">{org.name}</Badge>}
                          {!f.organization_id && <Badge variant="outline" className="border-amber-400/40 text-amber-300 text-[10px] py-0 px-1.5">org বরাদ্দ নেই</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={f.organization_id || 'none'}
                          onValueChange={v => setOrg.mutate({ farmId: f.id, orgId: v === 'none' ? null : v })}
                        >
                          <SelectTrigger className="h-8 w-[180px] bg-slate-900 border-white/10 text-white text-xs">
                            <SelectValue placeholder="অর্গানাইজেশন বেছে নিন" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— কোনোটাই না —</SelectItem>
                            {orgs.map(o => (
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="ফার্ম সরান (পরে ফেরানো যাবে)"
                          className="h-8 w-8 text-amber-400 hover:bg-amber-500/10"
                          onClick={() => setConfirmDelete({ farm: f, mode: 'soft' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="একবারে স্থায়ীভাবে মুছুন (ফেরানো যাবে না)"
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/15"
                          onClick={() => setConfirmDelete({ farm: f, mode: 'permanent' })}
                        >
                          <Flame className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="deleted">
            <ScrollArea className="h-[520px] pr-2">
              {filteredDeleted.length === 0 && (
                <p className="text-slate-400 text-sm py-6 text-center">কোনো মুছে ফেলা ফার্ম নেই</p>
              )}
              <div className="space-y-2">
                {filteredDeleted.map(f => {
                  const owner = ownerMap.get(f.owner_id);
                  const org = f.organization_id ? orgMap.get(f.organization_id) : null;
                  return (
                    <div key={f.id} className="p-3 rounded-lg bg-rose-500/5 border border-rose-400/20 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate flex items-center gap-2">
                          {f.name}
                          <Badge variant="outline" className="border-rose-400/40 text-rose-300 text-[10px] py-0 px-1.5">
                            মুছে ফেলা হয়েছে
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{owner?.user_name || owner?.phone || f.owner_id.slice(0, 8)}</span>
                          {f.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>}
                          {org && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-[10px] py-0 px-1.5">{org.name}</Badge>}
                          {f.deleted_at && (
                            <span className="text-rose-300/80">
                              {new Date(f.deleted_at).toLocaleString('bn-BD')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-700"
                          disabled={restore.isPending}
                          onClick={() => restore.mutate(f.id)}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> ফেরান
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="স্থায়ীভাবে মুছে ফেলুন (ফেরানো যাবে না)"
                          className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                          onClick={() => setConfirmDelete({ farm: f, mode: 'permanent' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.mode === 'permanent' ? 'স্থায়ীভাবে মুছে ফেলবেন?' : 'ফার্ম সরাবেন?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmDelete?.mode === 'permanent' ? (
                <>"{confirmDelete?.farm.name}" — এর সাথে যুক্ত সব ডেটা <b className="text-rose-300">স্থায়ীভাবে</b> মুছে যাবে। এটি আর ফেরানো যাবে না।</>
              ) : (
                <>"{confirmDelete?.farm.name}" — কে "মুছে ফেলা" তালিকায় সরানো হবে। প্রয়োজনে পরে ফিরিয়ে আনতে পারবেন।</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDelete) return;
                if (confirmDelete.mode === 'permanent') {
                  permanentDelete.mutate(confirmDelete.farm.id);
                } else {
                  softDelete.mutate(confirmDelete.farm.id);
                }
              }}
              className={confirmDelete?.mode === 'permanent' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}
              disabled={softDelete.isPending || permanentDelete.isPending}
            >
              {(softDelete.isPending || permanentDelete.isPending)
                ? 'প্রক্রিয়াকরণ...'
                : (confirmDelete?.mode === 'permanent' ? 'স্থায়ীভাবে মুছুন' : 'সরান')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
