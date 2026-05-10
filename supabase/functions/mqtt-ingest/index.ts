// MQTT Inbound Bridge - ESP32 → Cloud sensor/status data
// Connects with persistent session (cleanSession=false), drains queued messages, disconnects.
// HiveMQ Cloud Serverless retains QoS 1 messages while subscriber is offline.
//
// Topics consumed:
//   farm/<farm_id>/dev/<device_id>/sensor   { temperature, humidity, ammonia?, ts }
//   farm/<farm_id>/dev/<device_id>/status   { uptime_s, wifi_rssi, free_heap, online }
//
// Schedule via pg_cron every 1 minute.

import mqtt from "npm:mqtt@5.10.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DRAIN_SECONDS = 25; // edge function timeout safety

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

  const wsUrl = `wss://${host}:8884/mqtt`;
  const result = { sensor: 0, status: 0, log: 0, errors: 0 };

  try {
    await drainMessages(wsUrl, username, password, supabase, result);
  } catch (e) {
    return json({ error: String(e), partial: result }, 500);
  }

  return json({ success: true, ...result });
});

async function drainMessages(
  url: string,
  username: string,
  password: string,
  supabase: ReturnType<typeof createClient>,
  result: { sensor: number; status: number; log: number; errors: number },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      username,
      password,
      clientId: "farmeye-ingest-bridge", // stable → persistent session
      clean: false, // resume queued messages
      connectTimeout: 8000,
      reconnectPeriod: 0,
      protocolVersion: 5,
      properties: { sessionExpiryInterval: 3600 }, // 1h queue retention
    });

    const finish = (err?: Error) => {
      client.end(true, {}, () => {
        if (err) reject(err);
        else resolve();
      });
    };

    const timer = setTimeout(() => finish(), DRAIN_SECONDS * 1000);

    client.on("connect", () => {
      // Subscribe to all farm sensor + status topics
      client.subscribe("farm/+/dev/+/sensor", { qos: 1 });
      client.subscribe("farm/+/dev/+/status", { qos: 1 });
    });

    client.on("message", async (topic, payload) => {
      try {
        // farm/<farm_id>/dev/<device_id>/{sensor|status}
        const parts = topic.split("/");
        if (parts.length !== 5) return;
        const [, farmId, , deviceId, kind] = parts;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(payload.toString());
        } catch {
          result.errors++;
          return;
        }

        // Look up device_token to validate + get user_id, shed_id
        const { data: tok } = await supabase
          .from("device_tokens")
          .select("id, user_id, farm_id, shed_id, mqtt_enabled")
          .eq("id", deviceId)
          .maybeSingle();

        if (!tok || !tok.mqtt_enabled || tok.farm_id !== farmId) {
          result.errors++;
          return;
        }

        if (kind === "sensor") {
          const temperature = num(data.temperature);
          const humidity = num(data.humidity);
          const ammonia = num(data.ammonia);

          if (temperature == null && humidity == null) {
            result.errors++;
            return;
          }

          await supabase.from("sensor_readings").insert({
            user_id: tok.user_id,
            farm_id: tok.farm_id,
            shed_id: tok.shed_id,
            temperature,
            humidity,
            ammonia,
            recorded_at: new Date().toISOString(),
          });
          result.sensor++;
        } else if (kind === "status") {
          // Update device_health
          const online = data.online !== false;
          await supabase
            .from("device_health")
            .update({
              last_seen_at: new Date().toISOString(),
              wifi_signal_strength: num(data.wifi_rssi),
              free_memory_bytes: num(data.free_heap),
              uptime_seconds: num(data.uptime_s),
              is_online: online,
              updated_at: new Date().toISOString(),
            })
            .eq("device_token_id", tok.id);
          result.status++;
        }

        // Audit
        await supabase.from("mqtt_message_log").insert({
          farm_id: farmId,
          device_token_id: tok.id,
          direction: "inbound",
          topic,
          payload: data,
          status: "received",
          qos: 1,
        });
        result.log++;
      } catch (e) {
        console.error("[ingest] message err", e);
        result.errors++;
      }
    });

    client.on("error", (err) => {
      clearTimeout(timer);
      finish(err);
    });
  });
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
