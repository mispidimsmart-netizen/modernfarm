/**
 * Sensor ingestion handlers.
 *
 * Covers the legacy single-reading endpoint, the Phase 9 precise-sensor fields
 * (SHT31 / BH1750 / ZE03-NH3 / SCD41 / PMS5003), offline batch upload and the
 * connection-quality report. Readings are written to `sensor_readings`
 * (`sensor_logs` is legacy and must not be used for new data).
 */
import { corsHeaders } from './http.ts';
import { calculateHSI, applyHSIAutomation } from './hsi.ts';
import { classifyHSI, resolveHSIBands, toAutomationLevel } from '../_shared/hsi-bands.ts';
import { computeQualityScore } from './domain.ts';

export interface SensorPayload {
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
  sensor_error?: boolean;      // firmware sets true when sensors failed
  fw_version?: string;
  fw_channel?: string;
}

export async function handleSensorData(
  body: SensorPayload,
  supabase: any,
  userId: string,
  boundFarmId: string,
  boundShedId: string,
  boundDeviceName: string,
) {
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
    if (body.farm_id && body.farm_id !== boundFarmId) {
      return new Response(
        JSON.stringify({ error: 'farm_id does not match device binding', code: 'FARM_BINDING_MISMATCH' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (body.shed_id && body.shed_id !== boundShedId) {
      return new Response(
        JSON.stringify({ error: 'shed_id does not match device binding', code: 'SHED_BINDING_MISMATCH' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (body.device_id && body.device_id !== boundDeviceName) {
      return new Response(
        JSON.stringify({ error: 'device_id does not match device binding', code: 'DEVICE_BINDING_MISMATCH' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const shedId = boundShedId;
    let shedName: string | null = null;
    // MODE-01 / multi-farm: every settings read and desired_* write below is
    // scoped by farm, so a second farm of the same owner is never touched.
    const farmId = boundFarmId;

    const { data: shedInfo } = await supabase
      .from('sheds')
      .select('id, name, name_en')
      .eq('id', shedId)
      .eq('farm_id', farmId)
      .maybeSingle();
    if (!shedInfo) {
      return new Response(
        JSON.stringify({ error: 'Device shed binding is invalid', code: 'INVALID_SHED_BINDING' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    shedName = shedInfo.name || shedInfo.name_en;


    // Insert sensor reading with shed_id
    const sensorInsertData: Record<string, any> = {
      user_id: userId,
      farm_id: farmId,
      shed_id: shedId,
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
        // Prefer the device/shed's own farm; only fall back to "first owned farm".
        const farmRow = { id: farmId };
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
        const farmRow = { id: farmId };
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
              device_id: boundDeviceName,
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
      
      const powerQuery = supabase
        .from('device_status')
        .update({ power_on: powerOn, updated_at: new Date().toISOString() })
        .eq('farm_id', farmId)
        .eq('shed_id', shedId);

      
      await powerQuery;

      // Create alert for power failure with shed info
      if (!powerOn) {
        const alertData: Record<string, any> = {
          user_id: userId,
          farm_id: farmId,
          shed_id: shedId,
          alert_type: 'power',
          severity: 'danger',
          message: shedName 
            ? `Power failure detected in ${shedName}!`
            : 'Power failure detected!',
          message_bn: shedName 
            ? `${shedName}-এ বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!`
            : 'বিদ্যুৎ বিভ্রাট সনাক্ত হয়েছে!',
        };
        
        await supabase.from('alerts').insert(alertData);
      }
    }

    // Check for alerts based on farm settings (farm-scoped; `.single()` used to
    // throw for owners with more than one farm_settings row).
    const settingsQuery = supabase
      .from('farm_settings')
      .select('*')
      .eq('farm_id', farmId);
    const { data: settings } = await settingsQuery.limit(1).maybeSingle();


    const alerts: Record<string, any>[] = [];
    const shedLabel = shedName || (shedId ? `Shed ${shedId.slice(0, 8)}` : 'Farm');
    
    // 🔥 HSI-BASED AUTOMATION (Cloud Side — THI Formula aligned with firmware v8.0.0)
    // Calculate THI: 0.8 × Temp + (Humidity / 100) × (Temp − 14.4) + 46.4
    const hsi = calculateHSI(body.temperature, body.humidity);
    // P2 fix: bands + comparison semantics come from the shared module
    // (farmer's farm_settings values, strict `>` like the firmware). This path
    // used to hardcode 75/80/85 with a mixed `>`/`>=` comparison.
    const hsiBands = resolveHSIBands(settings);
    const hsiLevel = classifyHSI(hsi, hsiBands);
    const hsiStatus = toAutomationLevel(hsiLevel);
    
    console.log(`🔥 [${shedLabel}] THI = ${hsi.toFixed(1)} (Temp=${body.temperature}, Hum=${body.humidity}) → ${hsiStatus}`);
    
    // THI-based alert thresholds (aligned with firmware)
    // < 75: Normal, 75-80: Mild, 80-85: High Stress, > 85: Danger
    if (hsiStatus === 'DANGER') {
      const alertData: Record<string, any> = {
        user_id: userId,
        farm_id: farmId,
        shed_id: shedId,
        alert_type: 'temperature',
        severity: 'danger',
        message: `🚨 [${shedLabel}] DANGER! Heat Stress Index: ${hsi.toFixed(1)} (Temp: ${body.temperature.toFixed(1)}°C, Humidity: ${body.humidity.toFixed(0)}%)`,
        message_bn: `🚨 [${shedLabel}] বিপদ! হিট স্ট্রেস ইন্ডেক্স: ${hsi.toFixed(1)} (তাপ: ${body.temperature.toFixed(1)}°সে, আর্দ্রতা: ${body.humidity.toFixed(0)}%)`,
      };
      alerts.push(alertData);
      
      // Auto-enable fan HIGH + alarm for THIS SHED (skip if farmer disabled safety engine)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'DANGER', hsi, shedId, farmId);
      }
      
    } else if (hsiStatus === 'HIGH') {
      const alertData: Record<string, any> = {
        user_id: userId,
        farm_id: farmId,
        shed_id: shedId,
        alert_type: 'temperature',
        severity: 'warning',
        message: `⚠️ [${shedLabel}] High Heat Stress: THI ${hsi.toFixed(1)} (Temp: ${body.temperature.toFixed(1)}°C, Humidity: ${body.humidity.toFixed(0)}%)`,
        message_bn: `⚠️ [${shedLabel}] উচ্চ হিট স্ট্রেস: THI ${hsi.toFixed(1)} (তাপ: ${body.temperature.toFixed(1)}°সে, আর্দ্রতা: ${body.humidity.toFixed(0)}%)`,
      };
      alerts.push(alertData);
      
      // Auto-enable fan HIGH for THIS SHED (skip if disabled)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'HIGH', hsi, shedId, farmId);
      }
      
    } else if (hsiStatus === 'MILD') {
      // Mild stress - fan LOW (no alert needed, just automation)
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'MILD', hsi, shedId, farmId);
      }
    } else {
      // Normal - can turn off fan if no other issues
      if (settings?.safety_engine_enabled !== false) {
        await applyHSIAutomation(supabase, userId, 'NORMAL', hsi, shedId, farmId);
      }
    }

    // Legacy temperature-only alerts (for backward compatibility)
    if (settings) {
      if (body.temperature > Number(settings.temperature_max) && hsiStatus !== 'DANGER') {
        // Only add if not already covered by HSI danger alert
        if (!alerts.some(a => a.severity === 'danger' && a.alert_type === 'temperature')) {
          const alertData: Record<string, any> = {
            user_id: userId,
            farm_id: farmId,
            shed_id: shedId,
            alert_type: 'temperature',
            severity: body.temperature > Number(settings.temperature_max) + 5 ? 'danger' : 'warning',
            message: `[${shedLabel}] High temperature: ${body.temperature.toFixed(1)}°C`,
            message_bn: `[${shedLabel}] উচ্চ তাপমাত্রা: ${body.temperature.toFixed(1)}°সে`,
          };
          alerts.push(alertData);
        }
      }

      if (body.ammonia > Number(settings.ammonia_max)) {
        const alertData: Record<string, any> = {
          user_id: userId,
          farm_id: farmId,
          shed_id: shedId,
          alert_type: 'ammonia',
          severity: body.ammonia > Number(settings.ammonia_max) + 10 ? 'danger' : 'warning',
          message: `[${shedLabel}] High ammonia level: ${body.ammonia.toFixed(0)} ppm`,
          message_bn: `[${shedLabel}] উচ্চ অ্যামোনিয়া মাত্রা: ${body.ammonia.toFixed(0)} পিপিএম`,
        };
        alerts.push(alertData);
      }

      if (waterUsage < 10) {
        const alertData: Record<string, any> = {
          user_id: userId,
          farm_id: farmId,
          shed_id: shedId,
          alert_type: 'water',
          severity: waterUsage < 5 ? 'danger' : 'warning',
          message: `[${shedLabel}] Low water usage: ${waterUsage.toFixed(1)} L/hr`,
          message_bn: `[${shedLabel}] কম পানি ব্যবহার: ${waterUsage.toFixed(1)} লি/ঘন্টা`,
        };
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
        farm_id: farmId,
        shed_id: shedId,
        shed_name: shedName,
        device_id: boundDeviceName,
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


export async function handleSensorBatch(body: any, supabase: any, userId: string, deviceToken: string) {
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


export async function handleQualityUpdate(body: any, supabase: any, userId: string, deviceToken: string) {
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
