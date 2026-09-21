-- flock_info must be one row per FARM, not one row per user.
-- The legacy UNIQUE(user_id) forced a multi-farm owner to share a single flock
-- row across all farms, mixing bird age/breed between farms.
CREATE UNIQUE INDEX IF NOT EXISTS flock_info_farm_id_key
  ON public.flock_info (farm_id)
  WHERE farm_id IS NOT NULL;

ALTER TABLE public.flock_info DROP CONSTRAINT IF EXISTS flock_info_user_id_key;
