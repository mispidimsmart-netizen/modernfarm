-- 1. farm_settings: persist farm size, season override, profile override
ALTER TABLE public.farm_settings
  ADD COLUMN IF NOT EXISTS farm_size text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS season_override text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_override text DEFAULT NULL;

-- 2. advanced_automation_settings: persist 5 operation preference controls
ALTER TABLE public.advanced_automation_settings
  ADD COLUMN IF NOT EXISTS ventilation_preference text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS heating_preference text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS cooling_preference text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS comfort_preference text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS protection_preference text NOT NULL DEFAULT 'auto';

-- 3. device_calibration: persist sensor offsets so ESP32 firmware can read them
ALTER TABLE public.device_calibration
  ADD COLUMN IF NOT EXISTS temperature_offset_celsius numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS humidity_offset_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ammonia_offset_ppm numeric NOT NULL DEFAULT 0;