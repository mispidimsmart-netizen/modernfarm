// Phase A: AI 7-day forecast for a single farm
// GET /ai-forecast-7day?farm_id=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL = {
  type: "function",
  function: {
    name: "report_7day_forecast",
    description: "7-day predictive farm health, mortality risk, and feed/water consumption forecast",
    parameters: {
      type: "object",
      properties: {
        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
        summary_bn: { type: "string" },
        recommendation_bn: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day_offset: { type: "integer", minimum: 1, maximum: 7 },
              avg_temp: { type: "number" },
              avg_humidity: { type: "number" },
              avg_ammonia: { type: "number" },
              hsi_avg: { type: "number" },
              mortality_risk_pct: { type: "number" },
              expected_feed_kg: { type: "number" },
              expected_water_l: { type: "number" },
              risk_label_bn: { type: "string" },
            },
            required: ["day_offset", "avg_temp", "hsi_avg", "mortality_risk_pct", "risk_label_bn"],
          },
          minItems: 7,
          maxItems: 7,
        },
      },
      required: ["risk_level", "summary_bn", "recommendation_bn", "days"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const farmId = url.searchParams.get("farm_id");
    if (!farmId) {
      return new Response(JSON.stringify({ error: "farm_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canAccess } = await userClient.rpc("user_can_access_farm", {
      _user_id: user.id, _farm_id: farmId,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull recent 7-day history for context
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: readings }, { data: batch }, { data: weather }] = await Promise.all([
      admin
        .from("sensor_readings")
        .select("temperature, humidity, ammonia, recorded_at")
        .eq("farm_id", farmId)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: false })
        .limit(500),
      admin
        .from("broiler_batches")
        .select("start_date, initial_count, current_count, breed")
        .eq("farm_id", farmId)
        .eq("status", "active")
        .maybeSingle(),
      admin
        .from("weather_cache")
        .select("temperature, humidity, weather_condition")
        .eq("farm_id", farmId)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Compact stats (limit prompt size)
    const stats = (() => {
      if (!readings || readings.length === 0) return null;
      const t = readings.map((r: any) => r.temperature).filter(Boolean);
      const h = readings.map((r: any) => r.humidity).filter(Boolean);
      const a = readings.map((r: any) => r.ammonia).filter(Boolean);
      const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
      const mx = (xs: number[]) => Math.max(...xs);
      return {
        samples: readings.length,
        temp: { avg: +avg(t).toFixed(1), max: +mx(t).toFixed(1) },
        hum:  { avg: +avg(h).toFixed(1) },
        nh3:  { avg: +avg(a).toFixed(1), max: +mx(a).toFixed(1) },
      };
    })();

    let age_days: number | null = null;
    if (batch?.start_date) {
      age_days = Math.floor((Date.now() - new Date(batch.start_date).getTime()) / 86_400_000);
    }

    const prompt = `তুমি একজন বাংলাদেশী পোলট্রি এক্সপার্ট। নিচের ৭ দিনের sensor history ও batch info দেখে আগামী ৭ দিনের দৈনিক forecast দাও। বাংলায় summary ও recommendation লেখো।

DATA:
${JSON.stringify({ stats, batch, weather, age_days }, null, 2)}

REQUIREMENTS:
- প্রতিটি দিনের জন্য avg_temp, hsi_avg (0-100), mortality_risk_pct (0-100), expected_feed_kg, expected_water_l দাও
- মুরগির বয়স অনুযায়ী feed/water বাড়াও (broiler curve)
- HSI > 70 → high mortality risk
- NH3 trend rising হলে warning দাও`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "report_7day_forecast" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limit" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await aiRes.json();
    const call = ai?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "no_forecast" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const forecast = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify({ forecast, generated_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-forecast-7day error:", e);
    return new Response(JSON.stringify({ error: "internal", detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
