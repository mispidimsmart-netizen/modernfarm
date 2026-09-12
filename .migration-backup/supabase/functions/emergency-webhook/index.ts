import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { trigger_type, priority, title, description, sensor_snapshot, actions } = body;

    // Fetch user's webhook config
    const { data: config } = await supabase
      .from('emergency_webhook_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!config || !config.webhook_enabled || !config.webhook_url) {
      return new Response(JSON.stringify({ 
        success: true, 
        webhook_called: false, 
        reason: 'no_webhook_configured' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this priority level should trigger webhook
    const shouldNotify = 
      (priority === 'INFO' && config.notify_on_info) ||
      (priority === 'WARNING' && config.notify_on_warning) ||
      (priority === 'CRITICAL' && config.notify_on_critical) ||
      (priority === 'LIFE_THREATENING' && config.notify_on_life_threatening);

    if (!shouldNotify) {
      return new Response(JSON.stringify({ 
        success: true, 
        webhook_called: false, 
        reason: 'priority_filtered' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the external webhook
    const webhookPayload = {
      event: 'farm_emergency',
      timestamp: new Date().toISOString(),
      farm_owner_id: user.id,
      trigger_type,
      priority,
      title,
      description,
      sensor_snapshot,
      actions_taken: actions,
    };

    let webhookResponse: any = null;
    let webhookSuccess = false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const resp = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      webhookSuccess = resp.ok;
      webhookResponse = {
        status: resp.status,
        statusText: resp.statusText,
      };
    } catch (webhookErr: any) {
      webhookResponse = { error: webhookErr.message || 'Webhook call failed' };
    }

    // Also try to send push notification for critical/life-threatening
    if (priority === 'CRITICAL' || priority === 'LIFE_THREATENING') {
      try {
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id);

        if (subscriptions && subscriptions.length > 0) {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: user.id,
              title: `🚨 ${priority}: ${title}`,
              body: description,
              tag: `emergency_${trigger_type}`,
              urgency: 'high',
            },
          });
        }
      } catch (pushErr) {
        console.error('Push notification failed:', pushErr);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      webhook_called: true,
      webhook_success: webhookSuccess,
      webhook_response: webhookResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
