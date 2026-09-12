import { describe, it, expect } from 'vitest';
import {
  toOrgSlug,
  isPersonalOrgSlug,
  licenseStatus,
  roleLabel,
  licenseLabel,
} from '@/components/admin/organizations/types';

describe('toOrgSlug', () => {
  it('lowercases and dashes spaces', () => {
    expect(toOrgSlug('Acme Poultry Farm')).toBe('acme-poultry-farm');
  });
  it('collapses repeated whitespace', () => {
    expect(toOrgSlug('Acme   Poultry')).toBe('acme-poultry');
  });
  it('handles empty input', () => {
    expect(toOrgSlug('')).toBe('');
  });
});

describe('isPersonalOrgSlug', () => {
  it('flags auto-created personal orgs', () => {
    expect(isPersonalOrgSlug('personal-abc123')).toBe(true);
    expect(isPersonalOrgSlug('/personal-abc123')).toBe(true);
    expect(isPersonalOrgSlug('PERSONAL-XYZ')).toBe(true);
  });
  it('keeps real orgs', () => {
    expect(isPersonalOrgSlug('acme-poultry')).toBe(false);
  });
  it('treats empty/null slug as hidden', () => {
    expect(isPersonalOrgSlug('')).toBe(true);
    expect(isPersonalOrgSlug(null)).toBe(true);
    expect(isPersonalOrgSlug(undefined)).toBe(true);
  });
});

describe('licenseStatus', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  it('suspended wins over expiry', () => {
    expect(licenseStatus({ license_type: 'suspended', license_expires_at: null }, now)).toBe('suspended');
  });
  it('lifetime never expires', () => {
    expect(licenseStatus({ license_type: 'lifetime', license_expires_at: '2020-01-01' }, now)).toBe('lifetime');
  });
  it('subscription in the future is active', () => {
    expect(licenseStatus({ license_type: 'subscription', license_expires_at: '2026-06-01' }, now)).toBe('active');
  });
  it('subscription in the past is expired', () => {
    expect(licenseStatus({ license_type: 'subscription', license_expires_at: '2025-06-01' }, now)).toBe('expired');
  });
  it('trial without expiry is active', () => {
    expect(licenseStatus({ license_type: 'trial', license_expires_at: null }, now)).toBe('active');
  });
});

describe('label maps', () => {
  it('covers every role and license type', () => {
    expect(Object.keys(roleLabel).sort()).toEqual(['member', 'org_admin', 'org_owner']);
    expect(Object.keys(licenseLabel).sort()).toEqual(['lifetime', 'subscription', 'suspended', 'trial']);
  });
});
