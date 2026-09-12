
-- Add manager and technician to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technician';

-- Create audit log table
CREATE TABLE public.farm_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_role text,
  action_type text NOT NULL,
  action_category text NOT NULL DEFAULT 'general',
  target_entity text,
  target_id text,
  shed_id uuid REFERENCES public.sheds(id),
  device_name text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  source text NOT NULL DEFAULT 'app',
  severity text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.farm_audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner can see all logs for their farm
CREATE POLICY "Users can view their own audit logs"
  ON public.farm_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert audit logs"
  ON public.farm_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can see all
CREATE POLICY "Super admins can view all audit logs"
  ON public.farm_audit_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Indexes for fast filtering
CREATE INDEX idx_audit_logs_user ON public.farm_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_category ON public.farm_audit_logs(action_category, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.farm_audit_logs(action_type, created_at DESC);
CREATE INDEX idx_audit_logs_date ON public.farm_audit_logs(created_at DESC);

-- Update get_user_access_role to handle manager and technician
CREATE OR REPLACE FUNCTION public.get_user_access_role(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT 'admin'::text FROM public.super_admins WHERE user_id = _user_id LIMIT 1),
    (SELECT 
      CASE role::text
        WHEN 'admin' THEN 'admin'
        WHEN 'super_admin' THEN 'admin'
        WHEN 'owner' THEN 'farmer'
        WHEN 'manager' THEN 'farmer'
        WHEN 'farmer' THEN 'farmer'
        WHEN 'worker' THEN 'farmer'
        WHEN 'technician' THEN 'farmer'
        WHEN 'viewer' THEN 'viewer'
        ELSE 'farmer'
      END
    FROM public.user_roles 
    WHERE user_id = _user_id 
    ORDER BY 
      CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'super_admin' THEN 1
        WHEN 'owner' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'farmer' THEN 4
        WHEN 'technician' THEN 5
        WHEN 'worker' THEN 6
        WHEN 'viewer' THEN 7
        ELSE 8
      END
    LIMIT 1),
    'farmer'::text
  )
$function$;
