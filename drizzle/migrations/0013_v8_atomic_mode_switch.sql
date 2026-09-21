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
  _device_name text;
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

  UPDATE public.device_health
     SET mode = _mode
   WHERE farm_id = _farm_id;

  SELECT device_name INTO _device_name
    FROM public.device_status
   WHERE farm_id = _farm_id
   ORDER BY updated_at DESC
   LIMIT 1;

  INSERT INTO public.device_commands (user_id, farm_id, command_type, command_value, device_name, executed)
  VALUES (_uid, _farm_id, 'stop_automation', _is_manual, coalesce(_device_name, 'Shed A'), false);

  RETURN jsonb_build_object(
    'mode', _mode,
    'farm_id', _farm_id,
    'settings_updated', _settings_rows,
    'devices_updated', _device_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_farm_automation_mode(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_farm_automation_mode(uuid, text) TO authenticated, service_role;