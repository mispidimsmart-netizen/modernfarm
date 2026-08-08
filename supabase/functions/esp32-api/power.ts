/**
 * Power outage tracking handlers.
 *
 * A single open row in `power_outages` (is_ongoing = true) represents the
 * current outage per device; it is closed when the device reports power back.
 * Alerts escalate to CRITICAL after 30 minutes of continuous outage.
 */
import { corsHeaders } from './http.ts';

// ===== POWER OUTAGE TRACKING =====

export interface PowerStatusPayload {
  power_on: boolean;
  power_source?: string; // 'mains', 'battery', 'ups'
  battery_level?: number;
}

export async function handlePowerStatus(body: PowerStatusPayload, supabase: any, userId: string, deviceToken: string) {
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

export async function getPowerOutages(supabase: any, userId: string) {
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
