-- Phase 2: lock down privileged RPCs that can create cross-tenant side effects.
-- Keep the existing signatures so deployed Edge Function callers remain compatible.

BEGIN;

CREATE OR REPLACE FUNCTION public.accept_sensor_batch(
  _device_token_id uuid,
  _user_id uuid,
  _farm_id uuid,
  _shed_id uuid,
  _readings jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device public.device_tokens%ROWTYPE;
  _accepted integer := 0;
  _rejected integer := 0;
  _oldest timestamptz;
  _newest timestamptz;
  _reading jsonb;
  _recorded_at timestamptz;
BEGIN
  -- This RPC is invoked by esp32-api using the service-role client. Checking
  -- the role as well as revoking client grants provides defense in depth.
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required'
      USING ERRCODE = '42501';
  END IF;

  IF _device_token_id IS NULL
     OR _user_id IS NULL
     OR _farm_id IS NULL THEN
    RAISE EXCEPTION 'invalid_device_binding'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO _device
  FROM public.device_tokens
  WHERE id = _device_token_id
  FOR UPDATE;

  IF NOT FOUND OR NOT COALESCE(_device.is_active, false) THEN
    RAISE EXCEPTION 'invalid_or_inactive_device'
      USING ERRCODE = '42501';
  END IF;

  IF _device.user_id IS DISTINCT FROM _user_id
     OR _device.farm_id IS DISTINCT FROM _farm_id
     OR _device.shed_id IS DISTINCT FROM _shed_id THEN
    RAISE EXCEPTION 'device_binding_mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF _readings IS NULL OR jsonb_typeof(_readings) <> 'array' THEN
    RETURN jsonb_build_object(
      'accepted', 0,
      'rejected', 0,
      'error', 'invalid_payload'
    );
  END IF;

  IF jsonb_array_length(_readings) = 0 THEN
    RETURN jsonb_build_object(
      'accepted', 0,
      'rejected', 0,
      'error', 'empty_batch'
    );
  END IF;

  IF jsonb_array_length(_readings) > 200 THEN
    RETURN jsonb_build_object(
      'accepted', 0,
      'rejected', jsonb_array_length(_readings),
      'error', 'batch_too_large'
    );
  END IF;

  FOR _reading IN SELECT jsonb_array_elements(_readings) LOOP
    BEGIN
      _recorded_at := COALESCE(
        (_reading->>'recorded_at')::timestamptz,
        now()
      );

      IF _oldest IS NULL OR _recorded_at < _oldest THEN
        _oldest := _recorded_at;
      END IF;
      IF _newest IS NULL OR _recorded_at > _newest THEN
        _newest := _recorded_at;
      END IF;

      INSERT INTO public.sensor_readings (
        user_id,
        farm_id,
        shed_id,
        temperature,
        humidity,
        ammonia,
        recorded_at
      ) VALUES (
        _device.user_id,
        _device.farm_id,
        _device.shed_id,
        NULLIF(_reading->>'temperature', '')::numeric,
        NULLIF(_reading->>'humidity', '')::numeric,
        NULLIF(_reading->>'ammonia', '')::numeric,
        _recorded_at
      );

      _accepted := _accepted + 1;
    EXCEPTION WHEN OTHERS THEN
      _rejected := _rejected + 1;
    END;
  END LOOP;

  INSERT INTO public.device_offline_buffer_log (
    device_token_id,
    farm_id,
    batch_size,
    oldest_ts,
    newest_ts,
    accepted_count,
    rejected_count
  ) VALUES (
    _device.id,
    _device.farm_id,
    _accepted + _rejected,
    _oldest,
    _newest,
    _accepted,
    _rejected
  );

  UPDATE public.device_health
  SET last_offline_buffer_flush = now(),
      offline_buffer_count = 0,
      updated_at = now()
  WHERE device_token_id = _device.id
    AND farm_id = _device.farm_id;

  RETURN jsonb_build_object(
    'accepted', _accepted,
    'rejected', _rejected,
    'oldest_ts', _oldest,
    'newest_ts', _newest
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_alert_rules(_farm_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule record;
  _value numeric;
  _bool_breach boolean;
  _last_alert_at timestamptz;
  _alert_id uuid;
  _farm_user uuid;
  _message text;
  _message_bn text;
  _created integer := 0;
  _latest record;
  _device_status record;
  _severity alert_severity;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required'
      USING ERRCODE = '42501';
  END IF;

  IF _farm_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.farms WHERE id = _farm_id) THEN
    RAISE EXCEPTION 'invalid_farm'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize evaluation per farm so concurrent cron/dispatcher invocations
  -- cannot both pass the cooldown check and create duplicate alerts.
  PERFORM pg_advisory_xact_lock(hashtextextended(_farm_id::text, 0));

  SELECT
    temperature,
    humidity,
    ammonia,
    water_usage,
    hsi,
    recorded_at,
    user_id,
    shed_id
  INTO _latest
  FROM public.sensor_readings
  WHERE farm_id = _farm_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  SELECT power_on, fan_on, last_cloud_sync, user_id
  INTO _device_status
  FROM public.device_status
  WHERE farm_id = _farm_id
  ORDER BY updated_at DESC
  LIMIT 1;

  _farm_user := COALESCE(
    _latest.user_id,
    _device_status.user_id,
    (SELECT owner_id FROM public.farms WHERE id = _farm_id)
  );

  IF _farm_user IS NULL THEN
    RETURN 0;
  END IF;

  FOR _rule IN
    SELECT *
    FROM public.alert_rules
    WHERE farm_id = _farm_id
      AND enabled = true
  LOOP
    _value := NULL;
    _bool_breach := false;

    IF _rule.metric = 'temperature' THEN
      _value := _latest.temperature;
    ELSIF _rule.metric = 'humidity' THEN
      _value := _latest.humidity;
    ELSIF _rule.metric = 'ammonia' THEN
      _value := _latest.ammonia;
    ELSIF _rule.metric = 'water_usage' THEN
      _value := _latest.water_usage;
    ELSIF _rule.metric = 'hsi' THEN
      _value := _latest.hsi;
    ELSIF _rule.metric = 'power_off' THEN
      _bool_breach := (_device_status.power_on IS FALSE);
    ELSIF _rule.metric = 'device_offline' THEN
      _bool_breach := (
        _device_status.last_cloud_sync IS NULL
        OR _device_status.last_cloud_sync < now() - interval '10 minutes'
      );
    END IF;

    IF _value IS NOT NULL AND _rule.threshold_value IS NOT NULL THEN
      _bool_breach := CASE _rule.operator
        WHEN '>' THEN _value > _rule.threshold_value
        WHEN '>=' THEN _value >= _rule.threshold_value
        WHEN '<' THEN _value < _rule.threshold_value
        WHEN '<=' THEN _value <= _rule.threshold_value
        WHEN '=' THEN _value = _rule.threshold_value
        ELSE false
      END;
    END IF;

    IF NOT _bool_breach THEN
      CONTINUE;
    END IF;

    SELECT max(created_at)
    INTO _last_alert_at
    FROM public.alerts
    WHERE rule_id = _rule.id
      AND farm_id = _farm_id;

    IF _last_alert_at IS NOT NULL
       AND _last_alert_at >
         now() - (_rule.cooldown_minutes || ' minutes')::interval THEN
      CONTINUE;
    END IF;

    _severity := CASE lower(COALESCE(_rule.severity, 'warning'))
      WHEN 'critical' THEN 'danger'
      WHEN 'high' THEN 'danger'
      WHEN 'danger' THEN 'danger'
      WHEN 'medium' THEN 'warning'
      WHEN 'warning' THEN 'warning'
      WHEN 'low' THEN 'info'
      WHEN 'info' THEN 'info'
      ELSE 'warning'
    END::alert_severity;

    _message := format(
      '%s: %s %s %s (now %s)',
      _rule.name,
      _rule.metric,
      _rule.operator,
      _rule.threshold_value,
      COALESCE(_value::text, 'n/a')
    );
    _message_bn := format(
      '⚠️ %s — %s %s %s (বর্তমান: %s)',
      _rule.name,
      _rule.metric,
      _rule.operator,
      _rule.threshold_value,
      COALESCE(_value::text, 'n/a')
    );

    INSERT INTO public.alerts (
      user_id,
      farm_id,
      shed_id,
      alert_type,
      severity,
      message,
      message_bn,
      rule_id,
      sustained_since
    ) VALUES (
      _farm_user,
      _farm_id,
      _latest.shed_id,
      (
        CASE _rule.metric
          WHEN 'temperature' THEN 'temperature'
          WHEN 'humidity' THEN 'temperature'
          WHEN 'hsi' THEN 'temperature'
          WHEN 'ammonia' THEN 'ammonia'
          WHEN 'water_usage' THEN 'water'
          WHEN 'power_off' THEN 'power'
          WHEN 'device_offline' THEN 'power'
          ELSE 'temperature'
        END
      )::alert_type,
      _severity,
      _message,
      _message_bn,
      _rule.id,
      now()
    )
    RETURNING id INTO _alert_id;

    _created := _created + 1;
  END LOOP;

  RETURN _created;
END;
$$;

-- SECURITY DEFINER functions are executable by PUBLIC by default. Reset the
-- grants explicitly after every CREATE OR REPLACE so only trusted Edge
-- Functions using the service-role key can invoke these side-effecting RPCs.
REVOKE ALL ON FUNCTION public.accept_sensor_batch(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_sensor_batch(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.evaluate_alert_rules(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_alert_rules(uuid)
  TO service_role;

-- Production permission verification found drift from the original migration:
-- authenticated currently has EXECUTE even though this helper returns raw keys.
REVOKE ALL ON FUNCTION public.get_device_secret(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_secret(uuid)
  TO service_role;

COMMIT;