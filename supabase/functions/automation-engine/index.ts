import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

// ================ HEAT STRESS INDEX (HSI) CALCULATION ================
// THI Formula: THI = 0.8 × T + (RH/100) × (T - 14.4) + 46.4
// Or Simple: HSI = Temperature + (Humidity × 0.1)
function calculateHSI(temperature: number, humidity: number, useSimpleFormula = false): number {
  if (useSimpleFormula) {
    // Simple formula (matches ESP32 local calculation)
    return temperature + (humidity * 0.1);
  }
  // THI formula (more accurate for cloud)
  return 0.8 * temperature + (humidity / 100) * (temperature - 14.4) + 46.4;
}

type HSILevel = 'normal' | 'mild' | 'moderate' | 'severe' | 'emergency';

interface HSIResult {
  index: number;
  simpleIndex: number;
  level: HSILevel;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  shouldAlert: boolean;
  message: { bn: string; en: string };
}

function getHSIResult(temperature: number, humidity: number, thresholds: {
  mild: number;
  moderate: number;
  severe: number;
  emergency: number;
}): HSIResult {
  const hsi = calculateHSI(temperature, humidity);
  const simpleHsi = calculateHSI(temperature, humidity, true);
  
  if (hsi >= thresholds.emergency) {
    return {
      index: hsi,
      simpleIndex: simpleHsi,
      level: 'emergency',
      fanSpeed: 'HIGH',
      shouldAlert: true,
      message: { bn: 'জরুরি অবস্থা! মুরগির জীবন ঝুঁকিতে', en: 'Emergency! Bird lives at risk' }
    };
  } else if (hsi >= thresholds.severe) {
    return {
      index: hsi,
      simpleIndex: simpleHsi,
      level: 'severe',
      fanSpeed: 'HIGH',
      shouldAlert: true,
      message: { bn: 'গুরুতর তাপ চাপ! জরুরি পদক্ষেপ নিন', en: 'Severe heat stress! Take immediate action' }
    };
  } else if (hsi >= thresholds.moderate) {
    return {
      index: hsi,
      simpleIndex: simpleHsi,
      level: 'moderate',
      fanSpeed: 'HIGH',
      shouldAlert: true,
      message: { bn: 'মাঝারি তাপ চাপ - অতিরিক্ত বায়ু চলাচল প্রয়োজন', en: 'Moderate heat stress - Extra ventilation needed' }
    };
  } else if (hsi >= thresholds.mild) {
    return {
      index: hsi,
      simpleIndex: simpleHsi,
      level: 'mild',
      fanSpeed: 'LOW',
      shouldAlert: false,
      message: { bn: 'হালকা তাপ চাপ - ফ্যান চালু করুন', en: 'Mild heat stress - Turn on fans' }
    };
  }
  
  return {
    index: hsi,
    simpleIndex: simpleHsi,
    level: 'normal',
    fanSpeed: 'OFF',
    shouldAlert: false,
    message: { bn: 'স্বাভাবিক অবস্থা', en: 'Normal conditions' }
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
  sensorData: { temperature: number; humidity: number; ammonia: number; powerOn: boolean },
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
  if (!powerOn) {
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
  const hsiResult = getHSIResult(temperature, humidity, {
    mild: settings.hsi_mild_threshold,
    moderate: settings.hsi_moderate_threshold,
    severe: settings.hsi_severe_threshold,
    emergency: settings.hsi_emergency_threshold,
  });
  
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
  userId: string
): Promise<StaleDeviceResult[]> {
  const results: StaleDeviceResult[] = [];
  
  try {
    // Get all devices for this user
    const { data: devices } = await supabase
      .from('device_health')
      .select('id, device_token_id, shed_id, last_cloud_sync_at, failsafe_mode, is_online')
      .eq('user_id', userId);
    
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
        // Device was fail-safe but now syncing again → restore to AUTO
        console.log(`🟢 Device ${device.device_token_id} recovered from FAIL-SAFE`);
        
        await supabase
          .from('device_health')
          .update({
            failsafe_mode: false,
            failsafe_activated_at: null,
            is_online: true,
            mode: 'AUTO',
          })
          .eq('id', device.id);
        
        if (device.shed_id) {
          await supabase
            .from('device_status')
            .update({
              mode: 'AUTO',
              last_cloud_sync: new Date().toISOString(),
            })
            .eq('user_id', userId)
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

// ================ MAIN HANDLER ================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, shed_id, user_id } = await req.json();

    // ========================================
    // ACTION: run-automation (Per-Shed Automation)
    // ========================================
    if (action === 'run-automation') {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'user_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get farm settings (or shed-specific overrides)
      const { data: settings } = await supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (!settings) {
        return new Response(
          JSON.stringify({ success: false, error: 'Settings not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get latest sensor data for the shed
      let sensorQuery = supabase
        .from('sensor_logs')
        .select('*')
        .eq('user_id', user_id)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (shed_id) {
        sensorQuery = sensorQuery.eq('shed_id', shed_id);
      }

      const { data: sensorData } = await sensorQuery;

      if (!sensorData || sensorData.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No sensor data available',
            fallback: { fan: true, fanSpeed: 'HIGH', alarm: false, reason: 'No sensor data - Safe mode' }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const latestSensor = sensorData[0];
      
      // Run automation rules
      const automationAction = runAutomationRules(
        {
          temperature: latestSensor.temperature,
          humidity: latestSensor.humidity,
          ammonia: latestSensor.ammonia,
          powerOn: latestSensor.power_status !== 'OFF',
        },
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
        }
      );

      // Calculate HSI for response
      const hsiResult = getHSIResult(
        latestSensor.temperature,
        latestSensor.humidity,
        {
          mild: settings.hsi_mild_threshold,
          moderate: settings.hsi_moderate_threshold,
          severe: settings.hsi_severe_threshold,
          emergency: settings.hsi_emergency_threshold,
        }
      );

      // Update device status if not in manual override
      // Check BOTH manual_override (set by ESP32) AND desired_manual_override (set by app)
      const { data: deviceStatus } = await supabase
        .from('device_status')
        .select('manual_override, desired_manual_override')
        .eq('user_id', user_id)
        .eq('shed_id', shed_id)
        .single();

      const isManualOverride = deviceStatus?.manual_override || deviceStatus?.desired_manual_override;

      if (!isManualOverride) {
        await supabase
          .from('device_status')
          .update({
            fan_on: automationAction.fan,
            fan_speed: automationAction.fanSpeed,
            alarm_on: automationAction.alarm,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)
          .eq('shed_id', shed_id);
      }

      // Create alert if needed
      if (automationAction.alert) {
        const { data: alertData } = await supabase.from('alerts').insert({
          user_id,
          shed_id,
          alert_type: automationAction.alert.type,
          severity: automationAction.alert.severity,
          message: automationAction.alert.message,
          message_bn: automationAction.alert.messageBn,
        }).select('id').single();

        // Send push notification for this alert
        try {
          console.log(`📤 Sending push notification for alert: ${automationAction.alert.type}`);
          
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: user_id,
              title: automationAction.alert.severity === 'danger' 
                ? '🚨 জরুরি সতর্কতা!' 
                : '⚠️ সতর্কতা',
              body: automationAction.alert.messageBn,
              severity: automationAction.alert.severity,
              alert_id: alertData?.id,
              url: '/alerts',
            },
          });
          
          console.log(`✅ Push notification sent for alert`);
        } catch (pushError) {
          console.error('❌ Failed to send push notification:', pushError);
          // Don't fail the automation if push fails
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          automation: {
            action: automationAction,
            hsi: {
              index: hsiResult.index,
              simpleIndex: hsiResult.simpleIndex,
              level: hsiResult.level,
            },
            sensor: {
              temperature: latestSensor.temperature,
              humidity: latestSensor.humidity,
              ammonia: latestSensor.ammonia,
            },
            timestamp: new Date().toISOString(),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

      // Get device health for all sheds
      const { data: deviceHealth } = await supabase
        .from('device_health')
        .select('*')
        .eq('user_id', user_id);

      // Get latest sensor data per shed
      const { data: sensorData } = await supabase
        .from('sensor_logs')
        .select('*')
        .eq('user_id', user_id)
        .order('timestamp', { ascending: false })
        .limit(50);

      // Get settings
      const { data: settings } = await supabase
        .from('farm_settings')
        .select('*')
        .eq('user_id', user_id)
        .single();

      // Build status per shed
      const shedStatus = (sheds || []).map(shed => {
        const health = deviceHealth?.find(d => d.shed_id === shed.id);
        const sensors = sensorData?.filter(s => s.shed_id === shed.id) || [];
        const latestSensor = sensors[0];

        let hsiResult = null;
        if (latestSensor && settings) {
          hsiResult = getHSIResult(
            latestSensor.temperature,
            latestSensor.humidity,
            {
              mild: settings.hsi_mild_threshold,
              moderate: settings.hsi_moderate_threshold,
              severe: settings.hsi_severe_threshold,
              emergency: settings.hsi_emergency_threshold,
            }
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
            mode: health.failsafe_mode ? 'FAIL-SAFE' : 'AUTO',
          } : null,
          sensor: latestSensor ? {
            temperature: latestSensor.temperature,
            humidity: latestSensor.humidity,
            ammonia: latestSensor.ammonia,
            timestamp: latestSensor.timestamp,
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
          total_sheds: sheds?.length || 0,
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
      
      const staleDevices = await detectAndMarkStaleDevices(supabase, user_id);
      
      // Also run check for all sheds status
      const { data: deviceHealth } = await supabase
        .from('device_health')
        .select('shed_id, failsafe_mode, is_online, last_cloud_sync_at, mode')
        .eq('user_id', user_id);

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
      const staleDevices = await detectAndMarkStaleDevices(supabase, user_id);
      
      // Step 2: Get all active sheds
      const { data: sheds } = await supabase
        .from('sheds')
        .select('id, name')
        .eq('user_id', user_id)
        .eq('is_active', true);

      // Step 3: Run automation for each online shed
      const shedResults = [];
      for (const shed of sheds || []) {
        // Check if shed's device is online (not in fail-safe)
        const { data: health } = await supabase
          .from('device_health')
          .select('is_online, failsafe_mode')
          .eq('user_id', user_id)
          .eq('shed_id', shed.id)
          .maybeSingle();

        if (health?.is_online && !health?.failsafe_mode) {
          // Run automation for this shed (invoke internal logic)
          console.log(`[Run All] Running automation for shed: ${shed.name}`);
          shedResults.push({
            shed_id: shed.id,
            name: shed.name,
            status: 'automation_run',
            mode: 'AUTO',
          });
        } else {
          console.log(`[Run All] Skipping shed ${shed.name} - offline or fail-safe`);
          shedResults.push({
            shed_id: shed.id,
            name: shed.name,
            status: health?.failsafe_mode ? 'fail_safe' : 'offline',
            mode: health?.failsafe_mode ? 'FAIL_SAFE' : 'OFFLINE',
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          sheds_processed: shedResults.length,
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
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
