import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // For ESP32: Check for updates
    if (action === 'check') {
      const deviceToken = req.headers.get('x-device-token');
      const currentVersion = url.searchParams.get('version') || 'v0.0.0';
      const farmType = url.searchParams.get('farm_type') || 'all';

      if (!deviceToken) {
        return new Response(
          JSON.stringify({ error: 'Missing device token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate device token
      const { data: device, error: deviceError } = await supabase
        .from('device_tokens')
        .select('id, user_id')
        .eq('token', deviceToken)
        .eq('is_active', true)
        .single();

      if (deviceError || !device) {
        return new Response(
          JSON.stringify({ error: 'Invalid device token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get latest stable firmware
      const { data: firmware, error: firmwareError } = await supabase
        .from('ota_firmware')
        .select('*')
        .eq('is_active', true)
        .eq('is_stable', true)
        .or(`farm_type.eq.all,farm_type.eq.${farmType}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (firmwareError || !firmware) {
        return new Response(
          JSON.stringify({ update_available: false, message: 'No firmware available' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Compare versions
      const parseVersion = (v: string) => {
        const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
        if (!match) return [0, 0, 0];
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      };

      const current = parseVersion(currentVersion);
      const latest = parseVersion(firmware.version);
      
      const isNewer = latest[0] > current[0] || 
        (latest[0] === current[0] && latest[1] > current[1]) ||
        (latest[0] === current[0] && latest[1] === current[1] && latest[2] > current[2]);

      if (!isNewer) {
        // Update last check timestamp
        await supabase
          .from('device_health')
          .update({ ota_last_check_at: new Date().toISOString() })
          .eq('device_token_id', device.id);

        return new Response(
          JSON.stringify({ update_available: false, current_version: currentVersion }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update available
      await supabase
        .from('device_health')
        .update({ 
          ota_last_check_at: new Date().toISOString(),
          ota_version_available: firmware.version,
          ota_status: 'available'
        })
        .eq('device_token_id', device.id);

      console.log(`[OTA] Update available for device ${device.id}: ${currentVersion} -> ${firmware.version}`);

      return new Response(
        JSON.stringify({
          update_available: true,
          version: firmware.version,
          url: firmware.url,
          size: firmware.file_size_bytes,
          checksum: firmware.checksum,
          release_notes: firmware.release_notes
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For ESP32: Report update progress
    if (action === 'progress' && req.method === 'POST') {
      const deviceToken = req.headers.get('x-device-token');
      const body = await req.json();
      const { progress, status, version, error_message } = body;

      if (!deviceToken) {
        return new Response(
          JSON.stringify({ error: 'Missing device token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: device } = await supabase
        .from('device_tokens')
        .select('id, user_id')
        .eq('token', deviceToken)
        .eq('is_active', true)
        .single();

      if (!device) {
        return new Response(
          JSON.stringify({ error: 'Invalid device token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update device health
      await supabase
        .from('device_health')
        .update({
          ota_progress: progress,
          ota_status: status,
          ...(status === 'completed' && { firmware_version: version }),
        })
        .eq('device_token_id', device.id);

      // Update OTA history
      if (status === 'downloading' || status === 'installing') {
        await supabase
          .from('ota_update_history')
          .update({ status, started_at: new Date().toISOString() })
          .eq('device_token_id', device.id)
          .eq('status', 'pending');
      } else if (status === 'completed') {
        await supabase
          .from('ota_update_history')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            to_version: version
          })
          .eq('device_token_id', device.id)
          .is('completed_at', null);

        console.log(`[OTA] Update completed for device ${device.id}: ${version}`);
      } else if (status === 'failed') {
        await supabase
          .from('ota_update_history')
          .update({ 
            status: 'failed', 
            error_message,
            completed_at: new Date().toISOString()
          })
          .eq('device_token_id', device.id)
          .is('completed_at', null);

        console.log(`[OTA] Update failed for device ${device.id}: ${error_message}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Admin: Push update to specific device
    if (action === 'push' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { device_token_id, firmware_id } = body;

      // Get device and firmware info
      const [{ data: device }, { data: firmware }] = await Promise.all([
        supabase.from('device_tokens').select('*').eq('id', device_token_id).single(),
        supabase.from('ota_firmware').select('*').eq('id', firmware_id).single()
      ]);

      if (!device || !firmware) {
        return new Response(
          JSON.stringify({ error: 'Device or firmware not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current firmware version
      const { data: health } = await supabase
        .from('device_health')
        .select('firmware_version')
        .eq('device_token_id', device_token_id)
        .single();

      // Create OTA update history entry
      await supabase.from('ota_update_history').insert({
        user_id: user.id,
        device_token_id,
        firmware_id,
        from_version: health?.firmware_version || 'unknown',
        to_version: firmware.version,
        status: 'pending'
      });

      // Update device health to trigger update
      await supabase
        .from('device_health')
        .update({
          ota_version_available: firmware.version,
          ota_status: 'pending'
        })
        .eq('device_token_id', device_token_id);

      console.log(`[OTA] Update pushed to device ${device.device_name}: ${firmware.version}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Update pushed to device' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For Admin: List firmware
    if (action === 'list') {
      const { data: firmwares, error } = await supabase
        .from('ota_firmware')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ firmwares }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OTA] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
