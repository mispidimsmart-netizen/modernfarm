CREATE OR REPLACE FUNCTION public.get_farm_dashboard_snapshot(_farm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _latest jsonb;
  _device jsonb;
  _flock jsonb;
  _alerts_count int;
  _critical_alerts jsonb;
BEGIN
  IF _u IS NULL OR NOT public.user_can_access_farm(_u, _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT to_jsonb(sr) INTO _latest
  FROM (
    SELECT temperature, humidity, ammonia, water_usage, hsi, light_lux, recorded_at, shed_id
    FROM public.sensor_readings
    WHERE farm_id = _farm_id
    ORDER BY recorded_at DESC
    LIMIT 1
  ) sr;

  SELECT to_jsonb(ds) INTO _device
  FROM (
    SELECT
      power_on,
      fan_on,
      heater_on,
      light_on,
      alarm_on,
      circulation_fan_on,
      fogger_on,
      ceiling_fan_on,
      sprinkler_on,
      mode,
      safety_override,
      state_mismatch,
      last_cloud_sync,
      last_device_ack_at,
      updated_at
    FROM public.device_status
    WHERE farm_id = _farm_id
    ORDER BY updated_at DESC
    LIMIT 1
  ) ds;

  SELECT to_jsonb(fi) INTO _flock
  FROM (
    SELECT total_birds, breed, age_weeks, purchase_date, batch_id
    FROM public.flock_info
    WHERE farm_id = _farm_id
    LIMIT 1
  ) fi;

  SELECT count(*) INTO _alerts_count
  FROM public.alerts
  WHERE farm_id = _farm_id AND acknowledged = false;

  SELECT jsonb_agg(a) INTO _critical_alerts
  FROM (
    SELECT id, alert_type, severity, message_bn, created_at
    FROM public.alerts
    WHERE farm_id = _farm_id AND acknowledged = false
    ORDER BY created_at DESC
    LIMIT 5
  ) a;

  RETURN jsonb_build_object(
    'latest_sensor', _latest,
    'device_status', _device,
    'flock_info', _flock,
    'unread_alerts_count', COALESCE(_alerts_count, 0),
    'recent_alerts', COALESCE(_critical_alerts, '[]'::jsonb),
    'snapshot_at', now()
  );
END;
$$;