// ════════════════════════════════════════════════════════════════════
// Phase 9 — End-to-end sensor + air-quality alert verification
//
// What this verifies (one round-trip per concern):
//   1. /sensor-data accepts Phase 9 precise telemetry (SHT31, BH1750,
//      ZE03-NH3, SCD41, PMS5003) and persists each column.
//   2. sensor_source heartbeat lands in `device_sensor_inventory`
//      with the correct sensor_model strings.
//   3. `check_air_quality_thresholds` RPC fires and writes alerts to
//      `air_quality_alerts` when CO₂ / PM2.5 / NH3 cross thresholds.
//   4. Legacy DHT22/MQ-135/LDR fields still ingest alongside precise
//      values (backward compatibility).
//
// Test device selection:
//   Picks the most recent active device with secret_version = 0
//   (HMAC not required) so the test stays read-write safe and does
//   not need a device_secret. If no such device exists, the test is
//   skipped with a clear message.
// ════════════════════════════════════════════════════════════════════

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;

if (!SUPABASE_URL || !ANON_KEY || !DB_URL) {
  throw new Error("Missing SUPABASE_URL / publishable key / SUPABASE_DB_URL");
}

const FN = `${SUPABASE_URL}/functions/v1/esp32-api/sensor-data`;

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client(DB_URL);
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

async function pickTestDevice() {
  return withDb(async (db) => {
    const r = await db.queryObject<{
      token: string;
      device_id: string;
      device_name: string;
      user_id: string;
      farm_id: string | null;
    }>`
      SELECT dt.token,
             dt.id::text       AS device_id,
             dt.device_name,
             dt.user_id::text  AS user_id,
             dt.farm_id::text  AS farm_id
      FROM device_tokens dt
      WHERE dt.is_active = true
        AND COALESCE(dt.secret_version, 0) = 0
      ORDER BY dt.created_at DESC NULLS LAST
      LIMIT 1
    `;
    return r.rows[0] ?? null;
  });
}

async function postTelemetry(token: string, body: Record<string, unknown>) {
  const res = await fetch(FN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-token": token,
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

// ────────────────────────────────────────────────────────────────────
Deno.test("Phase 9 — Tier 1+2+3 telemetry persists precise sensor columns", async () => {
  const device = await pickTestDevice();
  if (!device) {
    console.warn("⚠️  No HMAC-free active device found — skipping.");
    return;
  }

  // Construct extreme but realistic payload that should breach all
  // 3 air-quality thresholds (CO2>3000, PM2.5>75, NH3>25).
  const marker = `t9_${Date.now()}`;
  const payload = {
    device_id: device.device_name,
    // Legacy (DHT22 / MQ-135 / LDR) — still required for ingest path
    temperature: 27.5,
    humidity: 62.0,
    ammonia: 410, // raw analog reading
    light_lux: 180,
    // Phase 9 — precise sensors
    temp_precise: 27.42, // SHT31
    humidity_precise: 62.13, // SHT31
    lux_precise: 245.6, // BH1750
    nh3_ppm_precise: 32.5, // ZE03-NH3   → ALERT (>25)
    co2_ppm: 3450, // SCD41        → ALERT (>3000)
    pm25_ugm3: 88.2, // PMS5003      → ALERT (>75)
    pm10_ugm3: 142.1, // PMS5003
    sensor_source: {
      temp: "SHT31",
      humidity: "SHT31",
      light: "BH1750",
      nh3: "ZE03-NH3",
      co2: "SCD41",
      pm25: "PMS5003",
      pm10: "PMS5003",
      _marker: marker,
    },
  };

  const res = await postTelemetry(device.token, payload);
  assertEquals(res.status, 200, `ingest failed: ${res.text}`);

  // Allow trigger / RPC fan-out to settle
  await new Promise((r) => setTimeout(r, 1500));

  await withDb(async (db) => {
    // 1. Precise columns persisted
    const rd = await db.queryObject<{
      temp_precise: number | null;
      humidity_precise: number | null;
      lux_precise: number | null;
      nh3_ppm_precise: number | null;
      co2_ppm: number | null;
      pm25_ugm3: number | null;
      pm10_ugm3: number | null;
      sensor_source: Record<string, unknown> | null;
    }>`
      SELECT temp_precise, humidity_precise, lux_precise,
             nh3_ppm_precise, co2_ppm, pm25_ugm3, pm10_ugm3,
             sensor_source
      FROM sensor_readings
      WHERE user_id = ${device.user_id}::uuid
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
    assertEquals(rd.rows.length, 1, "no sensor_readings row written");
    const row = rd.rows[0];
    assert(row.temp_precise !== null, "temp_precise missing (SHT31)");
    assert(row.humidity_precise !== null, "humidity_precise missing (SHT31)");
    assert(row.lux_precise !== null, "lux_precise missing (BH1750)");
    assert(row.nh3_ppm_precise !== null, "nh3_ppm_precise missing (ZE03-NH3)");
    assertEquals(row.co2_ppm, 3450, "co2_ppm wrong (SCD41)");
    assert((row.pm25_ugm3 ?? 0) > 80, "pm25_ugm3 wrong (PMS5003)");
    assert((row.pm10_ugm3 ?? 0) > 100, "pm10_ugm3 wrong (PMS5003)");
    assertEquals(
      (row.sensor_source as Record<string, string> | null)?._marker,
      marker,
      "sensor_source marker mismatch (heartbeat payload lost)",
    );

    // 2. Sensor inventory heartbeat
    if (device.farm_id) {
      const inv = await db.queryObject<{ sensor_model: string }>`
        SELECT sensor_model FROM device_sensor_inventory
        WHERE device_id = ${device.device_id}::uuid
          AND last_seen_at > now() - interval '5 minutes'
      `;
      const models = new Set(inv.rows.map((r) => r.sensor_model));
      for (const m of ["SHT31", "BH1750", "ZE03-NH3", "SCD41", "PMS5003"]) {
        assert(models.has(m), `inventory missing model ${m} (got ${[...models].join(",")})`);
      }
    }

    // 3. Air quality alerts fired (CO2 + PM2.5 + NH3)
    if (device.farm_id) {
      const al = await db.queryObject<{ alert_type: string; severity: string }>`
        SELECT alert_type, severity
        FROM air_quality_alerts
        WHERE farm_id = ${device.farm_id}::uuid
          AND created_at > now() - interval '5 minutes'
      `;
      const types = new Set(al.rows.map((r) => r.alert_type));
      assert(
        types.has("co2_high") || types.has("co2"),
        `expected CO2 alert, got: ${[...types].join(",")}`,
      );
      assert(
        types.has("pm25_high") || types.has("pm25"),
        `expected PM2.5 alert, got: ${[...types].join(",")}`,
      );
      assert(
        types.has("nh3_high") || types.has("ammonia_high") || types.has("nh3"),
        `expected NH3 alert, got: ${[...types].join(",")}`,
      );
    }
  });
});

// ────────────────────────────────────────────────────────────────────
Deno.test("Phase 9 — Tier 1 only (SHT31+BH1750) ingests cleanly, no AQ alert", async () => {
  const device = await pickTestDevice();
  if (!device) {
    console.warn("⚠️  No HMAC-free active device found — skipping.");
    return;
  }

  const res = await postTelemetry(device.token, {
    device_id: device.device_name,
    temperature: 26.0,
    humidity: 58.0,
    ammonia: 220,
    temp_precise: 26.04,
    humidity_precise: 58.21,
    lux_precise: 410.0,
    sensor_source: { temp: "SHT31", humidity: "SHT31", light: "BH1750" },
  });
  assertEquals(res.status, 200, `Tier-1 ingest failed: ${res.text}`);

  await new Promise((r) => setTimeout(r, 800));

  await withDb(async (db) => {
    const r = await db.queryObject<{ co2_ppm: number | null; pm25_ugm3: number | null }>`
      SELECT co2_ppm, pm25_ugm3 FROM sensor_readings
      WHERE user_id = ${device.user_id}::uuid
      ORDER BY created_at DESC LIMIT 1
    `;
    assertEquals(r.rows[0]?.co2_ppm, null, "co2 should be null on Tier 1");
    assertEquals(r.rows[0]?.pm25_ugm3, null, "pm25 should be null on Tier 1");
  });
});

// ────────────────────────────────────────────────────────────────────
Deno.test("Phase 9 — legacy-only payload (DHT22/MQ-135) still works", async () => {
  const device = await pickTestDevice();
  if (!device) {
    console.warn("⚠️  No HMAC-free active device found — skipping.");
    return;
  }

  const res = await postTelemetry(device.token, {
    device_id: device.device_name,
    temperature: 25.3,
    humidity: 55.0,
    ammonia: 180,
    light_lux: 95,
  });
  assertEquals(res.status, 200, `legacy ingest failed: ${res.text}`);

  await withDb(async (db) => {
    const r = await db.queryObject<{ temperature: number; temp_precise: number | null }>`
      SELECT temperature, temp_precise FROM sensor_readings
      WHERE user_id = ${device.user_id}::uuid
      ORDER BY created_at DESC LIMIT 1
    `;
    assert((r.rows[0]?.temperature ?? 0) > 24, "legacy temperature missing");
    assertEquals(
      r.rows[0]?.temp_precise,
      null,
      "temp_precise must stay null when no SHT31 sent",
    );
  });
});
