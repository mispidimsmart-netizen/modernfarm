// Integration test: Safety Engine sync from DB → ESP32 /config endpoint
//
// What this verifies:
//   1. /config returns 200 for a valid device token (basic auth round-trip).
//   2. The `safety_engine_enabled` field in /config matches the current DB
//      value in `farm_settings` for that device's farm. This is the exact
//      contract the ESP32 firmware relies on to pull the safety toggle.
//   3. /config rejects an invalid device token with 401 (security boundary).
//
// Note on mutations:
//   The Lovable test runner only has read access to the database (sandbox_exec
//   role). We therefore *read* the current toggle value and assert it equals
//   what /config returns, instead of toggling DB → polling. To exercise the
//   toggle path manually, change the safety toggle in the app UI, then re-run
//   this test — the assertion will follow the new value.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

if (!SUPABASE_URL || !ANON_KEY || !DB_URL) {
  throw new Error("Missing SUPABASE_URL / publishable key / SUPABASE_DB_URL");
}

const FN_URL = `${SUPABASE_URL}/functions/v1/esp32-api/config`;

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client(DB_URL);
  await db.connect();
  try { return await fn(db); } finally { await db.end(); }
}

async function fetchConfig(token: string) {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: {
      "x-device-token": token,
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep null */ }
  return { status: res.status, json, text };
}

Deno.test("/config exposes farm_settings.safety_engine_enabled to ESP32", async () => {
  // Pick an active device + read its farm's current safety flag in one round-trip
  const row = await withDb(async (db) => {
    const r = await db.queryObject<{
      token: string;
      farm_id: string;
      safety_engine_enabled: boolean | null;
    }>`
      SELECT dt.token,
             dt.farm_id::text AS farm_id,
             fs.safety_engine_enabled
      FROM device_tokens dt
      LEFT JOIN farm_settings fs ON fs.farm_id = dt.farm_id
      WHERE dt.is_active = true
        AND dt.farm_id IS NOT NULL
      ORDER BY dt.created_at DESC NULLS LAST
      LIMIT 1
    `;
    if (r.rows.length === 0) throw new Error("No active device token with farm_id");
    return r.rows[0];
  });

  // Default in cloud function is `true` when settings row missing or column null
  const expected = row.safety_engine_enabled ?? true;

  const res = await fetchConfig(row.token);
  assertEquals(res.status, 200, `expected 200, got ${res.status}: ${res.text}`);
  assert(res.json !== null, "config response should be JSON");
  assertEquals(
    typeof res.json.safety_engine_enabled,
    "boolean",
    "safety_engine_enabled must be a boolean in /config response",
  );
  assertEquals(
    res.json.safety_engine_enabled,
    expected,
    `cloud /config (${res.json.safety_engine_enabled}) must match DB farm_settings (${expected})`,
  );
});

Deno.test("/config rejects invalid device token with 401", async () => {
  const res = await fetchConfig("FARM-INVALID-TOKEN-XXXX");
  assertEquals(res.status, 401, `expected 401, got ${res.status}: ${res.text}`);
  assertEquals(res.json?.code, "INVALID_TOKEN");
});

Deno.test("/config rejects missing device token with 401", async () => {
  const res = await fetch(FN_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
  });
  const text = await res.text();
  assertEquals(res.status, 401, `expected 401, got ${res.status}: ${text}`);
});
