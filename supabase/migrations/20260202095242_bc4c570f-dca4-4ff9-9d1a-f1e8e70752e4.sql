-- Add water anomaly threshold to farm_settings
ALTER TABLE public.farm_settings 
ADD COLUMN IF NOT EXISTS water_anomaly_threshold numeric NOT NULL DEFAULT 15;

-- Comment for clarity
COMMENT ON COLUMN public.farm_settings.water_anomaly_threshold IS 'Percentage drop threshold for water usage health alert (default 15%)';