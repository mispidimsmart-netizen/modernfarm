-- V8 OTA assignment identity and atomic push contract.
-- This migration is intentionally additive and must be deployed before the
-- ota-firmware-v8 Edge Function that calls queue_v8_ota_assignment().
BEGIN;

-- Preserve the newest live assignment and retire pre-existing duplicates
-- before installing the partial uniqueness guarantee.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY device_token_id, firmware_id
           ORDER BY created_at DESC, id DESC
         ) AS duplicate_rank
  FROM public.firmware_install_logs
  WHERE status IN ('pending', 'active')
)
UPDATE public.firmware_install_logs AS logs
SET status = 'superseded',
    error_message = COALESCE(logs.error_message, 'superseded_duplicate_v8_assignment')
FROM ranked
WHERE logs.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS firmware_install_logs_v8_live_assignment_uidx
  ON public.firmware_install_logs (device_token_id, firmware_id)
  WHERE status IN ('pending', 'active');

CREATE OR REPLACE FUNCTION public.queue_v8_ota_assignment(
  _device_token_id uuid,
  _firmware_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_row public.device_tokens%ROWTYPE;
  firmware_row public.ota_firmware%ROWTYPE;
  health_version text;
  assignment_row public.firmware_install_logs%ROWTYPE;
BEGIN
  IF _device_token_id IS NULL OR _firmware_id IS NULL THEN
    RAISE EXCEPTION 'device_token_id and firmware_id are required'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize retries/races for this exact device+firmware pair. The
  -- partial unique index remains the durable invariant if another writer is
  -- introduced later.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(_device_token_id::text || ':' || _firmware_id::text, 0)
  );

  SELECT * INTO device_row
  FROM public.device_tokens
  WHERE id = _device_token_id AND is_active = true
  FOR UPDATE;
  IF NOT FOUND OR device_row.user_id IS NULL OR device_row.farm_id IS NULL THEN
    RAISE EXCEPTION 'device is missing an active tenant binding'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO firmware_row
  FROM public.ota_firmware
  WHERE id = _firmware_id AND is_active = true
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active firmware not found' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO assignment_row
  FROM public.firmware_install_logs
  WHERE device_token_id = _device_token_id
    AND firmware_id = _firmware_id
    AND status IN ('pending', 'active')
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF assignment_row.id IS NULL THEN
    SELECT firmware_version INTO health_version
    FROM public.device_health
    WHERE device_token_id = _device_token_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'device health row not found' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.firmware_install_logs (
      firmware_id, device_token_id, user_id, farm_id, from_version,
      to_version, status, board_type
    ) VALUES (
      _firmware_id, _device_token_id, device_row.user_id, device_row.farm_id,
      COALESCE(health_version, 'unknown'), firmware_row.version, 'pending',
      COALESCE(firmware_row.board_type, 'esp32')
    )
    RETURNING * INTO assignment_row;
  END IF;

  -- This update is in the same transaction as insertion. A failure cannot
  -- leave a pending assignment without its device-health projection.
  UPDATE public.device_health
  SET ota_version_available = firmware_row.version,
      ota_status = assignment_row.status
  WHERE device_token_id = _device_token_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'device health update failed' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'assignment_id', assignment_row.id,
    'device_token_id', assignment_row.device_token_id,
    'firmware_id', assignment_row.firmware_id,
    'user_id', assignment_row.user_id,
    'farm_id', assignment_row.farm_id,
    'status', assignment_row.status,
    'to_version', assignment_row.to_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.queue_v8_ota_assignment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_v8_ota_assignment(uuid, uuid) TO service_role;

COMMIT;