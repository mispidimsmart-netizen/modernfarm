# Phase 6: Scalability & Performance

**লক্ষ্য**: Dashboard load <1s, sensor query <200ms, 10k+ readings/farm/day স্কেল করা। সম্পূর্ণ additive — কোনো existing table/API ভাঙা হবে না।

## 1. Database Optimization

### a. `sensor_readings` Partitioning (monthly)
- নতুন parent table `sensor_readings_partitioned` (RANGE on `recorded_at`)
- প্রতি মাসের জন্য child partition auto-create (pg_cron monthly)
- Existing `sensor_readings` অক্ষত — নতুন writes dual-write trigger দিয়ে partitioned-এ যাবে (১ মাস পর cutover)
- পুরোনো partition (>6 মাস) auto-detach + archive

### b. Composite Indexes (additive)
- `sensor_readings (farm_id, recorded_at DESC)` — dashboard query
- `sensor_readings (shed_id, recorded_at DESC)` — shed view
- `alerts (farm_id, acknowledged, created_at DESC)` — alerts page
- `device_commands (device_token_id, executed_at) WHERE executed_at IS NULL` — pending commands
- `expenses (farm_id, expense_date DESC)`, `income (farm_id, income_date DESC)` — finance reports

### c. Materialized Views
- `farm_daily_rollup_mv` — দৈনিক avg/min/max temp, humidity, ammonia, mortality, feed
- `farm_health_score_mv` — সর্বশেষ HSI + 24h trend
- pg_cron দিয়ে প্রতি ১৫ মিনিটে refresh
- Dashboard প্রথমে MV থেকে পড়বে → instant load

### d. Query Functions
- `get_farm_dashboard_snapshot(_farm_id)` — single RPC, সব dashboard data এক call-এ
- `get_sensor_history(_farm_id, _hours)` — pre-aggregated buckets (1h/6h/24h)

## 2. Edge Caching & API

### a. Edge Function: `dashboard-snapshot`
- `Cache-Control: public, max-age=30` headers
- Stale-while-revalidate ৩০s
- Returns: latest sensor + alerts count + device status + flock_info → ১ network call

### b. React Query Tuning
- `staleTime` increase: dashboard 30s, history 5m, settings 10m
- `gcTime` 30m (memory)
- Prefetch on hover for navigation
- Suspense boundaries প্রতি page-এ

## 3. Frontend Performance

### a. Code Splitting
- Route-level `React.lazy` (Auth, Settings, Reports, Admin pages)
- Recharts → dynamic import (heavy ~200KB)
- Date-fns → modular imports

### b. Component Optimization
- `React.memo` for SensorCard, AlertCard, ShedCard
- `useMemo` for chart data transforms
- Virtual scrolling (`@tanstack/react-virtual`) for AlertsPage list (>50 rows)

### c. Bundle Audit
- Vite build analyzer report → `/mnt/documents/bundle-report.html`
- Tree-shake unused shadcn components

## 4. Realtime Throttling
- Dashboard subscription debounce: 2s (currently instant → repaints)
- Sensor channel: only subscribe to current farm's shed
- Disconnect on tab hidden (`visibilitychange`)

## 5. Monitoring (additive)
- New table `performance_metrics` — page load times, query duration (sampled 5%)
- Edge function `record-perf-metric` (fire-and-forget)
- Admin dashboard: p50/p95/p99 latency per route

## Out-of-scope (Phase 7+)
- Read replicas, CDN for assets, service worker offline cache, WebAssembly chart rendering

## Rollout Order
1. Composite indexes (immediate win, zero risk)
2. Materialized views + cron refresh
3. `get_farm_dashboard_snapshot` RPC + dashboard refactor
4. React Query tuning + route-level lazy loading
5. Realtime throttling
6. Partitioning (last — needs careful cutover)
7. Performance monitoring table

প্রতিটি step-এ before/after metrics নেব। Approve করলে step 1-3 (DB layer) দিয়ে শুরু করব।
