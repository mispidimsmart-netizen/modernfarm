-- ═══════════════════════════════════════════════════════════════════════
-- PRODUCTION RELIABILITY UPGRADE - New fields for device_health table
-- ═══════════════════════════════════════════════════════════════════════

-- Add new reliability tracking columns to device_health
ALTER TABLE public.device_health
ADD COLUMN IF NOT EXISTS restart_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS restart_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_power_event_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS power_event_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS safe_mode_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gas_sensor_warmup_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gas_sensor_warmup_start TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_age_sync_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offline_buffer_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ota_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ota_progress INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ota_version_available TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ota_last_check_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS online_duration_seconds BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS offline_duration_seconds BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_restarts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ammonia_avg_10 NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS power_voltage_rms NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS consecutive_high_ammonia INTEGER DEFAULT 0;

-- Create OTA firmware updates table
CREATE TABLE IF NOT EXISTS public.ota_firmware (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  checksum TEXT,
  file_size_bytes INTEGER,
  release_notes TEXT,
  release_notes_bn TEXT,
  is_stable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  min_firmware_version TEXT,
  farm_type TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create OTA update history table
CREATE TABLE IF NOT EXISTS public.ota_update_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token_id UUID NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  firmware_id UUID REFERENCES public.ota_firmware(id),
  from_version TEXT,
  to_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ota_firmware ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ota_update_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for ota_firmware (read-only for all authenticated users)
CREATE POLICY "Users can view active firmware"
ON public.ota_firmware FOR SELECT
USING (is_active = true);

-- RLS policies for ota_update_history
CREATE POLICY "Users can view their own OTA history"
ON public.ota_update_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OTA history"
ON public.ota_update_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OTA history"
ON public.ota_update_history FOR UPDATE
USING (auth.uid() = user_id);

-- Create sensor_buffer table for offline data storage sync
CREATE TABLE IF NOT EXISTS public.sensor_buffer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token_id UUID NOT NULL REFERENCES public.device_tokens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id),
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  ammonia NUMERIC NOT NULL,
  water_flow NUMERIC DEFAULT 0,
  power_status TEXT DEFAULT 'ON',
  hsi NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sensor_buffer
ALTER TABLE public.sensor_buffer ENABLE ROW LEVEL SECURITY;

-- RLS policies for sensor_buffer
CREATE POLICY "Users can view their own sensor buffer"
ON public.sensor_buffer FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensor buffer"
ON public.sensor_buffer FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sensor_buffer_device ON public.sensor_buffer(device_token_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_history_device ON public.ota_update_history(device_token_id, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.device_health.restart_reason IS 'ESP32 reset reason: POWER_ON, BROWNOUT, WATCHDOG, PANIC, SW_RESET, etc.';
COMMENT ON COLUMN public.device_health.safe_mode_until IS 'Device stays in safe mode (fan ON, ignore commands) until this time after brownout/unstable power';
COMMENT ON COLUMN public.device_health.gas_sensor_warmup_done IS 'MQ-137 needs 5min warmup after boot before readings are reliable';
COMMENT ON COLUMN public.device_health.consecutive_high_ammonia IS 'Count of consecutive high ammonia readings (alert only after 3+)';
COMMENT ON COLUMN public.device_health.ammonia_avg_10 IS 'Moving average of last 10 ammonia readings for noise filtering';
COMMENT ON COLUMN public.device_health.power_voltage_rms IS 'RMS voltage from ZMPT101B after 50-sample filtering';