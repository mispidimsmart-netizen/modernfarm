/**
 * Cloud safety persistence for the board's `/safety-evaluate` and
 * `/forensic-log` endpoints.
 *
 * Previously `esp32-api` proxied these two paths to a `safety-engine` edge
 * function that does not exist in this project, so every board call returned a
 * 404 and NO safety snapshot / forensic timeline row was ever stored. These
 * handlers run in-process instead: same device-token auth, same farm/shed
 * binding, no extra network hop.
 *
 * Hardware-as-source-of-truth is preserved: nothing here writes relay columns
 * or `desired_*`. The cloud only records what the board reports and returns an
 * advisory snapshot. The ESP32 always decides relay state itself.
 */
import { jsonResponse } from "./http.ts";

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown): boolean => v === true;
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};

/**
 * `safety_status.system_state` is constrained to this exact set in the database.
 * The board reports its own state machine names (including `BOOT`), so any value
 * outside the set must be normalised — otherwise the upsert fails with a check
 * constraint violation and NO safety snapshot is ever stored.
 */
const SAFETY_STATES = ['NORMAL', 'WARNING', 'DANGER', 'EMERGENCY', 'SURVIVAL', 'SENSOR_FAIL'] as const;

function normalizeSystemState(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if ((SAFETY_STATES as readonly string[]).includes(s)) return s;
  if (s === 'MONITORING' || s === 'BOOT' || s === 'OK' || s === '') return 'NORMAL';
  if (s === 'ESM' || s === 'EMERGENCY_SURVIVAL') return 'SURVIVAL';
  if (s === 'SENSOR_ERROR' || s === 'SENSOR_FAILURE') return 'SENSOR_FAIL';
  return 'NORMAL';
}

export interface SafetyCtx {
  userId: string;
  farmId: string | null;
  shedId: string | null;
}

/**
 * POST /safety-evaluate — persist the board's safety snapshot.
 * Upserts on (user_id, shed_id), the table's unique key.
 */
// deno-lint-ignore no-explicit-any
export async function handleSafetyEvaluate(body: any, supabase: any, ctx: SafetyCtx) {
  if (!ctx.farmId) {
    return jsonResponse({ error: "Device is not bound to a farm", code: "DEVICE_UNBOUND" }, 409);
  }

  const temperature = num(body?.temperature);
  const humidity = num(body?.humidity);
  const ammonia = num(body?.ammonia);

  const row: Record<string, unknown> = {
    user_id: ctx.userId,
    farm_id: ctx.farmId,
    shed_id: ctx.shedId,
    system_state: normalizeSystemState(body?.system_state),
    sensor_state: {
      temperature,
      temperature2: num(body?.temperature_sensor2),
      humidity,
      ammonia,
      water_usage: num(body?.water_usage),
      light_lux: num(body?.light_lux),
      nh3_sensor_present: bool(body?.nh3_sensor_present),
      worst_case_max_temp: num(body?.worst_case_max_temp),
      worst_case_min_temp: num(body?.worst_case_min_temp),
      bird_age_days: int(body?.bird_age_days),
    },
    sensor_issues: {
      thermal_model_plausible: bool(body?.thermal_model_plausible),
      thermal_model_deviation: num(body?.thermal_model_deviation),
      fan_effect_verified: bool(body?.fan_effect_verified),
      fan_effect_failures: int(body?.fan_effect_failures) ?? 0,
      heater_effect_verified: bool(body?.heater_effect_verified),
      heater_effect_failures: int(body?.heater_effect_failures) ?? 0,
    },
    plausibility_degraded: body?.thermal_model_plausible === false,
    plausibility_reason: body?.thermal_model_plausible === false ? "THERMAL_MODEL_IMPLAUSIBLE" : null,
    airflow_verified: bool(body?.fan_effect_verified),
    airflow_ineffective: (int(body?.fan_effect_failures) ?? 0) >= 3,
    airflow_consecutive_failures: int(body?.fan_effect_failures) ?? 0,
    heater_allowed: body?.reboot_heater_locked !== true,
    heater_blocked_reason: body?.reboot_heater_locked === true ? "REBOOT_HEATER_LOCK" : null,
    force_ventilation: bool(body?.reboot_vent_purge_active),
    override_active: bool(body?.override_active),
    hsi_value: num(body?.hsi_value),
    last_updated_by: "firmware",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("safety_status")
    .upsert(row, { onConflict: "user_id,shed_id" });

  if (error) {
    console.error("[safety-evaluate] upsert failed:", error);
    return jsonResponse({ error: "Failed to store safety snapshot", code: "SAFETY_STORE_FAILED" }, 500);
  }

  // Advisory only — the board owns every relay decision.
  return jsonResponse({
    success: true,
    stored: true,
    advisory: {
      heater_allowed: row.heater_allowed,
      airflow_ineffective: row.airflow_ineffective,
      plausibility_degraded: row.plausibility_degraded,
    },
  });
}

/**
 * POST /forensic-log — append one row to the 24h safety timeline.
 */
// deno-lint-ignore no-explicit-any
export async function handleForensicLog(body: any, supabase: any, ctx: SafetyCtx) {
  if (!ctx.farmId) {
    return jsonResponse({ error: "Device is not bound to a farm", code: "DEVICE_UNBOUND" }, 409);
  }

  const row: Record<string, unknown> = {
    user_id: ctx.userId,
    farm_id: ctx.farmId,
    shed_id: ctx.shedId,
    recorded_at: new Date().toISOString(),
    system_state: typeof body?.system_state === "string" ? body.system_state : "UNKNOWN",
    uptime_ms: int(body?.uptime_ms),

    requested_fan: bool(body?.requested_fan),
    requested_fan_speed: body?.requested_fan_speed != null ? String(body.requested_fan_speed) : null,
    requested_heater: bool(body?.requested_heater),
    requested_fogger: bool(body?.requested_fogger),
    requested_alarm: bool(body?.requested_alarm),
    requested_circulation_fan: bool(body?.requested_circulation_fan),
    requested_ceiling_fan: bool(body?.requested_ceiling_fan),
    requested_sprinkler: bool(body?.requested_sprinkler),

    actual_fan: bool(body?.actual_fan),
    actual_fan_speed: body?.actual_fan_speed != null ? String(body.actual_fan_speed) : null,
    actual_heater: bool(body?.actual_heater),
    actual_fogger: bool(body?.actual_fogger),
    actual_alarm: bool(body?.actual_alarm),
    actual_circulation_fan: bool(body?.actual_circulation_fan),
    actual_ceiling_fan: bool(body?.actual_ceiling_fan),
    actual_sprinkler: bool(body?.actual_sprinkler),

    relay_mismatch: bool(body?.relay_mismatch),
    mismatch_details: typeof body?.mismatch_details === "string" ? body.mismatch_details : null,

    temperature: num(body?.temperature),
    temperature2: num(body?.temperature2),
    worst_case_max_temp: num(body?.worst_case_max_temp),
    worst_case_min_temp: num(body?.worst_case_min_temp),
    humidity: num(body?.humidity),
    ammonia: num(body?.ammonia),
    water_usage: num(body?.water_usage),
    hsi_value: num(body?.hsi_value),
    temp_delta_1min: num(body?.temp_delta_1min),
    temp_delta_5min: num(body?.temp_delta_5min),
    humidity_delta_1min: num(body?.humidity_delta_1min),

    safety_override_active: bool(body?.safety_override_active),
    safety_override_reason: typeof body?.safety_override_reason === "string" ? body.safety_override_reason : null,
    heater_allowed: body?.heater_allowed !== false,
    heater_blocked_reason: typeof body?.heater_blocked_reason === "string" ? body.heater_blocked_reason : null,
    force_ventilation: bool(body?.force_ventilation),
    fan_effect_verified: bool(body?.fan_effect_verified),
    fan_effect_failures: int(body?.fan_effect_failures) ?? 0,
    heater_effect_verified: bool(body?.heater_effect_verified),
    heater_effect_failures: int(body?.heater_effect_failures) ?? 0,
    thermal_model_plausible: bool(body?.thermal_model_plausible),
    thermal_model_deviation: num(body?.thermal_model_deviation),

    manual_override_active: bool(body?.manual_override_active),
    reboot_heater_locked: bool(body?.reboot_heater_locked),
    reboot_vent_purge: bool(body?.reboot_vent_purge),
    reboot_nh3_muted: bool(body?.reboot_nh3_muted),

    source: typeof body?.source === "string" ? body.source : "firmware",
    event_type: typeof body?.event_type === "string" ? body.event_type : "snapshot",
    event_detail: typeof body?.event_detail === "string" ? body.event_detail : null,
  };

  const { error } = await supabase.from("safety_timeline").insert(row);
  if (error) {
    console.error("[forensic-log] insert failed:", error);
    return jsonResponse({ error: "Failed to store forensic entry", code: "FORENSIC_STORE_FAILED" }, 500);
  }

  return jsonResponse({ success: true, stored: true });
}
