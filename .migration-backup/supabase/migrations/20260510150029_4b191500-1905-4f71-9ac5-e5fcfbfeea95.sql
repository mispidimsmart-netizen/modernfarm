-- ============================================================
-- Phase 7 Step 1: Notifications & Alerts schema gaps
-- ============================================================

-- 1. Extend alert_channel_config (farm-scoped) with WhatsApp + digest
ALTER TABLE public.alert_channel_config
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS digest_mode text NOT NULL DEFAULT 'instant',
  ADD COLUMN IF NOT EXISTS digest_min_severity text NOT NULL DEFAULT 'low';

-- Constrain digest_mode values via trigger (no CHECK with mutable need; simple CHECK is fine here)
ALTER TABLE public.alert_channel_config
  DROP CONSTRAINT IF EXISTS alert_channel_config_digest_mode_chk;
ALTER TABLE public.alert_channel_config
  ADD CONSTRAINT alert_channel_config_digest_mode_chk
  CHECK (digest_mode IN ('instant','hourly','daily'));

-- 2. Per-user notification preferences (covers quiet hours / snooze / sound / per-channel min severity)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id                       uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  quiet_hours_start             text,                -- e.g. '22:00'
  quiet_hours_end               text,                -- e.g. '06:00'
  critical_bypass_quiet_hours   boolean NOT NULL DEFAULT true,
  snooze_until                  timestamptz,         -- when set in future, suppress non-critical
  sound_enabled                 boolean NOT NULL DEFAULT true,
  vibration_enabled             boolean NOT NULL DEFAULT true,
  severity_min_for_push         text NOT NULL DEFAULT 'low',     -- low|medium|high|critical
  severity_min_for_sms          text NOT NULL DEFAULT 'high',
  severity_min_for_whatsapp     text NOT NULL DEFAULT 'high',
  digest_mode                   text NOT NULL DEFAULT 'instant', -- instant|hourly|daily
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_farm ON public.notification_preferences(farm_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users view own notification prefs"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users insert own notification prefs"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users update own notification prefs"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notification prefs" ON public.notification_preferences;
CREATE POLICY "Users delete own notification prefs"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Severity validators
ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notif_prefs_digest_mode_chk;
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notif_prefs_digest_mode_chk
  CHECK (digest_mode IN ('instant','hourly','daily'));

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notif_prefs_severity_chk;
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notif_prefs_severity_chk
  CHECK (
    severity_min_for_push     IN ('low','medium','high','critical') AND
    severity_min_for_sms      IN ('low','medium','high','critical') AND
    severity_min_for_whatsapp IN ('low','medium','high','critical')
  );

-- 3. Snooze helper RPC (clean API for "snooze 1h / 4h / until tomorrow")
CREATE OR REPLACE FUNCTION public.snooze_notifications(_minutes integer, _farm_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _u uuid := auth.uid();
  _until timestamptz;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _minutes IS NULL OR _minutes < 0 OR _minutes > 1440 THEN
    RAISE EXCEPTION 'Snooze minutes must be 0..1440';
  END IF;
  _until := CASE WHEN _minutes = 0 THEN NULL ELSE now() + (_minutes || ' minutes')::interval END;

  INSERT INTO public.notification_preferences (user_id, farm_id, snooze_until)
    VALUES (_u, _farm_id, _until)
  ON CONFLICT (user_id, farm_id) DO UPDATE
    SET snooze_until = EXCLUDED.snooze_until, updated_at = now();

  RETURN jsonb_build_object('snoozed_until', _until);
END $$;

-- 4. Helper: should a user receive an alert NOW given their preferences?
CREATE OR REPLACE FUNCTION public.should_deliver_notification(
  _user_id uuid,
  _farm_id uuid,
  _severity text,
  _channel  text  -- 'push' | 'sms' | 'whatsapp'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _p record;
  _now_local time;
  _sev_rank int;
  _min_sev_rank int;
  _min_sev text;
  _critical boolean := (_severity = 'critical');
  _in_quiet boolean := false;
BEGIN
  SELECT * INTO _p FROM public.notification_preferences
    WHERE user_id = _user_id AND (farm_id = _farm_id OR (farm_id IS NULL AND _farm_id IS NULL))
    LIMIT 1;

  -- No row = defaults (deliver everything)
  IF _p IS NULL THEN
    RETURN true;
  END IF;

  -- Snooze: only critical bypasses
  IF _p.snooze_until IS NOT NULL AND _p.snooze_until > now() THEN
    IF NOT (_critical AND _p.critical_bypass_quiet_hours) THEN
      RETURN false;
    END IF;
  END IF;

  -- Quiet hours (HH:MM strings, may wrap past midnight)
  IF _p.quiet_hours_start IS NOT NULL AND _p.quiet_hours_end IS NOT NULL
     AND _p.quiet_hours_start <> _p.quiet_hours_end THEN
    _now_local := (now() AT TIME ZONE 'Asia/Dhaka')::time;
    IF _p.quiet_hours_start::time <= _p.quiet_hours_end::time THEN
      _in_quiet := _now_local >= _p.quiet_hours_start::time AND _now_local < _p.quiet_hours_end::time;
    ELSE
      -- wraps midnight (e.g. 22:00 → 06:00)
      _in_quiet := _now_local >= _p.quiet_hours_start::time OR _now_local < _p.quiet_hours_end::time;
    END IF;
    IF _in_quiet AND NOT (_critical AND _p.critical_bypass_quiet_hours) THEN
      RETURN false;
    END IF;
  END IF;

  -- Per-channel minimum severity
  _min_sev := CASE _channel
    WHEN 'push'     THEN _p.severity_min_for_push
    WHEN 'sms'      THEN _p.severity_min_for_sms
    WHEN 'whatsapp' THEN _p.severity_min_for_whatsapp
    ELSE 'low'
  END;
  _sev_rank := CASE _severity
    WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 1 END;
  _min_sev_rank := CASE _min_sev
    WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 1 END;

  RETURN _sev_rank >= _min_sev_rank;
END $$;

-- 5. Trigger: when an alert is acknowledged, resolve any open escalation tracker
CREATE OR REPLACE FUNCTION public.resolve_escalation_on_ack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.acknowledged = true
     AND COALESCE(OLD.acknowledged, false) = false
     AND NEW.farm_id IS NOT NULL THEN
    UPDATE public.notification_escalation_tracker
       SET is_escalated = false,
           escalation_resolved_at = now(),
           updated_at = now()
     WHERE farm_id = NEW.farm_id
       AND is_escalated = true
       AND escalation_resolved_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_alerts_resolve_escalation ON public.alerts;
CREATE TRIGGER trg_alerts_resolve_escalation
  AFTER UPDATE OF acknowledged ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.resolve_escalation_on_ack();