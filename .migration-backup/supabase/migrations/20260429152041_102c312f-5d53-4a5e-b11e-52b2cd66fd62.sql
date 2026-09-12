ALTER TABLE public.egg_production
  DROP CONSTRAINT IF EXISTS egg_production_user_id_production_date_key;

ALTER TABLE public.egg_production
  ADD CONSTRAINT egg_production_user_farm_date_key
  UNIQUE (user_id, farm_id, production_date);