WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY device_token_id
           ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC NULLS LAST, id
         ) AS rn
  FROM public.device_health
)
DELETE FROM public.device_health dh
USING ranked r
WHERE dh.id = r.id AND r.rn > 1;

UPDATE public.device_health dh
SET farm_id = COALESCE(dh.farm_id, dt.farm_id),
    shed_id = COALESCE(dh.shed_id, dt.shed_id),
    user_id = COALESCE(dh.user_id, dt.user_id)
FROM public.device_tokens dt
WHERE dt.id = dh.device_token_id
  AND (dh.farm_id IS NULL OR dh.shed_id IS NULL OR dh.user_id IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS device_health_device_token_id_key
  ON public.device_health (device_token_id);

CREATE OR REPLACE FUNCTION public.device_health_fill_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.farm_id IS NULL OR NEW.shed_id IS NULL OR NEW.user_id IS NULL THEN
    SELECT COALESCE(NEW.farm_id, dt.farm_id),
           COALESCE(NEW.shed_id, dt.shed_id),
           COALESCE(NEW.user_id, dt.user_id)
      INTO NEW.farm_id, NEW.shed_id, NEW.user_id
      FROM public.device_tokens dt
     WHERE dt.id = NEW.device_token_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_health_fill_scope ON public.device_health;
CREATE TRIGGER trg_device_health_fill_scope
  BEFORE INSERT OR UPDATE ON public.device_health
  FOR EACH ROW EXECUTE FUNCTION public.device_health_fill_scope();