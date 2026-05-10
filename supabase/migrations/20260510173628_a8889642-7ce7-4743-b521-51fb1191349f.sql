-- Phase 7 Scale Infrastructure: readiness reporting + load test log

CREATE TABLE IF NOT EXISTS public.load_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  target_vus integer NOT NULL,
  duration_seconds integer NOT NULL,
  total_requests bigint NOT NULL DEFAULT 0,
  error_rate_pct numeric(6,3) NOT NULL DEFAULT 0,
  p50_ms numeric(10,2),
  p95_ms numeric(10,2),
  p99_ms numeric(10,2),
  max_ms numeric(10,2),
  notes text,
  ran_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.load_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "load_test super admin read" ON public.load_test_runs;
CREATE POLICY "load_test super admin read" ON public.load_test_runs
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "load_test super admin insert" ON public.load_test_runs;
CREATE POLICY "load_test super admin insert" ON public.load_test_runs
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_load_test_runs_created ON public.load_test_runs (created_at DESC);

-- Scale readiness summary RPC (super-admin only)
CREATE OR REPLACE FUNCTION public.scale_readiness_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conns jsonb;
  _tables jsonb;
  _partitions jsonb;
  _edge jsonb;
  _today_requests bigint;
  _today_errors bigint;
  _device_count bigint;
  _farm_count bigint;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Connections
  SELECT jsonb_build_object(
    'total', count(*),
    'active', count(*) FILTER (WHERE state = 'active'),
    'idle', count(*) FILTER (WHERE state = 'idle'),
    'idle_in_tx', count(*) FILTER (WHERE state = 'idle in transaction')
  ) INTO _conns FROM pg_stat_activity WHERE datname = current_database();

  -- Top 10 table sizes
  SELECT jsonb_agg(
    jsonb_build_object(
      'table', relname,
      'rows', n_live_tup,
      'size_bytes', pg_total_relation_size('public.'||relname),
      'size_pretty', pg_size_pretty(pg_total_relation_size('public.'||relname))
    ) ORDER BY pg_total_relation_size('public.'||relname) DESC
  ) INTO _tables FROM (
    SELECT relname, n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size('public.'||relname) DESC
    LIMIT 10
  ) t;

  -- Sensor partition coverage: are next 6 months created?
  SELECT jsonb_build_object(
    'expected_months', 6,
    'present_months', count(*),
    'partitions', jsonb_agg(relname ORDER BY relname)
  ) INTO _partitions
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname ~ '^sensor_readings_y[0-9]{4}m[0-9]{2}$'
    AND c.relname >= 'sensor_readings_y' || to_char(CURRENT_DATE, 'YYYY"m"MM');

  -- Edge function latency last 1h
  SELECT jsonb_build_object(
    'window_minutes', 60,
    'request_count', COALESCE(sum(request_count), 0),
    'error_5xx', COALESCE(sum(error_5xx), 0),
    'rate_limited', COALESCE(sum(rate_limited), 0),
    'p95_ms_max', COALESCE(max(p95_ms), 0),
    'p99_ms_max', COALESCE(max(p99_ms), 0)
  ) INTO _edge
  FROM public.edge_function_stats_1h;

  -- 24h totals
  SELECT count(*), count(*) FILTER (WHERE status_code >= 500)
    INTO _today_requests, _today_errors
  FROM public.edge_request_log WHERE created_at >= now() - interval '24 hours';

  SELECT count(*) INTO _device_count FROM public.device_tokens;
  SELECT count(*) INTO _farm_count FROM public.farms;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'connections', _conns,
    'tables', _tables,
    'sensor_partitions', _partitions,
    'edge_1h', _edge,
    'edge_24h', jsonb_build_object('requests', _today_requests, 'errors_5xx', _today_errors),
    'capacity', jsonb_build_object(
      'farms', _farm_count,
      'devices', _device_count,
      'devices_per_farm', CASE WHEN _farm_count = 0 THEN 0 ELSE round(_device_count::numeric / _farm_count, 2) END
    )
  );
END $$;

GRANT EXECUTE ON FUNCTION public.scale_readiness_summary() TO authenticated;