import { describe, it, expect } from 'vitest';
import {
  filterSortFarms,
  filterSortMembers,
  paginate,
  memberDisplayName,
  roleLabel,
  licenseLabel,
  ORG_PAGE_SIZE,
  type FarmRow,
  type MemberRow,
} from '@/lib/orgAdmin';

const farms: FarmRow[] = [
  { id: '1', name: 'খামার খ', name_en: 'Farm B', owner_id: 'u1', created_at: '2026-01-02T00:00:00Z' },
  { id: '2', name: 'খামার ক', name_en: 'Farm A', owner_id: 'u2', created_at: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'খামার গ', name_en: 'Gamma', owner_id: 'u3', created_at: '2026-01-03T00:00:00Z' },
];

const members: MemberRow[] = [
  { id: 'm1', user_id: 'u1', role: 'member', profile: { user_name: 'Zaman', phone: '017', email: null } },
  { id: 'm2', user_id: 'u2', role: 'org_owner', profile: { user_name: 'Alim', phone: '018', email: null } },
  { id: 'm3', user_id: 'u3', role: 'org_admin', profile: { user_name: null, phone: null, email: 'x@y.com' } },
];

describe('orgAdmin farms', () => {
  it('sorts by date ascending by default', () => {
    expect(filterSortFarms(farms, '', 'date_asc').map(f => f.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by date descending', () => {
    expect(filterSortFarms(farms, '', 'date_desc').map(f => f.id)).toEqual(['3', '1', '2']);
  });

  it('filters on bengali and english names', () => {
    expect(filterSortFarms(farms, 'gamma', 'date_asc').map(f => f.id)).toEqual(['3']);
    expect(filterSortFarms(farms, 'খামার ক', 'date_asc').map(f => f.id)).toEqual(['2']);
  });

  it('does not mutate the input array', () => {
    const copy = [...farms];
    filterSortFarms(farms, '', 'name_desc');
    expect(farms).toEqual(copy);
  });
});

describe('orgAdmin members', () => {
  it('ranks owner before admin before member', () => {
    expect(filterSortMembers(members, '', 'role').map(m => m.id)).toEqual(['m2', 'm3', 'm1']);
  });

  it('falls back to email for display name', () => {
    expect(memberDisplayName(members[2])).toBe('x@y.com');
  });

  it('searches by role label in bengali', () => {
    expect(filterSortMembers(members, roleLabel.org_owner, 'role').map(m => m.id)).toEqual(['m2']);
  });

  it('searches by phone', () => {
    expect(filterSortMembers(members, '018', 'role').map(m => m.id)).toEqual(['m2']);
  });
});

describe('paginate', () => {
  const rows = Array.from({ length: 25 }, (_, i) => i);

  it('clamps page to the valid range', () => {
    expect(paginate(rows, 99).page).toBe(3);
    expect(paginate(rows, 0).page).toBe(1);
  });

  it('slices by page size', () => {
    const p = paginate(rows, 2);
    expect(p.items).toHaveLength(ORG_PAGE_SIZE);
    expect(p.items[0]).toBe(10);
    expect(p.totalPages).toBe(3);
  });

  it('returns one page for empty input', () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe('labels', () => {
  it('keeps bengali license labels', () => {
    expect(licenseLabel.lifetime).toBe('লাইফটাইম');
  });
});
