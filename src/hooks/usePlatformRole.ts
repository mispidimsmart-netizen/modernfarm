import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type PlatformRole = 'super_admin' | 'org_owner' | 'org_admin' | 'user';

export interface PlatformRoleInfo {
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isOrgMember: boolean;
  /** Highest role available */
  topRole: PlatformRole;
  /** Orgs the user owns/admins (for routing to /org-admin) */
  orgs: Array<{ id: string; name: string; my_role: 'org_owner' | 'org_admin' | 'member' }>;
}

/**
 * Single source of truth for platform-level role checks used by route guards
 * and navigation. Combines `is_super_admin` (super admin table) with
 * `get_my_organizations` (org owner/admin membership).
 */
export function usePlatformRole() {
  const { user } = useAuth();

  return useQuery<PlatformRoleInfo>({
    queryKey: ['platform_role', user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [superRes, orgsRes] = await Promise.all([
        supabase.rpc('is_super_admin' as any, { _user_id: user!.id }),
        supabase.rpc('get_my_organizations' as any),
      ]);

      const isSuperAdmin = !!superRes.data;
      const orgs = ((orgsRes.data || []) as any[]).map(o => ({
        id: o.id,
        name: o.name,
        my_role: o.my_role as 'org_owner' | 'org_admin' | 'member',
      }));

      const isOrgOwner = orgs.some(o => o.my_role === 'org_owner');
      const isOrgAdmin = orgs.some(o => o.my_role === 'org_admin');

      let topRole: PlatformRole = 'user';
      if (isSuperAdmin) topRole = 'super_admin';
      else if (isOrgOwner) topRole = 'org_owner';
      else if (isOrgAdmin) topRole = 'org_admin';

      return {
        isSuperAdmin,
        isOrgOwner,
        isOrgAdmin,
        isOrgMember: orgs.length > 0,
        topRole,
        orgs,
      };
    },
  });
}
