/**
 * Shared types & label maps for the super-admin Organizations feature.
 * Kept free of React/Supabase imports so it can be unit-tested in isolation.
 */
export type OrgRole = 'org_owner' | 'org_admin' | 'member';
export type LicenseType = 'trial' | 'lifetime' | 'subscription' | 'suspended';

export interface Org {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  owner_user_id: string;
  license_type: LicenseType;
  max_farms: number;
  max_users: number;
  license_expires_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}

export interface UserSearchRow {
  id: string;
  user_name: string | null;
  phone: string | null;
  email: string | null;
  farm_name: string | null;
}

export const roleLabel: Record<OrgRole, string> = {
  org_owner: 'কোম্পানি/অর্গানাইজেশন',
  org_admin: 'ফার্ম',
  member: 'ওয়ার্কার',
};

export const licenseLabel: Record<LicenseType, string> = {
  trial: 'ট্রায়াল',
  lifetime: 'লাইফটাইম',
  subscription: 'সাবস্ক্রিপশন',
  suspended: 'স্থগিত',
};

/** URL-safe slug: lowercase, spaces -> dash. Mirrors the create/edit inputs. */
export function toOrgSlug(input: string): string {
  return (input || '').toLowerCase().replace(/\s+/g, '-');
}

/** Auto-created personal orgs must never appear in the admin list. */
export function isPersonalOrgSlug(slug: string | null | undefined): boolean {
  const s = (slug || '').trim().toLowerCase();
  return s.length === 0 || s.includes('personal-');
}

/** License health used for badges/expiry warnings. */
export function licenseStatus(
  org: Pick<Org, 'license_type' | 'license_expires_at'>,
  now: Date = new Date(),
): 'suspended' | 'lifetime' | 'active' | 'expired' {
  if (org.license_type === 'suspended') return 'suspended';
  if (org.license_type === 'lifetime') return 'lifetime';
  if (!org.license_expires_at) return 'active';
  return new Date(org.license_expires_at).getTime() < now.getTime() ? 'expired' : 'active';
}
