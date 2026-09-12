
-- Sync function: writes latest active batch info into flock_info for that farm
CREATE OR REPLACE FUNCTION public.sync_flock_info_from_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _farm_id uuid;
  _user_id uuid;
  _shed_id uuid;
  _active record;
  _age_weeks int;
BEGIN
  -- Determine which farm to sync (use NEW for insert/update, OLD for delete)
  IF (TG_OP = 'DELETE') THEN
    _farm_id := OLD.farm_id;
    _user_id := OLD.user_id;
  ELSE
    _farm_id := NEW.farm_id;
    _user_id := NEW.user_id;
  END IF;

  IF _farm_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Find the most recent ACTIVE batch for this farm (layer first, then broiler)
  SELECT
    lb.id, lb.shed_id, lb.current_bird_count, lb.initial_bird_count,
    lb.breed, lb.start_date,
    GREATEST(0, FLOOR((CURRENT_DATE - lb.start_date) / 7)::int) AS age_w,
    'layer'::text AS src
  INTO _active
  FROM public.layer_batches lb
  WHERE lb.farm_id = _farm_id AND lb.status = 'active'
  ORDER BY lb.start_date DESC
  LIMIT 1;

  IF _active.id IS NULL THEN
    SELECT
      bb.id, bb.shed_id, bb.current_bird_count, bb.initial_bird_count,
      bb.breed, bb.start_date,
      GREATEST(0, FLOOR((CURRENT_DATE - bb.start_date) / 7)::int) AS age_w,
      'broiler'::text AS src
    INTO _active
    FROM public.broiler_batches bb
    WHERE bb.farm_id = _farm_id AND bb.status = 'active'
    ORDER BY bb.start_date DESC
    LIMIT 1;
  END IF;

  IF _active.id IS NOT NULL THEN
    -- Update existing flock_info row for this farm
    UPDATE public.flock_info
    SET total_birds = COALESCE(_active.current_bird_count, _active.initial_bird_count, 0),
        breed = COALESCE(_active.breed, breed),
        purchase_date = _active.start_date,
        age_weeks = _active.age_w,
        batch_id = _active.id,
        shed_id = COALESCE(_active.shed_id, shed_id),
        updated_at = now()
    WHERE farm_id = _farm_id;
  ELSE
    -- No active batch left → reset bird count and dates, keep breed
    UPDATE public.flock_info
    SET total_birds = 0,
        purchase_date = NULL,
        age_weeks = 0,
        batch_id = NULL,
        updated_at = now()
    WHERE farm_id = _farm_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers on layer_batches
DROP TRIGGER IF EXISTS trg_sync_flock_from_layer ON public.layer_batches;
CREATE TRIGGER trg_sync_flock_from_layer
AFTER INSERT OR UPDATE OF current_bird_count, initial_bird_count, breed, start_date, status, shed_id, farm_id
OR DELETE
ON public.layer_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_flock_info_from_batch();

-- Triggers on broiler_batches
DROP TRIGGER IF EXISTS trg_sync_flock_from_broiler ON public.broiler_batches;
CREATE TRIGGER trg_sync_flock_from_broiler
AFTER INSERT OR UPDATE OF current_bird_count, initial_bird_count, breed, start_date, status, shed_id, farm_id
OR DELETE
ON public.broiler_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_flock_info_from_batch();

-- One-time backfill: sync from existing active batches
DO $$
DECLARE
  _f record;
BEGIN
  FOR _f IN (
    SELECT DISTINCT farm_id FROM public.layer_batches WHERE status = 'active' AND farm_id IS NOT NULL
    UNION
    SELECT DISTINCT farm_id FROM public.broiler_batches WHERE status = 'active' AND farm_id IS NOT NULL
  ) LOOP
    -- Trigger sync by no-op update (touch updated_at on any one active batch)
    UPDATE public.layer_batches SET updated_at = now()
    WHERE farm_id = _f.farm_id AND status = 'active';
    UPDATE public.broiler_batches SET updated_at = now()
    WHERE farm_id = _f.farm_id AND status = 'active';
  END LOOP;
END $$;
