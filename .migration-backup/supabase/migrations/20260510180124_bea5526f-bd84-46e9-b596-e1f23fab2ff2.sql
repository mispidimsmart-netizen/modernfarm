-- Phase 9: Sensor Upgrade — Additive only

ALTER TABLE public.sensor_readings 
  ADD COLUMN IF NOT EXISTS temp_precise NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS humidity_precise NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS lux_precise NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS nh3_ppm_precise NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS co2_ppm INTEGER,
  ADD COLUMN IF NOT EXISTS pm25_ugm3 NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pm10_ugm3 NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS sensor_source JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sensor_readings.temp_precise IS 'SHT31 industrial temp (±0.3°C)';
COMMENT ON COLUMN public.sensor_readings.co2_ppm IS 'SCD41 NDIR CO2 (0-40000 ppm)';
COMMENT ON COLUMN public.sensor_readings.pm25_ugm3 IS 'PMS5003 PM2.5 µg/m³';
COMMENT ON COLUMN public.sensor_readings.sensor_source IS 'JSON map of measurement -> sensor model';

CREATE TABLE IF NOT EXISTS public.device_sensor_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  farm_id UUID NOT NULL,
  sensor_type TEXT NOT NULL CHECK (sensor_type IN ('temp_humidity','ammonia','light','co2','particulate','water_flow','pressure','wind','weight')),
  sensor_model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calibration_offset NUMERIC(8,4) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, sensor_type, sensor_model)
);

CREATE INDEX IF NOT EXISTS idx_device_sensor_inventory_farm ON public.device_sensor_inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_sensor_inventory_device ON public.device_sensor_inventory(device_id);

ALTER TABLE public.device_sensor_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view sensor inventory"
ON public.device_sensor_inventory FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = device_sensor_inventory.farm_id AND fm.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Farm admins can manage sensor inventory"
ON public.device_sensor_inventory FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = device_sensor_inventory.farm_id AND fm.user_id = auth.uid() AND fm.role IN ('owner','admin'))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = device_sensor_inventory.farm_id AND fm.user_id = auth.uid() AND fm.role IN ('owner','admin'))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_device_sensor_inventory_updated
BEFORE UPDATE ON public.device_sensor_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.air_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  shed_id UUID,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('co2_high','pm25_high','pm10_high','nh3_high')),
  measured_value NUMERIC(10,2) NOT NULL,
  threshold_value NUMERIC(10,2) NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','danger','critical')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_quality_alerts_farm ON public.air_quality_alerts(farm_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_air_quality_alerts_unresolved ON public.air_quality_alerts(farm_id) WHERE resolved_at IS NULL;

ALTER TABLE public.air_quality_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view air quality alerts"
ON public.air_quality_alerts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = air_quality_alerts.farm_id AND fm.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Farm members can acknowledge air quality alerts"
ON public.air_quality_alerts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = air_quality_alerts.farm_id AND fm.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.farm_members fm WHERE fm.farm_id = air_quality_alerts.farm_id AND fm.user_id = auth.uid()));

CREATE POLICY "System can insert air quality alerts"
ON public.air_quality_alerts FOR INSERT TO authenticated WITH CHECK (true);

-- RPC: best-available reading (precise > legacy fallback)
CREATE OR REPLACE FUNCTION public.get_best_sensor_reading(p_farm_id UUID, p_shed_id UUID DEFAULT NULL)
RETURNS TABLE (
  temperature NUMERIC, humidity NUMERIC, ammonia NUMERIC, light_lux NUMERIC,
  co2 INTEGER, pm25 NUMERIC, pm10 NUMERIC, source JSONB, recorded_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    COALESCE(sr.temp_precise, sr.temperature)::NUMERIC,
    COALESCE(sr.humidity_precise, sr.humidity)::NUMERIC,
    COALESCE(sr.nh3_ppm_precise, sr.ammonia)::NUMERIC,
    COALESCE(sr.lux_precise, sr.light_lux)::NUMERIC,
    sr.co2_ppm, sr.pm25_ugm3, sr.pm10_ugm3, sr.sensor_source, sr.recorded_at
  FROM public.sensor_readings sr
  WHERE sr.farm_id = p_farm_id
    AND (p_shed_id IS NULL OR sr.shed_id = p_shed_id)
  ORDER BY sr.recorded_at DESC
  LIMIT 1;
$$;

-- RPC: threshold check + auto-create alerts
CREATE OR REPLACE FUNCTION public.check_air_quality_thresholds(
  p_farm_id UUID, p_shed_id UUID,
  p_co2 INTEGER DEFAULT NULL, p_pm25 NUMERIC DEFAULT NULL,
  p_pm10 NUMERIC DEFAULT NULL, p_nh3 NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_alerts JSONB := '[]'::jsonb;
BEGIN
  IF p_co2 IS NOT NULL AND p_co2 > 3000 THEN
    INSERT INTO public.air_quality_alerts (farm_id, shed_id, alert_type, measured_value, threshold_value, severity)
    VALUES (p_farm_id, p_shed_id, 'co2_high', p_co2, 3000, CASE WHEN p_co2>5000 THEN 'danger' ELSE 'warning' END);
    v_alerts := v_alerts || jsonb_build_object('type','co2_high','value',p_co2);
  END IF;
  IF p_pm25 IS NOT NULL AND p_pm25 > 75 THEN
    INSERT INTO public.air_quality_alerts (farm_id, shed_id, alert_type, measured_value, threshold_value, severity)
    VALUES (p_farm_id, p_shed_id, 'pm25_high', p_pm25, 75, CASE WHEN p_pm25>150 THEN 'danger' ELSE 'warning' END);
    v_alerts := v_alerts || jsonb_build_object('type','pm25_high','value',p_pm25);
  END IF;
  IF p_pm10 IS NOT NULL AND p_pm10 > 150 THEN
    INSERT INTO public.air_quality_alerts (farm_id, shed_id, alert_type, measured_value, threshold_value, severity)
    VALUES (p_farm_id, p_shed_id, 'pm10_high', p_pm10, 150, CASE WHEN p_pm10>250 THEN 'danger' ELSE 'warning' END);
    v_alerts := v_alerts || jsonb_build_object('type','pm10_high','value',p_pm10);
  END IF;
  IF p_nh3 IS NOT NULL AND p_nh3 > 25 THEN
    INSERT INTO public.air_quality_alerts (farm_id, shed_id, alert_type, measured_value, threshold_value, severity)
    VALUES (p_farm_id, p_shed_id, 'nh3_high', p_nh3, 25, CASE WHEN p_nh3>50 THEN 'danger' ELSE 'warning' END);
    v_alerts := v_alerts || jsonb_build_object('type','nh3_high','value',p_nh3);
  END IF;
  RETURN jsonb_build_object('alerts_created', jsonb_array_length(v_alerts), 'details', v_alerts);
END;
$$;

-- RPC: sensor upgrade summary
CREATE OR REPLACE FUNCTION public.get_sensor_upgrade_summary(p_farm_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_devices', COUNT(DISTINCT device_id),
    'sht31_count', COUNT(*) FILTER (WHERE sensor_model = 'SHT31' AND is_active),
    'bh1750_count', COUNT(*) FILTER (WHERE sensor_model = 'BH1750' AND is_active),
    'ze03_count', COUNT(*) FILTER (WHERE sensor_model = 'ZE03-NH3' AND is_active),
    'scd41_count', COUNT(*) FILTER (WHERE sensor_model = 'SCD41' AND is_active),
    'pms5003_count', COUNT(*) FILTER (WHERE sensor_model = 'PMS5003' AND is_active),
    'tier1_devices', COUNT(DISTINCT device_id) FILTER (WHERE sensor_model IN ('SHT31','BH1750') AND is_active),
    'tier2_devices', COUNT(DISTINCT device_id) FILTER (WHERE sensor_model = 'ZE03-NH3' AND is_active),
    'tier3_devices', COUNT(DISTINCT device_id) FILTER (WHERE sensor_model IN ('SCD41','PMS5003') AND is_active)
  )
  FROM public.device_sensor_inventory
  WHERE p_farm_id IS NULL OR farm_id = p_farm_id;
$$;