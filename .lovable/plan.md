
# Phase 1 — Security & Device Trust

বর্তমানে `esp32-api` edge function `verify_jwt = false` দিয়ে চলছে এবং শুধু `device_token` (plaintext) দিয়ে authenticate করে। যেকেউ token পেলেই sensor data পাঠাতে/পড়তে পারবে। Phase 1 এই দুর্বলতাগুলো বন্ধ করবে — backward compatible (পুরাতন firmware হঠাৎ মরবে না, gradual cutover)।

## কী কী Ship হবে

### 1. Per-device HMAC Secret + Request Signing
- প্রতি `device_tokens` row-এ নতুন column: `device_secret_hash` (bcrypt) + `secret_version` + `secret_rotated_at`
- ESP32 প্রতিটি POST-এ পাঠাবে: `X-Device-Token`, `X-Timestamp`, `X-Nonce`, `X-Signature` (HMAC-SHA256 over `timestamp.nonce.body`)
- Edge function signature verify করবে; mismatch → 401 + audit log

### 2. Replay Protection
- নতুন table `device_request_nonces (device_token_id, nonce, used_at)` — 5 min TTL
- Timestamp ±300s window check
- Duplicate nonce → 409 + audit log
- Cleanup function (cron) পুরাতন nonce মুছবে

### 3. Per-device Rate Limiting
- নতুন table `device_rate_limit (device_token_id, window_start, request_count)`
- Default: 60 req/min per device → 429 above
- DB function `check_device_rate_limit()`

### 4. Device Provisioning Flow (QR Pairing)
- নতুন edge function `provision-device` (verify_jwt=true) — farmer QR scan/manual code → device claim → secret issue (one-time return)
- Provisioning code expires in 10 min
- নতুন table `device_provisioning_codes`

### 5. Secret Rotation
- নতুন edge function `rotate-device-secret` (admin/farmer)
- Old secret 24h grace period (`previous_secret_hash` column)
- UI: Settings → Devices → "Rotate Secret" button + confirmation

### 6. Security Audit Log Expansion
- নতুন event types: `signature_invalid`, `nonce_reuse`, `timestamp_drift`, `rate_limited`, `secret_rotated`, `device_provisioned`
- Existing `security_audit_log` table reused

### 7. Backward Compatibility
- `device_tokens` row-এ `secret_version = 0` মানে legacy mode (signing skipped, warning logged)
- নতুন device → version 1 (signature required)
- Admin UI dashboard: কোন device legacy mode-এ আছে → migrate prompt

## Database Changes
```text
device_tokens:
  + device_secret_hash      text       (nullable, bcrypt)
  + previous_secret_hash    text       (nullable, 24h grace)
  + secret_version          int        default 0
  + secret_rotated_at       timestamptz
  + last_signature_at       timestamptz

device_request_nonces (new):
  device_token_id, nonce, used_at, expires_at
  unique (device_token_id, nonce)

device_rate_limit (new):
  device_token_id, window_start, request_count

device_provisioning_codes (new):
  code, farm_id, shed_id, created_by, expires_at, used_at, device_token_id
```

## Code Changes
- `supabase/functions/esp32-api/index.ts` — signature verify middleware (top of POST handlers)
- `supabase/functions/provision-device/index.ts` (new)
- `supabase/functions/rotate-device-secret/index.ts` (new)
- `src/components/device/DeviceSecuritySheet.tsx` (new) — rotate, view security status
- `src/components/admin/SecurityAuditLogPanel.tsx` — show new event types
- `public/esp32-unified.ino` — add HMAC signing helper + nonce gen (firmware update guide)

## Rollout Order
1. Migration (DB columns + tables + functions) — safe additive
2. Edge function: signature verify in **opt-in mode** (only if `secret_version >= 1`)
3. Provisioning + rotation endpoints + UI
4. Firmware update with signing
5. Admin dashboard — legacy device tracker
6. (Future) Force `secret_version >= 1` after fleet migration

## Phase 1 Out-of-Scope (Phase 2+)
- mTLS / cert-based auth
- HSM-backed key storage
- Per-endpoint scoped tokens
