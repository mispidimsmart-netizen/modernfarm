/**
 * Command delivery & acknowledgement handlers (ESP32 ⇄ Cloud).
 *
 * Contract notes:
 *  - Commands older than 5 minutes are auto-expired: a stale "fan_off" issued
 *    at noon must never execute at 3 AM.
 *  - Every dispatched command carries a `client_request_id` so the device can
 *    echo it back and the cloud can dedupe (at-least-once → exactly-once).
 *  - ACK v2 writes to `device_command_log` and mirrors the result onto the
 *    legacy `device_commands` rows.
 */
import { corsHeaders } from './http.ts';

export interface BoundDevice {
  device_name?: string | null;
  farm_id?: string | null;
  shed_id?: string | null;
}

export async function getDeviceCommands(
  supabase: any,
  userId: string,
  deviceName: string | null,
  boundDevice?: BoundDevice,
) {
  // device_name from a legacy query parameter is only a compatibility hint.
  // When token binding is available, always use the server-resolved binding.
  const authoritativeDeviceName = boundDevice ? boundDevice.device_name : deviceName;
  // Safety: only return commands fresher than 5 minutes.
  // Stale commands (e.g. from offline period) are dangerous: a "fan_off"
  // issued at noon must NOT execute at 3 AM when the bird needs warmth.
  const COMMAND_FRESHNESS_SECONDS = 5 * 60;
  const freshCutoff = new Date(Date.now() - COMMAND_FRESHNESS_SECONDS * 1000).toISOString();

  // Preferred path: atomic, lease-based claim in a single DB call. This makes
  // concurrent polls safe — a command is handed to exactly one poll per lease
  // window instead of being returned to every request between select & update.
  const COMMAND_LEASE_SECONDS = 20;
  const claim = await supabase.rpc('claim_device_commands', {
    _user_id: userId,
    _device_name: authoritativeDeviceName ?? null,
    _farm_id: boundDevice?.farm_id ?? null,
    _shed_id: boundDevice?.shed_id ?? null,
    _lease_seconds: COMMAND_LEASE_SECONDS,
    _freshness_seconds: COMMAND_FRESHNESS_SECONDS,
    _limit: 20,
  });

  let claimedCommands: any[] | null = null;
  if (claim.error) {
    console.error('claim_device_commands RPC failed, falling back to legacy path:', claim.error);
  } else {
    claimedCommands = claim.data || [];
  }

  let data: any[] | null = claimedCommands;

  if (claimedCommands === null) {
    // Legacy fallback (only when the claim RPC is unavailable).
    // Auto-expire stale pending commands so they don't keep being polled
    let staleQuery = supabase
      .from('device_commands')
      .update({ executed: true, executed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('executed', false)
      .lt('created_at', freshCutoff);
    if (authoritativeDeviceName) staleQuery = staleQuery.eq('device_name', authoritativeDeviceName);
    if (boundDevice?.farm_id) staleQuery = staleQuery.eq('farm_id', boundDevice.farm_id);
    // Include NULL shed_id rows for legacy V8 firmware; farm and authoritative
    // device_name filters still keep the command scoped to this device.
    if (boundDevice?.shed_id) staleQuery = staleQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
    await staleQuery;

    // Get pending (unexecuted) commands for this device — only fresh ones
    let query = supabase
      .from('device_commands')
      .select('id, farm_id, shed_id, command_type, command_value, created_at, client_request_id, dispatched_at, retry_count')
      .eq('user_id', userId)
      .eq('executed', false)
      .gte('created_at', freshCutoff)
      .order('created_at', { ascending: true });

    if (authoritativeDeviceName) {
      query = query.eq('device_name', authoritativeDeviceName);
    }
    if (boundDevice?.farm_id) query = query.eq('farm_id', boundDevice.farm_id);
    if (boundDevice?.shed_id) query = query.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);

    const { data: legacyData, error } = await query;

    if (error) {
      console.error('Error fetching device commands:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get commands', code: 'FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    data = legacyData;

    // Phase 3 idempotency: ensure each fetched command has a client_request_id
    // (so ESP32 can echo it back in ack to dedupe), and track dispatch lifecycle.
    const nowIso = new Date().toISOString();
    if (data && data.length > 0) {
      for (const cmd of data) {
        const updates: any = {};
        if (!cmd.client_request_id) {
          cmd.client_request_id = cmd.id;          // reuse row id as idempotency key
          updates.client_request_id = cmd.id;
        }
        if (!cmd.dispatched_at) {
          updates.dispatched_at = nowIso;
        } else {
          updates.retry_count = (cmd.retry_count || 0) + 1;
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('device_commands').update(updates).eq('id', cmd.id);
        }
      }
    }
  }

  // Also fetch matching command_ids from device_command_log for ACK protocol
  let logQuery = supabase
    .from('device_command_log')
    .select('command_id, client_request_id, command_type, command_value')
    .eq('user_id', userId)
    .in('status', ['pending', 'sent'])
    .order('created_at', { ascending: true });

  if (authoritativeDeviceName) {
    logQuery = logQuery.eq('device_name', authoritativeDeviceName);
  }
  if (boundDevice?.farm_id) logQuery = logQuery.eq('farm_id', boundDevice.farm_id);
  if (boundDevice?.shed_id) logQuery = logQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);

  const { data: logData } = await logQuery;

  // Mark pending log entries as 'sent'
  if (logData && logData.length > 0) {
    const pendingIds = logData.map((l: any) => l.command_id);
    await supabase
      .from('device_command_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('command_id', pendingIds)
      .eq('status', 'pending');
  }

  // Merge command_ids into response
  const commandsWithIds = (data || []).map((cmd: any) => {
    const match = (logData || []).find((l: any) => 
      (l.client_request_id && l.client_request_id === cmd.client_request_id) ||
      (!l.client_request_id && l.command_type === cmd.command_type && l.command_value === cmd.command_value)
    );
    return {
      ...cmd,
      command_id: match?.command_id || null,
    };
  });

  console.log(`Returning ${commandsWithIds.length} pending commands for device ${authoritativeDeviceName || 'all'}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      commands: commandsWithIds,
      device_id: authoritativeDeviceName,
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export async function acknowledgeCommands(
  body: { command_ids: string[] },
  supabase: any,
  userId: string,
  boundDevice?: BoundDevice,
) {
  if (!body.command_ids || !Array.isArray(body.command_ids) || body.command_ids.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing command_ids array', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let query = supabase
    .from('device_commands')
    .update({ 
      executed: true, 
      executed_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .in('id', body.command_ids);
  if (boundDevice?.device_name) query = query.eq('device_name', boundDevice.device_name);
  if (boundDevice?.farm_id) query = query.eq('farm_id', boundDevice.farm_id);
  if (boundDevice?.shed_id) query = query.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
  const { error } = await query;

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

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 COMMAND ACK PROTOCOL v2 HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /commands-ack-v2
 * Device sends ACK with command_id and execution result.
 * Body: { acks: [{ command_id: string, success: boolean, error?: string }] }
 */
export async function acknowledgeCommandsV2(
  body: { acks: { command_id?: string; client_request_id?: string; success: boolean; error?: string }[] },
  supabase: any,
  userId: string,
  boundDevice?: BoundDevice,
) {
  if (!body.acks || !Array.isArray(body.acks) || body.acks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing acks array', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let acked = 0;
  let failed = 0;

  for (const ack of body.acks) {
    if (!ack.command_id && !ack.client_request_id) {
      failed++;
      continue;
    }
    const status = ack.success ? 'acked' : 'failed';
    let logUpdate = supabase
      .from('device_command_log')
      .update({
        status,
        acked_at: new Date().toISOString(),
        error_message: ack.error || null,
      })
      .eq('user_id', userId);
    if (ack.client_request_id) {
      logUpdate = logUpdate.eq('client_request_id', ack.client_request_id);
    } else {
      logUpdate = logUpdate.eq('command_id', ack.command_id);
    }
    if (boundDevice?.device_name) logUpdate = logUpdate.eq('device_name', boundDevice.device_name);
    if (boundDevice?.farm_id) logUpdate = logUpdate.eq('farm_id', boundDevice.farm_id);
    if (boundDevice?.shed_id) logUpdate = logUpdate.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
    const { data: updatedLog, error } = await logUpdate.select('id');

    if (error || !updatedLog || updatedLog.length === 0) {
      console.error(`ACK error for ${ack.command_id}:`, error);
      failed++;
    } else {
      acked++;
    }

    // Also mark legacy device_commands as executed
    if (ack.success) {
      // Find matching command by type from the log
      let logLookup = supabase
        .from('device_command_log')
        .select('client_request_id, command_type, device_name, farm_id, shed_id')
        .eq('user_id', userId);
      if (ack.client_request_id) {
        logLookup = logLookup.eq('client_request_id', ack.client_request_id);
      } else {
        logLookup = logLookup.eq('command_id', ack.command_id);
      }
      if (boundDevice?.device_name) logLookup = logLookup.eq('device_name', boundDevice.device_name);
      if (boundDevice?.farm_id) logLookup = logLookup.eq('farm_id', boundDevice.farm_id);
      if (boundDevice?.shed_id) logLookup = logLookup.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
      const { data: logEntry } = await logLookup.maybeSingle();

      if (logEntry) {
        let legacyQuery = supabase
          .from('device_commands')
          .update({ executed: true, executed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('executed', false);
        if (logEntry.client_request_id) {
          legacyQuery = legacyQuery.eq('client_request_id', logEntry.client_request_id);
        } else {
          // Legacy rows did not carry the idempotency key. Keep the old
          // fallback narrow to the command id rather than all same-type rows.
          legacyQuery = legacyQuery.eq('id', ack.command_id);
        }
        legacyQuery = legacyQuery.eq('device_name', logEntry.device_name);
        if (logEntry.farm_id) legacyQuery = legacyQuery.eq('farm_id', logEntry.farm_id);
        if (logEntry.shed_id) legacyQuery = legacyQuery.or(`shed_id.eq.${logEntry.shed_id},shed_id.is.null`);
        await legacyQuery;
      }
    }
  }

  console.log(`ACK v2: ${acked} acked, ${failed} failed`);

  return new Response(
    JSON.stringify({ success: true, acked, failed }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * GET /command-status?command_id=CMD_xxx
 * Check delivery status of a specific command.
 */
export async function getCommandStatus(
  supabase: any,
  userId: string,
  commandId: string | null,
  boundDevice?: BoundDevice,
) {
  if (!commandId) {
    // Return all recent commands (last 50)
    let query = supabase
      .from('device_command_log')
      .select('command_id, command_type, command_value, status, retry_count, created_at, sent_at, acked_at, error_message')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (boundDevice?.device_name) query = query.eq('device_name', boundDevice.device_name);
    if (boundDevice?.farm_id) query = query.eq('farm_id', boundDevice.farm_id);
    if (boundDevice?.shed_id) query = query.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
    const { data, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch command logs', code: 'FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, commands: data || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let query = supabase
    .from('device_command_log')
    .select('*')
    .eq('command_id', commandId)
    .eq('user_id', userId)
    .maybeSingle();
  if (boundDevice?.device_name) query = query.eq('device_name', boundDevice.device_name);
  if (boundDevice?.farm_id) query = query.eq('farm_id', boundDevice.farm_id);
  if (boundDevice?.shed_id) query = query.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
  const { data, error } = await query;

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: 'Command not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, command: data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * POST /command-retry
 * Cloud retries unacknowledged commands (no ACK within 5s, max 3 retries).
 * Auto-called by frontend or cron. Marks expired commands as 'expired'.
 */
export async function retryUnackedCommands(
  supabase: any,
  userId: string,
  boundDevice?: BoundDevice,
) {
  const now = new Date();
  const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();

  // Find commands that were sent > 5s ago and not yet acked
  let staleQuery = supabase
    .from('device_command_log')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'sent')
    .lt('sent_at', fiveSecondsAgo)
    .order('created_at', { ascending: true });
  if (boundDevice?.device_name) staleQuery = staleQuery.eq('device_name', boundDevice.device_name);
  if (boundDevice?.farm_id) staleQuery = staleQuery.eq('farm_id', boundDevice.farm_id);
  if (boundDevice?.shed_id) staleQuery = staleQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
  const { data: staleCommands, error } = await staleQuery;

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch stale commands', code: 'FETCH_FAILED' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let retried = 0;
  let expired = 0;

  for (const cmd of (staleCommands || [])) {
    if (cmd.retry_count >= cmd.max_retries) {
      // Max retries exceeded → mark expired
      let expireQuery = supabase
        .from('device_command_log')
        .update({ status: 'expired', expired_at: now.toISOString() })
        .eq('id', cmd.id);
      if (boundDevice?.device_name) expireQuery = expireQuery.eq('device_name', boundDevice.device_name);
      if (boundDevice?.farm_id) expireQuery = expireQuery.eq('farm_id', boundDevice.farm_id);
      if (boundDevice?.shed_id) expireQuery = expireQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
      await expireQuery;
      expired++;
    } else {
      // Retry the same physical row. Inserting with the same
      // client_request_id conflicts by design; re-queue the existing row
      // instead so the idempotency key remains stable.
      let commandQuery = supabase
        .from('device_commands')
        .update({ executed: false, executed_at: null, dispatched_at: null })
        .eq('user_id', userId)
        .eq('executed', false);
      if (cmd.client_request_id) {
        commandQuery = commandQuery.eq('client_request_id', cmd.client_request_id);
      } else {
        commandQuery = commandQuery.eq('id', cmd.command_id);
      }
      if (boundDevice?.device_name) commandQuery = commandQuery.eq('device_name', boundDevice.device_name);
      if (boundDevice?.farm_id) commandQuery = commandQuery.eq('farm_id', boundDevice.farm_id);
      if (boundDevice?.shed_id) commandQuery = commandQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
      const { error: commandError } = await commandQuery;
      if (commandError) continue;

      let logQuery = supabase
        .from('device_command_log')
        .update({ 
          retry_count: cmd.retry_count + 1,
          sent_at: now.toISOString(),
          status: 'sent',
        })
        .eq('id', cmd.id);
      if (boundDevice?.device_name) logQuery = logQuery.eq('device_name', boundDevice.device_name);
      if (boundDevice?.farm_id) logQuery = logQuery.eq('farm_id', boundDevice.farm_id);
      if (boundDevice?.shed_id) logQuery = logQuery.or(`shed_id.eq.${boundDevice.shed_id},shed_id.is.null`);
      await logQuery;
      retried++;
    }
  }

  console.log(`Command retry: ${retried} retried, ${expired} expired`);

  return new Response(
    JSON.stringify({ success: true, retried, expired }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
