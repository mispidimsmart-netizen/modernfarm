// Phase 4: Alert Dispatcher
// Cron: every 1 minute. Evaluates rules per farm, then dispatches unsent alerts
// across enabled channels (push / SMS / WhatsApp), respecting quiet hours and cooldown.

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
const TWILIO_FROM_WHATSAPP = Deno.env.get("TWILIO_FROM_WHATSAPP") ?? "";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

type ChannelStatus =
  | "queued" | "sent" | "failed" | "skipped_quiet"
  | "skipped_cooldown" | "skipped_disabled";

function isInQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const cur = `${hh}:${mm}`;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end; // wrap around midnight
}

async function logDelivery(
  supa: any,
  alert_id: string,
  farm_id: string | null,
  channel: string,
  status: ChannelStatus,
  recipient?: string | null,
  provider_message_id?: string | null,
  error_message?: string | null,
  is_escalation = false,
) {
  await supa.from("alert_deliveries").insert({
    alert_id, farm_id, channel, status, recipient,
    provider_message_id, error_message, is_escalation,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}

async function sendTwilio(
  to: string,
  body: string,
  from: string,
  isWhatsApp = false,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    return { ok: false, error: "Twilio not configured" };
  }
  if (!from) return { ok: false, error: `Missing TWILIO_FROM_${isWhatsApp ? "WHATSAPP" : "SMS"}` };

  const params = new URLSearchParams({
    To: isWhatsApp ? `whatsapp:${to}` : to,
    From: isWhatsApp ? `whatsapp:${from}` : from,
    Body: body,
  });
  try {
    const r = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: `[${r.status}] ${JSON.stringify(data)}` };
    return { ok: true, sid: data.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

async function sendPush(
  supa: any,
  user_id: string,
  alert_id: string,
  title: string,
  body: string,
  severity: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id, title, body, alert_id,
        severity: severity === "critical" ? "danger" : severity,
      }),
    });
    if (!r.ok) return { ok: false, error: `push fn ${r.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();

  // Resend mode: { alert_id } in body bypasses evaluation + dedupe for that alert.
  let resendAlertId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body && typeof body.alert_id === "string") resendAlertId = body.alert_id;
    } catch (_) { /* no body — cron call */ }
  }

  let evalCount = 0;
  let pending: any[] = [];

  if (resendAlertId) {
    const { data } = await supa
      .from("alerts")
      .select("id, farm_id, user_id, severity, message_bn, message, rule_id, alert_type")
      .eq("id", resendAlertId)
      .maybeSingle();
    if (data) pending = [data];
  } else {
    // 1. Evaluate rules for every farm that has rules enabled
    const { data: farms } = await supa
      .from("alert_rules")
      .select("farm_id")
      .eq("enabled", true);
    const farmIds = Array.from(new Set((farms ?? []).map((r: any) => r.farm_id)));
    for (const fid of farmIds) {
      const { data, error } = await supa.rpc("evaluate_alert_rules", { _farm_id: fid });
      if (!error && typeof data === "number") evalCount += data;
    }

    // 2. Pick alerts that have NO delivery rows yet (treat as freshly created)
    const { data: p } = await supa
      .from("alerts")
      .select("id, farm_id, user_id, severity, message_bn, message, rule_id, alert_type")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(100);
    pending = p ?? [];
  }

  let dispatched = 0;
  for (const a of pending) {
    if (!resendAlertId) {
      // Skip if any delivery already attempted for this alert
      const { count } = await supa
        .from("alert_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("alert_id", a.id);
      if ((count ?? 0) > 0) continue;
    }

    // Load rule + config
    const { data: rule } = a.rule_id
      ? await supa.from("alert_rules").select("*").eq("id", a.rule_id).maybeSingle()
      : { data: null };
    const { data: cfg } = await supa
      .from("alert_channel_config").select("*").eq("farm_id", a.farm_id).maybeSingle();

    const channels = rule?.channels ?? { push: true, in_app: true, sms: false, whatsapp: false };
    const quiet = isInQuietHours(cfg?.quiet_hours_start, cfg?.quiet_hours_end);
    const isCritical = a.severity === "critical";
    const bypassQuiet = isCritical && (cfg?.critical_bypass_quiet_hours ?? true);

    // Per-user preference helper
    const checkUserPref = async (channel: "push" | "sms" | "whatsapp"): Promise<boolean> => {
      const { data, error } = await supa.rpc("should_deliver_notification", {
        _user_id: a.user_id,
        _farm_id: a.farm_id,
        _severity: a.severity,
        _channel: channel,
      });
      if (error) return true; // fail-open: don't lose alerts on RPC error
      return data === true;
    };

    // in_app is implicit (alert row exists → realtime delivers)
    await logDelivery(supa, a.id, a.farm_id, "in_app", "sent");

    // Push
    if (channels.push && (cfg?.push_enabled ?? true)) {
      if (quiet && !bypassQuiet) {
        await logDelivery(supa, a.id, a.farm_id, "push", "skipped_quiet");
      } else if (!(await checkUserPref("push"))) {
        await logDelivery(supa, a.id, a.farm_id, "push", "skipped_disabled");
      } else {
        const r = await sendPush(supa, a.user_id, a.id,
          isCritical ? "🚨 জরুরি সতর্কতা" : "⚠️ সতর্কতা",
          a.message_bn || a.message, a.severity);
        await logDelivery(supa, a.id, a.farm_id, "push",
          r.ok ? "sent" : "failed", null, null, r.error ?? null);
      }
    }

    // SMS
    if (channels.sms && cfg?.sms_enabled && cfg?.phone_e164) {
      if (quiet && !bypassQuiet) {
        await logDelivery(supa, a.id, a.farm_id, "sms", "skipped_quiet", cfg.phone_e164);
      } else if (!(await checkUserPref("sms"))) {
        await logDelivery(supa, a.id, a.farm_id, "sms", "skipped_disabled", cfg.phone_e164);
      } else if (cfg?.sms_optin_status === "opted_out") {
        await logDelivery(supa, a.id, a.farm_id, "sms", "skipped_optout", cfg.phone_e164);
      } else {
        const smsBody = `${a.message_bn || a.message}\n\nবন্ধ: STOP | স্বীকার: ACK`;
        const r = await sendTwilio(cfg.phone_e164, smsBody, TWILIO_FROM_SMS, false);
        await logDelivery(supa, a.id, a.farm_id, "sms",
          r.ok ? "sent" : "failed", cfg.phone_e164, r.sid ?? null, r.error ?? null);
      }
    }

    // WhatsApp — prefer dedicated whatsapp_number, fall back to phone_e164
    const waNumber = cfg?.whatsapp_number || cfg?.phone_e164;
    if (channels.whatsapp && cfg?.whatsapp_enabled && waNumber) {
      if (quiet && !bypassQuiet) {
        await logDelivery(supa, a.id, a.farm_id, "whatsapp", "skipped_quiet", waNumber);
      } else if (!(await checkUserPref("whatsapp"))) {
        await logDelivery(supa, a.id, a.farm_id, "whatsapp", "skipped_disabled", waNumber);
      } else if (cfg?.whatsapp_optin_status === "opted_out") {
        await logDelivery(supa, a.id, a.farm_id, "whatsapp", "skipped_optout", waNumber);
      } else {
        const sevIcon = isCritical ? "🚨" : a.severity === "high" ? "⚠️" : "ℹ️";
        const waBody = `${sevIcon} *Farmeye সতর্কতা*\n\n${a.message_bn || a.message}\n\n_স্বীকার করতে ACK, বন্ধ করতে STOP লিখে পাঠান।_`;
        const r = await sendTwilio(waNumber, waBody, TWILIO_FROM_WHATSAPP, true);
        await logDelivery(supa, a.id, a.farm_id, "whatsapp",
          r.ok ? "sent" : "failed", waNumber, r.sid ?? null, r.error ?? null);
      }
    }
    dispatched++;
  }

  return new Response(JSON.stringify({
    ok: true, evaluated: evalCount, dispatched, duration_ms: Date.now() - startedAt,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
