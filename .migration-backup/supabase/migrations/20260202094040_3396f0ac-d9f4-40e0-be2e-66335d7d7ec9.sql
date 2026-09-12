-- Add HSI settings to farm_settings table
ALTER TABLE public.farm_settings 
ADD COLUMN IF NOT EXISTS hsi_mild_threshold numeric NOT NULL DEFAULT 70,
ADD COLUMN IF NOT EXISTS hsi_moderate_threshold numeric NOT NULL DEFAULT 75,
ADD COLUMN IF NOT EXISTS hsi_severe_threshold numeric NOT NULL DEFAULT 80,
ADD COLUMN IF NOT EXISTS hsi_emergency_threshold numeric NOT NULL DEFAULT 85,
ADD COLUMN IF NOT EXISTS hsi_automation_enabled boolean NOT NULL DEFAULT true;