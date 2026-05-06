// Integration test: Safety Engine toggle sync between cloud DB and ESP32 /config
//
// Flow:
//   1. Pick an active device token + farm via direct DB connection.
//   2. Snapshot farm_settings.safety_engine_enabled.
//   3. Toggle DB -> false, GET /config, assert config.safety_engine_enabled === false.
//   4. Toggle DB -> true,  GET /config, assert config.safety_engine_enabled === true.
//   5. Restore original value.
//
// Notes:
//   - Test runner does NOT expose SUPABASE_SERVICE_ROLE_KEY, so we mutate
//     farm_settings via the SUPABASE_DB_URL Postgres connection instead of
//     the JS client (RLS would block anon updates).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
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
  try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, json, text };
}

Deno.test("safety engine toggle syncs from DB to ESP32 /config", async () => {
  const picked = await withDb(async (db) => {
    const r = await db.queryObject<{ token: string; farm_id: string }>`
      SELECT dt.token, dt.farm_id::text AS farm_id
      FROM device_tokens dt
      WHERE dt.is_active = true AND dt.farm_id IS NOT NULL
      LIMIT 1
    `;
    if (r.rows.length === 0) throw new Error("No active device token with farm_id");
    return r.rows[0];
  });

  const originalValue = await withDb(async (db) => {
    const r = await db.queryObject<{ v: boolean | null }>`
      SELECT safety_engine_enabled AS v FROM farm_settings WHERE farm_id = ${picked.farm_id}::uuid
    `;
    return (r.rows[0]?.v ?? true) as boolean;
  });

  const setFlag = (val: boolean) =>
    withDb((db) =>
      db.queryArray`
        UPDATE farm_settings SET safety_engine_enabled = ${val}
        WHERE farm_id = ${picked.farm_id}::uuid
      `.then(() => undefined)
    );

  try {
    // ---- Case A: disabled ----
    await setFlag(false);
    const off = await fetchConfig(picked.token);
    assertEquals(off.status, 200, `expected 200, got ${off.status}: ${off.text}`);
    assertEquals(
      off.json?.safety_engine_enabled,
      false,
      "config should report safety_engine_enabled=false after DB toggle off",
    );

    // ---- Case B: enabled ----
    await setFlag(true);
    const on = await fetchConfig(picked.token);
    assertEquals(on.status, 200, `expected 200, got ${on.status}: ${on.text}`);
    assertEquals(
      on.json?.safety_engine_enabled,
      true,
      "config should report safety_engine_enabled=true after DB toggle on",
    );
  } finally {
    await setFlag(originalValue);
  }
});

Deno.test("safety engine /config rejects invalid device token", async () => {
  const res = await fetchConfig("FARM-INVALID-TOKEN-XXXX");
  assertEquals(res.status, 401);
});
