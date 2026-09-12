import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { translatePgError } from '@/lib/translatePgError';
import type { DraftFarm, DraftOrg, FarmOpt, OrgOpt, ProfileRow, RoleSummary } from './roleEditorTypes';

/** Query keys invalidated after a role change (access-dependent caches). */
const ACCESS_KEYS = (userId: string) => [
  ['user_role_summary', userId],
  ['admin_all_farms'],
  ['admin_deleted_farms'],
  ['admin_organizations'],
  ['admin_orgs_for_farms'],
  ['admin_orgs_for_unified'],
  ['admin_farms_for_unified'],
  ['admin_all_profiles_for_roles'],
  ['v_user_canonical_roles'],
  ['user-farms', userId],
  ['user-farms'],
  ['farm-members'],
  ['perm_farm_checks', userId],
  ['perm_farm_checks'],
  ['device_tokens', userId],
  ['device_tokens'],
  ['device_health', userId],
  ['device_health'],
  ['device_status'],
  ['device_commands'],
  ['device-command-log'],
  ['device-command-log-devices'],
  ['dashboard-snapshot'],
];

export function useUserRoleDraft(user: ProfileRow, onClose: () => void) {
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

  const [draftSuper, setDraftSuper] = useState(false);
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
      await Promise.all(
        ACCESS_KEYS(user.id).map(k => qc.invalidateQueries({ queryKey: k as any, refetchType: 'all' }))
      );
      // Broadcast so the affected user's other sessions refresh access too.
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
    onError: (e: any) =>
      toast({ title: 'সেভ ব্যর্থ', description: translatePgError(e), variant: 'destructive' }),
  });

  const availableOrgs = useMemo(() => {
    const taken = new Set(draftOrgs.map(o => o.organization_id));
    return realOrgs.filter(o => !taken.has(o.id));
  }, [realOrgs, draftOrgs]);

  const availableFarms = useMemo(() => {
    const taken = new Set(draftFarms.map(f => f.farm_id));
    return allFarms.filter(f => !taken.has(f.id));
  }, [allFarms, draftFarms]);

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

  return {
    summary, isLoading, realOrgs, allFarms,
    draftSuper, setDraftSuper,
    draftOrgs, setDraftOrgs,
    draftFarms, setDraftFarms,
    availableOrgs, availableFarms,
    dirty, apply,
  };
}
