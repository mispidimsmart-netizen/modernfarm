
-- Smart LDR + age-based + 2-step fade additions to lighting_schedule
ALTER TABLE public.lighting_schedule
  ADD COLUMN IF NOT EXISTS ldr_daylight_off_lux integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS fade_circuits integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS fade_step_gap_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS flock_type text NOT NULL DEFAULT 'layer',
  ADD COLUMN IF NOT EXISTS broiler_dark_start time NOT NULL DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS broiler_dark_end time NOT NULL DEFAULT '05:00',
  ADD COLUMN IF NOT EXISTS broiler_age_auto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS layer_dark_hours integer NOT NULL DEFAULT 9;

COMMENT ON COLUMN public.lighting_schedule.ldr_daylight_off_lux IS 'Above this lux artificial lights stay OFF during daytime to save power';
COMMENT ON COLUMN public.lighting_schedule.fade_circuits IS 'Number of relay circuits for stepped fade simulation (1=on/off, 2=2-step, 3=3-step)';
COMMENT ON COLUMN public.lighting_schedule.fade_step_gap_minutes IS 'Minutes between successive circuits during fade-in/out';
COMMENT ON COLUMN public.lighting_schedule.flock_type IS 'layer | broiler — drives schedule preset logic';
COMMENT ON COLUMN public.lighting_schedule.broiler_dark_start IS 'Broiler night dark period start (after day 8)';
COMMENT ON COLUMN public.lighting_schedule.broiler_dark_end IS 'Broiler night dark period end (after day 8)';
COMMENT ON COLUMN public.lighting_schedule.layer_dark_hours IS 'Daily uninterrupted dark hours for layers (rest)';
