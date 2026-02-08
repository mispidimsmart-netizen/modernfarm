-- ═══════════════════════════════════════════════════════════════════════════
-- FarmEye Advanced Automation Modules v2.0
-- Adds: Fogger, Circulation Fan, Curtain Advisory, Advanced Ventilation Settings
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add new device control columns to device_status
ALTER TABLE public.device_status 
ADD COLUMN IF NOT EXISTS fogger_on BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS circulation_fan_on BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS curtain_position TEXT DEFAULT 'closed';

-- 2. Create advanced_automation_settings table for all module configurations
CREATE TABLE IF NOT EXISTS public.advanced_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id),
  
  -- Module 1: Minimum Ventilation Timer
  min_vent_enabled BOOLEAN DEFAULT true,
  min_vent_temp_threshold NUMERIC DEFAULT 26,
  min_vent_cycle_seconds INTEGER DEFAULT 40,
  min_vent_interval_minutes INTEGER DEFAULT 5,
  min_vent_ceiling_fan_always_on BOOLEAN DEFAULT true,
  
  -- Module 2: Heater Control (Layer mode specific)
  heater_enabled BOOLEAN DEFAULT true,
  heater_on_temp NUMERIC DEFAULT 20,
  heater_off_temp NUMERIC DEFAULT 24,
  heater_tolerance NUMERIC DEFAULT 0.7,
  
  -- Module 3: Fogger Cooling
  fogger_enabled BOOLEAN DEFAULT false,
  fogger_start_temp NUMERIC DEFAULT 32,
  fogger_start_humidity_max INTEGER DEFAULT 85,
  fogger_on_seconds INTEGER DEFAULT 40,
  fogger_pause_seconds INTEGER DEFAULT 120,
  fogger_stop_temp NUMERIC DEFAULT 30,
  fogger_stop_humidity INTEGER DEFAULT 90,
  
  -- Module 4: Broiler Airflow Growth Mode
  airflow_enabled BOOLEAN DEFAULT true,
  airflow_early_age_days INTEGER DEFAULT 10,
  airflow_mid_age_days INTEGER DEFAULT 20,
  airflow_mid_on_seconds INTEGER DEFAULT 30,
  airflow_mid_interval_minutes INTEGER DEFAULT 3,
  airflow_night_on_seconds INTEGER DEFAULT 60,
  airflow_night_interval_minutes INTEGER DEFAULT 5,
  
  -- Module 5: Layer Lighting Scheduler (extends existing lighting_schedule)
  lighting_fade_duration_minutes INTEGER DEFAULT 10,
  
  -- Module 6: Curtain Advisory
  curtain_advisory_enabled BOOLEAN DEFAULT true,
  curtain_open_temp_diff NUMERIC DEFAULT 3,
  curtain_close_on_cold BOOLEAN DEFAULT true,
  
  -- Module 7: Water Analytics Enhanced
  water_drop_threshold_percent INTEGER DEFAULT 30,
  water_night_spike_enabled BOOLEAN DEFAULT true,
  water_zero_flow_alert BOOLEAN DEFAULT true,
  water_baseline_hours INTEGER DEFAULT 24,
  
  -- Priority system
  automation_priority TEXT DEFAULT 'safety,heating,cooling,ventilation,lighting,advisory',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, shed_id)
);

-- 3. Enable RLS on advanced_automation_settings
ALTER TABLE public.advanced_automation_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can manage their own automation settings" 
ON public.advanced_automation_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all automation settings"
ON public.advanced_automation_settings
FOR SELECT
USING (is_super_admin(auth.uid()));

-- 5. Create trigger for updated_at
CREATE TRIGGER update_advanced_automation_settings_updated_at
BEFORE UPDATE ON public.advanced_automation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add water analytics tracking columns to device_health
ALTER TABLE public.device_health
ADD COLUMN IF NOT EXISTS water_hourly_baseline NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_night_spike_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS water_zero_flow_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_vent_last_cycle_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fogger_last_cycle_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS circulation_fan_last_cycle_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS curtain_advisory_last_sent TIMESTAMP WITH TIME ZONE;

-- 7. Add curtain advisory notifications type
ALTER TABLE public.schedule_notifications
ADD COLUMN IF NOT EXISTS advisory_type TEXT;

-- 8. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_advanced_automation_user_shed 
ON public.advanced_automation_settings(user_id, shed_id);

-- 9. Insert default settings for existing users
INSERT INTO public.advanced_automation_settings (user_id)
SELECT DISTINCT user_id FROM public.device_status
ON CONFLICT (user_id, shed_id) DO NOTHING;