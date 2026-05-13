CREATE OR REPLACE FUNCTION public.super_admin_update_organization(
  _org_id uuid,
  _name text DEFAULT NULL,
  _name_en text DEFAULT NULL,
  _slug text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF NOT public.is_super_admin(v_caller) THEN
    PERFORM public.log_security_event(
      'super_admin_update_organization_denied',
      jsonb_build_object('org_id', _org_id, 'caller', v_caller)
    );
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;

  UPDATE public.organizations
     SET name      = COALESCE(_name, name),
         name_en   = COALESCE(_name_en, name_en),
         slug      = COALESCE(_slug, slug),
         notes     = COALESCE(_notes, notes),
         updated_at = now()
   WHERE id = _org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  PERFORM public.log_security_event(
    'super_admin_update_organization',
    jsonb_build_object('org_id', _org_id, 'caller', v_caller)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_delete_organization(
  _org_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_farm_count int;
BEGIN
  IF NOT public.is_super_admin(v_caller) THEN
    PERFORM public.log_security_event(
      'super_admin_delete_organization_denied',
      jsonb_build_object('org_id', _org_id, 'caller', v_caller)
    );
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;

  SELECT count(*) INTO v_farm_count
    FROM public.farms
   WHERE organization_id = _org_id;

  IF v_farm_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete organization: % farm(s) still linked. Reassign or remove them first.', v_farm_count;
  END IF;

  DELETE FROM public.organization_members WHERE organization_id = _org_id;
  DELETE FROM public.organizations WHERE id = _org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  PERFORM public.log_security_event(
    'super_admin_delete_organization',
    jsonb_build_object('org_id', _org_id, 'caller', v_caller)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_update_organization(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_delete_organization(uuid) TO authenticated;