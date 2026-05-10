// Phase 1 Security — Rotate Device Secret
// Authenticated farm member triggers rotation. Old secret kept for 24h grace.
// New secret returned ONCE.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomSecret(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

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
  const deviceTokenId = body.device_token_id as string | undefined;
  if (!deviceTokenId) {
    return new Response(JSON.stringify({ error: 'device_token_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch device, verify access
  const { data: device, error: devErr } = await adminClient
    .from('device_tokens')
    .select('id, farm_id, device_secret, secret_version')
    .eq('id', deviceTokenId)
    .maybeSingle();

  if (devErr || !device) {
    return new Response(JSON.stringify({ error: 'Device not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: canAccess } = await adminClient.rpc('user_can_access_farm', {
    _user_id: userId, _farm_id: device.farm_id,
  });
  if (!canAccess) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const newSecret = randomSecret(32);
  const newVersion = (device.secret_version || 0) + 1;
  const graceUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: updErr } = await adminClient
    .from('device_tokens')
    .update({
      device_secret: newSecret,
      previous_device_secret: device.device_secret,
      previous_secret_expires_at: graceUntil,
      secret_version: newVersion,
      secret_rotated_at: new Date().toISOString(),
    })
    .eq('id', deviceTokenId);

  if (updErr) {
    return new Response(JSON.stringify({ error: updErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await adminClient.rpc('log_security_event', {
    _event_type: 'secret_rotated',
    _user_id: userId,
    _farm_id: device.farm_id,
    _device_token_id: deviceTokenId,
    _success: true,
    _details: { new_version: newVersion, grace_until: graceUntil },
  });

  return new Response(JSON.stringify({
    device_secret: newSecret,
    secret_version: newVersion,
    grace_until: graceUntil,
    warning: 'নতুন secret ESP32-এ flash করুন। পুরাতন secret ২৪ ঘণ্টা পর্যন্ত কাজ করবে।',
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
