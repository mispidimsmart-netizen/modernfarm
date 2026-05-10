# Phase 5 — Multi-Device Mesh & GSM Fallback

## লক্ষ্য

একটি farm-এ একাধিক ESP32 (multi-shed) একসাথে কাজ করবে। যখন WiFi/Internet down, তখন GSM (SIM800L/A7670) দিয়ে SMS-based command + critical alert পাঠানো-গ্রহণ করা যাবে। কোনো বিদ্যমান table/API overwrite হবে না — সব additive।

## ১. Multi-Device Mesh

### Database (additive)
- **`device_mesh_peers`** — কোন ESP32 কোন ESP32-এর peer
  - `farm_id, primary_device_token_id, peer_device_token_id, role` (master/slave/backup)
  - `last_handshake_at, link_quality` (0-100, RSSI ভিত্তিক)
- **`mesh_sync_log`** — peer-to-peer sync events
  - `from_device_id, to_device_id, payload_type` (sensor/command/safety_state), `bytes`, `latency_ms`
- **`device_tokens` additive columns**: `mesh_role` (independent/master/slave), `mesh_group_id`

### ESP32 Firmware
- **ESP-NOW protocol** (built-in, no extra hardware) — 250-byte packets, ~200m line-of-sight
- Master ESP32 internet-connected → relays cloud commands to slaves
- Slave ESP32 sends sensor data → master → cloud (single uplink saves bandwidth)
- Auto-elect new master যদি current master offline >2 min
- Each ESP32 broadcasts safety_status — যদি one shed এ heat emergency, neighbor shed-এ cooling pre-warm

### UI (Bengali)
- **`/settings/mesh`** — mesh group setup wizard
  - "এই কন্ট্রোলারের সাথে অন্য কোন কন্ট্রোলার যুক্ত করুন"
  - Pairing code (6-digit) প্রতি ১ মিনিটে refresh
  - Live link quality bar per peer
- **Farm dashboard**: multi-shed grid view — প্রতিটা shed এর mesh status badge

## ২. GSM Fallback (Mature)

### Hardware Support
- SIM800L (2G GSM) বা A7670 (4G LTE) — UART2 (GPIO 16/17) connection
- Already wired in `esp32-gsm-sms.ino` — এখন production-grade করব

### Database (additive)
- **`gsm_inbound_sms`** — SMS commands received by ESP32
  - `device_token_id, from_phone, body, parsed_command, executed_at, response_sent`
- **`gsm_outbound_sms`** — alerts sent via GSM
  - `device_token_id, to_phone, body, alert_id, delivered_at, retry_count`
- **`farm_settings` additive**: `gsm_enabled, authorized_phones jsonb` (whitelist for SMS commands)

### ESP32 Firmware (`esp32-gsm-sms.ino` mature version)
- **Auto-detect Internet down** → switch to GSM mode
- **Inbound SMS commands** (only from authorized_phones):
  - `STATUS` → reply with temp/hum/relay state
  - `FAN ON 30` → run fan 30 min
  - `EMERGENCY` → trigger ESM
  - `RESTART` → reboot
- **Outbound critical alerts** (when offline + critical alert):
  - Temperature >40°C, power loss >10 min, ammonia >50ppm
  - Sends to `farm_settings.authorized_phones[0]` (owner)
  - Retry 3x with exponential backoff
- **Cost guard**: max 20 SMS/day per device

### Edge Functions
- **`gsm-sms-relay`** — when ESP32 reconnects, sync inbound/outbound SMS log to cloud

### UI (Bengali)
- **`/settings/gsm`** — 
  - Enable/disable GSM fallback
  - Authorized phone numbers (max 3) — ESP32 শুধু এদের SMS গ্রহণ করবে
  - Daily SMS counter + cost estimate
  - Test "STATUS" button

## ৩. Out-of-scope (Phase 6+)
- LoRaWAN (long-range mesh, requires extra module)
- Voice command via GSM (DTMF)
- Mesh self-healing across multiple farms
- Satellite fallback

## Rollout Order
1. DB migration: `device_mesh_peers`, `mesh_sync_log`, `gsm_inbound_sms`, `gsm_outbound_sms` + additive columns
2. ESP-NOW master/slave logic in unified ESP32 firmware
3. `/settings/mesh` UI + pairing wizard
4. GSM mature firmware: inbound parser + auto-fallback + cost guard
5. `/settings/gsm` UI + authorized phones
6. `gsm-sms-relay` edge function (sync log when reconnect)
7. End-to-end test: kill master WiFi → slave promotes → critical alert → GSM SMS to owner
