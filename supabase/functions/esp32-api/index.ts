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
    if (req.method === 'GET' && !deviceToken) {
      const queryDeviceId = url.searchParams.get('device_id');
      if (queryDeviceId) {
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

    if (req.method === 'GET' && path === 'automation-rules') {
      return await getAutomationRules(supabase, userId);
    }

    if (req.method === 'POST' && path === 'automation-rules') {
      return await createAutomationRule(bodyData, supabase, userId);
    }

    if (req.method === 'GET' && path === 'lighting-schedule') {
      return await getLightingSchedule(supabase, userId);
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
  const { data, error } = await supabase
    .from('farm_settings')
    .select('temperature_min, temperature_max, humidity_min, humidity_max, ammonia_max')
    .eq('user_id', userId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to get settings', code: 'FETCH_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
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
    .select('start_time, end_time, total_hours, manual_override')
    .eq('user_id', userId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to get lighting schedule', code: 'FETCH_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
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
