
-- Phase 6 Step 1: Composite indexes (additive, IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_recorded ON public.sensor_readings (farm_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_shed_recorded ON public.sensor_readings (shed_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_farm_ack_created ON public.alerts (farm_id, acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_commands_pending ON public.device_commands (device_name, executed_at) WHERE executed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_farm_date ON public.expenses (farm_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_farm_date ON public.income (farm_id, income_date DESC);

-- Phase 6 Step 3: Single-call dashboard snapshot RPC
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
    FROM sensor_readings WHERE farm_id = _farm_id
    ORDER BY recorded_at DESC LIMIT 1
  ) sr;

  SELECT to_jsonb(ds) INTO _device
  FROM (
    SELECT power_on, fan_on, heater_on, water_pump_on, light_on, safety_status, last_cloud_sync
    FROM device_status WHERE farm_id = _farm_id
    ORDER BY updated_at DESC LIMIT 1
  ) ds;

  SELECT to_jsonb(fi) INTO _flock
  FROM (
    SELECT total_birds, breed, age_weeks, purchase_date, batch_id
    FROM flock_info WHERE farm_id = _farm_id LIMIT 1
  ) fi;

  SELECT count(*) INTO _alerts_count
  FROM alerts WHERE farm_id = _farm_id AND acknowledged = false;

  SELECT jsonb_agg(a) INTO _critical_alerts FROM (
    SELECT id, alert_type, severity, message_bn, created_at
    FROM alerts WHERE farm_id = _farm_id AND acknowledged = false
    ORDER BY created_at DESC LIMIT 5
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

-- Pre-bucketed sensor history (1h buckets, last N hours)
CREATE OR REPLACE FUNCTION public.get_sensor_history(_farm_id uuid, _hours int DEFAULT 24)
RETURNS TABLE(bucket timestamptz, avg_temp numeric, avg_humidity numeric, avg_ammonia numeric, avg_hsi numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_farm(auth.uid(), _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT date_trunc('hour', recorded_at) AS bucket,
         round(avg(temperature)::numeric, 2),
         round(avg(humidity)::numeric, 2),
         round(avg(ammonia)::numeric, 2),
         round(avg(hsi)::numeric, 2)
  FROM sensor_readings
  WHERE farm_id = _farm_id AND recorded_at >= now() - (_hours || ' hours')::interval
  GROUP BY 1 ORDER BY 1;
END;
$$;
