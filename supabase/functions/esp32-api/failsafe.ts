/**
 * Fail-safe sync handler.
 *
 * Called by the ESP32 while it is running autonomously (cloud unreachable or
 * FAIL_SAFE mode). It is a single fat round-trip: the device pushes sensors +
 * actual relay states, and the cloud answers with cached settings so the
 * controller can keep deciding locally.
 *
 * Invariant: the cloud NEVER overwrites actual relay state here — hardware is
 * the source of truth; only `desired_*` columns are authored by the cloud.
 */
import { corsHeaders } from './http.ts';

export interface FailsafeSyncPayload {
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

export async function handleFailsafeSync(
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

      // ⏰ Server clock (Bangladesh, UTC+6) — ESP32 has no RTC and layer
      // lighting schedules depend on it.
      current_hour: (new Date().getUTCHours() + 6) % 24,
      current_minute: new Date().getUTCMinutes(),
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
