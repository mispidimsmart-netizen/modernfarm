
CREATE OR REPLACE FUNCTION public.sync_flock_info_from_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _farm_id uuid;
  _active record;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    _farm_id := OLD.farm_id;
  ELSE
    _farm_id := NEW.farm_id;
  END IF;

  IF _farm_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Layer batch first (includes age_at_start_weeks)
  SELECT
    lb.id, lb.shed_id, lb.current_bird_count, lb.initial_bird_count,
    lb.breed, lb.start_date,
    GREATEST(
      0,
      COALESCE(lb.age_at_start_weeks, 0) + FLOOR((CURRENT_DATE - lb.start_date) / 7)::int
    ) AS age_w
  INTO _active
  FROM public.layer_batches lb
  WHERE lb.farm_id = _farm_id AND lb.status = 'active'
  ORDER BY lb.start_date DESC
  LIMIT 1;

  -- Broiler batch fallback (no age_at_start_weeks column → age starts at 0)
  IF _active.id IS NULL THEN
    SELECT
      bb.id, bb.shed_id, bb.current_bird_count, bb.initial_bird_count,
      bb.breed, bb.start_date,
      GREATEST(0, FLOOR((CURRENT_DATE - bb.start_date) / 7)::int) AS age_w
    INTO _active
    FROM public.broiler_batches bb
    WHERE bb.farm_id = _farm_id AND bb.status = 'active'
    ORDER BY bb.start_date DESC
    LIMIT 1;
  END IF;

  IF _active.id IS NOT NULL THEN
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

-- Re-sync all existing active batches with the corrected formula
DO $$
DECLARE _f record;
BEGIN
  FOR _f IN (
    SELECT DISTINCT farm_id FROM public.layer_batches WHERE status='active' AND farm_id IS NOT NULL
    UNION
    SELECT DISTINCT farm_id FROM public.broiler_batches WHERE status='active' AND farm_id IS NOT NULL
  ) LOOP
    UPDATE public.layer_batches SET updated_at = now() WHERE farm_id=_f.farm_id AND status='active';
    UPDATE public.broiler_batches SET updated_at = now() WHERE farm_id=_f.farm_id AND status='active';
  END LOOP;
END $$;
