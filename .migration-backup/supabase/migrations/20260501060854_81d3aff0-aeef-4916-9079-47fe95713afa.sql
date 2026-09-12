
CREATE TABLE IF NOT EXISTS public.device_restart_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid,
  device_token_id uuid NOT NULL,
  restart_reason text NOT NULL,
  uptime_before_restart_seconds bigint,
  free_memory_bytes integer,
  wifi_signal_strength integer,
  error_message text,
  firmware_version text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drl_user_time ON public.device_restart_log(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_drl_device_time ON public.device_restart_log(device_token_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_drl_farm_time ON public.device_restart_log(farm_id, occurred_at DESC);

ALTER TABLE public.device_restart_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own device restart logs"
  ON public.device_restart_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users insert own device restart logs"
  ON public.device_restart_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cleanup function (called by existing cleanup cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_restart_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.device_restart_log
  WHERE occurred_at < now() - interval '30 days';
END;
$$;
