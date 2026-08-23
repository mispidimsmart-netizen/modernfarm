// Phase 1 Security — Device Provisioning
// Authenticated farmer/admin generates a one-time provisioning code.
// ESP32 (in pairing mode) calls /provision-device/claim with the code to
// receive its device_token + device_secret (HMAC key) — returned ONCE.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomCode(prefix = 'PAIR'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // CSPRNG — pairing codes must not be guessable from a seeded PRNG.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = prefix + '-';
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
    if (i === 3) out += '-';
  }
  return out;
}

// ── Brute-force protection for /claim (sliding window, per client IP) ──
const CLAIM_WINDOW_MS = 10 * 60 * 1000;
const CLAIM_MAX_FAILURES = 10;
const claimFailures = new Map<string, number[]>();

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

function isClaimRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (claimFailures.get(ip) || []).filter((t) => now - t < CLAIM_WINDOW_MS);
  claimFailures.set(ip, hits);
  return hits.length >= CLAIM_MAX_FAILURES;
}

function recordClaimFailure(ip: string): void {
  const now = Date.now();
  const hits = (claimFailures.get(ip) || []).filter((t) => now - t < CLAIM_WINDOW_MS);
  hits.push(now);
  claimFailures.set(ip, hits);
}

function randomSecret(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const chunk = () => randomSecret(2).toUpperCase();
  return `FARM-${chunk()}-${chunk()}-${chunk()}`;
}

async function logEvent(adminClient: any, eventType: string, userId: string | null, farmId: string | null, deviceTokenId: string | null, success: boolean, details: any) {
  try {
    await adminClient.rpc('log_security_event', {
      _event_type: eventType,
      _user_id: userId,
      _farm_id: farmId,
      _device_token_id: deviceTokenId,
      _success: success,
      _details: details,
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';

  try {
    // ─────────────────────────────────────────
    // /create — authenticated user creates a code
    // ─────────────────────────────────────────
    if (path === 'create' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userId = claimsData.claims.sub as string;

      const body = await req.json().catch(() => ({} as any));
      const farmId = body.farm_id as string | undefined;
      const shedId = (body.shed_id as string | undefined) || null;
      const deviceName = (body.device_name as string | undefined) || 'ESP32 Controller';

      if (!farmId) {
        return new Response(JSON.stringify({ error: 'farm_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify membership
      const { data: canAccess } = await adminClient.rpc('user_can_access_farm', {
        _user_id: userId, _farm_id: farmId,
      });
      if (!canAccess) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = randomCode('PAIR');
      const { data, error } = await adminClient
        .from('device_provisioning_codes')
        .insert({
          code, farm_id: farmId, shed_id: shedId,
          created_by: userId, device_name: deviceName,
        })
        .select('id, code, expires_at')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await logEvent(adminClient, 'provisioning_code_created', userId, farmId, null, true, { code_id: data.id });

      return new Response(JSON.stringify({
        code: data.code,
        expires_at: data.expires_at,
        instructions: 'ESP32-এ এই কোড enter করুন pairing mode-এ। ১০ মিনিটে expire।',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────────────────────
    // /claim — ESP32 redeems a code (no auth)
    // ─────────────────────────────────────────
    if (path === 'claim' && req.method === 'POST') {
      const ip = clientIp(req);
      if (isClaimRateLimited(ip)) {
        await logEvent(adminClient, 'provisioning_claim_rate_limited', null, null, null, false, { ip });
        return new Response(JSON.stringify({ error: 'Too many attempts. Try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '600' },
        });
      }

      const body = await req.json().catch(() => ({} as any));
      const code = (body.code as string | undefined)?.trim().toUpperCase();
      const macAddress = (body.mac_address as string | undefined) || null;
      const firmwareVersion = (body.firmware_version as string | undefined) || null;

      if (!code) {
        recordClaimFailure(ip);
        return new Response(JSON.stringify({ error: 'code required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pc, error: pcErr } = await adminClient
        .from('device_provisioning_codes')
        .select('*')
        .eq('code', code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (pcErr || !pc) {
        recordClaimFailure(ip);
        await logEvent(adminClient, 'provisioning_claim_failed', null, null, null, false,
          { reason: 'invalid_or_expired', code, ip });
        return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }


      // Generate token + secret
      const token = randomToken();
      const secret = randomSecret(32);

      // Resolve owner of farm to set user_id
      const { data: farm } = await adminClient
        .from('farms').select('owner_id').eq('id', pc.farm_id).single();

      const { data: dt, error: dtErr } = await adminClient
        .from('device_tokens')
        .insert({
          user_id: farm?.owner_id ?? pc.created_by,
          farm_id: pc.farm_id,
          shed_id: pc.shed_id,
          token,
          device_name: pc.device_name || 'ESP32 Controller',
          mac_address: macAddress,
          firmware_version: firmwareVersion,
          device_secret: secret,
          secret_version: 1,
          secret_rotated_at: new Date().toISOString(),
        })
        .select('id, token')
        .single();

      if (dtErr) {
        await logEvent(adminClient, 'provisioning_claim_failed', null, pc.farm_id, null, false,
          { reason: 'db_error', error: dtErr.message });
        return new Response(JSON.stringify({ error: 'Provisioning failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create device_health record
      await adminClient.from('device_health').insert({
        user_id: farm?.owner_id ?? pc.created_by,
        device_token_id: dt.id,
        farm_id: pc.farm_id,
        shed_id: pc.shed_id,
      }).select().maybeSingle();

      // Mark code used
      await adminClient
        .from('device_provisioning_codes')
        .update({ used_at: new Date().toISOString(), device_token_id: dt.id })
        .eq('id', pc.id);

      await logEvent(adminClient, 'device_provisioned', pc.created_by, pc.farm_id, dt.id, true,
        { code_id: pc.id, mac_address: macAddress });

      return new Response(JSON.stringify({
        device_token: dt.token,
        device_secret: secret,
        secret_version: 1,
        device_token_id: dt.id,
        warning: 'এই secret আর কখনো দেখানো হবে না — ESP32-এ flash করুন।',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
