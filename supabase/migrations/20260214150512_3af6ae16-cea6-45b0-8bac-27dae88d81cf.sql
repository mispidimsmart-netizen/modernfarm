
-- Add desired_state columns (what cloud wants)
ALTER TABLE public.device_status
  ADD COLUMN IF NOT EXISTS desired_fan_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_light_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_alarm_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_heater_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_fogger_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_circulation_fan_on boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_manual_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_fan_speed text DEFAULT 'OFF',
  ADD COLUMN IF NOT EXISTS safety_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS safety_override_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safety_override_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS state_mismatch boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_device_ack_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.device_status.desired_fan_on IS 'Cloud desired state - ESP32 decides final';
COMMENT ON COLUMN public.device_status.safety_override IS 'Device-side safety override active - device wins';
COMMENT ON COLUMN public.device_status.state_mismatch IS 'True when desired != actual state';
