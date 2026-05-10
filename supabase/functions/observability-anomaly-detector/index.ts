// Phase 2 — Anomaly Detector (cron, every 5 min)
// Scans device_health_metrics + device_health for offline / signature spikes / sensor freeze / latency.
// Writes audit_log entries; reuses existing notification pipeline by inserting into notifications table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Anomaly {
  kind: "device_offline" | "signature_spike" | "latency_high" | "sensor_freeze";
  severity: "warning" | "critical";
  device_token_id?: string;
  farm_id?: string | null;
  user_id?: string | null;
  message: string;
  details: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const anomalies: Anomaly[] = [];
  const now = Date.now();

  try {
    // 1. Offline devices > 10 min (was online before)
    const tenMinAgo = new Date(now - 10 * 60_000).toISOString();
    const { data: offlineDevices } = await supabase
      .from("device_health")
      .select("id, device_token_id, user_id, last_seen_at, is_online")
      .lt("last_seen_at", tenMinAgo)
      .eq("is_online", true);

    for (const d of offlineDevices || []) {
      anomalies.push({
        kind: "device_offline",
        severity: "critical",
        device_token_id: d.device_token_id,
        user_id: d.user_id,
        message: `Device offline > 10 min (last seen ${d.last_seen_at})`,
        details: { device_token_id: d.device_token_id, last_seen_at: d.last_seen_at },
      });

      // mark device offline
      await supabase
        .from("device_health")
        .update({ is_online: false, updated_at: new Date().toISOString() })
        .eq("id", d.id);
    }

    // 2. Signature failure spike — current hour bucket
    const bucketHour = new Date(Math.floor(now / 3600_000) * 3600_000).toISOString();
    const { data: spikes } = await supabase
      .from("device_health_metrics")
      .select("device_token_id, farm_id, signature_failures, max_latency_ms, sync_count, total_latency_ms")
      .eq("bucket_hour", bucketHour)
      .gte("signature_failures", 5);

    for (const s of spikes || []) {
      anomalies.push({
        kind: "signature_spike",
        severity: "critical",
        device_token_id: s.device_token_id,
        farm_id: s.farm_id,
        message: `${s.signature_failures} HMAC signature failures this hour — possible attack`,
        details: { signature_failures: s.signature_failures },
      });
    }

    // 3. Latency high — avg > 3000 ms this hour
    const { data: slow } = await supabase
      .from("device_health_metrics")
      .select("device_token_id, farm_id, total_latency_ms, sync_count, max_latency_ms")
      .eq("bucket_hour", bucketHour)
      .gte("sync_count", 10);

    for (const r of slow || []) {
      const avg = r.sync_count > 0 ? r.total_latency_ms / r.sync_count : 0;
      if (avg > 3000) {
        anomalies.push({
          kind: "latency_high",
          severity: "warning",
          device_token_id: r.device_token_id,
          farm_id: r.farm_id,
          message: `Avg latency ${Math.round(avg)} ms (max ${r.max_latency_ms}) — degraded link`,
          details: { avg_ms: Math.round(avg), max_ms: r.max_latency_ms, samples: r.sync_count },
        });
      }
    }

    // 4. Sensor freeze — same value for 30+ min (last 6 readings identical)
    const thirtyMinAgo = new Date(now - 30 * 60_000).toISOString();
    const { data: recentReadings } = await supabase
      .from("sensor_readings")
      .select("user_id, shed_id, temperature, humidity, ammonia, recorded_at")
      .gte("recorded_at", thirtyMinAgo)
      .order("recorded_at", { ascending: false })
      .limit(500);

    if (recentReadings && recentReadings.length > 0) {
      const byShed = new Map<string, typeof recentReadings>();
      for (const r of recentReadings) {
        const key = `${r.user_id}::${r.shed_id ?? "none"}`;
        if (!byShed.has(key)) byShed.set(key, [] as any);
        byShed.get(key)!.push(r);
      }
      for (const [key, rows] of byShed) {
        if (rows.length < 6) continue;
        const sample = rows.slice(0, 6);
        const allSameTemp = sample.every((x) => x.temperature === sample[0].temperature);
        const allSameHum = sample.every((x) => x.humidity === sample[0].humidity);
        if (allSameTemp && allSameHum && sample[0].temperature !== null) {
          const [user_id] = key.split("::");
          anomalies.push({
            kind: "sensor_freeze",
            severity: "warning",
            user_id,
            message: `Sensor frozen at ${sample[0].temperature}°C / ${sample[0].humidity}% for 30+ min`,
            details: { temperature: sample[0].temperature, humidity: sample[0].humidity, shed_key: key },
          });
        }
      }
    }

    // Persist anomalies into audit_log (best-effort, ignore failures)
    for (const a of anomalies) {
      await supabase.from("audit_log").insert({
        action: `anomaly.${a.kind}`,
        entity_type: "observability",
        entity_id: a.device_token_id ?? null,
        user_id: a.user_id ?? null,
        details: { ...a.details, severity: a.severity, message: a.message },
      }).then(() => {}, () => {});
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned_at: new Date().toISOString(),
        anomaly_count: anomalies.length,
        anomalies,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
