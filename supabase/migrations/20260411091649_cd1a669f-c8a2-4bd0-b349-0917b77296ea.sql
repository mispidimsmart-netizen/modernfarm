-- Fix #2: Update device_health relay_count default from 4 to 8
-- to match the v8.0.0 firmware's 8-channel relay configuration
ALTER TABLE public.device_health 
  ALTER COLUMN relay_count SET DEFAULT 8;

-- Also update device_hardware_profiles default
ALTER TABLE public.device_hardware_profiles
  ALTER COLUMN relay_count SET DEFAULT 8;