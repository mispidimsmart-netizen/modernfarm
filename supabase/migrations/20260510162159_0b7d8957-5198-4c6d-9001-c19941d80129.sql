
-- 1. Signing keys table
CREATE TABLE IF NOT EXISTS public.firmware_signing_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL UNIQUE,
  algorithm text NOT NULL DEFAULT 'ed25519' CHECK (algorithm IN ('ed25519','rsa-sha256')),
  public_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.firmware_signing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active keys"
  ON public.firmware_signing_keys FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins manage signing keys"
  ON public.firmware_signing_keys FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. firmware_registry — signature + window + health-gate
ALTER TABLE public.firmware_registry
  ADD COLUMN IF NOT EXISTS signature_b64 text,
  ADD COLUMN IF NOT EXISTS signature_alg text DEFAULT 'ed25519',
  ADD COLUMN IF NOT EXISTS signing_key_id uuid REFERENCES public.firmware_signing_keys(id),
  ADD COLUMN IF NOT EXISTS sha256_hex text,
  ADD COLUMN IF NOT EXISTS update_window_start_hour smallint DEFAULT 2 CHECK (update_window_start_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS update_window_end_hour smallint DEFAULT 4 CHECK (update_window_end_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS update_window_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS health_gate_min_success_pct numeric DEFAULT 95.0,
  ADD COLUMN IF NOT EXISTS health_gate_min_samples int DEFAULT 5,
  ADD COLUMN IF NOT EXISTS health_gate_dwell_minutes int DEFAULT 60;

-- 3. firmware_install_logs — boot tracking
ALTER TABLE public.firmware_install_logs
  ADD COLUMN IF NOT EXISTS boot_attempts int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boot_succeeded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS signature_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_rolled_back boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_boot_at timestamptz;

-- 4. firmware_rollout_batches — auto-advance state
ALTER TABLE public.firmware_rollout_batches
  ADD COLUMN IF NOT EXISTS auto_advance_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz;

-- 5. Health-gated auto stage advance
CREATE OR REPLACE FUNCTION public.auto_advance_rollout()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _b record;
  _fw record;
  _success int;
  _failed int;
  _total int;
  _success_pct numeric;
  _advanced jsonb := '[]'::jsonb;
  _paused jsonb := '[]'::jsonb;
BEGIN
  FOR _b IN
    SELECT b.*, f.health_gate_min_success_pct, f.health_gate_min_samples, f.health_gate_dwell_minutes
    FROM firmware_rollout_batches b
    JOIN firmware_registry f ON f.id = b.firmware_id
    WHERE b.status = 'active' AND COALESCE(b.auto_advance_enabled, true)
      AND b.started_at < now() - (COALESCE(f.health_gate_dwell_minutes,60) || ' minutes')::interval
  LOOP
    SELECT
      count(*) FILTER (WHERE status='completed' AND boot_succeeded),
      count(*) FILTER (WHERE status='failed' OR auto_rolled_back),
      count(*)
    INTO _success, _failed, _total
    FROM firmware_install_logs
    WHERE firmware_id = _b.firmware_id AND created_at >= _b.started_at;

    UPDATE firmware_rollout_batches SET last_health_check_at = now() WHERE id = _b.id;

    IF _total < _b.health_gate_min_samples THEN
      CONTINUE; -- not enough data yet
    END IF;

    _success_pct := CASE WHEN _total = 0 THEN 0 ELSE (_success::numeric / _total) * 100 END;

    IF _success_pct >= _b.health_gate_min_success_pct THEN
      -- promote: complete this batch, activate next
      UPDATE firmware_rollout_batches
        SET status='completed', completed_at = now(),
            success_count = _success, fail_count = _failed
        WHERE id = _b.id;

      UPDATE firmware_rollout_batches
        SET status='active', started_at = now()
        WHERE firmware_id = _b.firmware_id
          AND batch_number = _b.batch_number + 1
          AND status = 'pending';

      -- update firmware rollout %
      UPDATE ota_firmware SET rollout_percentage = (
        SELECT max(target_percentage) FROM firmware_rollout_batches
        WHERE firmware_id = _b.firmware_id AND status IN ('active','completed')
      ) WHERE id = _b.firmware_id;

      _advanced := _advanced || jsonb_build_object(
        'firmware_id', _b.firmware_id, 'from_batch', _b.batch_number,
        'success_pct', _success_pct, 'samples', _total
      );
    ELSE
      -- pause: low success, abort active batch
      UPDATE firmware_rollout_batches
        SET status='aborted', completed_at = now(),
            abort_reason = format('Health gate failed: %.1f%% success (%s/%s), threshold %.1f%%',
              _success_pct, _success, _total, _b.health_gate_min_success_pct),
            success_count = _success, fail_count = _failed
        WHERE id = _b.id;

      UPDATE ota_firmware SET rollout_status = 'paused' WHERE id = _b.firmware_id;

      _paused := _paused || jsonb_build_object(
        'firmware_id', _b.firmware_id, 'batch', _b.batch_number,
        'success_pct', _success_pct, 'samples', _total
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('advanced', _advanced, 'paused', _paused, 'checked_at', now());
END $$;

-- 6. Boot failure reporter — auto-rollback after 3 strikes
CREATE OR REPLACE FUNCTION public.report_boot_failure(
  _device_token_id uuid,
  _firmware_id uuid,
  _from_version text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log record;
  _attempts int;
BEGIN
  SELECT * INTO _log FROM firmware_install_logs
    WHERE device_token_id = _device_token_id AND firmware_id = _firmware_id
    ORDER BY created_at DESC LIMIT 1;

  IF _log IS NULL THEN
    INSERT INTO firmware_install_logs(device_token_id, firmware_id, from_version, status, boot_attempts, last_boot_at)
    VALUES (_device_token_id, _firmware_id, COALESCE(_from_version,'unknown'), 'boot_failed', 1, now())
    RETURNING boot_attempts INTO _attempts;
  ELSE
    UPDATE firmware_install_logs
      SET boot_attempts = COALESCE(boot_attempts,0) + 1,
          last_boot_at = now(),
          status = CASE WHEN COALESCE(boot_attempts,0) + 1 >= 3 THEN 'rolled_back' ELSE 'boot_failed' END,
          auto_rolled_back = (COALESCE(boot_attempts,0) + 1 >= 3),
          rollback_triggered = (COALESCE(boot_attempts,0) + 1 >= 3)
      WHERE id = _log.id
      RETURNING boot_attempts INTO _attempts;
  END IF;

  RETURN jsonb_build_object(
    'boot_attempts', _attempts,
    'should_rollback', _attempts >= 3
  );
END $$;

-- 7. Window check helper (Asia/Dhaka local time)
CREATE OR REPLACE FUNCTION public.is_within_update_window(_firmware_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _f record;
  _hr int;
BEGIN
  SELECT update_window_enabled, update_window_start_hour, update_window_end_hour
    INTO _f FROM firmware_registry WHERE id = _firmware_id;
  IF _f IS NULL OR NOT COALESCE(_f.update_window_enabled, true) THEN
    RETURN true;
  END IF;
  _hr := EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Dhaka'))::int;
  IF _f.update_window_start_hour <= _f.update_window_end_hour THEN
    RETURN _hr >= _f.update_window_start_hour AND _hr < _f.update_window_end_hour;
  ELSE
    RETURN _hr >= _f.update_window_start_hour OR _hr < _f.update_window_end_hour;
  END IF;
END $$;
