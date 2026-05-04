
-- 1) Fix mortality_records: remove the unsafe "farm_id IS NULL OR ..." policy
DROP POLICY IF EXISTS "Farm tenant access" ON public.mortality_records;

CREATE POLICY "Farm tenant access"
ON public.mortality_records
FOR ALL
USING (
  farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id)
)
WITH CHECK (
  farm_id IS NOT NULL AND public.user_can_access_farm(auth.uid(), farm_id)
);

-- 2) Fix firmware_rollout_batches: restrict anonymous read
DROP POLICY IF EXISTS "Authenticated users can view active rollouts" ON public.firmware_rollout_batches;

CREATE POLICY "Authenticated users can view active rollouts"
ON public.firmware_rollout_batches
FOR SELECT
TO authenticated
USING (status = ANY (ARRAY['active'::text, 'completed'::text]));

-- 3) Security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,           -- login_success, login_failure, invite_redeem_success, invite_redeem_failure, device_auth_success, device_auth_failure, etc.
  user_id uuid,                        -- nullable — failed logins won't have one
  farm_id uuid,
  device_token_id uuid,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  details jsonb DEFAULT '{}'::jsonb,   -- e.g. {"identifier":"01...","reason":"invalid_code"}
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_event_time ON public.security_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_user_time  ON public.security_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_farm_time  ON public.security_audit_log (farm_id, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can read
CREATE POLICY "Super admins read security audit"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- No one can update or delete via API (cleanup happens via scheduled function)
-- INSERT only via SECURITY DEFINER functions; no public INSERT policy.

-- 4) Helper to log events (SECURITY DEFINER so it can write past RLS)
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _user_id uuid DEFAULT NULL,
  _farm_id uuid DEFAULT NULL,
  _device_token_id uuid DEFAULT NULL,
  _success boolean DEFAULT true,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, user_id, farm_id, device_token_id, success, details
  ) VALUES (
    _event_type, _user_id, _farm_id, _device_token_id, _success, COALESCE(_details, '{}'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  -- never let logging break the calling transaction
  NULL;
END;
$$;

-- Restrict execution to authenticated users + service role only
REVOKE ALL ON FUNCTION public.log_security_event(text, uuid, uuid, uuid, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, uuid, uuid, boolean, jsonb) TO authenticated, service_role;

-- 5) Update redeem_invitation to log success / failure
CREATE OR REPLACE FUNCTION public.redeem_invitation(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _invitation record;
  _target_farm_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    PERFORM public.log_security_event('invite_redeem_failure', NULL, NULL, NULL, false,
      jsonb_build_object('reason', 'not_authenticated', 'code', upper(trim(_code))));
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _invitation
  FROM public.worker_invitations
  WHERE invite_code = upper(trim(_code))
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF _invitation IS NULL THEN
    PERFORM public.log_security_event('invite_redeem_failure', _user_id, NULL, NULL, false,
      jsonb_build_object('reason', 'invalid_or_expired', 'code', upper(trim(_code))));
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  _target_farm_id := _invitation.farm_id;
  IF _target_farm_id IS NULL THEN
    SELECT id INTO _target_farm_id
    FROM public.farms
    WHERE owner_id = _invitation.farm_owner_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF _target_farm_id IS NULL THEN
    PERFORM public.log_security_event('invite_redeem_failure', _user_id, NULL, NULL, false,
      jsonb_build_object('reason', 'owner_no_farm', 'invitation_id', _invitation.id));
    RAISE EXCEPTION 'Owner has no farm to join';
  END IF;

  IF _invitation.farm_owner_id = _user_id THEN
    PERFORM public.log_security_event('invite_redeem_failure', _user_id, _target_farm_id, NULL, false,
      jsonb_build_object('reason', 'self_join_blocked', 'invitation_id', _invitation.id));
    RAISE EXCEPTION 'Cannot join your own farm';
  END IF;

  INSERT INTO public.user_roles (user_id, farm_owner_id, role)
  VALUES (_user_id, _invitation.farm_owner_id, 'worker')
  ON CONFLICT (user_id, farm_owner_id) DO UPDATE SET role = 'worker';

  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (_target_farm_id, _user_id, 'worker')
  ON CONFLICT DO NOTHING;

  UPDATE public.worker_invitations
  SET used_at = now(), used_by = _user_id
  WHERE id = _invitation.id;

  PERFORM public.log_security_event('invite_redeem_success', _user_id, _target_farm_id, NULL, true,
    jsonb_build_object('invitation_id', _invitation.id, 'farm_owner_id', _invitation.farm_owner_id));

  RETURN jsonb_build_object(
    'success', true,
    'farm_id', _target_farm_id,
    'farm_owner_id', _invitation.farm_owner_id
  );
END;
$function$;

-- 6) Cleanup old audit logs (keep 180 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_audit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_audit_log
  WHERE created_at < now() - interval '180 days';
END;
$$;
