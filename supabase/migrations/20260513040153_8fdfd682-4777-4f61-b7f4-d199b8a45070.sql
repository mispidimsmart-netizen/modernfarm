DROP FUNCTION IF EXISTS public.super_admin_set_org_member_role(uuid, uuid, org_role);

CREATE OR REPLACE FUNCTION public.super_admin_set_org_member_role(_org_id uuid, _user_id uuid, _role org_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
  _old_role org_role;
  _member_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: super admin only';
  END IF;

  SELECT id, role INTO _member_id, _old_role
  FROM public.organization_members
  WHERE organization_id = _org_id AND user_id = _user_id;

  IF _member_id IS NULL THEN
    RAISE EXCEPTION 'Member not found in organization';
  END IF;

  UPDATE public.organization_members
  SET role = _role
  WHERE id = _member_id;

  -- Audit log entry — admin id (actor_user_id) and time (changed_at) recorded
  INSERT INTO public.org_activity_audit (
    organization_id, action_type, entity_type, entity_id,
    actor_user_id, before, after, changed_fields
  ) VALUES (
    _org_id, 'org_member_role_changed', 'organization_member', _member_id,
    auth.uid(),
    jsonb_build_object('user_id', _user_id, 'role', _old_role),
    jsonb_build_object('user_id', _user_id, 'role', _role),
    ARRAY['role']
  );

  SELECT jsonb_build_object(
    'id', m.id,
    'user_id', m.user_id,
    'role', m.role,
    'organization_id', m.organization_id,
    'created_at', m.created_at,
    'profile', jsonb_build_object(
      'user_name', p.user_name,
      'phone', p.phone,
      'email', p.email
    )
  )
  INTO _result
  FROM public.organization_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.id = _member_id;

  PERFORM public.log_security_event(
    'org_member_role_changed', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'user_id', _user_id, 'old_role', _old_role, 'new_role', _role)
  );

  RETURN _result;
END $function$;