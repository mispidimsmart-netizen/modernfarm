-- Add unique constraint on (user_id, shed_id) for advanced_automation_settings
-- First, create a unique index that handles NULL shed_id properly
CREATE UNIQUE INDEX IF NOT EXISTS advanced_automation_settings_user_shed_unique 
ON advanced_automation_settings (user_id, COALESCE(shed_id, '00000000-0000-0000-0000-000000000000'::uuid));