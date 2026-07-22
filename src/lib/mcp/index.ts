import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listFarmsTool from "./tools/list-farms";
import listShedsTool from "./tools/list-sheds";
import latestSensorReadingTool from "./tools/latest-sensor-reading";
import listAlertsTool from "./tools/list-alerts";

// Direct Supabase issuer — never the `.lovable.cloud` proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "farmeye-mcp",
  title: "FarmEye MCP",
  version: "0.1.0",
  instructions:
    "FarmEye smart poultry farm automation. Use `whoami` to verify the connection, then `list_farms` to discover the user's farms. Per farm you can call `list_sheds`, `get_latest_sensor_reading`, and `list_recent_alerts`. All tools respect the user's role-based access — no data outside the user's farms is returned.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listFarmsTool, listShedsTool, latestSensorReadingTool, listAlertsTool],
});
