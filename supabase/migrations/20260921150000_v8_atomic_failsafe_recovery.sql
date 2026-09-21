-- Serialize mode changes and fail-safe recovery per farm so a reconnect can
-- never overwrite a concurrent switch to sticky MANUAL mode.

CREATE OR REPLACE FUNCTION public.set_farm_automation_mode(
  _farm_id uuid,
  _mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_manual boolean;
  _device record;
  _settings_rows integer := 0;
  _device_rows integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF _farm_id IS NULL THEN
    RAISE EXCEPTION 'NO_FARM_SELECTED' USING ERRCODE = '22023';
  END IF;
  IF upper(coalesce(_mode, '')) NOT IN ('AUTO', 'MANUAL') THEN
    RAISE EXCEPTION 'INVALID_MODE' USING ERRCODE = '22023';
  END IF;
  IF NOT public.can_change_hardware(_uid, _farm_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_MODE_CHANGE' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_farm_id::text, 0));
  _mode := upper(_mode);
  _is_manual := (_mode = 'MANUAL');

  UPDATE public.farm_settings
     SET automation_mode = _mode,
         manual_mode_since = CASE WHEN _is_manual THEN now() ELSE NULL END,
         updated_at = now()
   WHERE farm_id = _farm_id;
  GET DIAGNOSTICS _settings_rows = ROW_COUNT;

  UPDATE public.device_status
     SET desired_manual_override = _is_manual,
         mode = _mode,
         updated_at = now(),
         desired_fan_on = NULL,
         desired_light_on = NULL,
         desired_alarm_on = NULL,
         desired_heater_on = NULL,
         desired_circulation_fan_on = NULL,
         desired_fogger_on = NULL,
         desired_ceiling_fan_on = NULL,
         desired_sprinkler_on = NULL,
         desired_fan_speed = NULL
   WHERE farm_id = _farm_id;
  GET DIAGNOSTICS _device_rows = ROW_COUNT;

  UPDATE public.device_health SET mode = _mode WHERE farm_id = _farm_id;

  FOR _device IN
    SELECT DISTINCT user_id, shed_id, device_name
      FROM public.device_tokens
     WHERE farm_id = _farm_id AND is_active = true AND device_name IS NOT NULL
  LOOP
    INSERT INTO public.device_commands (
      user_id, farm_id, shed_id, command_type, command_value, device_name, executed
    ) VALUES (
      _device.user_id, _farm_id, _device.shed_id, 'stop_automation', _is_manual,
      _device.device_name, false
    );
  END LOOP;

  RETURN jsonb_build_object(
    'mode', _mode, 'farm_id', _farm_id,
    'settings_updated', _settings_rows, 'devices_updated', _device_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_farm_automation_mode(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_farm_automation_mode(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.recover_device_from_failsafe(_device_health_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _health record;
  _status record;
  _mode text := 'AUTO';
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required' USING ERRCODE = '42501';
  END IF;

  SELECT id, user_id, farm_id, shed_id, failsafe_mode, last_cloud_sync_at
    INTO _health
    FROM public.device_health
   WHERE id = _device_health_id
   FOR UPDATE;

  IF NOT FOUND OR _health.farm_id IS NULL OR _health.failsafe_mode IS DISTINCT FROM true THEN
    RETURN NULL;
  END IF;
  IF _health.last_cloud_sync_at IS NULL
     OR _health.last_cloud_sync_at < now() - interval '5 minutes' THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_health.farm_id::text, 0));

  SELECT mode, manual_override, desired_manual_override
    INTO _status
    FROM public.device_status
   WHERE user_id = _health.user_id
     AND farm_id = _health.farm_id
     AND ((_health.shed_id IS NULL AND shed_id IS NULL) OR shed_id = _health.shed_id)
   ORDER BY updated_at DESC
   LIMIT 1
   FOR UPDATE;

  IF FOUND AND (
    _status.mode = 'MANUAL'
    OR _status.manual_override IS TRUE
    OR _status.desired_manual_override IS TRUE
  ) THEN
    _mode := 'MANUAL';
  END IF;

  UPDATE public.device_health
     SET failsafe_mode = false,
         failsafe_activated_at = NULL,
         is_online = true,
         mode = _mode
   WHERE id = _health.id;

  UPDATE public.device_status
     SET mode = _mode,
         last_cloud_sync = now()
   WHERE user_id = _health.user_id
     AND farm_id = _health.farm_id
     AND ((_health.shed_id IS NULL AND shed_id IS NULL) OR shed_id = _health.shed_id);

  RETURN _mode;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_device_from_failsafe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_device_from_failsafe(uuid) TO service_role;