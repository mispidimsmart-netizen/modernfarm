
-- 1) Super admin: change a farm's organization
CREATE OR REPLACE FUNCTION public.super_admin_set_farm_organization(_farm_id uuid, _org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  IF _org_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;
  UPDATE farms SET organization_id = _org_id, updated_at = now() WHERE id = _farm_id;
END;
$$;

-- 2) Super admin: delete a farm (cascades via existing FKs)
CREATE OR REPLACE FUNCTION public.super_admin_delete_farm(_farm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  DELETE FROM farms WHERE id = _farm_id;
END;
$$;

-- 3) Public: list active organizations for the signup picker
CREATE OR REPLACE FUNCTION public.list_active_organizations_for_signup()
RETURNS TABLE(id uuid, name text, name_en text, slug text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, name, name_en, slug
  FROM organizations
  WHERE license_type IN ('trial','lifetime','subscription')
  ORDER BY name ASC;
$$;
GRANT EXECUTE ON FUNCTION public.list_active_organizations_for_signup() TO anon, authenticated;

-- 4) Authenticated: caller assigns themselves to an organization
--    Adds membership (member role) and sets organization_id on all farms they own
CREATE OR REPLACE FUNCTION public.assign_self_to_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = _org_id) THEN
    RAISE EXCEPTION 'organization not found';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_org_id, _uid, 'member')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE farms
     SET organization_id = _org_id, updated_at = now()
   WHERE owner_id = _uid AND organization_id IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.assign_self_to_organization(uuid) TO authenticated;
