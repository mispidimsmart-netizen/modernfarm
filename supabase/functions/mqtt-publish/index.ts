// MQTT Publish Bridge - Cloud → ESP32 commands via HiveMQ Cloud REST API
// Called by:
//   1. DB trigger (auto-publish device_commands)
//   2. Direct invoke from frontend (test / ad-hoc publish)
//
// HiveMQ Cloud REST API: https://docs.hivemq.com/hivemq-cloud/rest-api.html
//   POST https://<cluster>/api/v1/mqtt/publish
//   Auth: Basic <username:password>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  device_token_id?: string;
  topic?: string; // override (optional)
  payload: Record<string, unknown> | string;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  command_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const broker = Deno.env.get("MQTT_BROKER_URL");
  const username = Deno.env.get("MQTT_USERNAME");
  const password = Deno.env.get("MQTT_PASSWORD");

  if (!broker || !username || !password) {
    return json({ error: "MQTT broker not configured" }, 500);
  }

  // Strip protocol/port if user pasted full URL
  const host = broker
    .replace(/^mqtts?:\/\//, "")
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .replace(/\/$/, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: PublishRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.payload) {
    return json({ error: "payload required" }, 400);
  }

  // Resolve topic
  let topic = body.topic;
  let farm_id: string | null = null;
  let device_token_id = body.device_token_id ?? null;

  if (!topic && device_token_id) {
    const { data: tok } = await supabase
      .from("device_tokens")
      .select("mqtt_topic_prefix, farm_id, mqtt_enabled")
      .eq("id", device_token_id)
      .maybeSingle();

    if (!tok) return json({ error: "device_token not found" }, 404);
    if (!tok.mqtt_enabled) return json({ error: "MQTT not enabled for device" }, 400);
    topic = `${tok.mqtt_topic_prefix}/cmd`;
    farm_id = tok.farm_id;
  }

  if (!topic) return json({ error: "topic or device_token_id required" }, 400);

  const payloadStr =
    typeof body.payload === "string"
      ? body.payload
      : JSON.stringify(body.payload);

  // Insert log entry (pending)
  const { data: logRow } = await supabase
    .from("mqtt_message_log")
    .insert({
      farm_id,
      device_token_id,
      direction: "publish",
      topic,
      payload: typeof body.payload === "object" ? body.payload : { raw: body.payload },
      status: "pending",
      qos: body.qos ?? 1,
      command_id: body.command_id ?? null,
    })
    .select("id")
    .single();

  // Publish via HiveMQ Cloud REST API
  // Note: HiveMQ Cloud Serverless free tier exposes REST on port 8443
  const restUrl = `https://${host}:8443/api/v1/mqtt/publish`;
  const auth = btoa(`${username}:${password}`);

  let mqttResp: Response;
  try {
    mqttResp = await fetch(restUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        topic,
        payload: payloadStr,
        qos: body.qos ?? 1,
        retain: body.retain ?? false,
      }),
    });
  } catch (e) {
    await supabase
      .from("mqtt_message_log")
      .update({ status: "failed", error: String(e) })
      .eq("id", logRow?.id);
    return json({ error: "Broker unreachable", detail: String(e) }, 502);
  }

  if (!mqttResp.ok) {
    const errText = await mqttResp.text();
    await supabase
      .from("mqtt_message_log")
      .update({ status: "failed", error: `${mqttResp.status} ${errText}` })
      .eq("id", logRow?.id);
    return json(
      { error: "Publish failed", status: mqttResp.status, detail: errText },
      502,
    );
  }

  await supabase
    .from("mqtt_message_log")
    .update({ status: "sent" })
    .eq("id", logRow?.id);

  return json({ success: true, topic, log_id: logRow?.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
