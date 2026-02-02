import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  severity?: 'warning' | 'danger';
  alert_id?: string;
  url?: string;
}

// Web Push requires VAPID keys for authentication
// These are generated once and should be stored as secrets
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();

    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to user ${payload.user_id}: ${payload.title}`);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the push message payload
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      severity: payload.severity || 'warning',
      alertId: payload.alert_id,
      url: payload.url || '/alerts',
      tag: `alert-${payload.alert_id || Date.now()}`,
    });

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    // Send to each subscription
    // Note: In production, you would use the web-push library with VAPID keys
    // For now, we'll use the native fetch API with the Push API format
    for (const sub of subscriptions) {
      try {
        // The push service endpoint expects a specific format
        // This is a simplified version - full implementation requires VAPID signing
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400', // 24 hours
          },
          body: pushPayload,
        });

        if (response.ok || response.status === 201) {
          successCount++;
          console.log(`Push sent successfully to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired or invalid - remove it
          console.log(`Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          failedEndpoints.push(sub.endpoint);
          failCount++;
        } else {
          console.error(`Push failed with status ${response.status} for endpoint: ${sub.endpoint.substring(0, 50)}...`);
          failCount++;
        }
      } catch (error) {
        console.error(`Push error for endpoint ${sub.endpoint.substring(0, 50)}...:`, error);
        failCount++;
      }
    }

    console.log(`Push notification results: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        total_subscriptions: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
