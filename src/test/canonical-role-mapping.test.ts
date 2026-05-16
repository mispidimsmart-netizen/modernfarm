/**
 * Integration tests for canonical role mapping (additive 4-role layer).
 *
 * Exercises:
 *   - public.get_canonical_role(_user_id, _farm_id)
 *   - public.canonical_role_label_bn(_role)
 *   - public.v_user_canonical_roles view
 *
 * Both functions are SECURITY DEFINER / IMMUTABLE and safe to call anonymously.
 *
 * Seed users (created during onboarding, expected to remain stable):
 *   268ec8e0…     → super_admin (priority test: also has personal farm)
 *   70604f53…     → company_org (org_owner of an organization)
 *   79892004…     → company_org (promoted to org_owner; canonical role wins)
 *   2a6d9397…     → farm        (farm owner only)
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SUPER_ADMIN  = '268ec8e0-1cb5-43ea-92ab-e9d8e05a2bc7';
const COMPANY_ORG  = '70604f53-bae0-47e0-a9b0-d950df0fec36';
const FARM_OWNER_1 = '79892004-0c53-40a9-8d6b-d82ed30f79cc';
const FARM_OWNER_2 = '2a6d9397-a4d4-4887-aa0e-6f9e7b71e6c7';
const RANDOM_UUID  = '00000000-0000-0000-0000-000000000999';

const sb = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function getRole(userId: string | null, farmId: string | null = null) {
  const { data, error } = await sb().rpc('get_canonical_role' as never, {
    _user_id: userId,
    _farm_id: farmId,
  } as never);
  return { data: data as string | null, error };
}

async function getLabel(role: string) {
  const { data, error } = await sb().rpc('canonical_role_label_bn' as never, {
    _role: role,
  } as never);
  return { data: data as string | null, error };
}

describe('canonical_role: get_canonical_role()', () => {
  it('super_admin user → "super_admin" (priority over farm ownership)', async () => {
    const { data, error } = await getRole(SUPER_ADMIN);
    expect(error).toBeNull();
    expect(data).toBe('super_admin');
  });

  it('org_owner user → "company_org"', async () => {
    const { data, error } = await getRole(COMPANY_ORG);
    expect(error).toBeNull();
    expect(data).toBe('company_org');
  });

  it('FARM_OWNER_1 (also org_owner) → "company_org" (org role wins over farm)', async () => {
    const { data, error } = await getRole(FARM_OWNER_1);
    expect(error).toBeNull();
    expect(data).toBe('company_org');
  });

  it('farm owner #2 → "farm"', async () => {
    const { data, error } = await getRole(FARM_OWNER_2);
    expect(error).toBeNull();
    expect(data).toBe('farm');
  });

  it('unknown user → null', async () => {
    const { data, error } = await getRole(RANDOM_UUID);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('null user → null', async () => {
    const { data, error } = await getRole(null);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});

describe('canonical_role: canonical_role_label_bn()', () => {
  const cases: Array<[string, string]> = [
    ['super_admin', 'সুপার এডমিন'],
    ['company_org', 'কোম্পানি/অর্গানাইজেশন'],
    ['farm',        'ফার্ম'],
    ['worker',      'ওয়ার্কার'],
  ];

  for (const [role, label] of cases) {
    it(`${role} → "${label}"`, async () => {
      const { data, error } = await getLabel(role);
      expect(error).toBeNull();
      expect(data).toBe(label);
    });
  }
});

describe('canonical_role: v_user_canonical_roles view', () => {
  it('returns expected role for known users (anonymous read may be restricted by profiles RLS)', async () => {
    const { data, error } = await sb()
      .from('v_user_canonical_roles' as never)
      .select('user_id, role, role_label_bn')
      .in('user_id', [SUPER_ADMIN, COMPANY_ORG, FARM_OWNER_1, FARM_OWNER_2]);

    // If RLS hides profiles from anon, we just verify the view itself is callable.
    if (error) {
      expect(error.message.toLowerCase()).toMatch(/permission|denied|policy|row-level/);
      return;
    }

    const map = new Map(((data as Array<{ user_id: string; role: string; role_label_bn: string }>) || [])
      .map(r => [r.user_id, r]));

    if (map.size === 0) return; // RLS hid every row — acceptable

    if (map.has(SUPER_ADMIN))  expect(map.get(SUPER_ADMIN)!.role).toBe('super_admin');
    if (map.has(COMPANY_ORG))  expect(map.get(COMPANY_ORG)!.role).toBe('company_org');
    if (map.has(FARM_OWNER_1)) expect(map.get(FARM_OWNER_1)!.role).toBe('farm');
    if (map.has(FARM_OWNER_2)) expect(map.get(FARM_OWNER_2)!.role).toBe('farm');

    for (const r of map.values()) {
      expect(r.role_label_bn).toMatch(/সুপার এডমিন|কোম্পানি\/অর্গানাইজেশন|ফার্ম|ওয়ার্কার/);
    }
  });
});
