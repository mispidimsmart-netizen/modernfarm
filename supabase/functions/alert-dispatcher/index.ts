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
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? SERVICE_ROLE;
const CRON_SECRET = Deno.env.get("ALERT_DISPATCHER_CRON_SECRET") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY") ?? "";
const TWILIO_FROM_SMS = Deno.env.get("TWILIO_FROM_SMS") ?? "";
const TWILIO_FROM_WHATSAPP = Deno.env.get("TWILIO_FROM_WHATSAPP") ?? "";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

type ChannelStatus =
  | "queued" | "sent" | "failed" | "skipped_quiet"
  | "skipped_cooldown" | "skipped_disabled";

function normalizeSeverity(value: unknown): "critical" | "warning" {
  const severity = String(value ?? "").toLowerCase();
  return severity === "danger" || severity === "critical" || severity === "high"
    ? "critical"
    : "warning";
}

function isInQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const cur = `${hh}:${mm}`;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end; // wrap around midnight
}

async function claimDelivery(
  supa: any,
  alertId: string,
  farmId: string,
  channel: string,
  deliveryKey: string,
): Promise<string | null> {
  const { data, error } = await supa.rpc("claim_v8_alert_delivery", {
    p_alert_id: alertId,
    p_farm_id: farmId,
    p_channel: channel,
    p_delivery_key: deliveryKey,
    p_is_escalation: false,
  });
  // A claim failure is fail-closed: sending without a durable claim would
  // reintroduce duplicate sends during a cron race. SMS/WhatsApp claims can
  // be reclaimed after their lease only because the provider request carries
  // a stable delivery key; Web Push remains terminal after ambiguity.
  if (error || typeof data !== "string") return null;
  return data;
}

async function completeDelivery(
  supa: any,
  deliveryKey: string,
  claimToken: string,
  status: ChannelStatus,
  recipient?: string | null,
  providerMessageId?: string | null,
  errorMessage?: string | null,
) {
  await supa.rpc("complete_v8_alert_delivery", {
    p_delivery_key: deliveryKey,
    p_claim_token: claimToken,
    p_status: status,
    p_recipient: recipient ?? null,
    p_provider_message_id: providerMessageId ?? null,
    p_error_message: errorMessage ?? null,
  });
}

async function releaseDelivery(
  supa: any,
  deliveryKey: string,
  claimToken: string,
): Promise<boolean> {
  const { data, error } = await supa.rpc("release_v8_alert_delivery_claim", {
    p_delivery_key: deliveryKey,
    p_claim_token: claimToken,
  });
  return !error && data === true;
}

async function sendTwilio(
  to: string,
  body: string,
  from: string,
  isWhatsApp = false,
): Promise<{ ok: boolean; sid?: string; error?: string; beforeSubmit?: boolean }> {
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    return { ok: false, error: "Twilio not configured", beforeSubmit: true };
  }
  if (!from) {
    return {
      ok: false,
      error: `Missing TWILIO_FROM_${isWhatsApp ? "WHATSAPP" : "SMS"}`,
      beforeSubmit: true,
    };
  }

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
  const startedAt = Date.now();

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const isServiceCall = bearer.length > 0 && bearer === SERVICE_ROLE;
  const isCronCall =
    CRON_SECRET.length > 0 &&
    req.headers.get("x-alert-dispatcher-cron-secret") === CRON_SECRET;
  let callerUserId: string | null = null;

  // Cron/service authentication is intentionally separate from frontend
  // authentication. A user JWT must never be accepted as a service caller.
  if (!isServiceCall && !isCronCall) {
    if (!bearer) {
      return new Response(JSON.stringify({ ok: false, error: "authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await callerClient.auth.getUser(bearer);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ ok: false, error: "invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    callerUserId = authData.user.id;
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Resend mode: { alert_id } in body bypasses evaluation + dedupe for that alert.
  let resendAlertId: string | null = null;
  const resendRequestId = crypto.randomUUID();
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body && typeof body.alert_id === "string") resendAlertId = body.alert_id;
    } catch (_) { /* no body — cron call */ }
  }

  // Authenticated frontend callers may only resend an existing alert. Rule
  // evaluation and all other service-role work are service/cron-only.
  if (!resendAlertId && callerUserId) {
    return new Response(JSON.stringify({ ok: false, error: "service caller required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let evalCount = 0;
  let pending: any[] = [];

  if (resendAlertId) {
    if (!callerUserId && !isServiceCall && !isCronCall) {
      return new Response(JSON.stringify({ ok: false, error: "authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error: alertError } = await supa
      .from("alerts")
      .select("id, farm_id, user_id, severity, message_bn, message, rule_id, alert_type, farms!inner(owner_id)")
      .eq("id", resendAlertId)
      .maybeSingle();
    if (alertError) {
      return new Response(JSON.stringify({ ok: false, error: "alert lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "alert not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (callerUserId) {
      const { data: canManage } = await supa.rpc("can_manage_farm", {
        _user_id: callerUserId,
        _farm_id: data.farm_id,
      });
      const { data: superAdmin } = await supa.rpc("is_super_admin", { _user_id: callerUserId });
      if (canManage !== true && superAdmin !== true) {
        return new Response(JSON.stringify({ ok: false, error: "resend not authorized for this farm" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    pending = [data];
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

    // 2. Pick recent alerts; each channel is claimed independently below.
    // Bound each farm independently so one noisy tenant cannot starve every
    // other farm's life-safety notifications from the cron delivery window.
    const recentCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const perFarm = await Promise.all(farmIds.filter(Boolean).map(async (farmId) => {
      const { data } = await supa
        .from("alerts")
        .select("id, farm_id, user_id, severity, message_bn, message, rule_id, alert_type, created_at")
        .eq("farm_id", farmId)
        .gte("created_at", recentCutoff)
        .order("created_at", { ascending: true })
        .limit(25);
      return data ?? [];
    }));
    pending = perFarm.flat().sort((a, b) =>
      String(a.created_at).localeCompare(String(b.created_at))
    );
  }

  let dispatched = 0;
  for (const a of pending) {
    if (!a.farm_id) continue;
    // Load rule + config
    const { data: rule } = a.rule_id
      ? await supa.from("alert_rules").select("*").eq("id", a.rule_id).maybeSingle()
      : { data: null };
    const { data: cfg } = await supa
      .from("alert_channel_config").select("*").eq("farm_id", a.farm_id).maybeSingle();

    const channels = rule?.channels ?? { push: true, in_app: true, sms: false, whatsapp: false };
    const quiet = isInQuietHours(cfg?.quiet_hours_start, cfg?.quiet_hours_end);
    const normalizedSeverity = normalizeSeverity(a.severity);
    const isCritical = normalizedSeverity === "critical";
    const bypassQuiet = isCritical && (cfg?.critical_bypass_quiet_hours ?? true);

    // Per-user preference helper
    const checkUserPref = async (channel: "push" | "sms" | "whatsapp"): Promise<boolean> => {
      const { data, error } = await supa.rpc("should_deliver_notification", {
        _user_id: a.user_id,
        _farm_id: a.farm_id,
        _severity: normalizedSeverity,
        _channel: channel,
      });
      if (error) return true; // fail-open: don't lose alerts on RPC error
      return data === true;
    };

    const deliver = async (
      channel: "push" | "sms" | "whatsapp" | "in_app",
      recipient: string | null,
      operation: (deliveryKey: string) => Promise<{
        status: ChannelStatus;
        providerMessageId?: string | null;
        errorMessage?: string | null;
        releaseBeforeSubmit?: boolean;
      }>,
    ): Promise<boolean> => {
      const deliveryKey = resendAlertId
        ? `v8:resend:${a.id}:${channel}:${resendRequestId}`
        : `v8:auto:${a.id}:${channel}`;
      const claimToken = await claimDelivery(supa, a.id, a.farm_id, channel, deliveryKey);
      if (!claimToken) {
        return false;
      }
      const result = await operation(deliveryKey);
      if (result.releaseBeforeSubmit) {
        await releaseDelivery(supa, deliveryKey, claimToken);
        return true;
      }
      await completeDelivery(
        supa,
        deliveryKey,
        claimToken,
        result.status,
        recipient,
        result.providerMessageId,
        result.errorMessage,
      );
      return true;
    };

    // in_app is implicit (alert row exists → realtime delivers)
    await deliver("in_app", null, async () => ({ status: "sent" }));

    // Push
    if (channels.push && (cfg?.push_enabled ?? true)) {
      if (quiet && !bypassQuiet) {
        await deliver("push", null, async () => ({ status: "skipped_quiet" }));
      } else if (!(await checkUserPref("push"))) {
        await deliver("push", null, async () => ({ status: "skipped_disabled" }));
      } else {
        await deliver("push", null, async () => {
          const r = await sendPush(a.user_id, a.id,
          isCritical ? "🚨 জরুরি সতর্কতা" : "⚠️ সতর্কতা",
            a.message_bn || a.message, normalizedSeverity);
          return {
            status: r.ok ? "sent" : "failed",
            errorMessage: r.error ?? null,
          };
        });
      }
    }

    // SMS
    if (channels.sms && cfg?.sms_enabled && cfg?.phone_e164) {
      if (quiet && !bypassQuiet) {
        await deliver("sms", cfg.phone_e164, async () => ({ status: "skipped_quiet" }));
      } else if (!(await checkUserPref("sms"))) {
        await deliver("sms", cfg.phone_e164, async () => ({ status: "skipped_disabled" }));
      } else if (cfg?.sms_optin_status === "opted_out") {
        await deliver("sms", cfg.phone_e164, async () => ({ status: "skipped_disabled" }));
      } else {
        await deliver("sms", cfg.phone_e164, async () => {
          const smsBody = `${a.message_bn || a.message}\n\nবন্ধ: STOP | স্বীকার: ACK`;
          const r = await sendTwilio(cfg.phone_e164, smsBody, TWILIO_FROM_SMS, false);
          return {
            status: r.ok ? "sent" : "failed",
            providerMessageId: r.sid ?? null,
            errorMessage: r.error ?? null,
            releaseBeforeSubmit: r.beforeSubmit === true,
          };
        });
      }
    }

    // WhatsApp — prefer dedicated whatsapp_number, fall back to phone_e164
    const waNumber = cfg?.whatsapp_number || cfg?.phone_e164;
    if (channels.whatsapp && cfg?.whatsapp_enabled && waNumber) {
      if (quiet && !bypassQuiet) {
        await deliver("whatsapp", waNumber, async () => ({ status: "skipped_quiet" }));
      } else if (!(await checkUserPref("whatsapp"))) {
        await deliver("whatsapp", waNumber, async () => ({ status: "skipped_disabled" }));
      } else if (cfg?.whatsapp_optin_status === "opted_out") {
        await deliver("whatsapp", waNumber, async () => ({ status: "skipped_disabled" }));
      } else {
        await deliver("whatsapp", waNumber, async () => {
          const sevIcon = isCritical ? "🚨" : "ℹ️";
          const waBody = `${sevIcon} *Farmeye সতর্কতা*\n\n${a.message_bn || a.message}\n\n_স্বীকার করতে ACK, বন্ধ করতে STOP লিখে পাঠান।_`;
          const r = await sendTwilio(waNumber, waBody, TWILIO_FROM_WHATSAPP, true);
          return {
            status: r.ok ? "sent" : "failed",
            providerMessageId: r.sid ?? null,
            errorMessage: r.error ?? null,
            releaseBeforeSubmit: r.beforeSubmit === true,
          };
        });
      }
    }
    dispatched++;
  }

  return new Response(JSON.stringify({
    ok: true, evaluated: evalCount, dispatched, duration_ms: Date.now() - startedAt,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
