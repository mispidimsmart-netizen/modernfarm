-- Add broiler age source tracking fields to device_health
ALTER TABLE public.device_health 
ADD COLUMN IF NOT EXISTS broiler_age_source text DEFAULT 'LOCAL',
ADD COLUMN IF NOT EXISTS last_server_age_sync_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS water_anomaly_consecutive_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_last_2h_avg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_24h_rolling_avg numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.device_health.broiler_age_source IS 'Source of broiler age: LOCAL or SERVER';
COMMENT ON COLUMN public.device_health.last_server_age_sync_at IS 'Last time age was synced from server';
COMMENT ON COLUMN public.device_health.water_anomaly_consecutive_count IS 'Consecutive water anomaly detection cycles';
COMMENT ON COLUMN public.device_health.water_last_2h_avg IS 'Last 2 hours water usage average';
COMMENT ON COLUMN public.device_health.water_24h_rolling_avg IS '24-hour rolling water usage average';