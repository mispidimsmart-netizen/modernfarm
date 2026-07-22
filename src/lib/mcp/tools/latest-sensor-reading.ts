import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_latest_sensor_reading",
  title: "Get latest sensor reading",
  description: "Return the most recent sensor reading (temperature, humidity, ammonia, etc.) for a farm.",
  inputSchema: {
    farm_id: z.string().uuid().describe("Farm UUID. Use `list_farms` first."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ farm_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("sensor_readings")
      .select("*")
      .eq("farm_id", farm_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No sensor readings found for this farm." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { reading: data },
    };
  },
});
