import { describe, it, expect } from 'vitest';
import {
  toLegacyRole,
  toLegacyPermissions,
  LEGACY_ROLE_HIERARCHY,
} from '@/lib/legacyPermissionMap';
import type { PermissionsState } from '@/hooks/usePermissions';

const base: PermissionsState = {
  role: 'guest',
  isSuperAdmin: false,
  isOrgOwner: false,
  isFarmOwner: false,
  isWorker: false,
  canManageFarm: false,
  canChangeHardware: false,
  canLogDailyData: false,
  canViewFinance: false,
  canEditFinance: false,
  canManageWorkers: false,
  canTempOverride: false,
};

const superAdmin: PermissionsState = {
  ...base,
  role: 'super_admin',
  isSuperAdmin: true,
  canManageFarm: true,
  canChangeHardware: true,
  canLogDailyData: true,
  canViewFinance: true,
  canEditFinance: true,
  canManageWorkers: true,
  canTempOverride: true,
};

const farmOwner: PermissionsState = {
  ...superAdmin,
  role: 'farm_owner',
  isSuperAdmin: false,
  isFarmOwner: true,
};

const worker: PermissionsState = {
  ...base,
  role: 'worker',
  isWorker: true,
  canManageFarm: false,
  canChangeHardware: false,
  canLogDailyData: true,
  canViewFinance: true,
  canEditFinance: true,
  canTempOverride: true,
};

describe('toLegacyRole', () => {
  it('maps super_admin / org_owner / farm_owner to admin', () => {
    expect(toLegacyRole({ role: 'super_admin' })).toBe('admin');
    expect(toLegacyRole({ role: 'org_owner' })).toBe('admin');
    expect(toLegacyRole({ role: 'farm_owner' })).toBe('admin');
  });
  it('maps worker to farmer', () => {
    expect(toLegacyRole({ role: 'worker' })).toBe('farmer');
  });
  it('maps guest to viewer', () => {
    expect(toLegacyRole({ role: 'guest' })).toBe('viewer');
  });
});

describe('toLegacyPermissions', () => {
  it('grants everything to super admin', () => {
    const p = toLegacyPermissions(superAdmin);
    expect(p.role).toBe('admin');
    expect(p.canFullControl).toBe(true);
    expect(p.canUpdateFirmware).toBe(true);
    expect(p.canManageUsers).toBe(true);
  });

  it('grants full farm control to farm owner', () => {
    const p = toLegacyPermissions(farmOwner);
    expect(p.canEditFarmSettings).toBe(true);
    expect(p.canEditThresholds).toBe(true);
  });

  it('NEVER grants hardware capabilities to a worker', () => {
    const p = toLegacyPermissions(worker);
    expect(p.role).toBe('farmer');
    expect(p.canControlDevices).toBe(true);
    expect(p.canTemporaryControl).toBe(true);
    expect(p.canFullControl).toBe(false);
    expect(p.canUpdateFirmware).toBe(false);
    expect(p.canCalibrate).toBe(false);
    expect(p.canEditThresholds).toBe(false);
    expect(p.canEditDeviceSettings).toBe(false);
    expect(p.canEditAdvancedSettings).toBe(false);
    expect(p.canDisableAutomation).toBe(false);
    expect(p.canManageUsers).toBe(false);
  });

  it('gives a guest read-only access', () => {
    const p = toLegacyPermissions(base);
    expect(p.role).toBe('viewer');
    expect(p.canViewDashboard).toBe(true);
    expect(p.canViewAlerts).toBe(true);
    expect(p.canControlDevices).toBe(false);
    expect(p.canViewLogs).toBe(false);
  });

  it('keeps the legacy hierarchy ordering', () => {
    expect(LEGACY_ROLE_HIERARCHY.viewer).toBeLessThan(LEGACY_ROLE_HIERARCHY.farmer);
    expect(LEGACY_ROLE_HIERARCHY.farmer).toBeLessThan(LEGACY_ROLE_HIERARCHY.admin);
  });
});
