export interface ProfileRow {
  id: string;
  user_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface RoleSummary {
  is_super_admin: boolean;
  orgs: { organization_id: string; org_name: string; org_slug: string; role: string }[];
  owned_farms: { farm_id: string; farm_name: string; organization_id: string | null }[];
  farm_memberships: { farm_id: string; farm_name: string; organization_id: string | null; role: string }[];
}

export interface OrgOpt { id: string; name: string; slug: string | null; }
export interface FarmOpt { id: string; name: string; organization_id: string | null; }

export interface DraftOrg { organization_id: string; role: string; org_name: string; org_slug: string; }
export interface DraftFarm { farm_id: string; role: string; farm_name: string; }

export const ORG_ROLES = [
  { value: 'org_owner', label: 'অর্গ মালিক' },
  { value: 'org_admin', label: 'অর্গ এডমিন' },
  { value: 'member', label: 'সাধারণ সদস্য' },
];

export const FARM_ROLES = [
  { value: 'manager', label: 'ম্যানেজার' },
  { value: 'member', label: 'সদস্য' },
  { value: 'worker', label: 'ওয়ার্কার' },
  { value: 'viewer', label: 'ভিউয়ার' },
];
