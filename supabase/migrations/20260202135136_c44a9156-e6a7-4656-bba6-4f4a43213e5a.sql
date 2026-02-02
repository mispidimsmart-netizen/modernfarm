-- Add failsafe_mode tracking to device_health
ALTER TABLE public.device_health 
ADD COLUMN IF NOT EXISTS failsafe_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failsafe_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_cloud_sync_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS cached_settings_version INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.device_health.failsafe_mode IS 'True when device is running on local cached rules due to cloud connectivity loss';
COMMENT ON COLUMN public.device_health.failsafe_activated_at IS 'Timestamp when failsafe mode was activated';
COMMENT ON COLUMN public.device_health.last_cloud_sync_at IS 'Last successful cloud sync timestamp';
COMMENT ON COLUMN public.device_health.cached_settings_version IS 'Version of cached settings on device';