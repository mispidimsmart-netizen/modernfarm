
-- 1) Add expiry timestamp columns for each temporary-override device
ALTER TABLE public.device_status
  ADD COLUMN IF NOT EXISTS desired_fan_expires_at              timestamptz,
  ADD COLUMN IF NOT EXISTS desired_light_expires_at            timestamptz,
  ADD COLUMN IF NOT EXISTS desired_alarm_expires_at            timestamptz,
  ADD COLUMN IF NOT EXISTS desired_heater_expires_at           timestamptz,
  ADD COLUMN IF NOT EXISTS desired_circulation_fan_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS desired_fogger_expires_at           timestamptz,
  ADD COLUMN IF NOT EXISTS desired_ceiling_fan_expires_at      timestamptz,
  ADD COLUMN IF NOT EXISTS desired_sprinkler_expires_at        timestamptz;

-- 2) Server-side expiry: null-out desired_* when its expires_at has passed.
--    Automation engine will then reassert control on next cycle.
CREATE OR REPLACE FUNCTION public.expire_desired_overrides()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
  n integer;
BEGIN
  UPDATE device_status SET desired_fan_on = NULL,             desired_fan_expires_at = NULL,             updated_at = now() WHERE desired_fan_expires_at             <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_light_on = NULL,           desired_light_expires_at = NULL,           updated_at = now() WHERE desired_light_expires_at           <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_alarm_on = NULL,           desired_alarm_expires_at = NULL,           updated_at = now() WHERE desired_alarm_expires_at           <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_heater_on = NULL,          desired_heater_expires_at = NULL,          updated_at = now() WHERE desired_heater_expires_at          <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_circulation_fan_on = NULL, desired_circulation_fan_expires_at = NULL, updated_at = now() WHERE desired_circulation_fan_expires_at <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_fogger_on = NULL,          desired_fogger_expires_at = NULL,          updated_at = now() WHERE desired_fogger_expires_at          <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_ceiling_fan_on = NULL,     desired_ceiling_fan_expires_at = NULL,     updated_at = now() WHERE desired_ceiling_fan_expires_at     <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  UPDATE device_status SET desired_sprinkler_on = NULL,       desired_sprinkler_expires_at = NULL,       updated_at = now() WHERE desired_sprinkler_expires_at       <= now(); GET DIAGNOSTICS n = ROW_COUNT; affected := affected + n;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_desired_overrides() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_desired_overrides() TO service_role;

-- 3) Schedule via pg_cron (every minute)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-desired-overrides-every-minute') THEN
    PERFORM cron.unschedule('expire-desired-overrides-every-minute');
  END IF;
  PERFORM cron.schedule(
    'expire-desired-overrides-every-minute',
    '* * * * *',
    $cron$ SELECT public.expire_desired_overrides(); $cron$
  );
END $$;
