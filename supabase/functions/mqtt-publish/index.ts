// MQTT Publish Bridge - Cloud → ESP32 commands via HiveMQ Cloud
// Uses MQTT over secure WebSocket (port 8884) — works with HiveMQ Serverless Free tier
//
// Connect → publish → disconnect per call (serverless-friendly).

import mqtt from "npm:mqtt@5.10.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  device_token_id?: string;
  topic?: string;
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

  const host = broker
    .replace(/^mqtts?:\/\//, "")
    .replace(/^wss?:\/\//, "")
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .replace(/\/.*$/, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── AuthN: a valid user JWT is required (no anonymous command injection) ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const jwt = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
  const userId = claimsData?.claims?.sub as string | undefined;
  if (claimsErr || !userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: PublishRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.payload) {
    return json({ error: "payload required" }, 400);
  }

  // Arbitrary topic publishing is not allowed — the topic is always derived
  // from a device the caller provably has access to.
  const device_token_id = body.device_token_id ?? null;
  if (!device_token_id) {
    return json({ error: "device_token_id required" }, 400);
  }

  const { data: tok } = await supabase
    .from("device_tokens")
    .select("mqtt_topic_prefix, farm_id, mqtt_enabled")
    .eq("id", device_token_id)
    .maybeSingle();

  if (!tok) return json({ error: "device_token not found" }, 404);
  if (!tok.mqtt_enabled) return json({ error: "MQTT not enabled for device" }, 400);

  const farm_id: string | null = tok.farm_id;

  // ── AuthZ: caller must have access to the device's farm ──
  const { data: canAccess } = await supabase.rpc("user_can_access_farm", {
    _user_id: userId,
    _farm_id: farm_id,
  });
  if (!canAccess) {
    await supabase.rpc("log_security_event", {
      _event_type: "mqtt_publish_denied",
      _user_id: userId,
      _farm_id: farm_id,
      _device_token_id: device_token_id,
      _success: false,
      _details: { reason: "no_farm_access" },
    }).then(() => {}, () => {});
    return json({ error: "Forbidden" }, 403);
  }

  const topic = `${tok.mqtt_topic_prefix}/cmd`;


  const payloadStr =
    typeof body.payload === "string"
      ? body.payload
      : JSON.stringify(body.payload);

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

  // Connect via secure WebSocket on port 8884 (HiveMQ Cloud Serverless)
  const wsUrl = `wss://${host}:8884/mqtt`;

  try {
    await publishOnce(wsUrl, username, password, topic, payloadStr, body.qos ?? 1, body.retain ?? false);
    await supabase
      .from("mqtt_message_log")
      .update({ status: "sent" })
      .eq("id", logRow?.id);
    return json({ success: true, topic, log_id: logRow?.id });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("mqtt_message_log")
      .update({ status: "failed", error: errMsg })
      .eq("id", logRow?.id);
    return json({ error: "Publish failed", detail: errMsg }, 502);
  }
});

function publishOnce(
  url: string,
  username: string,
  password: string,
  topic: string,
  payload: string,
  qos: 0 | 1 | 2,
  retain: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      username,
      password,
      clientId: `farmeye-bridge-${Math.random().toString(16).slice(2, 10)}`,
      connectTimeout: 8000,
      reconnectPeriod: 0,
      clean: true,
      protocolVersion: 5,
    });

    const timer = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connect timeout (8s)"));
    }, 9000);

    client.on("connect", () => {
      client.publish(topic, payload, { qos, retain }, (err) => {
        clearTimeout(timer);
        client.end(true, {}, () => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      client.end(true);
      reject(err);
    });
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
