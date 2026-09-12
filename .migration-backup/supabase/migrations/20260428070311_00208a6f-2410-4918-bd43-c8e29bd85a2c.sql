-- LDR (Light Sensor) support: additive columns only

-- 1. Store lux readings from ESP32
ALTER TABLE public.sensor_readings
  ADD COLUMN IF NOT EXISTS light_lux numeric;

-- 2. LDR settings on lighting_schedule
ALTER TABLE public.lighting_schedule
  ADD COLUMN IF NOT EXISTS ldr_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ldr_threshold_lux integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ldr_hysteresis_lux integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS ldr_mode text NOT NULL DEFAULT 'hybrid';
  -- ldr_mode: 'sensor_only' | 'schedule_only' | 'hybrid' (sensor + schedule AND)

COMMENT ON COLUMN public.lighting_schedule.ldr_threshold_lux IS 'Lux below this value triggers light ON';
COMMENT ON COLUMN public.lighting_schedule.ldr_hysteresis_lux IS 'Lux above (threshold + hysteresis) turns light OFF, prevents flapping';
COMMENT ON COLUMN public.lighting_schedule.ldr_mode IS 'sensor_only=LDR controls; schedule_only=time controls; hybrid=both must agree';
COMMENT ON COLUMN public.sensor_readings.light_lux IS 'Ambient light intensity from LDR on GPIO 32 (0-1000+ lux)';