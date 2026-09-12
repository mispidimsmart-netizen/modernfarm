/**
 * Phase 5c — Permission SSOT bridge.
 *
 * The app historically had TWO permission systems:
 *   1. Legacy 3-tier: viewer / farmer / admin  (`useUserPermissions`)
 *   2. Canonical 4-role: super_admin / org_owner / farm_owner / worker (`usePermissions`)
 *
 * This module is the single, pure mapping from the canonical model to the legacy
 * shape so that old call sites keep working while only ONE source of truth
 * (the SECURITY DEFINER SQL helpers) decides access.
 *
 * Pure function — no React, no network. Fully unit-testable.
 */
import type { PermissionsState } from '@/hooks/usePermissions';

export type AccessRole = 'viewer' | 'farmer' | 'admin';

export interface UserPermissions {
  role: AccessRole;
  canViewDashboard: boolean;
  canViewAlerts: boolean;
  canControlDevices: boolean;
  canTemporaryControl: boolean;
  canFullControl: boolean;
  canEditFarmSettings: boolean;
  canEditAdvancedSettings: boolean;
  canEditDeviceSettings: boolean;
  canUpdateFirmware: boolean;
  canCalibrate: boolean;
  canEditThresholds: boolean;
  canViewLogs: boolean;
  canManageUsers: boolean;
  canDisableAutomation: boolean;
}

/** Canonical role → legacy 3-tier role. */
export function toLegacyRole(p: Pick<PermissionsState, 'role'>): AccessRole {
  switch (p.role) {
    case 'super_admin':
    case 'org_owner':
    case 'farm_owner':
      return 'admin';
    case 'worker':
      return 'farmer';
    default:
      return 'viewer';
  }
}

/**
 * Canonical capability flags → legacy permission object.
 * Hardware-ish flags all derive from `canChangeHardware`, which is exactly the
 * capability workers must NOT have.
 */
export function toLegacyPermissions(p: PermissionsState): UserPermissions {
  const hasFarmAccess = p.canManageFarm || p.canLogDailyData || p.isSuperAdmin || p.isOrgOwner;

  return {
    role: toLegacyRole(p),
    canViewDashboard: true,
    canViewAlerts: true,
    canControlDevices: p.canLogDailyData || p.canManageFarm,
    canTemporaryControl: p.canTempOverride,
    canFullControl: p.canChangeHardware,
    canEditFarmSettings: p.canManageFarm,
    canEditAdvancedSettings: p.canChangeHardware,
    canEditDeviceSettings: p.canChangeHardware,
    canUpdateFirmware: p.canChangeHardware,
    canCalibrate: p.canChangeHardware,
    canEditThresholds: p.canChangeHardware,
    canViewLogs: hasFarmAccess,
    canManageUsers: p.canManageWorkers,
    canDisableAutomation: p.canChangeHardware,
  };
}

export const LEGACY_ROLE_HIERARCHY: Record<AccessRole, number> = {
  viewer: 0,
  farmer: 1,
  admin: 2,
};
