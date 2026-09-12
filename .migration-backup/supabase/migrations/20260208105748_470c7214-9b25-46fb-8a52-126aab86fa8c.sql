-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- Create function to get user's access role (returns highest priority role)
CREATE OR REPLACE FUNCTION public.get_user_access_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Check for super_admin first (highest priority)
    (SELECT 'admin'::text FROM public.super_admins WHERE user_id = _user_id LIMIT 1),
    -- Then check user_roles for specific roles
    (SELECT 
      CASE role::text
        WHEN 'admin' THEN 'admin'
        WHEN 'super_admin' THEN 'admin'
        WHEN 'owner' THEN 'farmer'
        WHEN 'farmer' THEN 'farmer'
        WHEN 'worker' THEN 'farmer'
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
        WHEN 'farmer' THEN 2
        WHEN 'worker' THEN 3
        WHEN 'viewer' THEN 4
        ELSE 5
      END
    LIMIT 1),
    -- Default to farmer for new users
    'farmer'::text
  )
$$;

-- Create function to check if user has minimum required role
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.get_user_access_role(_user_id)
    WHEN 'admin' THEN true
    WHEN 'farmer' THEN _required_role IN ('farmer', 'viewer')
    WHEN 'viewer' THEN _required_role = 'viewer'
    ELSE false
  END
$$;

-- Create function to assign role to user (admin only operation)
CREATE OR REPLACE FUNCTION public.assign_user_role(_target_user_id uuid, _role app_role, _assigner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can assign roles
  IF NOT (public.get_user_access_role(_assigner_id) = 'admin') THEN
    RAISE EXCEPTION 'Permission denied: Admin only';
  END IF;
  
  -- Only admins can create other admins
  IF _role::text = 'admin' AND NOT public.is_super_admin(_assigner_id) THEN
    RAISE EXCEPTION 'Permission denied: Only super admin can create admins';
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, farm_owner_id, role)
  VALUES (_target_user_id, _assigner_id, _role)
  ON CONFLICT (user_id, farm_owner_id) 
  DO UPDATE SET role = _role;
  
  RETURN true;
END;
$$;