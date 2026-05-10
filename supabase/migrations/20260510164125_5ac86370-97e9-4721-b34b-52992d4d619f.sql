-- Phase 7: Predictive forecasting + benchmarking

-- 1. Forecast snapshots
CREATE TABLE IF NOT EXISTS public.farm_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  horizon_hours int NOT NULL DEFAULT 24,
  forecast_json jsonb NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  summary_bn text,
  recommendation_bn text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_forecasts_farm_idx
  ON public.farm_forecasts (farm_id, generated_at DESC);

ALTER TABLE public.farm_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm members can view forecasts"
  ON public.farm_forecasts FOR SELECT
  USING (public.user_can_access_farm(auth.uid(), farm_id));

-- 2. Super-admin benchmark RPC
CREATE OR REPLACE FUNCTION public.get_farm_benchmark(_days int DEFAULT 30)
RETURNS TABLE(
  farm_id uuid,
  farm_name text,
  total_birds int,
  avg_temp numeric,
  avg_humidity numeric,
  avg_ammonia numeric,
  avg_hsi numeric,
  total_alerts bigint,
  critical_alerts bigint,
  total_anomalies bigint,
  total_eggs bigint,
  total_mortality bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    COALESCE(fi.total_birds, 0)::int,
    round(AVG(sr.temperature)::numeric, 2),
    round(AVG(sr.humidity)::numeric, 2),
    round(AVG(sr.ammonia)::numeric, 2),
    round(AVG(sr.hsi)::numeric, 2),
    (SELECT count(*) FROM alerts a WHERE a.farm_id = f.id AND a.created_at >= now() - (_days || ' days')::interval),
    (SELECT count(*) FROM alerts a WHERE a.farm_id = f.id AND a.severity = 'critical' AND a.created_at >= now() - (_days || ' days')::interval),
    (SELECT count(*) FROM anomaly_detections ad WHERE ad.farm_id = f.id AND ad.detected_at >= now() - (_days || ' days')::interval),
    (SELECT COALESCE(SUM(total_eggs), 0)::bigint FROM egg_production ep WHERE ep.farm_id = f.id AND ep.production_date >= (CURRENT_DATE - _days)),
    (SELECT COALESCE(SUM(mortality_count), 0)::bigint FROM daily_summary ds WHERE ds.farm_id = f.id AND ds.summary_date >= (CURRENT_DATE - _days))
  FROM farms f
  LEFT JOIN flock_info fi ON fi.farm_id = f.id
  LEFT JOIN sensor_readings sr ON sr.farm_id = f.id AND sr.recorded_at >= now() - (_days || ' days')::interval
  WHERE f.is_active = true
  GROUP BY f.id, f.name, fi.total_birds
  ORDER BY f.name;
END $$;