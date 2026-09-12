
-- Search users (for picking who to add)
CREATE OR REPLACE FUNCTION public.admin_search_users(_q text)
RETURNS TABLE (id uuid, user_name text, phone text, email text, farm_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  RETURN QUERY
  SELECT p.id, p.user_name, p.phone, p.email, p.farm_name
  FROM public.profiles p
  WHERE _q IS NULL OR _q = ''
     OR p.phone ILIKE '%'||_q||'%'
     OR p.email ILIKE '%'||_q||'%'
     OR p.user_name ILIKE '%'||_q||'%'
     OR p.farm_name ILIKE '%'||_q||'%'
  ORDER BY p.created_at DESC
  LIMIT 25;
END $$;

-- Create organization + auto-add owner as org_owner member
CREATE OR REPLACE FUNCTION public.super_admin_create_organization(
  _name text,
  _name_en text,
  _slug text,
  _owner_user_id uuid,
  _license_type public.org_license_type DEFAULT 'trial',
  _max_farms int DEFAULT 1,
  _max_users int DEFAULT 5,
  _license_expires_at timestamptz DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  IF _owner_user_id IS NULL THEN
    RAISE EXCEPTION 'owner_user_id is required';
  END IF;

  INSERT INTO public.organizations (
    name, name_en, slug, owner_user_id, license_type, max_farms, max_users, license_expires_at, notes
  ) VALUES (
    _name, _name_en, lower(_slug), _owner_user_id, _license_type, _max_farms, _max_users, _license_expires_at, _notes
  ) RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _owner_user_id, 'org_owner')
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'org_owner';

  PERFORM public.log_security_event(
    'org_created', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'owner_user_id', _owner_user_id, 'license_type', _license_type)
  );

  RETURN _org_id;
END $$;

-- Add org member by user identifier (phone or email)
CREATE OR REPLACE FUNCTION public.super_admin_add_org_member(
  _org_id uuid,
  _identifier text,
  _role public.org_role DEFAULT 'member'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _member_id uuid;
  _ident text := trim(_identifier);
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  IF _org_id IS NULL OR _ident IS NULL OR _ident = '' THEN
    RAISE EXCEPTION 'org_id and identifier required';
  END IF;

  -- Try direct user_id first (if a uuid was passed)
  BEGIN
    _user_id := _ident::uuid;
    PERFORM 1 FROM public.profiles WHERE id = _user_id;
    IF NOT FOUND THEN _user_id := NULL; END IF;
  EXCEPTION WHEN others THEN
    _user_id := NULL;
  END;

  IF _user_id IS NULL THEN
    SELECT id INTO _user_id
    FROM public.profiles
    WHERE phone = _ident OR email = _ident
    LIMIT 1;
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for identifier: %', _ident;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, _user_id, _role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO _member_id;

  PERFORM public.log_security_event(
    'org_member_added', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'user_id', _user_id, 'role', _role)
  );

  RETURN _member_id;
END $$;

-- Update an existing member's role
CREATE OR REPLACE FUNCTION public.super_admin_set_org_member_role(
  _org_id uuid, _user_id uuid, _role public.org_role
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  UPDATE public.organization_members
  SET role = _role
  WHERE organization_id = _org_id AND user_id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in organization';
  END IF;
  PERFORM public.log_security_event(
    'org_member_role_changed', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'user_id', _user_id, 'role', _role)
  );
  RETURN true;
END $$;

-- Remove a member
CREATE OR REPLACE FUNCTION public.super_admin_remove_org_member(
  _org_id uuid, _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;
  DELETE FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _user_id;
  PERFORM public.log_security_event(
    'org_member_removed', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'user_id', _user_id)
  );
  RETURN true;
END $$;
