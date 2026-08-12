CREATE OR REPLACE FUNCTION public.evaluate_alert_rules(_farm_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _rule record; _value numeric; _bool_breach boolean;
  _last_alert_at timestamptz; _alert_id uuid; _farm_user uuid;
  _msg text; _msg_bn text; _created int := 0;
  _latest record; _ds record; _sev alert_severity;
BEGIN
  SELECT temperature, humidity, ammonia, water_usage, hsi, recorded_at, user_id, shed_id
    INTO _latest FROM sensor_readings WHERE farm_id = _farm_id
    ORDER BY recorded_at DESC LIMIT 1;
  SELECT power_on, fan_on, last_cloud_sync, user_id INTO _ds
    FROM device_status WHERE farm_id = _farm_id ORDER BY updated_at DESC LIMIT 1;
  _farm_user := COALESCE(_latest.user_id, _ds.user_id, (SELECT owner_id FROM farms WHERE id = _farm_id));
  IF _farm_user IS NULL THEN RETURN 0; END IF;

  FOR _rule IN SELECT * FROM alert_rules WHERE farm_id = _farm_id AND enabled = true LOOP
    _value := NULL; _bool_breach := false;
    IF _rule.metric = 'temperature' THEN _value := _latest.temperature;
    ELSIF _rule.metric = 'humidity' THEN _value := _latest.humidity;
    ELSIF _rule.metric = 'ammonia' THEN _value := _latest.ammonia;
    ELSIF _rule.metric = 'water_usage' THEN _value := _latest.water_usage;
    ELSIF _rule.metric = 'hsi' THEN _value := _latest.hsi;
    ELSIF _rule.metric = 'power_off' THEN _bool_breach := (_ds.power_on IS FALSE);
    ELSIF _rule.metric = 'device_offline' THEN
      _bool_breach := (_ds.last_cloud_sync IS NULL OR _ds.last_cloud_sync < now() - interval '10 minutes');
    END IF;
    IF _value IS NOT NULL AND _rule.threshold_value IS NOT NULL THEN
      _bool_breach := CASE _rule.operator
        WHEN '>'  THEN _value >  _rule.threshold_value
        WHEN '>=' THEN _value >= _rule.threshold_value
        WHEN '<'  THEN _value <  _rule.threshold_value
        WHEN '<=' THEN _value <= _rule.threshold_value
        WHEN '='  THEN _value =  _rule.threshold_value
        ELSE false END;
    END IF;
    IF NOT _bool_breach THEN CONTINUE; END IF;
    SELECT MAX(created_at) INTO _last_alert_at FROM alerts WHERE rule_id = _rule.id AND farm_id = _farm_id;
    IF _last_alert_at IS NOT NULL AND _last_alert_at > now() - (_rule.cooldown_minutes || ' minutes')::interval THEN
      CONTINUE;
    END IF;

    -- Map free-text rule severities (critical/high/medium/low) onto the enum
    _sev := CASE lower(COALESCE(_rule.severity, 'warning'))
              WHEN 'critical' THEN 'danger'
              WHEN 'high'     THEN 'danger'
              WHEN 'danger'   THEN 'danger'
              WHEN 'medium'   THEN 'warning'
              WHEN 'warning'  THEN 'warning'
              WHEN 'low'      THEN 'info'
              WHEN 'info'     THEN 'info'
              ELSE 'warning' END::alert_severity;

    _msg := format('%s: %s %s %s (now %s)', _rule.name, _rule.metric, _rule.operator, _rule.threshold_value, COALESCE(_value::text,'n/a'));
    _msg_bn := format('⚠️ %s — %s %s %s (বর্তমান: %s)', _rule.name, _rule.metric, _rule.operator, _rule.threshold_value, COALESCE(_value::text,'n/a'));
    INSERT INTO alerts (user_id, farm_id, shed_id, alert_type, severity, message, message_bn, rule_id, sustained_since)
    VALUES (
      _farm_user, _farm_id, _latest.shed_id,
      (CASE _rule.metric
        WHEN 'temperature' THEN 'temperature'
        WHEN 'humidity' THEN 'temperature'
        WHEN 'hsi' THEN 'temperature'
        WHEN 'ammonia' THEN 'ammonia'
        WHEN 'water_usage' THEN 'water'
        WHEN 'power_off' THEN 'power'
        WHEN 'device_offline' THEN 'power'
        ELSE 'temperature' END)::alert_type,
      _sev,
      _msg, _msg_bn, _rule.id, now()
    ) RETURNING id INTO _alert_id;
    _created := _created + 1;
  END LOOP;
  RETURN _created;
END;
$function$;