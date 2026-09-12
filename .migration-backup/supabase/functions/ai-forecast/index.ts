// Phase 7: AI 24-hour forecast for a single farm
// POST /ai-forecast?farm_id=...
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
    name: "report_forecast",
    description: "24-hour predictive forecast for a poultry farm",
    parameters: {
      type: "object",
      properties: {
        risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
        summary_bn: { type: "string" },
        recommendation_bn: { type: "string" },
        hours: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hour_offset: { type: "integer", minimum: 1, maximum: 24 },
              predicted_temp: { type: "number" },
              predicted_humidity: { type: "number" },
              predicted_ammonia: { type: "number" },
              predicted_hsi: { type: "number" },
            },
            required: ["hour_offset", "predicted_temp", "predicted_hsi"],
          },
        },
      },
      required: ["risk_level", "summary_bn", "recommendation_bn", "hours"],
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

    // Verify access
    const { data: canAccess } = await userClient.rpc("user_can_access_farm", {
      _user_id: user.id, _farm_id: farmId,
    });
    if (!canAccess) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Pull recent 7-day hourly history
    const { data: rollup } = await admin
      .from("sensor_hourly_rollup_mv")
      .select("hour, avg_temp, max_temp, avg_humidity, avg_ammonia, max_ammonia, avg_hsi")
      .eq("farm_id", farmId)
      .gte("hour", new Date(Date.now() - 7 * 86400 * 1000).toISOString())
      .order("hour", { ascending: true });

    if (!rollup || rollup.length < 12) {
      return new Response(JSON.stringify({ error: "insufficient_history", need_at_least_hours: 12 }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compact summary for the model
    const last48 = rollup.slice(-48);
    const compact = last48
      .map((r: any) =>
        `${new Date(r.hour).toISOString().slice(11, 13)}h T:${r.avg_temp}(max ${r.max_temp}) H:${r.avg_humidity}% NH3:${r.avg_ammonia}(max ${r.max_ammonia}) HSI:${r.avg_hsi}`
      ).join("\n");

    // Get flock context
    const { data: flock } = await admin
      .from("flock_info")
      .select("total_birds, age_weeks, breed")
      .eq("farm_id", farmId)
      .maybeSingle();

    const prompt = `তুমি একজন পোল্ট্রি ফার্ম বিশেষজ্ঞ। নিচের গত ৪৮ ঘন্টার সেন্সর প্যাটার্ন বিশ্লেষণ করে আগামী ২৪ ঘন্টার পূর্বাভাস দাও।

ফ্লক: ${flock?.total_birds ?? "n/a"} পাখি, বয়স ${flock?.age_weeks ?? "n/a"} সপ্তাহ, breed: ${flock?.breed ?? "n/a"}

গত ৪৮ ঘন্টা (প্রতি ঘন্টায়):
${compact}

নির্দেশনা:
- প্রতি ঘন্টার (১-২৪) predicted_temp, predicted_hsi দাও
- humidity, ammonia ও দাও যদি pattern থেকে নির্ণেয় হয়
- risk_level সামগ্রিক বিপদ
- summary_bn: ২-৩ লাইনে বাংলায় ব্যাখ্যা
- recommendation_bn: কৃষকের জন্য practical action`;

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
        tool_choice: { type: "function", function: { name: "report_forecast" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "no_forecast" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const forecast = JSON.parse(call.function.arguments);

    const { data: inserted, error: insErr } = await admin.from("farm_forecasts").insert({
      farm_id: farmId,
      horizon_hours: 24,
      forecast_json: forecast,
      risk_level: forecast.risk_level,
      summary_bn: forecast.summary_bn,
      recommendation_bn: forecast.recommendation_bn,
      model: "google/gemini-2.5-flash",
    }).select().single();

    if (insErr) {
      console.error("insert", insErr);
    }

    return new Response(JSON.stringify({ ok: true, forecast, id: inserted?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
