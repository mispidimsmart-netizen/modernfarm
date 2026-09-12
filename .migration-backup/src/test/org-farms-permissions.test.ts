/**
 * Integration tests for the "farms under selected organization" query used by
 * OrganizationsPanel (right-hand "আওতাভুক্ত ফার্ম" section).
 *
 * The query is a plain `from('farms').select(...).eq('organization_id', X)`
 * — so visibility is governed entirely by the `farms` table RLS policies.
 *
 * Negative cases (anon / unauthenticated) MUST return zero rows even when
 * pointed at a real organization id, because farms RLS requires either
 * super-admin, org membership, or farm membership.
 *
 * The positive (super-admin) case is gated behind:
 *   TEST_SUPER_ADMIN_EMAIL, TEST_SUPER_ADMIN_PASSWORD
 * If absent, the happy path is skipped so CI stays green.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const FAKE_ORG = '00000000-0000-0000-0000-0000000000aa';

const anon = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// After RPC hardening, `anon` may be denied outright (42501, because the farms
// RLS policy calls is_super_admin) instead of being silently filtered.
// Both outcomes are acceptable — what matters is that zero rows leak.
const expectNoLeak = (
  data: unknown[] | null,
  error: { message?: string; code?: string } | null,
) => {
  if (error) {
    expect(
      error.code === '42501' ||
        /permission denied|policy|row-level|not authorized/i.test(error.message ?? ''),
    ).toBe(true);
    return;
  }
  expect(data ?? []).toHaveLength(0);
};

describe('Org farms query — anon / unauthenticated', () => {
  const client = anon();

  it('returns zero rows for a fake org id (RLS blocks all)', async () => {
    const { data, error } = await client
      .from('farms')
      .select('id, name, organization_id')
      .eq('organization_id', FAKE_ORG);
    expectNoLeak(data, error);
  });

  it('cannot enumerate any farms via organization filter on a real org', async () => {
    // Discover a real org id without auth — organizations may be readable
    // for landing-page lookups; if not, just fall back to the fake id.
    const { data: orgs } = await client.from('organizations').select('id').limit(1);
    const orgId = (orgs?.[0] as { id?: string } | undefined)?.id ?? FAKE_ORG;

    const { data, error } = await client
      .from('farms')
      .select('id, name, organization_id, owner_id')
      .eq('organization_id', orgId);
    expectNoLeak(data, error);
  });

  it('cannot read farms.owner_id (PII proxy) via the same query', async () => {
    const { data, error } = await client
      .from('farms')
      .select('owner_id')
      .eq('organization_id', FAKE_ORG);
    expectNoLeak(data, error);
  });
});


describe('Org farms query — super-admin happy path (gated)', () => {
  const email = import.meta.env.TEST_SUPER_ADMIN_EMAIL as string | undefined;
  const password = import.meta.env.TEST_SUPER_ADMIN_PASSWORD as string | undefined;
  const enabled = !!(email && password);

  it.skipIf(!enabled)('super admin can list farms scoped to a real org', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: email!, password: password!,
    });
    expect(signInErr).toBeNull();

    // Pick first org that actually has at least one farm.
    const { data: orgs } = await client
      .from('organizations')
      .select('id')
      .limit(20);
    expect(orgs && orgs.length).toBeGreaterThan(0);

    let foundOrgId: string | null = null;
    for (const o of orgs as Array<{ id: string }>) {
      const { data } = await client
        .from('farms')
        .select('id')
        .eq('organization_id', o.id)
        .limit(1);
      if ((data ?? []).length > 0) {
        foundOrgId = o.id;
        break;
      }
    }

    if (!foundOrgId) {
      // No org has farms yet — query still must succeed and return [] (not error).
      const probe = await client
        .from('farms')
        .select('id')
        .eq('organization_id', (orgs![0] as { id: string }).id);
      expect(probe.error).toBeNull();
    } else {
      const { data, error } = await client
        .from('farms')
        .select('id, name, organization_id, owner_id, created_at')
        .eq('organization_id', foundOrgId)
        .order('name');
      expect(error).toBeNull();
      expect(data && data.length).toBeGreaterThan(0);
      // Every returned farm MUST be scoped to the requested org.
      for (const f of data as Array<{ organization_id: string }>) {
        expect(f.organization_id).toBe(foundOrgId);
      }
    }

    await client.auth.signOut();
  });
});
