import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRequest {
  action: 'dispatch' | 'acknowledge' | 'check_repeats' | 'escalate';
  alert_id?: string;
  emergency_event_id?: string;
  priority: 'normal' | 'important' | 'urgent' | 'critical';
  title: string;
  body?: string;
  user_id?: string;
  farm_id?: string;
}

const PRIORITY_CHANNELS: Record<string, string[]> = {
  normal: ['in_app'],
  important: ['push', 'in_app'],
  urgent: ['push', 'sms', 'in_app'],
  critical: ['push', 'sms', 'webhook', 'in_app'],
};

const REPEAT_CONFIG: Record<string, { maxRepeats: number; intervalMinutes: number }> = {
  normal: { maxRepeats: 0, intervalMinutes: 0 },
  important: { maxRepeats: 0, intervalMinutes: 0 },
  urgent: { maxRepeats: 3, intervalMinutes: 5 },
  critical: { maxRepeats: 10, intervalMinutes: 2 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: EscalationRequest = await req.json();
    const { action, priority, title } = body;
    const userId = body.user_id || user.id;
    const farmId = body.farm_id;

    // Get user's escalation config
    const { data: config } = await supabase
      .from('notification_escalation_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (action === 'dispatch') {
      // Determine channels based on priority + user config
      const channels = getChannelsForPriority(priority, config);
      const repeatConfig = REPEAT_CONFIG[priority];
      const results: any[] = [];

      for (const channel of channels) {
        // Log delivery attempt
        const { data: logEntry } = await supabase
          .from('notification_delivery_log')
          .insert({
            user_id: userId,
            farm_id: farmId || null,
            alert_id: body.alert_id || null,
            emergency_event_id: body.emergency_event_id || null,
            priority,
            channel,
            status: 'pending',
            title,
            body: body.body || null,
            repeat_count: 0,
            max_repeats: repeatConfig.maxRepeats,
            next_repeat_at: repeatConfig.maxRepeats > 0
              ? new Date(Date.now() + repeatConfig.intervalMinutes * 60000).toISOString()
              : null,
          })
          .select()
          .single();

        // Attempt delivery
        let deliveryResult = { success: false, error: '' };
        try {
          switch (channel) {
            case 'push':
              deliveryResult = await sendPush(supabase, userId, title, body.body || '', priority);
              break;
            case 'sms':
              deliveryResult = await sendSms(supabase, userId, title, body.body || '');
              break;
            case 'webhook':
              deliveryResult = await callWebhook(supabase, userId, body);
              break;
            case 'in_app':
              deliveryResult = { success: true, error: '' };
              break;
          }
        } catch (err: any) {
          deliveryResult = { success: false, error: err.message };
        }

        // Update delivery status
        if (logEntry) {
          await supabase
            .from('notification_delivery_log')
            .update({
              status: deliveryResult.success ? 'sent' : 'failed',
              error_message: deliveryResult.error || null,
            })
            .eq('id', logEntry.id);
        }

        results.push({ channel, ...deliveryResult });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'acknowledge') {
      // Mark notifications as acknowledged
      const alertId = body.alert_id || body.emergency_event_id;
      if (alertId) {
        await supabase
          .from('notification_delivery_log')
          .update({
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user.id,
            status: 'delivered',
            next_repeat_at: null, // Stop repeats
          })
          .eq('user_id', userId)
          .or(`alert_id.eq.${alertId},emergency_event_id.eq.${alertId}`)
          .is('acknowledged_at', null);

        // Reset escalation tracker
        await supabase
          .from('notification_escalation_tracker')
          .update({
            ignored_critical_count: 0,
            is_escalated: false,
            escalation_resolved_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_repeats') {
      // Find notifications that need repeating
      const { data: pendingRepeats } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['sent', 'pending'])
        .not('next_repeat_at', 'is', null)
        .lte('next_repeat_at', new Date().toISOString())
        .lt('repeat_count', 10); // Safety limit

      if (pendingRepeats && pendingRepeats.length > 0) {
        for (const entry of pendingRepeats) {
          if (entry.repeat_count >= entry.max_repeats) {
            // Max repeats reached - check for escalation
            await handleIgnoredAlert(supabase, userId, farmId || null, config, entry);
            await supabase
              .from('notification_delivery_log')
              .update({ status: 'ignored', next_repeat_at: null })
              .eq('id', entry.id);
            continue;
          }

          // Re-send notification
          const repeatInterval = REPEAT_CONFIG[entry.priority as string]?.intervalMinutes || 5;
          try {
            if (entry.channel === 'push') {
              await sendPush(supabase, userId, `🔁 ${entry.title}`, entry.body || '', entry.priority);
            } else if (entry.channel === 'sms') {
              await sendSms(supabase, userId, `REPEAT: ${entry.title}`, entry.body || '');
            }
          } catch (_) { /* continue */ }

          await supabase
            .from('notification_delivery_log')
            .update({
              repeat_count: entry.repeat_count + 1,
              next_repeat_at: new Date(Date.now() + repeatInterval * 60000).toISOString(),
            })
            .eq('id', entry.id);
        }
      }

      return new Response(JSON.stringify({ success: true, repeated: pendingRepeats?.length || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'escalate') {
      // Force escalation to secondary number
      if (config?.secondary_phone) {
        await sendSmsToNumber(
          supabase, userId,
          config.secondary_phone,
          `🚨 ESCALATION: ${title}. Primary contact not responding. Please check farm immediately.`
        );

        await supabase
          .from('notification_delivery_log')
          .insert({
            user_id: userId,
            farm_id: farmId || null,
            priority: 'critical',
            channel: 'sms',
            status: 'sent',
            title: `ESCALATED: ${title}`,
            body: body.body,
            is_escalated: true,
            escalated_to: config.secondary_phone,
          });
      }

      return new Response(JSON.stringify({ success: true, escalated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// === Helper Functions ===

function getChannelsForPriority(priority: string, config: any): string[] {
  if (!config) return PRIORITY_CHANNELS[priority] || ['in_app'];

  const channels: string[] = ['in_app'];
  const p = priority;

  if (config[`${p}_push`]) channels.push('push');
  if (config[`${p}_sms`]) channels.push('sms');
  if (p === 'critical' && config.critical_webhook) channels.push('webhook');

  return [...new Set(channels)];
}

async function sendPush(supabase: any, userId: string, title: string, body: string, priority: string) {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title,
        body,
        tag: `priority_${priority}`,
        urgency: priority === 'critical' ? 'high' : 'normal',
      },
    });
    return { success: !error, error: error?.message || '' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendSms(supabase: any, userId: string, title: string, body: string) {
  // Get user's active phone numbers
  const { data: phones } = await supabase
    .from('sms_phone_numbers')
    .select('phone_number')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!phones || phones.length === 0) {
    return { success: false, error: 'No active phone numbers' };
  }

  // Log SMS (actual sending via GSM module on ESP32)
  for (const phone of phones) {
    await supabase.from('sms_logs').insert({
      user_id: userId,
      phone_number: phone.phone_number,
      message: `${title}\n${body}`.substring(0, 160),
      alert_type: 'priority_notification',
      sent_via: 'gateway',
      status: 'pending',
    });
  }

  return { success: true, error: '' };
}

async function sendSmsToNumber(supabase: any, userId: string, phone: string, message: string) {
  await supabase.from('sms_logs').insert({
    user_id: userId,
    phone_number: phone,
    message: message.substring(0, 160),
    alert_type: 'escalation',
    sent_via: 'gateway',
    status: 'pending',
  });
}

async function callWebhook(supabase: any, userId: string, body: any) {
  const { data: webhookConfig } = await supabase
    .from('emergency_webhook_config')
    .select('webhook_url, webhook_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (!webhookConfig?.webhook_enabled || !webhookConfig?.webhook_url) {
    return { success: true, error: 'No webhook configured' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(webhookConfig.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'priority_notification',
        timestamp: new Date().toISOString(),
        priority: body.priority,
        title: body.title,
        body: body.body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return { success: resp.ok, error: resp.ok ? '' : `HTTP ${resp.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleIgnoredAlert(supabase: any, userId: string, farmId: string | null, config: any, entry: any) {
  if (entry.priority !== 'critical') return;
  if (!config?.escalation_enabled) return;

  // Increment ignored counter
  const { data: tracker } = await supabase
    .from('notification_escalation_tracker')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const newCount = (tracker?.ignored_critical_count || 0) + 1;
  const threshold = config?.ignored_critical_threshold || 3;

  if (tracker) {
    await supabase
      .from('notification_escalation_tracker')
      .update({
        ignored_critical_count: newCount,
        last_ignored_at: new Date().toISOString(),
        is_escalated: newCount >= threshold,
        escalated_at: newCount >= threshold ? new Date().toISOString() : tracker.escalated_at,
      })
      .eq('id', tracker.id);
  } else {
    await supabase
      .from('notification_escalation_tracker')
      .insert({
        user_id: userId,
        farm_id: farmId,
        ignored_critical_count: newCount,
        last_ignored_at: new Date().toISOString(),
        is_escalated: newCount >= threshold,
        escalated_at: newCount >= threshold ? new Date().toISOString() : null,
      });
  }

  // Escalate if threshold reached
  if (newCount >= threshold && config?.secondary_phone) {
    await sendSmsToNumber(
      supabase, userId,
      config.secondary_phone,
      `🚨 ESCALATION: ${entry.title}. Owner ignored ${newCount} critical alerts. Check farm NOW.`
    );

    await supabase
      .from('notification_delivery_log')
      .insert({
        user_id: userId,
        farm_id: farmId,
        priority: 'critical',
        channel: 'sms',
        status: 'sent',
        title: `ESCALATED: ${entry.title}`,
        body: `Owner ignored ${newCount} critical alerts`,
        is_escalated: true,
        escalated_to: config.secondary_phone,
      });
  }
}
