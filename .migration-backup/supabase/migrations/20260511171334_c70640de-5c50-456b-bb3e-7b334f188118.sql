CREATE OR REPLACE FUNCTION public.get_org_license_audit(_org_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  changed_at timestamptz,
  changed_by uuid,
  changed_by_name text,
  changed_by_email text,
  is_super_admin boolean,
  old_license_type text,
  new_license_type text,
  old_expires_at timestamptz,
  new_expires_at timestamptz,
  max_farms int,
  max_users int
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _allowed boolean := false;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Super admin OR org_owner/org_admin of this org
  IF public.is_super_admin(_caller) THEN
    _allowed := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = _org_id
        AND om.user_id = _caller
        AND om.role IN ('org_owner','org_admin')
    ) INTO _allowed;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    sal.id,
    sal.created_at AS changed_at,
    sal.user_id AS changed_by,
    p.user_name AS changed_by_name,
    p.email AS changed_by_email,
    public.is_super_admin(sal.user_id) AS is_super_admin,
    sal.details->>'old_license_type' AS old_license_type,
    sal.details->>'new_license_type' AS new_license_type,
    NULLIF(sal.details->>'old_expires_at','')::timestamptz AS old_expires_at,
    NULLIF(sal.details->>'new_expires_at','')::timestamptz AS new_expires_at,
    NULLIF(sal.details->>'max_farms','')::int AS max_farms,
    NULLIF(sal.details->>'max_users','')::int AS max_users
  FROM public.security_audit_log sal
  LEFT JOIN public.profiles p ON p.id = sal.user_id
  WHERE sal.event_type = 'org_license_updated'
    AND sal.details->>'org_id' = _org_id::text
  ORDER BY sal.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;