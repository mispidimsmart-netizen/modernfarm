
CREATE OR REPLACE FUNCTION public.get_anonymized_benchmark(_days integer DEFAULT 30)
RETURNS TABLE(
  anon_id text,
  is_self boolean,
  total_birds integer,
  avg_temp numeric,
  avg_humidity numeric,
  avg_ammonia numeric,
  avg_hsi numeric,
  total_alerts bigint,
  critical_alerts bigint,
  total_anomalies bigint,
  total_eggs bigint,
  total_mortality bigint,
  reading_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      f.id AS farm_id,
      (f.owner_id = _uid) AS is_self,
      COALESCE(fi.total_birds, 0)::int AS total_birds,
      round(AVG(sr.temperature)::numeric, 2) AS avg_temp,
      round(AVG(sr.humidity)::numeric, 2) AS avg_humidity,
      round(AVG(sr.ammonia)::numeric, 2) AS avg_ammonia,
      round(AVG(sr.hsi)::numeric, 2) AS avg_hsi,
      count(sr.id) AS reading_count
    FROM farms f
    LEFT JOIN flock_info fi ON fi.farm_id = f.id
    LEFT JOIN sensor_readings sr
      ON sr.farm_id = f.id AND sr.recorded_at >= now() - (_days || ' days')::interval
    WHERE f.is_active = true
    GROUP BY f.id, f.owner_id, fi.total_birds
  )
  SELECT
    CASE WHEN b.is_self THEN 'আপনার ফার্ম'
         ELSE 'Farm-' || substr(md5(b.farm_id::text), 1, 6)
    END AS anon_id,
    b.is_self,
    b.total_birds,
    b.avg_temp,
    b.avg_humidity,
    b.avg_ammonia,
    b.avg_hsi,
    (SELECT count(*) FROM alerts a WHERE a.farm_id = b.farm_id AND a.created_at >= now() - (_days || ' days')::interval),
    (SELECT count(*) FROM alerts a WHERE a.farm_id = b.farm_id AND a.severity = 'critical' AND a.created_at >= now() - (_days || ' days')::interval),
    (SELECT count(*) FROM anomaly_detections ad WHERE ad.farm_id = b.farm_id AND ad.detected_at >= now() - (_days || ' days')::interval),
    (SELECT COALESCE(SUM(total_eggs), 0)::bigint FROM egg_production ep WHERE ep.farm_id = b.farm_id AND ep.production_date >= (CURRENT_DATE - _days)),
    (SELECT COALESCE(SUM(mortality_count), 0)::bigint FROM daily_summary ds WHERE ds.farm_id = b.farm_id AND ds.summary_date >= (CURRENT_DATE - _days)),
    b.reading_count
  FROM base b
  WHERE b.is_self OR b.reading_count > 0
  ORDER BY b.is_self DESC, b.avg_hsi NULLS LAST;
END $$;

GRANT EXECUTE ON FUNCTION public.get_anonymized_benchmark(integer) TO authenticated;
