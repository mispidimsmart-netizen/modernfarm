import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

interface SensorPayload {
  // Support both formats
  device_id?: string;
  device_token?: string;
  temperature: number;
  humidity: number;
  ammonia: number;
  water_usage?: number;
  water_flow?: number;
  power_status?: string;
  timestamp?: string;
}

interface DeviceStatusPayload {
  device_id?: string;
  power_on?: boolean;
  fan_on?: boolean;
  light_on?: boolean;
  alarm_on?: boolean;
  device_token?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // For POST requests, try to get device token from body first, then header
    let deviceToken = req.headers.get('x-device-token') || '';
    let bodyData: any = null;

    if (req.method === 'POST') {
      bodyData = await req.json();
      // Support device_id or device_token in body as alternative to header
      if (!deviceToken && bodyData.device_id) {
        // Look up token by device_id (device_name)
        const { data: deviceByName } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('device_name', bodyData.device_id)
          .eq('is_active', true)
          .single();
        
        if (deviceByName) {
          deviceToken = deviceByName.token;
        }
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
      return new Response(
        JSON.stringify({ error: 'Missing device token or device_id', code: 'MISSING_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify device token and get user
    const { data: device, error: deviceError } = await supabase
      .from('device_tokens')
      .select('user_id, is_active')
      .eq('token', deviceToken)
      .single();

    if (deviceError || !device) {
      console.error('Device token validation failed:', deviceError);
      return new Response(
        JSON.stringify({ error: 'Invalid device token', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!device.is_active) {
      return new Response(
        JSON.stringify({ error: 'Device is deactivated', code: 'DEVICE_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = device.user_id;

    // Update device last seen
    await supabase
      .from('device_tokens')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('token', deviceToken);

    // Route handling
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

    if (req.method === 'GET' && path === 'power-outages') {
      return await getPowerOutages(supabase, userId);
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ESP32 API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    // Insert sensor reading
    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        user_id: userId,
        temperature: body.temperature,
        humidity: body.humidity,
        ammonia: body.ammonia,
        water_usage: waterUsage,
      });

    if (insertError) {
      console.error('Sensor insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save sensor data', code: 'INSERT_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle power_status if provided
    if (body.power_status) {
      const powerOn = body.power_status.toUpperCase() === 'ON';
      await supabase
        .from('device_status')
        .update({ power_on: powerOn })
        .eq('user_id', userId);

      // Create alert for power failure
      if (!powerOn) {
        await supabase.from('alerts').insert({
          user_id: userId,
          alert_type: 'power',
          severity: 'danger',
          message: 'Power failure detected!',
          message_bn: 'বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!',
        });
      }
    }

    // Check for alerts based on farm settings
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const alerts = [];

    if (settings) {
      if (body.temperature > Number(settings.temperature_max)) {
        alerts.push({
          user_id: userId,
          alert_type: 'temperature',
          severity: body.temperature > Number(settings.temperature_max) + 5 ? 'danger' : 'warning',
          message: `High temperature: ${body.temperature.toFixed(1)}°C`,
          message_bn: `উচ্চ তাপমাত্রা: ${body.temperature.toFixed(1)}°সে`,
        });
      }

      if (body.ammonia > Number(settings.ammonia_max)) {
        alerts.push({
          user_id: userId,
          alert_type: 'ammonia',
          severity: body.ammonia > Number(settings.ammonia_max) + 10 ? 'danger' : 'warning',
          message: `High ammonia level: ${body.ammonia.toFixed(0)} ppm`,
          message_bn: `উচ্চ অ্যামোনিয়া মাত্রা: ${body.ammonia.toFixed(0)} পিপিএম`,
        });
      }

      if (waterUsage < 10) {
        alerts.push({
          user_id: userId,
          alert_type: 'water',
          severity: waterUsage < 5 ? 'danger' : 'warning',
          message: `Low water usage: ${waterUsage.toFixed(1)} L/hr`,
          message_bn: `কম পানি ব্যবহার: ${waterUsage.toFixed(1)} লি/ঘন্টা`,
        });
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
              title: '⚠️ Critical Farm Alert',
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

    console.log(`Sensor data saved for device ${body.device_id || 'unknown'}: temp=${body.temperature}, humidity=${body.humidity}, ammonia=${body.ammonia}, water=${waterUsage}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sensor data saved',
        alerts_created: alerts.length,
        device_id: body.device_id || null,
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
  // Get pending (unexecuted) commands for this device
  let query = supabase
    .from('device_commands')
    .select('id, command_type, command_value, created_at')
    .eq('user_id', userId)
    .eq('executed', false)
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

  console.log(`Returning ${data?.length || 0} pending commands for device ${deviceName || 'all'}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      commands: data || [],
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

  // Handle mode - AUTO means disable manual override, MANUAL means enable it
  if (body.mode) {
    const manualOverride = body.mode === 'MANUAL';
    await supabase
      .from('device_status')
      .update({ manual_override: manualOverride })
      .eq('user_id', userId);
  }

  if (commands.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid control commands provided', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert commands for ESP32 to pick up
  const { error } = await supabase.from('device_commands').insert(commands);

  if (error) {
    console.error('Error inserting control commands:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to queue commands', code: 'INSERT_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Queued ${commands.length} control commands for device ${deviceName}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Commands queued',
      commands_queued: commands.length,
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

  // Build update object for device_status
  const statusUpdate: Record<string, boolean> = {};
  if (fanValue !== undefined) statusUpdate.fan_on = fanValue;
  if (lightValue !== undefined) statusUpdate.light_on = lightValue;
  if (alarmValue !== undefined) statusUpdate.alarm_on = alarmValue;
  if (powerValue !== undefined) statusUpdate.power_on = powerValue;
  
  // Enable manual override when using manual control
  if (body.manual_override !== undefined) {
    statusUpdate.manual_override = body.manual_override;
  } else {
    statusUpdate.manual_override = true;
  }

  if (Object.keys(statusUpdate).length === 0) {
    return new Response(
      JSON.stringify({ error: 'No control values provided', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update device status directly
  const { error: updateError } = await supabase
    .from('device_status')
    .update(statusUpdate)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error updating device status:', updateError);
    return new Response(
      JSON.stringify({ error: 'Failed to update device status', code: 'UPDATE_FAILED' }),
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

  console.log(`Manual control applied: ${JSON.stringify(statusUpdate)} for device ${deviceName}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Manual control applied',
      device_id: deviceName,
      status_updated: statusUpdate,
      commands_queued: commands.length,
      manual_override: statusUpdate.manual_override
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
