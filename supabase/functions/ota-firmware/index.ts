import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseVersion(v: string): number[] {
  const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
}

function isNewer(latest: number[], current: number[]): boolean {
  return latest[0] > current[0] ||
    (latest[0] === current[0] && latest[1] > current[1]) ||
    (latest[0] === current[0] && latest[1] === current[1] && latest[2] > current[2]);
}

// ─────────────────────────────────────────────
// AuthN/AuthZ helpers for admin actions
// ─────────────────────────────────────────────
interface AuthedUser { id: string; isSuperAdmin: boolean }

/** Resolve the caller's user id from the Authorization header (or null). */
// deno-lint-ignore no-explicit-any
async function resolveUser(req: Request, supabase: any): Promise<AuthedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: isSuper } = await supabase.rpc('is_super_admin', { _user_id: user.id });
  return { id: user.id, isSuperAdmin: !!isSuper };
}

/**
 * Fleet-wide OTA actions (rollback, rollout start/advance, firmware list)
 * are super-admin only — a single mistake here can brick every device.
 */
// deno-lint-ignore no-explicit-any
async function requireSuperAdmin(req: Request, supabase: any): Promise<AuthedUser | Response> {
  const user = await resolveUser(req, supabase);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (!user.isSuperAdmin) return jsonResponse({ error: 'Forbidden — super admin required' }, 403);
  return user;
}

/** Per-device push: super admin, or an admin+ of the device's own farm. */
// deno-lint-ignore no-explicit-any
async function requireDeviceAdmin(
  req: Request, supabase: any, farmId: string | null,
): Promise<AuthedUser | Response> {
  const user = await resolveUser(req, supabase);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (user.isSuperAdmin) return user;
  if (!farmId) return jsonResponse({ error: 'Forbidden' }, 403);
  const { data: allowed } = await supabase.rpc('has_farm_role', {
    _user_id: user.id, _farm_id: farmId, _min_role: 'admin',
  });
  if (!allowed) return jsonResponse({ error: 'Forbidden' }, 403);
  return user;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ─── POST /firmware/check ───
    if (action === 'check') {
      return await handleCheck(req, url, supabase);
    }

    // ─── POST /firmware/report ───
    if (action === 'report' && req.method === 'POST') {
      return await handleReport(req, supabase);
    }

    // ─── POST /firmware/rollback ───
    if (action === 'rollback' && req.method === 'POST') {
      return await handleRollback(req, supabase);
    }

    // ─── POST /firmware/boot-report (device → cloud after boot) ───
    if (action === 'boot-report' && req.method === 'POST') {
      return await handleBootReport(req, supabase);
    }

    // ─── POST /firmware/auto-advance (cron / service-role, or super admin) ───
    if (action === 'auto-advance' && req.method === 'POST') {
      const bearer = req.headers.get('Authorization')?.replace('Bearer ', '');
      const isCron = !!bearer && bearer === supabaseServiceKey;
      if (!isCron) {
        const gate = await requireSuperAdmin(req, supabase);
        if (gate instanceof Response) return gate;
      }
      const { data, error } = await supabase.rpc('auto_advance_rollout');
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ success: true, result: data });
    }

    // ─── Admin: push update ───
    if (action === 'push' && req.method === 'POST') {
      return await handlePush(req, supabase);
    }

    // ─── Admin: start canary rollout ───
    if (action === 'start-rollout' && req.method === 'POST') {
      return await handleStartRollout(req, supabase);
    }

    // ─── Admin: advance rollout batch ───
    if (action === 'advance-rollout' && req.method === 'POST') {
      return await handleAdvanceRollout(req, supabase);
    }

    // ─── Admin: hardening summary (Phase 5) ───
    if (action === 'hardening-summary') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.rpc('ota_hardening_summary');
      if (error) return jsonResponse({ error: error.message }, 403);
      return jsonResponse(data);
    }

    // ─── Admin: list firmware (authenticated users only) ───
    if (action === 'list') {
      const caller = await resolveUser(req, supabase);
      if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { data, error } = await supabase
        .from('ota_firmware')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ firmwares: data });
    }


    // ─── Legacy progress endpoint ───
    if (action === 'progress' && req.method === 'POST') {
      return await handleLegacyProgress(req, supabase);
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('[OTA] Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─────────────────────────────────────────────
// POST /firmware/check — Device checks for update
// ─────────────────────────────────────────────
async function handleCheck(req: Request, url: URL, supabase: any) {
  const deviceToken = req.headers.get('x-device-token');
  const currentVersion = url.searchParams.get('version') || 'v0.0.0';
  const farmType = url.searchParams.get('farm_type') || 'all';
  const boardType = url.searchParams.get('board_type') || 'esp32';
  const releaseChannel = url.searchParams.get('channel') || 'stable';

  if (!deviceToken) return jsonResponse({ error: 'Missing device token' }, 401);

  const { data: device, error: deviceError } = await supabase
    .from('device_tokens')
    .select('id, user_id')
    .eq('token', deviceToken)
    .eq('is_active', true)
    .single();

  if (deviceError || !device) return jsonResponse({ error: 'Invalid device token' }, 401);

  // ─── Check firmware_registry first (new system) ───
  const { data: registryFirmware } = await supabase
    .from('firmware_registry')
    .select('*')
    .eq('is_active', true)
    .eq('release_channel', releaseChannel)
    .order('version_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (registryFirmware) {
    const current = parseVersion(currentVersion);
    const latest = parseVersion(registryFirmware.version);

    if (!isNewer(latest, current)) {
      await supabase.from('device_health')
        .update({ ota_last_check_at: new Date().toISOString() })
        .eq('device_token_id', device.id);
      return jsonResponse({ update_available: false, current_version: currentVersion });
    }

    // ─── Update window check (Asia/Dhaka) ───
    const { data: inWindow } = await supabase.rpc('is_within_update_window', { _firmware_id: registryFirmware.id });
    if (inWindow === false) {
      await supabase.from('device_health')
        .update({ ota_last_check_at: new Date().toISOString() })
        .eq('device_token_id', device.id);
      return jsonResponse({
        update_available: false,
        message: 'Outside update window',
        next_check_after_seconds: 1800,
        update_window: {
          start_hour: registryFirmware.update_window_start_hour,
          end_hour: registryFirmware.update_window_end_hour,
          tz: 'Asia/Dhaka',
        },
      });
    }

    // ─── Hardware compatibility check via firmware_registry ───
    const { data: compatResult } = await supabase
      .rpc('check_firmware_compatibility', {
        _device_token_id: device.id,
        _firmware_id: registryFirmware.id,
      });

    if (compatResult && !compatResult.compatible) {
      console.log(`[OTA] Firmware ${registryFirmware.version} incompatible with device ${device.id}: ${JSON.stringify(compatResult.reasons)}`);
      return jsonResponse({
        update_available: false,
        message: 'Firmware incompatible with device hardware',
        compatibility: compatResult,
      });
    }

    // ─── Phase 5 OTA Hardening: anti-rollback / signature / emergency-mode gates ───
    const { data: gateResult } = await supabase.rpc('evaluate_ota_safety_gates', {
      _device_token_id: device.id,
      _firmware_id: registryFirmware.id,
    });
    if (gateResult && gateResult.passed === false) {
      console.log(`[OTA] Hardening gate blocked device ${device.id}: ${JSON.stringify(gateResult.failures)}`);
      return jsonResponse({
        update_available: false,
        message: 'OTA blocked by safety hardening gate',
        gate_failures: gateResult.failures,
      });
    }

    // Update device health
    await supabase.from('device_health').update({
      ota_last_check_at: new Date().toISOString(),
      ota_version_available: registryFirmware.version,
      ota_status: 'available',
    }).eq('device_token_id', device.id);

    console.log(`[OTA] Registry update available for device ${device.id}: ${currentVersion} → ${registryFirmware.version} (${releaseChannel})`);

    // ─── Fetch signing public key (if signed) ───
    let signingKey: any = null;
    if (registryFirmware.signing_key_id) {
      const { data: keyData } = await supabase
        .from('firmware_signing_keys')
        .select('key_name, algorithm, public_key')
        .eq('id', registryFirmware.signing_key_id)
        .eq('is_active', true)
        .maybeSingle();
      signingKey = keyData;
    }

    return jsonResponse({
      update_available: true,
      version: registryFirmware.version,
      url: registryFirmware.file_url,
      size: registryFirmware.file_size_bytes,
      crc32: registryFirmware.crc32_checksum,
      sha256: registryFirmware.sha256_hex,
      signature: registryFirmware.signature_b64,
      signature_alg: registryFirmware.signature_alg,
      signing_key: signingKey,
      release_channel: registryFirmware.release_channel,
      release_notes: registryFirmware.changelog,
      firmware_id: registryFirmware.id,
      source: 'firmware_registry',
      compatibility: compatResult || { compatible: true, reasons: [] },
    });
  }

  // ─── Fallback to legacy ota_firmware table ───
  const { data: firmware } = await supabase
    .from('ota_firmware')
    .select('*')
    .eq('is_active', true)
    .eq('board_type', boardType)
    .or(`farm_type.eq.all,farm_type.eq.${farmType}`)
    .in('rollout_status', ['stable', 'rolling'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!firmware) {
    return jsonResponse({ update_available: false, message: 'No firmware available' });
  }

  const current = parseVersion(currentVersion);
  const latest = parseVersion(firmware.version);

  if (!isNewer(latest, current)) {
    await supabase.from('device_health')
      .update({ ota_last_check_at: new Date().toISOString() })
      .eq('device_token_id', device.id);
    return jsonResponse({ update_available: false, current_version: currentVersion });
  }

  // Check min_firmware_version compatibility
  if (firmware.min_firmware_version) {
    const minVer = parseVersion(firmware.min_firmware_version);
    if (!isNewer(current, minVer) && JSON.stringify(current) !== JSON.stringify(minVer)) {
      return jsonResponse({
        update_available: false,
        message: `Requires minimum firmware ${firmware.min_firmware_version}`,
        min_version_required: firmware.min_firmware_version,
      });
    }
  }

  // If rolling out, check if this device is in the target batch
  if (firmware.rollout_status === 'rolling') {
    const eligible = await isDeviceInRollout(supabase, firmware.id, device.id);
    if (!eligible) {
      return jsonResponse({ update_available: false, message: 'Not in current rollout batch' });
    }
  }

  // Update device health
  await supabase.from('device_health').update({
    ota_last_check_at: new Date().toISOString(),
    ota_version_available: firmware.version,
    ota_status: 'available',
  }).eq('device_token_id', device.id);

  console.log(`[OTA] Legacy update available for device ${device.id}: ${currentVersion} → ${firmware.version}`);

  return jsonResponse({
    update_available: true,
    version: firmware.version,
    url: firmware.url,
    size: firmware.file_size_bytes,
    checksum: firmware.checksum,
    crc32: firmware.crc32,
    board_type: firmware.board_type,
    release_notes: firmware.release_notes,
    firmware_id: firmware.id,
    source: 'ota_firmware',
  });
}

// ─────────────────────────────────────────────
// POST /firmware/report — Device reports install result
// ─────────────────────────────────────────────
async function handleReport(req: Request, supabase: any) {
  const deviceToken = req.headers.get('x-device-token');
  if (!deviceToken) return jsonResponse({ error: 'Missing device token' }, 401);

  const { data: device } = await supabase
    .from('device_tokens')
    .select('id, user_id')
    .eq('token', deviceToken)
    .eq('is_active', true)
    .single();

  if (!device) return jsonResponse({ error: 'Invalid device token' }, 401);

  const body = await req.json();
  const {
    firmware_id, status, version, error_message,
    crc_validated, board_type, partition_used,
    rollback_triggered, from_version,
    signature_validated,
  } = body;

  let effectiveStatus: string = status;
  let effectiveError: string | null = error_message || null;

  // ─── Phase 5 Hardening: refuse silent unsigned completion ───
  if (status === 'completed' && firmware_id) {
    const { data: fw } = await supabase
      .from('firmware_registry')
      .select('require_signature, signature_b64, version_code')
      .eq('id', firmware_id)
      .maybeSingle();
    if (fw?.require_signature && fw.signature_b64 && signature_validated !== true) {
      effectiveStatus = 'failed';
      effectiveError = 'signature_validation_required_but_not_reported';
      await supabase.from('ota_gate_log').insert({
        device_token_id: device.id,
        firmware_id,
        gate: 'signature_required',
        passed: false,
        reason: effectiveError,
      });
      console.log(`[OTA] Rejected unsigned completion for device ${device.id} firmware ${firmware_id}`);
    } else if (fw?.version_code) {
      // Track installed version_code for anti-rollback
      await supabase
        .from('device_tokens')
        .update({ last_installed_version_code: fw.version_code })
        .eq('id', device.id);
    }
  }

  // Upsert install log
  const logData: Record<string, unknown> = {
    firmware_id,
    device_token_id: device.id,
    user_id: device.user_id,
    to_version: version,
    from_version: from_version || 'unknown',
    status: effectiveStatus,
    crc_validated: crc_validated || false,
    board_type: board_type || 'esp32',
    partition_used: partition_used || null,
    rollback_triggered: rollback_triggered || false,
    error_message: effectiveError,
    signature_validated: signature_validated === true,
  };

  if (effectiveStatus === 'downloading') logData.download_started_at = new Date().toISOString();
  if (effectiveStatus === 'installing') logData.install_started_at = new Date().toISOString();
  if (effectiveStatus === 'completed' || effectiveStatus === 'failed') logData.completed_at = new Date().toISOString();

  const { data: existing } = await supabase
    .from('firmware_install_logs')
    .select('id')
    .eq('device_token_id', device.id)
    .eq('firmware_id', firmware_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from('firmware_install_logs').update(logData).eq('id', existing.id);
  } else {
    await supabase.from('firmware_install_logs').insert(logData);
  }

  const healthUpdate: Record<string, unknown> = { ota_status: effectiveStatus };
  if (effectiveStatus === 'completed') healthUpdate.firmware_version = version;
  await supabase.from('device_health').update(healthUpdate).eq('device_token_id', device.id);

  if (firmware_id && (effectiveStatus === 'completed' || effectiveStatus === 'failed')) {
    await updateRolloutCounters(supabase, firmware_id, effectiveStatus);
  }

  console.log(`[OTA] Report: device=${device.id} status=${effectiveStatus} version=${version}`);

  return jsonResponse({
    success: true,
    accepted_status: effectiveStatus,
    ...(effectiveError ? { warning: effectiveError } : {}),
  });
}

// ─────────────────────────────────────────────
// POST /firmware/rollback — Admin triggers rollback
// ─────────────────────────────────────────────
async function handleRollback(req: Request, supabase: any) {
  const gate = await requireSuperAdmin(req, supabase);
  if (gate instanceof Response) return gate;
  const user = gate;

  const body = await req.json();
  const { firmware_id, reason } = body;

  // Abort all active rollout batches
  await supabase.from('firmware_rollout_batches')
    .update({
      status: 'aborted',
      abort_reason: reason || 'Manual rollback triggered',
      completed_at: new Date().toISOString(),
    })
    .eq('firmware_id', firmware_id)
    .in('status', ['pending', 'active']);

  // Mark firmware rollout as aborted
  await supabase.from('ota_firmware')
    .update({ rollout_status: 'aborted', rollout_percentage: 0 })
    .eq('id', firmware_id);

  console.log(`[OTA] Rollback triggered for firmware ${firmware_id} by ${user.id}: ${reason}`);

  return jsonResponse({ success: true, message: 'Rollout aborted, devices will rollback on next boot' });
}

// ─────────────────────────────────────────────
// Admin: Push update to specific device
// ─────────────────────────────────────────────
async function handlePush(req: Request, supabase: any) {
  const { device_token_id, firmware_id } = await req.json();

  const [{ data: device }, { data: firmware }] = await Promise.all([
    supabase.from('device_tokens').select('*').eq('id', device_token_id).maybeSingle(),
    supabase.from('ota_firmware').select('*').eq('id', firmware_id).maybeSingle(),
  ]);

  if (!device) return jsonResponse({ error: 'Device not found' }, 404);

  // Farm-scoped authorization: caller must own/administer THIS device's farm.
  const gate = await requireDeviceAdmin(req, supabase, device.farm_id ?? null);
  if (gate instanceof Response) return gate;
  const user = gate;


  // Try firmware_registry if not found in ota_firmware
  let firmwareData = firmware;
  let source = 'ota_firmware';
  if (!firmwareData) {
    const { data: regFw } = await supabase
      .from('firmware_registry')
      .select('*')
      .eq('id', firmware_id)
      .single();
    if (!regFw) return jsonResponse({ error: 'Firmware not found' }, 404);
    firmwareData = regFw;
    source = 'firmware_registry';
  }

  // ─── Compatibility check before push ───
  if (source === 'firmware_registry') {
    const { data: compatResult } = await supabase
      .rpc('check_firmware_compatibility', {
        _device_token_id: device_token_id,
        _firmware_id: firmware_id,
      });

    if (compatResult && !compatResult.compatible) {
      console.log(`[OTA] Push blocked: firmware incompatible with device ${device_token_id}`);
      return jsonResponse({
        error: 'Firmware incompatible with device hardware',
        compatibility: compatResult,
      }, 400);
    }
  }

  const { data: health } = await supabase
    .from('device_health')
    .select('firmware_version')
    .eq('device_token_id', device_token_id)
    .single();

  await supabase.from('firmware_install_logs').insert({
    firmware_id,
    device_token_id,
    user_id: user.id,
    from_version: health?.firmware_version || 'unknown',
    to_version: firmwareData.version,
    status: 'pending',
    board_type: firmwareData.board_type || 'esp32',
  });

  await supabase.from('device_health').update({
    ota_version_available: firmwareData.version,
    ota_status: 'pending',
  }).eq('device_token_id', device_token_id);

  console.log(`[OTA] Push update to ${device.device_name}: ${firmwareData.version} (source: ${source})`);

  return jsonResponse({ success: true, message: 'Update pushed to device', source });
}

// ─────────────────────────────────────────────
// Admin: Start canary rollout (5% → 25% → 100%)
// ─────────────────────────────────────────────
async function handleStartRollout(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { firmware_id, stages } = await req.json();
  const rolloutStages = stages || [5, 25, 100];

  // Count total active devices
  const { count: totalDevices } = await supabase
    .from('device_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Create batches for each stage
  for (let i = 0; i < rolloutStages.length; i++) {
    await supabase.from('firmware_rollout_batches').insert({
      firmware_id,
      batch_number: i + 1,
      target_percentage: rolloutStages[i],
      status: i === 0 ? 'active' : 'pending',
      started_at: i === 0 ? new Date().toISOString() : null,
      total_devices: Math.ceil((totalDevices || 0) * rolloutStages[i] / 100),
      created_by: user.id,
    });
  }

  await supabase.from('ota_firmware').update({
    rollout_status: 'rolling',
    rollout_percentage: rolloutStages[0],
  }).eq('id', firmware_id);

  console.log(`[OTA] Canary rollout started: firmware=${firmware_id} stages=${rolloutStages}`);

  return jsonResponse({ success: true, stages: rolloutStages, total_devices: totalDevices });
}

// ─────────────────────────────────────────────
// Admin: Advance to next rollout batch
// ─────────────────────────────────────────────
async function handleAdvanceRollout(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { firmware_id } = await req.json();

  // Get current active batch
  const { data: activeBatch } = await supabase
    .from('firmware_rollout_batches')
    .select('*')
    .eq('firmware_id', firmware_id)
    .eq('status', 'active')
    .single();

  if (!activeBatch) return jsonResponse({ error: 'No active rollout batch' }, 400);

  // Check fail rate
  const totalReports = activeBatch.success_count + activeBatch.fail_count;
  if (totalReports > 0) {
    const failRate = (activeBatch.fail_count / totalReports) * 100;
    const { data: fw } = await supabase.from('ota_firmware').select('max_fail_rate').eq('id', firmware_id).single();
    const maxFailRate = fw?.max_fail_rate || 3.0;

    if (failRate > maxFailRate) {
      // Auto-abort
      await supabase.from('firmware_rollout_batches')
        .update({ status: 'aborted', abort_reason: `Fail rate ${failRate.toFixed(1)}% exceeds ${maxFailRate}%`, completed_at: new Date().toISOString() })
        .eq('id', activeBatch.id);
      await supabase.from('ota_firmware')
        .update({ rollout_status: 'aborted', rollout_percentage: 0 })
        .eq('id', firmware_id);

      console.log(`[OTA] Rollout auto-aborted: fail rate ${failRate.toFixed(1)}%`);
      return jsonResponse({ error: `Rollout aborted: fail rate ${failRate.toFixed(1)}% exceeds ${maxFailRate}%`, aborted: true }, 400);
    }
  }

  // Complete current batch
  await supabase.from('firmware_rollout_batches')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', activeBatch.id);

  // Activate next batch
  const { data: nextBatch } = await supabase
    .from('firmware_rollout_batches')
    .select('*')
    .eq('firmware_id', firmware_id)
    .eq('status', 'pending')
    .order('batch_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextBatch) {
    await supabase.from('firmware_rollout_batches')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', nextBatch.id);
    await supabase.from('ota_firmware')
      .update({ rollout_percentage: nextBatch.target_percentage })
      .eq('id', firmware_id);

    console.log(`[OTA] Advanced to batch ${nextBatch.batch_number}: ${nextBatch.target_percentage}%`);
    return jsonResponse({ success: true, batch: nextBatch.batch_number, percentage: nextBatch.target_percentage });
  }

  // All batches complete → mark stable
  await supabase.from('ota_firmware')
    .update({ rollout_status: 'stable', rollout_percentage: 100, is_stable: true })
    .eq('id', firmware_id);

  console.log(`[OTA] Rollout complete, firmware ${firmware_id} marked stable`);
  return jsonResponse({ success: true, message: 'Rollout complete, firmware is now stable' });
}

// ─── Helpers ───

async function isDeviceInRollout(supabase: any, firmwareId: string, deviceTokenId: string): Promise<boolean> {
  // Get active batch percentage
  const { data: batch } = await supabase
    .from('firmware_rollout_batches')
    .select('target_percentage')
    .eq('firmware_id', firmwareId)
    .eq('status', 'active')
    .single();

  if (!batch) return false;

  // Simple deterministic selection: hash device ID to get consistent bucket
  const hash = deviceTokenId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const bucket = Math.abs(hash) % 100;
  return bucket < batch.target_percentage;
}

async function updateRolloutCounters(supabase: any, firmwareId: string, status: string) {
  const { data: batch } = await supabase
    .from('firmware_rollout_batches')
    .select('id, success_count, fail_count')
    .eq('firmware_id', firmwareId)
    .eq('status', 'active')
    .maybeSingle();

  if (!batch) return;

  const update: Record<string, number> = {};
  if (status === 'completed') update.success_count = (batch.success_count || 0) + 1;
  if (status === 'failed') update.fail_count = (batch.fail_count || 0) + 1;

  await supabase.from('firmware_rollout_batches').update(update).eq('id', batch.id);

  // Also update firmware-level counters
  const fwUpdate: Record<string, unknown> = {};
  if (status === 'completed') fwUpdate.total_installs = batch.success_count + 1;
  if (status === 'failed') fwUpdate.failed_installs = batch.fail_count + 1;
  await supabase.from('ota_firmware').update(fwUpdate).eq('id', firmwareId);

  // Auto-abort check
  const totalReports = (batch.success_count || 0) + (batch.fail_count || 0) + 1;
  const failCount = status === 'failed' ? (batch.fail_count || 0) + 1 : (batch.fail_count || 0);
  if (totalReports >= 3) {
    const failRate = (failCount / totalReports) * 100;
    const { data: fw } = await supabase.from('ota_firmware').select('max_fail_rate').eq('id', firmwareId).single();
    if (fw && failRate > (fw.max_fail_rate || 3.0)) {
      await supabase.from('firmware_rollout_batches')
        .update({ status: 'aborted', abort_reason: `Auto-abort: ${failRate.toFixed(1)}% fail rate`, completed_at: new Date().toISOString() })
        .eq('id', batch.id);
      await supabase.from('ota_firmware')
        .update({ rollout_status: 'aborted', rollout_percentage: 0 })
        .eq('id', firmwareId);
      console.log(`[OTA] Auto-abort: ${failRate.toFixed(1)}% fail rate for firmware ${firmwareId}`);
    }
  }
}

// ─── Legacy progress handler ───
async function handleLegacyProgress(req: Request, supabase: any) {
  const deviceToken = req.headers.get('x-device-token');
  if (!deviceToken) return jsonResponse({ error: 'Missing device token' }, 401);

  const { data: device } = await supabase
    .from('device_tokens')
    .select('id, user_id')
    .eq('token', deviceToken)
    .eq('is_active', true)
    .single();

  if (!device) return jsonResponse({ error: 'Invalid device token' }, 401);

  const { progress, status, version, error_message } = await req.json();

  await supabase.from('device_health').update({
    ota_progress: progress,
    ota_status: status,
    ...(status === 'completed' && { firmware_version: version }),
  }).eq('device_token_id', device.id);

  return jsonResponse({ success: true });
}

// ─────────────────────────────────────────────
// POST /firmware/boot-report — ESP32 reports boot success/failure
// ─────────────────────────────────────────────
async function handleBootReport(req: Request, supabase: any) {
  const deviceToken = req.headers.get('x-device-token');
  if (!deviceToken) return jsonResponse({ error: 'Missing device token' }, 401);

  const { data: device } = await supabase
    .from('device_tokens').select('id').eq('token', deviceToken).eq('is_active', true).single();
  if (!device) return jsonResponse({ error: 'Invalid device token' }, 401);

  const body = await req.json();
  const { firmware_id, boot_success, from_version, signature_validated } = body;
  if (!firmware_id) return jsonResponse({ error: 'firmware_id required' }, 400);

  if (boot_success === true) {
    // Boot OK → mark complete
    await supabase.from('firmware_install_logs').update({
      status: 'completed',
      boot_succeeded: true,
      last_boot_at: new Date().toISOString(),
      signature_validated: signature_validated === true,
      completed_at: new Date().toISOString(),
    }).eq('device_token_id', device.id).eq('firmware_id', firmware_id);

    await updateRolloutCounters(supabase, firmware_id, 'completed');
    return jsonResponse({ success: true, should_rollback: false });
  }

  // Boot fail → increment counter, possibly rollback
  const { data: result } = await supabase.rpc('report_boot_failure', {
    _device_token_id: device.id,
    _firmware_id: firmware_id,
    _from_version: from_version || null,
  });

  if (result?.should_rollback) {
    await updateRolloutCounters(supabase, firmware_id, 'failed');
    console.log(`[OTA] Auto-rollback triggered for device ${device.id} firmware ${firmware_id}`);
  }

  return jsonResponse({ success: true, ...result });
}
