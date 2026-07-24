CREATE OR REPLACE FUNCTION public.user_can_access_farm_v2(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _is_member boolean;
  _is_owner boolean;
  _is_org boolean;
BEGIN
  IF _user_id IS NULL OR _farm_id IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin always has access.
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT organization_id, owner_id = _user_id
  INTO _org_id, _is_owner
  FROM public.farms
  WHERE id = _farm_id;

  -- Direct farm owner access was missing here; without it, device command
  -- inserts can fail RLS even when can_manage_farm() is true.
  IF COALESCE(_is_owner, false) THEN
    RETURN true;
  END IF;

  -- License gate (only when farm is org-linked).
  IF _org_id IS NOT NULL AND NOT public.is_organization_license_valid(_org_id) THEN
    RETURN false;
  END IF;

  -- Direct farm member.
  SELECT EXISTS (
    SELECT 1
    FROM public.farm_members
    WHERE farm_id = _farm_id
      AND user_id = _user_id
  ) INTO _is_member;
  IF _is_member THEN
    RETURN true;
  END IF;

  -- Org owner / admin.
  IF _org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = _org_id
        AND user_id = _user_id
        AND role IN ('org_owner','org_admin')
    ) INTO _is_org;
    IF _is_org THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;

DROP POLICY IF EXISTS "device_commands insert requires farm permission" ON public.device_commands;
CREATE POLICY "device_commands insert requires hardware permission"
ON public.device_commands
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  farm_id IS NOT NULL
  AND user_id = auth.uid()
  AND public.can_change_hardware(auth.uid(), farm_id)
);

DROP POLICY IF EXISTS "device_commands update requires farm permission" ON public.device_commands;
CREATE POLICY "device_commands update requires hardware permission"
ON public.device_commands
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  farm_id IS NOT NULL
  AND public.can_change_hardware(auth.uid(), farm_id)
)
WITH CHECK (
  farm_id IS NOT NULL
  AND user_id = auth.uid()
  AND public.can_change_hardware(auth.uid(), farm_id)
);

DROP POLICY IF EXISTS "device_commands delete requires farm permission" ON public.device_commands;
CREATE POLICY "device_commands delete requires hardware permission"
ON public.device_commands
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  farm_id IS NOT NULL
  AND public.can_change_hardware(auth.uid(), farm_id)
);