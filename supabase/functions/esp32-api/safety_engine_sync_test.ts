// Integration test: Safety Engine toggle sync between cloud DB and ESP32 /config endpoint
//
// Flow:
//   1. Pick an existing active device token + farm via service role.
//   2. Snapshot current farm_settings.safety_engine_enabled.
//   3. Toggle DB -> false, call GET /config, assert config.safety_engine_enabled === false.
//   4. Toggle DB -> true,  call GET /config, assert config.safety_engine_enabled === true.
//   5. Restore original value.
//
// Run: supabase--test_edge_functions { functions: ["esp32-api"], pattern: "safety engine" }

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const FN_URL = `${SUPABASE_URL}/functions/v1/esp32-api/config`;

async function fetchConfig(token: string) {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: {
      "x-device-token": token,
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep null */ }
  return { status: res.status, json, text };
}

async function setSafetyEngine(farmId: string, enabled: boolean) {
  const { error } = await admin
    .from("farm_settings")
    .update({ safety_engine_enabled: enabled })
    .eq("farm_id", farmId);
  if (error) throw error;
}

async function pickDevice() {
  const { data, error } = await admin
    .from("device_tokens")
    .select("token, farm_id")
    .eq("is_active", true)
    .not("farm_id", "is", null)
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No active device token with farm_id found");
  return data[0] as { token: string; farm_id: string };
}

Deno.test("safety engine toggle syncs from DB to ESP32 /config", async () => {
  const device = await pickDevice();

  // Ensure farm_settings row exists & snapshot current value
  const { data: original } = await admin
    .from("farm_settings")
    .select("safety_engine_enabled")
    .eq("farm_id", device.farm_id)
    .maybeSingle();
  const originalValue = original?.safety_engine_enabled ?? true;

  try {
    // ---- Case A: disabled ----
    await setSafetyEngine(device.farm_id, false);
    const off = await fetchConfig(device.token);
    assertEquals(off.status, 200, `expected 200, got ${off.status}: ${off.text}`);
    assertEquals(
      off.json?.safety_engine_enabled,
      false,
      "config should report safety_engine_enabled=false after DB toggle off",
    );

    // ---- Case B: enabled ----
    await setSafetyEngine(device.farm_id, true);
    const on = await fetchConfig(device.token);
    assertEquals(on.status, 200, `expected 200, got ${on.status}: ${on.text}`);
    assertEquals(
      on.json?.safety_engine_enabled,
      true,
      "config should report safety_engine_enabled=true after DB toggle on",
    );
  } finally {
    // Restore
    await setSafetyEngine(device.farm_id, originalValue);
  }
});

Deno.test("invalid device token rejected by /config", async () => {
  const res = await fetchConfig("FARM-INVALID-TOKEN-XXXX");
  assertEquals(res.status, 401);
  await Promise.resolve();
});
