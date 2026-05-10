import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { newObsCtx, recordObservability, type ObsCtx } from "./observability.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token, x-timestamp, x-nonce, x-signature, x-secret-version',
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 Phase 1 — HMAC SIGNATURE VERIFICATION
// Signature = HMAC-SHA256(secret, `${timestamp}.${nonce}.${rawBody}`)
// Headers required when device.secret_version >= 1:
//   X-Timestamp (unix seconds, ±300s window)
//   X-Nonce     (random, unique per request, 5min replay window)
//   X-Signature (hex)
//   X-Secret-Version (optional, for clarity)
// ═══════════════════════════════════════════════════════════════════════════
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface SignatureCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
  code?: string;
}

async function verifyDeviceSignature(
  supabase: any,
  device: { id: string; user_id: string; farm_id: string | null },
  rawBody: string,
  headers: Headers,
): Promise<SignatureCheckResult> {
  // Fetch secret + version
  const { data: secretRow } = await supabase
    .from('device_tokens')
    .select('device_secret, previous_device_secret, previous_secret_expires_at, secret_version')
    .eq('id', device.id)
    .maybeSingle();

  const version = secretRow?.secret_version ?? 0;
  if (version < 1) {
    // Legacy device — signature not required
    return { ok: true };
  }

  const sigHeader = headers.get('x-signature');
  const tsHeader = headers.get('x-timestamp');
  const nonce = headers.get('x-nonce');

  const audit = (reason: string) => supabase.rpc('log_security_event', {
    _event_type: 'signature_invalid',
    _user_id: device.user_id,
    _farm_id: device.farm_id,
    _device_token_id: device.id,
    _success: false,
    _details: { reason },
  }).then(() => {}, () => {});

  if (!sigHeader || !tsHeader || !nonce) {
    audit('missing_signature_headers');
    return { ok: false, status: 401, error: 'Missing signature headers', code: 'MISSING_SIGNATURE' };
  }

  const ts = parseInt(tsHeader, 10);
  if (!Number.isFinite(ts)) {
    audit('bad_timestamp');
    return { ok: false, status: 401, error: 'Invalid timestamp', code: 'BAD_TIMESTAMP' };
  }
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > 300) {
    audit('timestamp_drift_' + skew + 's');
    return { ok: false, status: 401, error: 'Timestamp out of window', code: 'TIMESTAMP_DRIFT' };
  }

  const message = `${tsHeader}.${nonce}.${rawBody}`;
  const expectedCurrent = await hmacSha256Hex(secretRow!.device_secret || '', message);
  let matched = secretRow!.device_secret && timingSafeEqual(expectedCurrent, sigHeader.toLowerCase());

  if (!matched && secretRow!.previous_device_secret &&
      secretRow!.previous_secret_expires_at &&
      new Date(secretRow!.previous_secret_expires_at) > new Date()) {
    const expectedPrev = await hmacSha256Hex(secretRow!.previous_device_secret, message);
    matched = timingSafeEqual(expectedPrev, sigHeader.toLowerCase());
  }

  if (!matched) {
    audit('signature_mismatch');
    await supabase.from('device_tokens')
      .update({ signature_failure_count: (await supabase.from('device_tokens')
        .select('signature_failure_count').eq('id', device.id).single()).data?.signature_failure_count + 1 || 1 })
      .eq('id', device.id);
    return { ok: false, status: 401, error: 'Invalid signature', code: 'BAD_SIGNATURE' };
  }

  // Replay protection: consume nonce
  const { data: nonceOk } = await supabase.rpc('consume_device_nonce', {
    _device_token_id: device.id, _nonce: nonce,
  });
  if (!nonceOk) {
    supabase.rpc('log_security_event', {
      _event_type: 'nonce_reuse',
      _user_id: device.user_id,
      _farm_id: device.farm_id,
      _device_token_id: device.id,
      _success: false,
      _details: { nonce },
    }).then(() => {}, () => {});
    return { ok: false, status: 409, error: 'Nonce already used', code: 'NONCE_REUSE' };
  }

  await supabase.from('device_tokens')
    .update({ last_signature_at: new Date().toISOString() })
    .eq('id', device.id);

  return { ok: true };
}


// ═══════════════════════════════════════════════════════════════════════════
// 🔥 HEAT STRESS INDEX (HSI) — THI FORMULA (aligned with firmware v8.0.0)
// Formula: THI = 0.8 × Temp + (Humidity / 100) × (Temp − 14.4) + 46.4
// 
// | THI    | Status      | Action         |
// |--------|-------------|----------------|
// | < 75   | Normal      | Fan OFF        |
// | 75-80  | Mild Stress | Fan LOW        |
// | 80-85  | High Stress | Fan HIGH       |
// | > 85   | Danger      | Fan HIGH+Alert |
// ═══════════════════════════════════════════════════════════════════════════
function calculateHSI(temperature: number, humidity: number): number {
  return 0.8 * temperature + (humidity / 100) * (temperature - 14.4) + 46.4;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 HSI-BASED AUTOMATION (Cloud Side Rule Engine — THI aligned)
// IF THI > 85 → fan = HIGH, alert = ON
// Cloud থাকলে advanced decision
// Cloud না থাকলেও ESP32 একই কাজ করবে (local rules)
// ═══════════════════════════════════════════════════════════════════════════
async function applyHSIAutomation(
  supabase: any, 
  userId: string, 
  level: 'NORMAL' | 'MILD' | 'HIGH' | 'DANGER',
  hsi: number,
  shedId?: string | null
): Promise<void> {
  try {
    // Check if HSI automation is enabled, automation_mode is AUTO, and not in manual override
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('hsi_automation_enabled, automation_mode')
      .eq('user_id', userId)
      .single();
    
    if (!settings?.hsi_automation_enabled) {
      console.log('HSI automation disabled, skipping');
      return;
    }

    // ★ CHECK automation_mode — skip if MANUAL
    if (settings.automation_mode === 'MANUAL') {
      console.log(`⏸️ [HSI] MANUAL mode active for user ${userId}, skipping HSI automation`);
      return;
    }
    
    // Build query for device_status - filter by shed if provided
    let deviceQuery = supabase
      .from('device_status')
      .select('id, manual_override, desired_manual_override, shed_id')
      .eq('user_id', userId);
    
    if (shedId) {
      deviceQuery = deviceQuery.eq('shed_id', shedId);
    }
    
    const { data: deviceStatus } = await deviceQuery.maybeSingle();
    
    // Check BOTH manual_override (set by ESP32) AND desired_manual_override (set by app)
    if (deviceStatus?.manual_override || deviceStatus?.desired_manual_override) {
      console.log(`Manual override active for shed ${shedId || 'default'}, skipping HSI automation`);
      return;
    }

    // Apply automation based on HSI level
    // IMPORTANT: Cloud writes to desired_* columns ONLY
    // ESP32 is the single source of truth for actual relay state
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    switch (level) {
      case 'DANGER':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'HIGH';
        updates.desired_alarm_on = true;
        console.log(`🚨 [Shed: ${shedId || 'default'}] HSI DANGER (${hsi.toFixed(1)}) → desired: Fan HIGH + Alarm ON`);
        break;
        
      case 'HIGH':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'HIGH';
        console.log(`⚠️ [Shed: ${shedId || 'default'}] HSI HIGH (${hsi.toFixed(1)}) → desired: Fan HIGH`);
        break;
        
      case 'MILD':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'LOW';
        console.log(`🌡️ [Shed: ${shedId || 'default'}] HSI MILD (${hsi.toFixed(1)}) → desired: Fan LOW`);
        break;
        
      case 'NORMAL':
        updates.desired_fan_on = false;
        updates.desired_fan_speed = 'OFF';
        updates.desired_alarm_on = false;
        console.log(`✅ [Shed: ${shedId || 'default'}] HSI NORMAL (${hsi.toFixed(1)}) → desired: Fan OFF`);
        break;
    }
    
    // Update desired_state for specific shed or default
    let updateQuery = supabase
      .from('device_status')
      .update(updates)
      .eq('user_id', userId);
    
    if (shedId) {
      updateQuery = updateQuery.eq('shed_id', shedId);
    }
    
    await updateQuery;
      
  } catch (error) {
    console.error('HSI automation error:', error);
  }
}

interface SensorPayload {
  // Multi-shed support
  farm_id?: string;
  shed_id?: string;
  device_id?: string;
  device_token?: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage?: number;
  water_flow?: number;
  light_lux?: number;
  power_status?: string;
  timestamp?: string;
  // Phase 9 — precise/industrial sensors (all optional)
  temp_precise?: number;       // SHT31
  humidity_precise?: number;   // SHT31
  lux_precise?: number;        // BH1750
  nh3_ppm_precise?: number;    // ZE03-NH3
  co2_ppm?: number;            // SCD41
  pm25_ugm3?: number;          // PMS5003
  pm10_ugm3?: number;          // PMS5003
  sensor_source?: Record<string, string>;
  device_id?: string;
  shed_id?: string;
}

interface DeviceStatusPayload {
  device_id?: string;
  shed_id?: string;
  power_on?: boolean;
  fan_on?: boolean;
  light_on?: boolean;
  alarm_on?: boolean;
  device_token?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 DEVICE STATE PAYLOAD
// ESP32 reports its current operational state to cloud
// This is for status transparency and monitoring
// ═══════════════════════════════════════════════════════════════════════════
interface DeviceStatePayload {
  device_id?: string;
  shed_id?: string;
  mode: 'AUTO' | 'MANUAL' | 'FAIL_SAFE';
  fan_speed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  fan_on?: boolean;
  light_on?: boolean;
  alarm: 'ON' | 'OFF';
  hsi: number;
  system_state: 'NORMAL' | 'MILD_STRESS' | 'HIGH_STRESS' | 'DANGER' | 'FAIL_SAFE';
  temperature?: number;
  humidity?: number;
  ammonia?: number;
  power_source?: 'MAINS' | 'BATTERY' | 'UPS';
  battery_level?: number;
  uptime_seconds?: number;
  last_cloud_sync?: string;
  failsafe_reason?: string;
  // Production reliability fields v6.0
  firmware_version?: string;
  restart_reason?: string;
  restart_count?: number;
  safe_mode_active?: boolean;
  safe_mode_until?: string;
  power_event_type?: string;
  last_power_event_at?: string;
  gas_warmup_done?: boolean;
  gas_warmup_start?: string;
  ammonia_avg_10?: number;
  consecutive_high_ammonia?: number;
  power_voltage_rms?: number;
  offline_buffer_count?: number;
  last_age_sync_at?: string;
  ota_status?: string;
  ota_progress?: number;
  online_duration_seconds?: number;
  offline_duration_seconds?: number;
  total_restarts?: number;
  // State authority model fields
  safety_override?: boolean;
  safety_override_reason?: string;
  heater_on?: boolean;
  fogger_on?: boolean;
  circulation_fan_on?: boolean;
}

async function proxySafetyEngine(
  action: 'evaluate' | 'forensic_log',
  body: any,
  userId: string,
  deviceFarmId?: string | null,
  deviceShedId?: string | null
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const payload = {
    ...body,
    user_id: userId,
    farm_id: deviceFarmId || body?.farm_id || null,
    shed_id: deviceShedId || body?.shed_id || null,
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/safety-engine?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') ?? ''}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  return new Response(text || JSON.stringify({ success: response.ok }), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}

// ───── Phase 2: Observability wrapper ─────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const start = Date.now();
  const obs: ObsCtx & { supabase?: any } = newObsCtx();
  let response: Response;
  try {
    response = await handleEsp32Request(req, obs);
  } catch (error) {
    console.error('ESP32 API error:', error);
    obs.error_code = 'INTERNAL_ERROR';
    obs.error_message = String((error as Error)?.message ?? error);
    response = new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (obs.supabase) {
    recordObservability(obs.supabase, 'esp32-api', req, response, Date.now() - start, obs);
  }
  return response;
});

async function handleEsp32Request(req: Request, obs: ObsCtx & { supabase?: any }): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  obs.supabase = supabase;
  {

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Phase 2 — public health self-check (no auth, super lightweight)
    if (path === 'health' && req.method === 'GET') {
      const t0 = Date.now();
      let dbOk = true;
      try {
        await supabase.from('device_tokens').select('id', { count: 'exact', head: true }).limit(1);
      } catch { dbOk = false; }
      return new Response(
        JSON.stringify({
          ok: dbOk,
          db_latency_ms: Date.now() - t0,
          time: new Date().toISOString(),
          version: 'esp32-api-v2',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For POST requests, try to get device token from body first, then header
    let deviceToken = req.headers.get('x-device-token') || '';
    let bodyData: any = null;
    let rawBody = '';

    if (req.method === 'POST') {
      rawBody = await req.text();
      try {
        bodyData = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body', code: 'BAD_JSON' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!deviceToken && bodyData.device_id) {
        const { data: deviceByName } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('device_name', bodyData.device_id)
          .eq('is_active', true)
          .single();
        if (deviceByName) deviceToken = deviceByName.token;
      }
      if (!deviceToken && bodyData.device_token) {
        deviceToken = bodyData.device_token;
      }
    }

    // For GET requests, support device_id from query params
    if (req.method === 'GET') {
      const queryDeviceId = url.searchParams.get('device_id');
      if (!deviceToken && queryDeviceId) {
        const { data: deviceByName } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('device_name', queryDeviceId)
          .eq('is_active', true)
          .single();
        
        if (deviceByName) {
          deviceToken = deviceByName.token;
        }
      }
    }
    
    if (!deviceToken) {
      // Audit log: missing token
      try {
        await supabase.rpc('log_security_event', {
          _event_type: 'device_auth_failure',
          _success: false,
          _details: { reason: 'missing_token', path: req.url },
        });
      } catch { /* never let logging break the request */ }
      return new Response(
        JSON.stringify({ error: 'Missing device token or device_id', code: 'MISSING_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device token, get user AND farm_id (multi-tenant isolation)
    const { data: device, error: deviceError } = await supabase
      .from('device_tokens')
      .select('id, user_id, is_active, farm_id, shed_id')
      .eq('token', deviceToken)
      .single();

    if (deviceError || !device) {
      console.error('Device token validation failed:', deviceError);
      try {
        await supabase.rpc('log_security_event', {
          _event_type: 'device_auth_failure',
          _success: false,
          _details: { reason: 'invalid_token', token_prefix: deviceToken.substring(0, 8) },
        });
      } catch { /* swallow */ }
      return new Response(
        JSON.stringify({ error: 'Invalid device token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!device.is_active) {
      try {
        await supabase.rpc('log_security_event', {
          _event_type: 'device_auth_failure',
          _user_id: device.user_id,
          _farm_id: device.farm_id,
          _device_token_id: device.id,
          _success: false,
          _details: { reason: 'device_inactive' },
        });
      } catch { /* swallow */ }
      return new Response(
        JSON.stringify({ error: 'Device is deactivated', code: 'DEVICE_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ───── Phase 1: HMAC signature verification (only if secret_version >= 1) ─────
    if (req.method === 'POST') {
      const sigCheck = await verifyDeviceSignature(supabase, device, rawBody, req.headers);
      if (!sigCheck.ok) {
        return new Response(
          JSON.stringify({ error: sigCheck.error, code: sigCheck.code }),
          { status: sigCheck.status || 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const userId = device.user_id;
    const deviceFarmId = device.farm_id;
    const deviceShedId = device.shed_id;
    // Phase 2 — populate observability context for tail logging
    obs.device_token_id = device.id;
    obs.user_id = userId;
    obs.farm_id = deviceFarmId;
    obs.payload_size_bytes = rawBody?.length ?? null;

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔒 MULTI-TENANT ISOLATION MIDDLEWARE
    // Verify that the device token is bound to a valid farm
    // and the user has access to that farm via farm_members
    // Cross-farm API access is blocked at this layer
    // ═══════════════════════════════════════════════════════════════════════════
    if (!deviceFarmId) {
      console.warn(`Device token ${deviceToken.substring(0, 8)}... has no farm_id bound`);
      // Allow legacy devices without farm_id for backward compatibility
      // but log for monitoring
    } else {
      // Verify farm membership
      const { data: farmMember, error: farmError } = await supabase
        .from('farm_members')
        .select('id')
        .eq('farm_id', deviceFarmId)
        .eq('user_id', userId)
        .maybeSingle();

      if (farmError || !farmMember) {
        console.error(`🚫 Cross-farm access blocked: user ${userId} not member of farm ${deviceFarmId}`);
        return new Response(
          JSON.stringify({ error: 'Access denied: not a member of this farm', code: 'FARM_ACCESS_DENIED' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If request body contains farm_id, verify it matches device's farm
      if (bodyData?.farm_id && bodyData.farm_id !== deviceFarmId) {
        console.error(`🚫 Farm ID mismatch: device bound to ${deviceFarmId}, request targets ${bodyData.farm_id}`);
        return new Response(
          JSON.stringify({ error: 'Farm ID mismatch: device not authorized for this farm', code: 'FARM_MISMATCH' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update device last seen
    await supabase
      .from('device_tokens')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('token', deviceToken);

    // ═══════════════════════════════════════════════════════════════════════════
    // 🛣️ API ROUTES
    // Supports both legacy paths and new /api/iot/* paths
    // 
    // POST /data or /api/iot/data     → Sensor data submission
    // GET  /commands or /api/iot/commands → Fetch pending commands
    // GET  /system-status or /api/iot/system-status → Full system status
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Route handling - support both legacy and /api/iot/* prefix
    if (req.method === 'POST' && (path === 'sensor-data' || path === 'data')) {
      return await handleSensorData(bodyData, supabase, userId);
    }

    if (req.method === 'POST' && path === 'device-status') {
      return await handleDeviceStatus(bodyData, supabase, userId);
    }

    if (req.method === 'GET' && path === 'settings') {
      return await getSettings(supabase, userId);
    }

    if (req.method === 'GET' && path === 'latest-data') {
      return await getLatestSensorData(supabase, userId);
    }

    if (req.method === 'GET' && path === 'automation-rules') {
      return await getAutomationRules(supabase, userId);
    }

    if (req.method === 'POST' && path === 'automation-rules') {
      return await createAutomationRule(bodyData, supabase, userId);
    }

    if (req.method === 'GET' && path === 'lighting-schedule') {
      return await getLightingSchedule(supabase, userId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🆕 GET /advanced-settings - Advanced automation settings for 7 modules
    // Returns: min_vent, heater, fogger, airflow, curtain, water, lighting settings
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && path === 'advanced-settings') {
      const shedId = url.searchParams.get('shed_id');
      return await getAdvancedSettings(supabase, userId, shedId);
    }

    if (req.method === 'GET' && path === 'alerts') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const unacknowledgedOnly = url.searchParams.get('unacknowledged') === 'true';
      return await getAlerts(supabase, userId, limit, unacknowledgedOnly);
    }

    if (req.method === 'GET' && path === 'commands') {
      const deviceName = url.searchParams.get('device_id') || bodyData?.device_id;
      return await getDeviceCommands(supabase, userId, deviceName);
    }

    if (req.method === 'POST' && path === 'commands-ack') {
      return await acknowledgeCommands(bodyData, supabase, userId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 COMMAND ACK PROTOCOL v2
    // POST /commands-ack-v2 - Device acknowledges with command_id + result
    // GET  /command-status   - Check command delivery status
    // POST /command-retry    - Cloud retries unacknowledged commands
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && path === 'commands-ack-v2') {
      return await acknowledgeCommandsV2(bodyData, supabase, userId);
    }

    if (req.method === 'GET' && path === 'command-status') {
      const commandId = url.searchParams.get('command_id');
      return await getCommandStatus(supabase, userId, commandId);
    }

    if (req.method === 'POST' && path === 'command-retry') {
      return await retryUnackedCommands(supabase, userId);
    }

    if (req.method === 'POST' && path === 'control') {
      return await handleControlCommand(bodyData, supabase, userId);
    }

    if (req.method === 'POST' && path === 'manual-control') {
      return await handleManualControl(bodyData, supabase, userId);
    }

    if (req.method === 'POST' && path === 'health') {
      return await handleDeviceHealth(bodyData, supabase, userId, deviceToken);
    }

    if (req.method === 'POST' && path === 'power-status') {
      return await handlePowerStatus(bodyData, supabase, userId, deviceToken);
    }

    // ===== SAFETY ENGINE PROXY ENDPOINTS =====
    // ESP32 sends these through esp32-api so the same device-token auth,
    // farm isolation, and shed binding are used for safety + forensic logs.
    if (req.method === 'POST' && path === 'safety-evaluate') {
      return await proxySafetyEngine('evaluate', bodyData, userId, deviceFarmId, deviceShedId);
    }

    if (req.method === 'POST' && path === 'forensic-log') {
      return await proxySafetyEngine('forensic_log', bodyData, userId, deviceFarmId, deviceShedId);
    }

    if (req.method === 'GET' && path === 'power-outages') {
      return await getPowerOutages(supabase, userId);
    }

    // ===== FAIL-SAFE SYNC ENDPOINT =====
    // This is the main endpoint for ESP32 fail-safe mode
    // It handles bidirectional sync and returns all needed settings for local caching
    if (req.method === 'POST' && path === 'sync') {
      return await handleFailsafeSync(bodyData, supabase, userId, deviceToken);
    }

    // ===== DEVICE STATE ENDPOINT =====
    // ESP32 reports its current operational state (mode, HSI, fan_speed, etc.)
    if (req.method === 'POST' && path === 'state') {
      return await handleDeviceState(bodyData, supabase, userId, deviceToken);
    }

    // ===== OTA UPDATE CHECK ENDPOINT =====
    // GET /ota-check - Check for available firmware updates
    if (req.method === 'GET' && path === 'ota-check') {
      const currentVersion = url.searchParams.get('version') || '5.0.0';
      const farmType = url.searchParams.get('farm_type') || 'all';
      return await checkOTAUpdate(supabase, userId, currentVersion, farmType);
    }

    // ===== OFFLINE BUFFER SYNC ENDPOINT =====
    // POST /buffer-sync - Upload buffered offline sensor data (legacy)
    if (req.method === 'POST' && path === 'buffer-sync') {
      return await handleBufferSync(bodyData, supabase, userId, deviceToken);
    }

    // ===== PHASE 3: SENSOR BATCH (offline buffer flush via RPC, audited) =====
    // POST /sensor-batch  body: { readings: [{ temperature, humidity, ammonia, recorded_at }, ...] }
    if (req.method === 'POST' && path === 'sensor-batch') {
      return await handleSensorBatch(bodyData, supabase, userId, deviceToken);
    }

    // ===== PHASE 3: CONNECTION QUALITY UPDATE =====
    // POST /quality-update  body: { wifi_rssi, consecutive_failed_syncs, last_sync_gap_seconds }
    if (req.method === 'POST' && path === 'quality-update') {
      return await handleQualityUpdate(bodyData, supabase, userId, deviceToken);
    }


    // ===== GET DEVICE STATE ENDPOINT =====
    // Get current state for a specific device/shed
    if (req.method === 'GET' && path === 'state') {
      const shedId = url.searchParams.get('shed_id');
      return await getDeviceState(supabase, userId, shedId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🆕 GET /config - Industrial Safety Model Config Endpoint
    // Cloud sends ONLY configuration parameters. ESP32 runs ALL automation locally.
    // Cloud NEVER directly controls relays.
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && path === 'config') {
      const shedId = url.searchParams.get('shed_id');
      return await getDeviceConfig(supabase, userId, shedId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🆕 GET /system-status - Complete system status for ESP32
    // Returns: settings, automation rules, device status, lighting, commands
    // This is the "one-call-gets-all" endpoint for ESP32 boot/sync
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && path === 'system-status') {
      const shedId = url.searchParams.get('shed_id');
      const deviceName = url.searchParams.get('device_id');
      return await getSystemStatus(supabase, userId, shedId, deviceName);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🐔 SET FARM PROFILE ENDPOINT
    // Sets farm_profile (0=Layer, 1=Broiler) for ESP32 to store in EEPROM
    // POST /set-farm-profile { "farm_profile": 0 or 1, "broiler_age_days": 14 }
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && path === 'set-farm-profile') {
      return await handleSetFarmProfile(bodyData, supabase, userId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 UPDATE AGE ENDPOINT
    // Updates broiler age - App → API → ESP32 (via sync response) → EEPROM
    // POST /update-age { "age_days": 14 }
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && path === 'update-age') {
      return await handleUpdateAge(bodyData, supabase, userId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔧 HARDWARE PROFILE REGISTRATION
    // ESP32 self-registers its board_type, relay_count, features on boot
    // POST /hardware-profile { board_type, relay_count, features, gpio_map }
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'POST' && path === 'hardware-profile') {
      return await handleHardwareProfile(bodyData, supabase, userId, deviceToken, deviceFarmId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔍 FIRMWARE COMPATIBILITY CHECK
    // GET /firmware-compat?firmware_id=xxx
    // Returns compatibility result for this device + firmware pair
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && path === 'firmware-compat') {
      const firmwareId = url.searchParams.get('firmware_id');
      if (!firmwareId) {
        return new Response(
          JSON.stringify({ error: 'Missing firmware_id', code: 'MISSING_PARAM' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Get device token ID
      const { data: devToken } = await supabase
        .from('device_tokens')
        .select('id')
        .eq('token', deviceToken)
        .single();
      if (!devToken) {
        return new Response(
          JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: compatResult } = await supabase
        .rpc('check_firmware_compatibility', {
          _device_token_id: devToken.id,
          _firmware_id: firmwareId,
        });
      return new Response(
        JSON.stringify({ success: true, compatibility: compatResult }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } // end inner block (errors propagate to outer Deno.serve wrapper)
  // Unreachable: every endpoint above returns explicitly.
  return new Response(
    JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🐔 SET FARM PROFILE HANDLER
// Updates user's farm_type and returns confirmation for ESP32
// ESP32 stores this in EEPROM and uses appropriate automation
// ═══════════════════════════════════════════════════════════════════════════
interface SetFarmProfilePayload {
  farm_profile: number;  // 0 = Layer, 1 = Broiler
  broiler_age_days?: number;
  shed_id?: string;
}

async function handleSetFarmProfile(body: SetFarmProfilePayload, supabase: any, userId: string) {
  try {
    const { farm_profile, broiler_age_days } = body;
    
    // Validate farm_profile
    if (farm_profile !== 0 && farm_profile !== 1) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid farm_profile. Use 0 for Layer, 1 for Broiler', 
          code: 'INVALID_PROFILE' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const farmType = farm_profile === 0 ? 'layer' : 'broiler';
    
    // Update shed's farm_type (per-shed farm type support)
    const shedId = body.shed_id;
    if (shedId) {
      const { error: shedError } = await supabase
        .from('sheds')
        .update({ 
          farm_type: farmType,
          updated_at: new Date().toISOString()
        })
        .eq('id', shedId)
        .eq('user_id', userId);
      
      if (shedError) {
        console.error('Error updating shed farm_type:', shedError);
      }
    }
    
    // Also update profile for backward compatibility
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        farm_type: farmType,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (profileError) {
      console.error('Error updating farm profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to update farm profile', code: 'UPDATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`✓ Farm profile set: ${farmType.toUpperCase()}${farm_profile === 1 ? ` (Day ${broiler_age_days || 1})` : ''}`);
    
    // Response for ESP32 to store in EEPROM
    const response = {
      success: true,
      farm_profile: farm_profile,
      farm_type: farmType.toUpperCase(),
      broiler_age_days: broiler_age_days || 1,
      message: farm_profile === 0 
        ? '🥚 Farm profile set to LAYER (fixed temp: 18-27°C)' 
        : `🐔 Farm profile set to BROILER (Day ${broiler_age_days || 1})`,
       command: {
         switch_farm_mode: farm_profile,
         restart_required: true
       },
      thresholds: farm_profile === 0 
        ? {
            temp_ideal_min: 18, temp_ideal_max: 27, temp_fan_high: 30, temp_alarm: 33,
            ammonia_fan: 15, ammonia_alarm: 25, hsi_fan_low: 75, hsi_fan_high: 80, hsi_emergency: 85
          }
        : {
            temp_curve: 'age-based', temp_fan_deviation: 2, temp_heater_deviation: 2, temp_alarm_deviation: 4,
            ammonia_fan: 20, ammonia_alarm: 30, hsi_fan_high: 78, hsi_emergency: 82, hsi_critical: 86
          },
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in handleSetFarmProfile:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 UPDATE AGE HANDLER
// Updates broiler age when changed from the app
// The new age is stored in broiler_batches and sent to ESP32 on next sync
// ═══════════════════════════════════════════════════════════════════════════
interface UpdateAgePayload {
  age_days: number;
  batch_id?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 HARDWARE PROFILE REGISTRATION
// ESP32 sends board_type, relay_count, features[], gpio_map on boot
// Upserts into device_hardware_profiles for compatibility checking
// ═══════════════════════════════════════════════════════════════════════════
async function handleHardwareProfile(
  body: any, supabase: any, userId: string, deviceToken: string, farmId?: string | null
) {
  try {
    const { board_type, relay_count, features, gpio_map } = body;

    if (!board_type) {
      return new Response(
        JSON.stringify({ error: 'Missing board_type', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device token ID
    const { data: device } = await supabase
      .from('device_tokens')
      .select('id, farm_id')
      .eq('token', deviceToken)
      .single();

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileData = {
      device_token_id: device.id,
      farm_id: farmId || device.farm_id || null,
      board_type: board_type || 'esp32_devkit_v1',
      relay_count: relay_count ?? 4,
      features: features || [],
      gpio_map: gpio_map || {},
    };

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('device_hardware_profiles')
      .select('id')
      .eq('device_token_id', device.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('device_hardware_profiles')
        .update(profileData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('device_hardware_profiles')
        .insert(profileData);
    }

    console.log(`[HW] Hardware profile registered: ${board_type}, ${relay_count} relays, features=${JSON.stringify(features)}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Hardware profile registered' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[HW] Hardware profile error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to register hardware profile', code: 'HW_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateAge(body: UpdateAgePayload, supabase: any, userId: string) {
  try {
    const { age_days, batch_id } = body;
    
    // ══════════════════════════════════════════════════════════════
    // 🔬 BIOLOGICAL PLAUSIBILITY VALIDATION
    // Rule 1: age must be 0–60 days
    // Rule 2: age cannot jump >2 days within 24 hours
    // If age missing: use locally incremented age from batch start_date
    // All overrides logged as age_override_event
    // ══════════════════════════════════════════════════════════════
    
    // Rule 1: Range validation (0-60 days for broiler biological cycle)
    if (typeof age_days !== 'number' || age_days < 0 || age_days > 60) {
      // Log rejection
      await supabase.from('farm_audit_logs').insert({
        user_id: userId,
        action_type: 'age_override_event',
        action_category: 'safety',
        severity: 'warning',
        source: 'api',
        metadata: { 
          submitted_age: age_days, 
          rejection_reason: 'outside_biological_range',
          valid_range: '0-60 days'
        },
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Invalid age_days. Must be between 0 and 60 for broiler biological cycle. Received: ${age_days}`, 
          code: 'AGE_OUT_OF_RANGE' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Rule 2: Jump validation — age cannot change >2 days in 24 hours
    // Fetch the current active batch to compare
    const { data: currentBatch } = await supabase
      .from('broiler_batches')
      .select('start_date, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (currentBatch?.start_date) {
      const currentAge = Math.floor(
        (Date.now() - new Date(currentBatch.start_date).getTime()) / (24 * 60 * 60 * 1000)
      );
      const ageDelta = Math.abs(age_days - currentAge);
      const lastUpdate = currentBatch.updated_at ? new Date(currentBatch.updated_at) : null;
      const hoursSinceUpdate = lastUpdate 
        ? (Date.now() - lastUpdate.getTime()) / (60 * 60 * 1000) 
        : Infinity;
      
      if (ageDelta > 2 && hoursSinceUpdate < 24) {
        // Log rejection
        await supabase.from('farm_audit_logs').insert({
          user_id: userId,
          action_type: 'age_override_event',
          action_category: 'safety',
          severity: 'warning',
          source: 'api',
          metadata: { 
            submitted_age: age_days,
            current_age: currentAge,
            delta: ageDelta,
            hours_since_last_update: Math.round(hoursSinceUpdate),
            rejection_reason: 'jump_exceeds_2_days_in_24h'
          },
        });
        
        return new Response(
          JSON.stringify({ 
            error: `Age jump too large. Current age: ${currentAge} days, submitted: ${age_days} days (delta: ${ageDelta}). Max allowed jump is 2 days within 24 hours.`, 
            code: 'AGE_JUMP_TOO_LARGE',
            current_age: currentAge,
            submitted_age: age_days,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Check if user's active shed has broiler farm type
    const { data: activeBatchCheck } = await supabase
      .from('broiler_batches')
      .select('shed_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let isBroilerShed = false;
    if (activeBatchCheck?.shed_id) {
      const { data: shed } = await supabase
        .from('sheds')
        .select('farm_type')
        .eq('id', activeBatchCheck.shed_id)
        .single();
      isBroilerShed = shed?.farm_type === 'broiler';
    }
    
    if (!isBroilerShed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('farm_type')
        .eq('id', userId)
        .single();
      isBroilerShed = profile?.farm_type === 'broiler';
    }
    
    if (!isBroilerShed) {
      return new Response(
        JSON.stringify({ 
          error: 'Age update only available for broiler farms', 
          code: 'NOT_BROILER' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate new start_date based on age_days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - age_days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Update active batch
    let updateQuery = supabase
      .from('broiler_batches')
      .update({ 
        start_date: startDateStr,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (batch_id) {
      updateQuery = updateQuery.eq('id', batch_id);
    }
    
    const { error: batchError } = await updateQuery;
    
    if (batchError) {
      console.error('Error updating batch age:', batchError);
    }
    
    // Log successful age update
    await supabase.from('farm_audit_logs').insert({
      user_id: userId,
      action_type: 'age_override_event',
      action_category: 'farm',
      severity: 'info',
      source: 'api',
      metadata: { 
        new_age_days: age_days,
        start_date: startDateStr,
        batch_id: batch_id || null,
        accepted: true
      },
    });
    
    console.log(`✓ Broiler age updated: Day ${age_days}`);
    
    // Get target temperature for this age
    const targetTemp = getBroilerTargetTemp(age_days);
    
    const response = {
      success: true,
      age_days: age_days,
      start_date: startDateStr,
      target_temp: targetTemp,
      message: `🐔 Broiler age set to Day ${age_days} (Target: ${targetTemp.min}-${targetTemp.max}°C)`,
      command: {
        set_broiler_age: age_days
      },
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in handleUpdateAge:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper: Get broiler target temperature based on age
function getBroilerTargetTemp(ageDays: number): { min: number; max: number } {
  const curve = [
    { minDays: 1, maxDays: 3, minTemp: 33, maxTemp: 34 },
    { minDays: 4, maxDays: 7, minTemp: 32, maxTemp: 32 },
    { minDays: 8, maxDays: 14, minTemp: 30, maxTemp: 30 },
    { minDays: 15, maxDays: 21, minTemp: 28, maxTemp: 28 },
    { minDays: 22, maxDays: 28, minTemp: 26, maxTemp: 26 },
    { minDays: 29, maxDays: 35, minTemp: 24, maxTemp: 24 },
    { minDays: 36, maxDays: 999, minTemp: 22, maxTemp: 23 },
  ];
  
  for (const range of curve) {
    if (ageDays >= range.minDays && ageDays <= range.maxDays) {
      return { min: range.minTemp, max: range.maxTemp };
    }
  }
  
  return { min: 22, max: 23 }; // Default for 36+ days
}

async function handleSensorData(body: SensorPayload, supabase: any, userId: string) {
  try {
    // Support both water_usage and water_flow field names
    const waterUsage = body.water_usage ?? body.water_flow ?? 0;
    
    // Validate sensor data
    if (
      typeof body.temperature !== 'number' ||
      typeof body.humidity !== 'number' ||
      typeof body.ammonia !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid sensor data format', code: 'INVALID_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏭 MULTI-SHED SUPPORT
    // Each shed is an independent fail-safe unit
    // shed_id can come from: body.shed_id OR device_tokens.shed_id
    // ═══════════════════════════════════════════════════════════════════════════
    let shedId: string | null = body.shed_id || null;
    let shedName: string | null = null;
    
    // If no shed_id in body, try to get from device_tokens based on device_id
    if (!shedId && body.device_id) {
      const { data: deviceInfo } = await supabase
        .from('device_tokens')
        .select('shed_id, sheds(name, name_en)')
        .eq('device_name', body.device_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (deviceInfo?.shed_id) {
        shedId = deviceInfo.shed_id;
        shedName = deviceInfo.sheds?.name || deviceInfo.sheds?.name_en || null;
      }
    }
    
    // If shed_id provided, validate it belongs to user
    if (shedId) {
      const { data: shedInfo } = await supabase
        .from('sheds')
        .select('id, name, name_en')
        .eq('id', shedId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!shedInfo) {
        console.warn(`Invalid shed_id ${shedId} for user ${userId}, ignoring shed assignment`);
        shedId = null;
      } else {
        shedName = shedInfo.name || shedInfo.name_en;
      }
    }

    // Insert sensor reading with shed_id
    const sensorInsertData: Record<string, any> = {
      user_id: userId,
      temperature: body.temperature,
      humidity: body.humidity,
      ammonia: body.ammonia,
      water_usage: waterUsage,
    };

    // Optional ambient light from LDR (only if device has it connected)
    if (typeof body.light_lux === 'number' && body.light_lux >= 0) {
      sensorInsertData.light_lux = body.light_lux;
    }

    // Phase 9 — industrial-grade sensor values (optional, additive)
    if (typeof body.temp_precise === 'number') sensorInsertData.temp_precise = body.temp_precise;
    if (typeof body.humidity_precise === 'number') sensorInsertData.humidity_precise = body.humidity_precise;
    if (typeof body.lux_precise === 'number') sensorInsertData.lux_precise = body.lux_precise;
    if (typeof body.nh3_ppm_precise === 'number') sensorInsertData.nh3_ppm_precise = body.nh3_ppm_precise;
    if (typeof body.co2_ppm === 'number') sensorInsertData.co2_ppm = Math.round(body.co2_ppm);
    if (typeof body.pm25_ugm3 === 'number') sensorInsertData.pm25_ugm3 = body.pm25_ugm3;
    if (typeof body.pm10_ugm3 === 'number') sensorInsertData.pm10_ugm3 = body.pm10_ugm3;
    if (body.sensor_source && typeof body.sensor_source === 'object') {
      sensorInsertData.sensor_source = body.sensor_source;
    }

    if (shedId) {
      sensorInsertData.shed_id = shedId;
    }
    
    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert(sensorInsertData);

    if (insertError) {
      console.error('Sensor insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save sensor data', code: 'INSERT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 9 — auto air-quality threshold check (fire-and-forget)
    const hasAirQuality = body.co2_ppm != null || body.pm25_ugm3 != null ||
                          body.pm10_ugm3 != null || body.nh3_ppm_precise != null;
    if (hasAirQuality) {
      try {
        const { data: farmRow } = await supabase
          .from('farms').select('id').eq('owner_id', userId).limit(1).maybeSingle();
        if (farmRow?.id) {
          await supabase.rpc('check_air_quality_thresholds', {
            p_farm_id: farmRow.id,
            p_shed_id: shedId,
            p_co2: body.co2_ppm ?? null,
            p_pm25: body.pm25_ugm3 ?? null,
            p_pm10: body.pm10_ugm3 ?? null,
            p_nh3: body.nh3_ppm_precise ?? null,
          });
        }
      } catch (e) {
        console.warn('Air quality threshold check failed:', e);
      }
    }

    // Phase 9 — sensor inventory heartbeat (track which sensors active)
    if (body.sensor_source && body.device_id) {
      try {
        const { data: farmRow } = await supabase
          .from('farms').select('id').eq('owner_id', userId).limit(1).maybeSingle();
        if (farmRow?.id) {
          const SENSOR_TYPE_MAP: Record<string, string> = {
            temp: 'temp_humidity', humidity: 'temp_humidity',
            nh3: 'ammonia', light: 'light',
            co2: 'co2', pm25: 'particulate', pm10: 'particulate',
          };
          const seen = new Set<string>();
          for (const [meas, model] of Object.entries(body.sensor_source)) {
            const sType = SENSOR_TYPE_MAP[meas];
            if (!sType || seen.has(`${sType}|${model}`)) continue;
            seen.add(`${sType}|${model}`);
            await supabase.from('device_sensor_inventory').upsert({
              device_id: body.device_id,
              farm_id: farmRow.id,
              sensor_type: sType,
              sensor_model: String(model),
              is_active: true,
              last_seen_at: new Date().toISOString(),
            }, { onConflict: 'device_id,sensor_type,sensor_model' });
          }
        }
      } catch (e) {
        console.warn('Sensor inventory heartbeat failed:', e);
      }
    }

    // Handle power_status if provided - update for specific shed
    if (body.power_status) {
      const powerOn = body.power_status.toUpperCase() === 'ON';
      
      let powerQuery = supabase
        .from('device_status')
        .update({ power_on: powerOn, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      if (shedId) {
        powerQuery = powerQuery.eq('shed_id', shedId);
      }
      
      await powerQuery;

      // Create alert for power failure with shed info
      if (!powerOn) {
        const alertData: Record<string, any> = {
          user_id: userId,
          alert_type: 'power',
          severity: 'danger',
          message: shedName 
            ? `Power failure detected in ${shedName}!`
            : 'Power failure detected!',
          message_bn: shedName 
            ? `${shedName}-এ বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!`
            : 'বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!',
        };
        
        if (shedId) {
          alertData.shed_id = shedId;
        }
        
        await supabase.from('alerts').insert(alertData);
      }
    }

    // Check for alerts based on farm settings
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const alerts: Record<string, any>[] = [];
    const shedLabel = shedName || (shedId ? `Shed ${shedId.slice(0, 8)}` : 'Farm');
    
    // 🔥 HSI-BASED AUTOMATION (Cloud Side — THI Formula aligned with firmware v8.0.0)
    // Calculate THI: 0.8 × Temp + (Humidity / 100) × (Temp − 14.4) + 46.4
    const hsi = calculateHSI(body.temperature, body.humidity);
    const hsiStatus = hsi > 85 ? 'DANGER' : hsi >= 80 ? 'HIGH' : hsi >= 75 ? 'MILD' : 'NORMAL';
    
    console.log(`🔥 [${shedLabel}] THI = ${hsi.toFixed(1)} (Temp=${body.temperature}, Hum=${body.humidity}) → ${hsiStatus}`);
    
    // THI-based alert thresholds (aligned with firmware)
    // < 75: Normal, 75-80: Mild, 80-85: High Stress, > 85: Danger
    if (hsi > 85) {
      const alertData: Record<string, any> = {
        user_id: userId,
        alert_type: 'temperature',
        severity: 'danger',
        message: `🚨 [${shedLabel}] DANGER! Heat Stress Index: ${hsi.toFixed(1)} (Temp: ${body.temperature.toFixed(1)}°C, Humidity: ${body.humidity.toFixed(0)}%)`,
        message_bn: `🚨 [${shedLabel}] বিপদ! হিট স্ট্রেস ইন্ডেক্স: ${hsi.toFixed(1)} (তাপ: ${body.temperature.toFixed(1)}°সে, আর্দ্রতা: ${body.humidity.toFixed(0)}%)`,
      };
      if (shedId) alertData.shed_id = shedId;
      alerts.push(alertData);
      
      // Auto-enable fan HIGH + alarm for THIS SHED (skip if farmer disabled safety engine)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'DANGER', hsi, shedId);
      }
      
    } else if (hsi >= 80) {
      const alertData: Record<string, any> = {
        user_id: userId,
        alert_type: 'temperature',
        severity: 'warning',
        message: `⚠️ [${shedLabel}] High Heat Stress: THI ${hsi.toFixed(1)} (Temp: ${body.temperature.toFixed(1)}°C, Humidity: ${body.humidity.toFixed(0)}%)`,
        message_bn: `⚠️ [${shedLabel}] উচ্চ হিট স্ট্রেস: THI ${hsi.toFixed(1)} (তাপ: ${body.temperature.toFixed(1)}°সে, আর্দ্রতা: ${body.humidity.toFixed(0)}%)`,
      };
      if (shedId) alertData.shed_id = shedId;
      alerts.push(alertData);
      
      // Auto-enable fan HIGH for THIS SHED (skip if disabled)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'HIGH', hsi, shedId);
      }
      
    } else if (hsi >= 75) {
      // Mild stress - fan LOW (no alert needed, just automation)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'MILD', hsi, shedId);
      }
    } else {
      // Normal - can turn off fan if no other issues
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'NORMAL', hsi, shedId);
      }
    }

    // Legacy temperature-only alerts (for backward compatibility)
    if (settings) {
      if (body.temperature > Number(settings.temperature_max) && hsi <= 85) {
        // Only add if not already covered by HSI danger alert
        if (!alerts.some(a => a.severity === 'danger' && a.alert_type === 'temperature')) {
          const alertData: Record<string, any> = {
            user_id: userId,
            alert_type: 'temperature',
            severity: body.temperature > Number(settings.temperature_max) + 5 ? 'danger' : 'warning',
            message: `[${shedLabel}] High temperature: ${body.temperature.toFixed(1)}°C`,
            message_bn: `[${shedLabel}] উচ্চ তাপমাত্রা: ${body.temperature.toFixed(1)}°সে`,
          };
          if (shedId) alertData.shed_id = shedId;
          alerts.push(alertData);
        }
      }

      if (body.ammonia > Number(settings.ammonia_max)) {
        const alertData: Record<string, any> = {
          user_id: userId,
          alert_type: 'ammonia',
          severity: body.ammonia > Number(settings.ammonia_max) + 10 ? 'danger' : 'warning',
          message: `[${shedLabel}] High ammonia level: ${body.ammonia.toFixed(0)} ppm`,
          message_bn: `[${shedLabel}] উচ্চ অ্যামোনিয়া মাত্রা: ${body.ammonia.toFixed(0)} পিপিএম`,
        };
        if (shedId) alertData.shed_id = shedId;
        alerts.push(alertData);
      }

      if (waterUsage < 10) {
        const alertData: Record<string, any> = {
          user_id: userId,
          alert_type: 'water',
          severity: waterUsage < 5 ? 'danger' : 'warning',
          message: `[${shedLabel}] Low water usage: ${waterUsage.toFixed(1)} L/hr`,
          message_bn: `[${shedLabel}] কম পানি ব্যবহার: ${waterUsage.toFixed(1)} লি/ঘন্টা`,
        };
        if (shedId) alertData.shed_id = shedId;
        alerts.push(alertData);
      }
    }

    // Insert alerts if any and send push notifications for critical ones
    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts);
      
      // Send push notifications for danger-level alerts
      const dangerAlerts = alerts.filter(a => a.severity === 'danger');
      for (const alert of dangerAlerts) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_id: userId,
              title: `⚠️ Critical Alert - ${shedLabel}`,
              body: alert.message,
              severity: 'danger',
              url: '/alerts',
            }),
          });
          console.log(`Push notification sent for alert: ${alert.message}`);
        } catch (pushError) {
          console.error('Failed to send push notification:', pushError);
        }
      }
    }

    console.log(`✅ [${shedLabel}] Sensor data saved: device=${body.device_id || 'unknown'}, temp=${body.temperature}, humidity=${body.humidity}, ammonia=${body.ammonia}, water=${waterUsage}, HSI=${hsi.toFixed(1)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sensor data saved',
        alerts_created: alerts.length,
        farm_id: body.farm_id || null,
        shed_id: shedId,
        shed_name: shedName,
        device_id: body.device_id || null,
        hsi: parseFloat(hsi.toFixed(1)),
        hsi_status: hsiStatus,
        received_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Handle sensor data error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process sensor data', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleDeviceStatus(body: DeviceStatusPayload, supabase: any, userId: string) {
  try {
    const updateData: Record<string, boolean> = {};
    if (typeof body.power_on === 'boolean') updateData.power_on = body.power_on;
    if (typeof body.fan_on === 'boolean') updateData.fan_on = body.fan_on;
    if (typeof body.light_on === 'boolean') updateData.light_on = body.light_on;
    if (typeof body.alarm_on === 'boolean') updateData.alarm_on = body.alarm_on;

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid status fields provided', code: 'INVALID_DATA' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('device_status')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Device status update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update device status', code: 'UPDATE_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for power failure alert
    if (body.power_on === false) {
      await supabase.from('alerts').insert({
        user_id: userId,
        alert_type: 'power',
        severity: 'danger',
        message: 'Power failure detected!',
        message_bn: 'বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!',
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Device status updated' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Handle device status error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process device status', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 DEVICE STATE HANDLER
// POST /state - ESP32 reports its current operational state
// This provides transparency on what the device is doing locally
// ═══════════════════════════════════════════════════════════════════════════
async function handleDeviceState(
  body: DeviceStatePayload, 
  supabase: any, 
  userId: string, 
  deviceToken: string
) {
  try {
    // Get device info including shed_id
    const { data: deviceInfo } = await supabase
      .from('device_tokens')
      .select('id, device_name, shed_id')
      .eq('token', deviceToken)
      .single();

    if (!deviceInfo) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shedId = body.shed_id || deviceInfo.shed_id;
    const deviceTokenId = deviceInfo.id;

    // Determine if device is in fail-safe mode
    const isFailSafe = body.mode === 'FAIL_SAFE' || body.system_state === 'FAIL_SAFE';
    
    // Update device_health with current state
    const healthUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_online: true,
      failsafe_mode: isFailSafe,
    };

    if (isFailSafe) {
      healthUpdate.failsafe_activated_at = new Date().toISOString();
    }

    if (body.power_source) {
      healthUpdate.power_source = body.power_source.toLowerCase();
    }

    if (typeof body.battery_level === 'number') {
      healthUpdate.battery_percentage = body.battery_level;
    }

    if (typeof body.uptime_seconds === 'number') {
      healthUpdate.uptime_seconds = body.uptime_seconds;
    }

    if (body.last_cloud_sync) {
      healthUpdate.last_cloud_sync_at = body.last_cloud_sync;
    }

    // ===== NEW PRODUCTION RELIABILITY FIELDS v6.0 =====
    if (body.firmware_version) {
      healthUpdate.firmware_version = body.firmware_version;
    }

    if (body.restart_reason) {
      healthUpdate.restart_reason = body.restart_reason;

      // Log a new restart event when device just booted (uptime < 120s).
      // Idempotent: only one log row per boot because uptime grows past 120s quickly.
      if (typeof body.uptime_seconds === 'number' && body.uptime_seconds < 120) {
        try {
          // Check that we haven't already logged this exact boot in the last 5 min
          const { data: recent } = await supabase
            .from('device_restart_log')
            .select('id')
            .eq('device_token_id', deviceTokenId)
            .gte('occurred_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
            .limit(1);

          if (!recent || recent.length === 0) {
            await supabase.from('device_restart_log').insert({
              user_id: userId,
              farm_id: deviceInfo.farm_id ?? null,
              device_token_id: deviceTokenId,
              restart_reason: body.restart_reason,
              uptime_before_restart_seconds:
                typeof body.uptime_seconds === 'number'
                  ? Math.max(0, Math.floor(body.uptime_seconds))
                  : null,
              free_memory_bytes:
                typeof (body as any).free_memory_bytes === 'number'
                  ? (body as any).free_memory_bytes
                  : null,
              wifi_signal_strength:
                typeof (body as any).wifi_rssi === 'number' ? (body as any).wifi_rssi : null,
              error_message: (body as any).last_error_message ?? null,
              firmware_version: body.firmware_version ?? null,
              occurred_at: new Date().toISOString(),
            });
          }
        } catch (logErr) {
          console.error('[esp32-api] restart log insert failed', logErr);
        }
      }
    }

    if (typeof body.restart_count === 'number') {
      healthUpdate.restart_count = body.restart_count;
    }

    if (typeof body.total_restarts === 'number') {
      healthUpdate.total_restarts = body.total_restarts;
    }

    if (body.power_event_type) {
      healthUpdate.power_event_type = body.power_event_type;
      healthUpdate.last_power_event_at = body.last_power_event_at || new Date().toISOString();
    }

    if (body.safe_mode_active) {
      healthUpdate.safe_mode_until = body.safe_mode_until;
    }

    if (typeof body.gas_warmup_done === 'boolean') {
      healthUpdate.gas_sensor_warmup_done = body.gas_warmup_done;
      if (body.gas_warmup_start) {
        healthUpdate.gas_sensor_warmup_start = body.gas_warmup_start;
      }
    }

    if (typeof body.ammonia_avg_10 === 'number') {
      healthUpdate.ammonia_avg_10 = body.ammonia_avg_10;
    }

    if (typeof body.consecutive_high_ammonia === 'number') {
      healthUpdate.consecutive_high_ammonia = body.consecutive_high_ammonia;
    }

    if (typeof body.power_voltage_rms === 'number') {
      healthUpdate.power_voltage_rms = body.power_voltage_rms;
    }

    if (typeof body.offline_buffer_count === 'number') {
      healthUpdate.offline_buffer_count = body.offline_buffer_count;
    }

    if (body.last_age_sync_at) {
      healthUpdate.last_age_sync_at = body.last_age_sync_at;
    }

    if (body.ota_status) {
      healthUpdate.ota_status = body.ota_status;
      if (typeof body.ota_progress === 'number') {
        healthUpdate.ota_progress = body.ota_progress;
      }
    }

    if (typeof body.online_duration_seconds === 'number') {
      healthUpdate.online_duration_seconds = body.online_duration_seconds;
    }

    if (typeof body.offline_duration_seconds === 'number') {
      healthUpdate.offline_duration_seconds = body.offline_duration_seconds;
    }

    // Upsert device health
    const { error: healthError } = await supabase
      .from('device_health')
      .upsert({
        device_token_id: deviceTokenId,
        user_id: userId,
        shed_id: shedId,
        ...healthUpdate,
      }, {
        onConflict: 'device_token_id'
      });

    if (healthError) {
      console.error('Failed to update device health:', healthError);
    }

    // Update device_status with ACTUAL state from ESP32 (device is source of truth)
    const statusUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_device_ack_at: new Date().toISOString(),
    };

    // Map fan_speed to fan_on and fan_speed (actual state from device)
    if (body.fan_speed) {
      statusUpdate.fan_speed = body.fan_speed;
      statusUpdate.fan_on = body.fan_speed !== 'OFF';
    }

    if (typeof body.fan_on === 'boolean') {
      statusUpdate.fan_on = body.fan_on;
    }

    if (typeof body.light_on === 'boolean') {
      statusUpdate.light_on = body.light_on;
    }

    // Map alarm to alarm_on
    if (body.alarm) {
      statusUpdate.alarm_on = body.alarm === 'ON';
    }

    // Handle safety_override from device
    if (typeof (body as any).safety_override === 'boolean') {
      statusUpdate.safety_override = (body as any).safety_override;
      statusUpdate.safety_override_reason = (body as any).safety_override_reason || null;
      if ((body as any).safety_override) {
        statusUpdate.safety_override_at = new Date().toISOString();
      }
    }

    // Compute state_mismatch between desired and actual
    // First get current desired state
    let desiredQuery = supabase
      .from('device_status')
      .select('desired_fan_on, desired_light_on, desired_alarm_on, desired_heater_on, desired_fogger_on, desired_circulation_fan_on')
      .eq('user_id', userId);
    if (shedId) {
      desiredQuery = desiredQuery.eq('shed_id', shedId);
    }
    const { data: desiredData } = await desiredQuery.maybeSingle();

    if (desiredData) {
      const actualFan = statusUpdate.fan_on ?? body.fan_on ?? false;
      const actualLight = statusUpdate.light_on ?? body.light_on ?? false;
      const actualAlarm = statusUpdate.alarm_on ?? (body.alarm === 'ON') ?? false;
      
      const hasMismatch = 
        (desiredData.desired_fan_on !== actualFan) ||
        (desiredData.desired_light_on !== actualLight) ||
        (desiredData.desired_alarm_on !== actualAlarm);
      
      statusUpdate.state_mismatch = hasMismatch;
    }

    // Update device_status (actual state)
    let statusQuery = supabase
      .from('device_status')
      .update(statusUpdate)
      .eq('user_id', userId);

    if (shedId) {
      statusQuery = statusQuery.eq('shed_id', shedId);
    }

    await statusQuery;

    // Log state change if in fail-safe mode
    if (isFailSafe && body.failsafe_reason) {
      console.log(`⚠️ Device ${deviceInfo.device_name} entered FAIL-SAFE: ${body.failsafe_reason}`);
    }

    // Get shed name for response
    let shedName: string | null = null;
    if (shedId) {
      const { data: shed } = await supabase
        .from('sheds')
        .select('name, name_en')
        .eq('id', shedId)
        .single();
      shedName = shed?.name || shed?.name_en || null;
    }

    console.log(`✅ [${shedName || 'Farm'}] State update: mode=${body.mode}, fan=${body.fan_speed}, HSI=${body.hsi}, state=${body.system_state}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Device state updated',
        device_id: deviceInfo.device_name,
        shed_id: shedId,
        shed_name: shedName,
        mode: body.mode,
        hsi: body.hsi,
        system_state: body.system_state,
        is_failsafe: isFailSafe,
        server_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Handle device state error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process device state', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 OTA UPDATE CHECK HANDLER
// GET /ota-check - Check for available firmware updates
// ═══════════════════════════════════════════════════════════════════════════
async function checkOTAUpdate(supabase: any, userId: string, currentVersion: string, farmType: string) {
  try {
    // Get latest stable firmware for the farm type
    const { data: firmware, error } = await supabase
      .from('ota_firmware')
      .select('*')
      .eq('is_active', true)
      .eq('is_stable', true)
      .or(`farm_type.eq.all,farm_type.eq.${farmType}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('OTA check error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check for updates', code: 'OTA_CHECK_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firmware) {
      return new Response(
        JSON.stringify({
          update_available: false,
          current_version: currentVersion,
          message: 'No updates available'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple version comparison (assumes semantic versioning)
    const isNewer = firmware.version > currentVersion;
    const meetsMinVersion = !firmware.min_firmware_version || currentVersion >= firmware.min_firmware_version;

    if (!isNewer || !meetsMinVersion) {
      return new Response(
        JSON.stringify({
          update_available: false,
          current_version: currentVersion,
          latest_version: firmware.version,
          message: isNewer ? 'Update requires newer base version' : 'Already up to date'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🆕 OTA update available: ${currentVersion} → ${firmware.version}`);

    return new Response(
      JSON.stringify({
        update_available: true,
        current_version: currentVersion,
        new_version: firmware.version,
        download_url: firmware.url,
        checksum: firmware.checksum,
        file_size: firmware.file_size_bytes,
        release_notes: firmware.release_notes,
        release_notes_bn: firmware.release_notes_bn,
        message: `Update available: v${firmware.version}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OTA check error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check for updates', code: 'OTA_CHECK_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 OFFLINE BUFFER SYNC HANDLER
// POST /buffer-sync - Upload buffered offline sensor data
// ═══════════════════════════════════════════════════════════════════════════
interface BufferSyncPayload {
  records: Array<{
    temperature: number;
    humidity: number;
    ammonia: number;
    water_flow?: number;
    power_status?: string;
    recorded_at: string;
  }>;
  shed_id?: string;
}

async function handleBufferSync(body: BufferSyncPayload, supabase: any, userId: string, deviceToken: string) {
  try {
    if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No records provided', code: 'EMPTY_BUFFER' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device token ID + farm_id (multi-tenant isolation guard)
    const { data: deviceInfo } = await supabase
      .from('device_tokens')
      .select('id, shed_id, farm_id')
      .eq('token', deviceToken)
      .single();

    if (!deviceInfo) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD: reject if device token has no farm_id bound (would create orphan rows)
    if (!deviceInfo.farm_id) {
      console.error(`🚫 Buffer sync rejected: device token has NULL farm_id`);
      return new Response(
        JSON.stringify({ error: 'Device not bound to a farm', code: 'NO_FARM_BOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shedId = body.shed_id || deviceInfo.shed_id;
    const farmId = deviceInfo.farm_id;
    const records = body.records.slice(0, 50); // Max 50 records per sync

    // Insert buffered records into sensor_buffer table
    const bufferRecords = records.map(record => ({
      device_token_id: deviceInfo.id,
      user_id: userId,
      shed_id: shedId,
      temperature: record.temperature,
      humidity: record.humidity,
      ammonia: record.ammonia,
      water_flow: record.water_flow || 0,
      power_status: record.power_status || 'ON',
      hsi: calculateHSI(record.temperature, record.humidity),
      recorded_at: record.recorded_at,
      synced_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('sensor_buffer')
      .insert(bufferRecords);

    if (insertError) {
      console.error('Buffer sync insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to sync buffer', code: 'INSERT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also insert into main sensor_readings for analytics
    const sensorRecords = records.map(record => ({
      user_id: userId,
      farm_id: farmId,
      shed_id: shedId,
      temperature: record.temperature,
      humidity: record.humidity,
      ammonia: record.ammonia,
      water_usage: record.water_flow || 0,
      recorded_at: record.recorded_at
    }));

    await supabase.from('sensor_readings').insert(sensorRecords);

    console.log(`📦 Buffer sync: ${records.length} offline records uploaded`);

    return new Response(
      JSON.stringify({
        success: true,
        records_synced: records.length,
        shed_id: shedId,
        message: `${records.length} offline records synced successfully`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Buffer sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync buffer', code: 'SYNC_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 GET DEVICE STATE
// GET /state?shed_id=xxx - Get current state for a specific shed
// ═══════════════════════════════════════════════════════════════════════════
async function getDeviceState(supabase: any, userId: string, shedId: string | null) {
  try {
    // Get latest sensor reading
    let sensorQuery = supabase
      .from('sensor_readings')
      .select('temperature, humidity, ammonia, water_usage, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (shedId) {
      sensorQuery = sensorQuery.eq('shed_id', shedId);
    }

    const { data: sensorData } = await sensorQuery.maybeSingle();

    // Get device status
    let statusQuery = supabase
      .from('device_status')
      .select('fan_on, fan_speed, light_on, alarm_on, power_on, manual_override, desired_manual_override')
      .eq('user_id', userId);

    if (shedId) {
      statusQuery = statusQuery.eq('shed_id', shedId);
    }

    const { data: statusData } = await statusQuery.maybeSingle();

    // Get device health (for online status and fail-safe info)
    let healthQuery = supabase
      .from('device_health')
      .select('is_online, failsafe_mode, power_source, battery_percentage, uptime_seconds, last_seen_at, last_cloud_sync_at')
      .eq('user_id', userId);

    if (shedId) {
      healthQuery = healthQuery.eq('shed_id', shedId);
    }

    const { data: healthData } = await healthQuery.maybeSingle();

    // Calculate HSI if we have sensor data
    let hsi: number | null = null;
    let hsiStatus: string = 'UNKNOWN';
    
    if (sensorData) {
      hsi = calculateHSI(sensorData.temperature, sensorData.humidity);
      hsiStatus = hsi > 40 ? 'DANGER' : hsi >= 35 ? 'HIGH_STRESS' : hsi >= 30 ? 'MILD_STRESS' : 'NORMAL';
    }

    // Determine mode - check BOTH manual_override and desired_manual_override
    let mode: string = 'UNKNOWN';
    const isManualOverride = statusData?.manual_override || statusData?.desired_manual_override;
    if (healthData?.failsafe_mode) {
      mode = 'FAIL_SAFE';
    } else if (isManualOverride) {
      mode = 'MANUAL';
    } else {
      mode = 'AUTO';
    }

    // Get shed info
    let shedName: string | null = null;
    if (shedId) {
      const { data: shed } = await supabase
        .from('sheds')
        .select('name, name_en')
        .eq('id', shedId)
        .single();
      shedName = shed?.name || shed?.name_en || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        shed_id: shedId,
        shed_name: shedName,
        state: {
          mode,
          fan_on: statusData?.fan_on ?? false,
          fan_speed: statusData?.fan_speed ?? 'OFF',
          light_on: statusData?.light_on ?? false,
          alarm: statusData?.alarm_on ? 'ON' : 'OFF',
          power_on: statusData?.power_on ?? true,
          manual_override: statusData?.manual_override ?? false,
        },
        sensors: sensorData ? {
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          ammonia: sensorData.ammonia,
          water_usage: sensorData.water_usage,
          recorded_at: sensorData.recorded_at,
        } : null,
        hsi: hsi ? parseFloat(hsi.toFixed(1)) : null,
        hsi_status: hsiStatus,
        device: {
          is_online: healthData?.is_online ?? false,
          failsafe_mode: healthData?.failsafe_mode ?? false,
          power_source: healthData?.power_source ?? 'mains',
          battery_level: healthData?.battery_percentage ?? null,
          uptime_seconds: healthData?.uptime_seconds ?? 0,
          last_seen_at: healthData?.last_seen_at ?? null,
          last_cloud_sync: healthData?.last_cloud_sync_at ?? null,
        },
        server_timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get device state error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get device state', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getSettings(supabase: any, userId: string) {
  // Return ALL settings for fail-safe caching on ESP32
  const { data, error } = await supabase
    .from('farm_settings')
    .select(`
      temperature_min, temperature_max, 
      humidity_min, humidity_max, 
      ammonia_max,
      fan_low_temp_min, fan_low_temp_max,
      fan_medium_temp_min, fan_medium_temp_max,
      fan_high_temp_min,
      hsi_mild_threshold, hsi_moderate_threshold,
      hsi_severe_threshold, hsi_emergency_threshold,
      hsi_automation_enabled,
      water_anomaly_threshold
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Failed to get settings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get settings', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Add server timestamp for sync tracking
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        ...data,
        server_timestamp: new Date().toISOString(),
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAutomationRules(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('condition_sensor, condition_operator, condition_value, action_device, action_state, enabled')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to get automation rules', code: 'FETCH_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}

async function getLightingSchedule(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('lighting_schedule')
    .select('start_time, end_time, total_hours, manual_override, gradual_enabled, fade_in_minutes, fade_out_minutes, min_brightness, max_brightness')
    .eq('user_id', userId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to get lighting schedule', code: 'FETCH_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Calculate current brightness for PWM control
  const currentBrightness = calculateCurrentBrightness(data);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        ...data,
        current_brightness: currentBrightness.brightness,
        current_phase: currentBrightness.phase,
        pwm_value: Math.round(currentBrightness.brightness * 255 / 100), // 0-255 for ESP32 PWM
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}

/**
 * Calculate current brightness based on lighting schedule and time
 * Uses smooth easing for gradual transitions
 */
function calculateCurrentBrightness(schedule: any): { brightness: number; phase: string } {
  if (!schedule) {
    return { brightness: 0, phase: 'off' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Parse times (format: "HH:MM:SS" or "HH:MM")
  const startTime = schedule.start_time?.toString() || '05:00:00';
  const endTime = schedule.end_time?.toString() || '21:00:00';
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);
  
  const fadeInMinutes = schedule.fade_in_minutes || 30;
  const fadeOutMinutes = schedule.fade_out_minutes || 30;
  const minBrightness = schedule.min_brightness || 0;
  const maxBrightness = schedule.max_brightness || 100;
  const gradualEnabled = schedule.gradual_enabled !== false;

  // If manual override, return max brightness
  if (schedule.manual_override) {
    return { brightness: maxBrightness, phase: 'manual' };
  }

  // If gradual is disabled, use simple ON/OFF
  if (!gradualEnabled) {
    const isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    return {
      brightness: isActive ? maxBrightness : minBrightness,
      phase: isActive ? 'on' : 'off'
    };
  }

  // Calculate phase boundaries
  const fadeInEnd = startMinutes + fadeInMinutes;
  const fadeOutStart = endMinutes - fadeOutMinutes;

  // Ease-in-out quadratic function for smooth transitions
  const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };

  // Before schedule starts (OFF)
  if (currentMinutes < startMinutes) {
    return { brightness: minBrightness, phase: 'off' };
  }

  // Fade-in phase (Morning: 0% → 100%)
  if (currentMinutes >= startMinutes && currentMinutes < fadeInEnd) {
    const progress = (currentMinutes - startMinutes) / fadeInMinutes;
    const easedProgress = easeInOutQuad(progress);
    const brightness = Math.round(minBrightness + (maxBrightness - minBrightness) * easedProgress);
    return { brightness, phase: 'fade-in' };
  }

  // Full ON phase
  if (currentMinutes >= fadeInEnd && currentMinutes < fadeOutStart) {
    return { brightness: maxBrightness, phase: 'on' };
  }

  // Fade-out phase (Evening: 100% → 0%)
  if (currentMinutes >= fadeOutStart && currentMinutes < endMinutes) {
    const progress = (currentMinutes - fadeOutStart) / fadeOutMinutes;
    const easedProgress = easeInOutQuad(progress);
    const brightness = Math.round(maxBrightness - (maxBrightness - minBrightness) * easedProgress);
    return { brightness, phase: 'fade-out' };
  }

  // After schedule ends (OFF)
  return { brightness: minBrightness, phase: 'off' };
}

async function getDeviceCommands(supabase: any, userId: string, deviceName: string | null) {
  // Safety: only return commands fresher than 5 minutes.
  // Stale commands (e.g. from offline period) are dangerous: a "fan_off"
  // issued at noon must NOT execute at 3 AM when the bird needs warmth.
  const COMMAND_FRESHNESS_SECONDS = 5 * 60;
  const freshCutoff = new Date(Date.now() - COMMAND_FRESHNESS_SECONDS * 1000).toISOString();

  // Auto-expire stale pending commands so they don't keep being polled
  let staleQuery = supabase
    .from('device_commands')
    .update({ executed: true, executed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('executed', false)
    .lt('created_at', freshCutoff);
  if (deviceName) staleQuery = staleQuery.eq('device_name', deviceName);
  await staleQuery;

  // Get pending (unexecuted) commands for this device — only fresh ones
  let query = supabase
    .from('device_commands')
    .select('id, command_type, command_value, created_at, client_request_id, dispatched_at, retry_count')
    .eq('user_id', userId)
    .eq('executed', false)
    .gte('created_at', freshCutoff)
    .order('created_at', { ascending: true });

  if (deviceName) {
    query = query.eq('device_name', deviceName);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching device commands:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get commands', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Phase 3 idempotency: ensure each fetched command has a client_request_id
  // (so ESP32 can echo it back in ack to dedupe), and track dispatch lifecycle.
  const nowIso = new Date().toISOString();
  if (data && data.length > 0) {
    for (const cmd of data) {
      const updates: any = {};
      if (!cmd.client_request_id) {
        cmd.client_request_id = cmd.id;          // reuse row id as idempotency key
        updates.client_request_id = cmd.id;
      }
      if (!cmd.dispatched_at) {
        updates.dispatched_at = nowIso;
      } else {
        updates.retry_count = (cmd.retry_count || 0) + 1;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('device_commands').update(updates).eq('id', cmd.id);
      }
    }
  }

  // Also fetch matching command_ids from device_command_log for ACK protocol
  let logQuery = supabase
    .from('device_command_log')
    .select('command_id, command_type, command_value')
    .eq('user_id', userId)
    .in('status', ['pending', 'sent'])
    .order('created_at', { ascending: true });

  if (deviceName) {
    logQuery = logQuery.eq('device_name', deviceName);
  }

  const { data: logData } = await logQuery;

  // Mark pending log entries as 'sent'
  if (logData && logData.length > 0) {
    const pendingIds = logData.map((l: any) => l.command_id);
    await supabase
      .from('device_command_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('command_id', pendingIds)
      .eq('status', 'pending');
  }

  // Merge command_ids into response
  const commandsWithIds = (data || []).map((cmd: any) => {
    const match = (logData || []).find((l: any) => 
      l.command_type === cmd.command_type && l.command_value === cmd.command_value
    );
    return {
      ...cmd,
      command_id: match?.command_id || null,
    };
  });

  console.log(`Returning ${commandsWithIds.length} pending commands for device ${deviceName || 'all'}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      commands: commandsWithIds,
      device_id: deviceName,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function acknowledgeCommands(body: { command_ids: string[] }, supabase: any, userId: string) {
  if (!body.command_ids || !Array.isArray(body.command_ids) || body.command_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing command_ids array', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('device_commands')
    .update({ 
      executed: true, 
      executed_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .in('id', body.command_ids);

  if (error) {
    console.error('Error acknowledging commands:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to acknowledge commands', code: 'UPDATE_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Acknowledged ${body.command_ids.length} commands`);

  return new Response(
    JSON.stringify({ success: true, acknowledged: body.command_ids.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 COMMAND ACK PROTOCOL v2 HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /commands-ack-v2
 * Device sends ACK with command_id and execution result.
 * Body: { acks: [{ command_id: string, success: boolean, error?: string }] }
 */
async function acknowledgeCommandsV2(
  body: { acks: { command_id: string; success: boolean; error?: string }[] },
  supabase: any,
  userId: string
) {
  if (!body.acks || !Array.isArray(body.acks) || body.acks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing acks array', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let acked = 0;
  let failed = 0;

  for (const ack of body.acks) {
    const status = ack.success ? 'acked' : 'failed';
    const { error } = await supabase
      .from('device_command_log')
      .update({
        status,
        acked_at: new Date().toISOString(),
        error_message: ack.error || null,
      })
      .eq('command_id', ack.command_id)
      .eq('user_id', userId);

    if (error) {
      console.error(`ACK error for ${ack.command_id}:`, error);
      failed++;
    } else {
      acked++;
    }

    // Also mark legacy device_commands as executed
    if (ack.success) {
      // Find matching command by type from the log
      const { data: logEntry } = await supabase
        .from('device_command_log')
        .select('command_type, device_name')
        .eq('command_id', ack.command_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (logEntry) {
        await supabase
          .from('device_commands')
          .update({ executed: true, executed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('command_type', logEntry.command_type)
          .eq('device_name', logEntry.device_name)
          .eq('executed', false);
      }
    }
  }

  console.log(`ACK v2: ${acked} acked, ${failed} failed`);

  return new Response(
    JSON.stringify({ success: true, acked, failed }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /command-status?command_id=CMD_xxx
 * Check delivery status of a specific command.
 */
async function getCommandStatus(supabase: any, userId: string, commandId: string | null) {
  if (!commandId) {
    // Return all recent commands (last 50)
    const { data, error } = await supabase
      .from('device_command_log')
      .select('command_id, command_type, command_value, status, retry_count, created_at, sent_at, acked_at, error_message')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch command logs', code: 'FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, commands: data || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('device_command_log')
    .select('*')
    .eq('command_id', commandId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: 'Command not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, command: data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /command-retry
 * Cloud retries unacknowledged commands (no ACK within 5s, max 3 retries).
 * Auto-called by frontend or cron. Marks expired commands as 'expired'.
 */
async function retryUnackedCommands(supabase: any, userId: string) {
  const now = new Date();
  const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();

  // Find commands that were sent > 5s ago and not yet acked
  const { data: staleCommands, error } = await supabase
    .from('device_command_log')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'sent')
    .lt('sent_at', fiveSecondsAgo)
    .order('created_at', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stale commands', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let retried = 0;
  let expired = 0;

  for (const cmd of (staleCommands || [])) {
    if (cmd.retry_count >= cmd.max_retries) {
      // Max retries exceeded → mark expired
      await supabase
        .from('device_command_log')
        .update({ status: 'expired', expired_at: now.toISOString() })
        .eq('id', cmd.id);
      expired++;
    } else {
      // Retry: re-insert into device_commands and increment retry_count
      await supabase.from('device_commands').insert({
        user_id: userId,
        device_name: cmd.device_name,
        command_type: cmd.command_type,
        command_value: cmd.command_value,
      });

      await supabase
        .from('device_command_log')
        .update({ 
          retry_count: cmd.retry_count + 1,
          sent_at: now.toISOString(),
          status: 'sent',
        })
        .eq('id', cmd.id);
      retried++;
    }
  }

  console.log(`Command retry: ${retried} retried, ${expired} expired`);

  return new Response(
    JSON.stringify({ success: true, retried, expired }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

interface ControlPayload {
  device_id?: string;
  fan?: string | boolean;
  light?: string | boolean;
  alarm?: string | boolean;
  power?: string | boolean;
  mode?: 'AUTO' | 'MANUAL';
}

async function handleControlCommand(body: ControlPayload, supabase: any, userId: string) {
  const deviceName = body.device_id || 'ESP32_LAYER_001';
  const commands: { user_id: string; device_name: string; command_type: string; command_value: boolean }[] = [];

  // Helper to parse ON/OFF or boolean
  const parseValue = (val: string | boolean | undefined): boolean | null => {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val;
    return val.toUpperCase() === 'ON';
  };

  const fanValue = parseValue(body.fan);
  const lightValue = parseValue(body.light);
  const alarmValue = parseValue(body.alarm);
  const powerValue = parseValue(body.power);

  if (fanValue !== null) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'fan', command_value: fanValue });
  }
  if (lightValue !== null) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'light', command_value: lightValue });
  }
  if (alarmValue !== null) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'alarm', command_value: alarmValue });
  }
  if (powerValue !== null) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'power', command_value: powerValue });
  }

  // Handle mode - write to desired_manual_override (cloud never sets actual)
  if (body.mode) {
    const manualOverride = body.mode === 'MANUAL';
    await supabase
      .from('device_status')
      .update({ desired_manual_override: manualOverride })
      .eq('user_id', userId);
  }

  if (commands.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid control commands provided', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Duplicate prevention: cancel pending commands for same device+type ──
  for (const cmd of commands) {
    await supabase
      .from('device_command_log')
      .update({ status: 'superseded', expired_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_name', cmd.device_name)
      .eq('command_type', cmd.command_type)
      .in('status', ['pending', 'sent']);
  }

  // Insert into legacy device_commands table
  const { error } = await supabase.from('device_commands').insert(commands);

  if (error) {
    console.error('Error inserting control commands:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue commands', code: 'INSERT_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // ── Also log to device_command_log with unique command_id ──
  const commandLogs = commands.map(cmd => ({
    user_id: userId,
    command_id: `CMD_${Date.now()}_${cmd.command_type}_${Math.random().toString(36).substring(2, 8)}`,
    device_name: cmd.device_name,
    command_type: cmd.command_type,
    command_value: cmd.command_value,
    status: 'pending',
    sent_at: new Date().toISOString(),
    source: 'cloud',
  }));

  const { error: logError } = await supabase.from('device_command_log').insert(commandLogs);
  if (logError) {
    console.error('Command log insert error (non-fatal):', logError);
  }

  const commandIds = commandLogs.map(l => l.command_id);
  console.log(`Queued ${commands.length} commands for ${deviceName}: ${commandIds.join(', ')}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Commands queued',
      commands_queued: commands.length,
      command_ids: commandIds,
      device_id: deviceName,
      mode: body.mode || 'unchanged'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

interface AutomationRulePayload {
  // Standard format
  name?: string;
  condition_sensor?: 'temperature' | 'humidity' | 'ammonia';
  condition_operator?: '>' | '<' | '>=' | '<=';
  condition_value?: number;
  action_device?: 'fan' | 'light' | 'alarm';
  action_state?: boolean;
  enabled?: boolean;
  // Simplified format
  parameter?: 'temperature' | 'humidity' | 'ammonia';
  condition?: '>' | '<' | '>=' | '<=';
  value?: number;
  action?: string; // "fan_on", "fan_off", "light_on", etc.
}

const VALID_SENSORS = ['temperature', 'humidity', 'ammonia'];
const VALID_OPERATORS = ['>', '<', '>=', '<='];
const VALID_DEVICES = ['fan', 'light', 'alarm'];
const VALID_ACTIONS = ['fan_on', 'fan_off', 'light_on', 'light_off', 'alarm_on', 'alarm_off'];

function parseAction(action: string): { device: string; state: boolean } | null {
  const match = action.match(/^(fan|light|alarm)_(on|off)$/i);
  if (!match) return null;
  return {
    device: match[1].toLowerCase(),
    state: match[2].toLowerCase() === 'on'
  };
}

async function createAutomationRule(body: AutomationRulePayload, supabase: any, userId: string) {
  // Normalize simplified format to standard format
  const sensor = body.condition_sensor || body.parameter;
  const operator = body.condition_operator || body.condition;
  const value = body.condition_value ?? body.value;
  
  let device = body.action_device;
  let state = body.action_state;
  
  // Parse action string like "fan_on" if provided
  if (body.action && !device) {
    const parsed = parseAction(body.action);
    if (parsed) {
      device = parsed.device as 'fan' | 'light' | 'alarm';
      state = parsed.state;
    }
  }

  // Auto-generate name if not provided
  const name = body.name || `${sensor} ${operator} ${value} → ${device}_${state ? 'on' : 'off'}`;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Name is required and must be a non-empty string', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (name.length > 100) {
    return new Response(
      JSON.stringify({ error: 'Name must be less than 100 characters', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!sensor || !VALID_SENSORS.includes(sensor)) {
    return new Response(
      JSON.stringify({ error: `Invalid parameter/condition_sensor. Must be one of: ${VALID_SENSORS.join(', ')}`, code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!operator || !VALID_OPERATORS.includes(operator)) {
    return new Response(
      JSON.stringify({ error: `Invalid condition/condition_operator. Must be one of: ${VALID_OPERATORS.join(', ')}`, code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return new Response(
      JSON.stringify({ error: 'value/condition_value must be a valid number', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (value < -50 || value > 500) {
    return new Response(
      JSON.stringify({ error: 'value/condition_value must be between -50 and 500', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!device || !VALID_DEVICES.includes(device)) {
    return new Response(
      JSON.stringify({ error: `Invalid action/action_device. Must be one of: ${VALID_DEVICES.join(', ')} or action like "fan_on"`, code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (typeof state !== 'boolean') {
    return new Response(
      JSON.stringify({ error: 'action_state must be a boolean (or use action like "fan_on")', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: userId,
      name: name.trim(),
      condition_sensor: sensor,
      condition_operator: operator,
      condition_value: value,
      action_device: device,
      action_state: state,
      enabled: body.enabled !== false,
    })
    .select('id, name, condition_sensor, condition_operator, condition_value, action_device, action_state, enabled')
    .single();

  if (error) {
    console.error('Error creating automation rule:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create automation rule', code: 'INSERT_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Created automation rule: ${body.name}`);

  return new Response(
    JSON.stringify({ success: true, rule: data }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

interface ManualControlPayload {
  device_id?: string;
  fan?: boolean | string;
  light?: boolean | string;
  alarm?: boolean | string;
  power?: boolean | string;
  manual_override?: boolean;
}

async function handleManualControl(body: ManualControlPayload, supabase: any, userId: string) {
  const deviceName = body.device_id || 'ESP32_LAYER_001';
  
  // Helper to parse boolean or ON/OFF string
  const parseValue = (val: boolean | string | undefined): boolean | undefined => {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    return val.toUpperCase() === 'ON';
  };

  const fanValue = parseValue(body.fan);
  const lightValue = parseValue(body.light);
  const alarmValue = parseValue(body.alarm);
  const powerValue = parseValue(body.power);

  // Build desired_state update (cloud writes desired only, never actual)
  const desiredUpdate: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (fanValue !== undefined) desiredUpdate.desired_fan_on = fanValue;
  if (lightValue !== undefined) desiredUpdate.desired_light_on = lightValue;
  if (alarmValue !== undefined) desiredUpdate.desired_alarm_on = alarmValue;
  
  // Enable manual override when using manual control
  if (body.manual_override !== undefined) {
    desiredUpdate.desired_manual_override = body.manual_override;
  } else {
    desiredUpdate.desired_manual_override = true;
  }

  if (Object.keys(desiredUpdate).length <= 1) {
    return new Response(
      JSON.stringify({ error: 'No control values provided', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update desired_state only (ESP32 decides final relay state)
  const { error: updateError } = await supabase
    .from('device_status')
    .update(desiredUpdate)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating desired state:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to update desired state', code: 'UPDATE_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Also queue commands for ESP32 to pick up
  const commands: { user_id: string; device_name: string; command_type: string; command_value: boolean }[] = [];
  if (fanValue !== undefined) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'fan', command_value: fanValue });
  }
  if (lightValue !== undefined) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'light', command_value: lightValue });
  }
  if (alarmValue !== undefined) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'alarm', command_value: alarmValue });
  }
  if (powerValue !== undefined) {
    commands.push({ user_id: userId, device_name: deviceName, command_type: 'power', command_value: powerValue });
  }

  if (commands.length > 0) {
    await supabase.from('device_commands').insert(commands);
  }

  console.log(`Manual control desired_state: ${JSON.stringify(desiredUpdate)} for device ${deviceName}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Desired state updated (device decides final state)',
      device_id: deviceName,
      desired_state_updated: desiredUpdate,
      commands_queued: commands.length,
      manual_override: desiredUpdate.desired_manual_override ?? true,
      note: 'ESP32 is the single source of truth. If safety_override is active, device will ignore desired state.'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getLatestSensorData(supabase: any, userId: string) {
  // Get latest sensor reading
  const { data: sensorData, error: sensorError } = await supabase
    .from('sensor_readings')
    .select('temperature, humidity, ammonia, water_usage, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  // Get device status
  const { data: deviceStatus, error: statusError } = await supabase
    .from('device_status')
    .select('power_on, fan_on, light_on, alarm_on, manual_override, updated_at')
    .eq('user_id', userId)
    .single();

  // Get farm settings for thresholds
  const { data: settings } = await supabase
    .from('farm_settings')
    .select('temperature_min, temperature_max, humidity_min, humidity_max, ammonia_max')
    .eq('user_id', userId)
    .single();

  // Calculate status levels
  let temperatureStatus = 'normal';
  let humidityStatus = 'normal';
  let ammoniaStatus = 'normal';

  if (sensorData && settings) {
    if (sensorData.temperature > settings.temperature_max + 5) {
      temperatureStatus = 'danger';
    } else if (sensorData.temperature > settings.temperature_max || sensorData.temperature < settings.temperature_min) {
      temperatureStatus = 'warning';
    }

    if (sensorData.humidity > settings.humidity_max || sensorData.humidity < settings.humidity_min) {
      humidityStatus = 'warning';
    }

    if (sensorData.ammonia > settings.ammonia_max + 10) {
      ammoniaStatus = 'danger';
    } else if (sensorData.ammonia > settings.ammonia_max) {
      ammoniaStatus = 'warning';
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sensor_data: sensorData ? {
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        ammonia: sensorData.ammonia,
        water_usage: sensorData.water_usage,
        recorded_at: sensorData.recorded_at,
        status: {
          temperature: temperatureStatus,
          humidity: humidityStatus,
          ammonia: ammoniaStatus
        }
      } : null,
      device_status: deviceStatus ? {
        power: deviceStatus.power_on,
        fan: deviceStatus.fan_on,
        light: deviceStatus.light_on,
        alarm: deviceStatus.alarm_on,
        manual_override: deviceStatus.manual_override,
        updated_at: deviceStatus.updated_at
      } : null,
      thresholds: settings || null,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAlerts(supabase: any, userId: string, limit: number, unacknowledgedOnly: boolean) {
  let query = supabase
    .from('alerts')
    .select('id, alert_type, severity, message, message_bn, acknowledged, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (unacknowledgedOnly) {
    query = query.eq('acknowledged', false);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      alerts: data.map((alert: any) => ({
        id: alert.id,
        type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        message_bn: alert.message_bn,
        acknowledged: alert.acknowledged,
        timestamp: alert.created_at
      })),
      count: data.length,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

interface DeviceHealthPayload {
  wifi_signal_strength?: number;
  uptime_seconds?: number;
  free_memory_bytes?: number;
  cpu_temperature?: number;
  power_source?: string;
  battery_percentage?: number;
  firmware_version?: string;
  last_restart_at?: string;
  error_count?: number;
  last_error_message?: string;
  shed_id?: string;
}

async function handleDeviceHealth(body: DeviceHealthPayload, supabase: any, userId: string, deviceToken: string) {
  try {
    // Get the device token ID
    const { data: device } = await supabase
      .from('device_tokens')
      .select('id, shed_id')
      .eq('token', deviceToken)
      .single();

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const healthData = {
      device_token_id: device.id,
      user_id: userId,
      shed_id: body.shed_id || device.shed_id || null,
      wifi_signal_strength: body.wifi_signal_strength ?? null,
      uptime_seconds: body.uptime_seconds ?? null,
      free_memory_bytes: body.free_memory_bytes ?? null,
      cpu_temperature: body.cpu_temperature ?? null,
      power_source: body.power_source || 'mains',
      battery_percentage: body.battery_percentage ?? null,
      firmware_version: body.firmware_version ?? null,
      last_restart_at: body.last_restart_at ?? null,
      error_count: body.error_count ?? 0,
      last_error_message: body.last_error_message ?? null,
      is_online: true,
      last_seen_at: new Date().toISOString(),
    };

    // Upsert device health (update if exists, insert if not)
    const { data: existingHealth } = await supabase
      .from('device_health')
      .select('id')
      .eq('device_token_id', device.id)
      .single();

    if (existingHealth) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('device_health')
        .update(healthData)
        .eq('id', existingHealth.id);

      if (updateError) {
        console.error('Device health update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update device health', code: 'UPDATE_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('device_health')
        .insert(healthData);

      if (insertError) {
        console.error('Device health insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save device health', code: 'INSERT_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Device health updated for device ${device.id}: wifi=${body.wifi_signal_strength}, uptime=${body.uptime_seconds}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Device health updated',
        device_id: device.id,
        received_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Handle device health error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process device health', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ===== POWER OUTAGE TRACKING =====

interface PowerStatusPayload {
  power_on: boolean;
  power_source?: string; // 'mains', 'battery', 'ups'
  battery_level?: number;
}

async function handlePowerStatus(body: PowerStatusPayload, supabase: any, userId: string, deviceToken: string) {
  try {
    const { power_on, power_source = 'mains', battery_level } = body;

    // Get device info
    const { data: device, error: deviceError } = await supabase
      .from('device_tokens')
      .select('id, shed_id')
      .eq('token', deviceToken)
      .single();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for ongoing outage
    const { data: ongoingOutage } = await supabase
      .from('power_outages')
      .select('*')
      .eq('user_id', userId)
      .eq('device_token_id', device.id)
      .eq('is_ongoing', true)
      .single();

    if (!power_on) {
      // Power is OFF - start or continue tracking outage
      if (!ongoingOutage) {
        // Start new outage
        const { data: newOutage, error: insertError } = await supabase
          .from('power_outages')
          .insert({
            user_id: userId,
            device_token_id: device.id,
            shed_id: device.shed_id,
            power_source,
            battery_level_start: battery_level ?? null,
            is_ongoing: true,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to create power outage record:', insertError);
        } else {
          console.log(`Power outage started for device ${device.id}`);
          
          // Send initial alert
          await supabase.from('alerts').insert({
            user_id: userId,
            shed_id: device.shed_id,
            alert_type: 'power',
            severity: 'danger',
            message: 'Power failure detected! Running on backup.',
            message_bn: 'বিদ্যুৎ বিভ্রাট! ব্যাকআপ এ চলছে।',
          });

          // Send push notification
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                user_id: userId,
                title: '⚡ বিদ্যুৎ বিভ্রাট!',
                body: 'Power failure detected. Running on backup power.',
                severity: 'danger',
                url: '/alerts',
              }),
            });
          } catch (pushError) {
            console.error('Failed to send push notification:', pushError);
          }
        }
      } else {
        // Update ongoing outage with battery level
        if (battery_level !== undefined) {
          await supabase
            .from('power_outages')
            .update({ battery_level_end: battery_level })
            .eq('id', ongoingOutage.id);
        }

        // Check for critical duration (> 30 minutes) and send critical alert if not already sent
        const outageStart = new Date(ongoingOutage.started_at).getTime();
        const durationMinutes = (Date.now() - outageStart) / (1000 * 60);

        if (durationMinutes >= 30 && !ongoingOutage.critical_alert_sent) {
          await supabase
            .from('power_outages')
            .update({ critical_alert_sent: true })
            .eq('id', ongoingOutage.id);

          // Send critical alert
          await supabase.from('alerts').insert({
            user_id: userId,
            shed_id: device.shed_id,
            alert_type: 'power',
            severity: 'danger',
            message: `CRITICAL: Power outage for ${Math.round(durationMinutes)} minutes!`,
            message_bn: `জরুরি: বিদ্যুৎ বিভ্রাট ${Math.round(durationMinutes)} মিনিট!`,
          });

          // Send critical push notification
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                user_id: userId,
                title: '🚨 জরুরি বিদ্যুৎ বিভ্রাট!',
                body: `Power has been out for ${Math.round(durationMinutes)} minutes!`,
                severity: 'critical',
                url: '/alerts',
              }),
            });
          } catch (pushError) {
            console.error('Failed to send critical push notification:', pushError);
          }
        }
      }
    } else {
      // Power is ON - end any ongoing outage
      if (ongoingOutage) {
        const outageStart = new Date(ongoingOutage.started_at).getTime();
        const durationSeconds = Math.floor((Date.now() - outageStart) / 1000);

        await supabase
          .from('power_outages')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            is_ongoing: false,
            battery_level_end: battery_level ?? ongoingOutage.battery_level_end,
          })
          .eq('id', ongoingOutage.id);

        console.log(`Power restored for device ${device.id} after ${durationSeconds} seconds`);

        // Send power restored notification if outage was significant (> 1 minute)
        if (durationSeconds > 60) {
          await supabase.from('alerts').insert({
            user_id: userId,
            shed_id: device.shed_id,
            alert_type: 'power',
            severity: 'warning',
            message: `Power restored after ${Math.round(durationSeconds / 60)} minutes`,
            message_bn: `বিদ্যুৎ ফিরে এসেছে ${Math.round(durationSeconds / 60)} মিনিট পর`,
          });
        }
      }
    }

    // Update device status
    await supabase
      .from('device_status')
      .update({ power_on })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        power_on,
        has_ongoing_outage: !power_on,
        message: power_on ? 'Power status: ON' : 'Power status: OFF - outage tracking active'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Handle power status error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process power status', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getPowerOutages(supabase: any, userId: string) {
  try {
    // Get last 30 days of outages
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('power_outages')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to get power outages:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get power outages', code: 'FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const completedOutages = data.filter((o: any) => !o.is_ongoing && o.duration_seconds);
    const totalDowntime = completedOutages.reduce((sum: number, o: any) => sum + (o.duration_seconds || 0), 0);
    const avgDuration = completedOutages.length > 0 ? totalDowntime / completedOutages.length : 0;
    const ongoingOutage = data.find((o: any) => o.is_ongoing);

    return new Response(
      JSON.stringify({ 
        success: true,
        data,
        stats: {
          total_outages: data.length,
          total_downtime_seconds: totalDowntime,
          avg_duration_seconds: Math.round(avgDuration),
          ongoing_outage: ongoingOutage || null,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get power outages error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request', code: 'PROCESS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ===== FAIL-SAFE SYNC HANDLER =====
// Comprehensive sync endpoint for ESP32 fail-safe mode

interface FailsafeSyncPayload {
  // Sensor data
  temperature?: number;
  humidity?: number;
  ammonia?: number;
  water_usage?: number;
  power_on?: boolean;
  
  // Device states
  fan_on?: boolean;
  fan_speed?: string;
  light_on?: boolean;
  light_brightness?: number;
  alarm_on?: boolean;
  heater_on?: boolean;
  fogger_on?: boolean;
  circulation_fan_on?: boolean;
  ceiling_fan_on?: boolean;
  sprinkler_on?: boolean;
  
  // Failsafe status
  failsafe_mode?: boolean;
  cached_settings_version?: number;
  
  // Device health
  wifi_rssi?: number;
  uptime_seconds?: number;
  free_memory?: number;
  cpu_temperature?: number;
  battery_percentage?: number;
}

async function handleFailsafeSync(
  body: FailsafeSyncPayload, 
  supabase: any, 
  userId: string, 
  deviceToken: string
) {
  try {
    const now = new Date().toISOString();
    
    // Get device info (incl. farm_id for multi-tenant guard)
    const { data: device } = await supabase
      .from('device_tokens')
      .select('id, shed_id, farm_id, device_name')
      .eq('token', deviceToken)
      .single();

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD: reject if device token has no farm_id bound
    if (!device.farm_id) {
      console.error(`🚫 Failsafe sync rejected: device token has NULL farm_id`);
      return new Response(
        JSON.stringify({ error: 'Device not bound to a farm', code: 'NO_FARM_BOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Save sensor data if provided
    if (body.temperature !== undefined && body.humidity !== undefined) {
      await supabase.from('sensor_readings').insert({
        user_id: userId,
        farm_id: device.farm_id,
        shed_id: device.shed_id,
        temperature: body.temperature,
        humidity: body.humidity,
        ammonia: body.ammonia ?? 0,
        water_usage: body.water_usage ?? 0,
      });
    }

    // 2. Update device_status with ACTUAL state from ESP32 (device is source of truth)
    // Cloud never writes actual relay state - only ESP32 does via sync
    const deviceStatusUpdate: Record<string, any> = {
      updated_at: now,
      last_device_ack_at: now,
    };
    // These are actual states reported by the device
    if (body.fan_on !== undefined) deviceStatusUpdate.fan_on = body.fan_on;
    if (body.light_on !== undefined) {
      deviceStatusUpdate.light_on = body.light_on;
    } else if (typeof body.light_brightness === 'number') {
      deviceStatusUpdate.light_on = body.light_brightness > 0;
    }
    if (body.alarm_on !== undefined) deviceStatusUpdate.alarm_on = body.alarm_on;
    if (body.power_on !== undefined) deviceStatusUpdate.power_on = body.power_on;
    if (body.fan_speed !== undefined) deviceStatusUpdate.fan_speed = body.fan_speed;
    if (body.heater_on !== undefined) deviceStatusUpdate.heater_on = body.heater_on;
    if (body.fogger_on !== undefined) deviceStatusUpdate.fogger_on = body.fogger_on;
    if (body.circulation_fan_on !== undefined) deviceStatusUpdate.circulation_fan_on = body.circulation_fan_on;
    if (body.ceiling_fan_on !== undefined) deviceStatusUpdate.ceiling_fan_on = body.ceiling_fan_on;
    if (body.sprinkler_on !== undefined) deviceStatusUpdate.sprinkler_on = body.sprinkler_on;
    // Safety override from device
    if (typeof (body as any).safety_override === 'boolean') {
      deviceStatusUpdate.safety_override = (body as any).safety_override;
      deviceStatusUpdate.safety_override_reason = (body as any).safety_override_reason || null;
      if ((body as any).safety_override) {
        deviceStatusUpdate.safety_override_at = now;
      }
    }

    const { data: desiredStatus } = await supabase
      .from('device_status')
      .select([
        'desired_fan_on',
        'desired_light_on',
        'desired_alarm_on',
        'desired_heater_on',
        'desired_fogger_on',
        'desired_circulation_fan_on',
        'desired_ceiling_fan_on',
        'desired_sprinkler_on',
      ].join(', '))
      .eq('user_id', userId)
      .eq('shed_id', device.shed_id)
      .maybeSingle();

    if (desiredStatus) {
      const actualStates = {
        fan: deviceStatusUpdate.fan_on ?? false,
        light: deviceStatusUpdate.light_on ?? false,
        alarm: deviceStatusUpdate.alarm_on ?? false,
        heater: deviceStatusUpdate.heater_on ?? false,
        fogger: deviceStatusUpdate.fogger_on ?? false,
        circulationFan: deviceStatusUpdate.circulation_fan_on ?? false,
        ceilingFan: deviceStatusUpdate.ceiling_fan_on ?? false,
        sprinkler: deviceStatusUpdate.sprinkler_on ?? false,
      };

      deviceStatusUpdate.state_mismatch = [
        [desiredStatus.desired_fan_on, actualStates.fan],
        [desiredStatus.desired_light_on, actualStates.light],
        [desiredStatus.desired_alarm_on, actualStates.alarm],
        [desiredStatus.desired_heater_on, actualStates.heater],
        [desiredStatus.desired_fogger_on, actualStates.fogger],
        [desiredStatus.desired_circulation_fan_on, actualStates.circulationFan],
        [desiredStatus.desired_ceiling_fan_on, actualStates.ceilingFan],
        [desiredStatus.desired_sprinkler_on, actualStates.sprinkler],
      ].some(([desired, actual]) => desired !== null && desired !== actual);
    }

    await supabase
      .from('device_status')
      .update(deviceStatusUpdate)
      .eq('user_id', userId)
      .eq('shed_id', device.shed_id);

    // 3. Update device health with failsafe status
    const healthUpdate: Record<string, any> = {
      is_online: true,
      last_seen_at: now,
      last_cloud_sync_at: now,
      failsafe_mode: body.failsafe_mode ?? false,
      failsafe_activated_at: body.failsafe_mode ? now : null,
      wifi_signal_strength: body.wifi_rssi ?? null,
      uptime_seconds: body.uptime_seconds ?? null,
      free_memory_bytes: body.free_memory ?? null,
      cpu_temperature: body.cpu_temperature ?? null,
      battery_percentage: body.battery_percentage ?? null,
      cached_settings_version: body.cached_settings_version ?? 0,
    };

    // Upsert device health
    const { data: existingHealth } = await supabase
      .from('device_health')
      .select('id')
      .eq('device_token_id', device.id)
      .single();

    if (existingHealth) {
      await supabase
        .from('device_health')
        .update(healthUpdate)
        .eq('id', existingHealth.id);
    } else {
      await supabase.from('device_health').insert({
        ...healthUpdate,
        device_token_id: device.id,
        user_id: userId,
        shed_id: device.shed_id,
      });
    }

    // 4. Get all settings for fail-safe caching
    const { data: farmSettings } = await supabase
      .from('farm_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 4a. Check if cloud says MANUAL mode — force ESP32 to re-enter if needed
    const cloudAutomationMode = farmSettings?.automation_mode ?? 'AUTO';
    const isCloudManual = cloudAutomationMode === 'MANUAL';

    // 🐔 4b. Get shed's farm_type (per-shed support)
    let shedFarmType = 'layer';
    if (device.shed_id) {
      const { data: shed } = await supabase
        .from('sheds')
        .select('farm_type')
        .eq('id', device.shed_id)
        .single();
      shedFarmType = shed?.farm_type || 'layer';
    } else {
      // Fallback to profile-level farm_type
      const { data: profile } = await supabase
        .from('profiles')
        .select('farm_type')
        .eq('id', userId)
        .single();
      shedFarmType = profile?.farm_type || 'layer';
    }

    // 🐔 4c. Get active broiler batch for age calculation (if broiler shed)
    let broilerAgeDays = 1;
    if (shedFarmType === 'broiler') {
      const { data: activeBatch } = await supabase
        .from('broiler_batches')
        .select('start_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      
      if (activeBatch?.start_date) {
        const startDate = new Date(activeBatch.start_date);
        const today = new Date();
        broilerAgeDays = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        console.log(`[Broiler] Active batch started ${activeBatch.start_date}, age: ${broilerAgeDays} days`);
      }
    }

    // 5. Get lighting schedule
    const { data: lightingSchedule } = await supabase
      .from('lighting_schedule')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 6. Get automation rules
    const { data: automationRules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    // 6b. Get advanced automation settings
    let advSettingsQuery = supabase
      .from('advanced_automation_settings')
      .select('*')
      .eq('user_id', userId);
    
    if (device.shed_id) {
      advSettingsQuery = advSettingsQuery.eq('shed_id', device.shed_id);
    } else {
      advSettingsQuery = advSettingsQuery.is('shed_id', null);
    }
    
    const { data: advancedSettings } = await advSettingsQuery.maybeSingle();

    // 7. Get pending commands
    const { data: pendingCommands } = await supabase
      .from('device_commands')
      .select('id, command_type, command_value')
      .eq('user_id', userId)
      .eq('device_name', device.device_name)
      .eq('executed', false)
      .order('created_at', { ascending: true });

    // 8. Get current device status from DB
    const { data: currentStatus } = await supabase
      .from('device_status')
      .select('*')
      .eq('user_id', userId)
      .eq('shed_id', device.shed_id)
      .single();

    // Calculate settings version (hash-like for change detection)
    const settingsVersion = farmSettings ? 
      (farmSettings.updated_at ? new Date(farmSettings.updated_at).getTime() : 0) : 0;

    // Determine if ESP32 needs settings update
    const needsSettingsUpdate = (body.cached_settings_version ?? 0) < settingsVersion;

    // Build advanced automation object for ESP32
    const advDefaults = {
      min_vent_enabled: true, min_vent_temp_threshold: 26, min_vent_cycle_seconds: 40,
      min_vent_interval_minutes: 5, min_vent_ceiling_fan_always_on: true,
      heater_enabled: true, heater_on_temp: 20, heater_off_temp: 24, heater_tolerance: 0.7,
      fogger_enabled: false, fogger_start_temp: 32, fogger_start_humidity_max: 85,
      fogger_on_seconds: 40, fogger_pause_seconds: 120, fogger_stop_temp: 30, fogger_stop_humidity: 90,
      airflow_enabled: true, airflow_early_age_days: 10, airflow_mid_age_days: 20,
      airflow_mid_on_seconds: 30, airflow_mid_interval_minutes: 3,
      airflow_night_on_seconds: 60, airflow_night_interval_minutes: 5,
      lighting_fade_duration_minutes: 10,
      curtain_advisory_enabled: true, curtain_open_temp_diff: 3, curtain_close_on_cold: true,
      water_drop_threshold_percent: 30, water_night_spike_enabled: true,
      water_zero_flow_alert: true, water_baseline_hours: 24,
    };
    const adv = advancedSettings || advDefaults;

    // Build response
    const response: Record<string, any> = {
      success: true,
      server_time: now,
      settings_version: settingsVersion,
      needs_settings_update: needsSettingsUpdate,
      
      // ⚡ Authoritative automation mode from farm_settings
      // ESP32 MUST respect this — if cloud says MANUAL, ESP32 must stay in MANUAL
      automation_mode: cloudAutomationMode,
      force_manual_override: isCloudManual,
      
      // 🐔 Farm type and broiler age for ESP32 auto-config (per-shed)
      farm_type: shedFarmType,
      broiler_age_days: broilerAgeDays,
      
      // Desired state (what cloud wants - ESP32 decides final)
      desired_state: currentStatus ? {
        fan_on: currentStatus.desired_fan_on ?? false,
        light_on: currentStatus.desired_light_on ?? false,
        alarm_on: currentStatus.desired_alarm_on ?? false,
        heater_on: currentStatus.desired_heater_on ?? false,
        fogger_on: currentStatus.desired_fogger_on ?? false,
        circulation_fan_on: currentStatus.desired_circulation_fan_on ?? false,
        ceiling_fan_on: currentStatus.desired_ceiling_fan_on ?? false,
        sprinkler_on: currentStatus.desired_sprinkler_on ?? false,
        manual_override: currentStatus.desired_manual_override ?? isCloudManual,
        fan_speed: currentStatus.desired_fan_speed ?? 'OFF',
      } : null,
      
      // Actual state (what device last reported)
      actual_state: currentStatus ? {
        fan_on: currentStatus.fan_on,
        light_on: currentStatus.light_on,
        alarm_on: currentStatus.alarm_on,
        power_on: currentStatus.power_on,
        fan_speed: currentStatus.fan_speed,
        manual_override: currentStatus.manual_override,
        heater_on: currentStatus.heater_on ?? false,
        fogger_on: currentStatus.fogger_on ?? false,
        circulation_fan_on: currentStatus.circulation_fan_on ?? false,
        ceiling_fan_on: currentStatus.ceiling_fan_on ?? false,
        sprinkler_on: currentStatus.sprinkler_on ?? false,
      } : null,
      
      // Safety override status
      safety_override: currentStatus?.safety_override ?? false,
      state_mismatch: currentStatus?.state_mismatch ?? false,
      
      // Legacy: device_status (kept for backward compatibility)
      device_status: currentStatus ? {
        fan_on: currentStatus.fan_on,
        light_on: currentStatus.light_on,
        alarm_on: currentStatus.alarm_on,
        power_on: currentStatus.power_on,
        fan_speed: currentStatus.fan_speed,
        manual_override: currentStatus.manual_override,
        heater_on: currentStatus.heater_on ?? false,
        fogger_on: currentStatus.fogger_on ?? false,
        circulation_fan_on: currentStatus.circulation_fan_on ?? false,
        ceiling_fan_on: currentStatus.ceiling_fan_on ?? false,
        sprinkler_on: currentStatus.sprinkler_on ?? false,
      } : null,
      
      // Manual override status
      manual_override: currentStatus?.desired_manual_override ?? currentStatus?.manual_override ?? false,
      
      // Pending commands for execution
      commands: pendingCommands || [],
      
      // Full settings for caching (only if version changed)
      settings: needsSettingsUpdate && farmSettings ? {
        temperature_min: Number(farmSettings.temperature_min),
        temperature_max: Number(farmSettings.temperature_max),
        humidity_min: Number(farmSettings.humidity_min),
        humidity_max: Number(farmSettings.humidity_max),
        ammonia_max: Number(farmSettings.ammonia_max),
        fan_low_temp_min: Number(farmSettings.fan_low_temp_min),
        fan_low_temp_max: Number(farmSettings.fan_low_temp_max),
        fan_medium_temp_min: Number(farmSettings.fan_medium_temp_min),
        fan_medium_temp_max: Number(farmSettings.fan_medium_temp_max),
        fan_high_temp_min: Number(farmSettings.fan_high_temp_min),
        hsi_mild_threshold: Number(farmSettings.hsi_mild_threshold),
        hsi_moderate_threshold: Number(farmSettings.hsi_moderate_threshold),
        hsi_severe_threshold: Number(farmSettings.hsi_severe_threshold),
        hsi_emergency_threshold: Number(farmSettings.hsi_emergency_threshold),
        hsi_automation_enabled: farmSettings.hsi_automation_enabled,
        water_anomaly_threshold: Number(farmSettings.water_anomaly_threshold),
        version: settingsVersion,
      } : null,
      
      // 🆕 Advanced automation settings for 7 modules
      advanced_automation: needsSettingsUpdate ? {
        min_vent: {
          enabled: adv.min_vent_enabled ?? advDefaults.min_vent_enabled,
          temp_threshold: Number(adv.min_vent_temp_threshold ?? advDefaults.min_vent_temp_threshold),
          cycle_seconds: adv.min_vent_cycle_seconds ?? advDefaults.min_vent_cycle_seconds,
          interval_minutes: adv.min_vent_interval_minutes ?? advDefaults.min_vent_interval_minutes,
          ceiling_fan_always_on: adv.min_vent_ceiling_fan_always_on ?? advDefaults.min_vent_ceiling_fan_always_on,
        },
        heater: {
          enabled: adv.heater_enabled ?? advDefaults.heater_enabled,
          on_temp: Number(adv.heater_on_temp ?? advDefaults.heater_on_temp),
          off_temp: Number(adv.heater_off_temp ?? advDefaults.heater_off_temp),
          tolerance: Number(adv.heater_tolerance ?? advDefaults.heater_tolerance),
        },
        fogger: {
          enabled: adv.fogger_enabled ?? advDefaults.fogger_enabled,
          start_temp: Number(adv.fogger_start_temp ?? advDefaults.fogger_start_temp),
          start_humidity_max: adv.fogger_start_humidity_max ?? advDefaults.fogger_start_humidity_max,
          on_seconds: adv.fogger_on_seconds ?? advDefaults.fogger_on_seconds,
          pause_seconds: adv.fogger_pause_seconds ?? advDefaults.fogger_pause_seconds,
          stop_temp: Number(adv.fogger_stop_temp ?? advDefaults.fogger_stop_temp),
          stop_humidity: adv.fogger_stop_humidity ?? advDefaults.fogger_stop_humidity,
        },
        airflow: {
          enabled: adv.airflow_enabled ?? advDefaults.airflow_enabled,
          early_age_days: adv.airflow_early_age_days ?? advDefaults.airflow_early_age_days,
          mid_age_days: adv.airflow_mid_age_days ?? advDefaults.airflow_mid_age_days,
          mid_on_seconds: adv.airflow_mid_on_seconds ?? advDefaults.airflow_mid_on_seconds,
          mid_interval_minutes: adv.airflow_mid_interval_minutes ?? advDefaults.airflow_mid_interval_minutes,
          night_on_seconds: adv.airflow_night_on_seconds ?? advDefaults.airflow_night_on_seconds,
          night_interval_minutes: adv.airflow_night_interval_minutes ?? advDefaults.airflow_night_interval_minutes,
        },
        curtain_advisory: {
          enabled: adv.curtain_advisory_enabled ?? advDefaults.curtain_advisory_enabled,
          open_temp_diff: Number(adv.curtain_open_temp_diff ?? advDefaults.curtain_open_temp_diff),
          close_on_cold: adv.curtain_close_on_cold ?? advDefaults.curtain_close_on_cold,
        },
        water_analytics: {
          drop_threshold_percent: adv.water_drop_threshold_percent ?? advDefaults.water_drop_threshold_percent,
          night_spike_enabled: adv.water_night_spike_enabled ?? advDefaults.water_night_spike_enabled,
          zero_flow_alert: adv.water_zero_flow_alert ?? advDefaults.water_zero_flow_alert,
          baseline_hours: adv.water_baseline_hours ?? advDefaults.water_baseline_hours,
        },
        lighting: {
          fade_duration_minutes: adv.lighting_fade_duration_minutes ?? advDefaults.lighting_fade_duration_minutes,
        },
      } : null,
      
      // Lighting schedule for caching
      lighting: needsSettingsUpdate && lightingSchedule ? {
        start_time: lightingSchedule.start_time,
        end_time: lightingSchedule.end_time,
        gradual_enabled: lightingSchedule.gradual_enabled,
        fade_in_minutes: lightingSchedule.fade_in_minutes,
        fade_out_minutes: lightingSchedule.fade_out_minutes,
        min_brightness: lightingSchedule.min_brightness,
        max_brightness: lightingSchedule.max_brightness,
        manual_override: lightingSchedule.manual_override,
        ldr_enabled: (lightingSchedule as any).ldr_enabled ?? false,
        ldr_threshold_lux: (lightingSchedule as any).ldr_threshold_lux ?? 50,
        ldr_hysteresis_lux: (lightingSchedule as any).ldr_hysteresis_lux ?? 20,
        ldr_mode: (lightingSchedule as any).ldr_mode ?? 'hybrid',
        // Smart Lighting v2
        ldr_daylight_off_lux: (lightingSchedule as any).ldr_daylight_off_lux ?? 300,
        fade_circuits: (lightingSchedule as any).fade_circuits ?? 2,
        fade_step_gap_minutes: (lightingSchedule as any).fade_step_gap_minutes ?? 5,
        flock_type: (lightingSchedule as any).flock_type ?? 'layer',
        layer_dark_hours: (lightingSchedule as any).layer_dark_hours ?? 9,
        broiler_dark_start: (lightingSchedule as any).broiler_dark_start ?? '23:00:00',
        broiler_dark_end: (lightingSchedule as any).broiler_dark_end ?? '05:00:00',
        broiler_age_auto: (lightingSchedule as any).broiler_age_auto ?? true,
      } : null,
      
      // Automation rules for local execution
      automation_rules: needsSettingsUpdate && automationRules ? 
        automationRules.map((rule: any) => ({
          sensor: rule.condition_sensor,
          operator: rule.condition_operator,
          value: Number(rule.condition_value),
          device: rule.action_device,
          state: rule.action_state,
        })) : null,
    };

    // Log sync event
    console.log(`[Failsafe Sync] Device: ${device.device_name}, Failsafe: ${body.failsafe_mode}, Version: ${body.cached_settings_version} -> ${settingsVersion}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Failsafe sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Sync failed', code: 'SYNC_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 GET /system-status - Complete System Status Endpoint
// ═══════════════════════════════════════════════════════════════════════════
// This is the "one-call-gets-all" endpoint for ESP32 boot/sync
// Returns everything ESP32 needs in a single request:
// - Farm settings (thresholds)
// - Automation rules
// - Device status (fan, light, alarm states)
// - Lighting schedule
// - Pending commands
// - Active power outage status
// ═══════════════════════════════════════════════════════════════════════════
async function getSystemStatus(
  supabase: any, 
  userId: string, 
  shedId: string | null,
  deviceName: string | null
) {
  try {
    const now = new Date().toISOString();
    
    // 1. Farm Settings
    const { data: farmSettings } = await supabase
      .from('farm_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 2. Device Status (for specific shed if provided)
    let statusQuery = supabase
      .from('device_status')
      .select('*')
      .eq('user_id', userId);
    
    if (shedId) {
      statusQuery = statusQuery.eq('shed_id', shedId);
    }
    
    const { data: deviceStatus } = await statusQuery.maybeSingle();

    // 3. Device Health (for monitoring)
    let healthQuery = supabase
      .from('device_health')
      .select('*')
      .eq('user_id', userId);
    
    if (shedId) {
      healthQuery = healthQuery.eq('shed_id', shedId);
    }
    
    const { data: deviceHealth } = await healthQuery.maybeSingle();

    // 4. Automation Rules (enabled only)
    const { data: automationRules } = await supabase
      .from('automation_rules')
      .select('id, condition_sensor, condition_operator, condition_value, action_device, action_state')
      .eq('user_id', userId)
      .eq('enabled', true);

    // 5. Lighting Schedule
    const { data: lightingSchedule } = await supabase
      .from('lighting_schedule')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 6. Pending Commands (for specific device)
    const targetDeviceName = deviceName || 'ESP32_LAYER_001';
    const { data: pendingCommands } = await supabase
      .from('device_commands')
      .select('id, command_type, command_value, created_at')
      .eq('user_id', userId)
      .eq('device_name', targetDeviceName)
      .eq('executed', false)
      .order('created_at', { ascending: true });

    // 7. Active Power Outage (if any)
    let outageQuery = supabase
      .from('power_outages')
      .select('id, started_at, power_source, battery_level_start, is_ongoing')
      .eq('user_id', userId)
      .eq('is_ongoing', true);
    
    if (shedId) {
      outageQuery = outageQuery.eq('shed_id', shedId);
    }
    
    const { data: activeOutage } = await outageQuery.maybeSingle();

    // 8. Latest Sensor Reading
    let sensorQuery = supabase
      .from('sensor_readings')
      .select('temperature, humidity, ammonia, water_usage, hsi, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1);
    
    if (shedId) {
      sensorQuery = sensorQuery.eq('shed_id', shedId);
    }
    
    const { data: latestSensor } = await sensorQuery.maybeSingle();

    // Calculate settings version for caching
    const settingsVersion = farmSettings?.updated_at 
      ? new Date(farmSettings.updated_at).getTime() 
      : 0;

    // Build comprehensive response
    const response = {
      success: true,
      timestamp: now,
      settings_version: settingsVersion,
      
      // Thresholds for automation
      settings: farmSettings ? {
        temperature_min: Number(farmSettings.temperature_min),
        temperature_max: Number(farmSettings.temperature_max),
        humidity_min: Number(farmSettings.humidity_min),
        humidity_max: Number(farmSettings.humidity_max),
        ammonia_max: Number(farmSettings.ammonia_max),
        // Fan speed thresholds
        fan_low_temp_min: Number(farmSettings.fan_low_temp_min),
        fan_low_temp_max: Number(farmSettings.fan_low_temp_max),
        fan_medium_temp_min: Number(farmSettings.fan_medium_temp_min),
        fan_medium_temp_max: Number(farmSettings.fan_medium_temp_max),
        fan_high_temp_min: Number(farmSettings.fan_high_temp_min),
        // HSI thresholds
        hsi_mild_threshold: Number(farmSettings.hsi_mild_threshold),
        hsi_moderate_threshold: Number(farmSettings.hsi_moderate_threshold),
        hsi_severe_threshold: Number(farmSettings.hsi_severe_threshold),
        hsi_emergency_threshold: Number(farmSettings.hsi_emergency_threshold),
        hsi_automation_enabled: farmSettings.hsi_automation_enabled,
        water_anomaly_threshold: Number(farmSettings.water_anomaly_threshold),
      } : null,
      
      // Current device state
      device_status: deviceStatus ? {
        mode: deviceStatus.mode || 'AUTO',
        fan_on: deviceStatus.fan_on,
        fan_speed: deviceStatus.fan_speed,
        light_on: deviceStatus.light_on,
        alarm_on: deviceStatus.alarm_on,
        power_on: deviceStatus.power_on,
        manual_override: deviceStatus.manual_override,
        hsi: deviceStatus.hsi ? Number(deviceStatus.hsi) : null,
        last_cloud_sync: deviceStatus.last_cloud_sync,
      } : null,
      
      // Device health monitoring
      device_health: deviceHealth ? {
        is_online: deviceHealth.is_online,
        failsafe_mode: deviceHealth.failsafe_mode,
        mode: deviceHealth.mode,
        battery_percentage: deviceHealth.battery_percentage,
        power_source: deviceHealth.power_source,
        wifi_signal_strength: deviceHealth.wifi_signal_strength,
        uptime_seconds: deviceHealth.uptime_seconds,
        last_seen_at: deviceHealth.last_seen_at,
        last_error_message: deviceHealth.last_error_message,
      } : null,
      
      // Latest sensor readings
      latest_sensor: latestSensor ? {
        temperature: Number(latestSensor.temperature),
        humidity: Number(latestSensor.humidity),
        ammonia: Number(latestSensor.ammonia),
        water_usage: Number(latestSensor.water_usage),
        hsi: latestSensor.hsi ? Number(latestSensor.hsi) : null,
        recorded_at: latestSensor.recorded_at,
      } : null,
      
      // Automation rules for local execution
      automation_rules: automationRules ? automationRules.map((rule: any) => ({
        id: rule.id,
        sensor: rule.condition_sensor,
        operator: rule.condition_operator,
        value: Number(rule.condition_value),
        device: rule.action_device,
        state: rule.action_state,
      })) : [],
      
      // Lighting schedule
      lighting: lightingSchedule ? {
        start_time: lightingSchedule.start_time,
        end_time: lightingSchedule.end_time,
        total_hours: Number(lightingSchedule.total_hours),
        gradual_enabled: lightingSchedule.gradual_enabled,
        fade_in_minutes: lightingSchedule.fade_in_minutes,
        fade_out_minutes: lightingSchedule.fade_out_minutes,
        min_brightness: lightingSchedule.min_brightness,
        max_brightness: lightingSchedule.max_brightness,
        manual_override: lightingSchedule.manual_override,
        ldr_enabled: (lightingSchedule as any).ldr_enabled ?? false,
        ldr_threshold_lux: (lightingSchedule as any).ldr_threshold_lux ?? 50,
        ldr_hysteresis_lux: (lightingSchedule as any).ldr_hysteresis_lux ?? 20,
        ldr_mode: (lightingSchedule as any).ldr_mode ?? 'hybrid',
        // Smart Lighting v2
        ldr_daylight_off_lux: (lightingSchedule as any).ldr_daylight_off_lux ?? 300,
        fade_circuits: (lightingSchedule as any).fade_circuits ?? 2,
        fade_step_gap_minutes: (lightingSchedule as any).fade_step_gap_minutes ?? 5,
        flock_type: (lightingSchedule as any).flock_type ?? 'layer',
        layer_dark_hours: (lightingSchedule as any).layer_dark_hours ?? 9,
        broiler_dark_start: (lightingSchedule as any).broiler_dark_start ?? '23:00:00',
        broiler_dark_end: (lightingSchedule as any).broiler_dark_end ?? '05:00:00',
        broiler_age_auto: (lightingSchedule as any).broiler_age_auto ?? true,
      } : null,
      
      // Pending commands for execution
      commands: pendingCommands || [],
      commands_count: pendingCommands?.length || 0,
      
      // Active power outage
      power_outage: activeOutage ? {
        id: activeOutage.id,
        started_at: activeOutage.started_at,
        power_source: activeOutage.power_source,
        battery_level: activeOutage.battery_level_start,
        is_ongoing: activeOutage.is_ongoing,
      } : null,
    };

    console.log(`[System Status] User: ${userId}, Shed: ${shedId || 'all'}, Device: ${targetDeviceName}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('System status error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get system status', code: 'STATUS_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 GET /advanced-settings - Advanced Automation Settings Endpoint
// ═══════════════════════════════════════════════════════════════════════════
// Returns all 7 automation module settings for ESP32:
// - Module 1: Minimum Ventilation Timer
// - Module 2: Heater Control
// - Module 3: Fogger Cooling
// - Module 4: Broiler Airflow Growth Mode
// - Module 5: Lighting fade duration
// - Module 6: Curtain Advisory
// - Module 7: Water Analytics
// ═══════════════════════════════════════════════════════════════════════════
async function getAdvancedSettings(
  supabase: any, 
  userId: string, 
  shedId: string | null
) {
  try {
    // Build query for advanced automation settings
    let query = supabase
      .from('advanced_automation_settings')
      .select('*')
      .eq('user_id', userId);

    if (shedId) {
      query = query.eq('shed_id', shedId);
    } else {
      query = query.is('shed_id', null);
    }

    const { data: settings, error } = await query.maybeSingle();

    if (error) {
      console.error('Failed to get advanced settings:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get advanced settings', code: 'FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return default values if no settings exist
    const defaults = {
      min_vent_enabled: true,
      min_vent_temp_threshold: 26,
      min_vent_cycle_seconds: 40,
      min_vent_interval_minutes: 5,
      min_vent_ceiling_fan_always_on: true,
      heater_enabled: true,
      heater_on_temp: 20,
      heater_off_temp: 24,
      heater_tolerance: 0.7,
      fogger_enabled: false,
      fogger_start_temp: 32,
      fogger_start_humidity_max: 85,
      fogger_on_seconds: 40,
      fogger_pause_seconds: 120,
      fogger_stop_temp: 30,
      fogger_stop_humidity: 90,
      airflow_enabled: true,
      airflow_early_age_days: 10,
      airflow_mid_age_days: 20,
      airflow_mid_on_seconds: 30,
      airflow_mid_interval_minutes: 3,
      airflow_night_on_seconds: 60,
      airflow_night_interval_minutes: 5,
      lighting_fade_duration_minutes: 10,
      curtain_advisory_enabled: true,
      curtain_open_temp_diff: 3,
      curtain_close_on_cold: true,
      water_drop_threshold_percent: 30,
      water_night_spike_enabled: true,
      water_zero_flow_alert: true,
      water_baseline_hours: 24,
      automation_priority: 'safety,heating,cooling,ventilation,lighting,advisory',
    };

    const data = settings || defaults;

    // Format response in ESP32-friendly structure
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      shed_id: shedId,
      advanced_automation: {
        min_vent: {
          enabled: data.min_vent_enabled ?? defaults.min_vent_enabled,
          temp_threshold: Number(data.min_vent_temp_threshold ?? defaults.min_vent_temp_threshold),
          cycle_seconds: data.min_vent_cycle_seconds ?? defaults.min_vent_cycle_seconds,
          interval_minutes: data.min_vent_interval_minutes ?? defaults.min_vent_interval_minutes,
          ceiling_fan_always_on: data.min_vent_ceiling_fan_always_on ?? defaults.min_vent_ceiling_fan_always_on,
        },
        heater: {
          enabled: data.heater_enabled ?? defaults.heater_enabled,
          on_temp: Number(data.heater_on_temp ?? defaults.heater_on_temp),
          off_temp: Number(data.heater_off_temp ?? defaults.heater_off_temp),
          tolerance: Number(data.heater_tolerance ?? defaults.heater_tolerance),
        },
        fogger: {
          enabled: data.fogger_enabled ?? defaults.fogger_enabled,
          start_temp: Number(data.fogger_start_temp ?? defaults.fogger_start_temp),
          start_humidity_max: data.fogger_start_humidity_max ?? defaults.fogger_start_humidity_max,
          on_seconds: data.fogger_on_seconds ?? defaults.fogger_on_seconds,
          pause_seconds: data.fogger_pause_seconds ?? defaults.fogger_pause_seconds,
          stop_temp: Number(data.fogger_stop_temp ?? defaults.fogger_stop_temp),
          stop_humidity: data.fogger_stop_humidity ?? defaults.fogger_stop_humidity,
        },
        airflow: {
          enabled: data.airflow_enabled ?? defaults.airflow_enabled,
          early_age_days: data.airflow_early_age_days ?? defaults.airflow_early_age_days,
          mid_age_days: data.airflow_mid_age_days ?? defaults.airflow_mid_age_days,
          mid_on_seconds: data.airflow_mid_on_seconds ?? defaults.airflow_mid_on_seconds,
          mid_interval_minutes: data.airflow_mid_interval_minutes ?? defaults.airflow_mid_interval_minutes,
          night_on_seconds: data.airflow_night_on_seconds ?? defaults.airflow_night_on_seconds,
          night_interval_minutes: data.airflow_night_interval_minutes ?? defaults.airflow_night_interval_minutes,
        },
        curtain_advisory: {
          enabled: data.curtain_advisory_enabled ?? defaults.curtain_advisory_enabled,
          open_temp_diff: Number(data.curtain_open_temp_diff ?? defaults.curtain_open_temp_diff),
          close_on_cold: data.curtain_close_on_cold ?? defaults.curtain_close_on_cold,
        },
        water_analytics: {
          drop_threshold_percent: data.water_drop_threshold_percent ?? defaults.water_drop_threshold_percent,
          night_spike_enabled: data.water_night_spike_enabled ?? defaults.water_night_spike_enabled,
          zero_flow_alert: data.water_zero_flow_alert ?? defaults.water_zero_flow_alert,
          baseline_hours: data.water_baseline_hours ?? defaults.water_baseline_hours,
        },
        lighting: {
          fade_duration_minutes: data.lighting_fade_duration_minutes ?? defaults.lighting_fade_duration_minutes,
        },
      },
      priority: (data.automation_priority ?? defaults.automation_priority).split(','),
    };

    console.log(`[Advanced Settings] User: ${userId}, Shed: ${shedId || 'global'}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get advanced settings error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get advanced settings', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 GET /config - INDUSTRIAL SAFETY MODEL
// ═══════════════════════════════════════════════════════════════════════════
// Cloud sends ONLY configuration parameters.
// ESP32 runs ALL automation logic locally (temperature ventilation, HSI,
// ammonia protection, minimum ventilation, emergency survival).
// Cloud NEVER directly controls relays.
//
// Response format matches the user's specification:
// { targetTemp, minVentilationPercent, birdAge, mode, ... }
// ═══════════════════════════════════════════════════════════════════════════
async function getDeviceConfig(supabase: any, userId: string, shedId: string | null) {
  try {
    // Fetch all config sources in parallel (shed-aware)
    const [shedRes, settingsRes, advancedRes, batchRes, deviceStatusRes, lightingRes] = await Promise.all([
      shedId 
        ? supabase.from('sheds').select('farm_type').eq('id', shedId).single()
        : supabase.from('profiles').select('farm_type').eq('id', userId).single(),
      supabase.from('farm_settings').select('*').eq('user_id', userId).single(),
      shedId
        ? supabase.from('advanced_automation_settings').select('*').eq('user_id', userId).eq('shed_id', shedId).maybeSingle()
        : supabase.from('advanced_automation_settings').select('*').eq('user_id', userId).is('shed_id', null).maybeSingle(),
      shedId
        ? supabase.from('broiler_batches').select('start_date, current_bird_count, breed, status').eq('user_id', userId).eq('shed_id', shedId).eq('status', 'active').maybeSingle()
        : supabase.from('broiler_batches').select('start_date, current_bird_count, breed, status').eq('user_id', userId).eq('status', 'active').maybeSingle(),
      shedId
        ? supabase.from('device_status').select('manual_override, desired_manual_override, mode').eq('user_id', userId).eq('shed_id', shedId).maybeSingle()
        : supabase.from('device_status').select('manual_override, desired_manual_override, mode').eq('user_id', userId).maybeSingle(),
      supabase.from('lighting_schedule').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const shedData = shedRes.data;
    const settings = settingsRes.data;
    const advanced = advancedRes.data;
    const batch = batchRes.data;
    const deviceStatus = deviceStatusRes.data;
    const lighting = lightingRes.data;

    // Determine farm type from shed (per-shed support)
    const farmType = shedData?.farm_type || 'layer';
    const isBroiler = farmType === 'broiler';

    // Calculate bird age for broilers
    let birdAge = 1;
    if (isBroiler && batch?.start_date) {
      const startDate = new Date(batch.start_date);
      const now = new Date();
      birdAge = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1);
    }

    // Get target temperature based on farm type and age
    let targetTemp: { min: number; max: number };
    if (isBroiler) {
      targetTemp = getBroilerTargetTemp(birdAge);
    } else {
      targetTemp = {
        min: settings?.temperature_min ?? 18,
        max: settings?.temperature_max ?? 27,
      };
    }

    // Determine mode — farm_settings.automation_mode is the AUTHORITATIVE source
    // device_status.manual_override/desired_manual_override are secondary signals
    const cloudAutomationMode = settings?.automation_mode ?? 'AUTO';
    const mode = cloudAutomationMode === 'MANUAL' ? 'MANUAL' 
      : (deviceStatus?.manual_override || deviceStatus?.desired_manual_override) ? 'MANUAL' 
      : (deviceStatus?.mode || 'AUTO');

    // Current server time for ESP32 time sync
    const now = new Date();

    // Build config response - ONLY parameters, NEVER relay states
    const config = {
      // === Core Parameters ===
      farmType: isBroiler ? 'BROILER' : 'LAYER',
      birdAge: birdAge,
      mode: mode,
      targetTemp: (targetTemp.min + targetTemp.max) / 2,
      targetTempMin: targetTemp.min,
      targetTempMax: targetTemp.max,

      // === Ventilation Thresholds ===
      minVentilationPercent: advanced?.min_vent_enabled !== false ? 15 : 0,
      minVent: {
        enabled: advanced?.min_vent_enabled ?? true,
        tempThreshold: advanced?.min_vent_temp_threshold ?? 26,
        cycleSeconds: advanced?.min_vent_cycle_seconds ?? 40,
        intervalMinutes: advanced?.min_vent_interval_minutes ?? 5,
        ceilingFanAlwaysOn: advanced?.min_vent_ceiling_fan_always_on ?? true,
      },

      // === Temperature Thresholds ===
      thresholds: {
        tempMin: settings?.temperature_min ?? (isBroiler ? targetTemp.min : 18),
        tempMax: settings?.temperature_max ?? (isBroiler ? targetTemp.max : 27),
        tempFanHigh: isBroiler ? targetTemp.max + 2 : (settings?.fan_high_temp_min ?? 30),
        humidityMin: settings?.humidity_min ?? 40,
        humidityMax: settings?.humidity_max ?? 80,
        ammoniaMax: settings?.ammonia_max ?? (isBroiler ? 20 : 15),
        ammoniaAlarm: isBroiler ? 30 : 25,
      },

      // === HSI (Heat Stress Index) Thresholds ===
      hsi: {
        enabled: settings?.hsi_automation_enabled ?? true,
        mild: settings?.hsi_mild_threshold ?? 75,
        moderate: settings?.hsi_moderate_threshold ?? (isBroiler ? 78 : 80),
        severe: settings?.hsi_severe_threshold ?? (isBroiler ? 82 : 85),
        emergency: settings?.hsi_emergency_threshold ?? (isBroiler ? 86 : 90),
      },

      // === Heater Control ===
      heater: {
        enabled: advanced?.heater_enabled ?? true,
        onTemp: advanced?.heater_on_temp ?? (isBroiler ? targetTemp.min - 2 : 20),
        offTemp: advanced?.heater_off_temp ?? (isBroiler ? targetTemp.min : 24),
        tolerance: advanced?.heater_tolerance ?? 0.7,
        safetyMaxTemp: 34,  // HARD LIMIT - never override
      },

      // === Fogger Cooling ===
      fogger: {
        enabled: advanced?.fogger_enabled ?? false,
        startTemp: advanced?.fogger_start_temp ?? 32,
        startHumidityMax: advanced?.fogger_start_humidity_max ?? 85,
        onSeconds: advanced?.fogger_on_seconds ?? 40,
        pauseSeconds: advanced?.fogger_pause_seconds ?? 120,
        stopTemp: advanced?.fogger_stop_temp ?? 30,
        stopHumidity: advanced?.fogger_stop_humidity ?? 90,
      },

      // === Airflow (Broiler Growth Mode) ===
      airflow: {
        enabled: advanced?.airflow_enabled ?? true,
        earlyAgeDays: advanced?.airflow_early_age_days ?? 10,
        midAgeDays: advanced?.airflow_mid_age_days ?? 20,
        midOnSeconds: advanced?.airflow_mid_on_seconds ?? 30,
        midIntervalMinutes: advanced?.airflow_mid_interval_minutes ?? 3,
        nightOnSeconds: advanced?.airflow_night_on_seconds ?? 60,
        nightIntervalMinutes: advanced?.airflow_night_interval_minutes ?? 5,
      },

      // === Lighting Schedule ===
      lighting: {
        enabled: lighting?.gradual_enabled ?? true,
        startHour: lighting ? parseInt(lighting.start_time?.split(':')[0] || '5') : 5,
        startMinute: lighting ? parseInt(lighting.start_time?.split(':')[1] || '0') : 0,
        endHour: lighting ? parseInt(lighting.end_time?.split(':')[0] || '21') : 21,
        endMinute: lighting ? parseInt(lighting.end_time?.split(':')[1] || '0') : 0,
        fadeInMinutes: lighting?.fade_in_minutes ?? 30,
        fadeOutMinutes: lighting?.fade_out_minutes ?? 30,
        minBrightness: lighting?.min_brightness ?? 0,
        maxBrightness: lighting?.max_brightness ?? 100,
        fadeDurationMinutes: advanced?.lighting_fade_duration_minutes ?? 10,
      },

      // === Fan Speed Ranges ===
      fanSpeed: {
        lowTempMin: settings?.fan_low_temp_min ?? 26,
        lowTempMax: settings?.fan_low_temp_max ?? 28,
        mediumTempMin: settings?.fan_medium_temp_min ?? 28,
        mediumTempMax: settings?.fan_medium_temp_max ?? 30,
        highTempMin: settings?.fan_high_temp_min ?? 30,
      },

      // === Time Sync ===
      currentHour: now.getUTCHours() + 6, // Bangladesh = UTC+6
      currentMinute: now.getMinutes(),
      timestamp: now.toISOString(),

      // === Safety Engine Toggle ===
      // When false: ESP32 disables Arbiter, ESM, HSI auto, hysteresis bypass.
      // Hard floor (>42°C) always remains active in firmware.
      safety_engine_enabled: settings?.safety_engine_enabled ?? true,

      // === Metadata ===
      configVersion: Date.now(),
      architecture: 'INDUSTRIAL_SAFETY',
      note: 'Cloud sends config only. ESP32 runs all automation. Relays never controlled by cloud.',
    };

    console.log(`[Config] User: ${userId}, Farm: ${farmType}, Age: ${birdAge}, Mode: ${mode}`);

    return new Response(
      JSON.stringify(config),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get device config error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get config', code: 'CONFIG_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 PHASE 3: SENSOR BATCH (offline buffer flush via RPC + audit)
// ═══════════════════════════════════════════════════════════════════════════
async function handleSensorBatch(body: any, supabase: any, userId: string, deviceToken: string) {
  try {
    const readings = Array.isArray(body?.readings) ? body.readings : null;
    if (!readings || readings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'readings array required', code: 'EMPTY_BATCH' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (readings.length > 200) {
      return new Response(
        JSON.stringify({ error: 'max 200 readings per batch', code: 'BATCH_TOO_LARGE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: deviceInfo } = await supabase
      .from('device_tokens')
      .select('id, shed_id, farm_id')
      .eq('token', deviceToken)
      .single();

    if (!deviceInfo || !deviceInfo.farm_id) {
      return new Response(
        JSON.stringify({ error: 'Device not bound to a farm', code: 'NO_FARM_BOUND' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('accept_sensor_batch', {
      _device_token_id: deviceInfo.id,
      _user_id: userId,
      _farm_id: deviceInfo.farm_id,
      _shed_id: deviceInfo.shed_id,
      _readings: readings,
    });

    if (rpcError) {
      console.error('sensor-batch RPC error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'RPC failed', code: 'RPC_ERROR', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ...rpcResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('sensor-batch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to ingest batch', code: 'BATCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 PHASE 3: CONNECTION QUALITY UPDATE
// ═══════════════════════════════════════════════════════════════════════════
function computeQualityScore(rssi: number | null, gapSec: number, failedSyncs: number): number {
  let score = 100;
  // RSSI penalty (best ~ -50, weak ~ -85)
  if (rssi != null) {
    if (rssi <= -85) score -= 40;
    else if (rssi <= -75) score -= 25;
    else if (rssi <= -65) score -= 10;
  }
  // Gap penalty (>60s starts hurting)
  if (gapSec > 300) score -= 30;
  else if (gapSec > 120) score -= 15;
  else if (gapSec > 60) score -= 5;
  // Failure streak
  if (failedSyncs >= 5) score -= 30;
  else if (failedSyncs >= 2) score -= 15;
  return Math.max(0, Math.min(100, score));
}

async function handleQualityUpdate(body: any, supabase: any, userId: string, deviceToken: string) {
  try {
    const rssi = typeof body?.wifi_rssi === 'number' ? body.wifi_rssi : null;
    const gapSec = typeof body?.last_sync_gap_seconds === 'number' ? body.last_sync_gap_seconds : 0;
    const failed = typeof body?.consecutive_failed_syncs === 'number' ? body.consecutive_failed_syncs : 0;

    const { data: deviceInfo } = await supabase
      .from('device_tokens')
      .select('id, farm_id')
      .eq('token', deviceToken)
      .single();
    if (!deviceInfo) {
      return new Response(
        JSON.stringify({ error: 'Device not found', code: 'DEVICE_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const score = computeQualityScore(rssi, gapSec, failed);

    await supabase
      .from('device_health')
      .update({
        connection_quality_score: score,
        consecutive_failed_syncs: failed,
        wifi_signal_strength: rssi,
        last_seen_at: new Date().toISOString(),
        is_online: true,
        updated_at: new Date().toISOString(),
      })
      .eq('device_token_id', deviceInfo.id);

    return new Response(
      JSON.stringify({ success: true, connection_quality_score: score }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('quality-update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update quality', code: 'QUALITY_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
