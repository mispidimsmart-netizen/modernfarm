# FarmEye

Bengali-first poultry farm automation: farmers monitor sheds, control fans/heaters/foggers/lights and log daily production from a mobile web app, while ESP32 controllers keep the shed safe on their own.

## Run & Operate

- `npm run dev` — run the FarmEye web app (Vite, port 8080)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: React 18 + Vite 5 + Tailwind + shadcn, Bengali UI, Teal Green `#1F7A3E`, Nikosh font
- Backend: Lovable Cloud (Postgres, Auth, Edge Functions, Storage) with RLS
- API: Express 5; DB: PostgreSQL + Drizzle ORM; Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec); Build: esbuild (CJS bundle)
- Firmware: Arduino/ESP32 sketch `public/esp32-industrial.ino` (mirrored at `artifacts/farmeye/public/esp32-industrial.ino`)

## Where things live

- Firmware SSOT: `public/esp32-industrial.ino` — current version `8.8.0-manual-absolute` (`FIRMWARE_VERSION`, line ~152). Keep the `artifacts/farmeye/public/` copy byte-identical.
- Firmware generator: `artifacts/farmeye/src/components/device/codegen/*` (`firmwareBuilder.ts` patches the template, `VersionSelectors.tsx` shows the version)
- Guide/version metadata: `artifacts/farmeye/src/data/installationVersionMap.ts`, `installationGuide.ts`, `fluxBom.ts`
- Mode gating: `supabase/functions/_shared/mode-precedence.ts` (`evaluateModeGate`), app-side `src/lib/controlModeGating.ts`
- Edge functions: `supabase/functions/esp32-api/*`, `automation-engine/*`, `ota-firmware-v8`
- Settings UI: `artifacts/farmeye/src/components/settings/**` (device, safety engine, worker PIN, WiFi change)

## Architecture decisions

- Hardware-as-source-of-truth: the board owns final relay states; cloud writes only `desired_*` columns through `evaluateModeGate()` and the UI reads `safety_status`.
- MANUAL mode is absolute (v8.8.0): the board never touches relays, the safety engine has no role, and the safety-engine toggle + history cards are hidden; siren and app alerts still fire on danger.
- Sticky mode: manual mode and relay intent persist in NVS (`mode_state`) across power loss, WiFi loss, sensor failure and reboots.
- Board-side hardware invariants (≥42 °C hard floor, heater interlock, sensor-fail ventilation, ESM) apply in AUTO mode only.
- Roles are stored in `user_roles` (never on profiles) with SECURITY DEFINER helpers; DB triggers keep `farm_members`/`farms.owner_id` in sync.
- Device traffic is HMAC-signed and commands use the lease protocol; unsigned posts are rejected (`legacy_unsigned_rejected`).

## Product

- Live shed dashboard (temp, humidity, NH₃, water, relay states, HSI/safety status)
- AUTO automation rules + thresholds, lighting schedule, batch-scoped finance and daily logs
- Per-farm firmware generator with token/secret injection, WiFi self-service (board hotspot + in-app WiFi change)
- Multi-farm, multi-org admin panel with 4 roles, soft delete/restore, role editor and role-sync tests

## User preferences

- Current development scope is FarmEye automation software V8 only.
- Treat V10 as a separate beta version. Do not modify, migrate, test, refactor, or otherwise work on V10 code, firmware, configuration, or behavior unless the user explicitly asks to begin V10 work.
- UI copy is Bengali; Nexiot Labs branding and years stay in English.

## Gotchas

- Bump `FIRMWARE_VERSION`, the sketch header banner, `VersionSelectors.tsx` and `installationVersionMap.ts` together, then re-sync the `artifacts/farmeye/public/` copy.
- `device_commands` has no `shed_id`; sensor data is in `sensor_readings` (not `sensor_logs`).
- Every new public table needs GRANTs alongside RLS policies, or runtime calls fail with permission errors.
- `provision_device_secret` needs `search_path = public, extensions` (pgcrypto lives in `extensions`).
- Schema changes must be additive — never overwrite existing tables or APIs used by live farms.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
