
-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.safety_engine_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  changed_by uuid,                       -- auth.uid() of the actor (NULL if system/trigger w/o session)
  enabled boolean NOT NULL,              -- new value
  previous_enabled boolean,              -- prior value (NULL on first record)
  source text NOT NULL DEFAULT 'manual', -- 'manual' | 'system' | 'firmware'
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_audit_farm_time
  ON public.safety_engine_audit_log (farm_id, changed_at DESC);

ALTER TABLE public.safety_engine_audit_log ENABLE ROW LEVEL SECURITY;

-- Members of the farm can read their farm's audit history
CREATE POLICY "Farm members can view safety audit log"
ON public.safety_engine_audit_log FOR SELECT
TO authenticated
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- Inserts only allowed via the trigger (security definer); no direct client inserts/updates/deletes.
-- (No INSERT/UPDATE/DELETE policy → blocked by RLS for clients.)

-- 2. Trigger function: log every safety_engine_enabled change on farm_settings
CREATE OR REPLACE FUNCTION public.log_safety_engine_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.safety_engine_enabled IS DISTINCT FROM OLD.safety_engine_enabled
     AND NEW.farm_id IS NOT NULL THEN
    INSERT INTO public.safety_engine_audit_log (
      farm_id, changed_by, enabled, previous_enabled, source
    ) VALUES (
      NEW.farm_id,
      auth.uid(),
      NEW.safety_engine_enabled,
      OLD.safety_engine_enabled,
      'manual'
    );
  ELSIF TG_OP = 'INSERT' AND NEW.farm_id IS NOT NULL THEN
    INSERT INTO public.safety_engine_audit_log (
      farm_id, changed_by, enabled, previous_enabled, source, note
    ) VALUES (
      NEW.farm_id,
      auth.uid(),
      COALESCE(NEW.safety_engine_enabled, true),
      NULL,
      'system',
      'initial farm_settings row created'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_safety_engine_change ON public.farm_settings;
CREATE TRIGGER trg_log_safety_engine_change
AFTER INSERT OR UPDATE OF safety_engine_enabled ON public.farm_settings
FOR EACH ROW
EXECUTE FUNCTION public.log_safety_engine_change();
