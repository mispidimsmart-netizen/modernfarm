import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Safety Engine — Backend safety evaluator
 * 
 * Called periodically by:
 *   1. ESP32 firmware via /safety-engine?action=evaluate
 *   2. Cron/scheduler for periodic audits
 * 
 * Evaluates sensor data and device state, writes safety decisions
 * to the safety_status table. Frontend ONLY reads from this table.
 * 
 * Safety rules implemented:
 *   - Sensor drift detection (heater/fan effect validation)
 *   - Airflow verification (continuous 10-min cycle)
 *   - Relay stuck detection (heater weld)
 *   - Heater-vent interlock
 *   - Emergency escalation
 *   - Bounded override enforcement
 *   - Heat stress index
 */

// === SAFETY CONSTANTS ===
const DRIFT_HEATER_ACTIVE_THRESHOLD_MS = 8 * 60 * 1000;
const DRIFT_HEATER_EXPECTED_RISE = 1.0;
const DRIFT_FAN_ACTIVE_THRESHOLD_MS = 6 * 60 * 1000;
const DRIFT_FAN_EXPECTED_DROP = 0.5;

const AIRFLOW_MIN_FAN_ACTIVE_MS = 4 * 60 * 1000;
const AIRFLOW_EXPECTED_TEMP_DROP = 0.3;
const AIRFLOW_EXPECTED_HUMIDITY_DROP = 1.0;

const STUCK_HEATER_TEMP_RISE = 2.0;

const BIO_TEMP_MIN = 5;
const BIO_TEMP_MAX = 50;
const BIO_OVERRIDE_MIN = 26;
const BIO_OVERRIDE_MAX = 35;

const HEATER_MAX_CONTINUOUS_MS = 5 * 60 * 1000;
const RAPID_RISE_THRESHOLD = 0.5; // °C/min

// === ACTUATOR EFFECT VALIDATION ===
const EFFECT_VALIDATION_WINDOW_MS = 6 * 60 * 1000; // 6 minutes
const FAN_EXPECTED_COOLING = 0.5;   // Must drop ≥0.5°C
const HEATER_EXPECTED_HEATING = 1.0; // Must rise ≥1.0°C

// === THERMAL MODEL PLAUSIBILITY ===
const THERMAL_MODEL_MAX_DEVIATION = 3.0; // °C
const THERMAL_HEATER_RATE = 0.06;  // °C/min expected heating
const THERMAL_FAN_RATE = -0.04;    // °C/min expected cooling

// === REBOOT SAFETY ===
const REBOOT_HEATER_LOCKOUT_MS = 3 * 60 * 1000;
const REBOOT_VENT_PURGE_MS = 3 * 60 * 1000;
const REBOOT_NH3_ALERT_MUTE_MS = 5 * 60 * 1000;

// === BIRD AGE VALIDATION ===
const AGE_MIN_DAYS = 0;
const AGE_MAX_DAYS = 60;
const AGE_MAX_JUMP_PER_24H = 2;

interface EvaluationInput {
  user_id: string;
  farm_id?: string;
  shed_id?: string;
  // Current sensor readings
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage: number;
  // Dual sensor worst-case values
  temperature_sensor2: number | null;
  worst_case_max_temp: number | null;  // MAX of both sensors (cooling)
  worst_case_min_temp: number | null;  // MIN of both sensors (heating)
  // Device states
  fan_on: boolean;
  heater_on: boolean;
  fogger_on: boolean;
  circulation_fan_on: boolean;
  fan_available: boolean;
  // Accumulated runtime (from firmware counters)
  heater_on_ms_15min: number;
  fan_on_ms_15min: number;
  fan_on_ms_10min: number;
  heater_continuous_ms: number;
  // Temperature history from firmware
  temp_15min_ago: number | null;
  temp_10min_ago: number | null;
  humidity_10min_ago: number | null;
  temp_1min_ago: number | null;
  // Heater off tracking
  heater_off_temp: number | null;
  heater_off_elapsed_ms: number | null;
  // HSI
  hsi_value: number | null;
  hsi_level: string | null;
  // Override
  override_active: boolean;
  override_reason: string | null;
  override_remaining_seconds: number | null;
  override_target_temp: number | null;
  // Actuator effect validation (from firmware)
  fan_effect_verified: boolean;
  fan_effect_failures: number;
  heater_effect_verified: boolean;
  heater_effect_failures: number;
  // Thermal model (from firmware)
  thermal_model_plausible: boolean;
  thermal_model_deviation: number | null;
  thermal_model_reason: string | null;
  // Reboot safety state
  uptime_ms: number;
  reboot_heater_locked: boolean;
  reboot_vent_purge_active: boolean;
  reboot_nh3_muted: boolean;
  // Bird age
  bird_age_days: number | null;
  bird_age_previous: number | null;
  bird_age_last_change_ms: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "evaluate";

    if (action === "evaluate") {
      const input: EvaluationInput = await req.json();
      const result = evaluateSafety(input);

      // Upsert safety_status
      const { error } = await supabase
        .from("safety_status")
        .upsert(
          {
            user_id: input.user_id,
            farm_id: input.farm_id || null,
            shed_id: input.shed_id || null,
            ...result,
            last_updated_by: "backend",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,shed_id" }
        );

      if (error) {
        console.error("Failed to upsert safety_status:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log critical events
      if (result.system_state === "SURVIVAL" || result.system_state === "SENSOR_FAIL" || result.system_state === "EMERGENCY") {
        await supabase.from("farm_audit_logs").insert({
          user_id: input.user_id,
          farm_id: input.farm_id || null,
          shed_id: input.shed_id || null,
          action_type: `safety_engine_${result.system_state.toLowerCase()}`,
          action_category: "safety",
          severity: "critical",
          source: "safety_engine",
          metadata: {
            system_state: result.system_state,
            sensor_drift: result.sensor_drift_detected,
            airflow_ineffective: result.airflow_ineffective,
            stuck_relay: result.stuck_relay_detected,
            heater_allowed: result.heater_allowed,
            force_ventilation: result.force_ventilation,
          },
        });
      }

      // Create emergency events for life-threatening conditions
      if (result.emergency_priority === "LIFE_THREATENING" || result.emergency_priority === "CRITICAL") {
        const existingEvents = await supabase
          .from("emergency_events")
          .select("id")
          .eq("user_id", input.user_id)
          .in("status", ["active", "escalated"])
          .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .limit(1);

        if (!existingEvents.data?.length) {
          const emergencyTitle = result.sensor_drift_detected
            ? "🔴 SENSOR DRIFT: Temperature readings contradict physical reality"
            : result.stuck_relay_detected
            ? `🔴 WELDED RELAY: ${result.stuck_relay_detected} stuck`
            : result.airflow_ineffective
            ? "🔴 VENTILATION INEFFECTIVE: Fan running but no cooling"
            : `🔴 ${result.system_state}: Immediate action required`;

          await supabase.from("emergency_events").insert({
            user_id: input.user_id,
            farm_id: input.farm_id || null,
            shed_id: input.shed_id || null,
            trigger_type: result.sensor_drift_detected ? "sensor_offline" : "heatstroke_risk",
            priority: result.emergency_priority,
            title: emergencyTitle,
            title_bn: emergencyTitle,
            description: result.sensor_drift_reason || result.airflow_fail_reason || result.heater_blocked_reason || "Safety engine detected critical condition",
            description_bn: result.sensor_drift_reason || result.airflow_fail_reason || result.heater_blocked_reason || "সেফটি ইঞ্জিন সংকটপূর্ণ অবস্থা শনাক্ত করেছে",
            actions_taken: [
              ...(result.force_ventilation ? ["force_ventilation"] : []),
              ...(!result.heater_allowed ? ["disable_heater"] : []),
              "notify_owner",
            ],
            sensor_snapshot: {
              temperature: input.temperature,
              humidity: input.humidity,
              ammonia: input.ammonia,
              hsi: input.hsi_value,
            },
            source: "safety_engine",
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, safety: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Safety engine error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function evaluateSafety(input: EvaluationInput) {
  let system_state = "NORMAL";
  let emergency_priority: string | null = null;
  let emergency_active = false;

  // === WORST-CASE SENSOR SELECTION ===
  // Use MAX temp for cooling/overheat decisions, MIN temp for heating decisions
  const safetyTempMax = input.worst_case_max_temp ?? input.temperature;
  const safetyTempMin = input.worst_case_min_temp ?? input.temperature;

  // === SENSOR STATE EVALUATION ===
  const sensorState: Record<string, string> = {
    temperature: "VALID",
    humidity: "VALID",
    ammonia: "VALID",
    water: "VALID",
  };
  const sensorIssues: Array<{ sensor: string; type: string; message: string }> = [];

  // Biological range check (use worst-case max)
  if (safetyTempMax < BIO_TEMP_MIN || safetyTempMax > BIO_TEMP_MAX) {
    sensorState.temperature = "PHYSICALLY_IMPOSSIBLE";
    sensorIssues.push({
      sensor: "temperature",
      type: "physically_impossible",
      message: `Temperature ${safetyTempMax}°C outside biological range (${BIO_TEMP_MIN}-${BIO_TEMP_MAX}°C)`,
    });
    system_state = "SENSOR_FAIL";
  }

  // === THERMAL MODEL PLAUSIBILITY ===
  let thermal_model_invalid = false;
  let thermal_model_reason: string | null = null;
  if (input.thermal_model_plausible === false && input.thermal_model_deviation !== null) {
    if (input.thermal_model_deviation > THERMAL_MODEL_MAX_DEVIATION) {
      thermal_model_invalid = true;
      thermal_model_reason = input.thermal_model_reason || 
        `Sensor deviates ${input.thermal_model_deviation.toFixed(1)}°C from thermal model (max ${THERMAL_MODEL_MAX_DEVIATION}°C)`;
      sensorState.temperature = "PHYSICALLY_IMPOSSIBLE";
      sensorIssues.push({
        sensor: "temperature",
        type: "thermal_model_implausible",
        message: thermal_model_reason,
      });
      if (system_state === "NORMAL") system_state = "SENSOR_FAIL";
    }
  }

  // === ACTUATOR EFFECT VALIDATION ===
  let actuator_effect_failure = false;
  let actuator_fail_reason: string | null = null;
  
  if (input.fan_effect_failures >= 2) {
    actuator_effect_failure = true;
    actuator_fail_reason = `Fan ON but no cooling effect (${input.fan_effect_failures} consecutive failures)`;
    system_state = "SURVIVAL";
    emergency_priority = "LIFE_THREATENING";
    emergency_active = true;
  }
  if (input.heater_effect_failures >= 2) {
    actuator_effect_failure = true;
    actuator_fail_reason = (actuator_fail_reason ? actuator_fail_reason + "; " : "") +
      `Heater ON but no heating effect (${input.heater_effect_failures} consecutive failures)`;
    system_state = "SURVIVAL";
    emergency_priority = "LIFE_THREATENING";
    emergency_active = true;
  }

  // === REBOOT SAFETY EVALUATION ===
  let reboot_heater_locked = false;
  let reboot_vent_purge = false;
  let reboot_nh3_muted = false;
  
  if (input.uptime_ms < REBOOT_HEATER_LOCKOUT_MS) {
    reboot_heater_locked = true;
  }
  if (input.uptime_ms < REBOOT_VENT_PURGE_MS) {
    reboot_vent_purge = true;
  }
  if (input.uptime_ms < REBOOT_NH3_ALERT_MUTE_MS) {
    reboot_nh3_muted = true;
  }

  // === BIRD AGE VALIDATION ===
  let age_valid = true;
  let age_rejection_reason: string | null = null;
  
  if (input.bird_age_days !== null) {
    if (input.bird_age_days < AGE_MIN_DAYS || input.bird_age_days > AGE_MAX_DAYS) {
      age_valid = false;
      age_rejection_reason = `Age ${input.bird_age_days}d outside range [${AGE_MIN_DAYS}-${AGE_MAX_DAYS}]`;
    }
    if (age_valid && input.bird_age_previous !== null && input.bird_age_last_change_ms !== null) {
      const ageDelta = Math.abs(input.bird_age_days - input.bird_age_previous);
      if (ageDelta > AGE_MAX_JUMP_PER_24H && input.bird_age_last_change_ms < 86400000) {
        age_valid = false;
        age_rejection_reason = `Age jump ${input.bird_age_previous}→${input.bird_age_days} (${ageDelta}d) exceeds max ${AGE_MAX_JUMP_PER_24H}d/24h`;
      }
    }
  }

  // === SENSOR DRIFT DETECTION ===
  let sensor_drift_detected = false;
  let sensor_drift_reason: string | null = null;

  if (input.temp_15min_ago !== null) {
    const tempChange = safetyTempMax - input.temp_15min_ago;

    if (
      input.heater_on_ms_15min >= DRIFT_HEATER_ACTIVE_THRESHOLD_MS &&
      tempChange < DRIFT_HEATER_EXPECTED_RISE
    ) {
      sensor_drift_detected = true;
      sensor_drift_reason = `Heater ON ${(input.heater_on_ms_15min / 60000).toFixed(1)}min but temp only rose ${tempChange.toFixed(2)}°C (expected ≥${DRIFT_HEATER_EXPECTED_RISE}°C)`;
      sensorState.temperature = "PHYSICALLY_IMPOSSIBLE";
      system_state = "SURVIVAL";
      emergency_priority = "LIFE_THREATENING";
      emergency_active = true;
    }

    if (
      input.fan_on_ms_15min >= DRIFT_FAN_ACTIVE_THRESHOLD_MS &&
      -tempChange < DRIFT_FAN_EXPECTED_DROP
    ) {
      sensor_drift_detected = true;
      sensor_drift_reason = `Fan ON ${(input.fan_on_ms_15min / 60000).toFixed(1)}min but temp only dropped ${(-tempChange).toFixed(2)}°C (expected ≥${DRIFT_FAN_EXPECTED_DROP}°C)`;
      sensorState.temperature = "PHYSICALLY_IMPOSSIBLE";
      system_state = "SURVIVAL";
      emergency_priority = "LIFE_THREATENING";
      emergency_active = true;
    }
  }

  // === CONTINUOUS AIRFLOW VERIFICATION ===
  let airflow_verified = true;
  let airflow_ineffective = false;
  let airflow_fail_reason: string | null = null;
  const airflow_consecutive_failures = 0;

  if (
    input.fan_on_ms_10min >= AIRFLOW_MIN_FAN_ACTIVE_MS &&
    input.temp_10min_ago !== null &&
    input.humidity_10min_ago !== null
  ) {
    const tempDrop = input.temp_10min_ago - safetyTempMax;
    const humidityDrop = input.humidity_10min_ago - input.humidity;
    const coolingObserved =
      tempDrop >= AIRFLOW_EXPECTED_TEMP_DROP || humidityDrop >= AIRFLOW_EXPECTED_HUMIDITY_DROP;

    if (!coolingObserved) {
      airflow_verified = false;
      airflow_ineffective = true;
      airflow_fail_reason = `Fan active ${(input.fan_on_ms_10min / 60000).toFixed(1)}min but temp dropped ${tempDrop.toFixed(2)}°C and humidity dropped ${humidityDrop.toFixed(1)}%. Ventilation ineffective.`;
      if (system_state === "NORMAL") system_state = "DANGER";
      if (!emergency_priority) emergency_priority = "CRITICAL";
      emergency_active = true;
    }
  }

  // === STUCK RELAY DETECTION ===
  let stuck_relay_detected: string | null = null;

  if (
    input.heater_off_temp !== null &&
    input.heater_off_elapsed_ms !== null &&
    input.heater_off_elapsed_ms >= 60000 &&
    input.heater_off_elapsed_ms < 120000
  ) {
    const tempRise = safetyTempMax - input.heater_off_temp;
    if (tempRise >= STUCK_HEATER_TEMP_RISE) {
      stuck_relay_detected = "heater";
      system_state = "EMERGENCY";
      emergency_priority = "LIFE_THREATENING";
      emergency_active = true;
    }
  }

  // === HEATER-VENT INTERLOCK ===
  let heater_allowed = true;
  let heater_blocked_reason: string | null = null;
  let mandatory_fan_pulse_active = false;
  let force_ventilation = false;
  let min_vent_duty_required = false;
  let rapid_temp_rise_detected = false;
  let current_temp_rate = 0;

  // Rule: reboot heater lockout
  if (reboot_heater_locked) {
    heater_allowed = false;
    heater_blocked_reason = "Post-reboot heater lockout (3 min)";
  }

  // Rule: sensor invalid → block heater
  if (sensorState.temperature !== "VALID") {
    heater_allowed = false;
    heater_blocked_reason = "Temperature sensor FAILED — heater blocked for safety";
    force_ventilation = true;
  }

  // Rule: thermal model implausible → block heater
  if (thermal_model_invalid) {
    heater_allowed = false;
    heater_blocked_reason = "Thermal model implausible — heater blocked";
    force_ventilation = true;
  }

  // Rule: fan unavailable → block heater
  if (heater_allowed && !input.fan_available) {
    heater_allowed = false;
    heater_blocked_reason = "Exhaust fan unavailable — heater blocked to prevent suffocation";
  }

  // Rule: heater ON requires min vent + mandatory fan pulse after 5min
  if (input.heater_on && heater_allowed) {
    min_vent_duty_required = true;
    if (input.heater_continuous_ms >= HEATER_MAX_CONTINUOUS_MS) {
      mandatory_fan_pulse_active = true;
      force_ventilation = true;
    }
  }

  // Rule: rapid temp rise while heater ON → force ventilation
  if (input.temp_1min_ago !== null && input.heater_on) {
    current_temp_rate = (safetyTempMax - input.temp_1min_ago);
    if (current_temp_rate > RAPID_RISE_THRESHOLD) {
      rapid_temp_rise_detected = true;
      force_ventilation = true;
    }
  }

  // Reboot vent purge overrides
  if (reboot_vent_purge) {
    force_ventilation = true;
  }

  // Drift/airflow/actuator failures always force ventilation & block heating
  if (sensor_drift_detected || airflow_ineffective || actuator_effect_failure) {
    heater_allowed = false;
    heater_blocked_reason = sensor_drift_detected
      ? "Sensor drift detected — heater disabled"
      : airflow_ineffective
      ? "Airflow ineffective — heater disabled"
      : "Actuator effect failure — heater disabled";
    force_ventilation = true;
  }

  if (stuck_relay_detected) {
    heater_allowed = false;
    heater_blocked_reason = `Welded relay detected on ${stuck_relay_detected}`;
    force_ventilation = true;
  }

  // === OVERRIDE EVALUATION ===
  let override_out_of_bio_range = false;
  if (input.override_active && input.override_target_temp !== null) {
    override_out_of_bio_range =
      input.override_target_temp < BIO_OVERRIDE_MIN || input.override_target_temp > BIO_OVERRIDE_MAX;
  }

  // === SURVIVAL MODE ===
  const survival_mode = system_state === "SURVIVAL" || sensor_drift_detected || actuator_effect_failure;
  const survival_fan_on = survival_mode;
  const survival_heater_on = false;

  // === HSI EVALUATION (use worst-case max temp) ===
  let hsi_fan_activated = false;
  if (input.hsi_value !== null && input.hsi_value >= 75) {
    hsi_fan_activated = true;
    if (input.hsi_value >= 85 && !emergency_priority) {
      emergency_priority = "CRITICAL";
      emergency_active = true;
    }
    if (input.hsi_value >= 90) {
      emergency_priority = "LIFE_THREATENING";
      emergency_active = true;
      if (system_state === "NORMAL" || system_state === "WARNING") system_state = "EMERGENCY";
    }
  }
  if (safetyTempMax > 38) {
    if (system_state === "NORMAL") system_state = "DANGER";
    if (!emergency_priority) emergency_priority = "CRITICAL";
    emergency_active = true;
  }
  if (safetyTempMax > 40) {
    emergency_priority = "LIFE_THREATENING";
    emergency_active = true;
    system_state = "EMERGENCY";
  }

  // Ammonia (respect reboot NH3 mute for alerts, but still force ventilation)
  if (input.ammonia > 35) {
    if (!reboot_nh3_muted) {
      emergency_priority = "LIFE_THREATENING";
      emergency_active = true;
    }
    force_ventilation = true; // Always ventilate regardless of mute
    if (system_state !== "SURVIVAL") system_state = "EMERGENCY";
  } else if (input.ammonia > 25) {
    if (!reboot_nh3_muted) {
      if (!emergency_priority || emergency_priority === "WARNING") emergency_priority = "CRITICAL";
      emergency_active = true;
    }
    force_ventilation = true; // Always ventilate
    if (system_state === "NORMAL") system_state = "WARNING";
  }

  // === PLAUSIBILITY ===
  const plausibility_degraded = sensor_drift_detected || thermal_model_invalid;
  const heater_authority_percent = sensor_drift_detected ? 0 : thermal_model_invalid ? 30 : plausibility_degraded ? 60 : 100;

  return {
    system_state,
    sensor_state: sensorState,
    sensor_issues: sensorIssues,
    sensor_drift_detected,
    sensor_drift_reason,
    airflow_verified,
    airflow_ineffective,
    airflow_fail_reason,
    airflow_consecutive_failures,
    airflow_last_verified_at: new Date().toISOString(),
    stuck_relay_detected,
    locked_relays: [],
    relay_violations: 0,
    heater_runtime_ms: input.heater_continuous_ms || 0,
    motor_runtime_ms: 0,
    heater_allowed,
    heater_blocked_reason,
    mandatory_fan_pulse_active,
    rapid_temp_rise_detected,
    force_ventilation,
    min_vent_duty_required,
    current_temp_rate,
    emergency_priority,
    emergency_active,
    override_active: input.override_active,
    override_reason: input.override_reason,
    override_remaining_seconds: input.override_remaining_seconds,
    override_out_of_bio_range,
    survival_mode,
    survival_fan_on,
    survival_heater_on,
    safe_mode_active: system_state === "SENSOR_FAIL" || system_state === "SURVIVAL",
    safe_mode_until: null,
    plausibility_degraded,
    heater_authority_percent,
    plausibility_reason: sensor_drift_reason || thermal_model_reason,
    hsi_value: input.hsi_value,
    hsi_level: input.hsi_level,
    hsi_fan_activated,
    // New v2 fields
    actuator_effect_failure,
    actuator_fail_reason,
    thermal_model_invalid,
    thermal_model_reason,
    worst_case_max_temp: safetyTempMax,
    worst_case_min_temp: safetyTempMin,
    reboot_heater_locked,
    reboot_vent_purge,
    reboot_nh3_muted,
    age_valid,
    age_rejection_reason,
  };
}
