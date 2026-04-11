-- Enable pg_cron extension if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Create audit log cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete audit logs older than 90 days
  DELETE FROM public.farm_audit_logs
  WHERE created_at < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE LOG 'Audit log cleanup: deleted % entries older than 90 days', deleted_count;
  END IF;
  
  -- Also clean up old safety_timeline entries (>7 days)
  DELETE FROM public.safety_timeline
  WHERE recorded_at < now() - interval '7 days';
  
  -- Clean up old daily_summary entries (>365 days)
  DELETE FROM public.daily_summary
  WHERE created_at < now() - interval '365 days';
END;
$$;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'audit-log-cleanup',
  '0 3 * * *',
  $$SELECT public.cleanup_old_audit_logs()$$
);