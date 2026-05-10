// Phase 4: Alert Escalator
// Cron every 5 min: critical alerts unack'd longer than escalation_minutes
// → SMS to escalation_phone_e164, mark escalated_at.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY") ?? "";
const TWILIO_FROM_SMS = Deno.env.get("TWILIO_FROM_SMS") ?? "";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

async function sendSms(to: string, body: string) {
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_SMS) {
    return { ok: false, error: "twilio not configured" };
  }
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM_SMS, Body: body });
  const r = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    }, body: params,
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: `[${r.status}] ${JSON.stringify(data)}` };
  return { ok: true, sid: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Pull critical, unack'd, not-yet-escalated alerts
  const { data: alerts } = await supa
    .from("alerts")
    .select("id, farm_id, message_bn, message, created_at")
    .eq("severity", "critical")
    .is("acknowledged_at", null)
    .is("escalated_at", null)
    .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .limit(50);

  let escalated = 0;
  for (const a of alerts ?? []) {
    const { data: cfg } = await supa
      .from("alert_channel_config").select("*")
      .eq("farm_id", a.farm_id).maybeSingle();
    if (!cfg?.escalation_phone_e164) continue;
    const escMins = cfg.escalation_minutes ?? 15;
    if (Date.now() - new Date(a.created_at).getTime() < escMins * 60 * 1000) continue;

    const body = `🚨 ESCALATION: ${a.message_bn || a.message}`;
    const r = await sendSms(cfg.escalation_phone_e164, body);
    await supa.from("alert_deliveries").insert({
      alert_id: a.id, farm_id: a.farm_id, channel: "sms",
      status: r.ok ? "sent" : "failed",
      recipient: cfg.escalation_phone_e164,
      provider_message_id: r.sid ?? null, error_message: r.error ?? null,
      is_escalation: true, sent_at: r.ok ? new Date().toISOString() : null,
    });
    if (r.ok) {
      await supa.from("alerts").update({ escalated_at: new Date().toISOString() }).eq("id", a.id);
      escalated++;
    }
  }
  return new Response(JSON.stringify({ ok: true, escalated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
