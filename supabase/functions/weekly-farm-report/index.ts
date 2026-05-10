// Weekly Farm Summary Report Generator
// Generates CSV per opted-in farm and uploads to weekly-reports storage bucket
// Email delivery is wired separately once email domain is configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id"); // optional manual trigger

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const isoStart = periodStart.toISOString();
  const isoEnd = periodEnd.toISOString();
  const dateStart = isoStart.split("T")[0];
  const dateEnd = isoEnd.split("T")[0];

  // Find opted-in users
  let q = supabase
    .from("farm_settings")
    .select("user_id, farm_id, weekly_report_email, weekly_report_enabled");
  if (targetUserId) q = q.eq("user_id", targetUserId);
  else q = q.eq("weekly_report_enabled", true);

  const { data: settings, error: sErr } = await q;
  if (sErr) {
    console.error("settings error", sErr);
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const s of settings ?? []) {
    try {
      const [sensors, eggs, feed, alerts, summary] = await Promise.all([
        supabase.from("sensor_readings").select("temperature,humidity,ammonia,water_usage,recorded_at")
          .eq("user_id", s.user_id).gte("recorded_at", isoStart).lte("recorded_at", isoEnd),
        supabase.from("egg_production").select("*")
          .eq("user_id", s.user_id).gte("production_date", dateStart).lte("production_date", dateEnd),
        supabase.from("feed_consumption").select("*")
          .eq("user_id", s.user_id).gte("consumption_date", dateStart).lte("consumption_date", dateEnd),
        supabase.from("alerts").select("severity,alert_type,message_bn,created_at,acknowledged")
          .eq("user_id", s.user_id).gte("created_at", isoStart).lte("created_at", isoEnd),
        supabase.from("daily_summary").select("*")
          .eq("user_id", s.user_id).gte("summary_date", dateStart).lte("summary_date", dateEnd),
      ]);

      const sr = sensors.data ?? [];
      const avg = (k: string) => sr.length ? (sr.reduce((a: number, r: any) => a + Number(r[k] ?? 0), 0) / sr.length) : 0;
      const totalEggs = (eggs.data ?? []).reduce((a, r: any) => a + Number(r.total_eggs ?? 0), 0);
      const totalFeed = (feed.data ?? []).reduce((a, r: any) => a + Number(r.quantity_kg ?? 0), 0);
      const alertCount = (alerts.data ?? []).length;
      const criticalAlerts = (alerts.data ?? []).filter((a: any) => a.severity === "critical").length;

      // Phase 7: AI Bengali summary
      let aiSummary = "";
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{
                role: "user",
                content: `নিচের ১ সপ্তাহের পোল্ট্রি ফার্ম ডেটা থেকে কৃষকের জন্য সংক্ষিপ্ত (৫-৭ লাইন) বাংলা সারাংশ + সুপারিশ লেখো:
গড় তাপমাত্রা: ${avg("temperature").toFixed(1)}°C
গড় আর্দ্রতা: ${avg("humidity").toFixed(1)}%
গড় অ্যামোনিয়া: ${avg("ammonia").toFixed(1)} ppm
মোট ডিম: ${totalEggs}
মোট খাদ্য: ${totalFeed.toFixed(1)} কেজি
মোট অ্যালার্ট: ${alertCount} (জরুরি: ${criticalAlerts})`,
              }],
            }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiSummary = aiData?.choices?.[0]?.message?.content ?? "";
          }
        }
      } catch (e) {
        console.error("ai summary failed", e);
      }

      const csvRows: string[] = [];
      csvRows.push("=== সাপ্তাহিক খামার সারাংশ ===");
      csvRows.push(`সময়কাল,${dateStart} থেকে ${dateEnd}`);
      csvRows.push("");
      csvRows.push("মেট্রিক,মান");
      csvRows.push(`গড় তাপমাত্রা (°C),${avg("temperature").toFixed(1)}`);
      csvRows.push(`গড় আর্দ্রতা (%),${avg("humidity").toFixed(1)}`);
      csvRows.push(`গড় অ্যামোনিয়া (ppm),${avg("ammonia").toFixed(1)}`);
      csvRows.push(`মোট পানি (L),${(sr.reduce((a: number, r: any) => a + Number(r.water_usage ?? 0), 0)).toFixed(1)}`);
      csvRows.push(`মোট ডিম,${totalEggs}`);
      csvRows.push(`মোট খাদ্য (কেজি),${totalFeed.toFixed(1)}`);
      csvRows.push(`মোট অ্যালার্ট,${alertCount}`);
      csvRows.push(`জরুরি অ্যালার্ট,${criticalAlerts}`);
      csvRows.push("");
      csvRows.push("");
      if (aiSummary) {
        csvRows.push("=== 🤖 AI সারাংশ ও সুপারিশ ===");
        for (const line of aiSummary.split("\n")) {
          csvRows.push(`"${line.replace(/"/g, '""')}"`);
        }
        csvRows.push("");
      }
      csvRows.push("=== দৈনিক সারাংশ ===");
      csvRows.push("তারিখ,স্বাস্থ্য স্কোর,গড় তাপমাত্রা,গড় আর্দ্রতা,মোট ডিম,অ্যালার্ট");
      for (const d of summary.data ?? []) {
        csvRows.push(`${(d as any).summary_date},${(d as any).health_score ?? ""},${(d as any).avg_temperature ?? ""},${(d as any).avg_humidity ?? ""},${(d as any).total_eggs ?? ""},${(d as any).alerts_count ?? ""}`);
      }
      csvRows.push("");
      csvRows.push("=== অ্যালার্ট তালিকা ===");
      csvRows.push("সময়,তীব্রতা,ধরণ,বার্তা,স্বীকৃত");
      for (const a of alerts.data ?? []) {
        const msg = String((a as any).message_bn ?? "").replace(/"/g, '""');
        csvRows.push(`"${(a as any).created_at}","${(a as any).severity}","${(a as any).alert_type}","${msg}",${(a as any).acknowledged ? "হ্যাঁ" : "না"}`);
      }

      const csv = "\uFEFF" + csvRows.join("\n");
      const fileName = `${s.user_id}/weekly-${dateStart}-to-${dateEnd}.csv`;

      const { error: upErr } = await supabase.storage
        .from("weekly-reports")
        .upload(fileName, new Blob([csv], { type: "text/csv;charset=utf-8" }), {
          upsert: true,
          contentType: "text/csv;charset=utf-8",
        });
      if (upErr) throw upErr;

      const { data: signed, error: signErr } = await supabase.storage
        .from("weekly-reports")
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days
      if (signErr) throw signErr;

      await supabase.from("weekly_report_log").insert({
        user_id: s.user_id,
        farm_id: s.farm_id,
        period_start: dateStart,
        period_end: dateEnd,
        file_path: fileName,
        signed_url: signed?.signedUrl,
        status: "generated",
        email_sent: false,
      });

      // TODO: once email domain is configured, invoke send-transactional-email
      // with templateName 'weekly-farm-summary' and templateData containing
      // the metrics + signed_url. For now report is available via signed URL only.

      results.push({ user_id: s.user_id, status: "ok", file: fileName, url: signed?.signedUrl });
    } catch (e: any) {
      console.error("user", s.user_id, e);
      await supabase.from("weekly_report_log").insert({
        user_id: s.user_id,
        farm_id: s.farm_id,
        period_start: dateStart,
        period_end: dateEnd,
        status: "failed",
        error: String(e?.message ?? e),
      });
      results.push({ user_id: s.user_id, status: "failed", error: String(e?.message ?? e) });
    }
  }

  return new Response(JSON.stringify({ count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
