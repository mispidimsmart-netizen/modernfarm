DROP FUNCTION IF EXISTS public.super_admin_set_org_member_role(uuid, uuid, org_role);

CREATE OR REPLACE FUNCTION public.super_admin_set_org_member_role(_org_id uuid, _user_id uuid, _role org_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
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
  WHERE m.organization_id = _org_id AND m.user_id = _user_id;

  PERFORM public.log_security_event(
    'org_member_role_changed', auth.uid(), NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'user_id', _user_id, 'role', _role)
  );

  RETURN _result;
END $function$;