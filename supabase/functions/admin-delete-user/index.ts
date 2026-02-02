import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserPayload {
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with the caller's token to verify they're a super admin
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is a super admin using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: superAdminCheck, error: superAdminError } = await adminClient
      .from('super_admins')
      .select('id')
      .eq('user_id', callerUser.id)
      .single();

    if (superAdminError || !superAdminCheck) {
      console.error('Super admin check failed:', superAdminError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user to delete from request body
    const payload: DeleteUserPayload = await req.json();
    
    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (payload.user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deletion of other super admins
    const { data: targetSuperAdmin } = await adminClient
      .from('super_admins')
      .select('id')
      .eq('user_id', payload.user_id)
      .single();

    if (targetSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete another super admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Super admin ${callerUser.id} is deleting user ${payload.user_id}`);

    // Delete user data from all related tables (in order to avoid foreign key issues)
    const tablesToClean = [
      'alerts',
      'automation_rules',
      'automation_rules_new',
      'daily_reports',
      'daily_summary',
      'device_commands',
      'device_control',
      'device_health',
      'device_status',
      'device_tokens',
      'egg_production',
      'expenses',
      'farm_settings',
      'feed_consumption',
      'feed_inventory',
      'flock_info',
      'income',
      'lighting_schedule',
      'mode_profiles',
      'mortality_records',
      'offline_sync_queue',
      'power_outage_logs',
      'power_outages',
      'push_subscriptions',
      'schedule_notifications',
      'schedules',
      'sensor_logs',
      'sensor_readings',
      'sheds',
      'sms_alert_settings',
      'sms_logs',
      'sms_phone_numbers',
      'user_roles',
      'water_trends',
      'weather_cache',
      'weather_settings',
      'profiles', // Delete profile last before auth user
    ];

    // Delete from each table
    for (const table of tablesToClean) {
      const { error: deleteError } = await adminClient
        .from(table)
        .delete()
        .eq('user_id', payload.user_id);

      if (deleteError) {
        console.log(`Note: Could not delete from ${table}:`, deleteError.message);
        // Continue anyway - some tables might not have data for this user
      }
    }

    // Also delete farms where user is owner
    const { error: farmsError } = await adminClient
      .from('farms')
      .delete()
      .eq('owner_id', payload.user_id);

    if (farmsError) {
      console.log('Note: Could not delete farms:', farmsError.message);
    }

    // Delete worker invitations created by this user
    const { error: invitationsError } = await adminClient
      .from('worker_invitations')
      .delete()
      .eq('farm_owner_id', payload.user_id);

    if (invitationsError) {
      console.log('Note: Could not delete worker invitations:', invitationsError.message);
    }

    // Finally, delete the auth user
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      payload.user_id
    );

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth: ' + authDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted user ${payload.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deleted_user_id: payload.user_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
