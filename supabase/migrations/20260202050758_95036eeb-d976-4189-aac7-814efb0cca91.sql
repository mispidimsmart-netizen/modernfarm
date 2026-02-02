-- Create simplified sensor_logs table
CREATE TABLE IF NOT EXISTS public.sensor_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL DEFAULT 'ESP32_LAYER_001',
  temperature NUMERIC NOT NULL,
  humidity NUMERIC NOT NULL,
  ammonia NUMERIC NOT NULL,
  water_flow NUMERIC NOT NULL DEFAULT 0,
  power_status TEXT NOT NULL DEFAULT 'ON',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Create index for fast queries by device and time
CREATE INDEX idx_sensor_logs_device_time ON public.sensor_logs(device_id, timestamp DESC);
CREATE INDEX idx_sensor_logs_user_time ON public.sensor_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.sensor_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sensor logs"
  ON public.sensor_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sensor logs"
  ON public.sensor_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Simplified automation_rules table (drop and recreate)
DROP TABLE IF EXISTS public.automation_rules_new;
CREATE TABLE public.automation_rules_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parameter TEXT NOT NULL, -- 'temperature', 'humidity', 'ammonia'
  condition TEXT NOT NULL, -- '>', '<', '>=', '<='
  value NUMERIC NOT NULL,
  action TEXT NOT NULL, -- 'fan_on', 'fan_off', 'light_on', 'light_off', 'alarm_on', 'alarm_off'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules_new ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own automation rules"
  ON public.automation_rules_new FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Simplified device_commands table (one row per device with current state)
DROP TABLE IF EXISTS public.device_control;
CREATE TABLE public.device_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL DEFAULT 'ESP32_LAYER_001',
  user_id UUID NOT NULL,
  fan BOOLEAN NOT NULL DEFAULT false,
  light BOOLEAN NOT NULL DEFAULT false,
  alarm BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'AUTO', -- 'AUTO' or 'MANUAL'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(device_id, user_id)
);

-- Enable RLS
ALTER TABLE public.device_control ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own device control"
  ON public.device_control FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device control"
  ON public.device_control FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device control"
  ON public.device_control FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for sensor_logs and device_control
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_control;