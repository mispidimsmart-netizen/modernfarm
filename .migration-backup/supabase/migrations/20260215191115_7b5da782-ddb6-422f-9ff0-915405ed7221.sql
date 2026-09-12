
-- Add missing columns to safety_status that the safety-engine edge function writes
ALTER TABLE public.safety_status 
  ADD COLUMN IF NOT EXISTS actuator_effect_failure boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS actuator_fail_reason text,
  ADD COLUMN IF NOT EXISTS thermal_model_invalid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thermal_model_reason text,
  ADD COLUMN IF NOT EXISTS worst_case_max_temp numeric,
  ADD COLUMN IF NOT EXISTS worst_case_min_temp numeric,
  ADD COLUMN IF NOT EXISTS reboot_heater_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reboot_vent_purge boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reboot_nh3_muted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS age_valid boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS age_rejection_reason text;
