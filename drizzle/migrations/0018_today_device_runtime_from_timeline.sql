-- Today's per-device runtime, derived from the forensic safety_timeline samples.
-- device_health.*_total_runtime_seconds is never written by firmware/API, so the
-- dashboard "Today's Activity" card always showed zeros. This computes real
-- on-time for the farm day (Asia/Dhaka) by summing gap-capped sample intervals.
CREATE OR REPLACE FUNCTION public.get_today_device_runtime(
  p_farm_id uuid,
  p_shed_id uuid DEFAULT NULL
)
RETURNS TABLE (
  fan_seconds integer,
  ceiling_fan_seconds integer,
  heater_seconds integer,
  fogger_seconds integer,
  sprinkler_seconds integer,
  sample_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Dhaka') AT TIME ZONE 'Asia/Dhaka') AS day_start
  ),
  allowed AS (
    SELECT public.user_can_access_farm(auth.uid(), p_farm_id) AS ok
  ),
  samples AS (
    SELECT
      t.actual_fan, t.actual_ceiling_fan, t.actual_heater,
      t.actual_fogger, t.actual_sprinkler,
      LEAST(
        COALESCE(
          EXTRACT(EPOCH FROM (LEAD(t.recorded_at) OVER (ORDER BY t.recorded_at) - t.recorded_at)),
          60
        ),
        120
      ) AS gap_seconds
    FROM public.safety_timeline t, bounds b, allowed a
    WHERE a.ok
      AND t.farm_id = p_farm_id
      AND (p_shed_id IS NULL OR t.shed_id = p_shed_id)
      AND t.recorded_at >= b.day_start
  )
  SELECT
    COALESCE(SUM(CASE WHEN actual_fan          THEN gap_seconds ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN actual_ceiling_fan  THEN gap_seconds ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN actual_heater       THEN gap_seconds ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN actual_fogger       THEN gap_seconds ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN actual_sprinkler    THEN gap_seconds ELSE 0 END), 0)::int,
    COUNT(*)::int
  FROM samples;
$$;

REVOKE ALL ON FUNCTION public.get_today_device_runtime(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_device_runtime(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_device_runtime(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.get_today_device_runtime(uuid, uuid) IS
  'Per-device on-time (seconds) for the current Asia/Dhaka farm day, derived from safety_timeline actual_* samples. Farm access enforced via user_can_access_farm.';