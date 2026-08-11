/**
 * SSOT for organization admin list logic (types, labels, search/sort/pagination).
 * Pure module — no React, no Supabase. Safe to unit test.
 */

export type OrgRole = 'org_owner' | 'org_admin' | 'member';
export type LicenseType = 'trial' | 'lifetime' | 'subscription' | 'suspended';

export interface MyOrg {
  id: string;
  name: string;
  name_en: string;
  slug: string;
  license_type: LicenseType;
  license_expires_at: string | null;
  max_farms: number;
  max_users: number;
  my_role: OrgRole;
  farm_count: number;
  member_count: number;
  license_valid: boolean;
}

export interface MemberRow {
  id: string;
  user_id: string;
  role: OrgRole;
  profile?: { user_name: string | null; phone: string | null; email: string | null };
}

export interface FarmRow {
  id: string;
  name: string;
  name_en: string | null;
  owner_id: string;
  created_at: string;
}

export type FarmSort = 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc';
export type MemberSort = 'name_asc' | 'name_desc' | 'role';

export const ORG_PAGE_SIZE = 10;

export const roleLabel: Record<OrgRole, string> = {
  org_owner: 'মালিক',
  org_admin: 'অ্যাডমিন',
  member: 'সদস্য',
};

export const licenseLabel: Record<LicenseType, string> = {
  trial: 'ট্রায়াল',
  lifetime: 'লাইফটাইম',
  subscription: 'সাবস্ক্রিপশন',
  suspended: 'স্থগিত',
};

export function filterSortFarms(farms: FarmRow[], search: string, sort: FarmSort): FarmRow[] {
  const q = search.trim().toLowerCase();
  const base = !q
    ? [...farms]
    : farms.filter(
        (f) =>
          (f.name || '').toLowerCase().includes(q) ||
          (f.name_en || '').toLowerCase().includes(q),
      );
  base.sort((a, b) => {
    switch (sort) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '', 'bn');
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '', 'bn');
      case 'date_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date_asc':
      default:
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });
  return base;
}

export function memberDisplayName(m: MemberRow): string {
  return m.profile?.user_name || m.profile?.phone || m.profile?.email || m.user_id;
}

export function filterSortMembers(members: MemberRow[], search: string, sort: MemberSort): MemberRow[] {
  const q = search.trim().toLowerCase();
  const base = !q
    ? [...members]
    : members.filter(
        (m) =>
          (m.profile?.user_name || '').toLowerCase().includes(q) ||
          (m.profile?.phone || '').toLowerCase().includes(q) ||
          (m.profile?.email || '').toLowerCase().includes(q) ||
          (roleLabel[m.role] || '').toLowerCase().includes(q),
      );
  const roleRank: Record<OrgRole, number> = { org_owner: 0, org_admin: 1, member: 2 };
  base.sort((a, b) => {
    switch (sort) {
      case 'name_asc':
        return memberDisplayName(a).localeCompare(memberDisplayName(b), 'bn');
      case 'name_desc':
        return memberDisplayName(b).localeCompare(memberDisplayName(a), 'bn');
      case 'role':
      default:
        return (
          roleRank[a.role] - roleRank[b.role] ||
          memberDisplayName(a).localeCompare(memberDisplayName(b), 'bn')
        );
    }
  });
  return base;
}

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function paginate<T>(rows: T[], page: number, pageSize = ORG_PAGE_SIZE): Paged<T> {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
  };
}
