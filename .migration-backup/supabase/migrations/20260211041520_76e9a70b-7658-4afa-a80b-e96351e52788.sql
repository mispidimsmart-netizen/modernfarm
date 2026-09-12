
-- Add farm_type column to sheds table (per-shed farm type support)
ALTER TABLE public.sheds 
ADD COLUMN farm_type text NOT NULL DEFAULT 'layer';

-- Populate existing sheds with the user's current farm_type from profiles
UPDATE public.sheds s
SET farm_type = COALESCE(
  (SELECT p.farm_type FROM public.profiles p WHERE p.id = s.user_id),
  'layer'
);
