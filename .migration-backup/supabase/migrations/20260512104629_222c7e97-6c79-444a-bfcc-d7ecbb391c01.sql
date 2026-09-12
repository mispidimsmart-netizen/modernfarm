-- 1) Role hierarchy helper (immutable, no table reads)
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'super_admin' THEN 99
    WHEN 'owner'       THEN 50
    WHEN 'admin'       THEN 40
    WHEN 'manager'     THEN 30
    WHEN 'technician'  THEN 30
    WHEN 'farmer'      THEN 20
    WHEN 'worker'      THEN 10
    WHEN 'viewer'      THEN 0
    ELSE 0
  END
$$;

-- 2) Farm-scoped role check (security definer, bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_farm_role(
  _user_id uuid,
  _farm_id uuid,
  _min_role public.app_role
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _farm_id IS NOT NULL
    AND (
      public.is_super_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.farms f
        WHERE f.id = _farm_id AND f.owner_id = _user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.farms f
          ON f.id = _farm_id
         AND f.owner_id = ur.farm_owner_id
        WHERE ur.user_id = _user_id
          AND public.role_rank(ur.role) >= public.role_rank(_min_role)
      )
    )
$$;

-- 3) Tighten device_commands writes — workers cannot issue commands
DROP POLICY IF EXISTS "Restrict device_commands writes to farmer+" ON public.device_commands;
CREATE POLICY "Restrict device_commands writes to farmer+"
ON public.device_commands
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  farm_id IS NOT NULL
  AND public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

DROP POLICY IF EXISTS "Restrict device_commands updates to farmer+" ON public.device_commands;
CREATE POLICY "Restrict device_commands updates to farmer+"
ON public.device_commands
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
)
WITH CHECK (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

DROP POLICY IF EXISTS "Restrict device_commands deletes to farmer+" ON public.device_commands;
CREATE POLICY "Restrict device_commands deletes to farmer+"
ON public.device_commands
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

-- 4) Tighten farm_settings writes — workers/viewers read-only
DROP POLICY IF EXISTS "Restrict farm_settings writes to farmer+" ON public.farm_settings;
CREATE POLICY "Restrict farm_settings writes to farmer+"
ON public.farm_settings
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  farm_id IS NOT NULL
  AND public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

DROP POLICY IF EXISTS "Restrict farm_settings updates to farmer+" ON public.farm_settings;
CREATE POLICY "Restrict farm_settings updates to farmer+"
ON public.farm_settings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
)
WITH CHECK (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

DROP POLICY IF EXISTS "Restrict farm_settings deletes to farmer+" ON public.farm_settings;
CREATE POLICY "Restrict farm_settings deletes to farmer+"
ON public.farm_settings
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  farm_id IS NULL
  OR public.has_farm_role(auth.uid(), farm_id, 'farmer'::public.app_role)
);

-- 5) Allow super admins to view all user_roles (support/audit)
DROP POLICY IF EXISTS "Super admins view all user_roles" ON public.user_roles;
CREATE POLICY "Super admins view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));