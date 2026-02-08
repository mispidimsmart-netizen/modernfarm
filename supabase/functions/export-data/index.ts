import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 Exporting data for user: ${user.id}`);

    const url = new URL(req.url);
    const dataType = url.searchParams.get("type") || "all";
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    let csvContent = "";
    let fileName = "farm_data_export.csv";

    // Build date filter
    const dateFilter = (query: any, dateColumn: string) => {
      if (startDate) {
        query = query.gte(dateColumn, startDate);
      }
      if (endDate) {
        query = query.lte(dateColumn, endDate);
      }
      return query;
    };

    switch (dataType) {
      case "sensor_readings": {
        let query = supabase
          .from("sensor_readings")
          .select("*")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(10000);
        
        query = dateFilter(query, "recorded_at");
        const { data, error } = await query;

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "recorded_at", label: "তারিখ/সময়" },
          { key: "temperature", label: "তাপমাত্রা (°C)" },
          { key: "humidity", label: "আর্দ্রতা (%)" },
          { key: "ammonia", label: "অ্যামোনিয়া (ppm)" },
          { key: "water_usage", label: "পানি খরচ (L)" },
        ]);
        fileName = "sensor_readings.csv";
        console.log(`✅ Exported ${data?.length || 0} sensor readings`);
        break;
      }

      case "egg_production": {
        let query = supabase
          .from("egg_production")
          .select("*")
          .eq("user_id", user.id)
          .order("production_date", { ascending: false });
        
        query = dateFilter(query, "production_date");
        const { data, error } = await query;

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "production_date", label: "তারিখ" },
          { key: "total_eggs", label: "মোট ডিম" },
          { key: "grade_a", label: "গ্রেড A" },
          { key: "grade_b", label: "গ্রেড B" },
          { key: "grade_c", label: "গ্রেড C" },
          { key: "broken", label: "নষ্ট" },
          { key: "notes", label: "নোট" },
        ]);
        fileName = "egg_production.csv";
        console.log(`✅ Exported ${data?.length || 0} egg production records`);
        break;
      }

      case "feed_consumption": {
        let query = supabase
          .from("feed_consumption")
          .select("*")
          .eq("user_id", user.id)
          .order("consumption_date", { ascending: false });
        
        query = dateFilter(query, "consumption_date");
        const { data, error } = await query;

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "consumption_date", label: "তারিখ" },
          { key: "feed_type", label: "খাদ্যের ধরণ" },
          { key: "quantity_kg", label: "পরিমাণ (কেজি)" },
          { key: "notes", label: "নোট" },
        ]);
        fileName = "feed_consumption.csv";
        console.log(`✅ Exported ${data?.length || 0} feed consumption records`);
        break;
      }

      case "alerts": {
        let query = supabase
          .from("alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        query = dateFilter(query, "created_at");
        const { data, error } = await query;

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "created_at", label: "তারিখ/সময়" },
          { key: "alert_type", label: "ধরণ" },
          { key: "severity", label: "তীব্রতা" },
          { key: "message_bn", label: "বার্তা" },
          { key: "acknowledged", label: "স্বীকৃত" },
        ]);
        fileName = "alerts.csv";
        console.log(`✅ Exported ${data?.length || 0} alerts`);
        break;
      }

      case "daily_summary": {
        let query = supabase
          .from("daily_summary")
          .select("*")
          .eq("user_id", user.id)
          .order("summary_date", { ascending: false });
        
        query = dateFilter(query, "summary_date");
        const { data, error } = await query;

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "summary_date", label: "তারিখ" },
          { key: "health_score", label: "স্বাস্থ্য স্কোর" },
          { key: "avg_temperature", label: "গড় তাপমাত্রা (°C)" },
          { key: "avg_humidity", label: "গড় আর্দ্রতা (%)" },
          { key: "avg_ammonia", label: "গড় অ্যামোনিয়া (ppm)" },
          { key: "total_eggs", label: "মোট ডিম" },
          { key: "total_water_usage", label: "মোট পানি (L)" },
          { key: "mortality_count", label: "মৃত্যু" },
          { key: "alerts_count", label: "অ্যালার্ট সংখ্যা" },
        ]);
        fileName = "daily_summary.csv";
        console.log(`✅ Exported ${data?.length || 0} daily summaries`);
        break;
      }

      case "broiler_batches": {
        const { data, error } = await supabase
          .from("broiler_batches")
          .select("*")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false });

        if (error) throw error;

        csvContent = generateCSV(data || [], [
          { key: "batch_name", label: "ব্যাচের নাম" },
          { key: "start_date", label: "শুরুর তারিখ" },
          { key: "initial_bird_count", label: "প্রাথমিক পাখি সংখ্যা" },
          { key: "current_bird_count", label: "বর্তমান পাখি সংখ্যা" },
          { key: "breed", label: "জাত" },
          { key: "status", label: "স্ট্যাটাস" },
          { key: "chick_cost_per_bird", label: "প্রতি বাচ্চা খরচ" },
        ]);
        fileName = "broiler_batches.csv";
        console.log(`✅ Exported ${data?.length || 0} broiler batches`);
        break;
      }

      case "all":
      default: {
        // Export all data combined
        const [sensorData, eggData, feedData, alertData, summaryData] = await Promise.all([
          supabase.from("sensor_readings").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(1000),
          supabase.from("egg_production").select("*").eq("user_id", user.id).order("production_date", { ascending: false }),
          supabase.from("feed_consumption").select("*").eq("user_id", user.id).order("consumption_date", { ascending: false }),
          supabase.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
          supabase.from("daily_summary").select("*").eq("user_id", user.id).order("summary_date", { ascending: false }),
        ]);

        // Combine all sections
        csvContent = "=== সেন্সর রিডিং ===\n";
        csvContent += generateCSV(sensorData.data || [], [
          { key: "recorded_at", label: "তারিখ/সময়" },
          { key: "temperature", label: "তাপমাত্রা" },
          { key: "humidity", label: "আর্দ্রতা" },
          { key: "ammonia", label: "অ্যামোনিয়া" },
        ]);

        csvContent += "\n\n=== ডিম উৎপাদন ===\n";
        csvContent += generateCSV(eggData.data || [], [
          { key: "production_date", label: "তারিখ" },
          { key: "total_eggs", label: "মোট ডিম" },
          { key: "grade_a", label: "গ্রেড A" },
          { key: "broken", label: "নষ্ট" },
        ]);

        csvContent += "\n\n=== খাদ্য খরচ ===\n";
        csvContent += generateCSV(feedData.data || [], [
          { key: "consumption_date", label: "তারিখ" },
          { key: "feed_type", label: "ধরণ" },
          { key: "quantity_kg", label: "পরিমাণ (কেজি)" },
        ]);

        csvContent += "\n\n=== দৈনিক সারাংশ ===\n";
        csvContent += generateCSV(summaryData.data || [], [
          { key: "summary_date", label: "তারিখ" },
          { key: "health_score", label: "স্কোর" },
          { key: "avg_temperature", label: "গড় তাপমাত্রা" },
        ]);

        fileName = "farm_complete_export.csv";
        console.log(`✅ Exported complete farm data`);
        break;
      }
    }

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    return new Response(csvWithBom, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("❌ Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to generate CSV from data
function generateCSV(
  data: any[],
  columns: { key: string; label: string }[]
): string {
  if (!data || data.length === 0) {
    return columns.map((c) => c.label).join(",") + "\nNo data available";
  }

  // Header row
  const header = columns.map((c) => `"${c.label}"`).join(",");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key];
        if (value === null || value === undefined) return '""';
        if (typeof value === "boolean") return value ? '"হ্যাঁ"' : '"না"';
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        return `"${value}"`;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}
