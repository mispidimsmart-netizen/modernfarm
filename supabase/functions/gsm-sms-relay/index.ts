// Phase 5: GSM SMS Relay
// ESP32 calls this when it reconnects to internet, to sync up
// inbound SMS commands it executed offline + outbound SMS it sent.
// Also accepts a single mesh sync log batch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface InboundSms {
  from_phone: string;
  body: string;
  parsed_command?: string;
  parsed_args?: Record<string, unknown>;
  authorized?: boolean;
  executed_at?: string;
  response_sent?: boolean;
  response_body?: string;
  received_at?: string;
}

interface OutboundSms {
  to_phone: string;
  body: string;
  alert_id?: string | null;
  delivered_at?: string;
  retry_count?: number;
  status?: "queued" | "sent" | "delivered" | "failed";
  error_message?: string;
}

interface MeshLog {
  to_device_id?: string | null;
  payload_type: "sensor" | "command" | "safety_state" | "heartbeat";
  bytes?: number;
  latency_ms?: number;
  success?: boolean;
  error_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("x-device-token");
    if (!token) {
      return new Response(JSON.stringify({ error: "missing x-device-token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve device by token
    const { data: device, error: dErr } = await supa
      .from("device_tokens")
      .select("id, farm_id")
      .eq("token", token)
      .maybeSingle();
    if (dErr || !device) {
      return new Response(JSON.stringify({ error: "invalid device token" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const inbound = (body.inbound ?? []) as InboundSms[];
    const outbound = (body.outbound ?? []) as OutboundSms[];
    const mesh = (body.mesh ?? []) as MeshLog[];

    let inserted_in = 0, inserted_out = 0, inserted_mesh = 0;

    if (inbound.length) {
      const rows = inbound.slice(0, 100).map(i => ({
        device_token_id: device.id,
        farm_id: device.farm_id,
        from_phone: String(i.from_phone || "").slice(0, 20),
        body: String(i.body || "").slice(0, 500),
        parsed_command: i.parsed_command ?? null,
        parsed_args: i.parsed_args ?? null,
        authorized: !!i.authorized,
        executed_at: i.executed_at ?? null,
        response_sent: !!i.response_sent,
        response_body: i.response_body ?? null,
        received_at: i.received_at ?? new Date().toISOString(),
      }));
      const { error } = await supa.from("gsm_inbound_sms").insert(rows);
      if (!error) inserted_in = rows.length;
    }

    if (outbound.length) {
      const rows = outbound.slice(0, 100).map(o => ({
        device_token_id: device.id,
        farm_id: device.farm_id,
        to_phone: String(o.to_phone || "").slice(0, 20),
        body: String(o.body || "").slice(0, 500),
        alert_id: o.alert_id ?? null,
        delivered_at: o.delivered_at ?? null,
        retry_count: o.retry_count ?? 0,
        status: o.status ?? "sent",
        error_message: o.error_message ?? null,
      }));
      const { error } = await supa.from("gsm_outbound_sms").insert(rows);
      if (!error) inserted_out = rows.length;
    }

    if (mesh.length) {
      const rows = mesh.slice(0, 200).map(m => ({
        farm_id: device.farm_id,
        from_device_id: device.id,
        to_device_id: m.to_device_id ?? null,
        payload_type: m.payload_type,
        bytes: m.bytes ?? 0,
        latency_ms: m.latency_ms ?? null,
        success: m.success !== false,
        error_message: m.error_message ?? null,
      }));
      const { error } = await supa.from("mesh_sync_log").insert(rows);
      if (!error) inserted_mesh = rows.length;
    }

    return new Response(JSON.stringify({
      ok: true, inserted_in, inserted_out, inserted_mesh,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
