/**
 * Integration tests for organization role-management RPCs.
 *
 * Negative cases (anon / non-super-admin) run against the live database with the
 * anon key — they MUST be denied by the SECURITY DEFINER guards on each RPC.
 *
 * The positive (super-admin) case is gated behind two optional env vars:
 *   TEST_SUPER_ADMIN_EMAIL, TEST_SUPER_ADMIN_PASSWORD
 * If absent, the happy-path test is skipped so CI stays green.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const FAKE_ORG = '00000000-0000-0000-0000-0000000000aa';
const FAKE_USER = '00000000-0000-0000-0000-0000000000bb';

const anon = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const expectDenied = (error: { message?: string } | null) => {
  expect(error).toBeTruthy();
  expect(error?.message?.toLowerCase() ?? '').toMatch(
    /permission|denied|super admin|not authenticated|org admin|forbidden/,
  );
};

describe('Org role permissions — anon / unauthenticated', () => {
  const client = anon();

  it('blocks super_admin_set_org_member_role', async () => {
    const { error } = await client.rpc('super_admin_set_org_member_role' as never, {
      _org_id: FAKE_ORG, _user_id: FAKE_USER, _role: 'org_admin',
    } as never);
    expectDenied(error);
  });

  it('blocks super_admin_add_org_member', async () => {
    const { error } = await client.rpc('super_admin_add_org_member' as never, {
      _org_id: FAKE_ORG, _identifier: 'someone@test.local', _role: 'member',
    } as never);
    expectDenied(error);
  });

  it('blocks super_admin_remove_org_member', async () => {
    const { error } = await client.rpc('super_admin_remove_org_member' as never, {
      _org_id: FAKE_ORG, _user_id: FAKE_USER,
    } as never);
    expectDenied(error);
  });

  it('blocks super_admin_create_organization', async () => {
    const { error } = await client.rpc('super_admin_create_organization' as never, {
      _name: 'X', _name_en: 'X', _slug: 'x-anon-' + Date.now(), _owner_user_id: FAKE_USER,
    } as never);
    expectDenied(error);
  });

  it('blocks super_admin_set_farm_organization', async () => {
    const { error } = await client.rpc('super_admin_set_farm_organization' as never, {
      _farm_id: FAKE_ORG, _org_id: FAKE_ORG,
    } as never);
    expectDenied(error);
  });

  it('blocks super_admin_delete_farm', async () => {
    const { error } = await client.rpc('super_admin_delete_farm' as never, {
      _farm_id: FAKE_ORG,
    } as never);
    expectDenied(error);
  });

  it('blocks org_admin_set_member_role (no membership)', async () => {
    const { error } = await client.rpc('org_admin_set_member_role' as never, {
      _org_id: FAKE_ORG, _user_id: FAKE_USER, _role: 'org_admin',
    } as never);
    expectDenied(error);
  });

  it('blocks org_admin_add_member (no membership)', async () => {
    const { error } = await client.rpc('org_admin_add_member' as never, {
      _org_id: FAKE_ORG, _identifier: 'x@test.local', _role: 'member',
    } as never);
    expectDenied(error);
  });
});

describe('Org role permissions — super-admin happy path (gated)', () => {
  const email = import.meta.env.TEST_SUPER_ADMIN_EMAIL as string | undefined;
  const password = import.meta.env.TEST_SUPER_ADMIN_PASSWORD as string | undefined;
  const enabled = !!(email && password);

  it.skipIf(!enabled)('super admin can flip a member role and revert it', async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: email!, password: password!,
    });
    expect(signInErr).toBeNull();

    // Pick first org with at least one non-owner member
    const { data: members } = await client
      .from('organization_members')
      .select('organization_id, user_id, role')
      .neq('role', 'org_owner')
      .limit(1);
    expect(members && members.length).toBeGreaterThan(0);
    const m = members![0] as { organization_id: string; user_id: string; role: string };
    const original = m.role;
    const next = original === 'org_admin' ? 'member' : 'org_admin';

    const { error: e1 } = await client.rpc('super_admin_set_org_member_role' as never, {
      _org_id: m.organization_id, _user_id: m.user_id, _role: next,
    } as never);
    expect(e1).toBeNull();

    const { data: after } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', m.organization_id)
      .eq('user_id', m.user_id)
      .single();
    expect((after as { role: string } | null)?.role).toBe(next);

    // revert
    const { error: e2 } = await client.rpc('super_admin_set_org_member_role' as never, {
      _org_id: m.organization_id, _user_id: m.user_id, _role: original,
    } as never);
    expect(e2).toBeNull();

    await client.auth.signOut();
  });
});
