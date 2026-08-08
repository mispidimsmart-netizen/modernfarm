import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { newObsCtx, recordObservability, type ObsCtx } from "./observability.ts";
import { corsHeaders } from "./http.ts";
import { verifyDeviceSignature } from "./security.ts";
import { calculateHSI, applyHSIAutomation } from "./hsi.ts";
import { getBroilerTargetTemp, parseAction, computeQualityScore } from "./domain.ts";
import { calculateCurrentBrightness } from "./lighting.ts";
import {
  getDeviceCommands,
  acknowledgeCommands,
  acknowledgeCommandsV2,
  getCommandStatus,
  retryUnackedCommands,
} from "./commands.ts";
import { handlePowerStatus, getPowerOutages, type PowerStatusPayload } from "./power.ts";
import { handleFailsafeSync } from "./failsafe.ts";
import { handleSensorData, handleSensorBatch, handleQualityUpdate, type SensorPayload } from "./sensors.ts";
import {
  getSettings,
  getAutomationRules,
  getLightingSchedule,
  getLatestSensorData,
  getAlerts,
  getSystemStatus,
  getAdvancedSettings,
  getDeviceConfig,
} from "./reads.ts";





// Sensor payload type lives in ./sensors.ts

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
      // Verify farm membership OR farm ownership
      // Owner is not always duplicated in farm_members, so both must be accepted
      const [{ data: farmMember, error: farmError }, { data: farmOwner }] = await Promise.all([
        supabase
          .from('farm_members')
          .select('id')
          .eq('farm_id', deviceFarmId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('farms')
          .select('id')
          .eq('id', deviceFarmId)
          .eq('owner_id', userId)
          .maybeSingle(),
      ]);

      if (farmError || (!farmMember && !farmOwner)) {
        console.error(`🚫 Cross-farm access blocked: user ${userId} not member or owner of farm ${deviceFarmId}`);
        return new Response(
          JSON.stringify({ error: 'Access denied: not authorized for this farm', code: 'FARM_ACCESS_DENIED' }),
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

    // ═══════════════════════════════════════════════════════════════════════════
    // 🎯 GET /desired-state — flat desired_* keys consumed by Industrial v10
    //   Returns the cloud-requested relay states plus the `is_broiler_brooding`
    //   flag the firmware needs to honour safety Invariant #2 (heater allowed
    //   only during broiler brooding when temp < 12 °C).
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === 'GET' && path === 'desired-state') {
      return await getDesiredStateFlat(
        supabase, userId, deviceFarmId ?? null, deviceShedId ?? null,
      );
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


// Sensor ingestion lives in ./sensors.ts
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
      // `body.alarm === 'ON'` is already a boolean, so no further fallback is needed.
      const actualAlarm = statusUpdate.alarm_on ?? (body.alarm === 'ON');
      
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

// ════════════════════════════════════════════════════════════════════════════
// GET /desired-state — flat response consumed by Industrial v10 firmware.
//   Body shape:
//     {
//       desired_fan_on, desired_fan_ceiling, desired_fan_circ,
//       desired_light_on, desired_heater_on, desired_fogger_on,
//       desired_alarm_on, desired_sprinkler_on,
//       manual_override, is_broiler_brooding
//     }
//   `is_broiler_brooding` is derived server-side as:
//       shed.farm_type === 'broiler' AND active broiler batch age ≤ 21 days.
// ════════════════════════════════════════════════════════════════════════════
async function getDesiredStateFlat(
  supabase: any,
  userId: string,
  farmId: string | null,
  shedId: string | null,
): Promise<Response> {
  try {
    // 1. Desired relay state (farm- and shed-scoped where available)
    let statusQ = supabase
      .from('device_status')
      .select([
        'desired_fan_on', 'desired_fan_speed',
        'desired_ceiling_fan_on', 'desired_circulation_fan_on',
        'desired_light_on', 'desired_heater_on', 'desired_fogger_on',
        'desired_alarm_on', 'desired_sprinkler_on',
        'desired_manual_override',
      ].join(','))
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (farmId) statusQ = statusQ.eq('farm_id', farmId);
    if (shedId) statusQ = statusQ.eq('shed_id', shedId);
    const { data: status } = await statusQ.maybeSingle();

    // 2. Brooding flag — shed.farm_type === 'broiler' AND active batch age ≤ 21d
    let farmType: string = 'layer';
    if (shedId) {
      const { data: shed } = await supabase
        .from('sheds').select('farm_type').eq('id', shedId).maybeSingle();
      farmType = shed?.farm_type || 'layer';
    } else {
      const { data: profile } = await supabase
        .from('profiles').select('farm_type').eq('id', userId).maybeSingle();
      farmType = profile?.farm_type || 'layer';
    }

    let isBroilerBrooding = false;
    if (farmType === 'broiler') {
      const { data: batch } = await supabase
        .from('broiler_batches')
        .select('start_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (batch?.start_date) {
        const ageDays = Math.max(
          1,
          Math.ceil((Date.now() - new Date(batch.start_date).getTime()) / 86_400_000),
        );
        isBroilerBrooding = ageDays <= 21;
      } else {
        // No batch yet on a broiler shed → assume brooding (safer for chicks)
        isBroilerBrooding = true;
      }
    }

    return new Response(
      JSON.stringify({
        desired_fan_on:       status?.desired_fan_on ?? false,
        desired_fan_ceiling:  status?.desired_ceiling_fan_on ?? false,
        desired_fan_circ:     status?.desired_circulation_fan_on ?? false,
        desired_light_on:     status?.desired_light_on ?? false,
        desired_heater_on:    status?.desired_heater_on ?? false,
        desired_fogger_on:    status?.desired_fogger_on ?? false,
        desired_alarm_on:     status?.desired_alarm_on ?? false,
        desired_sprinkler_on: status?.desired_sprinkler_on ?? false,
        manual_override:      status?.desired_manual_override ?? false,
        is_broiler_brooding:  isBroilerBrooding,
        server_time:          new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[desired-state] error', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch desired state', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}



// Settings / automation rules / lighting schedule live in ./reads.ts
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

// Latest sensor snapshot & alerts live in ./reads.ts
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

// Power outage handlers live in ./power.ts

// ===== FAIL-SAFE SYNC HANDLER =====
// Comprehensive sync endpoint for ESP32 fail-safe mode

// Fail-safe sync handler lives in ./failsafe.ts
// System status / advanced settings / device config live in ./reads.ts
// Sensor batch & quality handlers live in ./sensors.ts
