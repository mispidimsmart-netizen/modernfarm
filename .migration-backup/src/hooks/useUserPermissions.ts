/**
 * @deprecated Legacy 3-tier permission surface (viewer/farmer/admin).
 *
 * Phase 5c: this is now a THIN ADAPTER over the canonical 4-role model
 * (`usePermissions`). It no longer calls `get_user_access_role` — the SQL
 * helpers (can_manage_farm / can_change_hardware / can_log_daily_data) are the
 * single source of truth. Kept only for backward compatibility with
 * `RoleProtectedRoute`, `RoleGate` and `RequirePermission`.
 *
 * New code MUST use `usePermissions()` from `@/hooks/usePermissions`.
 */
import { useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { toLegacyPermissions } from '@/lib/legacyPermissionMap';
import type { AccessRole, UserPermissions } from '@/lib/legacyPermissionMap';

export type { AccessRole, UserPermissions };

export function useUserPermissions() {
  const canonical = usePermissions();
  const data = useMemo<UserPermissions>(() => toLegacyPermissions(canonical), [canonical]);

  return { data, isLoading: false, isError: false as const };
}
