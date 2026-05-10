# Phase 2 — Observability

**লক্ষ্য:** "কী ভাঙছে, কেন ভাঙছে, কোথায় ভাঙছে" — ৩০ সেকেন্ডে উত্তর। বর্তমানে একটি device "চুপ" হয়ে গেলে farmer/admin জানে না কেন। edge function fail করলে আলাদা আলাদা log scattered। আমরা একটা **unified observability layer** বানাবো।

---

## কী কী Ship হবে

### 1. Structured Request Log (সব edge function)
এক central table `edge_request_log`:
- `function_name`, `path`, `method`, `status_code`
- `duration_ms`, `device_token_id` (যদি থাকে), `farm_id`, `user_id`
- `request_id` (UUID), `error_code`, `error_message`
- `payload_size_bytes`, `response_size_bytes`
- Auto-pruned 30 days

প্রতিটি edge function-এ একটা ছোট `withObservability()` wrapper — শুরু/শেষে log করবে।

### 2. Device Heartbeat Health Metrics
নতুন table `device_health_metrics` (rolling 24h):
- `device_token_id`, `bucket_hour`
- `sync_count`, `signature_failures`, `nonce_reuse_count`, `rate_limited_count`
- `avg_latency_ms`, `p95_latency_ms`
- `sensor_gap_seconds_max` (longest silence in that hour)
- `restart_count`

`esp32-api` রিকোয়েস্ট আসলে aggregate করে এখানে upsert।

### 3. Command Lifecycle Trace
`device_commands` row-এ ইতিমধ্যে আছে: created → queued → delivered → acked। নতুন কী যোগ:
- `dispatched_at` (cloud → device fetch হওয়ার মুহূর্ত)
- `latency_to_device_ms`, `latency_to_ack_ms`
- View `command_trace_summary` — গড় latency per farm/per device

### 4. SLO Dashboard (Admin)
নতুন tab `Admin → Observability`:
- **Live Status:** কতগুলো device online/offline/degraded (last 5 min sync)
- **Error Rate:** ৪০৪/৫০০/auth-fail per function (last 1h, 24h, 7d charts)
- **Latency:** p50/p95/p99 per endpoint
- **Top Failing Devices:** signature failure / rate limit hit
- **Sensor Gaps:** কোন device-এর data missing > 5 min
- **Command Backlog:** unacked commands > 60 sec

Recharts ব্যবহার করে।

### 5. Farmer-facing "Connection Quality" Card
Dashboard-এ ছোট badge:
- 🟢 চমৎকার (last sync < 30s, no errors)
- 🟡 ধীর (sync 30-120s OR mild error)
- 🔴 সমস্যা (no sync > 5 min OR repeated auth fail)
- ক্লিক করলে detail sheet — last 1h timeline

### 6. Anomaly Alerts (Background)
নতুন edge function `observability-anomaly-detector` (cron, every 5 min):
- Device offline > 10 min → push notification + audit log
- Signature failure spike (>5 in 5 min) → admin alert (potential attack)
- Sensor reading frozen (same value 30+ min) → farmer alert
- Latency p95 > 3s sustained → admin alert

Reuses existing `useSmartAlerts` notification pipeline।

### 7. Health Self-Check Endpoint
`esp32-api/health` (GET, public, light auth):
- Returns `{ ok, db_latency_ms, version, time }`
- ESP32 অপশনালি ১০ মিনিটে একবার ping করে নিজের connectivity verify করতে পারে

---

## Database Migrations

```text
edge_request_log (new):
  id, function_name, path, method, status_code, duration_ms,
  device_token_id, farm_id, user_id, request_id, error_code,
  error_message, payload_size_bytes, response_size_bytes, created_at

device_health_metrics (new):
  device_token_id, farm_id, bucket_hour,
  sync_count, signature_failures, nonce_reuse_count, rate_limited_count,
  avg_latency_ms, p95_latency_ms, sensor_gap_seconds_max,
  restart_count, updated_at
  PRIMARY KEY (device_token_id, bucket_hour)

device_commands:
  + dispatched_at        timestamptz
  + latency_to_device_ms int
  + latency_to_ack_ms    int

VIEW command_trace_summary (read-only, RLS via underlying table)

Cron jobs (pg_cron):
  - cleanup_edge_request_log()       hourly  (>30 days)
  - cleanup_device_health_metrics()  daily   (>90 days)
  - observability-anomaly-detector   */5 *   (HTTP call to edge fn)
```

RLS:
- `edge_request_log`: super_admin select; service_role insert
- `device_health_metrics`: farm members select via `user_can_access_farm`; service_role write

---

## Code Changes

```text
NEW edge functions:
  supabase/functions/observability-anomaly-detector/index.ts
  supabase/functions/_shared/observability.ts   (withObservability wrapper)

EDIT edge functions (add wrapper):
  esp32-api, provision-device, rotate-device-secret,
  safety-engine, automation-engine, device-monitor

NEW UI:
  src/components/admin/ObservabilityDashboard.tsx
  src/components/admin/ObservabilityCharts.tsx
  src/components/control/ConnectionQualityCard.tsx
  src/hooks/useDeviceHealthMetrics.ts
  src/hooks/useEdgeFunctionMetrics.ts

EDIT:
  src/pages/AdminPage.tsx               (new "Observability" tab)
  src/pages/Dashboard.tsx               (mount ConnectionQualityCard)
  supabase/functions/esp32-api/index.ts (latency capture + heartbeat metrics)
```

---

## Rollout Order

1. **Migrations** (additive, safe)
2. **`_shared/observability.ts`** wrapper + apply to `esp32-api` first
3. **device_health_metrics** aggregation logic in `esp32-api`
4. **Admin Observability Dashboard** (read-only, no impact)
5. **ConnectionQualityCard** on farmer dashboard
6. **Anomaly detector** edge function + pg_cron schedule
7. **Apply wrapper to remaining edge functions** (gradual)
8. **Health self-check endpoint** + optional ESP32 ping

প্রতিটি step আলাদা ship — কেউ break হলেও কেবল observability UI গায়েব হবে, hardware/automation অক্ষত।

---

## Phase 2 Out-of-Scope (Phase 3+)

- Full distributed tracing (OpenTelemetry) — overkill এখন
- External APM (Datadog/Sentry) integration
- Real-time WebSocket log stream for farmers
- Per-tenant observability quotas/billing

---

## অনুমোদনের পর

Migration ফাইল লিখব → অনুমোদন → শেষে শুধু code changes (single message)। সব phase 2 mvp ship হতে আনুমানিক **৩-৪টা commit batch**।
