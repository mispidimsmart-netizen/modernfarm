-- Prevent duplicates at DB level
ALTER TABLE public.advanced_automation_settings
ADD CONSTRAINT advanced_automation_settings_farm_id_unique UNIQUE (farm_id);

ALTER TABLE public.farm_settings
ADD CONSTRAINT farm_settings_farm_id_unique UNIQUE (farm_id);

-- Performance indexes for cleanup queries and command polling
CREATE INDEX IF NOT EXISTS idx_device_commands_pending
  ON public.device_commands (user_id, device_name, executed, created_at)
  WHERE executed = false;

CREATE INDEX IF NOT EXISTS idx_emergency_events_active
  ON public.emergency_events (status, created_at)
  WHERE status IN ('active', 'escalated');