
-- Helper: orgs the caller can administer
CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS TABLE(
  id uuid, name text, name_en text, slug text,
  license_type org_license_type, license_expires_at timestamptz,
  max_farms int, max_users int,
  my_role org_role,
  farm_count bigint, member_count bigint,
  license_valid boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.name_en, o.slug,
         o.license_type, o.license_expires_at,
         o.max_farms, o.max_users,
         om.role,
         (SELECT count(*) FROM public.farms f WHERE f.organization_id = o.id),
         (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id),
         public.is_organization_license_valid(o.id)
  FROM public.organizations o
  JOIN public.organization_members om
    ON om.organization_id = o.id AND om.user_id = auth.uid()
  WHERE om.role IN ('org_owner','org_admin')
  ORDER BY o.created_at DESC
$$;

-- Org admin add member
CREATE OR REPLACE FUNCTION public.org_admin_add_member(
  _org_id uuid, _identifier text, _role org_role DEFAULT 'member'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _target uuid;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Only org_owner/org_admin of THIS org can add
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _caller
      AND role IN ('org_owner','org_admin')
  ) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Permission denied: not an admin of this organization';
  END IF;

  -- Org admins cannot create another org_owner
  IF _role = 'org_owner' THEN
    RAISE EXCEPTION 'Only super admin can assign org_owner';
  END IF;

  -- Resolve identifier (uuid | phone | email)
  BEGIN
    _target := _identifier::uuid;
  EXCEPTION WHEN others THEN
    SELECT id INTO _target FROM public.profiles
    WHERE phone = _identifier OR email = _identifier
    LIMIT 1;
  END;

  IF _target IS NULL THEN
    RAISE EXCEPTION 'User not found: %', _identifier;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _target, _role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  PERFORM public.log_security_event('org_member_added', _caller, NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'target_user', _target, 'role', _role, 'by', 'org_admin'));

  RETURN jsonb_build_object('success', true, 'user_id', _target);
END;
$$;

-- Org admin set role
CREATE OR REPLACE FUNCTION public.org_admin_set_member_role(
  _org_id uuid, _user_id uuid, _role org_role
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _target_role org_role;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _caller
      AND role IN ('org_owner','org_admin')
  ) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF _role = 'org_owner' THEN
    RAISE EXCEPTION 'Only super admin can assign org_owner';
  END IF;

  SELECT role INTO _target_role FROM public.organization_members
   WHERE organization_id = _org_id AND user_id = _user_id;
  IF _target_role = 'org_owner' THEN
    RAISE EXCEPTION 'Cannot change role of org owner';
  END IF;

  UPDATE public.organization_members
     SET role = _role
   WHERE organization_id = _org_id AND user_id = _user_id;

  PERFORM public.log_security_event('org_member_role_changed', _caller, NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'target_user', _user_id, 'new_role', _role, 'by', 'org_admin'));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Org admin remove member
CREATE OR REPLACE FUNCTION public.org_admin_remove_member(
  _org_id uuid, _user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _target_role org_role;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _caller
      AND role IN ('org_owner','org_admin')
  ) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT role INTO _target_role FROM public.organization_members
   WHERE organization_id = _org_id AND user_id = _user_id;
  IF _target_role = 'org_owner' THEN
    RAISE EXCEPTION 'Cannot remove org owner';
  END IF;

  DELETE FROM public.organization_members
   WHERE organization_id = _org_id AND user_id = _user_id;

  PERFORM public.log_security_event('org_member_removed', _caller, NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'target_user', _user_id, 'by', 'org_admin'));

  RETURN jsonb_build_object('success', true);
END;
$$;
