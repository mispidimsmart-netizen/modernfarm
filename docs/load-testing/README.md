# Phase 7 — Load Testing

## Goal
Validate FarmEye backend can sustain **10,000 concurrent ESP32 devices** syncing
sensor data every ~10s (≈ 1,000 req/s steady-state).

## Tooling
- [k6](https://k6.io) — `brew install k6` or `nix run nixpkgs#k6`

## Run

```bash
k6 run \
  -e SUPA_URL=https://hbwfuvqrfgtefozajyfu.supabase.co \
  -e DEVICE_TOKEN=FARM-XXXX-XXXX-XXXX \
  -e ANON_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  docs/load-testing/k6-esp32-sync.js
```

## Thresholds (PASS criteria)
| Metric | Target |
|---|---|
| `sync_latency_ms` p95 | < 800 ms |
| `sync_latency_ms` p99 | < 2000 ms |
| `errors` rate | < 2 % |

## Recording results
After each run, paste the k6 summary JSON into the **Load Tests** card in
Admin → System, or insert manually:

```sql
INSERT INTO load_test_runs (scenario, target_vus, duration_seconds,
  total_requests, error_rate_pct, p50_ms, p95_ms, p99_ms, max_ms, notes)
VALUES ('esp32-sync', 10000, 1500, 1500000, 0.4, 220, 640, 1430, 4200,
        'Pre-launch baseline');
```

## Platform-managed scale items
The following are handled by Lovable Cloud infrastructure (no code change here):

- **Multi-region edge functions** — Lovable Cloud edge functions auto-deploy globally
- **Connection pooling (PgBouncer)** — managed by platform; transaction pooler on `:6543`
- **CDN for static assets / firmware blobs** — `ota-firmware` responses include
  `Cache-Control` + ETag; Lovable CDN serves them at the edge
- **Cross-region backup / DR** — Lovable Cloud daily PITR snapshots
- **Read replicas** — available on higher Cloud plans; toggle in Cloud → Advanced

If you outgrow the current instance, upgrade in:
**Backend → Lovable Cloud → Advanced settings → Upgrade instance**.
