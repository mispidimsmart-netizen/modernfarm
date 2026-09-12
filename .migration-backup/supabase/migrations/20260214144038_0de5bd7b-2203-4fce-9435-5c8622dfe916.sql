
-- ============================================
-- MULTI-TENANT FARM-LEVEL ISOLATION
-- ============================================

-- 1. FARM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.farm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(farm_id, user_id)
);
ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- 2. SECURITY DEFINER: FARM ACCESS CHECK
CREATE OR REPLACE FUNCTION public.user_can_access_farm(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(_farm_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.farm_members WHERE user_id = _user_id AND farm_id = _farm_id)
    OR public.is_super_admin(_user_id)
  ), false)
$$;

-- 3. ADD farm_id COLUMNS TO ALL TABLES
ALTER TABLE public.sheds ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.automation_rules_new ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.broiler_batches ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.broiler_feed ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.broiler_mortality ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.broiler_sales ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.broiler_weights ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.daily_reports ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.daily_summary ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.device_calibration ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.device_command_log ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.device_commands ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.device_control ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.device_tokens ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.egg_production ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.emergency_events ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.emergency_webhook_config ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.farm_audit_logs ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.farm_settings ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.feed_consumption ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.feed_inventory ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.firmware_install_logs ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.flock_info ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.lighting_schedule ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.sensor_readings ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);
ALTER TABLE public.advanced_automation_settings ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id);

-- 4. BACKFILL: Create default farm per user
INSERT INTO public.farms (owner_id, name, name_en)
SELECT DISTINCT p.id, 'ডিফল্ট ফার্ম', 'Default Farm'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.farms f WHERE f.owner_id = p.id);

-- Add all farm owners to farm_members as 'owner'
INSERT INTO public.farm_members (farm_id, user_id, role)
SELECT f.id, f.owner_id, 'owner'
FROM public.farms f
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- 5. BACKFILL farm_id ON ALL TABLES
UPDATE public.sheds SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = sheds.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.alerts SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = alerts.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.automation_rules SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = automation_rules.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.automation_rules_new SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = automation_rules_new.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.broiler_batches SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = broiler_batches.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.broiler_feed SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = broiler_feed.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.broiler_mortality SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = broiler_mortality.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.broiler_sales SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = broiler_sales.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.broiler_weights SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = broiler_weights.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.daily_reports SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = daily_reports.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.daily_summary SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = daily_summary.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_calibration SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_calibration.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_command_log SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_command_log.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_commands SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_commands.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_control SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_control.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_tokens SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_tokens.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.egg_production SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = egg_production.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.emergency_events SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = emergency_events.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.emergency_webhook_config SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = emergency_webhook_config.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.expenses SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = expenses.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.farm_audit_logs SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = farm_audit_logs.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.farm_settings SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = farm_settings.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.feed_consumption SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = feed_consumption.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.feed_inventory SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = feed_inventory.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.firmware_install_logs SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = firmware_install_logs.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.flock_info SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = flock_info.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.income SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = income.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.lighting_schedule SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = lighting_schedule.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.sensor_readings SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = sensor_readings.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.advanced_automation_settings SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = advanced_automation_settings.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_status SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_status.user_id LIMIT 1) WHERE farm_id IS NULL;
UPDATE public.device_health SET farm_id = (SELECT f.id FROM public.farms f WHERE f.owner_id = device_health.user_id LIMIT 1) WHERE farm_id IS NULL;

-- 6. UPDATE handle_new_user TO CREATE FARM
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  RETURN NEW;
END;
$$;

-- 7. FARM_MEMBERS RLS POLICIES
CREATE POLICY "View own memberships" ON public.farm_members
FOR SELECT USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Farm owners insert members" ON public.farm_members
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.farms WHERE id = farm_id AND owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Farm owners update members" ON public.farm_members
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.farms WHERE id = farm_id AND owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Remove membership" ON public.farm_members
FOR DELETE USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.farms WHERE id = farm_id AND owner_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- 8. DROP OLD & CREATE FARM-BASED RLS POLICIES

-- === GROUP A: Simple ALL-command tables ===

-- alerts
DROP POLICY IF EXISTS "Users can manage their own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Super admins can view all alerts" ON public.alerts;
CREATE POLICY "Farm tenant access" ON public.alerts FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- automation_rules
DROP POLICY IF EXISTS "Users can manage their own rules" ON public.automation_rules;
CREATE POLICY "Farm tenant access" ON public.automation_rules FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- automation_rules_new
DROP POLICY IF EXISTS "Users can manage their own automation rules" ON public.automation_rules_new;
CREATE POLICY "Farm tenant access" ON public.automation_rules_new FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- broiler_batches
DROP POLICY IF EXISTS "Users can manage their own broiler batches" ON public.broiler_batches;
DROP POLICY IF EXISTS "Super admins can view all broiler batches" ON public.broiler_batches;
CREATE POLICY "Farm tenant access" ON public.broiler_batches FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- broiler_feed
DROP POLICY IF EXISTS "Users can manage their own broiler feed records" ON public.broiler_feed;
CREATE POLICY "Farm tenant access" ON public.broiler_feed FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- broiler_mortality
DROP POLICY IF EXISTS "Users can manage their own broiler mortality" ON public.broiler_mortality;
CREATE POLICY "Farm tenant access" ON public.broiler_mortality FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- broiler_sales
DROP POLICY IF EXISTS "Users can manage their own broiler sales" ON public.broiler_sales;
CREATE POLICY "Farm tenant access" ON public.broiler_sales FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- broiler_weights
DROP POLICY IF EXISTS "Users can manage their own weight records" ON public.broiler_weights;
CREATE POLICY "Farm tenant access" ON public.broiler_weights FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- daily_reports
DROP POLICY IF EXISTS "Users can manage their own reports" ON public.daily_reports;
CREATE POLICY "Farm tenant access" ON public.daily_reports FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- daily_summary
DROP POLICY IF EXISTS "Users can manage their own daily summaries" ON public.daily_summary;
CREATE POLICY "Farm tenant access" ON public.daily_summary FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- device_calibration
DROP POLICY IF EXISTS "Users can manage their own calibration data" ON public.device_calibration;
DROP POLICY IF EXISTS "Super admins can view all calibration data" ON public.device_calibration;
CREATE POLICY "Farm tenant access" ON public.device_calibration FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- device_command_log
DROP POLICY IF EXISTS "Users can manage their own command logs" ON public.device_command_log;
DROP POLICY IF EXISTS "Super admins can view all command logs" ON public.device_command_log;
CREATE POLICY "Farm tenant access" ON public.device_command_log FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- device_commands
DROP POLICY IF EXISTS "Users can manage their own device commands" ON public.device_commands;
CREATE POLICY "Farm tenant access" ON public.device_commands FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- device_tokens
DROP POLICY IF EXISTS "Users can manage their own device tokens" ON public.device_tokens;
CREATE POLICY "Farm tenant access" ON public.device_tokens FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- egg_production
DROP POLICY IF EXISTS "Users can manage their own egg production" ON public.egg_production;
DROP POLICY IF EXISTS "Super admins can view all egg production" ON public.egg_production;
CREATE POLICY "Farm tenant access" ON public.egg_production FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- emergency_webhook_config
DROP POLICY IF EXISTS "Users can manage their own webhook config" ON public.emergency_webhook_config;
CREATE POLICY "Farm tenant access" ON public.emergency_webhook_config FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- expenses
DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.expenses;
CREATE POLICY "Farm tenant access" ON public.expenses FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- feed_consumption
DROP POLICY IF EXISTS "Users can manage their own feed consumption" ON public.feed_consumption;
CREATE POLICY "Farm tenant access" ON public.feed_consumption FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- feed_inventory
DROP POLICY IF EXISTS "Users can manage their own feed inventory" ON public.feed_inventory;
CREATE POLICY "Farm tenant access" ON public.feed_inventory FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- firmware_install_logs
DROP POLICY IF EXISTS "Users can manage their own install logs" ON public.firmware_install_logs;
DROP POLICY IF EXISTS "Super admins can view all install logs" ON public.firmware_install_logs;
CREATE POLICY "Farm tenant access" ON public.firmware_install_logs FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- flock_info
DROP POLICY IF EXISTS "Users can manage their own flock info" ON public.flock_info;
CREATE POLICY "Farm tenant access" ON public.flock_info FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- income
DROP POLICY IF EXISTS "Users can manage their own income" ON public.income;
CREATE POLICY "Farm tenant access" ON public.income FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- lighting_schedule
DROP POLICY IF EXISTS "Users can manage their own schedule" ON public.lighting_schedule;
CREATE POLICY "Farm tenant access" ON public.lighting_schedule FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- sensor_readings
DROP POLICY IF EXISTS "Users can manage their own sensor readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Users can view their own readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Users can insert their own readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Super admins can view all sensor readings" ON public.sensor_readings;
CREATE POLICY "Farm tenant access" ON public.sensor_readings FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- advanced_automation_settings
DROP POLICY IF EXISTS "Users can manage their own automation settings" ON public.advanced_automation_settings;
DROP POLICY IF EXISTS "Super admins can view all automation settings" ON public.advanced_automation_settings;
CREATE POLICY "Farm tenant access" ON public.advanced_automation_settings FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- sheds
DROP POLICY IF EXISTS "Users can manage their own sheds" ON public.sheds;
CREATE POLICY "Farm tenant access" ON public.sheds FOR ALL
USING (public.user_can_access_farm(auth.uid(), farm_id)) WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- === GROUP B: Separate operation policies ===

-- device_status
DROP POLICY IF EXISTS "Users can view their own device status" ON public.device_status;
DROP POLICY IF EXISTS "Users can insert their own device status" ON public.device_status;
DROP POLICY IF EXISTS "Users can update their own device status" ON public.device_status;
DROP POLICY IF EXISTS "Super admins can view all device status" ON public.device_status;
CREATE POLICY "Farm tenant select" ON public.device_status FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.device_status FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.device_status FOR UPDATE
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- device_health
DROP POLICY IF EXISTS "Users can view their own device health" ON public.device_health;
DROP POLICY IF EXISTS "Users can insert their own device health" ON public.device_health;
DROP POLICY IF EXISTS "Users can update their own device health" ON public.device_health;
DROP POLICY IF EXISTS "Super admins can view all device health" ON public.device_health;
CREATE POLICY "Farm tenant select" ON public.device_health FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.device_health FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.device_health FOR UPDATE
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- device_control
DROP POLICY IF EXISTS "Users can view their own device control" ON public.device_control;
DROP POLICY IF EXISTS "Users can insert their own device control" ON public.device_control;
DROP POLICY IF EXISTS "Users can update their own device control" ON public.device_control;
CREATE POLICY "Farm tenant select" ON public.device_control FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.device_control FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.device_control FOR UPDATE
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- emergency_events
DROP POLICY IF EXISTS "Users can view their own emergency events" ON public.emergency_events;
DROP POLICY IF EXISTS "Users can insert their own emergency events" ON public.emergency_events;
DROP POLICY IF EXISTS "Users can update their own emergency events" ON public.emergency_events;
DROP POLICY IF EXISTS "Super admins can view all emergency events" ON public.emergency_events;
CREATE POLICY "Farm tenant select" ON public.emergency_events FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.emergency_events FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.emergency_events FOR UPDATE
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- farm_audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.farm_audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.farm_audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.farm_audit_logs;
CREATE POLICY "Farm tenant select" ON public.farm_audit_logs FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.farm_audit_logs FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- farm_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.farm_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.farm_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.farm_settings;
DROP POLICY IF EXISTS "Super admins can view all farm settings" ON public.farm_settings;
CREATE POLICY "Farm tenant select" ON public.farm_settings FOR SELECT
USING (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant insert" ON public.farm_settings FOR INSERT
WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));
CREATE POLICY "Farm tenant update" ON public.farm_settings FOR UPDATE
USING (public.user_can_access_farm(auth.uid(), farm_id));

-- farms table
DROP POLICY IF EXISTS "Users can manage their own farms" ON public.farms;
DROP POLICY IF EXISTS "Super admins can view all farms" ON public.farms;
CREATE POLICY "Members can view farms" ON public.farms FOR SELECT
USING (public.user_can_access_farm(auth.uid(), id) OR auth.uid() = owner_id);
CREATE POLICY "Owners manage farms" ON public.farms FOR ALL
USING (auth.uid() = owner_id OR public.is_super_admin(auth.uid()))
WITH CHECK (auth.uid() = owner_id OR public.is_super_admin(auth.uid()));

-- 9. PERFORMANCE INDICES
CREATE INDEX IF NOT EXISTS idx_farm_members_user ON public.farm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_members_farm ON public.farm_members(farm_id);
CREATE INDEX IF NOT EXISTS idx_sheds_farm_id ON public.sheds(farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_farm_id ON public.alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_farm_id ON public.device_tokens(farm_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_id ON public.sensor_readings(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_status_farm_id ON public.device_status(farm_id);
CREATE INDEX IF NOT EXISTS idx_device_health_farm_id ON public.device_health(farm_id);
