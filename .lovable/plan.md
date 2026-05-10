# Phase 7: Notifications & Alerts (Polish + Gap-Fill)

**Status check:** এই প্রজেক্টে ইতিমধ্যে অনেক কিছু আছে — `push_subscriptions`, `alert_rules`, `alerts`, `alert_deliveries`, `notification_escalation_config`, `sms_alert_settings`, `alert_channel_config`, এবং edge functions: `send-push-notification`, `alert-dispatcher`, `alert-escalator`, `notification-escalation`, `gsm-sms-relay`. কাজেই Phase 7 = "rebuild নয়, পরিপূর্ণ করা।"

## যা যোগ/উন্নত করা হবে

### 1. Quiet Hours & Snooze (per-user, per-farm)
- নতুন কলাম `notification_preferences`-এ: `quiet_hours_start`, `quiet_hours_end`, `snooze_until`
- `alert-dispatcher` quiet-hour check করে non-critical alerts hold করবে; **CRITICAL** alerts (>38°C, power fail, ESM trigger) bypass করবে
- UI: Settings → Notifications-এ quiet hours picker + "Snooze 1h/4h/until tomorrow" button

### 2. Digest Notifications (low-priority batching)
- নতুন কলাম `digest_mode` (`instant`|`hourly`|`daily`) প্রতি channel-এ
- pg_cron জব: প্রতি ঘণ্টায় unsent low/medium alerts একসাথে roll-up করে এক push পাঠাবে
- "৩টি ঘটনা গত ১ ঘণ্টায়: তাপমাত্রা ৩৫°, আর্দ্রতা ৮২%, ..."

### 3. Alert Rules Wizard UI
- বর্তমানে rules DB-তে আছে কিন্তু UI সীমিত — full CRUD wizard
- Pre-built templates: "Heat warning", "Ammonia high", "Power outage", "Device offline >10m", "Low water flow"
- Per-rule: severity, cooldown_minutes, channels (push/sms/whatsapp), recipient roles

### 4. Alert History & Delivery Status Page
- নতুন route `/alerts/history`
- Timeline: alert → delivery attempts (push/sms/email) per channel → ack/escalation
- Filter: severity, date range, type, acknowledged status
- Re-send button (super-admin)

### 5. WhatsApp Channel (via Twilio connector)
- Existing `gsm-sms-relay` থাকা সত্ত্বেও WhatsApp আলাদা — Twilio API দিয়ে template message
- শুধু verified opt-in users-এর জন্য
- DB: `alert_channel_config.whatsapp_enabled`, `whatsapp_number`

### 6. Acknowledge from Notification
- Push notification action button: "✓ স্বীকার করি" → service worker → API call → `acknowledge_alert(_alert_id)`
- SMS reply: "OK <code>" → webhook → ack
- ack করলে চলমান escalation থেমে যাবে

### 7. Sound + Vibration Pattern by Severity
- বর্তমানে sound আছে কিন্তু severity-aware নয়
- Critical: 3-pulse vibration + alarm sound, loops 5x
- High: 2-pulse, single ring
- Medium/Low: subtle chime

### 8. Test Notification Button
- Settings-এ "Send test push" বাটন — প্রতিটি channel test করে delivery status দেখায়
- Diagnostic: subscription valid, VAPID key correct, FCM endpoint reachable

## Technical Details

**Migrations needed:**
- `notification_preferences` table (per user_id + farm_id): quiet_hours_start/end, snooze_until, digest_mode, severity_min_for_*
- `alert_channel_config` ALTER: add `whatsapp_enabled`, `whatsapp_number`, `digest_mode`
- New trigger: when `acknowledged=true` set on alerts → cancel pending escalation rows

**New edge functions:**
- `digest-notifications` (pg_cron, hourly)
- `notification-test` (manual diagnostic)
- `sms-inbound-webhook` (handle "OK <code>" replies)

**Frontend:**
- `/alerts/history` page (lazy-loaded)
- `AlertRulesWizard` component (Settings tab)
- `QuietHoursCard`, `SnoozeButton`, `TestNotificationCard` components
- `useNotificationPreferences` hook

**Out-of-scope (later phase):**
- Native push for iOS Safari (requires Web Push API which iOS 16.4+ supports — already covered by VAPID)
- Email digests (will come in Phase 9 Reporting)

## Rollout Order
1. **DB migration** — `notification_preferences` + `alert_channel_config` columns + ack-cancel trigger
2. **Quiet hours + Snooze** — backend check in `alert-dispatcher`, frontend Settings UI
3. **Test notification button** — quickest win, validates pipeline
4. **Alert History page** + delivery status visualization
5. **Alert Rules Wizard UI**
6. **Severity-aware sounds + push action buttons** (ack from notification)
7. **Digest mode** — pg_cron + edge function
8. **WhatsApp channel** (needs Twilio connector setup; will ask before this step)

প্রতিটি step approve করে পরেরটাতে যাব। Step 1 থেকে শুরু করি?
