
-- Track farm setup wizard progress per farm
CREATE TABLE public.farm_setup_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Step completion flags
  step_farm_created BOOLEAN NOT NULL DEFAULT false,
  step_shed_added BOOLEAN NOT NULL DEFAULT false,
  step_controller_registered BOOLEAN NOT NULL DEFAULT false,
  step_relays_tested BOOLEAN NOT NULL DEFAULT false,
  step_sensors_calibrated BOOLEAN NOT NULL DEFAULT false,
  step_chick_age_set BOOLEAN NOT NULL DEFAULT false,
  step_automation_profile_selected BOOLEAN NOT NULL DEFAULT false,
  step_simulation_passed BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  current_step INTEGER NOT NULL DEFAULT 1,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  relay_test_results JSONB DEFAULT '{}'::jsonb,
  simulation_results JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(farm_id)
);

-- Enable RLS
ALTER TABLE public.farm_setup_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Farm tenant access" ON public.farm_setup_status
  FOR ALL USING (user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

-- Auto-create setup status when a farm is created (update handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_farm_id UUID;
  default_shed_id UUID;
BEGIN
  INSERT INTO public.profiles (id, phone, farm_name)
  VALUES (NEW.id, NEW.phone, 'আমার লেয়ার ফার্ম');
  
  INSERT INTO public.farms (owner_id, name, name_en)
  VALUES (NEW.id, 'আমার ফার্ম', 'My Farm')
  RETURNING id INTO default_farm_id;
  
  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (default_farm_id, NEW.id, 'owner');
  
  INSERT INTO public.farm_settings (user_id, farm_id)
  VALUES (NEW.id, default_farm_id);
  
  INSERT INTO public.sheds (user_id, farm_id, name, name_en, bird_capacity)
  VALUES (NEW.id, default_farm_id, 'শেড ১', 'Shed 1', 1000)
  RETURNING id INTO default_shed_id;
  
  INSERT INTO public.device_status (user_id, farm_id, shed_id)
  VALUES (NEW.id, default_farm_id, default_shed_id);
  
  INSERT INTO public.lighting_schedule (user_id, farm_id)
  VALUES (NEW.id, default_farm_id);
  
  INSERT INTO public.flock_info (user_id, farm_id, shed_id)
  VALUES (NEW.id, default_farm_id, default_shed_id);
  
  -- Create setup status tracking (steps 1 & 2 already done by trigger)
  INSERT INTO public.farm_setup_status (farm_id, user_id, step_farm_created, step_shed_added, current_step)
  VALUES (default_farm_id, NEW.id, true, true, 3);
  
  RETURN NEW;
END;
$function$;

-- Backfill existing farms with setup status (mark as complete for existing users)
INSERT INTO public.farm_setup_status (farm_id, user_id, step_farm_created, step_shed_added, step_controller_registered, step_relays_tested, step_sensors_calibrated, step_chick_age_set, step_automation_profile_selected, step_simulation_passed, current_step, setup_completed, setup_completed_at)
SELECT f.id, f.owner_id, true, true, true, true, true, true, true, true, 8, true, now()
FROM public.farms f
WHERE NOT EXISTS (SELECT 1 FROM public.farm_setup_status s WHERE s.farm_id = f.id);

-- Timestamp trigger
CREATE TRIGGER update_farm_setup_status_updated_at
  BEFORE UPDATE ON public.farm_setup_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
