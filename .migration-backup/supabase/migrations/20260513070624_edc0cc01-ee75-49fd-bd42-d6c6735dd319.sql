-- 1) Super admin can toggle another user's super_admin status
CREATE OR REPLACE FUNCTION public.super_admin_set_super_admin(_user_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  IF _user_id = auth.uid() AND _enabled = false THEN
    RAISE EXCEPTION 'cannot remove your own super admin role';
  END IF;
  IF _enabled THEN
    INSERT INTO public.super_admins(user_id) VALUES (_user_id)
      ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.super_admins WHERE user_id = _user_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.super_admin_set_super_admin(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_set_super_admin(uuid, boolean) TO authenticated;

-- 2) Super admin can set/clear farm_members role for any user/farm
CREATE OR REPLACE FUNCTION public.super_admin_set_farm_member_role(
  _farm_id uuid, _user_id uuid, _role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  IF _role IS NULL OR _role = 'none' OR _role = '' THEN
    DELETE FROM public.farm_members WHERE farm_id = _farm_id AND user_id = _user_id;
  ELSE
    IF _role NOT IN ('manager','member','viewer','worker') THEN
      RAISE EXCEPTION 'invalid role: %', _role;
    END IF;
    INSERT INTO public.farm_members(farm_id, user_id, role)
      VALUES (_farm_id, _user_id, _role)
    ON CONFLICT (farm_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.super_admin_set_farm_member_role(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_set_farm_member_role(uuid, uuid, text) TO authenticated;

-- 3) Convenience: list all role-bearing rows for a user (one shot fetch)
CREATE OR REPLACE FUNCTION public.super_admin_get_user_role_summary(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;
  SELECT jsonb_build_object(
    'is_super_admin', EXISTS(SELECT 1 FROM public.super_admins WHERE user_id = _user_id),
    'orgs', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'organization_id', om.organization_id,
        'org_name', o.name,
        'org_slug', o.slug,
        'role', om.role
      ) ORDER BY o.name)
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.user_id = _user_id
    ), '[]'::jsonb),
    'owned_farms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'farm_id', f.id, 'farm_name', f.name, 'organization_id', f.organization_id
      ) ORDER BY f.name)
      FROM public.farms f WHERE f.owner_id = _user_id
    ), '[]'::jsonb),
    'farm_memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'farm_id', fm.farm_id, 'farm_name', f.name,
        'organization_id', f.organization_id, 'role', fm.role
      ) ORDER BY f.name)
      FROM public.farm_members fm
      JOIN public.farms f ON f.id = fm.farm_id
      WHERE fm.user_id = _user_id
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.super_admin_get_user_role_summary(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.super_admin_get_user_role_summary(uuid) TO authenticated;