
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  farm_id uuid,
  metric_type text NOT NULL CHECK (metric_type IN ('page_load','rpc_call','query','render')),
  route text,
  label text,
  duration_ms integer NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON public.performance_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_route ON public.performance_metrics (route, created_at DESC);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own metrics"
  ON public.performance_metrics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins read all metrics"
  ON public.performance_metrics FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Auto cleanup
CREATE OR REPLACE FUNCTION public.cleanup_performance_metrics()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.performance_metrics WHERE created_at < now() - interval '14 days';
END; $$;

-- Aggregated view for admin dashboard (p50/p95/p99)
CREATE OR REPLACE FUNCTION public.get_performance_summary(_hours int DEFAULT 24)
RETURNS TABLE(
  route text, metric_type text, sample_count bigint,
  p50_ms numeric, p95_ms numeric, p99_ms numeric, max_ms integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT
    pm.route, pm.metric_type, count(*)::bigint,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY pm.duration_ms)::numeric,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY pm.duration_ms)::numeric,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY pm.duration_ms)::numeric,
    max(pm.duration_ms)
  FROM public.performance_metrics pm
  WHERE pm.created_at >= now() - (_hours || ' hours')::interval
  GROUP BY pm.route, pm.metric_type
  ORDER BY count(*) DESC;
END; $$;
