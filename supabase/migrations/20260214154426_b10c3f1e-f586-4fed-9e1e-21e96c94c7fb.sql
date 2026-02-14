-- Add environment-target model columns to device_status
-- Cloud sends desired environment targets; device decides relay actions
ALTER TABLE public.device_status
  ADD COLUMN IF NOT EXISTS target_temperature numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_humidity numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_air_quality numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS age_profile_days integer DEFAULT NULL;

-- Add relay protection tracking columns to device_health
ALTER TABLE public.device_health
  ADD COLUMN IF NOT EXISTS relay_toggle_violations integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stuck_relay_detected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stuck_relay_device text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS heater_total_runtime_seconds bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS motor_total_runtime_seconds bigint DEFAULT 0;
