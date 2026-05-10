// Digest Notifications — runs every hour (pg_cron).
// For each farm whose alert_channel_config has digest_mode != 'instant',
// roll up qualifying alerts since last digest into a single push (and SMS/WhatsApp
// where enabled and not in quiet hours).

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

const SEV_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function isInQuietHours(start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const now = new Date();
  const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

async function sendTwilio(to: string, body: string, from: string, isWhatsApp: boolean) {
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !from) return { ok: false, error: "twilio_not_configured" };
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

async function sendPush(supa: any, user_id: string, title: string, body: string) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id, title, body, severity: "info", url: "/alerts" }),
    });
    return { ok: r.ok };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const startedAt = Date.now();

  // Pick farms with non-instant digest mode
  const { data: configs } = await supa
    .from("alert_channel_config")
    .select("*")
    .neq("digest_mode", "instant");

  let processed = 0;
  let dispatched = 0;

  for (const cfg of configs ?? []) {
    const mode = cfg.digest_mode as "hourly" | "daily";
    const minSev = (cfg.digest_min_severity as string) ?? "low";
    const minRank = SEV_RANK[minSev] ?? 1;

    // Find owner user_id (used for push)
    const { data: farm } = await supa
      .from("farms").select("owner_id").eq("id", cfg.farm_id).maybeSingle();
    const ownerId = farm?.owner_id;
    if (!ownerId) continue;

    // Determine last_digest_at per channel
    const { data: states } = await supa
      .from("notification_digest_state")
      .select("*").eq("farm_id", cfg.farm_id);
    const stateByCh: Record<string, any> = {};
    (states ?? []).forEach((s: any) => { stateByCh[s.channel] = s; });

    const channels: Array<"push" | "sms" | "whatsapp"> = [];
    if (cfg.push_enabled) channels.push("push");
    if (cfg.sms_enabled && cfg.phone_e164) channels.push("sms");
    if (cfg.whatsapp_enabled && (cfg.whatsapp_number || cfg.phone_e164)) channels.push("whatsapp");

    const quiet = isInQuietHours(cfg.quiet_hours_start, cfg.quiet_hours_end);

    for (const ch of channels) {
      const last = stateByCh[ch]?.last_digest_at ?? null;
      const minIntervalMs = mode === "hourly" ? 55 * 60_000 : 23 * 60 * 60_000;
      if (last && Date.now() - new Date(last).getTime() < minIntervalMs) continue;

      // Aggregate alerts since last digest (or last 24h if first time)
      const since = last ?? new Date(Date.now() - 24 * 60 * 60_000).toISOString();
      const { data: alerts } = await supa
        .from("alerts")
        .select("id, severity, message_bn, message, alert_type, created_at")
        .eq("farm_id", cfg.farm_id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      const filtered = (alerts ?? []).filter(
        (a: any) => (SEV_RANK[a.severity] ?? 1) >= minRank,
      );

      if (filtered.length === 0) {
        // Update state to throttle next attempt
        await supa.from("notification_digest_state").upsert(
          { farm_id: cfg.farm_id, channel: ch, last_digest_at: new Date().toISOString(), last_digest_alert_count: 0 },
          { onConflict: "farm_id,channel" },
        );
        continue;
      }

      // Skip non-push channels in quiet hours (push gets sent silently — user prefs row decides further)
      if (quiet && ch !== "push") continue;

      const counts: Record<string, number> = {};
      filtered.forEach((a: any) => { counts[a.severity] = (counts[a.severity] ?? 0) + 1; });
      const summary = Object.entries(counts)
        .map(([k, v]) => `${v} ${k}`).join(" • ");

      const top = filtered.slice(0, 3)
        .map((a: any) => `• ${a.message_bn || a.message}`)
        .join("\n");

      const title = `📊 ${filtered.length}টি সতর্কতা (গত ${mode === "hourly" ? "১ ঘণ্টায়" : "২৪ ঘণ্টায়"})`;
      const body = `${summary}\n\n${top}${filtered.length > 3 ? `\n…এবং আরও ${filtered.length - 3}টি` : ""}`;

      let result: { ok: boolean; sid?: string; error?: string } = { ok: false };
      let recipient: string | null = null;

      if (ch === "push") {
        result = await sendPush(supa, ownerId, title, body);
      } else if (ch === "sms") {
        recipient = cfg.phone_e164;
        result = await sendTwilio(recipient!, `${title}\n${body}`, TWILIO_FROM_SMS, false);
      } else if (ch === "whatsapp") {
        recipient = cfg.whatsapp_number || cfg.phone_e164;
        result = await sendTwilio(recipient!, `${title}\n${body}`, TWILIO_FROM_WHATSAPP, true);
      }

      // Log a single delivery row referencing the most recent alert (representative)
      await supa.from("alert_deliveries").insert({
        alert_id: filtered[0].id,
        farm_id: cfg.farm_id,
        channel: ch,
        status: result.ok ? "sent" : "failed",
        recipient,
        provider_message_id: result.sid ?? null,
        error_message: result.error ?? null,
        sent_at: result.ok ? new Date().toISOString() : null,
      });

      await supa.from("notification_digest_state").upsert(
        {
          farm_id: cfg.farm_id, channel: ch,
          last_digest_at: new Date().toISOString(),
          last_digest_alert_count: filtered.length,
        },
        { onConflict: "farm_id,channel" },
      );

      if (result.ok) dispatched++;
    }
    processed++;
  }

  return new Response(JSON.stringify({
    ok: true, processed, dispatched, duration_ms: Date.now() - startedAt,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
