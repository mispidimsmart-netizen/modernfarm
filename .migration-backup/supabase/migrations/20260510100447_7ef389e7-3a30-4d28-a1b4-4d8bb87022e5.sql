
-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 — Observability: tables, columns, views, functions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. edge_request_log: structured per-request log for all edge functions
CREATE TABLE IF NOT EXISTS public.edge_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  path text,
  method text,
  status_code int,
  duration_ms int,
  device_token_id uuid,
  farm_id uuid,
  user_id uuid,
  request_id uuid,
  error_code text,
  error_message text,
  payload_size_bytes int,
  response_size_bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_request_log_function_time
  ON public.edge_request_log (function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_request_log_device_time
  ON public.edge_request_log (device_token_id, created_at DESC) WHERE device_token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edge_request_log_farm_time
  ON public.edge_request_log (farm_id, created_at DESC) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_edge_request_log_status
  ON public.edge_request_log (status_code, created_at DESC) WHERE status_code >= 400;

ALTER TABLE public.edge_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view edge_request_log"
  ON public.edge_request_log FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Farm members view their edge logs"
  ON public.edge_request_log FOR SELECT
  USING (farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id));

-- 2. device_health_metrics: hourly per-device aggregations
CREATE TABLE IF NOT EXISTS public.device_health_metrics (
  device_token_id uuid NOT NULL,
  farm_id uuid,
  bucket_hour timestamptz NOT NULL,
  sync_count int NOT NULL DEFAULT 0,
  signature_failures int NOT NULL DEFAULT 0,
  nonce_reuse_count int NOT NULL DEFAULT 0,
  rate_limited_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  total_latency_ms bigint NOT NULL DEFAULT 0,
  max_latency_ms int NOT NULL DEFAULT 0,
  sensor_gap_seconds_max int NOT NULL DEFAULT 0,
  restart_count int NOT NULL DEFAULT 0,
  last_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_token_id, bucket_hour)
);

CREATE INDEX IF NOT EXISTS idx_device_health_metrics_farm_time
  ON public.device_health_metrics (farm_id, bucket_hour DESC) WHERE farm_id IS NOT NULL;

ALTER TABLE public.device_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant select metrics"
  ON public.device_health_metrics FOR SELECT
  USING (farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id));

CREATE POLICY "Super admins view all metrics"
  ON public.device_health_metrics FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3. device_commands: command lifecycle trace columns (additive)
ALTER TABLE public.device_commands
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS latency_to_device_ms int,
  ADD COLUMN IF NOT EXISTS latency_to_ack_ms int;

-- 4. RPC: record an edge request (called via service role from edge fns)
CREATE OR REPLACE FUNCTION public.record_edge_request(
  _function_name text,
  _path text,
  _method text,
  _status_code int,
  _duration_ms int,
  _device_token_id uuid DEFAULT NULL,
  _farm_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _request_id uuid DEFAULT NULL,
  _error_code text DEFAULT NULL,
  _error_message text DEFAULT NULL,
  _payload_size_bytes int DEFAULT NULL,
  _response_size_bytes int DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.edge_request_log (
    function_name, path, method, status_code, duration_ms,
    device_token_id, farm_id, user_id, request_id,
    error_code, error_message, payload_size_bytes, response_size_bytes
  ) VALUES (
    _function_name, _path, _method, _status_code, _duration_ms,
    _device_token_id, _farm_id, _user_id, _request_id,
    _error_code, _error_message, _payload_size_bytes, _response_size_bytes
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 5. RPC: aggregate device hourly metrics (called per request from esp32-api)
CREATE OR REPLACE FUNCTION public.record_device_metric(
  _device_token_id uuid,
  _farm_id uuid,
  _latency_ms int,
  _is_error boolean DEFAULT false,
  _is_signature_failure boolean DEFAULT false,
  _is_nonce_reuse boolean DEFAULT false,
  _is_rate_limited boolean DEFAULT false,
  _sensor_gap_seconds int DEFAULT 0,
  _is_restart boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _bucket timestamptz := date_trunc('hour', now());
BEGIN
  INSERT INTO public.device_health_metrics AS m (
    device_token_id, farm_id, bucket_hour,
    sync_count, signature_failures, nonce_reuse_count, rate_limited_count,
    error_count, total_latency_ms, max_latency_ms,
    sensor_gap_seconds_max, restart_count, last_sync_at
  ) VALUES (
    _device_token_id, _farm_id, _bucket,
    1,
    CASE WHEN _is_signature_failure THEN 1 ELSE 0 END,
    CASE WHEN _is_nonce_reuse THEN 1 ELSE 0 END,
    CASE WHEN _is_rate_limited THEN 1 ELSE 0 END,
    CASE WHEN _is_error THEN 1 ELSE 0 END,
    GREATEST(_latency_ms, 0),
    GREATEST(_latency_ms, 0),
    GREATEST(_sensor_gap_seconds, 0),
    CASE WHEN _is_restart THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (device_token_id, bucket_hour) DO UPDATE SET
    sync_count = m.sync_count + 1,
    signature_failures = m.signature_failures + EXCLUDED.signature_failures,
    nonce_reuse_count = m.nonce_reuse_count + EXCLUDED.nonce_reuse_count,
    rate_limited_count = m.rate_limited_count + EXCLUDED.rate_limited_count,
    error_count = m.error_count + EXCLUDED.error_count,
    total_latency_ms = m.total_latency_ms + EXCLUDED.total_latency_ms,
    max_latency_ms = GREATEST(m.max_latency_ms, EXCLUDED.max_latency_ms),
    sensor_gap_seconds_max = GREATEST(m.sensor_gap_seconds_max, EXCLUDED.sensor_gap_seconds_max),
    restart_count = m.restart_count + EXCLUDED.restart_count,
    last_sync_at = now(),
    updated_at = now(),
    farm_id = COALESCE(m.farm_id, EXCLUDED.farm_id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 6. Cleanup functions
CREATE OR REPLACE FUNCTION public.cleanup_edge_request_log()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.edge_request_log WHERE created_at < now() - interval '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_device_health_metrics()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.device_health_metrics WHERE bucket_hour < now() - interval '90 days';
END;
$$;

-- 7. View: per-function rolling stats (last 1h / 24h)
CREATE OR REPLACE VIEW public.edge_function_stats_1h AS
SELECT
  function_name,
  count(*) AS request_count,
  count(*) FILTER (WHERE status_code >= 500) AS error_5xx,
  count(*) FILTER (WHERE status_code >= 400 AND status_code < 500) AS error_4xx,
  count(*) FILTER (WHERE status_code = 401) AS unauthorized,
  count(*) FILTER (WHERE status_code = 429) AS rate_limited,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms,
  max(duration_ms) AS max_ms
FROM public.edge_request_log
WHERE created_at >= now() - interval '1 hour'
GROUP BY function_name;

CREATE OR REPLACE VIEW public.edge_function_stats_24h AS
SELECT
  function_name,
  count(*) AS request_count,
  count(*) FILTER (WHERE status_code >= 500) AS error_5xx,
  count(*) FILTER (WHERE status_code >= 400 AND status_code < 500) AS error_4xx,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms
FROM public.edge_request_log
WHERE created_at >= now() - interval '24 hours'
GROUP BY function_name;
