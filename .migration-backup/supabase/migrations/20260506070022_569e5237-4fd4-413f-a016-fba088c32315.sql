ALTER TABLE public.farm_settings
ADD COLUMN IF NOT EXISTS safety_engine_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.farm_settings.safety_engine_enabled IS
'When false: ESP32 skips Arbiter, ESM, HSI auto-trigger, hysteresis. Hard thermal floor (>42°C) always remains active.';