import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller JWT
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const callerId = claimsData.claims.sub as string;

    // Parse target userId from query or body
    const url = new URL(req.url);
    let targetUserId = url.searchParams.get('userId') || url.searchParams.get('user_id') || '';
    if (!targetUserId && (req.method === 'POST' || req.method === 'PUT')) {
      try {
        const body = await req.json();
        targetUserId = body.userId || body.user_id || '';
      } catch { /* ignore */ }
    }
    targetUserId = (targetUserId || '').trim();
    if (!targetUserId) targetUserId = callerId; // default = self
    if (!UUID_RE.test(targetUserId)) {
      return json({ error: 'Invalid userId — must be a UUID' }, 400);
    }

    // Authorization: caller must be super_admin, OR looking up themselves
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isSuperData, error: isSuperErr } = await admin.rpc('is_super_admin', { _user_id: callerId });
    if (isSuperErr) return json({ error: isSuperErr.message }, 500);
    const isCallerSuperAdmin = isSuperData === true;

    if (!isCallerSuperAdmin && callerId !== targetUserId) {
      return json({ error: 'Forbidden — only super admins can look up other users' }, 403);
    }

    // Gather everything in parallel
    const [
      profileRes,
      rolesRes,
      superAdminRes,
      orgMembersRes,
      farmMembersRes,
      ownedFarmsRes,
      canonicalRes,
    ] = await Promise.all([
      admin.from('profiles').select('id, user_name, phone, email, created_at').eq('id', targetUserId).maybeSingle(),
      admin.from('user_roles').select('role, farm_id, created_at').eq('user_id', targetUserId),
      admin.from('super_admins').select('user_id, created_at').eq('user_id', targetUserId).maybeSingle(),
      admin.from('organization_members')
        .select('organization_id, role, organizations(id, name, slug, license_type)')
        .eq('user_id', targetUserId),
      admin.from('farm_members')
        .select('farm_id, role, farms(id, name, organization_id)')
        .eq('user_id', targetUserId),
      admin.from('farms')
        .select('id, name, organization_id, deleted_at')
        .eq('owner_id', targetUserId)
        .is('deleted_at', null),
      admin.rpc('get_canonical_role', { _user_id: targetUserId }),
    ]);

    const isSuperAdmin = !!superAdminRes.data;
    const orgMemberships = (orgMembersRes.data || []).map((m: any) => ({
      organization_id: m.organization_id,
      organization_name: m.organizations?.name ?? null,
      slug: m.organizations?.slug ?? null,
      license_type: m.organizations?.license_type ?? null,
      role: m.role,
    }));
    const farmMemberships = (farmMembersRes.data || []).map((m: any) => ({
      farm_id: m.farm_id,
      farm_name: m.farms?.name ?? null,
      organization_id: m.farms?.organization_id ?? null,
      role: m.role,
    }));
    const ownedFarms = (ownedFarmsRes.data || []).map((f: any) => ({
      farm_id: f.id,
      farm_name: f.name,
      organization_id: f.organization_id,
    }));

    const isOrgOwner = orgMemberships.some(o => o.role === 'org_owner');
    const isOrgAdmin = orgMemberships.some(o => o.role === 'org_admin' || o.role === 'org_owner');
    const isFarmOwner = ownedFarms.length > 0;
    const isWorker = farmMemberships.some(f => f.role === 'worker');

    return json({
      user_id: targetUserId,
      profile: profileRes.data ?? null,
      canonical_role: canonicalRes.data ?? null,
      flags: {
        is_super_admin: isSuperAdmin,
        is_org_owner: isOrgOwner,
        is_org_admin: isOrgAdmin,
        is_farm_owner: isFarmOwner,
        is_worker: isWorker,
      },
      raw_roles: rolesRes.data || [],
      organizations: orgMemberships,
      farm_memberships: farmMemberships,
      owned_farms: ownedFarms,
      summary: {
        total_orgs: orgMemberships.length,
        total_farm_memberships: farmMemberships.length,
        total_owned_farms: ownedFarms.length,
      },
      checked_by: callerId,
      checked_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return json({ error: e?.message || 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
