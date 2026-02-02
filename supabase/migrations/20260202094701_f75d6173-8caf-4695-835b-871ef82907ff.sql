-- Add fan_speed column to device_status table
ALTER TABLE public.device_status 
ADD COLUMN IF NOT EXISTS fan_speed text NOT NULL DEFAULT 'OFF' CHECK (fan_speed IN ('OFF', 'LOW', 'MEDIUM', 'HIGH'));

-- Add fan speed thresholds to farm_settings
ALTER TABLE public.farm_settings 
ADD COLUMN IF NOT EXISTS fan_low_temp_min numeric NOT NULL DEFAULT 28,
ADD COLUMN IF NOT EXISTS fan_low_temp_max numeric NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS fan_medium_temp_min numeric NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS fan_medium_temp_max numeric NOT NULL DEFAULT 33,
ADD COLUMN IF NOT EXISTS fan_high_temp_min numeric NOT NULL DEFAULT 33;

-- Comment for clarity
COMMENT ON COLUMN public.device_status.fan_speed IS 'Fan speed level: OFF, LOW, MEDIUM, HIGH';