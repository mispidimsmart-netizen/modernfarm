-- ALERT-01: per-shed alert evaluation.
-- The evaluator used ONE latest reading per farm, so a hot shed could raise an
-- alert attributed to another shed (or silence it). Rules are now evaluated
-- once per shed, with cooldown and event_key scoped per (rule, shed).
CREATE OR REPLACE FUNCTION public.evaluate_alert_rules(_farm_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule record;
  _shed record;
  _value numeric;
  _bool_breach boolean;
  _last_alert_at timestamptz;
  _alert_id uuid;
  _farm_user uuid;
  _message text;
  _message_bn text;
  _event_key text;
  _created integer := 0;
  _latest record;
  _device_status record;
  _has_latest boolean := false;
  _has_device_status boolean := false;
  _severity alert_severity;
  _shed_label text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden_service_role_required' USING ERRCODE = '42501';
  END IF;

  IF _farm_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.farms WHERE id = _farm_id) THEN
    RAISE EXCEPTION 'invalid_farm' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_farm_id::text, 0));

  SELECT owner_id INTO _farm_user FROM public.farms WHERE id = _farm_id;

  -- Evaluate every shed of the farm independently. A farm with no shed rows
  -- still gets one pass with shed_id = NULL (legacy single-shed farms).
  FOR _shed IN
    SELECT id, name FROM public.sheds WHERE farm_id = _farm_id
    UNION ALL
    SELECT NULL::uuid, NULL::text
    WHERE NOT EXISTS (SELECT 1 FROM public.sheds WHERE farm_id = _farm_id)
  LOOP
    _shed_label := coalesce(_shed.name, '');

    SELECT temperature, humidity, ammonia, water_usage, hsi, recorded_at, user_id, shed_id
      INTO _latest
    FROM public.sensor_readings
    WHERE farm_id = _farm_id
      AND (_shed.id IS NULL OR shed_id = _shed.id)
    ORDER BY recorded_at DESC
    LIMIT 1;
    _has_latest := FOUND;

    SELECT power_on, fan_on, last_cloud_sync, user_id
      INTO _device_status
    FROM public.device_status
    WHERE farm_id = _farm_id
      AND (_shed.id IS NULL OR shed_id = _shed.id)
    ORDER BY updated_at DESC
    LIMIT 1;
    _has_device_status := FOUND;

    IF _farm_user IS NULL AND _has_latest THEN
      _farm_user := _latest.user_id;
    END IF;
    IF _farm_user IS NULL AND _has_device_status THEN
      _farm_user := _device_status.user_id;
    END IF;
    IF _farm_user IS NULL THEN
      RETURN _created;
    END IF;

    FOR _rule IN
      SELECT * FROM public.alert_rules
      WHERE farm_id = _farm_id AND enabled = true
    LOOP
      _value := NULL;
      _bool_breach := false;

      IF _rule.metric IN ('temperature', 'humidity', 'ammonia', 'water_usage', 'hsi') THEN
        IF NOT _has_latest THEN
          CONTINUE;
        END IF;
        IF _rule.metric = 'temperature' THEN
          _value := _latest.temperature;
        ELSIF _rule.metric = 'humidity' THEN
          _value := _latest.humidity;
        ELSIF _rule.metric = 'ammonia' THEN
          _value := _latest.ammonia;
        ELSIF _rule.metric = 'water_usage' THEN
          _value := _latest.water_usage;
        ELSE
          _value := _latest.hsi;
        END IF;
        IF _value IS NULL OR _rule.threshold_value IS NULL THEN
          CONTINUE;
        END IF;
        _bool_breach := CASE _rule.operator
          WHEN '>' THEN _value > _rule.threshold_value
          WHEN '>=' THEN _value >= _rule.threshold_value
          WHEN '<' THEN _value < _rule.threshold_value
          WHEN '<=' THEN _value <= _rule.threshold_value
          WHEN '=' THEN _value = _rule.threshold_value
          ELSE false
        END;
      ELSIF _rule.metric IN ('power_off', 'device_offline') THEN
        IF NOT _has_device_status THEN
          CONTINUE;
        END IF;
        IF _rule.metric = 'power_off' THEN
          _bool_breach := (_device_status.power_on IS FALSE);
        ELSE
          _bool_breach := (
            _device_status.last_cloud_sync IS NULL
            OR _device_status.last_cloud_sync < now() - interval '10 minutes'
          );
        END IF;
      ELSE
        CONTINUE;
      END IF;

      IF NOT _bool_breach THEN
        CONTINUE;
      END IF;

      -- Cooldown is per (rule, shed): one hot shed must not mute another shed.
      SELECT max(created_at) INTO _last_alert_at
      FROM public.alerts
      WHERE rule_id = _rule.id
        AND farm_id = _farm_id
        AND ((_shed.id IS NULL AND shed_id IS NULL) OR shed_id = _shed.id);

      IF _last_alert_at IS NOT NULL
         AND _last_alert_at > now() - (COALESCE(_rule.cooldown_minutes, 0) || ' minutes')::interval THEN
        CONTINUE;
      END IF;

      _severity := CASE lower(COALESCE(_rule.severity, 'warning'))
        WHEN 'critical' THEN 'danger'
        WHEN 'high' THEN 'danger'
        WHEN 'danger' THEN 'danger'
        ELSE 'warning'
      END::alert_severity;

      _message := format('%s: %s %s %s (now %s)%s',
        _rule.name, _rule.metric, _rule.operator, _rule.threshold_value,
        COALESCE(_value::text, 'n/a'),
        CASE WHEN _shed_label <> '' THEN ' [' || _shed_label || ']' ELSE '' END);
      _message_bn := format('⚠️ %s — %s %s %s (বর্তমান: %s)%s',
        _rule.name, _rule.metric, _rule.operator, _rule.threshold_value,
        COALESCE(_value::text, 'n/a'),
        CASE WHEN _shed_label <> '' THEN ' [' || _shed_label || ']' ELSE '' END);

      _event_key := format('v8:rule:%s:%s:%s',
        _rule.id,
        COALESCE(_shed.id::text, 'farm'),
        floor(extract(epoch FROM now()) /
          (GREATEST(COALESCE(_rule.cooldown_minutes, 0), 1) * 60))::bigint
      );
      _alert_id := NULL;

      INSERT INTO public.alerts (
        user_id, farm_id, shed_id, alert_type, severity, message, message_bn,
        rule_id, sustained_since, event_key
      ) VALUES (
        _farm_user, _farm_id,
        COALESCE(_shed.id, CASE WHEN _has_latest THEN _latest.shed_id ELSE NULL END),
        CASE _rule.metric
          WHEN 'temperature' THEN 'temperature'
          WHEN 'humidity' THEN 'temperature'
          WHEN 'hsi' THEN 'temperature'
          WHEN 'ammonia' THEN 'ammonia'
          WHEN 'water_usage' THEN 'water'
          WHEN 'power_off' THEN 'power'
          WHEN 'device_offline' THEN 'power'
          ELSE 'temperature'
        END::alert_type,
        _severity, _message, _message_bn, _rule.id, now(), _event_key
      )
      ON CONFLICT (farm_id, event_key) DO NOTHING
      RETURNING id INTO _alert_id;

      IF _alert_id IS NOT NULL THEN
        _created := _created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN _created;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_alert_rules(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_alert_rules(uuid) TO service_role;