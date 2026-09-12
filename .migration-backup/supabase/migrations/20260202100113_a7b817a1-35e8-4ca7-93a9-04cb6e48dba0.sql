-- Add lighting curve settings to lighting_schedule table
ALTER TABLE public.lighting_schedule 
ADD COLUMN IF NOT EXISTS gradual_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS fade_in_minutes integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS fade_out_minutes integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS min_brightness integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_brightness integer NOT NULL DEFAULT 100;