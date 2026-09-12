-- Add farm scoping to mortality_records so it works without strictly requiring a shed
ALTER TABLE public.mortality_records
  ADD COLUMN IF NOT EXISTS farm_id uuid,
  ADD COLUMN IF NOT EXISTS farm_mode text,
  ADD COLUMN IF NOT EXISTS batch_id uuid;

-- Backfill farm_id and farm_mode from shed where possible
UPDATE public.mortality_records m
SET farm_id = s.farm_id,
    farm_mode = COALESCE(m.farm_mode, s.farm_type)
FROM public.sheds s
WHERE m.shed_id = s.id
  AND (m.farm_id IS NULL OR m.farm_mode IS NULL);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_mortality_farm_date
  ON public.mortality_records(farm_id, record_date DESC);

-- Add tenant-aware RLS so members of a farm can manage records for that farm
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='mortality_records' AND policyname='Farm tenant access'
  ) THEN
    CREATE POLICY "Farm tenant access" ON public.mortality_records
      FOR ALL
      USING (farm_id IS NULL OR public.user_can_access_farm(auth.uid(), farm_id))
      WITH CHECK (farm_id IS NULL OR public.user_can_access_farm(auth.uid(), farm_id));
  END IF;
END $$;