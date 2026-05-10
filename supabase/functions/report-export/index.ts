// Phase 6: Report export (CSV)
// GET /report-export?type=sensors|finance|batch&farm_id=...&days=30
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supa.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "sensors";
    const farmId = url.searchParams.get("farm_id");
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") ?? "30")));
    if (!farmId) {
      return new Response(JSON.stringify({ error: "farm_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

    let rows: any[] = [];
    let filename = "report.csv";

    if (type === "sensors") {
      const { data, error } = await supa.rpc("get_sensor_hourly_rollup", {
        _farm_id: farmId,
        _hours: days * 24,
      });
      if (error) throw error;
      rows = data ?? [];
      filename = `sensors_${days}d.csv`;
    } else if (type === "finance") {
      const [{ data: exp }, { data: inc }] = await Promise.all([
        supa.from("expenses").select("expense_date, category, amount, description, batch_id, farm_mode").eq("farm_id", farmId).gte("expense_date", since.slice(0, 10)),
        supa.from("income").select("income_date, source, amount, description, batch_id, farm_mode").eq("farm_id", farmId).gte("income_date", since.slice(0, 10)),
      ]);
      rows = [
        ...((exp ?? []).map((e: any) => ({ date: e.expense_date, type: "expense", category: e.category, amount: -Math.abs(e.amount), description: e.description, batch_id: e.batch_id, farm_mode: e.farm_mode }))),
        ...((inc ?? []).map((i: any) => ({ date: i.income_date, type: "income", category: i.source, amount: i.amount, description: i.description, batch_id: i.batch_id, farm_mode: i.farm_mode }))),
      ].sort((a, b) => (a.date < b.date ? 1 : -1));
      filename = `finance_${days}d.csv`;
    } else if (type === "batch") {
      const [{ data: layers }, { data: broilers }] = await Promise.all([
        supa.from("layer_batches").select("*").eq("farm_id", farmId),
        supa.from("broiler_batches").select("*").eq("farm_id", farmId),
      ]);
      rows = [
        ...((layers ?? []).map((b: any) => ({ ...b, type: "layer" }))),
        ...((broilers ?? []).map((b: any) => ({ ...b, type: "broiler" }))),
      ];
      filename = `batches.csv`;
    } else if (type === "anomalies") {
      const { data, error } = await supa
        .from("anomaly_detections")
        .select("detected_at, metric, severity, confidence, title_bn, description_bn, recommendation_bn, acknowledged")
        .eq("farm_id", farmId)
        .gte("detected_at", since)
        .order("detected_at", { ascending: false });
      if (error) throw error;
      rows = data ?? [];
      filename = `anomalies_${days}d.csv`;
    } else {
      return new Response(JSON.stringify({ error: "invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
