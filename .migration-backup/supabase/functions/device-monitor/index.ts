// Device monitor: runs every minute via pg_cron
// 1. Marks devices offline if no heartbeat in 2 minutes
// 2. Expires stale device_commands (older than 5 minutes & not executed)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HEARTBEAT_TIMEOUT_SECONDS = 2 * 60; // 2 minutes
const COMMAND_FRESHNESS_SECONDS = 5 * 60; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const heartbeatCutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_SECONDS * 1000).toISOString();
  const commandCutoff = new Date(Date.now() - COMMAND_FRESHNESS_SECONDS * 1000).toISOString();

  const results = { devices_offlined: 0, commands_expired: 0, command_logs_expired: 0, errors: [] as string[] };

  try {
    // 1. Flip devices to offline if last_seen_at is too old
    const { data: staleDevices, error: devErr } = await supabase
      .from("device_health")
      .update({ is_online: false, updated_at: new Date().toISOString() })
      .eq("is_online", true)
      .lt("last_seen_at", heartbeatCutoff)
      .select("id");

    if (devErr) results.errors.push(`device_health: ${devErr.message}`);
    else results.devices_offlined = staleDevices?.length ?? 0;

    // 2. Mark stale device_commands as executed=true (so devices skip them) – they are too old to safely apply
    const { data: staleCmds, error: cmdErr } = await supabase
      .from("device_commands")
      .update({ executed: true, executed_at: new Date().toISOString() })
      .eq("executed", false)
      .lt("created_at", commandCutoff)
      .select("id");

    if (cmdErr) results.errors.push(`device_commands: ${cmdErr.message}`);
    else results.commands_expired = staleCmds?.length ?? 0;

    // 3. Mark related device_command_log entries as expired
    const { data: staleLogs, error: logErr } = await supabase
      .from("device_command_log")
      .update({ status: "expired", expired_at: new Date().toISOString() })
      .in("status", ["pending", "sent"])
      .lt("created_at", commandCutoff)
      .select("id");

    if (logErr) results.errors.push(`device_command_log: ${logErr.message}`);
    else results.command_logs_expired = staleLogs?.length ?? 0;

    console.log("[device-monitor]", results);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[device-monitor] error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
