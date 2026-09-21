# FarmEye — Poultry Farm IoT Automation (v8)

Bengali-first web app + ESP32 controller firmware for layer/broiler poultry farms in Bangladesh.

- **Live app**: https://farmeye.pro.bd (also https://modernfarm.pro.bd, https://farmeye.lovable.app)
- **Current firmware**: `v8.8.0-manual-absolute` (`public/esp32-industrial.ino`)
- **Scope**: v8 only. v10 is a paused beta — do not modify without an explicit request.

## Hardware

- ESP32-WROOM-32 **38-pin DevKit V1** only (WROVER not supported)
- 8-channel relay board (exhaust fan, circulation fan, ceiling fan, heater, fogger, sprinkler, light, alarm)
- DHT22 ×2, MQ-137 (ammonia), LDR, optional ILI9341 TFT display (read-only status screen), optional GSM module
- Firmware is generated per farm from **Settings → Device tab** (token + farm/shed id + HMAC device secret are injected automatically)

## Control model

Hardware is the source of truth: the board decides final relay states, the app/cloud only writes `desired_*` values through the mode gate (`evaluateModeGate()`), and the UI reads back `safety_status`.

| | AUTO mode | MANUAL mode (absolute) |
|---|---|---|
| Decisions | Cloud automation + safety engine send `desired_*`; board applies | Operator only — board never touches relays |
| Safety engine | Active (8 hardware invariants, ESM, HSI rules) | Inactive — siren + app alert only |
| Settings cards | Safety engine toggle + history visible | Both hidden |
| Power / WiFi / sensor loss | Board runs autonomously from last known settings | Sticky: manual state and relay intent restored from NVS |

Manual mode survives power cuts, WiFi loss, sensor failure and reboots (NVS `mode_state`). In manual mode danger conditions (≥42 °C, high NH₃, sensor failure) trigger the siren and app warnings but never switch relays.

## WiFi self-service

No reflash needed when WiFi changes:

1. **Board hotspot** — after ~2 min without WiFi the board opens `FarmEye-Setup-XXXX` (password `farmeye2026`); connect and open `http://192.168.4.1`.
2. **From the app** — Settings → Device → “ওয়াইফাই পরিবর্তন” queues a `set_wifi` command; the board trials the new network for 90 s and reverts to the backup credentials if it fails. Passwords are never displayed in the app.

## Roles

`super_admin` · `org_owner` · `farm_owner` (= org_admin) · `worker`. Workers can do everything a farm owner can **except** hardware, automation and threshold changes. Enforced via `usePermissions()` and SQL helpers `can_manage_farm` / `can_change_hardware` / `can_log_daily_data`; roles live in `user_roles` (never on profiles).

## Backend

Lovable Cloud (Postgres + Auth + Edge Functions + Storage). All rows are scoped by `farm_id` / `user_id` with RLS; every write filters by `farm_id`. Sensor data lives in `sensor_readings`. Device traffic is HMAC-signed (`REQUIRE_DEVICE_SIGNATURES`) and commands use the lease protocol (`REQUIRE_COMMAND_LEASE`) with `complete_device_command`.

## Development

```sh
npm i
npm run dev
```

Built with [Lovable](https://lovable.dev) — changes sync both ways with this repository.
