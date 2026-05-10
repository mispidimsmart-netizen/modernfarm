// Phase 6: AI-powered anomaly detection
// Cron-invokable. Scans recent sensor windows per farm and writes to anomaly_detections.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface RollupRow {
  hour: string;
  avg_temp: number | null;
  max_temp: number | null;
  avg_humidity: number | null;
  avg_ammonia: number | null;
  max_ammonia: number | null;
  avg_hsi: number | null;
  max_hsi: number | null;
}

async function detectForFarm(
  admin: ReturnType<typeof createClient>,
  farmId: string,
  rows: RollupRow[],
) {
  if (rows.length < 6 || !LOVABLE_API_KEY) return [];

  const summary = rows
    .slice(0, 24)
    .reverse()
    .map(
      (r) =>
        `${new Date(r.hour).toISOString().slice(11, 16)} T:${r.avg_temp ?? "-"}°C(max ${r.max_temp ?? "-"}) H:${r.avg_humidity ?? "-"}% NH3:${r.avg_ammonia ?? "-"}(max ${r.max_ammonia ?? "-"}) HSI:${r.avg_hsi ?? "-"}`,
    )
    .join("\n");

  const prompt = `তুমি একজন পোল্ট্রি ফার্মের বিশেষজ্ঞ। নিচে গত ২৪ ঘন্টার সেন্সর ডেটা দেওয়া হলো (প্রতি ঘন্টায়)। 
অস্বাভাবিক প্যাটার্ন (যেমন: হঠাৎ তাপমাত্রা স্পাইক, NH3 বাড়ছে, HSI ক্রিটিকাল) থাকলে শুধু সেইগুলো শনাক্ত করো।

ডেটা:
${summary}

নিয়ম:
- শুধু সত্যিকারের anomaly রিপোর্ট করো (false positive এড়াও)
- max 3টি anomaly
- কোনো anomaly না থাকলে খালি array ফেরত দাও`;

  const tool = {
    type: "function",
    function: {
      name: "report_anomalies",
      description: "Report detected sensor anomalies",
      parameters: {
        type: "object",
        properties: {
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                metric: {
                  type: "string",
                  enum: ["temperature", "humidity", "ammonia", "hsi", "combined"],
                },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                title_bn: { type: "string" },
                description_bn: { type: "string" },
                recommendation_bn: { type: "string" },
                reasoning: { type: "string" },
              },
              required: [
                "metric",
                "severity",
                "confidence",
                "title_bn",
                "description_bn",
                "recommendation_bn",
              ],
            },
          },
        },
        required: ["anomalies"],
      },
    },
  };

  const aiRes = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_anomalies" } },
      }),
    },
  );

  if (!aiRes.ok) {
    console.error("AI gateway error", aiRes.status, await aiRes.text());
    return [];
  }
  const data = await aiRes.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return [];
  let parsed: any;
  try {
    parsed = JSON.parse(call.function.arguments);
  } catch {
    return [];
  }
  const anomalies = parsed?.anomalies ?? [];
  if (!Array.isArray(anomalies) || anomalies.length === 0) return [];

  const windowStart = rows[rows.length - 1].hour;
  const windowEnd = rows[0].hour;

  // dedupe: skip metric if same severity unack anomaly already exists in last 6h
  const { data: existing } = await admin
    .from("anomaly_detections")
    .select("metric, severity")
    .eq("farm_id", farmId)
    .eq("acknowledged", false)
    .gte("detected_at", new Date(Date.now() - 6 * 3600 * 1000).toISOString());
  const existingKey = new Set(
    (existing ?? []).map((e: any) => `${e.metric}:${e.severity}`),
  );

  const toInsert = anomalies
    .filter((a: any) => !existingKey.has(`${a.metric}:${a.severity}`))
    .map((a: any) => ({
      farm_id: farmId,
      window_start: windowStart,
      window_end: windowEnd,
      metric: a.metric,
      severity: a.severity,
      confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0.5)),
      title_bn: a.title_bn,
      description_bn: a.description_bn,
      recommendation_bn: a.recommendation_bn,
      reasoning: a.reasoning,
      data_snapshot: { rows: rows.slice(0, 24) },
    }));

  if (toInsert.length === 0) return [];
  const { error } = await admin.from("anomaly_detections").insert(toInsert);
  if (error) {
    console.error("insert error", error);
    return [];
  }
  return toInsert;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Refresh hourly rollup first
    await admin.rpc("refresh_sensor_hourly_rollup");

    // Allow optional ?farm_id=... for on-demand single-farm runs
    const url = new URL(req.url);
    const singleFarm = url.searchParams.get("farm_id");

    let farmIds: string[] = [];
    if (singleFarm) {
      farmIds = [singleFarm];
    } else {
      const { data } = await admin
        .from("sensor_hourly_rollup_mv")
        .select("farm_id")
        .gte("hour", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      farmIds = Array.from(new Set((data ?? []).map((r: any) => r.farm_id)));
    }

    const results: Record<string, number> = {};
    for (const fid of farmIds) {
      const { data: rows } = await admin
        .from("sensor_hourly_rollup_mv")
        .select("hour, avg_temp, max_temp, avg_humidity, avg_ammonia, max_ammonia, avg_hsi, max_hsi")
        .eq("farm_id", fid)
        .gte("hour", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("hour", { ascending: false });

      const inserted = await detectForFarm(admin, fid, (rows ?? []) as any);
      results[fid] = inserted.length;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: farmIds.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
