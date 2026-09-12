import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Org, MemberRow, OrgRole, isPersonalOrgSlug } from '@/components/admin/organizations/types';

export interface OrgFarmRow {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface Params {
  selectedOrgId: string | null;
  deleteOrgTargetId?: string | null;
  onOrgDeleted?: (orgId: string) => void;
  onFarmRemoved?: () => void;
}

export function useOrganizationsAdmin({ selectedOrgId, deleteOrgTargetId, onOrgDeleted, onFarmRemoved }: Params) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const orgsKey = ['admin_organizations'] as const;
  const membersKey = ['admin_org_members', selectedOrgId] as const;
  const orgFarmsKey = ['admin_org_farms', selectedOrgId] as const;

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: orgsKey,
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .not('slug', 'ilike', 'personal-%')
        .not('slug', 'ilike', '/personal-%')
        .order('created_at', { ascending: false });
      if (error) throw error;
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
      if (previous) qc.setQueryData<Org[]>(orgsKey, previous.filter(o => o.id !== org_id));
      return { previous };
    },
    onError: (e: any, _org_id, ctx) => {
      if (ctx?.previous) qc.setQueryData(orgsKey, ctx.previous);
      toast({ title: 'মুছে ফেলা যায়নি', description: e.message, variant: 'destructive' });
    },
    onSuccess: (org_id) => {
      toast({ title: 'অর্গানাইজেশন মুছে ফেলা হয়েছে' });
      onOrgDeleted?.(org_id);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: orgsKey, refetchType: 'active' });
      qc.invalidateQueries({ queryKey: ['platform_role'] });
    },
  });

  const { data: deleteOrgCounts } = useQuery({
    queryKey: ['admin_org_delete_counts', deleteOrgTargetId],
    enabled: !!deleteOrgTargetId,
    queryFn: async () => {
      const [farms, members] = await Promise.all([
        supabase.from('farms').select('id', { count: 'exact', head: true }).eq('organization_id', deleteOrgTargetId!),
        supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', deleteOrgTargetId!),
      ]);
      return { farms: farms.count ?? 0, members: members.count ?? 0 };
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: membersKey,
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
    queryKey: orgFarmsKey,
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, owner_id, created_at')
        .eq('organization_id', selectedOrgId!)
        .order('name');
      if (error) throw error;
      return (data || []) as OrgFarmRow[];
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
      if (previous) qc.setQueryData<MemberRow[]>(membersKey, previous.filter(m => m.user_id !== user_id));
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
        qc.setQueryData<MemberRow[]>(membersKey, previous.map(m => (m.user_id === user_id ? { ...m, role } : m)));
      }
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(membersKey, ctx.previous);
      toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' });
    },
    onSuccess: (updated) => {
      qc.setQueryData<MemberRow[]>(membersKey, (prev) =>
        (prev || []).map(m => (m.user_id === updated.user_id ? { ...m, ...updated } : m)),
      );
      qc.invalidateQueries({ queryKey: ['member_role_history', updated.id] });
      toast({ title: 'রোল আপডেট হয়েছে' });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['platform_role'] });
      qc.invalidateQueries({ queryKey: ['admin_organizations'] });
    },
  });

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
      onFarmRemoved?.();
    },
    onError: (e: any) => toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' }),
  });

  return {
    qc,
    orgs, isLoading,
    members, orgFarms, farmsLoading, ownerMap,
    deleteOrg, deleteOrgCounts,
    removeMember, setRole, reassignFarm, removeFarmFromOrg,
  };
}
