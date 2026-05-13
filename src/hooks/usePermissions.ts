/**
 * Unified 4-role permission hook.
 *
 * Roles (Bengali UI labels):
 *   super_admin  → "সুপার এডমিন"          — everything
 *   org_owner    → "কোম্পানি/অর্গানাইজেশন" — manages org's farms & members; no direct farm ops
 *   farm_owner   → "ফার্ম"                 — full control of own farm (incl. hardware)
 *   worker       → "ওয়ার্কার"              — daily logs only, NO hardware/automation/threshold edits
 *
 * Backed by SECURITY DEFINER SQL helpers:
 *   can_manage_org(_user_id, _org_id)
 *   can_manage_farm(_user_id, _farm_id)
 *   is_worker_on_farm(_user_id, _farm_id)
 *   can_change_hardware(_user_id, _farm_id)
 *   can_log_daily_data(_user_id, _farm_id)
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { usePlatformRole } from './usePlatformRole';
import { useUserRole } from './useUserRole';

export type AppRoleV2 = 'super_admin' | 'org_owner' | 'farm_owner' | 'worker' | 'guest';

export const ROLE_LABEL_BN: Record<AppRoleV2, string> = {
  super_admin: 'সুপার এডমিন',
  org_owner: 'কোম্পানি/অর্গানাইজেশন',
  farm_owner: 'ফার্ম',
  worker: 'ওয়ার্কার',
  guest: 'অতিথি',
};

export interface PermissionsState {
  role: AppRoleV2;
  isSuperAdmin: boolean;
  isOrgOwner: boolean;
  isFarmOwner: boolean;
  isWorker: boolean;

  // Capabilities for the *currently selected* farm
  canManageFarm: boolean;          // edit farm settings, batches, members
  canChangeHardware: boolean;      // automation rules, thresholds, ESP32 config, relay overrides (>20m)
  canLogDailyData: boolean;        // feed/water/mortality/egg entries
  canViewFinance: boolean;         // see expenses/income
  canEditFinance: boolean;         // add/edit expenses/income
  canManageWorkers: boolean;       // invite/remove workers
  canTempOverride: boolean;        // 20-min manual override (everyone with farm access)
}

/**
 * Returns the current user's role + capability flags scoped to the
 * currently selected farm. Workers get same access as farm owner EXCEPT
 * hardware/automation/threshold changes.
 */
export function usePermissions(): PermissionsState {
  const { user } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const { data: platform } = usePlatformRole();
  const { data: legacyRole } = useUserRole();

  // Server-confirmed farm-level checks
  const { data: farmChecks } = useQuery({
    queryKey: ['perm_farm_checks', user?.id, selectedFarmId],
    enabled: !!user?.id && !!selectedFarmId,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const [m, h, l, w] = await Promise.all([
        supabase.rpc('can_manage_farm' as any, { _user_id: user!.id, _farm_id: selectedFarmId }),
        supabase.rpc('can_change_hardware' as any, { _user_id: user!.id, _farm_id: selectedFarmId }),
        supabase.rpc('can_log_daily_data' as any, { _user_id: user!.id, _farm_id: selectedFarmId }),
        supabase.rpc('is_worker_on_farm' as any, { _user_id: user!.id, _farm_id: selectedFarmId }),
      ]);
      return {
        canManageFarm: !!m.data,
        canChangeHardware: !!h.data,
        canLogDailyData: !!l.data,
        isWorker: !!w.data,
      };
    },
  });

  return useMemo<PermissionsState>(() => {
    const isSuperAdmin = !!platform?.isSuperAdmin;
    const isOrgOwner = !!platform?.isOrgOwner || !!platform?.isOrgAdmin;
    const isWorker = farmChecks?.isWorker ?? legacyRole?.role === 'worker';
    const canManageFarm = farmChecks?.canManageFarm ?? (legacyRole?.role === 'owner');
    const isFarmOwner = canManageFarm && !isSuperAdmin && !isOrgOwner;

    let role: AppRoleV2 = 'guest';
    if (isSuperAdmin) role = 'super_admin';
    else if (isOrgOwner) role = 'org_owner';
    else if (isFarmOwner) role = 'farm_owner';
    else if (isWorker) role = 'worker';

    const canChangeHardware = farmChecks?.canChangeHardware ?? canManageFarm;
    const canLogDailyData = farmChecks?.canLogDailyData ?? (canManageFarm || !!isWorker);

    return {
      role,
      isSuperAdmin,
      isOrgOwner,
      isFarmOwner,
      isWorker: !!isWorker,
      canManageFarm,
      canChangeHardware,
      canLogDailyData,
      canViewFinance: canManageFarm || !!isWorker,
      canEditFinance: canManageFarm || !!isWorker, // workers can log finance entries (not hardware)
      canManageWorkers: canManageFarm,
      canTempOverride: canLogDailyData, // anyone with farm access
    };
  }, [platform, legacyRole, farmChecks]);
}

/** Imperative check for an arbitrary farm id (e.g., in lists). */
export async function checkCanManageFarm(userId: string, farmId: string): Promise<boolean> {
  const { data } = await supabase.rpc('can_manage_farm' as any, {
    _user_id: userId,
    _farm_id: farmId,
  });
  return !!data;
}

/** Imperative check for org-level management. */
export async function checkCanManageOrg(userId: string, orgId: string): Promise<boolean> {
  const { data } = await supabase.rpc('can_manage_org' as any, {
    _user_id: userId,
    _org_id: orgId,
  });
  return !!data;
}
