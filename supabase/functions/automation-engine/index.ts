import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculateHSI } from '../_shared/hsi-formula.ts';
import { evaluateModeGate } from '../_shared/mode-precedence.ts';

import {
  classifyHSI,
  HSI_FAN_SPEED,
  resolveHSIBands,
  type HSIBandLevel,
  type HSIBands,
} from '../_shared/hsi-bands.ts';

// CORS — restrict to known FarmEye origins. See safety-engine for rationale.
const ALLOWED_ORIGINS = new Set<string>([
  'https://farmeye.lovable.app',
  'https://farmeye.pro.bd',
  'https://modernfarm.pro.bd',
]);
const ALLOWED_ORIGIN_SUFFIXES = ['.lovable.app', '.lovable.dev'];
function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && (ALLOWED_ORIGINS.has(origin) ||
      ALLOWED_ORIGIN_SUFFIXES.some((s) => origin.endsWith(s)))
      ? origin
      : 'null';
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
  };
}
const corsHeaders = buildCorsHeaders(null);

// ================ RETRY HELPER WITH TIMEOUT ================
async function fetchWithRetry(
  fn: () => Promise<{ data: any; error: any }>,
  { retries = 2, timeoutMs = 8000, label = 'query' } = {}
): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const result = await fn();
      clearTimeout(timer);
      if (!result.error) return result;
      if (attempt < retries) {
        console.warn(`⚠️ ${label} attempt ${attempt + 1} failed: ${result.error.message}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        return result;
      }
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`⚠️ ${label} attempt ${attempt + 1} threw: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        return { data: null, error: err };
      }
    }
  }
  return { data: null, error: new Error(`${label} failed after ${retries + 1} attempts`) };
}

// ================ HEAT STRESS INDEX (HSI) CALCULATION ================
// P0 fix: the cloud used to run a THI formula here while the firmware and
// esp32-api used Steadman — alerts and device behaviour could disagree.
// Both now import the shared Steadman formula (_shared/hsi-formula.ts).
// `simpleIndex` is kept only as a diagnostic mirror of the legacy value.
function legacySimpleIndex(temperature: number, humidity: number): number {
  return temperature + (humidity * 0.1);
}

type HSILevel = HSIBandLevel;

interface HSIResult {
  index: number;
  simpleIndex: number;
  level: HSILevel;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  shouldAlert: boolean;
  message: { bn: string; en: string };
}

const HSI_MESSAGES: Record<HSILevel, { bn: string; en: string }> = {
  emergency: { bn: 'জরুরি অবস্থা! মুরগির জীবন ঝুঁকিতে', en: 'Emergency! Bird lives at risk' },
  severe: { bn: 'গুরুতর তাপ চাপ! জরুরি পদক্ষেপ নিন', en: 'Severe heat stress! Take immediate action' },
  moderate: { bn: 'মাঝারি তাপ চাপ - অতিরিক্ত বায়ু চলাচল প্রয়োজন', en: 'Moderate heat stress - Extra ventilation needed' },
  mild: { bn: 'হালকা তাপ চাপ - ফ্যান চালু করুন', en: 'Mild heat stress - Turn on fans' },
  normal: { bn: 'স্বাভাবিক অবস্থা', en: 'Normal conditions' },
};

// P2 fix: band comparison semantics now come from `_shared/hsi-bands.ts`
// (strict `>` at every boundary, exactly like the firmware). Previously this
// used `>=` while esp32-api hardcoded 75/80/85 with a `>`/`>=` mix, so a
// reading sitting exactly on a threshold could act differently per path.
function getHSIResult(temperature: number, humidity: number, thresholds: HSIBands): HSIResult {
  const hsi = calculateHSI(temperature, humidity);
  const simpleHsi = legacySimpleIndex(temperature, humidity);
  const level = classifyHSI(hsi, thresholds);

  return {
    index: hsi,
    simpleIndex: simpleHsi,
    level,
    fanSpeed: HSI_FAN_SPEED[level],
    shouldAlert: level === 'moderate' || level === 'severe' || level === 'emergency',
    message: HSI_MESSAGES[level],
  };
}

// ================ AUTOMATION RULES ENGINE ================
interface AutomationAction {
  fan: boolean;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  alarm: boolean;
  alert?: { type: string; severity: 'warning' | 'danger'; message: string; messageBn: string };
}

function runAutomationRules(
  // powerOn === null → power state unknown/stale: Rule 0 must NOT fire, and we
  // must NOT pretend the mains are up either (that was the old hardcoded bug).
  sensorData: { temperature: number; humidity: number; ammonia: number; powerOn: boolean | null },
  settings: {
    temperature_max: number;
    ammonia_max: number;
    fan_low_temp_min: number;
    fan_medium_temp_min: number;
    fan_high_temp_min: number;
    hsi_mild_threshold: number;
    hsi_moderate_threshold: number;
    hsi_severe_threshold: number;
    hsi_emergency_threshold: number;
  }
): AutomationAction {
  const { temperature, humidity, ammonia, powerOn } = sensorData;
  
  // Default action
  let action: AutomationAction = {
    fan: false,
    fanSpeed: 'OFF',
    alarm: false,
  };
  
  // ========================================
  // RULE 0: POWER OFF = ALARM ON
  // ========================================
  if (powerOn === false) {
    action.alarm = true;
    action.alert = {
      type: 'power',
      severity: 'danger',
      message: 'Power outage detected!',
      messageBn: 'বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!'
    };
  }
  
  // ========================================
  // RULE 1: AMMONIA ≥ threshold = FAN ON + ALARM
  // ========================================
  if (ammonia >= settings.ammonia_max) {
    action.fan = true;
    action.fanSpeed = 'HIGH';
    action.alarm = true;
    action.alert = {
      type: 'ammonia',
      severity: 'danger',
      message: `Ammonia level critical: ${ammonia} ppm`,
      messageBn: `অ্যামোনিয়া স্তর বিপজ্জনক: ${ammonia} ppm`
    };
    return action;
  }
  
  // ========================================
  // RULE 2: HEAT STRESS INDEX (PRIMARY DECISION)
  // ========================================
  const hsiResult = getHSIResult(temperature, humidity, resolveHSIBands(settings));
  
  // Apply HSI-based fan speed
  if (hsiResult.level !== 'normal') {
    action.fan = true;
    action.fanSpeed = hsiResult.fanSpeed;
  }
  
  // Create alert if needed
  if (hsiResult.shouldAlert) {
    action.alert = {
      type: 'temperature',
      severity: hsiResult.level === 'emergency' || hsiResult.level === 'severe' ? 'danger' : 'warning',
      message: hsiResult.message.en,
      messageBn: hsiResult.message.bn
    };
    
    if (hsiResult.level === 'emergency' || hsiResult.level === 'severe') {
      action.alarm = true;
    }
  }
  
  // ========================================
  // RULE 3: TEMPERATURE THRESHOLDS (Backup if HSI not triggered)
  // ========================================
  if (!action.fan) {
    if (temperature >= settings.fan_high_temp_min) {
      action.fan = true;
      action.fanSpeed = 'HIGH';
    } else if (temperature >= settings.fan_medium_temp_min) {
      action.fan = true;
      action.fanSpeed = 'MEDIUM';
    } else if (temperature >= settings.fan_low_temp_min) {
      action.fan = true;
      action.fanSpeed = 'LOW';
    }
  }
  
  return action;
}

// ================ FAIL-SAFE DETECTION ================
// Rule: If device has not synced for 5 minutes → Mark as FAIL-SAFE
// This runs as a background check to mark stale devices
const FAILSAFE_TIMEOUT_MINUTES = 5;

interface StaleDeviceResult {
  device_id: string;
  shed_id: string | null;
  last_sync: string | null;
  minutes_since_sync: number;
  marked_failsafe: boolean;
}

async function detectAndMarkStaleDevices(
  supabase: any,
  userId: string,
  farmId?: string | null,
): Promise<StaleDeviceResult[]> {
  const results: StaleDeviceResult[] = [];
  
  try {
    // Get all devices for this user
    let devicesQuery = supabase
      .from('device_health')
      .select('id, device_token_id, shed_id, last_cloud_sync_at, failsafe_mode, is_online')
      .eq('user_id', userId);
    if (farmId) devicesQuery = devicesQuery.eq('farm_id', farmId);
    const { data: devices } = await devicesQuery;
    
    if (!devices || devices.length === 0) {
      return results;
    }
    
    const now = Date.now();
    const timeoutMs = FAILSAFE_TIMEOUT_MINUTES * 60 * 1000;
    
    for (const device of devices) {
      const lastSync = device.last_cloud_sync_at 
        ? new Date(device.last_cloud_sync_at).getTime() 
        : 0;
      const msSinceSync = now - lastSync;
      const minutesSinceSync = msSinceSync / (60 * 1000);
      
      const isStale = msSinceSync > timeoutMs;
      
      // If device is stale and NOT already marked as fail-safe, mark it
      if (isStale && !device.failsafe_mode) {
        console.log(`🔴 Device ${device.device_token_id} stale for ${minutesSinceSync.toFixed(1)} minutes → Marking FAIL-SAFE`);
        
        await supabase
          .from('device_health')
          .update({
            failsafe_mode: true,
            failsafe_activated_at: new Date().toISOString(),
            is_online: false,
            mode: 'FAIL_SAFE',
          })
          .eq('id', device.id);
        
        // Also update device_status mode
        if (device.shed_id) {
          await supabase
            .from('device_status')
            .update({
              mode: 'FAIL_SAFE',
              last_cloud_sync: device.last_cloud_sync_at,
            })
            .eq('user_id', userId)
            .eq('farm_id', farmId)
            .eq('shed_id', device.shed_id);
        }
        
        results.push({
          device_id: device.device_token_id,
          shed_id: device.shed_id,
          last_sync: device.last_cloud_sync_at,
          minutes_since_sync: minutesSinceSync,
          marked_failsafe: true,
        });
      } else if (!isStale && device.failsafe_mode) {
        // Device was fail-safe but now syncing again → recover.
        // MANUAL is sticky: never promote a manually-operated shed back to AUTO.
        let recoveredMode: 'AUTO' | 'MANUAL' = 'AUTO';
        if (device.shed_id) {
          const { data: statusRow } = await supabase
            .from('device_status')
            .select('mode, manual_override, desired_manual_override')
            .eq('user_id', userId)
            .eq('farm_id', farmId)
            .eq('shed_id', device.shed_id)
            .maybeSingle();
          if (
            statusRow?.mode === 'MANUAL' ||
            statusRow?.manual_override === true ||
            statusRow?.desired_manual_override === true
          ) {
            recoveredMode = 'MANUAL';
          }
        }
        console.log(`🟢 Device ${device.device_token_id} recovered from FAIL_SAFE → ${recoveredMode}`);

        await supabase
          .from('device_health')
          .update({
            failsafe_mode: false,
            failsafe_activated_at: null,
            is_online: true,
            mode: recoveredMode,
          })
          .eq('id', device.id);
        
        if (device.shed_id) {
          await supabase
            .from('device_status')
            .update({
              mode: recoveredMode,
              last_cloud_sync: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('farm_id', farmId)
            .eq('shed_id', device.shed_id);
        }
        
        
        results.push({
          device_id: device.device_token_id,
          shed_id: device.shed_id,
          last_sync: device.last_cloud_sync_at,
          minutes_since_sync: minutesSinceSync,
          marked_failsafe: false,
        });
      }
    }
    
  } catch (error) {
    console.error('Stale device detection error:', error);
  }
  
  return results;
}

// ================ SHARED PER-SHED EXECUTOR ================
// SINGLE source of automation execution. Both `run-automation` (per shed) and
// `run-all` (scheduler) MUST go through this — previously `run-all` only
// reported `automation_run` without evaluating any rule (silent no-op).
export interface ShedAutomationResult {
  shed_id: string | null;
  farm_id: string | null;
  executed: boolean;
  skipped_reason?: string;
  sensor_timestamp?: string | null;
  power_state: 'on' | 'off' | 'unknown';
  action?: AutomationAction;
  hsi?: { index: number; simpleIndex: number; level: string };
  sensor?: { temperature: number; humidity: number; ammonia: number };
  mutations: number;
  alert_created: boolean;
  error?: string;
}

const POWER_FRESHNESS_MS = 10 * 60 * 1000;

// Safety TTL for telemetry: a reading older than this (or dated in the future)
// is NOT current truth and must never drive actuation.
const SENSOR_FRESHNESS_MS = 5 * 60 * 1000;
const SENSOR_FUTURE_SKEW_MS = 2 * 60 * 1000;

/** Finite + physically plausible, else null (explicit unknown — never 0). */
function validSensor(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}


// deno-lint-ignore no-explicit-any
async function executeAutomationForShed(
  supabase: any,
  ctx: { user_id: string; shed_id?: string | null; farm_id?: string | null },
): Promise<ShedAutomationResult> {
  const { user_id } = ctx;
  const shed_id = ctx.shed_id ?? null;
  const base: ShedAutomationResult = {
    shed_id,
    farm_id: ctx.farm_id ?? null,
    executed: false,
    power_state: 'unknown',
    mutations: 0,
    alert_created: false,
  };

  // Resolve farm_id from shed (multi-farm safety).
  let farm_id: string | null = ctx.farm_id ?? null;
  if (!farm_id && shed_id) {
    const { data: shedRow } = await supabase
      .from('sheds')
      .select('farm_id')
      .eq('id', shed_id)
      .maybeSingle();
    farm_id = shedRow?.farm_id ?? null;
  }
  base.farm_id = farm_id;

  let settingsQuery = supabase.from('farm_settings').select('*').eq('user_id', user_id);
  if (farm_id) settingsQuery = settingsQuery.eq('farm_id', farm_id);
  const { data: settings } = await settingsQuery.maybeSingle();

  if (!settings) return { ...base, skipped_reason: 'SETTINGS_NOT_FOUND' };
  // MODE-01: mode gating happens once, below, through the shared precedence
  // contract (`_shared/mode-precedence.ts`) — no per-path ad-hoc checks.


  let sensorQuery = supabase
    .from('sensor_readings')
    .select('temperature, humidity, ammonia, recorded_at')
    .eq('user_id', user_id)
    .order('recorded_at', { ascending: false })
    .limit(1);
  if (farm_id) sensorQuery = sensorQuery.eq('farm_id', farm_id);
  if (shed_id) sensorQuery = sensorQuery.eq('shed_id', shed_id);
  const { data: sensorRows } = await sensorQuery;

  if (!sensorRows || sensorRows.length === 0) {
    return { ...base, skipped_reason: 'NO_SENSOR_DATA' };
  }
  const latestSensor = sensorRows[0];

  // ── Fail-safe telemetry gate (stale / future / invalid) ────────────────────
  const recordedAtMs = latestSensor.recorded_at ? new Date(latestSensor.recorded_at).getTime() : NaN;
  if (!Number.isFinite(recordedAtMs)) {
    return { ...base, sensor_timestamp: latestSensor.recorded_at ?? null, skipped_reason: 'SENSOR_TIMESTAMP_INVALID' };
  }
  const sensorAge = Date.now() - recordedAtMs;
  if (sensorAge > SENSOR_FRESHNESS_MS) {
    return { ...base, sensor_timestamp: latestSensor.recorded_at, skipped_reason: 'SENSOR_STALE' };
  }
  if (sensorAge < -SENSOR_FUTURE_SKEW_MS) {
    return { ...base, sensor_timestamp: latestSensor.recorded_at, skipped_reason: 'SENSOR_FUTURE_TIMESTAMP' };
  }

  const tempValid = validSensor(latestSensor.temperature, -20, 80);
  const humValid = validSensor(latestSensor.humidity, 0, 100);
  const ammoniaValid = validSensor(latestSensor.ammonia, 0, 500);
  if (tempValid === null || humValid === null) {
    return { ...base, sensor_timestamp: latestSensor.recorded_at, skipped_reason: 'SENSOR_VALUE_INVALID' };
  }

  // Real, freshness-validated power state (never hardcoded).
  let dsQuery = supabase
    .from('device_status')
    .select(
      'manual_override, desired_manual_override, power_on, updated_at, mode, ' +
      'desired_fan_expires_at, desired_alarm_expires_at',
    )
    .eq('user_id', user_id);
  if (farm_id) dsQuery = dsQuery.eq('farm_id', farm_id);
  if (shed_id) dsQuery = dsQuery.eq('shed_id', shed_id);
  const { data: deviceStatus } = await dsQuery.maybeSingle();

  // Emergency Survival Mode (precedence rule #2) — read it instead of assuming
  // false, so the cloud stays silent while the board is in survival cycles.
  let esmQuery = supabase
    .from('safety_status')
    .select('emergency_active, survival_mode')
    .eq('user_id', user_id);
  if (farm_id) esmQuery = esmQuery.eq('farm_id', farm_id);
  if (shed_id) esmQuery = esmQuery.eq('shed_id', shed_id);
  const { data: safetyRow } = await esmQuery.limit(1).maybeSingle();

  // MODE-01 — single precedence ladder shared with esp32-api.
  const gate = evaluateModeGate({
    automationMode: settings.automation_mode,
    deviceMode: deviceStatus?.mode,
    safetyEngineEnabled: (settings as any).safety_engine_enabled,
    manualOverride: deviceStatus?.manual_override,
    desiredManualOverride: deviceStatus?.desired_manual_override,
    fanOverrideUntil: deviceStatus?.desired_fan_expires_at,
    alarmOverrideUntil: deviceStatus?.desired_alarm_expires_at,
    emergencyActive: safetyRow?.emergency_active === true || safetyRow?.survival_mode === true,
  });


  let powerOn: boolean | null = null;
  if (deviceStatus && typeof deviceStatus.power_on === 'boolean' && deviceStatus.updated_at) {
    const age = Date.now() - new Date(deviceStatus.updated_at).getTime();
    if (age <= POWER_FRESHNESS_MS) powerOn = deviceStatus.power_on;
  }
  base.power_state = powerOn === null ? 'unknown' : powerOn ? 'on' : 'off';

  const temperature = tempValid;
  const humidity = humValid;
  // Ammonia unknown → 0 is safe: a missing NH3 read must not raise NH3 actions.
  const ammonia = ammoniaValid ?? 0;


  const automationAction = runAutomationRules(
    { temperature, humidity, ammonia, powerOn },
    {
      temperature_max: settings.temperature_max,
      ammonia_max: settings.ammonia_max,
      fan_low_temp_min: settings.fan_low_temp_min,
      fan_medium_temp_min: settings.fan_medium_temp_min,
      fan_high_temp_min: settings.fan_high_temp_min,
      hsi_mild_threshold: settings.hsi_mild_threshold,
      hsi_moderate_threshold: settings.hsi_moderate_threshold,
      hsi_severe_threshold: settings.hsi_severe_threshold,
      hsi_emergency_threshold: settings.hsi_emergency_threshold,
    },
  );

  const hsiResult = getHSIResult(temperature, humidity, resolveHSIBands(settings));

  let mutations = 0;
  if (gate.allow) {
    // Cloud writes desired_* ONLY — ESP32 owns actual relay state.
    const desired: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!gate.skipFan) {
      desired.desired_fan_on = automationAction.fan;
      desired.desired_fan_speed = automationAction.fanSpeed;
    }
    if (!gate.skipAlarm) {
      desired.desired_alarm_on = automationAction.alarm;
    }
    // A missing farm must never widen the write to every farm of this user.
    if (!farm_id) {
      return {
        ...base,
        sensor_timestamp: latestSensor.recorded_at,
        skipped_reason: 'NO_FARM_SCOPE',
      };
    }
    let updateQuery = supabase
      .from('device_status')
      .update(desired)
      .eq('user_id', user_id)
      .eq('farm_id', farm_id);
    if (shed_id) updateQuery = updateQuery.eq('shed_id', shed_id);
    const { error: updErr } = await updateQuery;
    if (updErr) {
      return {
        ...base,
        sensor_timestamp: latestSensor.recorded_at,
        error: updErr.message,
        skipped_reason: 'DESIRED_STATE_WRITE_FAILED',
      };
    }
    mutations += 1;
  }


  let alertCreated = false;
  if (automationAction.alert) {
    const eventKey = farm_id
      ? `v8:automation:${farm_id}:${shed_id || 'farm'}:${automationAction.alert.type}:${Math.floor(Date.now() / (30 * 60 * 1000))}`
      : null;
    const alertPayload = {
      user_id,
      farm_id,
      shed_id,
      alert_type: automationAction.alert.type,
      severity: automationAction.alert.severity,
      message: automationAction.alert.message,
      message_bn: automationAction.alert.messageBn,
      ...(eventKey ? { event_key: eventKey } : {}),
    };
    if (eventKey) {
      await supabase
        .from('alerts')
        .upsert(alertPayload, { onConflict: 'farm_id,event_key', ignoreDuplicates: true });
    } else {
      await supabase.from('alerts').insert(alertPayload);
    }
    alertCreated = true;
  }

  return {
    ...base,
    executed: gate.allow,
    skipped_reason: gate.allow ? undefined : gate.reason,

    sensor_timestamp: latestSensor.recorded_at,
    action: automationAction,
    hsi: { index: hsiResult.index, simpleIndex: hsiResult.simpleIndex, level: hsiResult.level },
    sensor: { temperature, humidity, ammonia },
    mutations,
    alert_created: alertCreated,
  };
}

// ================ MAIN HANDLER ================
Deno.serve(async (req) => {
  // Per-request CORS headers — see safety-engine for rationale.
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseKey;
    const cronSecret = Deno.env.get('AUTOMATION_ENGINE_CRON_SECRET') ?? '';

    // ================ CALLER AUTHENTICATION (P0) ================
    // Three accepted caller types, never mixed:
    //   1. service-role bearer (internal / scheduler)
    //   2. cron secret header (scheduler without service key)
    //   3. authenticated user JWT — restricted to their own farms below
    const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const isServiceCall = bearer.length > 0 && bearer === supabaseKey;
    const isCronCall =
      cronSecret.length > 0 && req.headers.get('x-automation-engine-cron-secret') === cronSecret;

    let callerUserId: string | null = null;
    if (!isServiceCall && !isCronCall) {
      if (!bearer) {
        return json({ success: false, error: 'authorization required' }, 401);
      }
      const callerClient = createClient(supabaseUrl, anonKey);
      const { data: authData, error: authError } = await callerClient.auth.getUser(bearer);
      if (authError || !authData?.user) {
        return json({ success: false, error: 'invalid authentication' }, 401);
      }
      callerUserId = authData.user.id;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, shed_id, user_id: bodyUserId, farm_id: bodyFarmId } = await req.json();

    // A user JWT can only ever act on its own account. Cross-account access
    // (running automation for another farm) requires service/cron auth.
    if (callerUserId && bodyUserId && bodyUserId !== callerUserId) {
      return json({ success: false, error: 'forbidden: user_id mismatch' }, 403);
    }
    const user_id = callerUserId ?? bodyUserId;

    // Frontend callers are authorized against the farm boundary, not against
    // the legacy owner user_id. Internal service/cron calls retain scheduler
    // access but still use farm filters whenever a farm is supplied.
    if (callerUserId) {
      if (!bodyFarmId) {
        return json({ success: false, error: 'farm_id required' }, 400);
      }
      const { data: canAccess } = await supabase.rpc('user_can_access_farm', {
        _user_id: callerUserId,
        _farm_id: bodyFarmId,
      });
      if (canAccess !== true) {
        return json({ success: false, error: 'forbidden: farm access required' }, 403);
      }
      if (shed_id) {
        const { data: boundShed } = await supabase
          .from('sheds')
          .select('id')
          .eq('id', shed_id)
          .eq('farm_id', bodyFarmId)
          .maybeSingle();
        if (!boundShed) return json({ success: false, error: 'shed/farm mismatch' }, 403);
      }
    }

    // ========================================
    // ACTION: run-automation (Per-Shed Automation)
    // ========================================
    if (action === 'run-automation') {
      if (!user_id) {
        return json({ success: false, error: 'user_id required' }, 400);
      }

      const result = await executeAutomationForShed(supabase, {
        user_id,
        shed_id,
        farm_id: bodyFarmId ?? null,
      });

      return json({
        success: !result.error,
        skipped: !result.executed,
        reason: result.skipped_reason,
        error: result.error,
        automation: {
          action: result.action,
          hsi: result.hsi,
          sensor: result.sensor,
          power_state: result.power_state,
          sensor_timestamp: result.sensor_timestamp,
          mutations: result.mutations,
          alert_created: result.alert_created,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // ========================================
    // ACTION: get-status (Get automation status for all sheds)
    // ========================================
    if (action === 'get-status') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all sheds
      const { data: sheds } = await supabase
        .from('sheds')
        .select('id, name, name_en, is_active')
        .eq('user_id', user_id);
      const scopedSheds = bodyFarmId ? (sheds || []).filter((shed: any) => shed.farm_id === bodyFarmId) : (sheds || []);

      // Get device health for all sheds
      const { data: deviceHealth } = await supabase
        .from('device_health')
        .select('*')
        .eq('user_id', user_id);

      // ★ FIX #1: read sensor_readings (not sensor_logs which is empty/legacy)
      const { data: sensorData } = await supabase
        .from('sensor_readings')
        .select('shed_id, temperature, humidity, ammonia, recorded_at')
        .eq('user_id', user_id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Get settings
      const { data: settings } = await supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();

      // Build status per shed
      const shedStatus = scopedSheds.map(shed => {
        const health = deviceHealth?.find(d => d.shed_id === shed.id);
        const sensors = sensorData?.filter(s => s.shed_id === shed.id) || [];
        const latestSensor = sensors[0];

        let hsiResult = null;
        if (latestSensor && settings) {
          hsiResult = getHSIResult(
            latestSensor.temperature,
            latestSensor.humidity,
            resolveHSIBands(settings)
          );
        }

        return {
          shed_id: shed.id,
          name: shed.name,
          name_en: shed.name_en,
          is_active: shed.is_active,
          device: health ? {
            is_online: health.is_online,
            failsafe_mode: health.failsafe_mode,
            last_cloud_sync: health.last_cloud_sync_at,
            last_seen: health.last_seen_at,
            mode: health.failsafe_mode ? 'FAIL_SAFE' : 'AUTO',
          } : null,
          sensor: latestSensor ? {
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            ammonia: latestSensor.ammonia,
            timestamp: latestSensor.recorded_at,
          } : null,
          hsi: hsiResult ? {
            index: hsiResult.index,
            level: hsiResult.level,
            fanSpeed: hsiResult.fanSpeed,
          } : null,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          sheds: shedStatus,
          total_sheds: scopedSheds.length,
          sheds_online: shedStatus.filter(s => s.device?.is_online).length,
          sheds_failsafe: shedStatus.filter(s => s.device?.failsafe_mode).length,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // ACTION: check-failsafe 
    // Detect stale devices and mark as FAIL-SAFE
    // Rule: If device has not synced for 5 minutes → FAIL-SAFE
    // ========================================
    if (action === 'check-failsafe') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Fail-Safe Check] Running for user ${user_id}`);
      
      const staleDevices = await detectAndMarkStaleDevices(supabase, user_id, bodyFarmId ?? null);
      
      // Also run check for all sheds status
      const { data: deviceHealth } = await supabase
        .from('device_health')
        .select('shed_id, failsafe_mode, is_online, last_cloud_sync_at, mode')
        .eq('user_id', user_id)
        .eq('farm_id', bodyFarmId);

      const summary = {
        total_devices: deviceHealth?.length || 0,
        devices_online: deviceHealth?.filter((d: any) => d.is_online).length || 0,
        devices_failsafe: deviceHealth?.filter((d: any) => d.failsafe_mode).length || 0,
        stale_devices_marked: staleDevices.filter(d => d.marked_failsafe).length,
        recovered_devices: staleDevices.filter(d => !d.marked_failsafe).length,
      };

      console.log(`[Fail-Safe Check] Summary: ${JSON.stringify(summary)}`);

      return new Response(
        JSON.stringify({
          success: true,
          summary,
          stale_devices: staleDevices,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // ACTION: run-all (Run automation + fail-safe check for all sheds)
    // For scheduled/cron execution
    // ========================================
    if (action === 'run-all') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Run All] Starting full automation cycle for user ${user_id}`);

      // Step 1: Check for stale devices
      const staleDevices = await detectAndMarkStaleDevices(supabase, user_id, bodyFarmId ?? null);
      
      // Step 2: Get all active sheds
      let shedsQuery = supabase
        .from('sheds')
        .select('id, name')
        .eq('user_id', user_id)
        .eq('is_active', true);
      if (bodyFarmId) shedsQuery = shedsQuery.eq('farm_id', bodyFarmId);
      const { data: sheds } = await shedsQuery;

      // Step 3: Run REAL automation for each online shed through the shared
      // executor. Previously this only appended a success-looking result
      // without evaluating a single rule (silent no-op).
      const shedResults = [];
      for (const shed of sheds || []) {
        const { data: health } = await supabase
          .from('device_health')
          .select('is_online, failsafe_mode')
          .eq('user_id', user_id)
          .eq('shed_id', shed.id)
          .maybeSingle();

        if (!health?.is_online || health?.failsafe_mode) {
          console.log(`[Run All] Skipping shed ${shed.name} - offline or fail-safe`);
          shedResults.push({
            shed_id: shed.id,
            name: shed.name,
            status: health?.failsafe_mode ? 'fail_safe' : 'offline',
            mode: health?.failsafe_mode ? 'FAIL_SAFE' : 'OFFLINE',
            executed: false,
          });
          continue;
        }

        console.log(`[Run All] Running automation for shed: ${shed.name}`);
        const result = await executeAutomationForShed(supabase, {
          user_id,
          shed_id: shed.id,
        });
        shedResults.push({
          shed_id: shed.id,
          name: shed.name,
          status: result.error
            ? 'error'
            : result.executed
              ? 'automation_run'
              : `skipped:${result.skipped_reason ?? 'unknown'}`,
          mode: 'AUTO',
          executed: result.executed,
          skipped_reason: result.skipped_reason,
          error: result.error,
          sensor_timestamp: result.sensor_timestamp,
          power_state: result.power_state,
          action: result.action,
          hsi: result.hsi,
          mutations: result.mutations,
          alert_created: result.alert_created,
        });
      }

      const executedCount = shedResults.filter((r) => r.executed).length;

      return new Response(
        JSON.stringify({
          success: true,
          sheds_processed: shedResults.length,
          sheds_executed: executedCount,
          sheds: shedResults,
          stale_devices: staleDevices,
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Automation engine error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Distinguish timeout from other errors
    const status = errorMessage.includes('abort') || errorMessage.includes('timeout') ? 504 : 500;
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, retryable: status === 504 }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
