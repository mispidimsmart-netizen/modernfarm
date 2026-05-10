# Phase 3 — Reliability & Offline-first

**লক্ষ্য:** ইন্টারনেট ১ ঘণ্টা গেলেও farm অক্ষত। ESP32 কখনো command miss করবে না, কখনো duplicate apply করবে না। PWA-তে farmer যা কিছু পরিবর্তন করেন (manual override, schedule, batch entry) — অফলাইনে queue হয়, online এলে auto-sync।

---

## যা Ship হবে (৭টি কম্পোনেন্ট)

### 1. Command Idempotency (সবচেয়ে জরুরি)
সমস্যা: এখন যদি ESP32 command apply করে কিন্তু ack TCP-এ হারায়, cloud আবার পাঠায় → relay দুইবার toggle। সমাধান:
- `device_commands.client_request_id` (uuid) যোগ — ESP32 ack করার সময় পাঠায়
- ESP32-side: প্রতি command-এর `id` (uuid) NVS-এ সর্বশেষ ৫০টি save → already-applied হলে শুধু ack পাঠায়, action skip
- Cloud-side: ack আসলে status=`acked` সেট, future fetch থেকে বাদ

### 2. ESP32 Offline Sensor Buffer
সমস্যা: WiFi গেলে ১০ মিনিটের sensor data হারায়। সমাধান:
- ESP32 NVS-এ ring buffer (১২০ entries × ~৩০ bytes = 4 KB) → প্রতি ৫ সেকেন্ডে temperature/humidity/ammonia push
- WiFi এলে `/sensor-batch` endpoint-এ একসাথে flush (max 50/request)
- Cloud `esp32-api/sensor-batch` (নতুন) — array গ্রহণ, `recorded_at` original timestamp ব্যবহার

### 3. PWA Offline Mutation Queue (extend `useOfflineSync`)
ইতিমধ্যে আছে: read cache। নতুন:
- `useOfflineMutationQueue` — IndexedDB-তে pending writes (manual_override, schedule edit, batch entry, expense)
- প্রতিটি mutation-এ: `id` (uuid), `endpoint`, `payload`, `created_at`, `retry_count`, `max_age_minutes`
- Online ফিরলে FIFO replay; conflict হলে user-facing toast: "৩টি পরিবর্তন server-এ পাঠানো হয়েছে / ১টি ব্যর্থ"
- TTL: ২৪ ঘণ্টার পর expire (stale override ব্লক)

### 4. Edge Function Retry Wrapper
সমস্যা: cloud transient errors → user-facing failure। সমাধান:
- Frontend: শুধুমাত্র safe (idempotent) edge function call-এ exponential backoff (200ms → 400 → 800, max 3)
- Conditions: 502/503/504/network-error → retry; 4xx → no retry; mutation-with-no-idempotency-key → no retry

### 5. Heartbeat Quality Score
device_health_metrics-এ ইতিমধ্যে আছে। নতুন `connection_quality_score` (0-100):
- ESP32 প্রতি sync-এ পাঠাবে: `wifi_rssi`, `consecutive_failed_syncs`, `last_sync_gap_seconds`
- Cloud calculates: rssi >= -65 + gap < 60s + zero failures = 100; এ থেকে কমে গেলে penalize
- ConnectionQualityCard-এ ১-১০০ score show + 🔥 উন্নতির পরামর্শ

### 6. Failsafe Mode Auto-Recovery
সমস্যা: ESP32 ফেইলসেফে গেলে cloud reconnect-এর পরও farmer manually exit করতে হয়। সমাধান:
- `device_health.failsafe_recovery_attempts` (int)
- ESP32: cloud sync ৩ বার সফল হলে auto-exit failsafe (cached_settings_version match হলে)
- কিন্তু: যদি sensor reading সাম্প্রতিক invariant violate করে → failsafe maintain (safety > convenience)

### 7. "Last Known Good" Cache (PWA)
সমস্যা: pure offline-এ Dashboard খালি দেখায়। সমাধান:
- React-query persistor ইতিমধ্যে আছে (useOfflineSensorCache) — extend to: device_health, alerts, schedules, batches
- Stale data-তে subtle "📡 অফলাইন (শেষ আপডেট: ২ মি আগে)" ribbon
- Mutation gated: offline-এ লেখা যাবে কিন্তু button-এ "queued" badge

---

## Database Migrations

```text
device_commands:
  + client_request_id  uuid     -- ESP32 echoes back for ack matching
  + retry_count        int      -- how many times cloud re-served this
  CREATE UNIQUE INDEX ON device_commands (client_request_id) WHERE client_request_id IS NOT NULL

device_health:
  + connection_quality_score    int CHECK (0..100)
  + failsafe_recovery_attempts  int DEFAULT 0
  + last_offline_buffer_flush   timestamptz

NEW TABLE device_offline_buffer_log (audit, optional):
  id, device_token_id, farm_id, batch_size, oldest_ts, newest_ts,
  flushed_at, accepted_count, rejected_count

NEW RPC accept_sensor_batch(_device_token_id, _readings jsonb)
  - Bulk-insert sensor_readings with ON CONFLICT (device_token_id, recorded_at) DO NOTHING
  - Returns accepted_count
```

---

## Edge Function Changes

```text
NEW:
  esp32-api/sensor-batch   (POST array of readings, signed)
  
EDIT:
  esp32-api/commands fetch:
    + return commands with status='pending' AND id NOT IN (last_acked_ids)
    + on ack: match by client_request_id OR command_id
  
  esp32-api/sync (existing):
    + accept consecutive_failed_syncs, last_sync_gap_seconds
    + compute connection_quality_score, write to device_health
```

---

## ESP32 Firmware Changes (`public/esp32-industrial.ino`)

```text
NEW NVS keys:
  cmd_history (last 50 applied command UUIDs)
  sensor_buffer_v2 (ring buffer of structs)
  consecutive_failed_syncs (int)
  
NEW functions:
  bool isCommandAlreadyApplied(uuid)
  void recordAppliedCommand(uuid)
  void bufferSensorReading(temp, hum, nh3, ts)
  void flushSensorBuffer()  -- on successful WiFi reconnect

LOOP changes:
  - failed sync increments consecutive counter
  - successful sync: if counter >= 3 AND failsafe_mode AND no recent invariant breach → exit failsafe
  - sensor buffer flush trigger: WiFi reconnect OR buffer >= 50
```

---

## UI Changes

```text
NEW:
  src/hooks/useOfflineMutationQueue.ts
  src/components/OfflineMutationBadge.tsx   (header pill: "৩টি queued")

EDIT:
  src/hooks/useOfflineSync.ts               (extend to mutation queue API)
  src/components/control/ConnectionQualityCard.tsx
    + show connection_quality_score (0-100) ring + improvement tips
  src/lib/esp32Api.ts
    + retry wrapper for safe GETs (status, sync)
  src/components/OfflineIndicator.tsx
    + "Last sync 2m ago" stale ribbon when prolonged offline
```

---

## Rollout Order

1. **DB migration** — additive columns + new RPC + new table
2. **`esp32-api/sensor-batch`** endpoint + idempotent commands fetch
3. **Firmware patch** (`esp32-industrial.ino`) — buffer + idempotency + auto-recovery
4. **PWA mutation queue** (`useOfflineMutationQueue`)
5. **UI:** ConnectionQualityCard score + OfflineMutationBadge
6. **Retry wrapper** in `esp32Api.ts`
7. **Test + verify** — কেউ break হলে previous phase-গুলো অক্ষত

---

## Phase 3 Out-of-Scope

- Multi-region failover (Phase 4+)
- ESP32 mesh / fallback radios
- Cellular fallback automation (manual SMS already works)
- Conflict resolution UI for divergent offline edits (auto-prefer server-wins)

---

## Test Strategy

- ESP32 simulator: 5 min WiFi off → reconnect → verify all sensor readings present
- Browser: DevTools Offline → toggle relay → confirm queued → online → applied
- Idempotency: send same command 3× → only 1 relay action
- Failsafe recovery: trigger failsafe, restore network → auto-exit within 30s

---

## অনুমোদনের পর

আগের ফেজগুলোর মতো একই pattern: migration → অনুমোদন → তারপর single batch-এ code changes ship। আনুমানিক **৩-৪টা commit batch**।
