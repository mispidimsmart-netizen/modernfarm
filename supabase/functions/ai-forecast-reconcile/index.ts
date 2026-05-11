// Phase B: Daily reconciliation — compare yesterday's predictions with actual values
// Runs via pg_cron every day at 02:00 Asia/Dhaka
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats = { reconciled: 0, skipped: 0, errors: 0, by_type: {} as Record<string, number> };

  try {
    // Pull all unreconciled predictions whose target_date has passed (>= 1 day ago)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: pending, error } = await admin
      .from("ai_prediction_log")
      .select("id, farm_id, target_date, prediction_type, predicted_value")
      .is("reconciled_at", null)
      .lte("target_date", cutoff)
      .limit(2000);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, ...stats, message: "nothing to reconcile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by farm + date for batch fetch
    const farmDates = new Map<string, Set<string>>();
    for (const p of pending) {
      if (!farmDates.has(p.farm_id)) farmDates.set(p.farm_id, new Set());
      farmDates.get(p.farm_id)!.add(p.target_date);
    }

    // Cache: farm_id|date -> { hsi_avg, mortality_pct, feed_kg, water_l }
    const actuals = new Map<string, any>();

    for (const [farmId, dates] of farmDates.entries()) {
      const sortedDates = Array.from(dates).sort();
      const minDate = sortedDates[0];
      const maxDate = sortedDates[sortedDates.length - 1];
      const dayStart = new Date(minDate + "T00:00:00Z").toISOString();
      const dayEnd = new Date(new Date(maxDate + "T00:00:00Z").getTime() + 86_400_000).toISOString();

      // Sensors → daily avg HSI
      const { data: sensors } = await admin
        .from("sensor_readings")
        .select("recorded_at, hsi")
        .eq("farm_id", farmId)
        .gte("recorded_at", dayStart)
        .lt("recorded_at", dayEnd);

      // Feed (broiler_feed) per day
      const { data: feed } = await admin
        .from("broiler_feed")
        .select("feed_date, quantity_kg")
        .eq("farm_id", farmId)
        .gte("feed_date", minDate)
        .lte("feed_date", maxDate);

      // Mortality (broiler_mortality)
      const { data: mort } = await admin
        .from("broiler_mortality")
        .select("death_date, dead_count")
        .eq("farm_id", farmId)
        .gte("death_date", minDate)
        .lte("death_date", maxDate);

      // Active broiler batch for mortality % base
      const { data: batch } = await admin
        .from("broiler_batches")
        .select("initial_count")
        .eq("farm_id", farmId)
        .eq("status", "active")
        .maybeSingle();
      const initialCount = batch?.initial_count ?? 0;

      for (const date of dates) {
        const dayStartMs = new Date(date + "T00:00:00Z").getTime();
        const dayEndMs = dayStartMs + 86_400_000;

        const dayHsi = (sensors || [])
          .filter((s: any) => {
            const ts = new Date(s.recorded_at).getTime();
            return ts >= dayStartMs && ts < dayEndMs && s.hsi != null;
          })
          .map((s: any) => Number(s.hsi));
        const hsiAvg = dayHsi.length ? dayHsi.reduce((a, b) => a + b, 0) / dayHsi.length : null;

        const feedKg = (feed || [])
          .filter((f: any) => f.feed_date === date)
          .reduce((s: number, f: any) => s + Number(f.quantity_kg || 0), 0);

        const dead = (mort || [])
          .filter((m: any) => m.death_date === date)
          .reduce((s: number, m: any) => s + Number(m.dead_count || 0), 0);
        const mortalityPct = initialCount > 0 ? (dead / initialCount) * 100 : null;

        actuals.set(`${farmId}|${date}`, {
          hsi_avg: hsiAvg,
          mortality_risk_7d: mortalityPct,
          feed_consumption_kg: feedKg || null,
          water_consumption_l: null, // no per-day water table — skip for now
        });
      }
    }

    // Compute errors and update each prediction row
    for (const p of pending) {
      const a = actuals.get(`${p.farm_id}|${p.target_date}`);
      if (!a) { stats.skipped++; continue; }
      const actualVal = a[p.prediction_type];
      if (actualVal == null) { stats.skipped++; continue; }

      const predicted = Number(p.predicted_value);
      const errorAbs = Math.abs(actualVal - predicted);
      const errorPct = actualVal !== 0 ? Math.min(100, (errorAbs / Math.abs(actualVal)) * 100) : (predicted === 0 ? 0 : 100);

      const { error: updErr } = await admin
        .from("ai_prediction_log")
        .update({
          actual_value: actualVal,
          error_abs: errorAbs,
          error_pct: errorPct,
          reconciled_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      if (updErr) { stats.errors++; continue; }
      stats.reconciled++;
      stats.by_type[p.prediction_type] = (stats.by_type[p.prediction_type] || 0) + 1;
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-forecast-reconcile error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), ...stats }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
