-- ═══════════════════════════════════════════════════════════════
-- Phase 4: Advanced Alerting & Notifications
-- ═══════════════════════════════════════════════════════════════

-- 1. alert_rules ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  metric text NOT NULL CHECK (metric IN (
    'temperature','humidity','ammonia','water_usage','hsi',
    'power_off','device_offline','safety_breach','fan_failure'
  )),
  operator text NOT NULL DEFAULT '>' CHECK (operator IN ('>','<','>=','<=','=')),
  threshold_value numeric,
  duration_seconds integer NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  enabled boolean NOT NULL DEFAULT true,
  channels jsonb NOT NULL DEFAULT '{"push":true,"sms":false,"whatsapp":false,"in_app":true}'::jsonb,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_rules_farm ON public.alert_rules(farm_id);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm tenant access alert_rules" ON public.alert_rules
  FOR ALL USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE TRIGGER trg_alert_rules_updated BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. alert_channel_config ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_channel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL UNIQUE REFERENCES public.farms(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  phone_e164 text,
  escalation_phone_e164 text,
  quiet_hours_start text,  -- 'HH:MM'
  quiet_hours_end text,
  escalation_minutes integer NOT NULL DEFAULT 15,
  critical_bypass_quiet_hours boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alert_channel_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm tenant access alert_channel_config" ON public.alert_channel_config
  FOR ALL USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE TRIGGER trg_alert_channel_config_updated BEFORE UPDATE ON public.alert_channel_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. alert_deliveries -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('push','sms','whatsapp','in_app')),
  status text NOT NULL CHECK (status IN ('queued','sent','failed','skipped_quiet','skipped_cooldown','skipped_disabled')),
  recipient text,
  provider_message_id text,
  error_message text,
  is_escalation boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_alert ON public.alert_deliveries(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_farm ON public.alert_deliveries(farm_id);
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Farm tenant view alert_deliveries" ON public.alert_deliveries
  FOR SELECT USING (public.user_can_access_farm(auth.uid(), farm_id));

-- 4. Add columns to alerts (additive) --------------------------------------
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sustained_since timestamptz;
CREATE INDEX IF NOT EXISTS idx_alerts_unack ON public.alerts(farm_id, acknowledged_at) WHERE acknowledged_at IS NULL;

-- 5. evaluate_alert_rules RPC ----------------------------------------------
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
  _msg text;
  _msg_bn text;
  _created int := 0;
  _latest record;
  _ds record;
BEGIN
  -- Latest sensor & device snapshot
  SELECT temperature, humidity, ammonia, water_usage, hsi, recorded_at, user_id, shed_id
    INTO _latest
  FROM sensor_readings
  WHERE farm_id = _farm_id
  ORDER BY recorded_at DESC LIMIT 1;

  SELECT power_on, fan_on, last_cloud_sync, user_id INTO _ds
  FROM device_status WHERE farm_id = _farm_id ORDER BY updated_at DESC LIMIT 1;

  _farm_user := COALESCE(_latest.user_id, _ds.user_id, (SELECT owner_id FROM farms WHERE id = _farm_id));
  IF _farm_user IS NULL THEN RETURN 0; END IF;

  FOR _rule IN
    SELECT * FROM alert_rules WHERE farm_id = _farm_id AND enabled = true
  LOOP
    _value := NULL;
    _bool_breach := false;

    IF _rule.metric = 'temperature' THEN _value := _latest.temperature;
    ELSIF _rule.metric = 'humidity' THEN _value := _latest.humidity;
    ELSIF _rule.metric = 'ammonia' THEN _value := _latest.ammonia;
    ELSIF _rule.metric = 'water_usage' THEN _value := _latest.water_usage;
    ELSIF _rule.metric = 'hsi' THEN _value := _latest.hsi;
    ELSIF _rule.metric = 'power_off' THEN _bool_breach := (_ds.power_on IS FALSE);
    ELSIF _rule.metric = 'device_offline' THEN
      _bool_breach := (_ds.last_cloud_sync IS NULL OR _ds.last_cloud_sync < now() - interval '10 minutes');
    END IF;

    -- Check threshold breach
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

    -- Cooldown: skip if recent alert from same rule
    SELECT MAX(created_at) INTO _last_alert_at
    FROM alerts WHERE rule_id = _rule.id AND farm_id = _farm_id;
    IF _last_alert_at IS NOT NULL
       AND _last_alert_at > now() - (_rule.cooldown_minutes || ' minutes')::interval THEN
      CONTINUE;
    END IF;

    _msg := format('%s breach: %s %s %s (current %s)',
      _rule.name, _rule.metric, _rule.operator, _rule.threshold_value, COALESCE(_value::text,'n/a'));
    _msg_bn := format('⚠️ %s — %s %s %s (বর্তমান: %s)',
      _rule.name, _rule.metric, _rule.operator, _rule.threshold_value, COALESCE(_value::text,'n/a'));

    INSERT INTO alerts (
      user_id, farm_id, shed_id, alert_type, severity, message, message_bn,
      rule_id, sustained_since
    ) VALUES (
      _farm_user, _farm_id, _latest.shed_id,
      CASE _rule.metric
        WHEN 'temperature' THEN 'temperature_high'::alert_type
        WHEN 'humidity' THEN 'humidity_high'::alert_type
        WHEN 'ammonia' THEN 'ammonia_high'::alert_type
        ELSE 'system_error'::alert_type
      END,
      _rule.severity::alert_severity,
      _msg, _msg_bn, _rule.id, now()
    ) RETURNING id INTO _alert_id;

    _created := _created + 1;
  END LOOP;

  RETURN _created;
END;
$$;

-- 6. acknowledge_alert RPC --------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_alert(_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u uuid := auth.uid();
  _farm uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT farm_id INTO _farm FROM alerts WHERE id = _alert_id;
  IF _farm IS NULL OR NOT public.user_can_access_farm(_u, _farm) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE alerts SET acknowledged = true, acknowledged_at = now(), acknowledged_by = _u
  WHERE id = _alert_id;
  RETURN true;
END;
$$;

-- 7. Enable realtime on new tables (alerts already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_deliveries;