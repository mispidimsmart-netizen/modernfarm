
-- Phase 3 — Reliability & Offline-first migrations

-- 1. device_commands: idempotency
ALTER TABLE public.device_commands
  ADD COLUMN IF NOT EXISTS client_request_id uuid,
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_commands_client_request_id
  ON public.device_commands (client_request_id)
  WHERE client_request_id IS NOT NULL;

-- 2. device_health: connection quality + failsafe recovery
ALTER TABLE public.device_health
  ADD COLUMN IF NOT EXISTS connection_quality_score int
    CHECK (connection_quality_score IS NULL OR (connection_quality_score >= 0 AND connection_quality_score <= 100)),
  ADD COLUMN IF NOT EXISTS failsafe_recovery_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_offline_buffer_flush timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failed_syncs int NOT NULL DEFAULT 0;

-- 3. Offline buffer flush audit log
CREATE TABLE IF NOT EXISTS public.device_offline_buffer_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_id uuid NOT NULL,
  farm_id uuid,
  batch_size int NOT NULL,
  oldest_ts timestamptz,
  newest_ts timestamptz,
  flushed_at timestamptz NOT NULL DEFAULT now(),
  accepted_count int NOT NULL DEFAULT 0,
  rejected_count int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_offline_buffer_log_device_time
  ON public.device_offline_buffer_log (device_token_id, flushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_offline_buffer_log_farm_time
  ON public.device_offline_buffer_log (farm_id, flushed_at DESC) WHERE farm_id IS NOT NULL;

ALTER TABLE public.device_offline_buffer_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant select offline buffer log"
  ON public.device_offline_buffer_log FOR SELECT
  USING (farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id));

CREATE POLICY "Super admins view offline buffer log"
  ON public.device_offline_buffer_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 4. RPC: bulk-accept sensor readings from ESP32 offline buffer
-- _readings is a jsonb array of objects: { temperature, humidity, ammonia, recorded_at, water_flow_pulses?, light_lux? }
CREATE OR REPLACE FUNCTION public.accept_sensor_batch(
  _device_token_id uuid,
  _user_id uuid,
  _farm_id uuid,
  _shed_id uuid,
  _readings jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _accepted int := 0;
  _rejected int := 0;
  _oldest timestamptz;
  _newest timestamptz;
  _r jsonb;
  _ts timestamptz;
BEGIN
  IF _readings IS NULL OR jsonb_typeof(_readings) <> 'array' THEN
    RETURN jsonb_build_object('accepted', 0, 'rejected', 0, 'error', 'invalid_payload');
  END IF;

  FOR _r IN SELECT jsonb_array_elements(_readings) LOOP
    BEGIN
      _ts := COALESCE((_r->>'recorded_at')::timestamptz, now());

      -- Track range
      IF _oldest IS NULL OR _ts < _oldest THEN _oldest := _ts; END IF;
      IF _newest IS NULL OR _ts > _newest THEN _newest := _ts; END IF;

      INSERT INTO public.sensor_readings (
        user_id, farm_id, shed_id,
        temperature, humidity, ammonia,
        recorded_at
      ) VALUES (
        _user_id, _farm_id, _shed_id,
        NULLIF(_r->>'temperature','')::numeric,
        NULLIF(_r->>'humidity','')::numeric,
        NULLIF(_r->>'ammonia','')::numeric,
        _ts
      );
      _accepted := _accepted + 1;
    EXCEPTION WHEN OTHERS THEN
      _rejected := _rejected + 1;
    END;
  END LOOP;

  -- Audit
  INSERT INTO public.device_offline_buffer_log (
    device_token_id, farm_id, batch_size, oldest_ts, newest_ts,
    accepted_count, rejected_count
  ) VALUES (
    _device_token_id, _farm_id, _accepted + _rejected, _oldest, _newest,
    _accepted, _rejected
  );

  -- Update device_health flush timestamp
  UPDATE public.device_health
  SET last_offline_buffer_flush = now(),
      offline_buffer_count = 0,
      updated_at = now()
  WHERE device_token_id = _device_token_id;

  RETURN jsonb_build_object(
    'accepted', _accepted,
    'rejected', _rejected,
    'oldest_ts', _oldest,
    'newest_ts', _newest
  );
END;
$$;
