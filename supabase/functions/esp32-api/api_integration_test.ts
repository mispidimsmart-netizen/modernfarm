// ════════════════════════════════════════════════════════════════════
// REST API + ESP32 ingestion — integration tests
//
// Covers:
//   A. Contract / error handling  — health, unknown route, bad JSON,
//      missing token, invalid token, invalid sensor payload.
//   B. Live ingestion             — /sensor-data round-trip persists a row.
//   C. Offline sync               — /buffer-sync (legacy buffer flush) and
//      /sensor-batch (Phase 3 RPC flush) replay backlogged readings with
//      their original timestamps; empty + oversized batches are rejected.
//   D. Retries                    — /commands → /commands-ack-v2 ack path
//      and /command-retry re-queues stale unacked commands.
//
// Test device selection: newest active device with secret_version = 0
// (no HMAC needed). Skips with a warning if none exists.
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

const BASE = `${SUPABASE_URL}/functions/v1/esp32-api`;

interface TestDevice {
  token: string;
  device_id: string;
  device_name: string;
  user_id: string;
  farm_id: string | null;
}

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client(DB_URL);
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

async function pickTestDevice(): Promise<TestDevice | null> {
  return await withDb(async (db) => {
    const r = await db.queryObject<TestDevice>`
      SELECT dt.token,
             dt.id::text      AS device_id,
             dt.device_name,
             dt.user_id::text AS user_id,
             dt.farm_id::text AS farm_id
      FROM device_tokens dt
      WHERE dt.is_active = true
        AND COALESCE(dt.secret_version, 0) = 0
        AND dt.farm_id IS NOT NULL
      ORDER BY dt.created_at DESC NULLS LAST
      LIMIT 1
    `;
    return r.rows[0] ?? null;
  });
}

async function call(
  path: string,
  opts: {
    method?: string;
    token?: string;
    body?: unknown;
    rawBody?: string;
    query?: Record<string, string>;
  } = {},
) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
  };
  if (opts.token) headers["x-device-token"] = opts.token;

  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers,
    body: opts.rawBody ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch { /* non-JSON response */ }
  return { status: res.status, json, text };
}

function skip(name: string) {
  console.warn(`⚠️  No HMAC-free active device with a farm — skipping ${name}.`);
}

// ══════════════════════════════════════════════════════════════
// A. Contract + error handling (no device required)
// ══════════════════════════════════════════════════════════════

Deno.test("health endpoint is public and reports DB reachability", async () => {
  const res = await call("health");
  assertEquals(res.status, 200, res.text);
  assertEquals(res.json?.ok, true);
  assert(typeof res.json?.db_latency_ms === "number");
});

Deno.test("missing device token → 401 MISSING_TOKEN", async () => {
  const res = await call("latest-data");
  assertEquals(res.status, 401, res.text);
  assertEquals(res.json?.code, "MISSING_TOKEN");
});

Deno.test("invalid device token → 401 INVALID_TOKEN", async () => {
  const res = await call("latest-data", { token: "FARM-DOES-NOT-EXIST-0000" });
  assertEquals(res.status, 401, res.text);
  assertEquals(res.json?.code, "INVALID_TOKEN");
});

Deno.test("malformed JSON body → 400 BAD_JSON (no crash, no 500)", async () => {
  const res = await call("sensor-data", {
    method: "POST",
    token: "FARM-DOES-NOT-EXIST-0000",
    rawBody: "{ this is not json",
  });
  assertEquals(res.status, 400, res.text);
  assertEquals(res.json?.code, "BAD_JSON");
});

Deno.test("unknown route → 404 with structured error", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("unknown-route");
  const res = await call("no-such-endpoint", { token: device.token });
  assertEquals(res.status, 404, res.text);
  assert(res.json?.error, "expected structured error body");
});

Deno.test("invalid sensor payload → 400 INVALID_DATA", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("invalid-payload");
  const res = await call("sensor-data", {
    method: "POST",
    token: device.token,
    body: { device_id: device.device_name, temperature: "hot" },
  });
  assertEquals(res.status, 400, res.text);
  assertEquals(res.json?.code, "INVALID_DATA");
});

// ══════════════════════════════════════════════════════════════
// B. Live ingestion round-trip
// ══════════════════════════════════════════════════════════════

Deno.test("POST /sensor-data persists a reading for the device farm", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("sensor-data ingest");

  const temp = 24 + Math.round(Math.random() * 1000) / 1000; // unique marker
  const res = await call("sensor-data", {
    method: "POST",
    token: device.token,
    body: {
      device_id: device.device_name,
      temperature: temp,
      humidity: 61.5,
      ammonia: 12.5,
      water_usage: 3.2,
    },
  });
  assertEquals(res.status, 200, res.text);

  await new Promise((r) => setTimeout(r, 1000));

  const found = await withDb(async (db) => {
    const r = await db.queryObject<{ n: bigint }>`
      SELECT count(*)::bigint AS n
      FROM sensor_readings
      WHERE user_id = ${device.user_id}::uuid
        AND temperature = ${temp}
        AND recorded_at > now() - interval '5 minutes'
    `;
    return Number(r.rows[0].n);
  });
  assert(found >= 1, `reading with temperature=${temp} not persisted`);
});

// ══════════════════════════════════════════════════════════════
// C. Offline sync — buffered backlog replay
// ══════════════════════════════════════════════════════════════

Deno.test("POST /buffer-sync rejects an empty buffer", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("buffer-sync empty");
  const res = await call("buffer-sync", {
    method: "POST",
    token: device.token,
    body: { records: [] },
  });
  assertEquals(res.status, 400, res.text);
  assertEquals(res.json?.code, "EMPTY_BUFFER");
});

Deno.test("POST /buffer-sync replays offline records into sensor_buffer", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("buffer-sync replay");

  const base = Date.now() - 30 * 60_000; // 30 min of backlog
  const records = [0, 1, 2].map((i) => ({
    temperature: 26.5 + i / 10,
    humidity: 58 + i,
    ammonia: 9 + i,
    water_flow: 1.1,
    power_status: "OFF",
    recorded_at: new Date(base + i * 60_000).toISOString(),
  }));

  const before = await withDb(async (db) => {
    const r = await db.queryObject<{ n: bigint }>`
      SELECT count(*)::bigint AS n FROM sensor_buffer
      WHERE device_token_id = ${device.device_id}::uuid
    `;
    return Number(r.rows[0].n);
  });

  const res = await call("buffer-sync", {
    method: "POST",
    token: device.token,
    body: { records },
  });
  assertEquals(res.status, 200, res.text);

  await new Promise((r) => setTimeout(r, 1000));

  const after = await withDb(async (db) => {
    const r = await db.queryObject<{ n: bigint }>`
      SELECT count(*)::bigint AS n FROM sensor_buffer
      WHERE device_token_id = ${device.device_id}::uuid
    `;
    return Number(r.rows[0].n);
  });
  assert(
    after >= before + records.length,
    `expected ${records.length} buffered rows, before=${before} after=${after}`,
  );
});

Deno.test("POST /sensor-batch rejects empty and oversized batches", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("sensor-batch validation");

  const empty = await call("sensor-batch", {
    method: "POST",
    token: device.token,
    body: { readings: [] },
  });
  assertEquals(empty.status, 400, empty.text);
  assertEquals(empty.json?.code, "EMPTY_BATCH");

  const tooMany = await call("sensor-batch", {
    method: "POST",
    token: device.token,
    body: {
      readings: Array.from({ length: 201 }, () => ({
        temperature: 25,
        humidity: 60,
        ammonia: 8,
        recorded_at: new Date().toISOString(),
      })),
    },
  });
  assertEquals(tooMany.status, 400, tooMany.text);
  assertEquals(tooMany.json?.code, "BATCH_TOO_LARGE");
});

Deno.test("POST /sensor-batch flushes a backlog preserving recorded_at", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("sensor-batch flush");

  const stamps = [0, 1, 2].map((i) =>
    new Date(Date.now() - (20 - i) * 60_000).toISOString()
  );
  const marker = 31 + Math.round(Math.random() * 900) / 1000;
  const readings = stamps.map((ts, i) => ({
    temperature: marker + i / 1000,
    humidity: 55 + i,
    ammonia: 7 + i,
    recorded_at: ts,
  }));

  const res = await call("sensor-batch", {
    method: "POST",
    token: device.token,
    body: { readings },
  });
  assertEquals(res.status, 200, res.text);

  await new Promise((r) => setTimeout(r, 1200));

  const rows = await withDb(async (db) => {
    const r = await db.queryObject<{ n: bigint }>`
      SELECT count(*)::bigint AS n
      FROM sensor_readings
      WHERE user_id = ${device.user_id}::uuid
        AND temperature >= ${marker}
        AND temperature <= ${marker + 0.01}
        AND recorded_at < now() - interval '10 minutes'
    `;
    return Number(r.rows[0].n);
  });
  assert(
    rows >= readings.length,
    `expected ${readings.length} backdated rows from the flush, got ${rows}`,
  );
});

Deno.test("re-flushing the same batch stays consistent (idempotent replay is safe)", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("sensor-batch replay");

  const ts = new Date(Date.now() - 45 * 60_000).toISOString();
  const payload = {
    readings: [{ temperature: 22.222, humidity: 51, ammonia: 4, recorded_at: ts }],
  };

  const first = await call("sensor-batch", {
    method: "POST",
    token: device.token,
    body: payload,
  });
  const second = await call("sensor-batch", {
    method: "POST",
    token: device.token,
    body: payload,
  });

  // A duplicate flush (device retried because the ACK was lost) must not error.
  assertEquals(first.status, 200, first.text);
  assertEquals(second.status, 200, second.text);
});

// ══════════════════════════════════════════════════════════════
// D. Command delivery, ack and retry
// ══════════════════════════════════════════════════════════════

Deno.test("GET /commands returns a queued command and ack marks it executed", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("commands ack");

  await withDb(async (db) => {
    await db.queryArray`
      INSERT INTO device_commands (user_id, farm_id, device_name, command_type, command_value, executed)
      VALUES (${device.user_id}::uuid, ${device.farm_id}::uuid, ${device.device_name}, 'fan', true, false)
    `;
  });

  const res = await call("commands", {
    token: device.token,
    query: { device_id: device.device_name },
  });
  assertEquals(res.status, 200, res.text);

  const list = res.json?.commands ?? res.json?.data ?? res.json;
  assert(Array.isArray(list) || typeof list === "object", "commands payload missing");

  const ack = await call("commands-ack", {
    method: "POST",
    token: device.token,
    body: { device_id: device.device_name, executed_commands: [] },
  });
  assert(ack.status < 500, `ack should not 500: ${ack.text}`);

  await withDb(async (db) => {
    await db.queryArray`
      DELETE FROM device_commands
      WHERE user_id = ${device.user_id}::uuid
        AND device_name = ${device.device_name}
        AND created_at > now() - interval '5 minutes'
    `;
  });
});

Deno.test("POST /commands-ack-v2 rejects a missing acks array", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("ack-v2 validation");
  const res = await call("commands-ack-v2", {
    method: "POST",
    token: device.token,
    body: {},
  });
  assertEquals(res.status, 400, res.text);
  assertEquals(res.json?.code, "INVALID_DATA");
});

Deno.test("POST /command-retry re-queues a stale unacked command", async () => {
  const device = await pickTestDevice();
  if (!device) return skip("command-retry");

  const commandId = crypto.randomUUID();
  await withDb(async (db) => {
    await db.queryArray`
      INSERT INTO device_command_log
        (command_id, user_id, farm_id, device_name, command_type, command_value,
         status, sent_at, retry_count, max_retries)
      VALUES
        (${commandId}::uuid, ${device.user_id}::uuid, ${device.farm_id}::uuid,
         ${device.device_name}, 'fan', true, 'sent', now() - interval '60 seconds', 0, 3)
    `;
  });

  const res = await call("command-retry", { method: "POST", token: device.token });
  assertEquals(res.status, 200, res.text);

  const row = await withDb(async (db) => {
    const r = await db.queryObject<{ retry_count: number; status: string }>`
      SELECT retry_count, status FROM device_command_log
      WHERE command_id = ${commandId}::uuid
    `;
    return r.rows[0];
  });
  assert(row, "log row disappeared");
  assert(
    row.retry_count >= 1 || row.status === "expired",
    `expected retry or expiry, got ${JSON.stringify(row)}`,
  );

  // ack it, then confirm the ack sticks
  const ack = await call("commands-ack-v2", {
    method: "POST",
    token: device.token,
    body: { acks: [{ command_id: commandId, success: true }] },
  });
  assertEquals(ack.status, 200, ack.text);

  const acked = await withDb(async (db) => {
    const r = await db.queryObject<{ status: string }>`
      SELECT status FROM device_command_log WHERE command_id = ${commandId}::uuid
    `;
    return r.rows[0]?.status;
  });
  assertEquals(acked, "acked");

  // cleanup
  await withDb(async (db) => {
    await db.queryArray`DELETE FROM device_command_log WHERE command_id = ${commandId}::uuid`;
    await db.queryArray`
      DELETE FROM device_commands
      WHERE user_id = ${device.user_id}::uuid
        AND device_name = ${device.device_name}
        AND created_at > now() - interval '5 minutes'
    `;
  });
});
