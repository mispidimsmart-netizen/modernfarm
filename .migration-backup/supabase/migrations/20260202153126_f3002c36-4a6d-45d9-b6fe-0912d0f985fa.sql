-- Add super_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create a table for super admins (separate from user_roles for security)
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can see the super_admins table
CREATE POLICY "Super admins can view super admin list"
  ON public.super_admins
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- Create a security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Create RLS policies for super admins to read all data
-- Profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Sheds
CREATE POLICY "Super admins can view all sheds"
  ON public.sheds
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Farms
CREATE POLICY "Super admins can view all farms"
  ON public.farms
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Sensor logs
CREATE POLICY "Super admins can view all sensor logs"
  ON public.sensor_logs
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Device status
CREATE POLICY "Super admins can view all device status"
  ON public.device_status
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Alerts
CREATE POLICY "Super admins can view all alerts"
  ON public.alerts
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Egg production
CREATE POLICY "Super admins can view all egg production"
  ON public.egg_production
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Farm settings
CREATE POLICY "Super admins can view all farm settings"
  ON public.farm_settings
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Device health
CREATE POLICY "Super admins can view all device health"
  ON public.device_health
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));