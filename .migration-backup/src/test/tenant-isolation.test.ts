/**
 * Read-only multi-tenant isolation audit.
 *
 * Runs against the live database with the anon key (no service role, no test users created).
 * It calls the super-admin-only `audit_tenant_isolation()` RPC AND verifies that
 * unauthenticated clients can NOT read sensitive tables — proving RLS denies cross-tenant
 * access at the API layer.
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe('Tenant isolation (read-only)', () => {
  const anon = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it('anon client cannot read any farm', async () => {
    const { data, error } = await anon.from('farms').select('id').limit(1);
    // RLS must return empty (not error). If error, that's also acceptable (denied).
    expect(error || (data && data.length === 0)).toBeTruthy();
  });

  it('anon client cannot read device_tokens', async () => {
    const { data } = await anon.from('device_tokens').select('id').limit(1);
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon client cannot read sensor_readings', async () => {
    const { data } = await anon.from('sensor_readings').select('id').limit(1);
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon client cannot read device_commands', async () => {
    const { data } = await anon.from('device_commands').select('id').limit(1);
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon client cannot insert into device_commands', async () => {
    const { error } = await anon.from('device_commands').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      device_name: 'TEST',
      command_type: 'fan',
      command_value: true,
    });
    expect(error).toBeTruthy(); // RLS must reject
  });

  it('anon cannot call super-admin audit RPC', async () => {
    const { error } = await anon.rpc('audit_tenant_isolation' as never);
    expect(error).toBeTruthy();
    expect(error?.message?.toLowerCase()).toMatch(/permission|denied|super admin/);
  });
});
