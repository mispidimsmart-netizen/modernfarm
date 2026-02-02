-- Add new columns to profiles table for extended user information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS farm_type text DEFAULT 'layer';

-- Add comment for farm_type column (layer or broiler)
COMMENT ON COLUMN public.profiles.farm_type IS 'Type of farm: layer or broiler';