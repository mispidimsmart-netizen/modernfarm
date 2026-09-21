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


  // Preferred path: atomic, lease-based claim in a single DB call. This makes
  // concurrent polls safe — a command is handed to exactly one poll per lease
  // window instead of being returned to every request between select & update.
  const COMMAND_LEASE_SECONDS = 20;
  // A token with no farm binding must never claim commands: the RPC treats a
  // NULL _farm_id as "any farm", which would leak another farm's relay commands.
  if (boundDevice && !boundDevice.farm_id) {
    console.warn('Unbound device token polled for commands — refusing (no farm binding)');
    return new Response(
      JSON.stringify({ commands: [], error: 'Device token has no farm binding', code: 'DEVICE_UNBOUND' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const claim = await supabase.rpc('claim_device_commands', {
    _user_id: userId,
    _device_name: authoritativeDeviceName ?? null,
    _farm_id: boundDevice?.farm_id ?? null,
    _shed_id: boundDevice?.shed_id ?? null,
    _lease_seconds: COMMAND_LEASE_SECONDS,
    _freshness_seconds: COMMAND_FRESHNESS_SECONDS,
    _limit: 20,
  });

  // No silent legacy fallback: if the atomic claim is unavailable we fail the
  // poll instead of degrading to the racy select-then-update path (which could
  // hand the same relay command to two concurrent polls).
  if (claim.error) {
    console.error('claim_device_commands RPC failed:', claim.error);
    return new Response(
      JSON.stringify({ error: 'Command claim unavailable', code: 'CLAIM_UNAVAILABLE' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const data: any[] | null = claim.data || [];


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
  if (boundDevice?.farm_id) {
    logQuery = logQuery.eq('farm_id', boundDevice.farm_id);
  } else {
    // Unbound legacy token: never hand it another farm's commands — restrict to
    // rows that are themselves farm-less.
    logQuery = logQuery.is('farm_id', null);
  }
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

/** Strict mode: reject ACKs that do not echo the lease token of the dispatch. */
const REQUIRE_COMMAND_LEASE = Deno.env.get('REQUIRE_COMMAND_LEASE') === 'true';

export interface AckLease {
  command_id: string;
  lease_token?: string | null;
  success?: boolean;
  error?: string | null;
}

/**
 * Close a single device_commands row through the authorization-checked RPC.
 * The lease token proves the ACK belongs to the dispatch the device received;
 * a failed execution is terminal so the relay is not toggled again by a
 * redelivery of the same command.
 */
async function completeCommand(
  supabase: any,
  userId: string,
  ack: AckLease,
  boundDevice?: BoundDevice,
): Promise<string> {
  const { data, error } = await supabase.rpc('complete_device_command', {
    _user_id: userId,
    _command_id: ack.command_id,
    _lease_token: ack.lease_token ?? null,
    _success: ack.success !== false,
    _error: ack.error ?? null,
    _device_name: boundDevice?.device_name ?? null,
    _farm_id: boundDevice?.farm_id ?? null,
    _require_lease: REQUIRE_COMMAND_LEASE,
  });
  if (error) {
    console.error('complete_device_command failed:', error);
    return 'RPC_ERROR';
  }
  const result = String(data ?? 'UNKNOWN');
  if (result !== 'OK') {
    console.warn(`ACK for command ${ack.command_id} → ${result}`);
  }
  return result;
}

export async function acknowledgeCommands(
  body: {
    command_ids?: string[];
    acks?: AckLease[];
    lease_tokens?: Record<string, string>;
  },
  supabase: any,
  userId: string,
  boundDevice?: BoundDevice,
) {
  // Preferred shape: acks[] carrying the lease token issued at dispatch.
  // Legacy firmware sends command_ids[] only (tolerated unless strict mode).
  const acks: AckLease[] = Array.isArray(body.acks) && body.acks.length > 0
    ? body.acks.filter((a) => a && typeof a.command_id === 'string')
    : (body.command_ids || []).map((id) => ({
      command_id: id,
      lease_token: body.lease_tokens?.[id] ?? null,
    }));

  if (acks.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing command_ids array', code: 'INVALID_DATA' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let acknowledged = 0;
  const rejected: { command_id: string; reason: string }[] = [];

  for (const ack of acks) {
    const result = await completeCommand(supabase, userId, ack, boundDevice);
    if (result === 'OK' || result === 'OK_NO_LEASE') acknowledged++;
    else rejected.push({ command_id: ack.command_id, reason: result });
  }

  console.log(`Acknowledged ${acknowledged} commands, ${rejected.length} rejected`);

  return new Response(
    JSON.stringify({ success: true, acknowledged, rejected }),
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

    // Mirror the outcome onto legacy device_commands. A FAILED execution is
    // closed too (with a reason) — leaving it pending let the device pick the
    // very same command up again within the freshness window and re-toggle
    // the relay.
    {
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
        const nowIso = new Date().toISOString();
        const mirror = ack.success
          ? { executed: true, executed_at: nowIso, lease_token: null, failed_at: null, failure_reason: null }
          : {
            executed: true,
            executed_at: nowIso,
            lease_token: null,
            failed_at: nowIso,
            failure_reason: ack.error || 'DEVICE_REPORTED_FAILURE',
          };
        let legacyQuery = supabase
          .from('device_commands')
          .update(mirror)
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
        .update({
          executed: false,
          executed_at: null,
          dispatched_at: null,
          lease_token: null,
          failed_at: null,
          failure_reason: null,
        })

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
