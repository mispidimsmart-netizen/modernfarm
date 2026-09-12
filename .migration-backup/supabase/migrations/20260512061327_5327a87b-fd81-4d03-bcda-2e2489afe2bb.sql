-- Add response_seconds column
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS response_seconds integer;

-- Trigger function: auto-fill acknowledged_by / acknowledged_at / response_seconds
CREATE OR REPLACE FUNCTION public.fill_alert_ack_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.acknowledged = true AND COALESCE(OLD.acknowledged, false) = false THEN
    IF NEW.acknowledged_at IS NULL THEN
      NEW.acknowledged_at := now();
    END IF;
    IF NEW.acknowledged_by IS NULL THEN
      NEW.acknowledged_by := auth.uid();
    END IF;
    IF NEW.response_seconds IS NULL AND NEW.created_at IS NOT NULL THEN
      NEW.response_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.created_at))::int);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerts_fill_ack_audit ON public.alerts;
CREATE TRIGGER trg_alerts_fill_ack_audit
BEFORE UPDATE OF acknowledged ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.fill_alert_ack_audit();

-- Index for response-time analytics
CREATE INDEX IF NOT EXISTS idx_alerts_farm_response
  ON public.alerts (farm_id, acknowledged_at DESC)
  WHERE acknowledged = true;