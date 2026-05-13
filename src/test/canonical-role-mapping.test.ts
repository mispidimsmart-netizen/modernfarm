/**
 * Integration tests for canonical role mapping (additive 4-role layer).
 *
 * Exercises:
 *   - public.get_canonical_role(_user_id, _farm_id)
 *   - public.canonical_role_label_bn(_role)
 *
 * Both are SECURITY DEFINER / IMMUTABLE and safe to call anonymously.
 *
 * Seed users (created during onboarding, expected to remain stable):
 *   268ec8e0…     → super_admin (priority test: also has personal farm)
 *   70604f53…     → company_org (org_owner of an organization)
 *   79892004…     → farm        (farm owner only)
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

describe('canonical_role enum + get_canonical_role()', () => {
  it('maps super_admin user → "super_admin" (priority over farm ownership)', async () => {
    const { data, error } = await getRole(SUPER_ADMIN);
    expect(error).toBeNull();
    expect(data).toBe('super_admin');
  });

  it('maps org_owner user → "company_org"', async () => {
    const { data, error } = await getRole(COMPANY