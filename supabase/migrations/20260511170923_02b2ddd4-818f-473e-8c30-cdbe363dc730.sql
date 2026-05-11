
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.org_invitation_status AS ENUM ('pending','accepted','declined','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text,
  invited_phone text,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  status public.org_invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  responded_at timestamptz,
  responded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_email_or_phone CHECK (invited_email IS NOT NULL OR invited_phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.org_invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.org_invitations(lower(invited_email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_invitations_phone ON public.org_invitations(invited_phone) WHERE status = 'pending';

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "super admin all invitations" ON public.org_invitations
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Org admins: can see invitations for their own org
CREATE POLICY "org admins view own org invitations" ON public.org_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = org_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('org_owner','org_admin')
    )
  );

-- Invited users: can see invites matching their email/phone
CREATE POLICY "invitees view their invitations" ON public.org_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          (org_invitations.invited_email IS NOT NULL AND lower(p.email) = lower(org_invitations.invited_email))
          OR (org_invitations.invited_phone IS NOT NULL AND p.phone = org_invitations.invited_phone)
        )
    )
  );

-- Create invitation (org admin)
CREATE OR REPLACE FUNCTION public.org_admin_create_invitation(
  _org_id uuid, _identifier text, _role org_role DEFAULT 'member', _expires_days int DEFAULT 14
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _email text; _phone text;
  _max_users int; _current_users int; _pending int;
  _existing_user uuid;
  _id uuid;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _role = 'org_owner' THEN RAISE EXCEPTION 'Only super admin can assign org_owner'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _caller AND role IN ('org_owner','org_admin')
  ) INTO _is_admin;
  IF NOT _is_admin AND NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Detect identifier as email vs phone
  IF position('@' in _identifier) > 0 THEN
    _email := lower(trim(_identifier));
  ELSE
    _phone := trim(_identifier);
  END IF;

  -- max_users guard (counts existing members + pending invites)
  SELECT max_users INTO _max_users FROM public.organizations WHERE id = _org_id;
  SELECT count(*) INTO _current_users FROM public.organization_members WHERE organization_id = _org_id;
  SELECT count(*) INTO _pending FROM public.org_invitations
    WHERE organization_id = _org_id AND status = 'pending';
  IF _max_users IS NOT NULL AND (_current_users + _pending) >= _max_users THEN
    RAISE EXCEPTION 'Member + pending invite limit reached (max_users=%)', _max_users;
  END IF;

  -- If identifier matches existing user already in org, abort
  SELECT id INTO _existing_user FROM public.profiles
    WHERE (_email IS NOT NULL AND lower(email) = _email)
       OR (_phone IS NOT NULL AND phone = _phone) LIMIT 1;
  IF _existing_user IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _existing_user
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;

  -- Cancel any existing pending invite for same identifier+org
  UPDATE public.org_invitations
    SET status = 'cancelled', responded_at = now()
    WHERE organization_id = _org_id AND status = 'pending'
      AND ((_email IS NOT NULL AND lower(invited_email) = _email)
        OR (_phone IS NOT NULL AND invited_phone = _phone));

  INSERT INTO public.org_invitations (
    organization_id, invited_email, invited_phone, role, invited_by, expires_at
  ) VALUES (
    _org_id, _email, _phone, _role, _caller,
    now() + (_expires_days || ' days')::interval
  ) RETURNING id INTO _id;

  PERFORM public.log_security_event('org_invitation_created', _caller, NULL, NULL, true,
    jsonb_build_object('org_id', _org_id, 'invitation_id', _id, 'role', _role,
                       'identifier', COALESCE(_email, _phone)));

  RETURN jsonb_build_object('success', true, 'invitation_id', _id);
END;
$$;

-- Cancel invitation
CREATE OR REPLACE FUNCTION public.org_admin_cancel_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid(); _org uuid; _ok boolean;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT organization_id INTO _org FROM public.org_invitations WHERE id = _invitation_id AND status = 'pending';
  IF _org IS NULL THEN RAISE EXCEPTION 'Invitation not found or not pending'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _caller AND role IN ('org_owner','org_admin')
  ) INTO _ok;
  IF NOT _ok AND NOT public.is_super_admin(_caller) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.org_invitations
    SET status = 'cancelled', responded_at = now(), responded_by = _caller
    WHERE id = _invitation_id;

  PERFORM public.log_security_event('org_invitation_cancelled', _caller, NULL, NULL, true,
    jsonb_build_object('invitation_id', _invitation_id, 'org_id', _org));

  RETURN jsonb_build_object('success', true);
END $$;

-- List invitations for an org
CREATE OR REPLACE FUNCTION public.org_admin_list_invitations(_org_id uuid)
RETURNS TABLE(
  id uuid, organization_id uuid, invited_email text, invited_phone text,
  role org_role, status org_invitation_status,
  expires_at timestamptz, created_at timestamptz, responded_at timestamptz,
  invited_by uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role IN ('org_owner','org_admin')
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Auto-expire old invites
  UPDATE public.org_invitations SET status = 'expired'
    WHERE organization_id = _org_id AND status = 'pending' AND expires_at < now();

  RETURN QUERY
  SELECT i.id, i.organization_id, i.invited_email, i.invited_phone,
         i.role, i.status, i.expires_at, i.created_at, i.responded_at, i.invited_by
  FROM public.org_invitations i
  WHERE i.organization_id = _org_id
  ORDER BY (i.status = 'pending') DESC, i.created_at DESC;
END $$;

-- Get my pending invitations (matched by email/phone)
CREATE OR REPLACE FUNCTION public.get_my_pending_invitations()
RETURNS TABLE(
  id uuid, organization_id uuid, org_name text,
  role org_role, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _phone text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT lower(p.email), p.phone INTO _email, _phone FROM public.profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  SELECT i.id, i.organization_id, o.name,
         i.role, i.expires_at, i.created_at
  FROM public.org_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.status = 'pending' AND i.expires_at > now()
    AND (
      (_email IS NOT NULL AND lower(i.invited_email) = _email)
      OR (_phone IS NOT NULL AND i.invited_phone = _phone)
    )
  ORDER BY i.created_at DESC;
END $$;

-- Accept invitation
CREATE OR REPLACE FUNCTION public.accept_org_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid(); _inv record; _email text; _phone text;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT lower(p.email), p.phone INTO _email, _phone FROM public.profiles p WHERE p.id = _caller;

  SELECT * INTO _inv FROM public.org_invitations
    WHERE id = _invitation_id AND status = 'pending' AND expires_at > now();

  IF _inv IS NULL THEN RAISE EXCEPTION 'Invitation not found or expired'; END IF;

  IF NOT (
    (_inv.invited_email IS NOT NULL AND lower(_inv.invited_email) = _email)
    OR (_inv.invited_phone IS NOT NULL AND _inv.invited_phone = _phone)
  ) THEN
    RAISE EXCEPTION 'This invitation is for a different account';
  END IF;

  -- Add as member (max_users still enforced by trigger)
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_inv.organization_id, _caller, _inv.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.org_invitations
    SET status = 'accepted', responded_at = now(), responded_by = _caller
    WHERE id = _invitation_id;

  PERFORM public.log_security_event('org_invitation_accepted', _caller, NULL, NULL, true,
    jsonb_build_object('invitation_id', _invitation_id, 'org_id', _inv.organization_id));

  RETURN jsonb_build_object('success', true, 'organization_id', _inv.organization_id);
END $$;

-- Decline invitation
CREATE OR REPLACE FUNCTION public.decline_org_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid(); _inv record; _email text; _phone text;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT lower(p.email), p.phone INTO _email, _phone FROM public.profiles p WHERE p.id = _caller;

  SELECT * INTO _inv FROM public.org_invitations WHERE id = _invitation_id AND status = 'pending';
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF NOT (
    (_inv.invited_email IS NOT NULL AND lower(_inv.invited_email) = _email)
    OR (_inv.invited_phone IS NOT NULL AND _inv.invited_phone = _phone)
  ) THEN
    RAISE EXCEPTION 'This invitation is for a different account';
  END IF;

  UPDATE public.org_invitations
    SET status = 'declined', responded_at = now(), responded_by = _caller
    WHERE id = _invitation_id;

  PERFORM public.log_security_event('org_invitation_declined', _caller, NULL, NULL, true,
    jsonb_build_object('invitation_id', _invitation_id, 'org_id', _inv.organization_id));

  RETURN jsonb_build_object('success', true);
END $$;
