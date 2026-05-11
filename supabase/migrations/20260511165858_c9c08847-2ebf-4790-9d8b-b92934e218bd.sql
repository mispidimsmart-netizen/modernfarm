
-- 1. License validity helper
CREATE OR REPLACE FUNCTION public.is_organization_license_valid(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN o.id IS NULL THEN false
    WHEN o.license_type = 'suspended' THEN false
    WHEN o.license_type = 'lifetime' THEN true
    WHEN o.license_type IN ('trial','subscription') THEN
      (o.license_expires_at IS NULL OR o.license_expires_at > now())
    ELSE false
  END
  FROM public.organizations o WHERE o.id = _org_id
$$;

-- 2. Replace user_can_access_farm_v2 to enforce license
CREATE OR REPLACE FUNCTION public.user_can_access_farm_v2(_user_id uuid, _farm_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _is_member boolean;
  _is_org boolean;
BEGIN
  IF _user_id IS NULL OR _farm_id IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin always
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  SELECT organization_id INTO _org_id FROM public.farms WHERE id = _farm_id;

  -- License gate (only when farm is org-linked)
  IF _org_id IS NOT NULL AND NOT public.is_organization_license_valid(_org_id) THEN
    RETURN false;
  END IF;

  -- Direct farm member
  SELECT EXISTS (
    SELECT 1 FROM public.farm_members
    WHERE farm_id = _farm_id AND user_id = _user_id
  ) INTO _is_member;
  IF _is_member THEN RETURN true; END IF;

  -- Org owner / admin
  IF _org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = _org_id
        AND user_id = _user_id
        AND role IN ('org_owner','org_admin')
    ) INTO _is_org;
    IF _is_org THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

-- 3. Enforce max_farms on farms insert/org-link
CREATE OR REPLACE FUNCTION public.enforce_org_max_farms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max int;
  _current int;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if unchanged on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.organization_id IS NOT DISTINCT FROM NEW.organization_id THEN
    RETURN NEW;
  END IF;

  SELECT max_farms INTO _max FROM public.organizations WHERE id = NEW.organization_id;
  SELECT count(*) INTO _current FROM public.farms
    WHERE organization_id = NEW.organization_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF _max IS NOT NULL AND _current >= _max THEN
    RAISE EXCEPTION 'Organization farm limit reached (max_farms=%)', _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_org_max_farms ON public.farms;
CREATE TRIGGER trg_enforce_org_max_farms
  BEFORE INSERT OR UPDATE OF organization_id ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.enforce_org_max_farms();

-- 4. Enforce max_users on organization_members insert
CREATE OR REPLACE FUNCTION public.enforce_org_max_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max int;
  _current int;
BEGIN
  SELECT max_users INTO _max FROM public.organizations WHERE id = NEW.organization_id;
  SELECT count(*) INTO _current FROM public.organization_members
    WHERE organization_id = NEW.organization_id;
  IF _max IS NOT NULL AND _current >= _max THEN
    RAISE EXCEPTION 'Organization member limit reached (max_users=%)', _max
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_org_max_users ON public.organization_members;
CREATE TRIGGER trg_enforce_org_max_users
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_org_max_users();

-- 5. Super admin RPC to update license/limits
CREATE OR REPLACE FUNCTION public.super_admin_update_organization_license(
  _org_id uuid,
  _license_type org_license_type DEFAULT NULL,
  _license_expires_at timestamptz DEFAULT NULL,
  _max_farms int DEFAULT NULL,
  _max_users int DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _old record;
BEGIN
  IF _caller IS NULL OR NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;

  SELECT * INTO _old FROM public.organizations WHERE id = _org_id;
  IF _old IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  UPDATE public.organizations
  SET license_type = COALESCE(_license_type, license_type),
      license_expires_at = COALESCE(_license_expires_at, license_expires_at),
      max_farms = COALESCE(_max_farms, max_farms),
      max_users = COALESCE(_max_users, max_users),
      notes = COALESCE(_notes, notes),
      updated_at = now()
  WHERE id = _org_id;

  PERFORM public.log_security_event(
    'org_license_updated', _caller, NULL, NULL, true,
    jsonb_build_object(
      'org_id', _org_id,
      'old_license_type', _old.license_type,
      'new_license_type', COALESCE(_license_type, _old.license_type),
      'old_expires_at', _old.license_expires_at,
      'new_expires_at', COALESCE(_license_expires_at, _old.license_expires_at),
      'max_farms', COALESCE(_max_farms, _old.max_farms),
      'max_users', COALESCE(_max_users, _old.max_users)
    )
  );

  RETURN jsonb_build_object('success', true, 'org_id', _org_id);
END;
$$;
