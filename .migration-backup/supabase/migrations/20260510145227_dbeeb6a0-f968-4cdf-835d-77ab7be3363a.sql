-- ============================================================
-- sensor_readings → monthly RANGE partitioning (final)
-- ============================================================

-- 0. Drop dependent MV + function (will recreate at the end)
DROP MATERIALIZED VIEW IF EXISTS public.farm_daily_rollup_mv CASCADE;

-- 1. Rename existing table + indexes/constraints out of the way
ALTER TABLE public.sensor_readings RENAME TO sensor_readings_old;
ALTER TABLE public.sensor_readings_old RENAME CONSTRAINT sensor_readings_pkey TO sensor_readings_old_pkey;
ALTER INDEX public.idx_sensor_readings_shed_id          RENAME TO idx_sensor_readings_old_shed_id;
ALTER INDEX public.idx_sensor_readings_farm_id          RENAME TO idx_sensor_readings_old_farm_id;
ALTER INDEX public.idx_sensor_readings_farm_recorded    RENAME TO idx_sensor_readings_old_farm_recorded;
ALTER INDEX public.idx_sensor_readings_shed_recorded    RENAME TO idx_sensor_readings_old_shed_recorded;

ALTER PUBLICATION supabase_realtime DROP TABLE public.sensor_readings_old;

-- 2. New partitioned table (PK must include partition key)
CREATE TABLE public.sensor_readings (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL,
  temperature  numeric     NOT NULL,
  humidity     numeric     NOT NULL,
  ammonia      numeric     NOT NULL,
  water_usage  numeric     NOT NULL DEFAULT 0,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  shed_id      uuid,
  farm_id      uuid,
  device_id    text,
  hsi          numeric,
  light_lux    numeric,
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

ALTER TABLE public.sensor_readings
  ADD CONSTRAINT sensor_readings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT sensor_readings_farm_id_fkey
    FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE SET NULL,
  ADD CONSTRAINT sensor_readings_shed_id_fkey
    FOREIGN KEY (shed_id) REFERENCES public.sheds(id) ON DELETE SET NULL;

CREATE INDEX idx_sensor_readings_farm_recorded
  ON public.sensor_readings (farm_id, recorded_at DESC);
CREATE INDEX idx_sensor_readings_shed_recorded
  ON public.sensor_readings (shed_id, recorded_at DESC);
CREATE INDEX idx_sensor_readings_farm_id
  ON public.sensor_readings (farm_id);
CREATE INDEX idx_sensor_readings_shed_id
  ON public.sensor_readings (shed_id);
CREATE INDEX idx_sensor_readings_user_id
  ON public.sensor_readings (user_id);

ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sensor readings"
  ON public.sensor_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensor readings"
  ON public.sensor_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Farm tenant access"
  ON public.sensor_readings FOR ALL
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- 3. Helper: per-month partition
CREATE OR REPLACE FUNCTION public.create_sensor_partition_for_month(_month date)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _start date := date_trunc('month', _month)::date;
  _end   date := (date_trunc('month', _month) + interval '1 month')::date;
  _name  text := 'sensor_readings_y' || to_char(_start, 'YYYY') || 'm' || to_char(_start, 'MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.sensor_readings
       FOR VALUES FROM (%L) TO (%L)',
    _name, _start, _end);
  RETURN _name;
END $$;

-- 4. Default partition + monthly partitions
CREATE TABLE IF NOT EXISTS public.sensor_readings_default
  PARTITION OF public.sensor_readings DEFAULT;

DO $$
DECLARE _m date;
BEGIN
  FOR _m IN
    SELECT generate_series('2026-02-01'::date, '2027-12-01'::date, interval '1 month')::date
  LOOP
    PERFORM public.create_sensor_partition_for_month(_m);
  END LOOP;
END $$;

-- 5. Copy data
INSERT INTO public.sensor_readings
  (id, user_id, temperature, humidity, ammonia, water_usage,
   recorded_at, shed_id, farm_id, device_id, hsi, light_lux)
SELECT
  id, user_id, temperature, humidity, ammonia, water_usage,
  recorded_at, shed_id, farm_id, device_id, hsi, light_lux
FROM public.sensor_readings_old;

-- 6. Drop old table + re-add to realtime
DROP TABLE public.sensor_readings_old;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;

-- 7. Auto-future + cleanup helpers
CREATE OR REPLACE FUNCTION public.ensure_future_sensor_partitions()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _i int;
BEGIN
  FOR _i IN 0..6 LOOP
    PERFORM public.create_sensor_partition_for_month((CURRENT_DATE + (_i || ' months')::interval)::date);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_old_sensor_partitions(_months_to_keep int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _cutoff  date := (date_trunc('month', CURRENT_DATE) - (_months_to_keep || ' months')::interval)::date;
  _rec     record;
  _dropped text[] := '{}';
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  FOR _rec IN
    SELECT c.relname, pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE p.relname = 'sensor_readings'
      AND c.relname <> 'sensor_readings_default'
      AND c.relname ~ '^sensor_readings_y[0-9]{4}m[0-9]{2}$'
  LOOP
    IF substring(_rec.bound from 'TO \(''([0-9-]+)''')::date <= _cutoff THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', _rec.relname);
      _dropped := array_append(_dropped, _rec.relname);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('cutoff', _cutoff, 'dropped', _dropped);
END $$;

-- 8. Recreate the materialized view + its indexes
CREATE MATERIALIZED VIEW public.farm_daily_rollup_mv AS
WITH sensor_agg AS (
  SELECT sr.farm_id, sr.shed_id,
         date_trunc('day', sr.recorded_at)::date AS day,
         round(avg(sr.temperature), 2) AS avg_temp,
         round(min(sr.temperature), 2) AS min_temp,
         round(max(sr.temperature), 2) AS max_temp,
         round(avg(sr.humidity), 2)    AS avg_humidity,
         round(avg(sr.ammonia), 2)     AS avg_ammonia,
         round(avg(sr.hsi), 2)         AS avg_hsi,
         count(*)                       AS sensor_samples
  FROM public.sensor_readings sr
  WHERE sr.recorded_at >= (now() - interval '180 days')
  GROUP BY sr.farm_id, sr.shed_id, date_trunc('day', sr.recorded_at)::date
), eggs AS (
  SELECT ep.farm_id, ep.shed_id, ep.production_date AS day,
         sum(ep.total_eggs) AS total_eggs
  FROM public.egg_production ep
  WHERE ep.production_date >= (CURRENT_DATE - interval '180 days')
  GROUP BY ep.farm_id, ep.shed_id, ep.production_date
), feed AS (
  SELECT fc.farm_id, NULL::uuid AS shed_id, fc.consumption_date AS day,
         sum(fc.quantity_kg) AS total_feed_kg
  FROM public.feed_consumption fc
  WHERE fc.consumption_date >= (CURRENT_DATE - interval '180 days')
  GROUP BY fc.farm_id, fc.consumption_date
)
SELECT COALESCE(s.farm_id, e.farm_id, f.farm_id) AS farm_id,
       COALESCE(s.shed_id, e.shed_id) AS shed_id,
       COALESCE(s.day, e.day, f.day) AS day,
       s.avg_temp, s.min_temp, s.max_temp,
       s.avg_humidity, s.avg_ammonia, s.avg_hsi,
       COALESCE(s.sensor_samples, 0::bigint) AS sensor_samples,
       COALESCE(e.total_eggs, 0::bigint) AS total_eggs,
       COALESCE(f.total_feed_kg, 0::numeric) AS total_feed_kg
FROM sensor_agg s
FULL JOIN eggs e
  ON e.farm_id = s.farm_id
 AND NOT (e.shed_id IS DISTINCT FROM s.shed_id)
 AND e.day = s.day
FULL JOIN feed f
  ON f.farm_id = COALESCE(s.farm_id, e.farm_id)
 AND f.day = COALESCE(s.day, e.day);

CREATE UNIQUE INDEX idx_farm_daily_rollup_unique
  ON public.farm_daily_rollup_mv
  (farm_id, COALESCE(shed_id, '00000000-0000-0000-0000-000000000000'::uuid), day);
CREATE INDEX idx_farm_daily_rollup_farm_day
  ON public.farm_daily_rollup_mv (farm_id, day DESC);

-- 9. Recreate get_farm_daily_rollup() function (was dropped by CASCADE)
CREATE OR REPLACE FUNCTION public.get_farm_daily_rollup(_farm_id uuid, _days integer DEFAULT 30)
RETURNS SETOF farm_daily_rollup_mv
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_farm(auth.uid(), _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT * FROM public.farm_daily_rollup_mv
  WHERE farm_id = _farm_id AND day >= (CURRENT_DATE - (_days || ' days')::interval)
  ORDER BY day DESC;
END $$;

-- 10. Schedule monthly auto-partition creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ensure-sensor-partitions') THEN
      PERFORM cron.unschedule('ensure-sensor-partitions');
    END IF;
    PERFORM cron.schedule(
      'ensure-sensor-partitions',
      '0 2 1 * *',
      $cron$ SELECT public.ensure_future_sensor_partitions(); $cron$
    );
  END IF;
END $$;