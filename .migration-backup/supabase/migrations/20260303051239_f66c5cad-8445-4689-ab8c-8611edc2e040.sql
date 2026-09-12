
-- =====================================================
-- 8-CHANNEL RELAY EXPANSION MIGRATION
-- Add ceiling_fan_on, sprinkler_on to device_status
-- Add sprinkler/ceiling fan fields to related tables
-- =====================================================

-- 1. device_status: Add new device columns
ALTER TABLE public.device_status
  ADD COLUMN IF NOT EXISTS ceiling_fan_on boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sprinkler_on boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_ceiling_fan_on boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS desired_sprinkler_on boolean DEFAULT null;

-- 2. device_commands: No schema change needed (uses device_name text field)

-- 3. device_health: Add sprinkler/ceiling fan tracking
ALTER TABLE public.device_health
  ADD COLUMN IF NOT EXISTS ceiling_fan_total_runtime_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sprinkler_total_runtime_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sprinkler_last_cycle_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS relay_count integer DEFAULT 4;

-- 4. device_hardware_profiles: Update default relay_count comment
COMMENT ON COLUMN public.device_hardware_profiles.relay_count IS 'Number of relay channels (4 or 8)';

-- 5. advanced_automation_settings: Add sprinkler and ceiling fan settings
ALTER TABLE public.advanced_automation_settings
  ADD COLUMN IF NOT EXISTS sprinkler_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sprinkler_hsi_threshold numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS sprinkler_stop_hsi numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS sprinkler_cycle_on_seconds integer DEFAULT 300,
  ADD COLUMN IF NOT EXISTS sprinkler_cycle_off_seconds integer DEFAULT 600,
  ADD COLUMN IF NOT EXISTS sprinkler_max_daily_minutes integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS ceiling_fan_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ceiling_fan_on_temp numeric DEFAULT 25,
  ADD COLUMN IF NOT EXISTS ceiling_fan_off_temp numeric DEFAULT 22;

-- 6. device_command_log: No schema change needed (uses device_name text field)

-- 7. safety_status: Add sprinkler safety fields
ALTER TABLE public.safety_status
  ADD COLUMN IF NOT EXISTS sprinkler_safety_blocked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sprinkler_block_reason text DEFAULT null;
