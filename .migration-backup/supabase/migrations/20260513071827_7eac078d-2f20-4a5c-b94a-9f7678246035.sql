
CREATE OR REPLACE FUNCTION public.super_admin_apply_user_roles(
  _user_id uuid,
  _payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_super boolean;
  v_desired_super boolean;
  v_orgs jsonb;
  v_farms jsonb;
  v_added_orgs int := 0;
  v_updated_orgs int := 0;
  v_removed_orgs int := 0;
  v_added_farms int := 0;
  v_updated_farms int := 0;
  v_removed_farms int := 0;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'Only super admin can apply role changes';
  END IF;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  -- 1. Super admin toggle (block self-demotion)
  IF _payload ? 'is_super_admin' THEN
    v_desired_super := COALESCE((_payload->>'is_super_admin')::boolean, false);
    SELECT EXISTS(SELECT 1 FROM public.super_admins WHERE user_id = _user_id) INTO v_is_super;

    IF v_desired_super AND NOT v_is_super THEN
      INSERT INTO public.super_admins(user_id, created_by) VALUES (_user_id, v_caller)
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF (NOT v_desired_super) AND v_is_super THEN
      IF _user_id = v_caller THEN
        RAISE EXCEPTION 'নিজের সুপার এডমিন স্ট্যাটাস সরানো যাবে না';
      END IF;
      DELETE FROM public.super_admins WHERE user_id = _user_id;
    END IF;
  END IF;

  -- 2. Org memberships (full desired set)
  IF _payload ? 'orgs' THEN
    v_orgs := _payload->'orgs';

    -- remove orgs not in desired set
    WITH desired AS (
      SELECT (e->>'organization_id')::uuid AS organization_id
      FROM jsonb_array_elements(v_orgs) e
    ), del AS (
      DELETE FROM public.organization_members om
      WHERE om.user_id = _user_id
        AND om.organization_id NOT IN (SELECT organization_id FROM desired)
      RETURNING 1
    ) SELECT count(*) INTO v_removed_orgs FROM del;

    -- upsert desired
    WITH up AS (
      INSERT INTO public.organization_members(organization_id, user_id, role)
      SELECT (e->>'organization_id')::uuid, _user_id, (e->>'role')::org_role
      FROM jsonb_array_elements(v_orgs) e
      ON CONFLICT (organization_id, user_id) DO UPDATE
        SET role = EXCLUDED.role
        WHERE organization_members.role <> EXCLUDED.role
      RETURNING (xmax = 0) AS inserted
    )
    SELECT
      count(*) FILTER (WHERE inserted),
      count(*) FILTER (WHERE NOT inserted)
    INTO v_added_orgs, v_updated_orgs FROM up;
  END IF;

  -- 3. Farm memberships (full desired set)
  IF _payload ? 'farm_memberships' THEN
    v_farms := _payload->'farm_memberships';

    WITH desired AS (
      SELECT (e->>'farm_id')::uuid AS farm_id
      FROM jsonb_array_elements(v_farms) e
    ), del AS (
      DELETE FROM public.farm_members fm
      WHERE fm.user_id = _user_id
        AND fm.farm_id NOT IN (SELECT farm_id FROM desired)
      RETURNING 1
    ) SELECT count(*) INTO v_removed_farms FROM del;

    WITH up AS (
      INSERT INTO public.farm_members(farm_id, user_id, role)
      SELECT (e->>'farm_id')::uuid, _user_id, (e->>'role')::text
      FROM jsonb_array_elements(v_farms) e
      ON CONFLICT (farm_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
            updated_at = now()
        WHERE farm_members.role <> EXCLUDED.role
      RETURNING (xmax = 0) AS inserted
    )
    SELECT
      count(*) FILTER (WHERE inserted),
      count(*) FILTER (WHERE NOT inserted)
    INTO v_added_farms, v_updated_farms FROM up;
  END IF;

  RETURN jsonb_build_object(
    'orgs',  jsonb_build_object('added', v_added_orgs,  'updated', v_updated_orgs,  'removed', v_removed_orgs),
    'farms', jsonb_build_object('added', v_added_farms, 'updated', v_updated_farms, 'removed', v_removed_farms)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_apply_user_roles(uuid, jsonb) TO authenticated;
