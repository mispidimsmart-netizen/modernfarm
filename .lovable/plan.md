# Phase 4 — Advanced Alerting & Notifications

## লক্ষ্য

বিদ্যমান `alerts` table-কে farmer-friendly multi-channel notification system-এ রূপান্তর। কৃষক নিজে threshold, channel, quiet-hours, escalation rules সেট করতে পারবেন। বিদ্যমান table/column overwrite হবে না — সব additive।

## ১. Database (additive only)

নতুন tables:
- `alert_rules` — farmer-configurable rule set
  - `farm_id, metric` (temperature/humidity/ammonia/water/power/offline/safety_breach)
  - `operator` (>, <, =), `threshold_value`, `duration_seconds` (sustained breach)
  - `severity` (info/warning/critical), `enabled`
  - `channels` (jsonb: `{push, sms, whatsapp, in_app}`)
  - `cooldown_minutes` (default 30 — same alert বারবার পাঠাবে না)
- `alert_channel_config` — farm-level channel preferences
  - `farm_id, push_enabled, sms_enabled, whatsapp_enabled`
  - `phone_e164` (SMS/WhatsApp destination)
  - `quiet_hours_start, quiet_hours_end` (HH:MM, only critical bypasses)
  - `escalation_minutes` (unack alert → escalate to next channel)
  - `escalation_phone_e164` (manager/owner backup)
- `alert_deliveries` — audit log per channel attempt
  - `alert_id, channel, status` (queued/sent/failed/skipped_quiet/skipped_cooldown)
  - `provider_message_id, error_message, sent_at`
- `alerts`-এ additive columns:
  - `acknowledged_at, acknowledged_by, escalated_at, rule_id, sustained_since`

RLS: সব farm-scoped, `user_can_access_farm()` দিয়ে।

DB function: `evaluate_alert_rules(farm_id)` — sensor_readings + device_status থেকে latest মেট্রিক নিয়ে rules check করবে, cooldown/quiet-hours respect করবে, alert তৈরি করবে।

## ২. Edge Functions

- **`alert-dispatcher`** (cron: প্রতি ১ মিনিট):
  - সব farm-এর জন্য `evaluate_alert_rules` চালাবে
  - Unsent alerts নিয়ে channel-অনুযায়ী dispatch
  - Quiet hours: শুধু `critical` alert পাঠাবে
  - Cooldown check (একই rule_id-এর শেষ delivery × cooldown_minutes)
  - Push (Web Push API + VAPID), SMS/WhatsApp (Twilio gateway)
  - প্রতিটা attempt `alert_deliveries`-এ লগ
- **`alert-escalator`** (cron: প্রতি ৫ মিনিট):
  - `severity=critical AND acknowledged_at IS NULL AND created_at < now() - escalation_minutes`
  - Escalation phone-এ SMS পাঠাবে, `escalated_at` সেট করবে
- **`alert-acknowledge`** (user-invoked):
  - Auth-protected, `acknowledged_at/by` সেট করবে; escalation থামাবে

## ৩. Frontend (Bengali UI)

- **`/alerts` page redesign**: tabs — সক্রিয়/স্বীকৃত/আর্কাইভ। প্রতিটা alert card-এ "স্বীকার করুন" বাটন।
- **`/settings/alerts`**:
  - Channel toggle cards (পুশ/SMS/WhatsApp)
  - Phone number input + verify
  - Quiet hours TimePicker (শান্ত সময়)
  - Threshold list — প্রতিটা metric-এর জন্য slider + duration + severity + cooldown
  - Test button per channel ("পরীক্ষামূলক বার্তা পাঠান")
- **AlertBell** header component: unread count badge, dropdown preview
- **Realtime**: `alerts` table-এ supabase realtime subscribe → instant toast

## ৪. Twilio Connection

User-কে Twilio connector-এ connect করতে বলব (`standard_connectors--connect twilio`)। SMS phone number: BD format (+880…)। WhatsApp জন্য Twilio sandbox/approved sender number লাগবে।

## ৫. Out-of-scope (Phase 5+)

- Voice call escalation
- Multi-language alert templates (শুধু বাংলা এখন)
- AI-summarized daily digest
- Slack/Telegram channels (পরে যোগ করা সহজ)

## Rollout Order

1. DB migration (tables + RLS + `evaluate_alert_rules` RPC)
2. `alert-dispatcher` edge function + cron
3. `/settings/alerts` UI + threshold defaults seed
4. Twilio connect + SMS path test
5. `alert-escalator` + acknowledge flow
6. AlertBell + realtime toast
7. End-to-end test (temp >38°C → push + SMS → ack)
