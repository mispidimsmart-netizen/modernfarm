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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Search, Trash2, MapPin, User } from 'lucide-react';

interface FarmRow {
  id: string;
  name: string;
  name_en: string;
  location: string | null;
  owner_id: string;
  organization_id: string | null;
  is_active: boolean | null;
  created_at: string;
}
interface OrgRow { id: string; name: string; name_en: string; slug: string | null; }
interface ProfileRow { id: string; user_name: string | null; phone: string | null; email: string | null; }

export function FarmsAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [confirmDelete, setConfirmDelete] = useState<FarmRow | null>(null);

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ['admin_all_farms'],
    queryFn: async (): Promise<FarmRow[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, name_en, location, owner_id, organization_id, is_active, created_at')
        .order('created_at', { ascending: false });
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
  // Exclude auto-created personal orgs from filter & assignment dropdowns
  const orgs = useMemo(
    () => allOrgs.filter(o => !(o.slug || '').startsWith('personal-')),
    [allOrgs]
  );

  const ownerIds = useMemo(() => Array.from(new Set(farms.map(f => f.owner_id))), [farms]);
  const { data: owners = [] } = useQuery({
    queryKey: ['admin_farm_owners', ownerIds.join(',')],
    enabled: ownerIds.length > 0,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_name, phone, email')
        .in('id', ownerIds);
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });
  const ownerMap = useMemo(() => new Map(owners.map(o => [o.id, o])), [owners]);
  const orgMap = useMemo(() => new Map(orgs.map(o => [o.id, o])), [orgs]);

  const setOrg = useMutation({
    mutationFn: async ({ farmId, orgId }: { farmId: string; orgId: string | null }) => {
      const { error } = await supabase.rpc('super_admin_set_farm_organization' as any, {
        _farm_id: farmId, _org_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_all_farms'] });
      toast({ title: 'অর্গানাইজেশন আপডেট হয়েছে' });
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const delFarm = useMutation({
    mutationFn: async (farmId: string) => {
      const { error } = await supabase.rpc('super_admin_delete_farm' as any, { _farm_id: farmId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_all_farms'] });
      toast({ title: 'ফার্ম মুছে ফেলা হয়েছে' });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  const filtered = farms.filter(f => {
    if (orgFilter === 'none' && f.organization_id) return false;
    if (orgFilter !== 'all' && orgFilter !== 'none' && f.organization_id !== orgFilter) return false;
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
  });

  return (
    <Card className="bg-slate-900/80 border-white/10">
      <CardHeader className="pb-3 border-b border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            সব ফার্ম
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">{farms.length}</Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
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
        <ScrollArea className="h-[560px] pr-2">
          {isLoading && <p className="text-slate-400 text-sm py-6">লোড হচ্ছে...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center">কোনো ফার্ম পাওয়া যায়নি</p>
          )}
          <div className="space-y-2">
            {filtered.map(f => {
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
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => setConfirmDelete(f)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>ফার্ম মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              "{confirmDelete?.name}" — এর সাথে যুক্ত সব ডেটা স্থায়ীভাবে মুছে যাবে। এটি ফেরানো যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-white/10 text-white">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && delFarm.mutate(confirmDelete.id)}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={delFarm.isPending}
            >
              {delFarm.isPending ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
