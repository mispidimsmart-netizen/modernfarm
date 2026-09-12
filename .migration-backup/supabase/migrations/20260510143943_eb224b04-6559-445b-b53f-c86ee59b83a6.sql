
-- Phase 6 Step 4: Daily rollup materialized view
DROP MATERIALIZED VIEW IF EXISTS public.farm_daily_rollup_mv;

CREATE MATERIALIZED VIEW public.farm_daily_rollup_mv AS
WITH sensor_agg AS (
  SELECT farm_id, shed_id, date_trunc('day', recorded_at)::date AS day,
         round(avg(temperature)::numeric, 2) AS avg_temp,
         round(min(temperature)::numeric, 2) AS min_temp,
         round(max(temperature)::numeric, 2) AS max_temp,
         round(avg(humidity)::numeric, 2) AS avg_humidity,
         round(avg(ammonia)::numeric, 2) AS avg_ammonia,
         round(avg(hsi)::numeric, 2) AS avg_hsi,
         count(*) AS sensor_samples
  FROM public.sensor_readings
  WHERE recorded_at >= now() - interval '180 days'
  GROUP BY 1, 2, 3
),
eggs AS (
  SELECT farm_id, shed_id, production_date AS day,
         sum(total_eggs) AS total_eggs
  FROM public.egg_production
  WHERE production_date >= (CURRENT_DATE - INTERVAL '180 days')
  GROUP BY 1, 2, 3
),
feed AS (
  SELECT farm_id, NULL::uuid AS shed_id, consumption_date AS day,
         sum(quantity_kg) AS total_feed_kg
  FROM public.feed_consumption
  WHERE consumption_date >= (CURRENT_DATE - INTERVAL '180 days')
  GROUP BY 1, 3
)
SELECT
  COALESCE(s.farm_id, e.farm_id, f.farm_id) AS farm_id,
  COALESCE(s.shed_id, e.shed_id) AS shed_id,
  COALESCE(s.day, e.day, f.day) AS day,
  s.avg_temp, s.min_temp, s.max_temp, s.avg_humidity, s.avg_ammonia, s.avg_hsi,
  COALESCE(s.sensor_samples, 0) AS sensor_samples,
  COALESCE(e.total_eggs, 0) AS total_eggs,
  COALESCE(f.total_feed_kg, 0) AS total_feed_kg
FROM sensor_agg s
FULL OUTER JOIN eggs e
  ON e.farm_id = s.farm_id AND e.shed_id IS NOT DISTINCT FROM s.shed_id AND e.day = s.day
FULL OUTER JOIN feed f
  ON f.farm_id = COALESCE(s.farm_id, e.farm_id) AND f.day = COALESCE(s.day, e.day);

CREATE UNIQUE INDEX idx_farm_daily_rollup_unique
  ON public.farm_daily_rollup_mv (farm_id, COALESCE(shed_id, '00000000-0000-0000-0000-000000000000'::uuid), day);

CREATE INDEX idx_farm_daily_rollup_farm_day
  ON public.farm_daily_rollup_mv (farm_id, day DESC);

-- Refresh function (callable from cron OR manually by admin)
CREATE OR REPLACE FUNCTION public.refresh_farm_daily_rollup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.farm_daily_rollup_mv;
EXCEPTION WHEN OTHERS THEN
  -- First refresh cannot be CONCURRENTLY; fallback to plain refresh
  REFRESH MATERIALIZED VIEW public.farm_daily_rollup_mv;
END;
$$;

-- Restrict direct read to authenticated users; RLS not available on MV, so use a wrapper RPC
REVOKE ALL ON public.farm_daily_rollup_mv FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_farm_daily_rollup(_farm_id uuid, _days int DEFAULT 30)
RETURNS SETOF public.farm_daily_rollup_mv
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_farm(auth.uid(), _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT * FROM public.farm_daily_rollup_mv
  WHERE farm_id = _farm_id AND day >= (CURRENT_DATE - (_days || ' days')::interval)
  ORDER BY day DESC;
END;
$$;
