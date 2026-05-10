-- ============================================
-- Phase 6: Data Platform & Analytics
-- ============================================

-- 1. Hourly sensor rollup materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.sensor_hourly_rollup_mv AS
SELECT
  farm_id,
  shed_id,
  date_trunc('hour', recorded_at) AS hour,
  count(*)::int AS sample_count,
  round(avg(temperature)::numeric, 2) AS avg_temp,
  round(min(temperature)::numeric, 2) AS min_temp,
  round(max(temperature)::numeric, 2) AS max_temp,
  round(avg(humidity)::numeric, 2) AS avg_humidity,
  round(min(humidity)::numeric, 2) AS min_humidity,
  round(max(humidity)::numeric, 2) AS max_humidity,
  round(avg(ammonia)::numeric, 2) AS avg_ammonia,
  round(max(ammonia)::numeric, 2) AS max_ammonia,
  round(avg(hsi)::numeric, 2) AS avg_hsi,
  round(max(hsi)::numeric, 2) AS max_hsi,
  round(avg(water_usage)::numeric, 2) AS avg_water
FROM public.sensor_readings
WHERE farm_id IS NOT NULL
GROUP BY farm_id, shed_id, date_trunc('hour', recorded_at);

CREATE UNIQUE INDEX IF NOT EXISTS sensor_hourly_rollup_mv_uniq
  ON public.sensor_hourly_rollup_mv (farm_id, shed_id, hour);
CREATE INDEX IF NOT EXISTS sensor_hourly_rollup_mv_farm_hour
  ON public.sensor_hourly_rollup_mv (farm_id, hour DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_sensor_hourly_rollup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.sensor_hourly_rollup_mv;
EXCEPTION WHEN OTHERS THEN
  REFRESH MATERIALIZED VIEW public.sensor_hourly_rollup_mv;
END $$;

-- Read RPC with RLS check
CREATE OR REPLACE FUNCTION public.get_sensor_hourly_rollup(_farm_id uuid, _hours int DEFAULT 168)
RETURNS SETOF public.sensor_hourly_rollup_mv
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_farm(auth.uid(), _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT * FROM public.sensor_hourly_rollup_mv
  WHERE farm_id = _farm_id AND hour >= now() - (_hours || ' hours')::interval
  ORDER BY hour DESC;
END $$;

-- 2. Anomaly detections table
CREATE TABLE IF NOT EXISTS public.anomaly_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  shed_id uuid,
  detected_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  metric text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  confidence numeric(3,2) NOT NULL DEFAULT 0.5,
  title_bn text NOT NULL,
  description_bn text,
  recommendation_bn text,
  reasoning text,
  data_snapshot jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anomaly_detections_farm_idx
  ON public.anomaly_detections (farm_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS anomaly_detections_unack_idx
  ON public.anomaly_detections (farm_id, acknowledged, detected_at DESC);

ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view anomalies"
  ON public.anomaly_detections FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));

CREATE POLICY "Farm members can ack anomalies"
  ON public.anomaly_detections FOR UPDATE
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- service-role only inserts (no insert policy => restricted)

-- ack helper
CREATE OR REPLACE FUNCTION public.acknowledge_anomaly(_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _u uuid := auth.uid(); _farm uuid;
BEGIN
  IF _u IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT farm_id INTO _farm FROM anomaly_detections WHERE id = _id;
  IF _farm IS NULL OR NOT public.user_can_access_farm(_u, _farm) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE anomaly_detections
    SET acknowledged = true, acknowledged_at = now(), acknowledged_by = _u
    WHERE id = _id;
  RETURN true;
END $$;