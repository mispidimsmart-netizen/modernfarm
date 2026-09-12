import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { FarmRow, MemberRow, MyOrg, OrgRole } from '@/lib/orgAdmin';

export interface OrgInvitation {
  id: string;
  invited_email: string | null;
  invited_phone: string | null;
  role: OrgRole;
  status: string;
  expires_at: string;
  created_at: string;
}

/** Queries + mutations for the org admin page, scoped to one organization. */
export function useOrgAdmin(activeId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const orgsQuery = useQuery({
    queryKey: ['my_organizations'],
    queryFn: async (): Promise<MyOrg[]> => {
      const { data, error } = await supabase.rpc('get_my_organizations' as any);
      if (error) throw error;
      return (data || []) as MyOrg[];
    },
  });

  const membersQuery = useQuery({
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

  const farmsQuery = useQuery({
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

  const invitationsQuery = useQuery({
    queryKey: ['org_invitations', activeId],
    enabled: !!activeId,
    queryFn: async (): Promise<OrgInvitation[]> => {
      const { data, error } = await supabase.rpc('org_admin_list_invitations' as any, { _org_id: activeId });
      if (error) throw error;
      return (data || []) as OrgInvitation[];
    },
  });

  const fail = (e: any) =>
    toast({ title: 'ত্রুটি', description: e.message, variant: 'destructive' });

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
    onError: fail,
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
    onError: fail,
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('org_admin_cancel_invitation' as any, { _invitation_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_invitations', activeId] });
      toast({ title: 'আমন্ত্রণ বাতিল হয়েছে' });
    },
    onError: fail,
  });

  const invalidateAfterMemberAdd = () => {
    qc.invalidateQueries({ queryKey: ['org_members', activeId] });
    qc.invalidateQueries({ queryKey: ['org_invitations', activeId] });
    qc.invalidateQueries({ queryKey: ['my_organizations'] });
  };

  return {
    orgs: orgsQuery.data || [],
    isLoading: orgsQuery.isLoading,
    members: membersQuery.data || [],
    farms: farmsQuery.data || [],
    invitations: invitationsQuery.data || [],
    removeMember,
    setRole,
    cancelInvite,
    invalidateAfterMemberAdd,
  };
}
