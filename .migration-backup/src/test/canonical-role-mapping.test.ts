/**
 * Integration tests for canonical role mapping (additive 4-role layer).
 *
 * Security posture (after RPC hardening): `anon` has NO EXECUTE on these
 * SECURITY DEFINER functions. So the anonymous suite asserts *denial* — that
 * is the invariant we want to keep — and the value-mapping suite runs only
 * when signed-in super-admin credentials are provided:
 *   TEST_SUPER_ADMIN_EMAIL, TEST_SUPER_ADMIN_PASSWORD
 *
 * Seed users (created during onboarding, expected to remain stable):
 *   268ec8e0…     → super_admin (priority test: also has personal farm)
 *   70604f53…     → company_org (org_owner of an organization)
 *   79892004…     → company_org (promoted to org_owner; canonical role wins)
 *   2a6d9397…     → farm        (farm owner only)
 */
import { describe, it, expect } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const SUPER_ADMIN  = '268ec8e0-1cb5-43ea-92ab-e9d8e05a2bc7';
const COMPANY_ORG  = '70604f53-bae0-47e0-a9b0-d950df0fec36';
const FARM_OWNER_1 = '79892004-0c53-40a9-8d6b-d82ed30f79cc';
const FARM_OWNER_2 = '2a6d9397-a4d4-4887-aa0e-6f9e7b71e6c7';
const RANDOM_UUID  = '00000000-0000-0000-0000-000000000999';

const newClient = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const isDenied = (error: { message?: string; code?: string } | null) =>
  !!error && (error.code === '42501' || /permission denied|not authorized/i.test(error.message ?? ''));

async function getRole(client: SupabaseClient, userId: string | null, farmId: string | null = null) {
  const { data, error } = await client.rpc('get_canonical_role' as never, {
    _user_id: userId,
    _farm_id: farmId,
  } as never);
  return { data: data as string | null, error };
}

async function getLabel(client: SupabaseClient, role: string) {
  const { data, error } = await client.rpc('canonical_role_label_bn' as never, {
    _role: role,
  } as never);
  return { data: data as string | null, error };
}

describe('canonical_role: anon is denied (hardened RPC surface)', () => {
  it('anon cannot execute get_canonical_role', async () => {
    const { error } = await getRole(newClient(), SUPER_ADMIN);
    expect(isDenied(error)).toBe(true);
  });

  it('anon cannot execute canonical_role_label_bn', async () => {
    const { error } = await getLabel(newClient(), 'super_admin');
    expect(isDenied(error)).toBe(true);
  });

  it('anon cannot read v_user_canonical_roles rows', async () => {
    const { data, error } = await newClient()
      .from('v_user_canonical_roles' as never)
      .select('user_id, role')
      .in('user_id', [SUPER_ADMIN, COMPANY_ORG]);
    if (error) {
      expect(isDenied(error) || /policy|row-level/i.test(error.message)).toBe(true);
    } else {
      expect(data ?? []).toHaveLength(0);
    }
  });
});

describe('canonical_role: authenticated mapping (gated)', () => {
  const email = import.meta.env.TEST_SUPER_ADMIN_EMAIL as string | undefined;
  const password = import.meta.env.TEST_SUPER_ADMIN_PASSWORD as string | undefined;
  const enabled = !!(email && password);

  async function signedIn() {
    const client = newClient();
    const { error } = await client.auth.signInWithPassword({ email: email!, password: password! });
    expect(error).toBeNull();
    return client;
  }

  it.skipIf(!enabled)('maps seed users to their canonical roles', async () => {
    const client = await signedIn();

    expect((await getRole(client, SUPER_ADMIN)).data).toBe('super_admin');
    expect((await getRole(client, COMPANY_ORG)).data).toBe('company_org');
    expect((await getRole(client, FARM_OWNER_1)).data).toBe('company_org');
    expect((await getRole(client, FARM_OWNER_2)).data).toBe('farm');
    expect((await getRole(client, RANDOM_UUID)).data).toBeNull();
    expect((await getRole(client, null)).data).toBeNull();

    await client.auth.signOut();
  });

  it.skipIf(!enabled)('returns Bengali labels for every canonical role', async () => {
    const client = await signedIn();
    const cases: Array<[string, string]> = [
      ['super_admin', 'সুপার এডমিন'],
      ['company_org', 'কোম্পানি/অর্গানাইজেশন'],
      ['farm',        'ফার্ম'],
      ['worker',      'ওয়ার্কার'],
    ];
    for (const [role, label] of cases) {
      const { data, error } = await getLabel(client, role);
      expect(error).toBeNull();
      expect(data).toBe(label);
    }
    await client.auth.signOut();
  });
});
