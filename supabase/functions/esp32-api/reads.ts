/**
 * Read-only endpoints consumed by the ESP32 and the dashboard.
 *
 * These handlers never mutate device state; they project settings, automation
 * rules, lighting schedule, latest sensor snapshot, alerts and the full device
 * config into the compact JSON shapes the firmware expects.
 */
import { corsHeaders } from './http.ts';
import { calculateCurrentBrightness } from './lighting.ts';
import { getBroilerTargetTemp } from './domain.ts';

export async function getSettings(supabase: any, userId: string) {
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

export async function getAutomationRules(supabase: any, userId: string) {
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

export async function getLightingSchedule(supabase: any, userId: string) {
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


// Command delivery & ACK handlers live in ./commands.ts


export async function getLatestSensorData(supabase: any, userId: string) {
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

export async function getAlerts(supabase: any, userId: string, limit: number, unacknowledgedOnly: boolean) {
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


export async function getSystemStatus(
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
export async function getAdvancedSettings(
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
export async function getDeviceConfig(supabase: any, userId: string, shedId: string | null) {
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
        // Smart Lighting v2 (flock-aware) — required by layer AUTO mode
        manual_override: (lighting as any)?.manual_override ?? false,
        ldr_enabled: (lighting as any)?.ldr_enabled ?? false,
        ldr_threshold_lux: (lighting as any)?.ldr_threshold_lux ?? 50,
        ldr_hysteresis_lux: (lighting as any)?.ldr_hysteresis_lux ?? 20,
        ldr_mode: (lighting as any)?.ldr_mode ?? 'hybrid',
        ldr_daylight_off_lux: (lighting as any)?.ldr_daylight_off_lux ?? 300,
        fade_circuits: (lighting as any)?.fade_circuits ?? 2,
        fade_step_gap_minutes: (lighting as any)?.fade_step_gap_minutes ?? 5,
        flock_type: (lighting as any)?.flock_type ?? (isBroiler ? 'broiler' : 'layer'),
        layer_dark_hours: (lighting as any)?.layer_dark_hours ?? 9,
        broiler_dark_start: (lighting as any)?.broiler_dark_start ?? '23:00:00',
        broiler_dark_end: (lighting as any)?.broiler_dark_end ?? '05:00:00',
        broiler_age_auto: (lighting as any)?.broiler_age_auto ?? true,
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
      // Bangladesh = UTC+6 — must wrap, otherwise 20:00 UTC became hour 26
      currentHour: (now.getUTCHours() + 6) % 24,
      currentMinute: now.getUTCMinutes(),
      current_hour: (now.getUTCHours() + 6) % 24,
      current_minute: now.getUTCMinutes(),
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
